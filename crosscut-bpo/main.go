package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// WorkflowRequest represents an incoming workflow trigger
type WorkflowRequest struct {
	TriggerEvent string                 `json:"trigger_event"`
	Payload      map[string]interface{} `json:"payload"`
}

// WorkflowResponse represents the response from workflow execution
type WorkflowResponse struct {
	Status      string `json:"status"`
	WorkflowID  string `json:"workflow_id"`
	Message     string `json:"message"`
	DocumentURL string `json:"document_url,omitempty"`
}

// AuditEntry represents an entry in the audit log
type AuditEntry struct {
	Timestamp   time.Time              `json:"timestamp"`
	WorkflowID  string                 `json:"workflow_id"`
	Event       string                 `json:"event"`
	Action      string                 `json:"action"`
	Status      string                 `json:"status"`
	Details     map[string]interface{} `json:"details,omitempty"`
	Error       string                 `json:"error,omitempty"`
}

// TemplatePlan represents a document plan template
type TemplatePlan struct {
	Product    string               `json:"product"`
	Components []ComponentTemplate  `json:"components"`
}

// ComponentTemplate represents a component template needing enrichment
type ComponentTemplate struct {
	Name    string `json:"name"`
	Voltage string `json:"voltage"`
}

// EnrichedPlan represents the enriched plan from PLM
type EnrichedPlan struct {
	Product    string               `json:"product"`
	Components []EnrichedComponent  `json:"components"`
}

// EnrichedComponent represents a component with resolved voltage
type EnrichedComponent struct {
	Name    string `json:"name"`
	Voltage string `json:"voltage"`
}

// DocumentPlan represents the final document plan for DocGen
type DocumentPlan struct {
	DocProps *DocProps           `json:"doc_props,omitempty"`
	Body     []ComponentInstance `json:"body"`
}

// DocProps represents document metadata
type DocProps struct {
	Filename string `json:"filename,omitempty"`
}

// ComponentInstance represents a component instance in the document
type ComponentInstance struct {
	Component string                 `json:"component"`
	Props     map[string]interface{} `json:"props"`
}

// DocGenResponse represents response from DocGen service
type DocGenResponse struct {
	Status             string `json:"status"`
	URL                string `json:"url"`
	Filename           string `json:"filename"`
	GenerationTimeMs   int    `json:"generation_time_ms"`
	ComponentsRendered int    `json:"components_rendered"`
}

// BPOService handles business process orchestration
type BPOService struct {
	auditLogPath      string
	plmServiceURL     string
	docgenServiceURL  string
}

// NewBPOService creates a new BPO service instance
func NewBPOService(auditLogPath, plmServiceURL, docgenServiceURL string) *BPOService {
	return &BPOService{
		auditLogPath:     auditLogPath,
		plmServiceURL:    plmServiceURL,
		docgenServiceURL: docgenServiceURL,
	}
}

// generateWorkflowID generates a unique workflow ID
func (s *BPOService) generateWorkflowID() string {
	return fmt.Sprintf("wf-%d", time.Now().Unix())
}

// writeAuditEntry writes an entry to the audit log
func (s *BPOService) writeAuditEntry(entry AuditEntry) error {
	absPath, err := filepath.Abs(s.auditLogPath)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %w", err)
	}

	// Read existing entries
	var entries []AuditEntry
	if data, err := os.ReadFile(absPath); err == nil && len(data) > 0 {
		if err := json.Unmarshal(data, &entries); err != nil {
			log.Printf("Warning: failed to unmarshal existing audit log: %v", err)
			entries = []AuditEntry{} // Start fresh if corrupted
		}
	}

	// Append new entry
	entries = append(entries, entry)

	// Write back to file
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal audit entries: %w", err)
	}

	if err := os.WriteFile(absPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write audit log: %w", err)
	}

	return nil
}

// consultPLM consults the PLM service for plan enrichment
func (s *BPOService) consultPLM(template TemplatePlan) (*EnrichedPlan, error) {
	url := s.plmServiceURL + "/enrich-plan"

	jsonData, err := json.Marshal(template)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal template: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to call PLM service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("PLM service returned %d: %s", resp.StatusCode, string(body))
	}

	var enriched EnrichedPlan
	if err := json.NewDecoder(resp.Body).Decode(&enriched); err != nil {
		return nil, fmt.Errorf("failed to decode PLM response: %w", err)
	}

	return &enriched, nil
}

// commandDocGen commands the DocGen service to generate a document
func (s *BPOService) commandDocGen(plan DocumentPlan) (*DocGenResponse, error) {
	url := s.docgenServiceURL + "/generate"

	jsonData, err := json.Marshal(plan)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal document plan: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to call DocGen service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("DocGen service returned %d: %s", resp.StatusCode, string(body))
	}

	var response DocGenResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode DocGen response: %w", err)
	}

	return &response, nil
}

// executeSchematicReleasedWorkflow executes the schematic released workflow
func (s *BPOService) executeSchematicReleasedWorkflow(workflowID string, payload map[string]interface{}) (*WorkflowResponse, error) {
	// Extract product information
	productName, ok := payload["product_name"].(string)
	if !ok {
		return nil, fmt.Errorf("product_name is required in payload")
	}

	revision, ok := payload["revision"].(string)
	if !ok {
		revision = "A" // Default revision
	}

	// Step 1: Start workflow
	if err := s.writeAuditEntry(AuditEntry{
		Timestamp:  time.Now(),
		WorkflowID: workflowID,
		Event:      "schematic.released",
		Action:     "workflow_started",
		Status:     "success",
		Details: map[string]interface{}{
			"product_name": productName,
			"revision":     revision,
		},
	}); err != nil {
		log.Printf("Failed to write audit entry: %v", err)
	}

	// Step 2: Generate template plan
	template := TemplatePlan{
		Product: productName,
		Components: []ComponentTemplate{
			{
				Name:    "PowerTest",
				Voltage: "UNRESOLVED",
			},
		},
	}

	if err := s.writeAuditEntry(AuditEntry{
		Timestamp:  time.Now(),
		WorkflowID: workflowID,
		Event:      "schematic.released",
		Action:     "template_plan_generated",
		Status:     "success",
		Details: map[string]interface{}{
			"template": template,
		},
	}); err != nil {
		log.Printf("Failed to write audit entry: %v", err)
	}

	// Step 3: Consult PLM for enrichment
	enriched, err := s.consultPLM(template)
	if err != nil {
		auditErr := s.writeAuditEntry(AuditEntry{
			Timestamp:  time.Now(),
			WorkflowID: workflowID,
			Event:      "schematic.released",
			Action:     "plm_consultation",
			Status:     "failed",
			Error:      err.Error(),
		})
		if auditErr != nil {
			log.Printf("Failed to write audit entry: %v", auditErr)
		}
		return nil, fmt.Errorf("PLM consultation failed: %w", err)
	}

	if err := s.writeAuditEntry(AuditEntry{
		Timestamp:  time.Now(),
		WorkflowID: workflowID,
		Event:      "schematic.released",
		Action:     "plm_consultation",
		Status:     "success",
		Details: map[string]interface{}{
			"enriched_plan": enriched,
		},
	}); err != nil {
		log.Printf("Failed to write audit entry: %v", err)
	}

	// Step 4: Build document plan
	filename := fmt.Sprintf("%s-DVT-Procedure-Rev-%s", productName, revision)

	documentPlan := DocumentPlan{
		DocProps: &DocProps{
			Filename: filename,
		},
		Body: []ComponentInstance{
			{
				Component: "DocumentTitle",
				Props: map[string]interface{}{
					"document_title": "Design Verification Test Procedure",
					"product_name":   productName,
					"revision":       revision,
				},
			},
		},
	}

	// Add TestBlock components from enriched plan
	for _, comp := range enriched.Components {
		documentPlan.Body = append(documentPlan.Body, ComponentInstance{
			Component: "TestBlock",
			Props: map[string]interface{}{
				"test_name":    comp.Name,
				"voltage":      comp.Voltage,
				"product_name": productName,
				"description":  "Validate power supply voltage requirements",
			},
		})
	}

	// Step 5: Command DocGen service
	docGenResponse, err := s.commandDocGen(documentPlan)
	if err != nil {
		auditErr := s.writeAuditEntry(AuditEntry{
			Timestamp:  time.Now(),
			WorkflowID: workflowID,
			Event:      "schematic.released",
			Action:     "docgen_command",
			Status:     "failed",
			Error:      err.Error(),
		})
		if auditErr != nil {
			log.Printf("Failed to write audit entry: %v", auditErr)
		}
		return nil, fmt.Errorf("DocGen command failed: %w", err)
	}

	if err := s.writeAuditEntry(AuditEntry{
		Timestamp:  time.Now(),
		WorkflowID: workflowID,
		Event:      "schematic.released",
		Action:     "docgen_command",
		Status:     "success",
		Details: map[string]interface{}{
			"document_url":        docGenResponse.URL,
			"filename":           docGenResponse.Filename,
			"generation_time_ms": docGenResponse.GenerationTimeMs,
		},
	}); err != nil {
		log.Printf("Failed to write audit entry: %v", err)
	}

	// Step 6: Complete workflow
	if err := s.writeAuditEntry(AuditEntry{
		Timestamp:  time.Now(),
		WorkflowID: workflowID,
		Event:      "schematic.released",
		Action:     "workflow_completed",
		Status:     "success",
		Details: map[string]interface{}{
			"final_document_url": docGenResponse.URL,
		},
	}); err != nil {
		log.Printf("Failed to write audit entry: %v", err)
	}

	return &WorkflowResponse{
		Status:      "success",
		WorkflowID:  workflowID,
		Message:     "Workflow completed successfully",
		DocumentURL: docGenResponse.URL,
	}, nil
}

// setupRoutes configures the HTTP routes
func (s *BPOService) setupRoutes() *http.Server {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.SetHeader("Content-Type", "application/json"))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"status":  "healthy",
			"service": "crosscut-bpo",
			"version": "1.0.0",
		}
		json.NewEncoder(w).Encode(response)
	})

	// Main workflow execution endpoint
	r.Post("/v1/execute-workflow", func(w http.ResponseWriter, r *http.Request) {
		var request WorkflowRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			log.Printf("Failed to decode request: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "invalid_request",
				"message": "Failed to decode JSON request",
			})
			return
		}

		workflowID := s.generateWorkflowID()
		log.Printf("Executing workflow %s for event: %s", workflowID, request.TriggerEvent)

		var response *WorkflowResponse
		var err error

		switch request.TriggerEvent {
		case "schematic.released":
			response, err = s.executeSchematicReleasedWorkflow(workflowID, request.Payload)
		default:
			err = fmt.Errorf("unknown trigger event: %s", request.TriggerEvent)
		}

		if err != nil {
			log.Printf("Workflow execution failed: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "workflow_failed",
				"message": err.Error(),
			})
			return
		}

		log.Printf("Workflow %s completed successfully", workflowID)
		json.NewEncoder(w).Encode(response)
	})

	return &http.Server{
		Handler: r,
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	auditLogPath := os.Getenv("AUDIT_LOG_PATH")
	if auditLogPath == "" {
		auditLogPath = "/app/data/audit-log.json"
	}

	plmServiceURL := os.Getenv("PLM_SERVICE_URL")
	if plmServiceURL == "" {
		plmServiceURL = "http://localhost:8081"
	}

	docgenServiceURL := os.Getenv("DOCGEN_SERVICE_URL")
	if docgenServiceURL == "" {
		docgenServiceURL = "http://localhost:8082"
	}

	log.Printf("Starting CrossCut BPO Service on port %s", port)
	log.Printf("Audit log path: %s", auditLogPath)
	log.Printf("PLM service URL: %s", plmServiceURL)
	log.Printf("DocGen service URL: %s", docgenServiceURL)

	service := NewBPOService(auditLogPath, plmServiceURL, docgenServiceURL)
	server := service.setupRoutes()
	server.Addr = ":" + port

	log.Printf("CrossCut BPO Service listening on :%s", port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}