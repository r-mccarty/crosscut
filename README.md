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

*   **Pattern:** Simplified, unified data layer for the MVP, with the option to evolve to full Command Query Responsibility Segregation (CQRS) as the platform scales.
    *   **Write Model:** A PostgreSQL database using an Anchor Modeling schema provides an immutable, auditable log of all platform actions.
    *   **Read Model:** PostgreSQL materialized views serve as a high-performance "World Model," giving the BPO the context it needs to make fast, intelligent decisions.
*   **Orchestration:** Long-running, stateful processes are managed by **GCP Workflows**, which receive their instructions from the stateless BPO service.
*   **Communication:** Asynchronous, event-based communication relies on **GCP Pub/Sub**, while internal, command-based communication uses synchronous RESTful APIs.

## 4. Project Status

**Pre-Alpha / Documentation Phase**

This repository currently contains the vision, specification, and architectural documents for the CrossCut platform. No production code has been implemented yet.

The focus is on establishing a clear and comprehensive plan before implementation begins. The documents in the `/docs` directory provide a detailed blueprint for the system's components, interactions, and deployment strategy.

## 5. How to Contribute

At this stage, the best way to contribute is to review the documentation and provide feedback on the proposed architecture and design.

1.  Start with the `GEMINI.md` file for a comprehensive, AI-generated overview of the project.
2.  Dive into the `/docs` directory to explore the detailed vision and specification documents.