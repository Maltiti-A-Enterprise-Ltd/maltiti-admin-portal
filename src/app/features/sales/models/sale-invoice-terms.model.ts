/**
 * The milestones a payment can be tied to on an invoice.
 *
 * Anything these cannot express belongs in the invoice remarks, which exist
 * for exactly that — the list is deliberately short.
 */
export enum PaymentInstructionType {
  INITIAL_DEPOSIT = 'initial_deposit',
  BEFORE_DELIVERY = 'before_delivery',
  AFTER_DELIVERY = 'after_delivery',
}

export const PAYMENT_INSTRUCTION_OPTIONS: {
  label: string;
  value: PaymentInstructionType;
}[] = [
  { label: 'Initial payment', value: PaymentInstructionType.INITIAL_DEPOSIT },
  { label: 'Before delivery', value: PaymentInstructionType.BEFORE_DELIVERY },
  { label: 'After delivery', value: PaymentInstructionType.AFTER_DELIVERY },
];

/**
 * One line of "how this invoice is to be paid".
 *
 * Leaving the percentage out reads as "the balance", so an admin writing
 * "50% up front, the rest on delivery" does not do the subtraction.
 */
export interface PaymentInstructionDto {
  type: PaymentInstructionType;
  percentage?: number | null;
}
