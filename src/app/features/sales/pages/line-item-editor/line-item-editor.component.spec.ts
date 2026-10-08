import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { LineItemEditorComponent } from './line-item-editor.component';
import { SaleLineItemDto } from '../../models/sale.model';
import { LightProduct } from '@features/products/models/product.model';

/**
 * These cover a silent data-loss bug: the parent sales form builds its
 * create/update request purely from this component's `lineItemChange` output,
 * so any edit that is not emitted never reaches the API. Quantity and custom
 * price were both being dropped.
 */
describe('LineItemEditorComponent', () => {
  let fixture: ComponentFixture<LineItemEditorComponent>;
  let component: LineItemEditorComponent;
  let emitted: SaleLineItemDto[];

  const product = {
    id: 'product-1',
    name: 'Shea Butter',
    wholesale: 40,
    retail: 60,
  } as LightProduct;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineItemEditorComponent],
      providers: [MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(LineItemEditorComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('products', [product]);
    fixture.componentRef.setInput('isBatchRequired', false);
    fixture.componentRef.setInput('isPaid', false);

    emitted = [];
    component.lineItemChange.subscribe((item) => emitted.push(item));

    fixture.detectChanges();

    // Pick a product so the form is valid and emits.
    component.lineItemForm.controls.productId.setValue(product.id);
    emitted.length = 0;
  });

  const lastEmitted = (): SaleLineItemDto | undefined => emitted[emitted.length - 1];

  it('emits when the quantity changes', () => {
    component.lineItemForm.controls.requestedQuantity.setValue(7);

    expect(lastEmitted()?.requestedQuantity).toBe(7);
  });

  it('emits when the custom price changes', () => {
    component.lineItemForm.controls.customPrice.setValue(99);

    expect(lastEmitted()?.customPrice).toBe(99);
  });

  it('carries the latest quantity on a later emit, not the original', () => {
    component.lineItemForm.controls.requestedQuantity.setValue(3);
    component.lineItemForm.controls.requestedQuantity.setValue(11);

    expect(lastEmitted()?.requestedQuantity).toBe(11);
  });

  it('does not emit a quantity the user has cleared', () => {
    component.lineItemForm.controls.requestedQuantity.setValue(5);
    emitted.length = 0;

    component.lineItemForm.controls.requestedQuantity.setValue(null);

    expect(emitted).toEqual([]);
  });

  // Angular emits a child control's valueChanges before recalculating the
  // group's status, so a guard reading `lineItemForm.invalid` from a per-control
  // subscription is stale by one edit — and would swallow the correction.
  it('emits the corrected quantity after the field was cleared and refilled', () => {
    component.lineItemForm.controls.requestedQuantity.setValue(null);
    emitted.length = 0;

    component.lineItemForm.controls.requestedQuantity.setValue(9);

    expect(lastEmitted()?.requestedQuantity).toBe(9);
  });

  it('reports invalidity so the parent can refuse to submit stale values', () => {
    const errors: boolean[] = [];
    component.validationError.subscribe((hasError) => errors.push(hasError));

    component.lineItemForm.controls.requestedQuantity.setValue(null);

    expect(errors.at(-1)).toBeTrue();
  });

  it('clears the invalid report once the line item is complete again', () => {
    const errors: boolean[] = [];
    component.validationError.subscribe((hasError) => errors.push(hasError));

    component.lineItemForm.controls.requestedQuantity.setValue(null);
    component.lineItemForm.controls.requestedQuantity.setValue(4);

    expect(errors.at(-1)).toBeFalse();
  });
});
