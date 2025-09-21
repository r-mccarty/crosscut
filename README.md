# CrossCut: A Domain Cross-Cutting Business Process Orchestrator

## 1. The Vision

CrossCut is a platform designed to be the **central nervous system for your engineering lifecycle**. Its mission is to connect disparate, specialized systems (PLM, ERP, Git, etc.) into a single, automated, and auditable value chain. It moves beyond simple task automation to the intelligent orchestration of complex, end-to-end business processes.

Instead of relying on engineers to act as "human APIs"—manually transferring data and coordinating work between systems—CrossCut codifies the process itself. It listens for critical business events and orchestrates a coordinated, multi-domain response to drive value forward, transforming a collection of siloed tools into a true, automated enterprise.

## 2. Core Concepts

The platform is built on a "Conductor and Experts" paradigm:

*   **The Conductor (Business Process Orchestrator - BPO):** A central, Go-based microservice that acts as the "brain" of the operation. It designs and directs workflows based on high-level business intents.
*   **The Experts (Systems of Record - SoRs):** The authoritative systems (PLM, ERP, etc.) that own their respective data and domain logic. CrossCut *consults* these experts for validation and data enrichment, but it does not own their data.

This approach enables centralized orchestration while maintaining decentralized authority, ensuring that logic lives with the data owner.

## 3. Architecture at a Glance

CrossCut is architected as a cloud-native, event-driven platform designed for Google Cloud Platform (GCP).

*   **Pattern:** Unified PostgreSQL data layer serving as both Write Model (Anchor Schema) and Read Model (Materialized Views).
    *   **Write Model:** PostgreSQL database using 6NF Anchor Modeling for immutable, auditable logs of platform orchestration actions.
    *   **Read Model:** Denormalized PostgreSQL materialized views for fast queries of CrossCut's own process state and audit trail.
*   **Data Philosophy:** CrossCut maintains an audit-centric approach - it owns process orchestration data while consulting external Systems of Record (SoRs) dynamically for business context when making decisions.
*   **Orchestration:** The stateless BPO service handles workflow orchestration directly, using PostgreSQL transactions for consistency.
*   **Communication:** Asynchronous, event-based communication relies on **GCP Pub/Sub** for external events, while SoR consultation uses synchronous RESTful APIs.

## 4. Project Status

**Pre-Alpha / Documentation Phase**

This repository currently contains the vision, specification, and architectural documents for the CrossCut platform. No production code has been implemented yet.

The focus is on establishing a clear and comprehensive plan before implementation begins. The documents in the `/docs` directory provide a detailed blueprint for the system's components, interactions, and deployment strategy.

## 5. How to Contribute

At this stage, the best way to contribute is to review the documentation and provide feedback on the proposed architecture and design.

1.  Start with the `GEMINI.md` file for a comprehensive, AI-generated overview of the project.
2.  Dive into the `/docs` directory to explore the detailed vision and specification documents.