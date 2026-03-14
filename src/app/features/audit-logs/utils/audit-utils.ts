import { AuditActionType } from '@features/audit-logs';
import { Severity } from '@shared/models/shared.model';

/**
 * Get severity class for action type tag
 */
export function getActionSeverity(actionType: AuditActionType): Severity {
  const actionMap: Record<AuditActionType, Severity> = {
    [AuditActionType.CREATE]: 'success',
    [AuditActionType.UPDATE]: 'info',
    [AuditActionType.DELETE]: 'danger',
    [AuditActionType.LOGIN]: 'success',
    [AuditActionType.LOGOUT]: 'secondary',
    [AuditActionType.LOGIN_FAILED]: 'danger',
    [AuditActionType.PASSWORD_CHANGED]: 'warn',
    [AuditActionType.PASSWORD_RESET]: 'warn',
    [AuditActionType.ROLE_CHANGED]: 'warn',
    [AuditActionType.STATUS_CHANGED]: 'info',
    [AuditActionType.PERMISSION_CHANGED]: 'warn',
    [AuditActionType.INVENTORY_ADJUSTED]: 'info',
    [AuditActionType.BATCH_ASSIGNED]: 'info',
    [AuditActionType.REPORT_EXPORTED]: 'success',
    [AuditActionType.DATA_EXPORTED]: 'success',
    [AuditActionType.GENERATE_INVOICE]: 'success',
    [AuditActionType.GENERATE_RECEIPT]: 'success',
    [AuditActionType.GENERATE_WAYBILL]: 'success',
    [AuditActionType.SALE_CREATED]: 'success',
    [AuditActionType.SALE_UPDATED]: 'info',
    [AuditActionType.SALE_CANCELLED]: 'danger',
    [AuditActionType.ORDER_STATUS_UPDATED]: 'info',
    [AuditActionType.CONFIGURATION_CHANGED]: 'warn',
    [AuditActionType.SYSTEM_ACTION]: 'secondary',
    [AuditActionType.USER_CREATED]: 'success',
    [AuditActionType.USER_UPDATED]: 'info',
    [AuditActionType.USER_DELETED]: 'danger',
    [AuditActionType.USER_DEACTIVATED]: 'warn',
    [AuditActionType.USER_ACTIVATED]: 'success',
  };

  return actionMap[actionType] || 'secondary';
}
