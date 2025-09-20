## Technical Specification: CrossCut Business Process Orchestrator (BPO)

**Version:** 1.0  
**Status:** Draft

### 1. Service Name and Purpose

*   **Service Name:** `crosscut-bpo`
*   **Purpose:** To serve as the central "brain" for the CrossCut automation platform. It is a stateless, Go-based microservice responsible for making intelligent, context-aware decisions and providing instructions to a stateful orchestration engine (GCP Workflows). It is the primary owner and enforcer of cross-domain business process logic.

### 2. Core Responsibilities

1.  **Listen:** Ingests high-level business intents from external systems, either via direct API calls or by subscribing to events on a Pub/Sub topic.
2.  **Decide:** Gathers the necessary context from the **Postgres Read Model (Materialized Views)** to understand the full scope of an intent. It then uses its internal logic and CUE validation to generate a concrete, actionable plan.
3.  **Instruct:** Returns a structured "Command List" to its caller (GCP Workflows), detailing the precise sequence and parameters of tasks to be executed by worker services (`DocGen`, `VizGen`, external APIs, etc.).
4.  **Audit & Synchronize:** Provides an endpoint for workflows to post final status updates. It writes these updates to the Postgres Write Model (Anchor Schema) and refreshes the relevant Materialized Views within a single ACID transaction.

### 3. Architectural Pattern

*   **The Brain (This Service):** A stateless Go service deployed on **GCP Cloud Run**.
*   **The Spinal Cord (GCP Workflows):** A managed orchestration service that calls the `crosscut-bpo` service to get its instructions.
*   **Data Model:** The service is the exclusive client of the **Unified Postgres Database**. It performs transactional writes to the Anchor Model (Write Model), reads from denormalized Materialized Views (Read Model), and manages the synchronous refresh of the views.

### 4. Key Internal Components (Go Service Structure)

*   `internal/api`: Contains the HTTP handlers for the service's public API.
*   `internal/events`: Contains the handlers for consuming messages from Pub/Sub.
*   `internal/workflows`: Contains the core business logic for each major process.
*   `internal/activities`: Contains small, single-responsibility, testable functions.
*   `internal/services`: A collection of client packages for interacting with all external services (PLM, ERP, etc.).
*   `internal/database`: A data access layer for all interactions with the Postgres database, using `pgx`. This package will handle:
    *   Writing to the Anchor Model tables.
    *   Reading from the Materialized Views.
    *   Issuing `REFRESH MATERIALIZED VIEW CONCURRENTLY` commands.
    *   Managing ACID transactions that wrap both writes and refreshes.
*   `internal/cue`: A dedicated package that wraps the `cuelang.org/go` library for process validation.

### 5. Technology Stack

*   **Language:** Go (latest stable version)
*   **API Framework:** `net/http` with `chi` for routing.
*   **Database Library:** `jackc/pgx` for all Postgres interactions.
*   **Validation:** `cuelang.org/go`
*   **Deployment Target:** GCP Cloud Run (containerized with Docker).

### 6. API Specification (Primary Endpoints)

(No changes to the API specification itself)

*   **Endpoint:** `POST /v1/decisions/generate-commands`
*   **Endpoint:** `POST /v1/audits`

### 7. Transactional Integrity

The `crosscut-bpo` service **must** use ACID-compliant transactions when writing to Postgres. A single business process decision requires writing to the Anchor Model and refreshing the Materialized Views in a single, atomic operation. If any step fails, the entire transaction must be rolled back to ensure the Write and Read models never become inconsistent.

### 8. Sequence of Interaction

This diagram shows the simplified interaction in the MVP architecture.

```mermaid
sequenceDiagram
    participant PubSub
    participant Workflow as GCP Workflow
    participant BPO as crosscut-bpo
    participant Postgres as Unified DB
    participant PLM
    participant DocGen
    
    PubSub ->>+ Workflow: 1. Event triggers workflow
    
    Workflow ->>+ BPO: 2. POST /v1/decisions/generate-commands

    BPO ->>+ Postgres: 3. BEGIN TRANSACTION
    BPO ->> Postgres: 4. Write to Anchor Model
    BPO ->> Postgres: 5. REFRESH MATERIALIZED VIEW
    BPO -->>- Postgres: 6. COMMIT

    Note over BPO: Gathers context by reading from Materialized Views
    BPO ->>+ PLM: 7. Asks for enrichment/validation
    PLM -->>- BPO: Returns data

    BPO -->>- Workflow: 8. Returns CommandList

    Workflow ->>+ DocGen: 9. Executes command
    DocGen -->>- Workflow: 10. Returns status

    Workflow ->>+ BPO: 11. POST /v1/audits
    BPO-->>-Workflow: 12. 202 Accepted
```