# GEMINI.md: Project CrossCut

## Project Overview

This directory contains the documentation and specifications for **CrossCut**, a cloud-native platform for **domain cross-cutting business process orchestration**.

CrossCut is designed to be the "central nervous system" for an engineering lifecycle. It listens for events from various Systems of Record (SoR) like PLM, ERP, and Git, and then orchestrates automated workflows across these systems. The core mission is to replace manual, error-prone processes with an automated, auditable, and intelligent value chain.

The platform is built on a "Conductor and Experts" model. A central **Business Process Orchestrator (BPO)**, implemented as a Go microservice, acts as the "conductor" or "brain." It designs and directs workflows, but it defers to the existing SoRs as the "experts" for domain-specific logic and data validation.

The architecture is event-driven with a simplified, unified PostgreSQL data layer:

*   **Write Model:** A **PostgreSQL** database using an **Anchor Modeling** schema serves as the immutable, auditable log of all orchestrated actions.
*   **Read Model:** **PostgreSQL materialized views** focused on CrossCut's own process state and audit trail, not external SoR data.
*   **Data Philosophy:** CrossCut follows an audit-centric approach - it owns only process orchestration data while consulting external Systems of Record (SoRs) dynamically for business context.
*   **Synchronization:** Materialized views are refreshed synchronously within write transactions for immediate consistency.

All services are designed to be deployed on **Google Cloud Platform (GCP)**, utilizing services like **Cloud Run**, **GCP Workflows**, and **Pub/Sub**.

## Building and Running

This project is primarily composed of documentation and specifications. There is no directly runnable code in the current directory structure.

However, the technical specifications describe a Go-based microservice (`crosscut-bpo`) and a deployment strategy using GCP. Based on the `crosscut-bpo-go-service.md` and `dgraph-deployment-gcp.md` documents, the following commands would be relevant for building and deploying the components of this system.

**TODO: The following commands are placeholders based on the documentation and need to be adapted once the actual source code and build scripts are in place.**

```bash
# Build the Docker container for the crosscut-bpo Go service
# (Assuming a Dockerfile exists in the service's source directory)
docker build -t gcr.io/your-project-id/crosscut-bpo .

# Push the container to Google Container Registry
docker push gcr.io/your-project-id/crosscut-bpo

# Deploy the service to GCP Cloud Run with PostgreSQL connection
gcloud run deploy crosscut-bpo \
  --image gcr.io/your-project-id/crosscut-bpo \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Deploy PostgreSQL database (Cloud SQL)
gcloud sql instances create crosscut-postgres \
  --database-version=POSTGRES_13 \
  --tier=db-f1-micro \
  --region=us-central1
```

## Development Conventions

The documentation implies a set of strong development conventions:

*   **Infrastructure as Code:** All GCP resources, including services, workflows, and Pub/Sub topics, should be defined in code (e.g., using Terraform or GCP's own configuration tools).
*   **API-First Design:** The services communicate through well-defined, versioned RESTful APIs. The `crosscut-bpo-go-service.md` provides a clear specification for the BPO's API.
*   **Schema-driven Development:**
    *   PostgreSQL schemas for both anchor model and materialized views are defined in migration files.
    *   The BPO uses CUE to validate the structure and integrity of its own processes and plans.
    *   SoR integration contracts are defined through OpenAPI specifications.
*   **Modularity:** The Go service is structured into clear, modular packages with distinct responsibilities (e.g., `api`, `events`, `workflows`, `database`).
*   **Testing:** The emphasis on single-responsibility functions (`activities`) suggests a strong unit testing culture.
*   **Phased Implementation:** The `crosscut-platform-spec.md` outlines a phased approach to development, starting with the core data pipeline and progressively adding functionality.
