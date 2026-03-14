/**
 * Audit Log Models
 * Based on Swagger API definitions
 * These models represent audit log data structures from the backend
 */

/**
 * Action types that can be logged in the audit system
 */
export enum AuditActionType {
  // Authentication & Access
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',

  // CRUD Operations
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',

  // Role & Permission Management
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  STATUS_CHANGED = 'STATUS_CHANGED',

  // Inventory & Business Operations
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
  BATCH_ASSIGNED = 'BATCH_ASSIGNED',

  // Reports & Exports
  REPORT_EXPORTED = 'REPORT_EXPORTED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  GENERATE_INVOICE = 'GENERATE_INVOICE',
  GENERATE_RECEIPT = 'GENERATE_RECEIPT',
  GENERATE_WAYBILL = 'GENERATE_WAYBILL',

  // Sales Operations
  SALE_CREATED = 'SALE_CREATED',
  SALE_UPDATED = 'SALE_UPDATED',
  SALE_CANCELLED = 'SALE_CANCELLED',
  ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED',

  // System Actions
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
  SYSTEM_ACTION = 'SYSTEM_ACTION',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_ACTIVATED = 'USER_ACTIVATED',
}

/**
 * Entity types that can be tracked in the audit system
 */
export enum AuditEntityType {
  // User Management
  USER = 'USER',

  // Products & Inventory
  PRODUCT = 'PRODUCT',
  BATCH = 'BATCH',
  INVENTORY = 'INVENTORY',

  // Sales & Orders
  SALE = 'SALE',
  CHECKOUT = 'CHECKOUT',
  CART = 'CART',

  // Cooperative Management
  COOPERATIVE = 'COOPERATIVE',
  COOPERATIVE_MEMBER = 'COOPERATIVE_MEMBER',

  // Customer Management
  CUSTOMER = 'CUSTOMER',

  // Reports & Documents
  REPORT = 'REPORT',
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  WAYBILL = 'WAYBILL',

  // System
  SYSTEM = 'SYSTEM',
  CONFIGURATION = 'CONFIGURATION',

  // Authentication
  AUTHENTICATION = 'AUTHENTICATION',
}

/**
 * User roles for filtering
 */
export enum AuditUserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

/**
 * Main audit log response DTO from API
 * Corresponds to AuditLogResponseDto in Swagger
 */
export interface IAuditLog {
  id: string;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId?: string;
  description: string;
  performedByUserId: string;
  performedByUserName?: string;
  performedByRole: AuditUserRole;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Query parameters for fetching audit logs
 * Corresponds to /audits GET endpoint parameters
 */
export interface IAuditLogFilters {
  from?: string; // ISO 8601 format
  to?: string; // ISO 8601 format
  actionType?: AuditActionType;
  entityType?: AuditEntityType;
  userId?: string;
  role?: AuditUserRole;
  page?: number;
  limit?: number;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Statistics response from /audits/stats/overview
 */
export interface IAuditStatistics {
  actionTypeDistribution?: Record<string, number>;
  entityTypeDistribution?: Record<string, number>;
  topUsers?: {
    userId: string;
    userName: string;
    actionCount: number;
  }[];
}
