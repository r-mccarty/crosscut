package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

// PLMProduct represents a product in the PLM system
type PLMProduct struct {
	Name        string      `json:"name"`
	Voltage     string      `json:"voltage"`
	Description string      `json:"description"`
	Revision    string      `json:"revision"`
	Components  []Component `json:"components"`
}

// Component represents a component with voltage requirements
type Component struct {
	Name     string `json:"name"`
	Voltage  string `json:"voltage"`
	TestType string `json:"test_type"`
}

// PLMData represents the structure of plm-data.json
type PLMData struct {
	Products []PLMProduct `json:"products"`
}

// TemplatePlan represents an incoming plan template with unresolved values
type TemplatePlan struct {
	Product    string               `json:"product" binding:"required"`
	Components []ComponentTemplate  `json:"components" binding:"required"`
}

// ComponentTemplate represents a component template needing enrichment
type ComponentTemplate struct {
	Name    string `json:"name" binding:"required"`
	Voltage string `json:"voltage"`
}

// EnrichedPlan represents the enriched plan with resolved values
type EnrichedPlan struct {
	Product    string               `json:"product"`
	Components []EnrichedComponent  `json:"components"`
}

// EnrichedComponent represents a component with resolved voltage
type EnrichedComponent struct {
	Name    string `json:"name"`
	Voltage string `json:"voltage"`
}

// PLMService handles PLM operations
type PLMService struct {
	dataPath string
	data     *PLMData
}

// NewPLMService creates a new PLM service instance
func NewPLMService(dataPath string) (*PLMService, error) {
	service := &PLMService{
		dataPath: dataPath,
	}

	if err := service.loadData(); err != nil {
		return nil, fmt.Errorf("failed to load PLM data: %w", err)
	}

	return service, nil
}

// loadData loads PLM data from the JSON file
func (s *PLMService) loadData() error {
	absPath, err := filepath.Abs(s.dataPath)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %w", err)
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		return fmt.Errorf("failed to read PLM data file: %w", err)
	}

	s.data = &PLMData{}
	if err := json.Unmarshal(data, s.data); err != nil {
		return fmt.Errorf("failed to unmarshal PLM data: %w", err)
	}

	log.Printf("Loaded PLM data with %d products from %s", len(s.data.Products), absPath)
	return nil
}

// findProduct finds a product by name
func (s *PLMService) findProduct(productName string) (*PLMProduct, error) {
	for _, product := range s.data.Products {
		if product.Name == productName {
			return &product, nil
		}
	}
	return nil, fmt.Errorf("product %s not found", productName)
}

// enrichPlan enriches a template plan with actual voltage values
func (s *PLMService) enrichPlan(template TemplatePlan) (*EnrichedPlan, error) {
	product, err := s.findProduct(template.Product)
	if err != nil {
		return nil, err
	}

	enriched := &EnrichedPlan{
		Product:    template.Product,
		Components: make([]EnrichedComponent, len(template.Components)),
	}

	for i, templateComp := range template.Components {
		// Find the corresponding component in the product
		voltage := templateComp.Voltage // Default to template value

		for _, productComp := range product.Components {
			if productComp.Name == templateComp.Name {
				voltage = productComp.Voltage
				break
			}
		}

		// If voltage is still unresolved, use the product's default voltage
		if voltage == "UNRESOLVED" || voltage == "" {
			voltage = product.Voltage
		}

		enriched.Components[i] = EnrichedComponent{
			Name:    templateComp.Name,
			Voltage: voltage,
		}
	}

	return enriched, nil
}

// setupRoutes configures the HTTP routes
func (s *PLMService) setupRoutes() *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	// Middleware for logging
	router.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[PLM] %s - %s %s %d %s\n",
			param.TimeStamp.Format("2006/01/02 15:04:05"),
			param.ClientIP,
			param.Method,
			param.StatusCode,
			param.Path,
		)
	}))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "mock-plm-service",
			"products_loaded": len(s.data.Products),
		})
	})

	// Main enrichment endpoint
	router.POST("/enrich-plan", func(c *gin.Context) {
		var template TemplatePlan
		if err := c.ShouldBindJSON(&template); err != nil {
			log.Printf("Failed to bind JSON: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid_request",
				"message": "Invalid template plan format",
				"details": err.Error(),
			})
			return
		}

		log.Printf("Enriching plan for product: %s", template.Product)

		enriched, err := s.enrichPlan(template)
		if err != nil {
			log.Printf("Failed to enrich plan: %v", err)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "product_not_found",
				"message": fmt.Sprintf("Product %s not found in PLM system", template.Product),
			})
			return
		}

		log.Printf("Successfully enriched plan for %s with %d components",
			enriched.Product, len(enriched.Components))

		c.JSON(http.StatusOK, enriched)
	})

	// List all products endpoint (for debugging)
	router.GET("/products", func(c *gin.Context) {
		products := make([]string, len(s.data.Products))
		for i, product := range s.data.Products {
			products[i] = product.Name
		}
		c.JSON(http.StatusOK, gin.H{
			"products": products,
			"count": len(products),
		})
	})

	return router
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	dataPath := os.Getenv("PLM_DATA_PATH")
	if dataPath == "" {
		dataPath = "/app/data/plm-data.json"
	}

	log.Printf("Starting Mock PLM Service on port %s", port)
	log.Printf("Using PLM data file: %s", dataPath)

	service, err := NewPLMService(dataPath)
	if err != nil {
		log.Fatalf("Failed to create PLM service: %v", err)
	}

	router := service.setupRoutes()

	log.Printf("Mock PLM Service listening on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}