# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CrossCut is a cloud-native platform for domain cross-cutting business process orchestration. It's designed to be the "central nervous system" for engineering lifecycles, connecting disparate systems (PLM, ERP, Git) into an automated, auditable value chain.

**Current Status:** Pre-Alpha / Documentation Phase - No production code implemented yet.

## Architecture

The platform follows a "Conductor and Experts" paradigm:

- **Business Process Orchestrator (BPO):** Central Go-based microservice that orchestrates workflows
- **Systems of Record (SoRs):** External authoritative systems that own domain data and logic

### MVP Architecture (RFD 2)

The current MVP design uses a simplified, Postgres-centric architecture:

- **Unified Data Layer:** Single PostgreSQL instance serving as both Write Model (Anchor Schema) and Read Model (Materialized Views)
- **Write Model:** Uses 6NF Anchor Modeling for immutable, auditable logs
- **Read Model:** Denormalized Materialized Views for fast queries
- **Synchronization:** Synchronous, transactionally-consistent using `REFRESH MATERIALIZED VIEW CONCURRENTLY`
- **Deployment:** GCP Cloud Run with Pub/Sub for event-driven communication

### Planned MVP Components

According to `crosscut-bpo-mvp.md`, the MVP will include:

```
/
├── crosscut-bpo/              # Main Go service (BPO)
├── mock-plm-service/          # Mock PLM expert service
├── mock-docgen-service/       # Mock document generation worker
├── data/                      # Simulated data stores
│   ├── plm-data.json
│   └── audit-log.json
└── docker-compose.yml         # MVP deployment configuration
```

## Development Guidelines

### Core Principles

- **Event-Driven Architecture:** All communication through events and APIs
- **Immutable Audit Trail:** All actions must be recorded in the audit log
- **Domain Separation:** BPO orchestrates, but defers to SoRs for domain logic
- **Audit-Centric Data Model:** CrossCut owns only process orchestration data, consults SoRs dynamically for business context
- **API-First Design:** Well-defined, versioned RESTful APIs
- **Schema-Driven:** Use CUE for process validation, GraphQL schema for data models

### Data Patterns

- **Writes:** Always use ACID transactions with Anchor Model inserts for process data
- **Reads:** Query materialized views for CrossCut's own process state and audit trail
- **SoR Consultation:** Make dynamic API calls to SoRs for business context during decision-making
- **Synchronization:** Refresh materialized views within write transactions (process data only)

### Technology Stack

- **Primary Language:** Go
- **Database:** PostgreSQL with Anchor Modeling
- **Cloud Platform:** Google Cloud Platform (GCP)
- **Services:** Cloud Run, Pub/Sub, Workflows (future)
- **Containerization:** Docker with docker-compose for local development

## Key Documents

Essential reading for understanding the project:

- `README.md` - Project vision and overview
- `GEMINI.md` - Comprehensive AI-generated project summary
- `docs/RFD-2-Simplified-MVP-Architecture.md` - Current MVP architecture specification
- `docs/RFD-3-Read-Model-Scope-and-Data-Boundaries.md` - Audit-centric data model approach
- `docs/crosscut-bpo-mvp.md` - MVP implementation plan
- `docs/crosscut-platform-spec.md` - Detailed platform specification
- `docs/crosscut-bpo-go-service.md` - BPO service specification

## Development Commands

**Note:** As this is a documentation-only repository, these commands are placeholders from the specifications for future implementation:

```bash
# MVP Development (Future)
docker-compose up -d                    # Start MVP services
curl -X POST http://localhost:8080/v1/execute-workflow  # Trigger test workflow

# Production Deployment (Future)
docker build -t gcr.io/project/crosscut-bpo .
gcloud run deploy crosscut-bpo --image gcr.io/project/crosscut-bpo
```

## Testing Approach

The MVP focuses on end-to-end workflow testing:

1. Trigger event via REST API
2. Verify orchestration through mock services
3. Validate audit trail in `audit-log.json`
4. Check service logs for proper data flow

## Implementation Phases

Per the specifications, development should follow this phased approach:

1. **MVP:** Single workflow with mock services and file-based storage
2. **Phase 1:** Real PostgreSQL with Anchor Model and materialized views
3. **Phase 2:** Additional workflows and external service integrations
4. **Phase 3:** Migration to full CQRS with dedicated read database if needed