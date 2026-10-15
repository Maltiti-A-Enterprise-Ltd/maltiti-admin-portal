import {
  PaymentInstructionDto,
  PaymentInstructionType,
} from '../models/sale.model';

/**
 * The rules the API enforces on payment terms, mirrored so the form can say
 * so before a save fails.
 *
 * `payment-instructions.util.ts` in the API is the authority — it rejects
 * the request. This exists so an admin finds out while they are still
 * typing rather than from a 400 after filling in everything else.
 */

/** Over 100% is wrong; under is an ordinary "30% deposit, rest implied". */
export const MAX_TOTAL_PERCENTAGE = 100;

const share = (instruction: PaymentInstructionDto): number => {
  const value = Number(instruction.percentage);

  return Number.isFinite(value) && value > 0 ? value : 0;
};

/** What the named percentages come to. Balance lines count for nothing. */
export function totalPercentage(
  instructions: readonly PaymentInstructionDto[] | null | undefined,
): number {
  return (instructions ?? []).reduce(
    (total, instruction) => total + share(instruction),
    0,
  );
}

/**
 * Why these terms would be refused, or null when they are fine.
 *
 * One message at a time: showing every fault at once on a short list reads
 * as nagging, and fixing the first usually clears the rest.
 */
export function paymentInstructionsProblem(
  instructions: readonly PaymentInstructionDto[] | null | undefined,
): string | null {
  if (!instructions?.length) {
    return null;
  }

  const seen = new Set<PaymentInstructionType>();

  for (const instruction of instructions) {
    if (seen.has(instruction.type)) {
      return 'Each milestone can only appear once — combine them into one line.';
    }

    seen.add(instruction.type);
  }

  const total = totalPercentage(instructions);

  return total > MAX_TOTAL_PERCENTAGE
    ? `These add up to ${total}% of the invoice. They cannot come to more than 100%.`
    : null;
}

/**
 * How one instruction will read on the invoice.
 *
 * Mirrors the API's wording so the preview and the document agree. A
 * deposit with no percentage is "in full up front" rather than "the
 * balance" — there is nothing before it for a balance to be left over from.
 */
export function previewInstruction(instruction: PaymentInstructionDto): string {
  const percentage = share(instruction);

  switch (instruction.type) {
    case PaymentInstructionType.INITIAL_DEPOSIT:
      return percentage
        ? `${percentage}% initial payment`
        : 'Payment in full up front';
    case PaymentInstructionType.BEFORE_DELIVERY:
      return percentage
        ? `${percentage}% before delivery`
        : 'Balance before delivery';
    default:
      return percentage
        ? `${percentage}% after delivery`
        : 'Balance after delivery';
  }
}
