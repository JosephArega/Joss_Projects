export interface Category {
  id: number;
  key: string;
  label: string;
  icon: string | null;
  sortOrder: number;
}

export interface AdminCategory extends Category {
  createdAt: string;
  serviceCount: number;
  activeServiceCount: number;
}

export interface Service {
  id: string;
  name: string;
  url: string;
  categoryId: number;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface AdminService extends Service {
  categoryLabel: string | null;
  categoryKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  name: string;
  supportEmail: string;
  supportPhone: string | null;
}

export interface PortalPayload {
  organization: Organization;
  lastUpdated: string | null;
  categories: Category[];
  services: Service[];
}

export interface Admin {
  id: number;
  username: string;
  mustChangePassword: boolean;
}

export interface AuditEntry {
  id: string;
  adminId: number | null;
  username: string | null;
  action: 'create' | 'update' | 'delete' | 'login' | 'password_change';
  entity: 'service' | 'category' | 'admin';
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface AuditPage {
  page: number;
  pageSize: number;
  total: number;
  entries: AuditEntry[];
}

export interface FieldError {
  path: string;
  message: string;
}

export interface ServiceInput {
  name: string;
  url: string;
  categoryId: number;
  description?: string | null;
  icon?: string | null;
  isActive?: boolean;
}

export interface CategoryInput {
  label: string;
  icon?: string | null;
}
