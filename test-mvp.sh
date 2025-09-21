#!/bin/bash

# CrossCut MVP Test Script
# This script tests the complete MVP workflow

echo "🚀 CrossCut MVP Test Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        exit 1
    fi
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if services are running
print_info "Checking service health..."

# Check PLM service
curl -s http://localhost:8081/health > /dev/null
print_status $? "PLM Service is running"

# Check DocGen service
curl -s http://localhost:8082/health > /dev/null
print_status $? "DocGen Service is running"

# Check BPO service
curl -s http://localhost:8080/health > /dev/null
print_status $? "BPO Service is running"

echo ""
print_info "Starting end-to-end workflow test..."

# Clear previous audit log
echo "[]" > data/audit-log.json

# Execute the main workflow
response=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "trigger_event": "schematic.released",
    "payload": {
      "product_name": "ROUTER-100",
      "revision": "C"
    }
  }' \
  http://localhost:8080/v1/execute-workflow)

# Check if curl was successful
print_status $? "Workflow API call executed"

# Check if response contains success
if echo "$response" | grep -q '"status":"success"'; then
    print_status 0 "Workflow completed successfully"
else
    echo "Response: $response"
    print_status 1 "Workflow failed"
fi

# Check audit log
if [ -f "data/audit-log.json" ] && [ $(jq length data/audit-log.json) -gt 0 ]; then
    print_status 0 "Audit log was created"
    audit_entries=$(jq length data/audit-log.json)
    print_info "Audit log contains $audit_entries entries"
else
    print_status 1 "Audit log was not created or is empty"
fi

# Verify workflow steps in audit log
required_actions=("workflow_started" "template_plan_generated" "plm_consultation" "docgen_command" "workflow_completed")

for action in "${required_actions[@]}"; do
    if jq -e ".[] | select(.action == \"$action\")" data/audit-log.json > /dev/null; then
        print_status 0 "Audit log contains: $action"
    else
        print_status 1 "Audit log missing: $action"
    fi
done

echo ""
print_info "Testing error handling..."

# Test unknown event type
error_response=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "trigger_event": "unknown.event",
    "payload": {
      "product_name": "TEST-PRODUCT"
    }
  }' \
  http://localhost:8080/v1/execute-workflow)

if echo "$error_response" | grep -q '"error"'; then
    print_status 0 "Error handling works for unknown events"
else
    print_status 1 "Error handling failed for unknown events"
fi

# Test invalid product name
invalid_response=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "trigger_event": "schematic.released",
    "payload": {
      "product_name": "INVALID-PRODUCT",
      "revision": "A"
    }
  }' \
  http://localhost:8080/v1/execute-workflow)

if echo "$invalid_response" | grep -q '"error"'; then
    print_status 0 "Error handling works for invalid products"
else
    print_status 1 "Error handling failed for invalid products"
fi

echo ""
print_info "Displaying final audit log..."
echo "=================================="
jq . data/audit-log.json

echo ""
echo -e "${GREEN}🎉 MVP Test Complete!${NC}"
echo ""
echo "Summary:"
echo "--------"
echo "• All three services are running and healthy"
echo "• End-to-end workflow executed successfully"
echo "• Complete audit trail was captured"
echo "• Error handling is working"
echo ""
echo "The CrossCut MVP is fully functional!"

# Test additional workflow with different product
echo ""
print_info "Testing with SWITCH-200..."

switch_response=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{
    "trigger_event": "schematic.released",
    "payload": {
      "product_name": "SWITCH-200",
      "revision": "B"
    }
  }' \
  http://localhost:8080/v1/execute-workflow)

if echo "$switch_response" | grep -q '"status":"success"'; then
    print_status 0 "SWITCH-200 workflow completed successfully"

    # Check if voltage was correctly resolved to 24V
    if jq -e '.[] | select(.action == "plm_consultation" and .details.enriched_plan.components[0].voltage == "24V")' data/audit-log.json > /dev/null; then
        print_status 0 "SWITCH-200 voltage correctly resolved to 24V"
    else
        print_status 1 "SWITCH-200 voltage resolution failed"
    fi
else
    print_status 1 "SWITCH-200 workflow failed"
fi