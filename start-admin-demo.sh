#!/bin/bash

# CrossCut BPO Admin UI Demo Startup Script
# This script starts both the CrossCut BPO services and the React Admin UI

echo "🚀 Starting CrossCut BPO Admin Demo..."
echo

# Function to kill background processes on exit
cleanup() {
    echo
    echo "🛑 Stopping services..."
    pkill -f "go run main.go"
    pkill -f "npm run dev"
    exit 0
}

# Set up cleanup on script exit
trap cleanup INT TERM

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go to run the CrossCut BPO services."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to run the admin UI."
    exit 1
fi

# Start CrossCut BPO services in background
echo "📡 Starting CrossCut BPO services..."

cd /workspaces/crosscut

# Start Mock PLM Service
echo "  - Starting Mock PLM Service on port 8081..."
cd mock-plm-service
PLM_DATA_PATH=../data/plm-data.json go run main.go > /tmp/plm.log 2>&1 &
PLM_PID=$!

# Start Mock DocGen Service
echo "  - Starting Mock DocGen Service on port 8082..."
cd ../mock-docgen-service
PORT=8082 go run main.go > /tmp/docgen.log 2>&1 &
DOCGEN_PID=$!

# Start CrossCut BPO Service
echo "  - Starting CrossCut BPO Service on port 8080..."
cd ../crosscut-bpo
PLM_SERVICE_URL=http://localhost:8081 \
DOCGEN_SERVICE_URL=http://localhost:8082 \
AUDIT_LOG_PATH=../data/audit-log.json \
go run main.go > /tmp/bpo.log 2>&1 &
BPO_PID=$!

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 5

# Check if services are running
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "❌ CrossCut BPO service failed to start. Check /tmp/bpo.log for details."
    exit 1
fi

if ! curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo "❌ PLM service failed to start. Check /tmp/plm.log for details."
    exit 1
fi

if ! curl -s http://localhost:8082/health > /dev/null 2>&1; then
    echo "❌ DocGen service failed to start. Check /tmp/docgen.log for details."
    exit 1
fi

echo "✅ All services started successfully!"
echo

# Start React Admin UI
echo "🎨 Starting React Admin UI..."
cd ../crosscut-admin-ui

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "  - Admin UI will be available at: http://localhost:5173"
echo "  - CrossCut BPO API available at: http://localhost:8080"
echo "  - PLM Service available at: http://localhost:8081"
echo "  - DocGen Service available at: http://localhost:8082"
echo
echo "🎯 Demo is ready! Press Ctrl+C to stop all services."
echo

# Start the admin UI (this will block)
npm run dev

# This line will only be reached if npm run dev exits
cleanup