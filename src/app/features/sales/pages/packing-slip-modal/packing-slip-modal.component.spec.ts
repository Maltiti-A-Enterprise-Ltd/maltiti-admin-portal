import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { PackingSlipModalComponent } from './packing-slip-modal.component';
import { SalesApiService } from '../../services/sales-api.service';
import { Sale, SaleLineItem } from '../../models/sale.model';

/**
 * The preview has to be the document that downloads, so every change must
 * reach the request — and nothing should be sent that was not changed.
 */
describe('PackingSlipModalComponent', () => {
  const items = [
    { productId: 'p1', productName: 'Shea Butter', requestedQuantity: 40 },
    { productId: 'p2', productName: 'Dawadawa', requestedQuantity: 10 },
  ] as SaleLineItem[];

  const sale = (email: string | null = 'ama@example.com'): Sale =>
    ({ id: 's1', lineItems: items, customer: email ? { email } : undefined }) as Sale;

  let api: jasmine.SpyObj<SalesApiService>;
  let modal: PackingSlipModalComponent;

  beforeEach(() => {
    api = jasmine.createSpyObj<SalesApiService>('SalesApiService', [
      'generatePackingSlip',
      'sendPackingSlipEmail',
    ]);
    api.sendPackingSlipEmail.and.returnValue(
      of({ message: 'sent', data: { sentTo: 'ama@example.com' } }),
    );
    api.generatePackingSlip.and.returnValue(
      of({ blob: new Blob(['%PDF-'], { type: 'application/pdf' }), fileName: 'Slip.pdf' }),
    );

    TestBed.configureTestingModule({
      imports: [PackingSlipModalComponent],
      providers: [MessageService, { provide: SalesApiService, useValue: api }],
    });

    modal = TestBed.createComponent(PackingSlipModalComponent).componentInstance;
  });

  afterEach(() => modal.close());

  it('previews the ordinary slip as soon as it opens', () => {
    modal.open(sale());

    expect(api.generatePackingSlip).toHaveBeenCalledOnceWith('s1', {});
    expect(modal.previewUrl()).not.toBeNull();
  });

  it('rebuilds the preview with the packages and notes once a field is left', () => {
    modal.open(sale());
    modal.packageCount.set(4);
    modal.notes.set('  Keep dry  ');
    modal.commitOptions();

    expect(api.generatePackingSlip).toHaveBeenCalledTimes(2);
    expect(api.generatePackingSlip.calls.mostRecent().args[1]).toEqual({
      packageCount: 4,
      notes: 'Keep dry',
    });
  });

  it('does not rebuild when nothing changed', () => {
    modal.open(sale());
    modal.commitOptions();

    expect(api.generatePackingSlip).toHaveBeenCalledTimes(1);
  });

  it('sends a part shipment with only the changed lines', () => {
    modal.open(sale());
    modal.quantities.setPending(1, 0);
    modal.quantities.commit();

    expect(api.generatePackingSlip.calls.mostRecent().args[1]).toEqual({
      lineQuantities: [{ index: 1, productId: 'p2', quantity: 0 }],
    });
  });

  it('sends pounds when ticked', () => {
    modal.open(sale());
    modal.toggleImperial(true);

    expect(api.generatePackingSlip.calls.mostRecent().args[1]).toEqual({
      showImperialWeights: true,
    });
  });

  // The usual cause is a quantity the admin can fix in the same dialog.
  it('stays open and shows why when the slip is refused', () => {
    api.generatePackingSlip.and.returnValue(
      throwError(() => ({ error: { message: 'Nothing to pack.' } })),
    );
    modal.open(sale());

    expect(modal.visible()).toBeTrue();
    expect(modal.previewError()).toBe('Nothing to pack.');
    expect(modal.previewUrl()).toBeNull();
  });

  describe('ticking lines as packed', () => {
    it('rebuilds the preview as soon as a line is ticked', () => {
      modal.open(sale());
      modal.quantities.setPacked(0, true);

      expect(api.generatePackingSlip.calls.mostRecent().args[1]).toEqual({
        packedLines: [{ index: 0, productId: 'p1' }],
      });
    });

    it('ticks every line at once', () => {
      modal.open(sale());
      modal.quantities.setAllPacked(true);

      expect(api.generatePackingSlip.calls.mostRecent().args[1]).toEqual({
        packedLines: [
          { index: 0, productId: 'p1' },
          { index: 1, productId: 'p2' },
        ],
      });
    });
  });

  describe('sending by email', () => {
    it('sends the previewed slip to the customer on record', () => {
      modal.open(sale());
      modal.packageCount.set(2);
      modal.commitOptions();
      modal.quantities.setPacked(1, true);
      modal.send();

      expect(api.sendPackingSlipEmail).toHaveBeenCalledOnceWith('s1', {
        packageCount: 2,
        packedLines: [{ index: 1, productId: 'p2' }],
      });
      expect(modal.visible()).toBeFalse();
    });

    it('sends to another address when one is chosen', () => {
      modal.open(sale());
      modal.recipient.set('other');
      modal.otherEmail.set(' dispatch@example.com ');
      modal.send();

      expect(api.sendPackingSlipEmail).toHaveBeenCalledOnceWith('s1', {
        email: 'dispatch@example.com',
      });
    });

    it('asks for an address when the customer has none', () => {
      modal.open(sale(null));

      expect(modal.recipient()).toBe('other');
      expect(modal.sendTo()).toBeNull();

      modal.send();

      expect(api.sendPackingSlipEmail).not.toHaveBeenCalled();
      expect(modal.showEmailError()).toBeTrue();
    });

    // The admin is waiting to be told it went; a failure must not look sent.
    it('stays open and says why when the email fails', () => {
      api.sendPackingSlipEmail.and.returnValue(
        throwError(() => ({ error: { message: 'The packing slip could not be emailed.' } })),
      );
      modal.open(sale());
      modal.send();

      expect(modal.visible()).toBeTrue();
      expect(modal.sendError()).toContain('could not be emailed');
      expect(modal.sending()).toBeFalse();
    });
  });
});
