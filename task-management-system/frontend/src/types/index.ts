export interface User {
  id: number;
  username: string;
  email: string;
  role: 'super_admin' | 'manager' | 'supervisor' | 'member';
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface Task {
  id: number;
  name: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  due_date?: string;
  completed_at?: string;
  created_at: string;
  created_by?: string;
  assigned_to?: string;
}

export interface Deployment {
  id: number;
  name: string;
  description?: string;
  status: 'pending' | 'successful' | 'failed';
  deployment_date: string;
  backup_location?: string;
  deployed_by?: string;
  created_at: string;
}

export interface Incident {
  id: number;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  incident_date: string;
  resolved_at?: string;
  created_at: string;
  created_by?: string;
  assigned_to?: string;
}

export interface RCA {
  id: number;
  incident_id: number;
  incident_name?: string;
  root_cause: string;
  corrective_actions?: string;
  preventive_actions?: string;
  status: 'draft' | 'under_review' | 'approved' | 'implemented';
  created_at: string;
  assigned_to?: string;
}

export interface Asset {
  id: number;
  server_name: string;
  asset_id: string;
  serial_number?: string;
  ip_address?: string;
  rack_number?: string;
  slot_number?: string;
  host_name?: string;
  operating_system?: string;
  service_packs?: string;
  software_details?: string;
  business_requirements?: string;
  technical_contact?: string;
  vendor?: string;
  make_model?: string;
  cpu?: string;
  ram?: string;
  hdd?: string;
  purpose?: string;
  asset_type?: string;
  dependency?: string;
  redundancy_requirements?: string;
  stored_information?: string;
  backup_schedule?: string;
  confidentiality_req?: string;
  integrity_req?: string;
  availability_req?: string;
  asset_value?: number;
  asset_value_rating?: 'low' | 'medium' | 'high' | 'critical';
  classification?: string;
  owner?: string;
  custodian?: string;
  users?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  tasks: Task[];
  deployments: Deployment[];
  incidents: Incident[];
  rca: RCA[];
  assets: Asset[];
}

export interface DashboardData {
  tasks: {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
  };
  deployments: {
    total: number;
    successful: number;
    pending: number;
    failed: number;
  };
  incidents: {
    total: number;
    open: number;
    investigating?: number;
    resolved: number;
    closed?: number;
  };
  rca?: {
    total: number;
    draft: number;
    approved: number;
    implemented: number;
  };
  assets: {
    total: number;
    by_type?: { [key: string]: number };
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}