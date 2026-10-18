/**
 * Opening the sale form on a sale that already exists.
 *
 * Pulled out of the form component when it hit its 400-line ceiling, the same
 * way the totals, catalogue and weight helpers were. It is also a job worth
 * naming: every control on the page is written exactly once, here, so a field
 * that is added to the form and forgotten here is a field that silently opens
 * blank on every edit.
 *
 * The targets are described structurally rather than by importing the
 * component's own types, so this stays a plain function over form controls
 * and can be checked without standing a component up.
 */

import { FormArray, FormControl } from '@angular/forms';
import { WritableSignal } from '@angular/core';
import {
  InvoiceCurrency,
  OrderStatus,
  PaymentStatus,
  Sale,
  SaleLineItemDto,
} from '../models/sale.model';
import { PaymentInstructionDto } from '../models/sale-invoice-terms.model';
import { isSaleLocked } from './sale-edit-lock';

/** Everything the form fills in from a saved sale. */
export interface SaleFormTargets {
  /** The pinned deal currency and its rate. */
  readonly deal: { reset: (currency?: InvoiceCurrency, rate?: number) => void };
  /** Whether the sale is frozen because it has already been dispatched. */
  readonly isLocked: WritableSignal<boolean>;
  readonly customer: FormControl<string | null>;
  readonly orderStatus: FormControl<OrderStatus | null>;
  readonly paymentStatus: FormControl<PaymentStatus | null>;
  readonly deliveryFee: FormControl<number>;
  readonly confirmedDelivery: WritableSignal<string | null>;
  readonly arrivalDate: FormControl<Date | null>;
  /** Absent until the editor's view exists; seeding is skipped if so. */
  readonly terms?: {
    seed: (value: {
      instructions: PaymentInstructionDto[];
      remarks: string | null;
    }) => void;
  };
  readonly lineItems: FormArray<FormControl<SaleLineItemDto>>;
  /** The form builder's `control`, so this file need not own one. */
  readonly control: (value: SaleLineItemDto) => FormControl<SaleLineItemDto>;
}

/**
 * A saved line as the form holds it.
 *
 * The premium is carried through rather than dropped. Without it, opening a
 * sale to change anything at all would strip the premium off every line on
 * the next save.
 */
export function saleLineItemValue(item: Sale['lineItems'][number]): SaleLineItemDto {
  return {
    productId: item.productId,
    requestedQuantity: item.requestedQuantity,
    batchAllocations: item.batchAllocations || [],
    customPrice: item.customPrice,
    finalPrice: Number(item.finalPrice),
    premiumType: item.premiumType ?? null,
    premiumValue: item.premiumValue ?? null,
  };
}

export function seedSaleForm(sale: Sale, into: SaleFormTargets): void {
  // Pinned, not editable — but every price on the page is labelled with it.
  into.deal.reset(sale.currency, sale.exchangeRate);
  into.isLocked.set(isSaleLocked(sale));
  into.customer.setValue(sale.customer?.id || sale.customerId);
  into.orderStatus.setValue(sale.orderStatus);
  into.paymentStatus.setValue(sale.paymentStatus);
  into.deliveryFee.setValue(sale.deliveryFee);
  into.confirmedDelivery.set(sale.confirmedDeliveryDate || null);
  into.arrivalDate.setValue(
    sale.estimatedArrivalDate ? new Date(sale.estimatedArrivalDate) : null,
  );

  into.terms?.seed({
    instructions: sale.paymentInstructions ?? [],
    remarks: sale.invoiceRemarks ?? null,
  });

  into.lineItems.clear();
  into.lineItems.push(sale.lineItems.map((item) => into.control(saleLineItemValue(item))));
}
