# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CrossCut is a cloud-native platform for domain cross-cutting business process orchestration. It's designed to be the "central nervous system" for engineering lifecycles, connecting disparate systems (PLM, ERP, Git) into an automated, auditable value chain.

**Current Status:** MVP Complete - Fully functional end-to-end workflow implementation.

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

### Implemented MVP Components

The MVP has been successfully implemented with the following structure:

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

The MVP is fully implemented and ready to use:

```bash
# MVP Development (Ready to Use)
docker-compose up -d                    # Start MVP services
curl -X POST http://localhost:8080/v1/execute-workflow  # Trigger test workflow

# Alternative: Run services directly with Go
cd mock-plm-service && PLM_DATA_PATH=../data/plm-data.json go run main.go &
cd mock-docgen-service && PORT=8082 go run main.go &
cd crosscut-bpo && PLM_SERVICE_URL=http://localhost:8081 DOCGEN_SERVICE_URL=http://localhost:8082 AUDIT_LOG_PATH=../data/audit-log.json go run main.go &

# Test the complete workflow
./test-mvp.sh                          # Run comprehensive test suite

# Production Deployment (Future - Phase 1)
docker build -t gcr.io/project/crosscut-bpo .
gcloud run deploy crosscut-bpo --image gcr.io/project/crosscut-bpo
```

## Testing Approach

The MVP includes comprehensive testing that has been successfully validated:

1. **End-to-End Workflow Testing:** Trigger event via REST API and verify complete orchestration
2. **Service Integration Testing:** Verify communication between BPO, PLM, and DocGen services
3. **Audit Trail Validation:** Confirm complete audit trail in `audit-log.json`
4. **Service Log Verification:** Check service logs for proper data flow
5. **Error Handling Testing:** Validate graceful handling of invalid requests and unknown events
6. **Multi-Product Testing:** Verify different product types (ROUTER-100, SWITCH-200) with different voltage requirements

**Test Results:** All tests passing ✅

## Implementation Phases

Development has successfully completed the MVP and is ready for evolution:

1. **MVP:** Single workflow with mock services and file-based storage ✅ **COMPLETED**
   - CrossCut BPO service orchestrating workflows
   - Mock PLM service for plan enrichment
   - Mock DocGen service for document generation
   - Complete audit trail in file-based storage
   - Full end-to-end "SchematicReleased" workflow

2. **Phase 1:** Real PostgreSQL with Anchor Model and materialized views ⏳ **NEXT**
3. **Phase 2:** Additional workflows and external service integrations
4. **Phase 3:** Migration to full CQRS with dedicated read database if needed

## MVP Deliverables Completed ✅

- **Complete Working Services:** All three services implemented and tested
- **End-to-End Workflow:** "SchematicReleased" → DVT Document Generation
- **Audit-Centric Architecture:** Complete process traceability
- **Dynamic SoR Consultation:** PLM enrichment with voltage resolution
- **Error Handling:** Graceful failure modes and validation
- **Docker Deployment:** Container-ready with docker-compose
- **Test Automation:** Comprehensive test suite (`test-mvp.sh`)
- **Documentation:** Complete usage guide (`MVP-README.md`)