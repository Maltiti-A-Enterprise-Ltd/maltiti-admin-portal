import { MenuItem } from 'primeng/api';
import { Role } from '@models/user.model';
import { buildSaleActionMenu, SaleMenuActions } from './sale-action-menu';
import { OrderStatus, PaymentStatus, Sale } from '../models/sale.model';

const noop = (): void => undefined;

const actions = (): SaleMenuActions => ({
  edit: noop,
  toggleFlag: noop,
  viewPayments: noop,
  generateInvoice: noop,
  generateWaybill: noop,
  generateReceipt: noop,
  updateDeliveryCost: noop,
  cancel: noop,
  updateStatus: noop,
  setArrivalDate: noop,
});

const sale = (overrides: Partial<Sale> = {}): Sale =>
  ({
    id: 'sale-1',
    orderStatus: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING_PAYMENT,
    ...overrides,
  }) as Sale;

/** Flattens the grouped menu down to the labels a user would actually see. */
const labels = (items: MenuItem[]): string[] =>
  items.flatMap((item) => [
    ...(item.label && !item.items ? [item.label] : []),
    ...labels(item.items ?? []),
  ]);

const menuFor = (overrides: Partial<Sale> = {}, role = Role.Admin): string[] =>
  labels(buildSaleActionMenu(sale(overrides), role, actions()));

describe('buildSaleActionMenu — the arrival date entry', () => {
  /* Only while the goods are actually moving. A date on something still
     being packed says nothing. */
  it('is offered on a sale in transit', () => {
    expect(menuFor({ orderStatus: OrderStatus.IN_TRANSIT })).toContain('Set arrival date');
  });

  /* Revising is the common case, so the wording has to say which it is. */
  it('says update rather than set once a date exists', () => {
    const items = menuFor({
      orderStatus: OrderStatus.IN_TRANSIT,
      estimatedArrivalDate: '2026-11-03T00:00:00.000Z',
    });

    expect(items).toContain('Update arrival date');
    expect(items).not.toContain('Set arrival date');
  });

  it('is not offered before the order has left', () => {
    [OrderStatus.PENDING, OrderStatus.PACKAGING].forEach((orderStatus) => {
      expect(menuFor({ orderStatus }).join(' ')).not.toContain('arrival date');
    });
  });

  /* Delivered keeps its date as a record of what was promised, but there is
     nothing left to revise. */
  it('is not offered once delivered or cancelled', () => {
    [OrderStatus.DELIVERED, OrderStatus.CANCELLED].forEach((orderStatus) => {
      expect(
        menuFor({
          orderStatus,
          estimatedArrivalDate: '2026-11-03T00:00:00.000Z',
        }).join(' '),
      ).not.toContain('arrival date');
    });
  });

  it('calls back with the sale it was built for', () => {
    const setArrivalDate = jasmine.createSpy('setArrivalDate');
    const target = sale({ orderStatus: OrderStatus.IN_TRANSIT });
    const items = buildSaleActionMenu(target, Role.Admin, {
      ...actions(),
      setArrivalDate,
    });

    const entry = items
      .flatMap((item) => item.items ?? [])
      .find((item) => item.label === 'Set arrival date');

    entry?.command?.({} as never);

    expect(setArrivalDate).toHaveBeenCalledWith(target);
  });
});
