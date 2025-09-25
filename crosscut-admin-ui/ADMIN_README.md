# CrossCut BPO Admin UI

A React Admin frontend for managing and monitoring CrossCut Business Process Orchestrator workflows.

## Features

- **Dashboard**: System overview with workflow metrics and service health
- **Workflow Management**:
  - View all workflows with status and execution details
  - Trigger new "schematic.released" workflows
  - Monitor workflow progress in real-time
- **Audit Trail**:
  - Complete audit log of all workflow actions
  - Timeline visualization of workflow steps
  - Filtering and search capabilities
- **Product Management**:
  - Browse available products (ROUTER-100, SWITCH-200)
  - View product specifications and voltage requirements
  - Understand workflow integration

## Technology Stack

- **React 18** with TypeScript
- **React Admin 5.11.3** for the admin interface
- **Material-UI 7** for UI components
- **Vite** for development and building
- **TanStack React Query** for data fetching

## Prerequisites

Before running the admin UI, ensure the CrossCut BPO services are running:

```bash
# From the CrossCut root directory
docker-compose up -d

# Or run services directly:
# Terminal 1: Mock PLM Service
cd mock-plm-service && PLM_DATA_PATH=../data/plm-data.json go run main.go

# Terminal 2: Mock DocGen Service
cd mock-docgen-service && PORT=8082 go run main.go

# Terminal 3: CrossCut BPO Service
cd crosscut-bpo && PLM_SERVICE_URL=http://localhost:8081 DOCGEN_SERVICE_URL=http://localhost:8082 AUDIT_LOG_PATH=../data/audit-log.json go run main.go
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The admin UI will be available at `http://localhost:5173`

## API Integration

The admin UI connects to:
- **CrossCut BPO**: `http://localhost:8080` - Main orchestration service
- **Mock PLM**: `http://localhost:8081` - Product data service
- **Mock DocGen**: `http://localhost:8082` - Document generation service

## Usage

### Triggering Workflows

1. Navigate to "Workflows" in the sidebar
2. Click "Create" to trigger a new workflow
3. Select a product (ROUTER-100 or SWITCH-200) and revision
4. The workflow will execute and show progress in real-time

### Monitoring Execution

1. Use the Dashboard for system overview
2. View individual workflows in the Workflows section
3. Check the Audit Trail for detailed execution logs
4. Monitor service health and metrics

### Product Information

1. Browse available products in the Products section
2. View detailed specifications including voltage requirements
3. Understand how products integrate with workflows

## Architecture

The admin UI follows React Admin conventions:

```
src/
├── components/          # Reusable UI components
│   └── Dashboard.tsx   # Main dashboard
├── resources/          # React Admin resources
│   ├── workflows.tsx   # Workflow management
│   ├── audit.tsx      # Audit trail visualization
│   └── products.tsx   # Product management
├── providers/          # Data providers
│   └── dataProvider.ts # API integration
├── types/             # TypeScript definitions
│   └── index.ts       # CrossCut data types
└── App.tsx            # Main application
```

## Data Flow

1. **Dashboard**: Shows aggregated metrics from workflows and audit data
2. **Workflows**: CRUD operations for triggering and monitoring workflows
3. **Audit Trail**: Read-only view of workflow execution logs
4. **Products**: Read-only view of available products and specifications

## Demo Data

For demonstration purposes, the UI includes mock data that mirrors the actual CrossCut BPO data structure. In production, all data would come from real API endpoints.

## Future Enhancements

- Real-time WebSocket updates for live workflow monitoring
- Advanced filtering and search capabilities
- Workflow templates and configuration management
- Performance metrics and analytics
- User authentication and authorization
- Export functionality for audit trails and reports