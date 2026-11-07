import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DeletePaymentModalComponent } from './delete-payment-modal.component';
import { SalesPaymentsApiService } from '../../services/sales-payments-api.service';
import {
  PaymentMethod,
  PaymentRecordStatus,
  SalePaymentRecord,
  SalePaymentSummary,
} from '../../models/sale.model';

/**
 * Deleting a payment changes what a customer owes, so the dialog has to warn
 * accurately and refuse to act until the warning has been acknowledged.
 */
describe('DeletePaymentModalComponent', () => {
  const payment = (over: Partial<SalePaymentRecord> = {}): SalePaymentRecord => ({
    id: 'p2',
    saleId: 's1',
    amount: 400,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    status: PaymentRecordStatus.CONFIRMED,
    reference: 'TRF-2',
    isCustomerInitiated: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...over,
  });

  // 1,000 settled in full by 600 + 400.
  const paidSummary: SalePaymentSummary = {
    saleId: 's1',
    saleTotal: 1000,
    totalPaid: 1000,
    balanceRemaining: 0,
    isFullyPaid: true,
    payments: [],
  };

  let api: jasmine.SpyObj<SalesPaymentsApiService>;
  let modal: DeletePaymentModalComponent;

  beforeEach(() => {
    api = jasmine.createSpyObj<SalesPaymentsApiService>('SalesPaymentsApiService', [
      'deletePayment',
    ]);
    api.deletePayment.and.returnValue(of(payment()));

    TestBed.configureTestingModule({
      imports: [DeletePaymentModalComponent],
      providers: [MessageService, { provide: SalesPaymentsApiService, useValue: api }],
    });

    const fixture = TestBed.createComponent(DeletePaymentModalComponent);
    fixture.detectChanges();
    modal = fixture.componentInstance;
  });

  describe('the warning', () => {
    it('says what the balance will be once a confirmed payment goes', () => {
      modal.open('s1', payment(), paidSummary);

      expect(modal.affectsBalance()).toBe(true);
      expect(modal.balanceAfter()).toBe(400);
    });

    it('warns that a fully paid sale will be reopened', () => {
      modal.open('s1', payment(), paidSummary);

      expect(modal.reopensSale()).toBe(true);
    });

    // A pending payment never counted, so removing it moves nothing.
    it('does not overstate the effect of removing an unconfirmed payment', () => {
      modal.open('s1', payment({ status: PaymentRecordStatus.PENDING }), {
        ...paidSummary,
        totalPaid: 600,
        balanceRemaining: 400,
        isFullyPaid: false,
      });

      expect(modal.affectsBalance()).toBe(false);
      expect(modal.balanceAfter()).toBe(400);
      expect(modal.reopensSale()).toBe(false);
    });
  });

  describe('acting on it', () => {
    it('will not delete until the warning is acknowledged', () => {
      modal.open('s1', payment(), paidSummary);

      expect(modal.canDelete()).toBe(false);
      modal.onConfirm();
      expect(api.deletePayment).not.toHaveBeenCalled();
    });

    it('deletes once acknowledged, sending the trimmed reason', () => {
      const deleted = jasmine.createSpy('paymentDeleted');
      modal.paymentDeleted.subscribe(deleted);
      modal.open('s1', payment(), paidSummary);
      modal.form.setValue({ reason: '  Recorded twice  ', acknowledged: true });

      expect(modal.canDelete()).toBe(true);
      modal.onConfirm();

      expect(api.deletePayment).toHaveBeenCalledWith('s1', 'p2', { reason: 'Recorded twice' });
      expect(deleted).toHaveBeenCalled();
      expect(modal.visible()).toBe(false);
    });

    it('sends no reason when none was given', () => {
      modal.open('s1', payment(), paidSummary);
      modal.form.setValue({ reason: '   ', acknowledged: true });
      modal.onConfirm();

      expect(api.deletePayment).toHaveBeenCalledWith('s1', 'p2', {});
    });

    it('starts unacknowledged every time it opens', () => {
      modal.open('s1', payment(), paidSummary);
      modal.form.controls.acknowledged.setValue(true);
      modal.close();
      modal.open('s1', payment(), paidSummary);

      expect(modal.canDelete()).toBe(false);
    });

    it('stays open and explains a refusal from the server', () => {
      api.deletePayment.and.returnValue(throwError(() => ({ status: 403 })));
      modal.open('s1', payment(), paidSummary);
      modal.form.controls.acknowledged.setValue(true);
      modal.onConfirm();

      expect(modal.visible()).toBe(true);
      expect(modal.errorMessage()).toContain('super admin');
    });
  });
});
