# GEMINI.md: Project CrossCut

## Project Overview

This directory contains the documentation and specifications for **CrossCut**, a cloud-native platform for **domain cross-cutting business process orchestration**.

CrossCut is designed to be the "central nervous system" for an engineering lifecycle. It listens for events from various Systems of Record (SoR) like PLM, ERP, and Git, and then orchestrates automated workflows across these systems. The core mission is to replace manual, error-prone processes with an automated, auditable, and intelligent value chain.

The platform is built on a "Conductor and Experts" model. A central **Business Process Orchestrator (BPO)**, implemented as a Go microservice, acts as the "conductor" or "brain." It designs and directs workflows, but it defers to the existing SoRs as the "experts" for domain-specific logic and data validation.

The architecture is event-driven and leverages a **Command Query Responsibility Segregation (CQRS)** pattern:

*   **Write Model:** A **PostgreSQL** database using an **Anchor Modeling** schema serves as the immutable, auditable log of all orchestrated actions.
*   **Read Model:** A **Dgraph** graph database provides a high-performance "World Model" for the BPO to make fast, context-aware decisions.
*   **Synchronization:** A Change Data Capture (CDC) pipeline using **GCP Datastream** and a custom Go `sync-transformer` service keeps the Dgraph read model synchronized with the Postgres write model.

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

# Deploy the service to GCP Cloud Run
gcloud run deploy crosscut-bpo \
  --image gcr.io/your-project-id/crosscut-bpo \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Build and deploy the Dgraph instance (as per dgraph-deployment-gcp.md)
# This involves building a custom Docker container and deploying it to Cloud Run
# with a persistent volume.
# (See docs/dgraph-deployment-gcp.md for detailed steps)

# Deploy the sync-transformer service
# (Similar to the crosscut-bpo service)
```

## Development Conventions

The documentation implies a set of strong development conventions:

*   **Infrastructure as Code:** All GCP resources, including services, workflows, and Pub/Sub topics, should be defined in code (e.g., using Terraform or GCP's own configuration tools).
*   **API-First Design:** The services communicate through well-defined, versioned RESTful APIs. The `crosscut-bpo-go-service.md` provides a clear specification for the BPO's API.
*   **Schema-driven Development:**
    *   The Dgraph schema is defined in a GraphQL schema file and stored in source control.
    *   The BPO uses CUE to validate the structure and integrity of its own processes and plans.
*   **Modularity:** The Go service is structured into clear, modular packages with distinct responsibilities (e.g., `api`, `events`, `workflows`, `database`).
*   **Testing:** The emphasis on single-responsibility functions (`activities`) suggests a strong unit testing culture.
*   **Phased Implementation:** The `crosscut-platform-spec.md` outlines a phased approach to development, starting with the core data pipeline and progressively adding functionality.
