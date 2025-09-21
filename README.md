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

**✅ MVP Complete - Ready to Use!**

The CrossCut MVP has been **successfully implemented and is fully functional**. You can now run the complete end-to-end workflow orchestration system locally.

### What's Implemented

- **Complete End-to-End Workflow**: "SchematicReleased" event → DVT Document Generation
- **Three Working Services**: CrossCut BPO, Mock PLM, and Mock DocGen services
- **Audit-Centric Architecture**: Complete process traceability with immutable audit trail
- **Dynamic SoR Consultation**: Real-time querying of authoritative systems for business context
- **Container Deployment**: Ready-to-run Docker Compose environment

## 5. Quick Start Guide

### Prerequisites

- **Go 1.21+** (for direct execution)
- **Docker & Docker Compose** (for containerized deployment)
- **curl** (for testing)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd crosscut

# Start all services
docker-compose up --build -d

# Test the workflow
curl -X POST -H "Content-Type: application/json" \
-d '{
  "trigger_event": "schematic.released",
  "payload": {
    "product_name": "ROUTER-100",
    "revision": "C"
  }
}' \
http://localhost:8080/v1/execute-workflow

# View the complete audit trail
cat data/audit-log.json
```

### Option 2: Direct Go Execution

```bash
# Terminal 1: Start Mock PLM Service
cd mock-plm-service
PLM_DATA_PATH=../data/plm-data.json go run main.go

# Terminal 2: Start Mock DocGen Service
cd mock-docgen-service
PORT=8082 go run main.go

# Terminal 3: Start CrossCut BPO Service
cd crosscut-bpo
PLM_SERVICE_URL=http://localhost:8081 \
DOCGEN_SERVICE_URL=http://localhost:8082 \
AUDIT_LOG_PATH=../data/audit-log.json \
go run main.go

# Terminal 4: Test the workflow
curl -X POST -H "Content-Type: application/json" \
-d '{
  "trigger_event": "schematic.released",
  "payload": {
    "product_name": "ROUTER-100",
    "revision": "C"
  }
}' \
http://localhost:8080/v1/execute-workflow
```

### Option 3: Automated Testing

```bash
# Run comprehensive test suite
./test-mvp.sh
```

This will:
- Verify all services are healthy
- Execute end-to-end workflows
- Validate audit trail completeness
- Test error handling scenarios
- Verify different product types

## 6. What You'll See

### Successful Workflow Response
```json
{
  "status": "success",
  "workflow_id": "wf-1758425317",
  "message": "Workflow completed successfully",
  "document_url": "gcs://fake-bucket/ROUTER-100-DVT-Procedure-Rev-C-20250921-032837.docx"
}
```

### Complete Audit Trail
The system captures every step in `data/audit-log.json`:
- Workflow started
- Template plan generated
- PLM consultation (voltage: UNRESOLVED → 12V)
- DocGen command executed
- Workflow completed

### Service Logs
- **PLM Service**: "Enriching plan for product: ROUTER-100"
- **DocGen Service**: "Received render job for ROUTER-100 with voltage 12V"
- **BPO Service**: "Workflow completed successfully"

## 7. Architecture Demonstrated

The MVP successfully demonstrates:

- **Conductor and Experts Pattern**: BPO orchestrates, PLM provides expertise, DocGen executes work
- **Audit-Centric Data Model**: CrossCut owns only process data, consults SoRs for business context
- **Event-Driven Workflows**: Business events trigger automated orchestration
- **Service Isolation**: Clear boundaries between orchestration, domain logic, and execution

## 8. Available Services

| Service | Port | Purpose | Key Endpoint |
|---------|------|---------|--------------|
| CrossCut BPO | 8080 | Workflow Orchestration | `POST /v1/execute-workflow` |
| Mock PLM | 8081 | Plan Enrichment | `POST /enrich-plan` |
| Mock DocGen | 8082 | Document Generation | `POST /generate` |

## 9. Supported Products

- **ROUTER-100**: 12V voltage requirement
- **SWITCH-200**: 24V voltage requirement

Test different products to see dynamic voltage resolution!

## 10. Documentation

- **`MVP-README.md`**: Comprehensive implementation guide
- **`CLAUDE.md`**: Development guidelines and project overview
- **`docs/`**: Detailed architectural specifications
- **`test-mvp.sh`**: Automated testing script

## 11. Next Steps

The MVP provides a solid foundation for evolution:

1. **Phase 1**: Migrate to PostgreSQL with Anchor Model
2. **Phase 2**: Add real SoR integrations and GCP Workflows
3. **Phase 3**: Scale to full CQRS architecture

## 12. Contributing

The MVP is complete and ready for use! To contribute:

1. **Test the MVP**: Run the workflows and provide feedback
2. **Explore the Code**: Review the service implementations
3. **Suggest Enhancements**: Propose features for Phase 1
4. **Report Issues**: Help us improve the implementation

---

**🎉 The CrossCut MVP is ready to demonstrate intelligent cross-domain business process orchestration!**