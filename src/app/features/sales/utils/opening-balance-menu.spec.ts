import { buildSaleActionMenu, SaleMenuActions } from './sale-action-menu';
import { asPlainDay } from './opening-balance-payload';
import { OrderStatus, PaymentStatus, Sale, SaleKind } from '../models/sale.model';
import { Role } from '@models/user.model';
import { MenuItem } from 'primeng/api';

/**
 * What can be done to a debt carried in from before this system.
 *
 * It has no line items, so every document built from them would render an
 * empty grid, and the sale form would open on an empty product list and
 * refuse to save. The menu is what stops an admin reaching either.
 */
describe('the row menu for an opening balance', () => {
  const sale = (over: Partial<Sale> = {}): Sale =>
    ({
      id: 'ob1',
      kind: SaleKind.OPENING_BALANCE,
      orderStatus: OrderStatus.PRE_SYSTEM,
      paymentStatus: PaymentStatus.PENDING_PAYMENT,
      ...over,
    }) as Sale;

  const noop = (): void => undefined;
  const actions: SaleMenuActions = {
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
  };

  const labels = (items: MenuItem[]): string[] =>
    items.flatMap((group) => [
      group.label ?? '',
      ...(group.items ?? []).map((item) => item.label ?? ''),
    ]);

  const menu = (over: Partial<Sale> = {}, role = Role.Admin): string[] =>
    labels(buildSaleActionMenu(sale(over), role, actions));

  /* Every one of these builds its document from line items. An opening
     balance has none, so they would each produce an empty grid. */
  it('offers no invoice, receipt or waybill', () => {
    const offered = menu().join(' ');

    expect(offered).not.toContain('Invoice');
    expect(offered).not.toContain('Receipt');
    expect(offered).not.toContain('Waybill');
  });

  /* Even once it is paid off — a receipt listing nothing bought is worse
     than no receipt. */
  it('offers no receipt even when it has been paid', () => {
    expect(menu({ paymentStatus: PaymentStatus.PAID }).join(' ')).not.toContain(
      'Receipt',
    );
  });

  /* There is nowhere for a pre-system sale to progress to, and nothing in
     transit to date. */
  it('offers no status change and no arrival date', () => {
    const offered = menu({ estimatedArrivalDate: '2026-02-01' }).join(' ');

    expect(offered).not.toContain('Change Status');
    expect(offered).not.toContain('arrival date');
  });

  it('offers no delivery cost, there being no delivery', () => {
    expect(
      menu({ paymentStatus: PaymentStatus.AWAITING_DELIVERY }).join(' '),
    ).not.toContain('Delivery Cost');
  });

  /* The whole point of storing it as a sale: money collected against an old
     debt is recorded with the screens admins already know. */
  it('still offers payments, which is why it is a sale at all', () => {
    expect(menu()).toContain('View Payments');
  });

  it('corrects it rather than editing it, so the dialog opens not the form', () => {
    expect(menu()).toContain('Correct opening balance');
    expect(menu()).not.toContain('View / Edit Sale');
  });

  it('lets an admin remove a mis-remembered debt', () => {
    expect(menu()).toContain('Remove');
  });

  it('does not let a non-admin remove one', () => {
    expect(menu({}, Role.User)).not.toContain('Remove');
  });

  /* The ordinary menu must be untouched by any of this. */
  it('leaves a real order menu alone', () => {
    const ordinary = labels(
      buildSaleActionMenu(
        sale({
          kind: SaleKind.ORDER,
          orderStatus: OrderStatus.IN_TRANSIT,
        }),
        Role.Admin,
        actions,
      ),
    );

    expect(ordinary).toContain('View / Edit Sale');
    expect(ordinary).toContain('Generate Invoice');
    expect(ordinary.join(' ')).toContain('arrival date');
  });

  /* A sale written before the column existed has no `kind` at all, and must
     keep every action it had. */
  it('treats a sale with no kind as an ordinary order', () => {
    const legacy = labels(
      buildSaleActionMenu(
        { id: 's1', orderStatus: OrderStatus.DELIVERED } as Sale,
        Role.Admin,
        actions,
      ),
    );

    expect(legacy).toContain('View / Edit Sale');
    expect(legacy).toContain('Generate Invoice');
  });
});

/**
 * Built from the local calendar parts rather than `toISOString()`, which
 * converts to UTC first. On an opening balance a day's drift is a day's
 * difference in when the debt reads as overdue, because terms run from here.
 */
describe('asPlainDay', () => {
  it('keeps the day that was picked, whatever the time', () => {
    expect(asPlainDay(new Date(2026, 0, 1, 23, 45))).toBe('2026-01-01');
    expect(asPlainDay(new Date(2026, 0, 1, 0, 15))).toBe('2026-01-01');
  });

  it('pads a single-digit month and day', () => {
    expect(asPlainDay(new Date(2026, 8, 5))).toBe('2026-09-05');
  });

  it('says nothing for no date', () => {
    expect(asPlainDay(null)).toBeNull();
    expect(asPlainDay(undefined)).toBeNull();
  });
});
