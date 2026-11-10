import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { PackingSlipModalComponent } from './packing-slip-modal.component';
import { SalesApiService } from '../../services/sales-api.service';
import { SaleLineItem } from '../../models/sale.model';

/**
 * The preview has to be the document that downloads, so every change must
 * reach the request — and nothing should be sent that was not changed.
 */
describe('PackingSlipModalComponent', () => {
  const items = [
    { productId: 'p1', productName: 'Shea Butter', requestedQuantity: 40 },
    { productId: 'p2', productName: 'Dawadawa', requestedQuantity: 10 },
  ] as SaleLineItem[];

  let api: jasmine.SpyObj<SalesApiService>;
  let modal: PackingSlipModalComponent;

  beforeEach(() => {
    api = jasmine.createSpyObj<SalesApiService>('SalesApiService', ['generatePackingSlip']);
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
    modal.open('s1', items);

    expect(api.generatePackingSlip).toHaveBeenCalledOnceWith('s1', {});
    expect(modal.previewUrl()).not.toBeNull();
  });

  it('rebuilds the preview with the packages and notes once a field is left', () => {
    modal.open('s1', items);
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
    modal.open('s1', items);
    modal.commitOptions();

    expect(api.generatePackingSlip).toHaveBeenCalledTimes(1);
  });

  it('sends a part shipment with only the changed lines', () => {
    modal.open('s1', items);
    modal.quantities.setPending(1, 0);
    modal.quantities.commit();

    expect(api.generatePackingSlip.calls.mostRecent().args[1]).toEqual({
      lineQuantities: [{ index: 1, productId: 'p2', quantity: 0 }],
    });
  });

  it('sends pounds when ticked', () => {
    modal.open('s1', items);
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
    modal.open('s1', items);

    expect(modal.visible()).toBeTrue();
    expect(modal.previewError()).toBe('Nothing to pack.');
    expect(modal.previewUrl()).toBeNull();
  });
});
