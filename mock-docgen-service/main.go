package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// DocumentPlan represents an incoming document plan (per OpenAPI spec)
type DocumentPlan struct {
	DocProps *DocProps           `json:"doc_props,omitempty"`
	Body     []ComponentInstance `json:"body" binding:"required,min=1"`
}

// DocProps represents document metadata
type DocProps struct {
	Filename        string                 `json:"filename,omitempty"`
	HeaderComponent string                 `json:"header_component,omitempty"`
	HeaderProps     map[string]interface{} `json:"header_props,omitempty"`
}

// ComponentInstance represents a component to render
type ComponentInstance struct {
	Component string                 `json:"component" binding:"required"`
	Props     map[string]interface{} `json:"props" binding:"required"`
	Children  []ComponentInstance    `json:"children,omitempty"`
}

// GenerateResponse represents the response for document generation
type GenerateResponse struct {
	Status             string `json:"status"`
	URL                string `json:"url"`
	Filename           string `json:"filename"`
	GenerationTimeMs   int    `json:"generation_time_ms"`
	ComponentsRendered int    `json:"components_rendered"`
}

// ValidationResponse represents plan validation response
type ValidationResponse struct {
	Valid               bool                     `json:"valid"`
	Message             string                   `json:"message"`
	ComponentsValidated *int                     `json:"components_validated,omitempty"`
	Errors              []ValidationError        `json:"errors,omitempty"`
}

// ValidationError represents a validation error
type ValidationError struct {
	Field string `json:"field"`
	Issue string `json:"issue"`
}

// HealthResponse represents health check response
type HealthResponse struct {
	Status               string   `json:"status"`
	Service              string   `json:"service"`
	Version              string   `json:"version"`
	UptimeSeconds        int      `json:"uptime_seconds"`
	ComponentsLoaded     int      `json:"components_loaded"`
	AvailableComponents  []string `json:"available_components"`
}

// ComponentsResponse represents components listing response
type ComponentsResponse struct {
	Components []string `json:"components"`
	Count      int      `json:"count"`
	Note       string   `json:"note"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string                 `json:"error"`
	Message string                 `json:"message"`
	Details []map[string]string    `json:"details,omitempty"`
}

// DocGenService handles document generation operations
type DocGenService struct {
	startTime           time.Time
	availableComponents []string
}

// NewDocGenService creates a new DocGen service instance
func NewDocGenService() *DocGenService {
	return &DocGenService{
		startTime: time.Now(),
		availableComponents: []string{
			"DocumentTitle",
			"TestBlock",
			"AuthorBlock",
			"DocumentSubject",
		},
	}
}

// validatePlan validates a document plan
func (s *DocGenService) validatePlan(plan DocumentPlan) (bool, []ValidationError) {
	var errors []ValidationError

	// Validate that all components are known
	for i, comp := range plan.Body {
		found := false
		for _, available := range s.availableComponents {
			if comp.Component == available {
				found = true
				break
			}
		}
		if !found {
			errors = append(errors, ValidationError{
				Field: fmt.Sprintf("body[%d].component", i),
				Issue: fmt.Sprintf("Unknown component type: %s", comp.Component),
			})
		}

		// Basic props validation
		if len(comp.Props) == 0 {
			errors = append(errors, ValidationError{
				Field: fmt.Sprintf("body[%d].props", i),
				Issue: "Component props cannot be empty",
			})
		}
	}

	return len(errors) == 0, errors
}

// generateDocument simulates document generation
func (s *DocGenService) generateDocument(plan DocumentPlan) GenerateResponse {
	startTime := time.Now()

	// Extract key information for logging
	productName := "unknown"
	voltage := "unknown"

	for _, comp := range plan.Body {
		if product, ok := comp.Props["product_name"].(string); ok {
			productName = product
		}
		if v, ok := comp.Props["voltage"].(string); ok {
			voltage = v
		}
	}

	// Log the received render job (this is what the MVP verification checks)
	log.Printf("Received render job for %s with voltage %s", productName, voltage)

	// Generate fake filename if not provided
	filename := "generated-document.docx"
	if plan.DocProps != nil && plan.DocProps.Filename != "" {
		filename = plan.DocProps.Filename + ".docx"
	}

	// Generate fake GCS URL
	timestamp := time.Now().Format("20060102-150405")
	url := fmt.Sprintf("gcs://fake-bucket/%s-%s.docx",
		filename[:len(filename)-5], // remove .docx
		timestamp)

	// Simulate processing time
	processingTime := time.Since(startTime)
	time.Sleep(time.Millisecond * time.Duration(rand.Intn(100)+50)) // 50-150ms

	return GenerateResponse{
		Status:             "success",
		URL:                url,
		Filename:           filename,
		GenerationTimeMs:   int(processingTime.Milliseconds()) + rand.Intn(200) + 100,
		ComponentsRendered: len(plan.Body),
	}
}

// setupRoutes configures the HTTP routes
func (s *DocGenService) setupRoutes() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	// Middleware for logging
	router.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[DocGen] %s - %s %s %d %s\n",
			param.TimeStamp.Format("2006/01/02 15:04:05"),
			param.ClientIP,
			param.Method,
			param.StatusCode,
			param.Path,
		)
	}))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		uptime := int(time.Since(s.startTime).Seconds())
		response := HealthResponse{
			Status:              "healthy",
			Service:             "mock-docgen-service",
			Version:             "1.0.0",
			UptimeSeconds:       uptime,
			ComponentsLoaded:    len(s.availableComponents),
			AvailableComponents: s.availableComponents,
		}
		c.JSON(http.StatusOK, response)
	})

	// List available components
	router.GET("/components", func(c *gin.Context) {
		response := ComponentsResponse{
			Components: s.availableComponents,
			Count:      len(s.availableComponents),
			Note:       "Mock components for MVP testing",
		}
		c.JSON(http.StatusOK, response)
	})

	// Validate document plan
	router.POST("/validate-plan", func(c *gin.Context) {
		var plan DocumentPlan
		if err := c.ShouldBindJSON(&plan); err != nil {
			log.Printf("Failed to bind JSON for validation: %v", err)
			response := ValidationResponse{
				Valid:   false,
				Message: "Invalid document plan format",
				Errors: []ValidationError{{
					Field: "request",
					Issue: err.Error(),
				}},
			}
			c.JSON(http.StatusBadRequest, response)
			return
		}

		valid, errors := s.validatePlan(plan)

		if valid {
			componentsValidated := len(plan.Body)
			response := ValidationResponse{
				Valid:               true,
				Message:             "Document plan is valid",
				ComponentsValidated: &componentsValidated,
			}
			c.JSON(http.StatusOK, response)
		} else {
			response := ValidationResponse{
				Valid:   false,
				Message: "Document plan validation failed",
				Errors:  errors,
			}
			c.JSON(http.StatusBadRequest, response)
		}
	})

	// Main document generation endpoint
	router.POST("/generate", func(c *gin.Context) {
		var plan DocumentPlan
		if err := c.ShouldBindJSON(&plan); err != nil {
			log.Printf("Failed to bind JSON for generation: %v", err)
			errorResponse := ErrorResponse{
				Error:   "validation_failed",
				Message: "Invalid document plan format",
				Details: []map[string]string{{
					"field": "request",
					"issue": err.Error(),
				}},
			}
			c.JSON(http.StatusBadRequest, errorResponse)
			return
		}

		// Validate the plan
		valid, validationErrors := s.validatePlan(plan)
		if !valid {
			details := make([]map[string]string, len(validationErrors))
			for i, err := range validationErrors {
				details[i] = map[string]string{
					"field": err.Field,
					"issue": err.Issue,
				}
			}

			errorResponse := ErrorResponse{
				Error:   "validation_failed",
				Message: "Document plan validation failed",
				Details: details,
			}
			c.JSON(http.StatusBadRequest, errorResponse)
			return
		}

		// Generate the document
		response := s.generateDocument(plan)
		log.Printf("Successfully generated document: %s (%d components)",
			response.Filename, response.ComponentsRendered)

		c.JSON(http.StatusOK, response)
	})

	return router
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("Starting Mock DocGen Service on port %s", port)

	service := NewDocGenService()
	router := service.setupRoutes()

	log.Printf("Mock DocGen Service listening on :%s", port)
	log.Printf("Available components: %v", service.availableComponents)

	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}