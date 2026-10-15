import { MenuItem } from 'primeng/api';
import { Role } from '@models/user.model';
import { getNextStatuses, getStatusLabel } from '@shared/utils/sales.utils';
import { OrderStatus, PaymentStatus, Sale } from '../models/sale.model';

/**
 * The row's "…" menu.
 *
 * Pulled out of the sales list, which was over its length limit. It is pure
 * construction — a sale and a set of callbacks in, menu items out — so it
 * reads better away from the component and can be checked without one.
 */

/** What each entry does. The component supplies these; this file decides
    which of them are offered. */
export interface SaleMenuActions {
  edit: (sale: Sale) => void;
  toggleFlag: (sale: Sale) => void;
  viewPayments: (sale: Sale) => void;
  generateInvoice: (sale: Sale) => void;
  generateWaybill: (sale: Sale) => void;
  generateReceipt: (sale: Sale) => void;
  updateDeliveryCost: (sale: Sale) => void;
  cancel: (sale: Sale) => void;
  updateStatus: (sale: Sale, status: OrderStatus) => void;
  setArrivalDate: (sale: Sale) => void;
}

export function buildSaleActionMenu(
  sale: Sale,
  role: Role | null | undefined,
  actions: SaleMenuActions,
): MenuItem[] {
  const isAdmin = role === Role.Admin || role === Role.SuperAdmin;

  const items: MenuItem[] = [
    {
      label: 'View / Edit Sale',
      icon: 'pi pi-pencil',
      command: (): void => actions.edit(sale),
    },
    {
      label: sale.flaggedAt ? 'Remove flag' : 'Flag for attention',
      icon: sale.flaggedAt ? 'pi pi-flag-fill' : 'pi pi-flag',
      command: (): void => actions.toggleFlag(sale),
    },
    {
      label: 'View Payments',
      icon: 'pi pi-credit-card',
      command: (): void => actions.viewPayments(sale),
    },
    {
      label: 'Generate Invoice',
      icon: 'pi pi-file-pdf',
      command: (): void => actions.generateInvoice(sale),
    },
    {
      label: 'Generate Waybill',
      icon: 'pi pi-truck',
      command: (): void => actions.generateWaybill(sale),
    },
  ];

  // A receipt is for money already in; offering one before that invites a
  // document that says something untrue.
  if (sale.paymentStatus === PaymentStatus.PAID) {
    items.push({
      label: 'Generate Receipt',
      icon: 'pi pi-receipt',
      command: (): void => actions.generateReceipt(sale),
    });
  }

  /* Only while it is actually on its way. A date on something still being
     packed says nothing, and one on a delivered order is history rather
     than something to edit. Revising is the common case — far more often
     than the date is first set — so it gets its own entry rather than
     hiding behind the dispatch step. */
  if (sale.orderStatus === OrderStatus.IN_TRANSIT) {
    items.push({
      label: sale.estimatedArrivalDate ? 'Update arrival date' : 'Set arrival date',
      icon: 'pi pi-calendar',
      command: (): void => actions.setArrivalDate(sale),
    });
  }

  if (sale.paymentStatus === PaymentStatus.AWAITING_DELIVERY) {
    items.push({
      label: 'Update Delivery Cost',
      icon: 'pi pi-dollar',
      command: (): void => actions.updateDeliveryCost(sale),
    });
  }

  if (isAdmin && sale.orderStatus !== OrderStatus.CANCELLED) {
    items.push(
      { separator: true },
      {
        label: 'Cancel Order',
        icon: 'pi pi-times',
        command: (): void => actions.cancel(sale),
      },
    );
  }

  const nextStatuses = getNextStatuses(sale.orderStatus);

  return [
    { label: 'Actions', items },
    // Omitted entirely at the end of the line, where there is nowhere to go.
    ...(nextStatuses.length
      ? [
          { separator: true },
          {
            label: 'Change Status',
            icon: 'pi pi-refresh',
            items: nextStatuses.map((status) => ({
              label: getStatusLabel(status),
              command: (): void => actions.updateStatus(sale, status),
            })),
          },
        ]
      : []),
  ];
}
