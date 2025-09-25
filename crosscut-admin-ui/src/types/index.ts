// CrossCut BPO TypeScript Definitions

export interface WorkflowRequest {
  trigger_event: string;
  payload: Record<string, any>;
}

export interface WorkflowResponse {
  status: string;
  workflow_id: string;
  message: string;
  document_url?: string;
}

export interface AuditEntry {
  timestamp: string;
  workflow_id: string;
  event: string;
  action: string;
  status: 'success' | 'failed';
  details?: Record<string, any>;
  error?: string;
}

export interface TemplatePlan {
  product: string;
  components: ComponentTemplate[];
}

export interface ComponentTemplate {
  name: string;
  voltage: string;
}

export interface EnrichedPlan {
  product: string;
  components: EnrichedComponent[];
}

export interface EnrichedComponent {
  name: string;
  voltage: string;
}

export interface DocumentPlan {
  doc_props?: {
    filename?: string;
  };
  body: ComponentInstance[];
}

export interface ComponentInstance {
  component: string;
  props: Record<string, any>;
}

export interface DocGenResponse {
  status: string;
  url: string;
  filename: string;
  generation_time_ms: number;
  components_rendered: number;
}

export interface Product {
  name: string;
  voltage: string;
  description: string;
  revision: string;
  components: ProductComponent[];
}

export interface ProductComponent {
  name: string;
  voltage: string;
  test_type: string;
}

export interface ServiceHealth {
  status: string;
  service: string;
  version: string;
}

// Extended types for the admin interface
export interface WorkflowListItem extends WorkflowResponse {
  id: string;
  created_at: string;
  product_name?: string;
  revision?: string;
  duration?: number;
}

export interface AuditEntryWithId extends AuditEntry {
  id: string;
}

export interface ProductWithId extends Product {
  id: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

// Form types for creating workflows
export interface CreateWorkflowForm {
  trigger_event: 'schematic.released';
  product_name: string;
  revision: string;
}

// Dashboard metrics
export interface SystemMetrics {
  total_workflows: number;
  successful_workflows: number;
  failed_workflows: number;
  average_execution_time: number;
  services_health: ServiceHealth[];
}