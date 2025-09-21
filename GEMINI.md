# GEMINI.md: Project CrossCut

## Project Overview

This directory contains the documentation and specifications for **CrossCut**, a cloud-native platform for **domain cross-cutting business process orchestration**.

CrossCut is designed to be the "central nervous system" for an engineering lifecycle. It listens for events from various Systems of Record (SoR) like PLM, ERP, and Git, and then orchestrates automated workflows across these systems. The core mission is to replace manual, error-prone processes with an automated, auditable, and intelligent value chain.

The platform is built on a "Conductor and Experts" model. A central **Business Process Orchestrator (BPO)**, implemented as a Go microservice, acts as the "conductor" or "brain." It designs and directs workflows, but it defers to the existing SoRs as the "experts" for domain-specific logic and data validation.

**Current Status:** The MVP is complete and fully functional, demonstrating an end-to-end workflow.

## Architecture

The current MVP architecture is event-driven and uses a simplified, unified PostgreSQL data layer:

*   **Write Model:** A **PostgreSQL** database using an **Anchor Modeling** schema serves as the immutable, auditable log of all orchestrated actions.
*   **Read Model:** **PostgreSQL materialized views** are used for fast queries of CrossCut's own process state and audit trail.
*   **Data Philosophy:** CrossCut follows an audit-centric approach. It owns only its process orchestration data while consulting external Systems of Record (SoRs) dynamically for business context during decision-making.
*   **Synchronization:** Materialized views are refreshed synchronously within the same transaction as the write model to ensure immediate consistency.
*   **Deployment:** All services are designed as containers intended for deployment on **Google Cloud Platform (GCP)**, utilizing services like **Cloud Run** and **Pub/Sub**. The local MVP environment runs via `docker-compose`.

## Implemented MVP Components

The functional MVP consists of the following services:
- `crosscut-bpo`: The main Go service acting as the BPO.
- `mock-plm-service`: A mock service simulating a PLM system for plan enrichment.
- `mock-docgen-service`: A mock worker service for document generation.

## Building and Running the MVP

The MVP is fully implemented and can be run locally using Docker Compose.

```bash
# Start all services in detached mode
docker-compose up --build -d

# Execute the test workflow
# This sends a "schematic.released" event to the BPO
curl -X POST -H "Content-Type: application/json" \
-d 
  {
    "trigger_event": "schematic.released",
    "payload": {
      "product_name": "ROUTER-100",
      "revision": "C"
    }
  }
\
http://localhost:8080/v1/execute-workflow

# View the generated audit trail
cat data/audit-log.json

# Run the automated test script for a comprehensive check
./test-mvp.sh
```

## Development Conventions

The project adheres to a set of strong development conventions:

*   **API-First Design:** Services communicate through well-defined, versioned RESTful APIs.
*   **Schema-driven Development:**
    *   PostgreSQL schemas are defined in migration files.
    *   The BPO uses **CUE** to validate the structure and integrity of its processes.
    *   SoR integration contracts are defined through **OpenAPI** specifications.
*   **Modularity:** The Go services are structured into clear, modular packages with distinct responsibilities (e.g., `api`, `events`, `workflows`, `database`).
*   **Infrastructure as Code:** All GCP resources are intended to be defined in code (e.g., using Terraform).
*   **Testing:** A strong emphasis on unit testing and comprehensive end-to-end testing, as demonstrated by the `test-mvp.sh` script.

## Implementation Phases

1.  **MVP:** Single workflow with mock services and file-based audit log. ✅ **COMPLETED**
2.  **Phase 1:** Migrate data layer to a real PostgreSQL database with Anchor Modeling and materialized views. ⏳ **NEXT**
3.  **Phase 2:** Implement additional workflows and integrate with real external services.
4.  **Phase 3:** Evolve to a full CQRS architecture with a dedicated read database if performance requirements dictate.