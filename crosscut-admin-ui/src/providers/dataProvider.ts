import type { DataProvider, GetListParams, GetOneParams, CreateParams, UpdateParams, DeleteParams } from 'react-admin';
import type {
  WorkflowRequest,
  WorkflowResponse,
  AuditEntry,
  Product,
  ServiceHealth,
  WorkflowListItem,
  AuditEntryWithId,
  ProductWithId,
  CreateWorkflowForm,
  SystemMetrics
} from '../types';

const API_URL = 'http://localhost:8080';

class CrossCutApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) return {} as T;

      return JSON.parse(text) as T;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Workflow operations
  async executeWorkflow(request: WorkflowRequest): Promise<WorkflowResponse> {
    return this.request<WorkflowResponse>('/v1/execute-workflow', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getHealth(): Promise<ServiceHealth> {
    return this.request<ServiceHealth>('/health');
  }

  // Mock methods for admin interface - these would need real endpoints
  async getWorkflows(): Promise<WorkflowListItem[]> {
    // In a real implementation, this would be a proper API endpoint
    // For now, we'll simulate based on audit trail
    const auditEntries = await this.getAuditEntries();
    const workflowMap = new Map<string, WorkflowListItem>();

    auditEntries.forEach(entry => {
      if (entry.action === 'workflow_started') {
        workflowMap.set(entry.workflow_id, {
          id: entry.workflow_id,
          workflow_id: entry.workflow_id,
          status: 'running',
          message: 'Workflow in progress',
          created_at: entry.timestamp,
          product_name: entry.details?.product_name,
          revision: entry.details?.revision,
        });
      } else if (entry.action === 'workflow_completed' || entry.action === 'workflow_failed') {
        const existing = workflowMap.get(entry.workflow_id);
        if (existing) {
          existing.status = entry.status === 'success' ? 'completed' : 'failed';
          existing.message = entry.status === 'success' ? 'Workflow completed successfully' : 'Workflow failed';
          existing.document_url = entry.details?.final_document_url;
        }
      }
    });

    return Array.from(workflowMap.values());
  }

  async getWorkflow(id: string): Promise<WorkflowListItem | null> {
    const workflows = await this.getWorkflows();
    return workflows.find(w => w.id === id) || null;
  }

  async getAuditEntries(): Promise<AuditEntryWithId[]> {
    // For demo purposes, return mock audit data
    // In production, this would be a real API endpoint
    const mockAuditEntries: AuditEntry[] = [
      {
        timestamp: "2025-09-25T10:28:37.720219775Z",
        workflow_id: "wf-1727264917",
        event: "schematic.released",
        action: "workflow_started",
        status: "success",
        details: {
          product_name: "ROUTER-100",
          revision: "C"
        }
      },
      {
        timestamp: "2025-09-25T10:28:37.721160938Z",
        workflow_id: "wf-1727264917",
        event: "schematic.released",
        action: "template_plan_generated",
        status: "success",
        details: {
          template: {
            components: [
              {
                name: "PowerTest",
                voltage: "UNRESOLVED"
              }
            ],
            product: "ROUTER-100"
          }
        }
      },
      {
        timestamp: "2025-09-25T10:28:37.724712062Z",
        workflow_id: "wf-1727264917",
        event: "schematic.released",
        action: "plm_consultation",
        status: "success",
        details: {
          enriched_plan: {
            components: [
              {
                name: "PowerTest",
                voltage: "12V"
              }
            ],
            product: "ROUTER-100"
          }
        }
      },
      {
        timestamp: "2025-09-25T10:28:37.805218671Z",
        workflow_id: "wf-1727264917",
        event: "schematic.released",
        action: "docgen_command",
        status: "success",
        details: {
          document_url: "gcs://fake-bucket/ROUTER-100-DVT-Procedure-Rev-C-20250925-102837.docx",
          filename: "ROUTER-100-DVT-Procedure-Rev-C.docx",
          generation_time_ms: 199
        }
      },
      {
        timestamp: "2025-09-25T10:28:37.805635497Z",
        workflow_id: "wf-1727264917",
        event: "schematic.released",
        action: "workflow_completed",
        status: "success",
        details: {
          final_document_url: "gcs://fake-bucket/ROUTER-100-DVT-Procedure-Rev-C-20250925-102837.docx"
        }
      }
    ];

    return mockAuditEntries.map((entry, index) => ({
      ...entry,
      id: `${entry.workflow_id}-${index}`,
    }));
  }

  async getProducts(): Promise<ProductWithId[]> {
    // For demo purposes, return mock product data
    // In production, this would call the PLM service
    const mockProducts: Product[] = [
      {
        name: "ROUTER-100",
        voltage: "12V",
        description: "High-performance network router",
        revision: "C",
        components: [
          {
            name: "PowerTest",
            voltage: "12V",
            test_type: "power_supply_validation"
          }
        ]
      },
      {
        name: "SWITCH-200",
        voltage: "24V",
        description: "Managed network switch",
        revision: "B",
        components: [
          {
            name: "PowerTest",
            voltage: "24V",
            test_type: "power_supply_validation"
          }
        ]
      }
    ];

    return mockProducts.map((product: Product, index: number) => ({
      ...product,
      id: `product-${index}`,
    }));
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const workflows = await this.getWorkflows();
    // const auditEntries = await this.getAuditEntries();

    const totalWorkflows = workflows.length;
    const successfulWorkflows = workflows.filter(w => w.status === 'completed').length;
    const failedWorkflows = workflows.filter(w => w.status === 'failed').length;

    // Mock services health
    const servicesHealth: ServiceHealth[] = [
      await this.getHealth(),
      { status: 'healthy', service: 'mock-plm', version: '1.0.0' },
      { status: 'healthy', service: 'mock-docgen', version: '1.0.0' },
    ];

    return {
      total_workflows: totalWorkflows,
      successful_workflows: successfulWorkflows,
      failed_workflows: failedWorkflows,
      average_execution_time: 2500, // Mock average
      services_health: servicesHealth,
    };
  }
}

const apiClient = new CrossCutApiClient(API_URL);

export const dataProvider: any = {
  getList: async (resource: string) => {
    switch (resource) {
      case 'workflows':
        const workflows = await apiClient.getWorkflows();
        return {
          data: workflows,
          total: workflows.length,
        };

      case 'audit':
        const auditEntries = await apiClient.getAuditEntries();
        return {
          data: auditEntries,
          total: auditEntries.length,
        };

      case 'products':
        const products = await apiClient.getProducts();
        return {
          data: products,
          total: products.length,
        };

      default:
        throw new Error(`Unknown resource: ${resource}`);
    }
  },

  getOne: async (resource: string, params: GetOneParams) => {
    switch (resource) {
      case 'workflows':
        const workflow = await apiClient.getWorkflow(params.id as string);
        if (!workflow) throw new Error(`Workflow not found: ${params.id}`);
        return { data: workflow };

      case 'audit':
        const auditEntries = await apiClient.getAuditEntries();
        const auditEntry = auditEntries.find(entry => entry.id === params.id);
        if (!auditEntry) throw new Error(`Audit entry not found: ${params.id}`);
        return { data: auditEntry };

      case 'products':
        const products = await apiClient.getProducts();
        const product = products.find(p => p.id === params.id);
        if (!product) throw new Error(`Product not found: ${params.id}`);
        return { data: product };

      default:
        throw new Error(`Unknown resource: ${resource}`);
    }
  },

  getMany: async (resource: string, params: { ids: any[] }) => {
    // Implement batch retrieval if needed
    const results = await Promise.all(
      params.ids.map(id => dataProvider.getOne(resource, { id }))
    );
    return { data: results.map(r => r.data) };
  },

  getManyReference: async (resource: string, params: any) => {
    // For related resources (e.g., audit entries for a workflow)
    return dataProvider.getList(resource, params);
  },

  create: async (resource: string, params: CreateParams) => {
    if (resource === 'workflows') {
      const formData = params.data as CreateWorkflowForm;
      const workflowRequest: WorkflowRequest = {
        trigger_event: formData.trigger_event,
        payload: {
          product_name: formData.product_name,
          revision: formData.revision,
        },
      };

      const response = await apiClient.executeWorkflow(workflowRequest);
      return {
        data: {
          ...response,
          id: response.workflow_id,
          created_at: new Date().toISOString(),
          product_name: formData.product_name,
          revision: formData.revision,
        },
      };
    }

    throw new Error(`Create not supported for resource: ${resource}`);
  },

  update: async (resource: string) => {
    throw new Error(`Update not supported for resource: ${resource}`);
  },

  updateMany: async (resource: string) => {
    throw new Error(`UpdateMany not supported for resource: ${resource}`);
  },

  delete: async (resource: string) => {
    throw new Error(`Delete not supported for resource: ${resource}`);
  },

  deleteMany: async (resource: string) => {
    throw new Error(`DeleteMany not supported for resource: ${resource}`);
  },
};

export { apiClient };