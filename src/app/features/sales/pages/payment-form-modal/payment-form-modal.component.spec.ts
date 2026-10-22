import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { PaymentFormModalComponent } from './payment-form-modal.component';
import { SalesPaymentsApiService } from '../../services/sales-payments-api.service';
import { PaymentAccountApiService } from '@features/payment-accounts/services/payment-account-api.service';
import {
  InvoiceCurrency,
  PaymentMethod,
  PaymentRecordStatus,
  SalePaymentRecord,
  SalePaymentSummary,
} from '../../models/sale.model';

/**
 * Settling a sale in full is the common case, so the dialog offers the figure
 * it already knows rather than asking for it to be typed again.
 *
 * These also guard the reactivity underneath it. Both this chip and the
 * overpay warning are `computed`s over what has been typed, and a `computed`
 * that reads `form.controls.amount.value` directly never re-evaluates — a
 * reactive form control is not a signal. The warning sat there stale for
 * exactly that reason.
 */
describe('PaymentFormModalComponent — the full-balance shortcut', () => {
  const summary = (over: Partial<SalePaymentSummary> = {}): SalePaymentSummary => ({
    saleId: 's1',
    saleTotal: 1000,
    totalPaid: 400,
    balanceRemaining: 600,
    isFullyPaid: false,
    payments: [],
    ...over,
  });

  const record = (): SalePaymentRecord =>
    ({
      id: 'p1',
      saleId: 's1',
      amount: 400,
      paymentMethod: PaymentMethod.CASH,
      status: PaymentRecordStatus.CONFIRMED,
      isCustomerInitiated: false,
    }) as SalePaymentRecord;

  let component: PaymentFormModalComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaymentFormModalComponent],
      providers: [
        MessageService,
        {
          provide: SalesPaymentsApiService,
          useValue: { recordPayment: (): unknown => of(record()) },
        },
        { provide: PaymentAccountApiService, useValue: { getAll: (): unknown => of([]) } },
      ],
    });

    const fixture = TestBed.createComponent(PaymentFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('offers the outstanding balance when there is one', () => {
    component.open('s1', summary(), InvoiceCurrency.GHS);

    expect(component.canFillBalance()).toBe(true);
    expect(component.balanceRemaining()).toBe(600);
  });

  it('fills the amount with it, and says so', () => {
    component.open('s1', summary(), InvoiceCurrency.GHS);
    component.fillFullBalance();

    expect(component.form.controls.amount.value).toBe(600);
    expect(component.isFullBalance()).toBe(true);
  });

  /* Opened by the "record the settling payment" prompt on a sale already
     marked paid, where the figure is not in question. */
  it('can open with the balance already in the box', () => {
    component.open('s1', summary(), InvoiceCurrency.GHS, { prefillBalance: true });

    expect(component.form.controls.amount.value).toBe(600);
    expect(component.isFullBalance()).toBe(true);
  });

  it('opens empty otherwise', () => {
    component.open('s1', summary(), InvoiceCurrency.GHS);

    expect(component.form.controls.amount.value).toBe(0);
    expect(component.isFullBalance()).toBe(false);
  });

  it('does not offer it when nothing is outstanding', () => {
    component.open('s1', summary({ balanceRemaining: 0, isFullyPaid: true }));

    expect(component.canFillBalance()).toBe(false);
  });

  /* The balance already counts the payment being corrected, so filling it in
     would double the money. */
  it('does not offer it while correcting a payment', () => {
    component.openForEdit('s1', record(), summary(), InvoiceCurrency.GHS);

    expect(component.canFillBalance()).toBe(false);
  });

  it('warns once the amount typed exceeds the balance', () => {
    component.open('s1', summary(), InvoiceCurrency.GHS);

    expect(component.showOverpayWarning()).toBe(false);

    component.form.controls.amount.setValue(900);

    expect(component.showOverpayWarning()).toBe(true);
  });

  it('does not warn on the balance itself', () => {
    component.open('s1', summary(), InvoiceCurrency.GHS);
    component.fillFullBalance();

    expect(component.showOverpayWarning()).toBe(false);
  });
});
