import { MenuItem } from 'primeng/api';
import { Role } from '@models/user.model';
import { getNextStatuses, getStatusLabel } from '@shared/utils/sales.utils';
import { OrderStatus, PaymentStatus, Sale, SaleKind } from '../models/sale.model';

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

/**
 * A debt carried in from before this system.
 *
 * It has no line items, so every document built from them — the invoice's
 * items table, the receipt, the waybill — would render an empty grid. They
 * are withheld rather than rendered badly; what to send a customer about an
 * old debt is a separate question.
 */
const isOpeningBalance = (sale: Sale): boolean =>
  sale.kind === SaleKind.OPENING_BALANCE;

export function buildSaleActionMenu(
  sale: Sale,
  role: Role | null | undefined,
  actions: SaleMenuActions,
): MenuItem[] {
  const isAdmin = role === Role.Admin || role === Role.SuperAdmin;

  if (isOpeningBalance(sale)) {
    return openingBalanceMenu(sale, isAdmin, actions);
  }

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

/**
 * What can be done to a debt carried in from before this system.
 *
 * A short list, and short on purpose. There are no products to re-price, no
 * shipment to track, no delivery cost to set and nowhere for the status to
 * move — so offering any of those would be offering something that cannot
 * work. "Correct" opens the opening-balance dialog rather than the sale
 * form, which asks for line items this record will never have.
 */
function openingBalanceMenu(
  sale: Sale,
  isAdmin: boolean,
  actions: SaleMenuActions,
): MenuItem[] {
  const items: MenuItem[] = [
    {
      label: 'Correct opening balance',
      icon: 'pi pi-pencil',
      command: (): void => actions.edit(sale),
    },
    {
      label: sale.flaggedAt ? 'Remove flag' : 'Flag for attention',
      icon: sale.flaggedAt ? 'pi pi-flag-fill' : 'pi pi-flag',
      command: (): void => actions.toggleFlag(sale),
    },
    /* The whole point of storing it as a sale: money collected against an
       old debt is recorded with the screens admins already know. */
    {
      label: 'View Payments',
      icon: 'pi pi-credit-card',
      command: (): void => actions.viewPayments(sale),
    },
  ];

  /* Removing it is the only way to undo a mis-remembered debt, and it is
     also the only way to correct one recorded against the wrong customer. */
  if (isAdmin) {
    items.push(
      { separator: true },
      {
        label: 'Remove',
        icon: 'pi pi-times',
        command: (): void => actions.cancel(sale),
      },
    );
  }

  return [{ label: 'Actions', items }];
}
