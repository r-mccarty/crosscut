# RFD 2: A Simplified, Postgres-Centric MVP Architecture for CrossCut

**State:** `discussion`

## 1. Motivation

Following the discussion in RFD 1, this document proposes a new, simplified platform specification for the CrossCut MVP. The goal is to formalize the alternative, Postgres-centric architecture that was suggested. 

This design significantly reduces initial complexity and operational overhead by unifying the data layer, while preserving the core value propositions of auditability and orchestration. It provides a clear, pragmatic path to delivering the MVP and establishes a solid foundation that can evolve into the more complex CQRS architecture as the platform scales.

## 2. Proposed MVP Architecture

The core principle of this MVP architecture is the **unification of the data layer within a single PostgreSQL instance**. This database will serve as both the immutable Write Model and the performant Read Model, eliminating the need for a separate database and a complex CDC pipeline for the initial implementation.

### 2.1. Platform Components

```mermaid
graph TD
    subgraph BPO Service (Cloud Run)
        A[API Handlers] --> B{Core Logic};
        B --> C[DB Writer (Transactions)];
        B --> D[DB Reader (Views)];
    end

    subgraph Unified Database (PostgreSQL)
        E[Write Model (Anchor Schema)];
        F[Read Model (Materialized Views)];
    end

    G[GCP Pub/Sub] <--> B;
    C -- ACID Transaction --> E;
    C -- ACID Transaction --> F;
    D -- Queries --> F;
```

#### 2.1.1. The Unified Data Layer (PostgreSQL)

Postgres is a mature, powerful, and well-understood database capable of handling both roles for the MVP.

*   **Write Model (Anchor Schema):** This remains unchanged from the original specification. The use of a highly-normalized, 6NF Anchor Model provides the immutable, auditable log that is a core requirement of the platform. All writes will be `INSERT`s of new, timestamped records.

*   **Read Model (Materialized Views):** Instead of Dgraph, the Read Model will be implemented as a series of denormalized Materialized Views within the same Postgres database. These views are pre-computed query results that are stored physically on disk, providing excellent read performance.

    *   **Example View Creation:** A view for `Parts` would join the `Part_Anchor` with its various attribute tables to create a single, wide, easy-to-query table.

        ```sql
        CREATE MATERIALIZED VIEW parts_read_model AS
        SELECT 
            pa.id AS part_id,
            pa.created_at,
            pna.name AS part_name,
            psa.status AS part_status
            -- ... and so on for other attributes
        FROM 
            part_anchor pa
        LEFT JOIN 
            part_name_attribute pna ON pa.id = pna.part_anchor_id
        LEFT JOIN 
            part_status_attribute psa ON pa.id = psa.part_anchor_id
        -- This would need a more complex query to get the LATEST attribute,
        -- often using a window function like ROW_NUMBER() over a partition.
        WHERE pna.is_latest = true AND psa.is_latest = true;
        ```

#### 2.1.2. The Synchronization Mechanism

With this architecture, the complex, asynchronous CDC pipeline is no longer needed. Synchronization becomes a simple, synchronous, and transactionally-consistent operation.

*   **Responsibility:** The `crosscut-bpo` service is now responsible for keeping the Read Model synchronized.
*   **Mechanism:** After writing to the Anchor Model tables, the BPO will, **within the same ACID transaction**, issue a command to refresh the relevant materialized views.
*   **Command:** The `REFRESH MATERIALIZED VIEW CONCURRENTLY` command will be used. The `CONCURRENTLY` option is critical as it allows the view to be read while it is being refreshed, preventing read locks and ensuring high availability for the BPO's query operations.

#### 2.1.3. The Orchestration Layer (`crosscut-bpo`)

The BPO's core responsibilities remain, but its data interaction patterns are simplified and consolidated.

*   **Data Access Patterns:**
    1.  **Writes:** The BPO wraps all writes to the Anchor Model tables in a transaction.
    2.  **Synchronization:** As the final step within that same transaction, it issues `REFRESH MATERIALIZED VIEW CONCURRENTLY ...` commands for any views affected by the writes.
    3.  **Reads:** When making decisions, the BPO queries the fast, denormalized Materialized Views for context.

*   **Benefit - Strong Consistency:** This design provides strong, immediate consistency. When a BPO transaction is committed, the BPO can immediately query the Read Model and trust that it reflects the changes just made. This eliminates entire classes of potential race conditions and timing issues present in asynchronous pipelines.

#### 2.1.4. Removed Components

This simplified MVP architecture explicitly removes the following components from the initial implementation:

*   GCP Datastream
*   GCS for CDC file storage
*   The `sync-transformer` microservice

### 2.2. Example Workflow

Let's re-examine the `SchematicApproved` workflow in this new architecture:

1.  **Trigger:** An event from Pub/Sub triggers the `crosscut-bpo` service.
2.  **BPO Action (Single Transaction):** The BPO begins a database transaction.
    ```sql
    BEGIN;

    -- 1. Write the facts to the auditable log
    INSERT INTO workflow_instance_anchor (...);
    INSERT INTO workflow_instance_status_attribute (..., status = 'InProgress');

    -- 2. Refresh the Read Model
    REFRESH MATERIALIZED VIEW CONCURRENTLY workflows_read_model;

    COMMIT;
    ```
3.  **BPO Decision:** The transaction is now complete. The BPO can immediately query the `workflows_read_model` view to get the context it needs for the next step in the process, confident that the data is fully consistent.

## 3. Evolutionary Path

This architecture provides a robust starting point and a clear path for evolution. The system can operate with this design until one of two conditions is met:

1.  **Read load** becomes so high that it starts to impact the performance of the primary Postgres instance.
2.  The **time taken to refresh the materialized views** within a transaction becomes unacceptably long, increasing transaction times and reducing write throughput.

When that time comes, the platform can be evolved by:

1.  Introducing a dedicated read-only database (be it Dgraph, Elasticsearch, or a Postgres replica).
2.  Implementing the asynchronous CDC pipeline (`Datastream`, etc.) to populate this new read model.
3.  Removing the `REFRESH` logic from the BPO's transactions.

This evolution can be driven by real-world performance data, not by premature optimization.

## 4. Open Questions

1.  What is the acceptable performance overhead for the `REFRESH` operation within a write transaction for our initial set of workflows?
2.  Do our initial query patterns require any features (e.g., full-text search, complex graph traversal) that a Postgres materialized view cannot adequately provide?
