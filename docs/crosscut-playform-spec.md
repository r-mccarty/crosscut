## Engineering Specification: The "CrossCut" Automation Platform

**Document ID:** ENG-CC-001-PLATFORM
**Version:** 1.0
**Target Audience:** Lead Software Engineer / Platform Engineering Team

### 1.0 Project Mandate & Core Mission

This document outlines the implementation plan for the **CrossCut Platform**, an event-driven system designed to automate and orchestrate cross-domain business processes within the engineering lifecycle.

**The mission of this platform is singular: To act as the intelligent, connective tissue between our core Systems of Record (SoRs), transforming a series of manual handoffs into a single, automated, and auditable value chain.**

The platform is designed as a "Conductor and Experts" model. A central orchestration layer, the **Business Process Orchestrator (BPO)**, will listen for business events, make intelligent decisions by consulting a high-performance "World Model," and command other services to perform work. It will enforce process integrity while deferring all domain-specific validation to the authoritative SoRs.

### 2.0 Architectural Requirements & Constraints

*   **Pattern:** Command Query Responsibility Segregation (CQRS). The platform will maintain a separate, optimized database for writes (Postgres) and reads (Dgraph).
*   **Language:** Go (latest stable version) for all custom-built services.
*   **Deployment Target:** All services and infrastructure will be deployed on Google Cloud Platform (GCP).
*   **Communication:**
    *   Asynchronous, event-based communication between major systems will use **GCP Pub/Sub**.
    *   Synchronous, command-based communication between services will use RESTful **HTTP APIs**.
*   **Orchestration:** Long-running, stateful business processes will be managed by **GCP Workflows**.
*   **Data Integrity:** All state changes within the platform's own write model must be performed within atomic, ACID-compliant transactions.
*   **Auditability:** The platform's write model must be structured to provide a complete, immutable, and temporally accurate history of all orchestrated actions.
*   **Security:** Services must be secured using GCP IAM. The core write database will have strictly limited access, granted only to the BPO service.

### 3.0 Platform Components & Specifications

The platform is composed of four primary subsystems.

#### 3.1 Write Model: The Transactional Core

*   **Technology:** Cloud SQL for PostgreSQL.
*   **Data Model:** **Anchor Modeling (6NF).** The schema will be highly normalized to prioritize evolvability and historization. All attributes and ties will be timestamped.
*   **Responsibilities:**
    1.  To serve as the immutable, auditable log of all decisions and actions orchestrated by the CrossCut platform.
    2.  To act as the durable state store for the BPO's workflow engine.
*   **Access:** Write access is **exclusively granted** to the `crosscut-bpo` service account. No other service may connect.

#### 3.2 Read Model: The "World Model"

*   **Technology:** Dgraph (Dgraph Cloud or self-hosted on GKE).
*   **Data Model:** **Labeled Property Graph (LPG).** The schema will be denormalized and optimized for fast, multi-hop traversal queries.
*   **Schema Definition:** Managed via a GraphQL schema file, stored in source control.
*   **Responsibilities:**
    1.  To provide the `crosscut-bpo` with a high-performance, context-rich view of the state of the enterprise.
    2.  To act as a near-real-time cache of relevant data ingested from both the platform's Write Model and external SoRs.
*   **Access:** Read access is granted to the `crosscut-bpo`. Write access is **exclusively granted** to the `Synchronization Pipeline` service.

#### 3.3 The Synchronization Pipeline (CDC)

*   **Purpose:** To provide a robust, low-latency data pipeline that synchronizes the Dgraph Read Model from the Postgres Write Model.
*   **Technology & Flow:**
    1.  **GCP Datastream:** Configured to use the Postgres instance as a source, capturing all WAL changes.
    2.  **GCP Cloud Storage:** Datastream is configured to write change events as Avro/JSON files to a dedicated GCS bucket.
    3.  **GCP Pub/Sub:** GCS is configured to publish a notification to a Pub/Sub topic upon new file creation.
    4.  **GCP Cloud Run Service (`sync-transformer`):** A dedicated Go service that:
        *   Is triggered by the Pub/Sub topic.
        *   Reads the change file from GCS.
        *   Contains the business logic to transform the normalized Anchor Model data into the denormalized LPG structure.
        *   Writes the transformed data to the Dgraph instance.

#### 3.4 The Orchestration Layer

This layer consists of two tightly coupled components.

*   **Component 1: GCP Workflows (The "Spinal Cord")**
    *   **Definition:** Workflow logic is defined in YAML files, stored in source control.
    *   **Responsibility:** To manage the stateful, long-running execution of business processes. It is responsible for sequencing, retries, parallelism, and error handling of API calls. It contains no complex business logic itself.

*   **Component 2: `crosscut-bpo` Go Service (The "Brain")**
    *   **Deployment:** GCP Cloud Run.
    *   **Responsibilities:**
        1.  Expose a synchronous REST API for GCP Workflows to call (e.g., `/decide-action`, `/audits`).
        2.  Contain all complex, domain-spanning business logic.
        3.  Execute GraphQL queries against the Dgraph Read Model to gather context.
        4.  Contain the CUElang engine to validate the *structure and integrity of its own processes* (e.g., plan schemas).
        5.  Act as the gatekeeper for all writes to the Postgres Write Model.
        6.  Act as the client for all external SoR APIs (PLM, ERP).

### 4.0 Core Workflows & Interactions

This section defines the primary interaction patterns between the components.

#### 4.1 Data Ingestion from External SoRs
*   **Pattern:** Asynchronous, event-driven.
*   **Flow:**
    1.  An external SoR (e.g., PLM) publishes a business event (e.g., `PartApproved`) to a dedicated Pub/Sub topic.
    2.  The `crosscut-bpo` service subscribes to this topic.
    3.  Upon receiving an event, the BPO performs a write to the Postgres Anchor Model to record this external fact in its own auditable log.
    4.  This write is then automatically propagated to the Dgraph Read Model via the Synchronization Pipeline.

#### 4.2 Business Process Execution
*   **Pattern:** Orchestrated, synchronous calls within an asynchronous workflow.
*   **Flow:**
    1.  An event (either external, or one published by the BPO itself) triggers a GCP Workflow.
    2.  The Workflow makes an HTTP call to the BPO's `/decide-action` endpoint.
    3.  The BPO gathers context (from Dgraph), consults external experts (e.g., calling the PLM's `/validate` API), and returns a "Command List" to the Workflow.
    4.  The Workflow executes the commands (e.g., calling `DocGen`).
    5.  Upon completion, the Workflow calls the BPO's `/audits` endpoint.
    6.  The BPO writes the final, successful outcome to the Postgres Write Model.

### 5.0 Phased Implementation Plan

The platform will be built in logical, value-delivering phases.

#### Phase 1: The Core Data Pipeline & Read Model (4-6 weeks)
*   **Goal:** Establish the foundational CQRS data flow.
*   **Tasks:**
    *   Define the initial Anchor Model and LPG schemas for a single domain (e.g., Documents).
    *   Provision Cloud SQL (Postgres) and Dgraph instances.
    *   Build and deploy the `sync-transformer` service.
    *   Configure the full Datastream -> GCS -> Pub/Sub -> Cloud Run pipeline.
*   **Definition of Done:** A manual `INSERT` into a Postgres table is automatically and correctly reflected in the Dgraph instance within seconds.

#### Phase 2: The BPO and a Single Workflow (4-6 weeks)
*   **Goal:** Implement the "Brain" and orchestrate the first end-to-end business process.
*   **Tasks:**
    *   Build the `crosscut-bpo` Go service with its core API endpoints.
    *   Integrate Dgraph client for reads and Postgres client for writes.
    *   Create a mock "expert" service (e.g., a Mock PLM).
    *   Define and deploy a simple GCP Workflow (e.g., "Spec Change -> Re-render Manual").
    *   Integrate `DocGen` as the first "worker" service.
*   **Definition of Done:** A simulated Pub/Sub event successfully triggers the GCP Workflow, which calls the BPO, which consults the mock PLM and commands DocGen to produce a document, and finally records the audit in Postgres.

#### Phase 3: Integrate First Real SoR (3-4 weeks)
*   **Goal:** Replace a mock service with a real enterprise system.
*   **Tasks:**
    *   Develop the integration layer for the first real SoR (e.g., the PLM).
    *   Set up Pub/Sub topics and subscriptions for real business events.
    *   Refactor the relevant workflow to call the real PLM API instead of the mock.
*   **Definition of Done:** A live event from the production PLM system successfully triggers an automated workflow in the CrossCut platform.

### 6.0 Definition of Success
The platform is successful when it reliably orchestrates its first high-value, end-to-end business process, demonstrably reducing manual effort and process latency while providing a complete audit trail of the automated workflow.