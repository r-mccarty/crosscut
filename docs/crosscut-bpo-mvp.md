## CrossCut MVP Specification: The "First Automated Workflow"

### 1. MVP Goal

To build and run a self-contained, end-to-end demonstration of a cross-domain business process. The MVP will prove that the `crosscut-bpo` service can be triggered by an event, consult an external "expert" service (a mock PLM) to enrich a plan, and then command a "worker" service (a mock DocGen) to perform an action.

This MVP is successful if we can trace a single, simulated `SchematicReleased` event through the entire lifecycle, resulting in a final, auditable record.

### 2. Scope & Simplifications for Codespaces

| Full Architecture Component | MVP Simplification | Rationale |
| :--- | :--- | :--- |
| GCP Workflows | **In-Process Orchestration.** A single function call within the BPO will execute the sequence. | Avoids dependency on a managed cloud service. The *logic* of the sequence is what we're testing. |
| Unified Postgres DB | **A local `audit-log.json` file.** The BPO reads from and writes to this single file. | Simulates a unified read/write model without the overhead of running a database. |
| PLM & ERP Services | **A single `mock-plm-service`.** | Proves the "expert" pattern with one simple, controllable mock. |
| DocGen2 & VizGen Workers | **A single `mock-docgen-service`.** | Proves the "worker" pattern. Doesn't need to generate a real document. |
| Pub/Sub | **A `curl` command to a REST endpoint.** | Simulates an event trigger in the simplest way possible for a developer. |

### 3. MVP Components

The entire MVP will run within a single `docker-compose.yml` file, making it instantly launchable in GitHub Codespaces.

1.  **`crosscut-bpo` (The Brain):** The core Go service. It will expose one primary REST endpoint to trigger the workflow. It will use a single `audit-log.json` file for its read context and as its write target.
2.  **`mock-plm-service` (The Expert):** A tiny Go or Python web service (e.g., using Gin or Flask). It exposes one endpoint: `POST /enrich-plan`. It reads its own "database" from a `plm-data.json` file to find the correct voltage for a given product.
3.  **`mock-docgen-service` (The Worker):** Another tiny web service. It exposes one endpoint: `POST /render`. It receives the final plan, prints it to the console (to prove it got the right data), and returns a `200 OK` with a fake document URL.

### 4. The End-to-End MVP Flow: "Happy Path"

This is the entire test case for the MVP.

1.  **Setup:** The developer opens the repository in a GitHub Codespace and runs `docker-compose up -d`. All three services start.

2.  **The Trigger (Simulating a Pub/Sub Event):** The developer runs a single `curl` command in the terminal:
    ```bash
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

3.  **The Orchestration (What happens inside the containers):**
    a. The `crosscut-bpo` service receives the request.
    b. It reads its history from `audit-log.json` to determine that a `schematic.released` event requires a `DVT_Procedure` to be created.
    c. It generates a "template plan": `{"product": "ROUTER-100", "components": [{"name": "PowerTest", "voltage": "UNRESOLVED"}]}`.
    d. It makes an HTTP call to the `mock-plm-service` with this template plan.
    e. The `mock-plm-service` reads `plm-data.json`, finds that `ROUTER-100` requires `12V`, and returns the enriched plan: `{"...": "...", "voltage": "12V"}`.
    f. The `crosscut-bpo` service receives the enriched plan.
    g. It makes an HTTP call to the `mock-docgen-service` with the final, resolved plan.
    h. The `mock-docgen-service` prints "Received render job for ROUTER-100 with voltage 12V" to the container logs and returns `{"status": "success", "url": "gcs://fake-bucket/doc-123.docx"}`.
    i. The `crosscut-bpo` service receives the success response.
    j. It writes a final entry to `audit-log.json` confirming the workflow completed successfully with the generated artifact URL.
    k. It returns a `200 OK` to the original `curl` command.

4.  **Verification:** The developer checks two things:
    *   The logs of the `mock-docgen-service` container to confirm it received the correct, enriched data.
    *   The contents of the `audit-log.json` file to confirm the entire process was recorded.

### 5. Repository Structure

```
/
├── .devcontainer/             # Configuration for GitHub Codespaces
│   └── devcontainer.json
├── docker-compose.yml         # Defines the three services for the MVP
├── crosscut-bpo/              # Source code for the main Go service
│   ├── cmd/main.go
│   ├── internal/
│   ├── go.mod
│   └── Dockerfile
├── mock-plm-service/          # Source for the mock PLM
│   ├── main.go
│   └── Dockerfile
├── mock-docgen-service/       # Source for the mock DocGen
│   ├── main.go
│   └── Dockerfile
├── data/                      # Simulated data stores
│   ├── plm-data.json
│   └── audit-log.json         # Will be created on first run
└── README.md                  # Instructions for running the MVP
```

This MVP is achievable, demonstrates immense value, and perfectly tests the core architectural hypothesis in a simple, developer-friendly environment.