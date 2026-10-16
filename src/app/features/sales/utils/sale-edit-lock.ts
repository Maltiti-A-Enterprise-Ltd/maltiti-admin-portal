import { computed, effect, signal, Signal, WritableSignal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Role } from '@models/user.model';
import {
  PaymentInstructionDto,
  CreateSaleDto,
  InvoiceCurrency,
  OrderStatus,
  PaymentStatus,
  Sale,
  SaleLineItemDto,
  UpdateSaleDto,
} from '../models/sale.model';

/**
 * What may still be edited once a sale has been dispatched.
 *
 * A sale in transit or delivered is a record of something that already
 * happened, so what it says was sold is frozen — the paperwork has to keep
 * matching the delivery. Its *status* is not frozen, because a delivered order
 * still has to be marked delivered, and that was the bug: the API refused the
 * whole edit, so the final status could not be reached from the form at all.
 *
 * A super admin can go further and correct the contents, by asking to. The API
 * requires the same flag and verifies the role itself — this is the UI half,
 * not the enforcement.
 */
export const LOCKED_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.IN_TRANSIT,
  OrderStatus.DELIVERED,
];

/** Whether the sale as last saved has already been dispatched. */
export const isSaleLocked = (sale: Pick<Sale, 'orderStatus'> | null | undefined): boolean =>
  !!sale && LOCKED_ORDER_STATUSES.includes(sale.orderStatus);

interface UpdatePayloadInput {
  readonly customerId: string;
  readonly orderStatus: OrderStatus;
  readonly paymentStatus: PaymentStatus;
  readonly deliveryFee: number;
  readonly lineItems: readonly SaleLineItemDto[];
  readonly notifyCustomer: boolean;
  /** How the invoice says it is to be paid. Empty array clears them. */
  readonly paymentInstructions?: PaymentInstructionDto[];
  readonly invoiceRemarks?: string | null;
  /** When the shipment is expected. Null removes the date. */
  readonly estimatedArrivalDate?: string | null;
  /** False when the sale is dispatched and the editor has not overridden. */
  readonly canEditContents: boolean;
  /** True only when a super admin deliberately asked to edit a locked sale. */
  readonly overriding: boolean;
}

/**
 * The body for a sale edit.
 *
 * When the contents cannot be edited, the fields describing them are left out
 * entirely rather than sent unchanged. The API decides "is this a status-only
 * edit?" by which keys are present, so sending `lineItems` identical to the
 * stored ones would still read as an attempt to rewrite a dispatched sale and
 * be refused.
 */
/**
 * A line's premium, or nothing at all.
 *
 * Both payload builders list their fields by hand, so anything not named
 * here never reaches the API. The premium fields were added to the line
 * editor without being added here, which left the whole feature inert —
 * collected in the form and dropped on the way out.
 *
 * Sent only as a pair. Half a premium is rejected by the API, and sending
 * `undefined` for one of them would turn a valid line into a 400.
 */
function premiumOf(
  item: SaleLineItemDto,
): Pick<SaleLineItemDto, 'premiumType' | 'premiumValue'> | Record<string, never> {
  return item.premiumType && item.premiumValue
    ? { premiumType: item.premiumType, premiumValue: item.premiumValue }
    : {};
}

export function buildSaleUpdatePayload(input: UpdatePayloadInput): UpdateSaleDto {
  const payload: UpdateSaleDto = {
    orderStatus: input.orderStatus,
    paymentStatus: input.paymentStatus,
    // Omitted when off, like the create path: the API rejects unknown
    // properties, so an older deployment must not see the key at all.
    notifyCustomer: input.notifyCustomer || undefined,
    /* Outside the content lock below on purpose: in transit is exactly
       when a date needs revising, and those sales are locked. The API
       agrees — it keeps the date out of its own content-field list. */
    ...(input.estimatedArrivalDate !== undefined
      ? { estimatedArrivalDate: input.estimatedArrivalDate }
      : {}),
  };

  if (input.overriding) {
    payload.overrideStatusLock = true;
  }

  if (!input.canEditContents) {
    return payload;
  }

  payload.customerId = input.customerId;
  payload.deliveryFee = input.deliveryFee;
  /* Behind the content lock with the line items: terms are what the
     customer agreed to pay, not a rendering choice, so a dispatched sale
     should not have them rewritten from here. */
  payload.paymentInstructions = input.paymentInstructions ?? [];
  payload.invoiceRemarks = input.invoiceRemarks ?? null;
  payload.lineItems = input.lineItems.map((item) => ({
    productId: item.productId,
    requestedQuantity: item.requestedQuantity,
    batchAllocations: item.batchAllocations,
    customPrice: item.customPrice || undefined,
    ...premiumOf(item),
  }));

  return payload;
}

/** The editing state of a dispatched sale, and who is allowed to change it. */
export interface SaleEditLock {
  /** Set from the sale as last saved, not from the form's status dropdown. */
  readonly isLocked: WritableSignal<boolean>;
  /** The super admin's deliberate choice to correct a dispatched sale. */
  readonly overrideLock: WritableSignal<boolean>;
  readonly isSuperAdmin: Signal<boolean>;
  readonly isOverriding: Signal<boolean>;
  readonly canEditContents: Signal<boolean>;
}

/**
 * @param contentControls the inputs describing what was sold. They are disabled
 * while the sale is locked, so an edit that would be dropped on save cannot be
 * typed in the first place — the payload omits them, and silently discarding
 * someone's typing is worse than not letting them start.
 */
export const saleEditLock = (
  userRole: Signal<Role | undefined>,
  contentControls: readonly AbstractControl[] = [],
): SaleEditLock => {
  const isLocked = signal(false);
  const overrideLock = signal(false);
  const canEditContents = computed(() => !isLocked() || overrideLock());

  effect(() => {
    const editable = canEditContents();

    for (const control of contentControls) {
      /* `emitEvent: false` so toggling the lock does not look like the user
         editing the sale, which would retrigger the cascades watching these. */
      if (editable) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  });

  return {
    isLocked,
    overrideLock,
    canEditContents,
    isSuperAdmin: computed(() => userRole() === Role.SuperAdmin),
    isOverriding: computed(() => isLocked() && overrideLock()),
  };
};

/** The body for creating a sale. */
export function buildSaleCreatePayload(input: {
  customerId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryFee: number;
  lineItems: readonly SaleLineItemDto[];
  notifyCustomer: boolean;
  /** How the invoice says it is to be paid. Empty array clears them. */
  paymentInstructions?: PaymentInstructionDto[];
  invoiceRemarks?: string | null;
  /** The deal currency, pinned with its rate. Omitted for a cedi sale. */
  currency?: InvoiceCurrency;
  exchangeRate?: number;
}): CreateSaleDto {
  const foreign = !!input.currency && input.currency !== InvoiceCurrency.GHS;

  return {
    customerId: input.customerId,
    orderStatus: input.orderStatus,
    paymentStatus: input.paymentStatus,
    deliveryFee: input.deliveryFee,
    lineItems: input.lineItems.map((item) => ({
      productId: item.productId,
      requestedQuantity: item.requestedQuantity,
      batchAllocations: item.batchAllocations,
      customPrice: item.customPrice || undefined,
      ...premiumOf(item),
    })),
    // Omitted when off: the API rejects unknown properties, so an older
    // deployment must not see the key at all.
    notifyCustomer: input.notifyCustomer || undefined,
    paymentInstructions: input.paymentInstructions ?? [],
    invoiceRemarks: input.invoiceRemarks ?? null,
    /* Only sent for a foreign deal. A cedi sale omits both, which is what
       the API defaults to — and sending GHS with a rate of 1 would just be
       noise on every ordinary order. */
    currency: foreign ? input.currency : undefined,
    exchangeRate: foreign ? input.exchangeRate : undefined,
  };
}
