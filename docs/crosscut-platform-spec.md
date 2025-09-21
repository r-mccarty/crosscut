## Engineering Specification: The "CrossCut" Automation Platform

**Document ID:** ENG-CC-001-PLATFORM
**Version:** 1.0
**Target Audience:** Lead Software Engineer / Platform Engineering Team

### 1.0 Project Mandate & Core Mission

This document outlines the implementation plan for the **CrossCut Platform**, an event-driven system designed to automate and orchestrate cross-domain business processes within the engineering lifecycle.

**The mission of this platform is singular: To act as the intelligent, connective tissue between our core Systems of Record (SoRs), transforming a series of manual handoffs into a single, automated, and auditable value chain.**

The platform is designed as a "Conductor and Experts" model. A central orchestration layer, the **Business Process Orchestrator (BPO)**, will listen for business events, make intelligent decisions by consulting a high-performance "World Model," and command other services to perform work. It will enforce process integrity while deferring all domain-specific validation to the authoritative SoRs.

### 2.0 Architectural Requirements & Constraints

*   **Pattern:** Simplified unified data layer. The platform will use a single PostgreSQL database serving as both Write Model (Anchor Schema) and Read Model (Materialized Views).
*   **Language:** Go (latest stable version) for all custom-built services.
*   **Deployment Target:** All services and infrastructure will be deployed on Google Cloud Platform (GCP).
*   **Communication:**
    *   Asynchronous, event-based communication between major systems will use **GCP Pub/Sub**.
    *   Synchronous, command-based communication between services will use RESTful **HTTP APIs**.
*   **Orchestration:** Long-running, stateful business processes will be managed by **GCP Workflows**.
*   **Data Integrity:** All state changes within the platform's own write model must be performed within atomic, ACID-compliant transactions.
*   **Auditability:** The platform's write model must be structured to provide a complete, immutable, and temporally accurate history of all orchestrated actions.
*   **Security:** Services must be secured using GCP IAM. The core write database will have strictly limited access, granted only to the BPO service.

## 3.0 Platform Components & Specifications (MVP Architecture)

The platform is composed of a simplified set of components, centered around a unified PostgreSQL database.

#### 3.1 The Unified Data Layer (PostgreSQL)

For the MVP, a single Cloud SQL for PostgreSQL instance will serve as both the transactional core and the read-model, simplifying the architecture and ensuring strong consistency.

*   **Write Model (The Auditable Log):
    *   **Technology:** PostgreSQL
    *   **Data Model:** **Anchor Modeling (6NF).** This remains the core of the auditable log, providing a complete, immutable history of all orchestrated actions by prioritizing `INSERT`s over `UPDATE`s.
    *   **Access:** Write access is **exclusively granted** to the `crosscut-bpo` service account.

*   **Read Model (The "World Model")**
    *   **Technology:** PostgreSQL **Materialized Views**.
    *   **Data Model:** A series of denormalized views that join data from the Anchor Model tables into wide, easy-to-query relational structures.
    *   **Responsibilities:** To provide the `crosscut-bpo` with a high-performance, context-rich, and strongly consistent view of the state of the enterprise.

#### 3.2 The Synchronization Mechanism

Synchronization between the write and read models is achieved synchronously and transactionally, managed directly by the BPO.

*   **Responsibility:** The `crosscut-bpo` service.
*   **Mechanism:** After writing to the Anchor Model, and within the same ACID transaction, the BPO issues a `REFRESH MATERIALIZED VIEW CONCURRENTLY` command to update the relevant views. The `CONCURRENTLY` option is critical to prevent locking the views during the refresh.
*   **Benefit:** This approach guarantees **strong consistency**. When a transaction is committed, the Read Model is guaranteed to be in sync with the Write Model, eliminating race conditions.

#### 3.3 The Orchestration Layer

This layer consists of two tightly coupled components.

*   **Component 1: GCP Workflows (The "Spinal Cord")**
    *   **Definition:** Workflow logic is defined in YAML files, stored in source control.
    *   **Responsibility:** To manage the stateful, long-running execution of business processes. It is responsible for sequencing, retries, parallelism, and error handling of API calls. It contains no complex business logic itself.

*   **Component 2: `crosscut-bpo` Go Service (The "Brain")**
    *   **Deployment:** GCP Cloud Run.
    *   **Responsibilities:**
        1.  Expose a synchronous REST API for GCP Workflows to call (e.g., `/decide-action`, `/audits`).
        2.  Contain all complex, domain-spanning business logic.
        3.  Query its own process state from the audit trail to understand workflow context.
        4.  Dynamically consult external SoR APIs to gather fresh business context for decisions.
        5.  Maintain session-scoped cache for SoR data to optimize repeated queries within a decision cycle.
        6.  Record all orchestration decisions and SoR consultations in the audit trail.

### 4.0 Core Workflows & Interactions

This section defines the primary interaction patterns between the components.

#### 4.1 Data Ingestion from External SoRs
*   **Pattern:** Asynchronous, event-driven.
*   **Flow:**
    1.  An external SoR (e.g., PLM) publishes a business event (e.g., `PartApproved`) to a dedicated Pub/Sub topic.
    2.  The `crosscut-bpo` service subscribes to this topic.
    4.  The BPO dynamically consults relevant SoRs for current business context as needed during workflow execution.

#### 4.2 Dynamic SoR Consultation and Caching

CrossCut employs a "consult-on-demand" pattern for gathering business context, ensuring fresh, authoritative data while maintaining performance.

*   **Pattern:** Dynamic API consultation with session-scoped caching.
*   **Technology Stack:**
    *   HTTP clients for SoR API integration
    *   Redis or in-memory cache for session data
    *   Circuit breakers for SoR availability handling
*   **Flow:**
    1.  **Context Assessment:** BPO analyzes its audit trail to understand current workflow state and identify required external context.
    2.  **Cache Check:** Check session cache for recently fetched SoR data within the decision window.
    3.  **SoR Consultation:** Make targeted API calls to relevant SoRs for missing or stale context.
    4.  **Worldview Composition:** Aggregate SoR responses with internal process state to form decision context.
    5.  **Caching:** Store SoR responses in session cache with appropriate TTL for subsequent queries.
    6.  **Audit Trail:** Record SoR consultation details (which systems, what data, response times) in audit log.

*   **Benefits:**
    *   Always operates on current, authoritative business data
    *   No complex ETL processes or data synchronization
    *   Clear data ownership boundaries
    *   Reduced storage overhead and consistency issues

#### 4.3 Business Process Execution
*   **Pattern:** Orchestrated, synchronous calls within an asynchronous workflow.
*   **Flow:**
    1.  An event triggers a GCP Workflow.
    2.  The Workflow makes an HTTP call to the BPO's `/decide-action` endpoint.
    3.  The BPO gathers context by:
        a. Querying its own process state from the audit trail
        b. Dynamically consulting relevant SoRs for fresh business context
        c. Composing a worldview from authoritative, current data
    4.  The BPO returns a "Command List" to the Workflow based on this fresh context.
    5.  The Workflow executes the commands (e.g., calling `DocGen`).
    6.  Upon completion, the Workflow calls the BPO's `/audits` endpoint.
    7.  The BPO records the final orchestration outcome and SoR consultation details in its audit trail.

### 5.0 Phased Implementation Plan

The platform will be built in logical, value-delivering phases.

#### MVP: Single Workflow with Mock Services
*   **Goal:** Single workflow with mock services and file-based storage.
*   **Tasks:**
    *   Build the `crosscut-bpo` Go service with local file storage (audit-log.json).
    *   Create mock "expert" services (Mock PLM) and worker services (Mock DocGen).
    *   Implement in-process orchestration for simplified workflow execution.
    *   Establish SoR consultation patterns with HTTP clients.
*   **Definition of Done:** A single test workflow successfully executes end-to-end with complete audit trail in file storage.

#### Phase 1: Real PostgreSQL with Anchor Model
*   **Goal:** Real PostgreSQL with Anchor Model and materialized views.
*   **Tasks:**
    *   Migrate from file storage to PostgreSQL database.
    *   Implement Anchor Model (6NF) for immutable audit trail.
    *   Create materialized views for read model.
    *   Implement synchronous view refresh within transactions.
*   **Definition of Done:** All workflows operate on PostgreSQL with transactionally consistent read/write models.

#### Phase 2: Additional Workflows and External Integrations
*   **Goal:** Additional workflows and external service integrations.
*   **Tasks:**
    *   Add more complex business workflows.
    *   Integrate with real external systems (PLM, ERP).
    *   Implement GCP Workflows for long-running processes.
    *   Add comprehensive monitoring and alerting.
*   **Definition of Done:** Multiple real workflows operating with external system integrations.

#### Phase 3: Migration to Full CQRS (If Needed)
*   **Goal:** Migration to full CQRS with dedicated read database if needed.
*   **Tasks:**
    *   Evaluate performance requirements for separate read database.
    *   Implement dedicated read database if PostgreSQL materialized views become insufficient.
    *   Establish asynchronous synchronization between write and read models.
*   **Definition of Done:** Scalable read/write separation if performance demands require it.

### 6.0 Definition of Success
The platform is successful when it reliably orchestrates its first high-value, end-to-end business process, demonstrably reducing manual effort and process latency while providing a complete audit trail of the automated workflow.