import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { SaleSettlementPanelComponent } from './sale-settlement-panel.component';
import { SalesPaymentsApiService } from '../../services/sales-payments-api.service';
import { PaymentAccountApiService } from '@features/payment-accounts/services/payment-account-api.service';
import {
  PaymentMethod,
  PaymentRecordStatus,
  PaymentStatus,
  SalePaymentRecord,
  SalePaymentSummary,
} from '../../models/sale.model';

/**
 * Marking a sale paid is a label; its balance comes from payment records.
 * This panel is what stops the two disagreeing, so what it offers — and what
 * it refuses to record — is worth pinning down.
 */
describe('SaleSettlementPanelComponent', () => {
  const summary = (over: Partial<SalePaymentSummary> = {}): SalePaymentSummary => ({
    saleId: 's1',
    saleTotal: 1000,
    totalPaid: 0,
    balanceRemaining: 1000,
    isFullyPaid: false,
    payments: [],
    ...over,
  });

  let payments: jasmine.SpyObj<SalesPaymentsApiService>;

  const build = (
    saleId: string | null,
    status: PaymentStatus | null,
  ): SaleSettlementPanelComponent => {
    const fixture = TestBed.createComponent(SaleSettlementPanelComponent);
    fixture.componentRef.setInput('saleId', saleId);
    fixture.componentRef.setInput('paymentStatus', status);
    fixture.detectChanges();

    return fixture.componentInstance;
  };

  beforeEach(() => {
    payments = jasmine.createSpyObj<SalesPaymentsApiService>('SalesPaymentsApiService', [
      'getPaymentSummary',
      'recordPayment',
    ]);
    payments.getPaymentSummary.and.returnValue(of(summary()));
    payments.recordPayment.and.returnValue(of({ id: 'p1' } as SalePaymentRecord));

    TestBed.configureTestingModule({
      imports: [SaleSettlementPanelComponent],
      providers: [
        { provide: SalesPaymentsApiService, useValue: payments },
        { provide: PaymentAccountApiService, useValue: { getAll: (): unknown => of([]) } },
      ],
    });
  });

  describe('when it offers itself', () => {
    it('offers to record the balance on a sale being marked paid', () => {
      expect(build('s1', PaymentStatus.PAID).applies()).toBe(true);
    });

    it('offers it on a part payment too', () => {
      expect(build('s1', PaymentStatus.PART_PAYMENT).applies()).toBe(true);
    });

    /* Nothing is being claimed about money, so there is nothing to reconcile
       and no reason to interrupt an ordinary edit. */
    it('stays out of the way on a status that claims no money', () => {
      expect(build('s1', PaymentStatus.PENDING_PAYMENT).applies()).toBe(false);
    });

    it('stays out of the way when the payments already cover the sale', () => {
      payments.getPaymentSummary.and.returnValue(
        of(summary({ totalPaid: 1000, balanceRemaining: 0, isFullyPaid: true })),
      );

      expect(build('s1', PaymentStatus.PAID).applies()).toBe(false);
    });

    it('has nothing to settle while a sale is still being created', () => {
      expect(build(null, PaymentStatus.PAID).applies()).toBe(false);
    });

    /* Not being able to read the ledger is no reason to stop an admin saving
       the sale — the panel simply does not appear. */
    it('keeps quiet when the summary cannot be loaded', () => {
      payments.getPaymentSummary.and.returnValue(throwError(() => new Error('down')));

      expect(build('s1', PaymentStatus.PAID).applies()).toBe(false);
    });
  });

  /* Part Payment only says some money is in, not how much, so recording a
     payment is the admin's call. Paid says all of it is, so it is armed. */
  describe('whether it starts ticked', () => {
    it('starts ticked when the sale is being marked paid', () => {
      const panel = build('s1', PaymentStatus.PAID);

      expect(panel.form.controls.record.value).toBe(true);
      expect(panel.willRecord()).toBe(true);
    });

    it('starts unticked on a part payment', () => {
      const panel = build('s1', PaymentStatus.PART_PAYMENT);

      expect(panel.form.controls.record.value).toBe(false);
      expect(panel.willRecord()).toBe(false);
    });

    it('records nothing on a part payment unless the admin ticks it', async () => {
      const panel = build('s1', PaymentStatus.PART_PAYMENT);

      expect(await firstValueFrom(panel.settle())).toBe(false);
      expect(payments.recordPayment).not.toHaveBeenCalled();
    });

    it('records a part payment once the admin ticks it', async () => {
      const panel = build('s1', PaymentStatus.PART_PAYMENT);
      panel.form.controls.record.setValue(true);
      panel.form.controls.amount.setValue(400);

      expect(await firstValueFrom(panel.settle())).toBe(true);
      expect(payments.recordPayment).toHaveBeenCalledWith(
        's1',
        jasmine.objectContaining({ amount: 400 }),
      );
    });

    it('follows the status when it changes in the form', () => {
      const fixture = TestBed.createComponent(SaleSettlementPanelComponent);
      fixture.componentRef.setInput('saleId', 's1');
      fixture.componentRef.setInput('paymentStatus', PaymentStatus.PART_PAYMENT);
      fixture.detectChanges();
      const panel = fixture.componentInstance;

      fixture.componentRef.setInput('paymentStatus', PaymentStatus.PAID);
      fixture.detectChanges();
      expect(panel.form.controls.record.value).toBe(true);

      fixture.componentRef.setInput('paymentStatus', PaymentStatus.PART_PAYMENT);
      fixture.detectChanges();
      expect(panel.form.controls.record.value).toBe(false);
    });
  });

  describe('what it records', () => {
    it('opens on the outstanding balance', () => {
      expect(build('s1', PaymentStatus.PAID).form.controls.amount.value).toBe(1000);
    });

    it('records a confirmed payment for that balance', async () => {
      const panel = build('s1', PaymentStatus.PAID);

      expect(await firstValueFrom(panel.settle())).toBe(true);
      expect(payments.recordPayment).toHaveBeenCalledWith(
        's1',
        jasmine.objectContaining({
          amount: 1000,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          // Anything less would not move the balance, which is the point.
          status: PaymentRecordStatus.CONFIRMED,
        }),
      );
    });

    it('records nothing when the admin unticks it', async () => {
      const panel = build('s1', PaymentStatus.PAID);
      panel.form.controls.record.setValue(false);

      expect(await firstValueFrom(panel.settle())).toBe(false);
      expect(payments.recordPayment).not.toHaveBeenCalled();
    });

    it('records nothing when it does not apply at all', async () => {
      const panel = build('s1', PaymentStatus.PENDING_PAYMENT);

      expect(await firstValueFrom(panel.settle())).toBe(false);
      expect(payments.recordPayment).not.toHaveBeenCalled();
    });

    /* The caller saves the sale only once this completes, so a failure here
       has to propagate — otherwise the sale is left labelled Paid with
       nothing behind it, which is the bug the panel exists to stop. */
    it('fails loudly so the sale is not saved without the payment', async () => {
      payments.recordPayment.and.returnValue(throwError(() => new Error('nope')));
      const panel = build('s1', PaymentStatus.PAID);

      await expectAsync(firstValueFrom(panel.settle())).toBeRejectedWithError('nope');
      expect(panel.errorMessage()).toContain('could not be recorded');
    });
  });
});
