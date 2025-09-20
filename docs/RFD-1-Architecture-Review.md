# RFD 1: CrossCut Architecture - A Review of the Core Data Pipeline

**State:** `discussion`

## Motivation

The CrossCut documentation outlines a sophisticated and powerful architecture for a business process orchestrator. The vision is clear, and the proposed design correctly identifies many of the key technical challenges. The purpose of this RFD is to collaboratively review the core data-plane architecture, probe its assumptions, and ensure the initial implementation is appropriately scoped to deliver value quickly while managing complexity and risk. 

This document is intended to open up elements of the design for discussion, not to invalidate the significant work done so far.

## What the Architecture Does Well

It is important to first acknowledge the considerable strengths of the proposed architecture:

1.  **Clear Separation of Concerns (CQRS):** The explicit separation of the Write Model (for auditability) from the Read Model (for performance) is a mature and powerful pattern. It shows a deep understanding of the different demands these two functions will have.

2.  **Event-Driven and Extensible:** The use of Pub/Sub as the system's backbone is a superb choice. It allows the platform to be highly extensible, enabling new services and listeners to be added without modifying existing components.

3.  **Federated Governance:** The "Conductor and Experts" paradigm is perhaps the most critical insight. It avoids the classic trap of creating a monolithic "God" service and instead respects the sovereignty of existing Systems of Record. This is both technically and organizationally astute.

4.  **Auditability by Design:** The selection of an Anchor Modeling approach for the Write Model demonstrates a serious commitment to providing a complete, immutable audit trail, which is a core value proposition of the platform.

## Core Thesis for Discussion

While the proposed architecture is an excellent vision for the platform at scale, it may be **overly complex for an initial implementation (MVP)**. The number of moving parts in the core data pipeline introduces significant operational overhead, developmental complexity, and multiple potential points of failure. 

This RFD proposes that a **simpler, more synchronous initial architecture** could deliver the core value proposition with less risk and then evolve into the fully-featured CDC model as performance and scale requirements dictate.

## Architectural Areas for Discussion

### 1. The CDC Data Pipeline

The proposed pipeline (`Datastream -> GCS -> Pub/Sub -> sync-transformer`) is a robust, asynchronous pattern. However, it raises several questions for an initial implementation:

*   **Operational Complexity:** This pipeline involves four distinct, managed services. This means four sets of configurations, IAM permissions, monitoring, and potential failure modes. Is this operational burden justified on day one?
*   **Development & Debugging:** End-to-end testing and debugging of this pipeline can be challenging. A failure in any part of the chain can be difficult to trace. How do we provide a smooth local development experience that mimics this chain?
*   **Latency:** What is the expected end-to-end latency for a change in Postgres to be reflected in Dgraph? While described as "near-real-time," this could be on the order of seconds. Is this acceptable for all workflows, or will some BPO decisions require more immediate consistency between the write and read models?

### 2. Dgraph and the "World Model"

Dgraph is a powerful choice, but it also brings a unique set of challenges.

*   **Is a Graph Database a Day-One Necessity?** The primary justification for Dgraph is to run fast, multi-hop traversal queries. Do we anticipate these types of queries being essential for the initial set of workflows? Or would simpler key-value lookups or relational queries on a denormalized model suffice for the MVP?
*   **Technology Niche & Expertise:** Dgraph is a relatively niche technology. Does the team have existing expertise in deploying, managing, and optimizing it? Committing to a niche technology can introduce hiring and operational friction.
*   **The "World Model" Scope:** The concept of caching data from *all* relevant external SoRs is ambitious. The current spec focuses on synchronizing from the internal Postgres DB. The mechanism for ingesting and synchronizing from external systems (like a PLM or ERP) is not fully detailed and represents a significant data integration challenge in itself.

### 3. Anchor Modeling (6NF)

Anchor Modeling is theoretically perfect for auditability, but it comes at a cost.

*   **Transformational Complexity:** The logic within the `sync-transformer` to convert 6NF data into a denormalized graph is non-trivial. This transformation layer can become a performance bottleneck and a source of complex bugs. Every new attribute or relationship in the core model requires a corresponding change in the transformation logic.
*   **Is it Overkill?** Could a simpler, append-only ledger-style table in Postgres achieve a sufficient level of auditability for the MVP? For example, a single `events` table that stores immutable JSON blobs could be simpler to manage and query initially, while still providing a historical record.

## Proposal: An Alternative, Phased Architecture

I propose an alternative path that starts simpler and evolves into the target architecture based on demonstrated need.

### Phase 1: The Unified Postgres MVP

For the initial implementation, we could **use Postgres for everything**.

1.  **Write Model:** Keep the **Anchor Model** schema as the auditable log. This is a core strength.
2.  **Read Model:** Instead of Dgraph, create a set of **Materialized Views** within the same Postgres database. These views would be denormalized and optimized for the specific query patterns needed by the BPO for its initial workflows.
3.  **Synchronization:** **Eliminate the entire CDC pipeline.** The `crosscut-bpo` service itself becomes responsible for synchronization. Within the same ACID transaction that it writes to the Anchor Model tables, it would also trigger a refresh of the relevant Materialized Views.

**Benefits of this approach:**
*   **Drastically Reduced Complexity:** We replace four managed services with a single database.
*   **Strong Consistency:** Because the read model (views) is updated in the same transaction as the write model, the BPO can have immediate, strong consistency when it needs it.
*   **Simplified Development:** Local development and testing become much simpler (just a single Postgres instance).
*   **Uses Existing Expertise:** It relies on Postgres, a well-understood and widely-used technology.

### Phase 2: Evolving to CQRS

This simpler architecture does not preclude the original vision. It provides a clear evolutionary path:

*   When the read query load grows and refreshing materialized views becomes a performance bottleneck, we can introduce a dedicated read model.
*   At this point, we will have **real-world query patterns** to inform our choice. We can make a data-driven decision between Dgraph, Elasticsearch, or another technology.
*   The CDC pipeline (`Datastream`, etc.) would then be introduced as the mechanism to scale our synchronization process, decoupling the write and read paths.

## Potential Value Extensions & Future Features

Regardless of the underlying data-plane architecture, the CrossCut platform is well-positioned for several high-value extensions:

*   **Process Mining & Analytics:** The auditable log is a goldmine. We should plan to build an analytics layer (e.g., using Metabase or Looker) on top of the Write Model to provide insights into process bottlenecks, cycle times, and operational efficiency.
*   **Human-in-the-Loop Workflows:** The current design is fully automated. A powerful extension would be to allow the BPO to orchestrate workflows that require human intervention, such as assigning a manual approval task and waiting for a response before proceeding.
*   **AI-Powered Plan Generation:** The spec mentions this, and it's a key feature. The BPO could use an LLM to generate a *draft* workflow plan based on a high-level natural language intent (e.g., "Create a new test procedure for the ROUTER-100 rev C board"). This draft would then be passed through the existing Federated Governance gauntlet for validation and enrichment by the authoritative SoRs, combining the creative strengths of AI with the compliance and rigor of the expert systems.

## Open Questions

1.  Is the operational complexity of the full CDC pipeline a necessary risk for the initial product launch?
2.  What specific multi-hop graph queries do we anticipate needing for our MVP workflows that would justify a native graph database over a denormalized relational model?
3.  Have we considered a simpler audit mechanism (like an append-only event log) as an alternative to the transformational complexity of Anchor Modeling?
4.  Could a phased, Postgres-first approach allow us to deliver value faster while still providing a clear path to the target architecture?
