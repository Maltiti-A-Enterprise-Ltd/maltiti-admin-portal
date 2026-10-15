import {
  paymentInstructionsProblem,
  previewInstruction,
  totalPercentage,
} from './payment-instructions';
import {
  PaymentInstructionDto,
  PaymentInstructionType,
} from '../models/sale.model';

const deposit = (percentage?: number | null): PaymentInstructionDto => ({
  type: PaymentInstructionType.INITIAL_DEPOSIT,
  percentage,
});
const before = (percentage?: number | null): PaymentInstructionDto => ({
  type: PaymentInstructionType.BEFORE_DELIVERY,
  percentage,
});
const after = (percentage?: number | null): PaymentInstructionDto => ({
  type: PaymentInstructionType.AFTER_DELIVERY,
  percentage,
});

describe('previewInstruction', () => {
  /* The wording has to match the API's, or the preview promises one thing
     and the invoice prints another. */
  it('names the share and the milestone', () => {
    expect(previewInstruction(deposit(50))).toBe('50% initial payment');
    expect(previewInstruction(before(25))).toBe('25% before delivery');
    expect(previewInstruction(after(25))).toBe('25% after delivery');
  });

  it('reads as the balance when no share is given', () => {
    expect(previewInstruction(before())).toBe('Balance before delivery');
    expect(previewInstruction(after(null))).toBe('Balance after delivery');
  });

  /* Nothing comes before a deposit for a balance to be left over from. */
  it('reads a deposit with no share as payment in full up front', () => {
    expect(previewInstruction(deposit())).toBe('Payment in full up front');
  });
});

describe('totalPercentage', () => {
  it('adds the named shares', () => {
    expect(totalPercentage([deposit(50), after(30)])).toBe(80);
  });

  it('counts a balance line as nothing', () => {
    expect(totalPercentage([deposit(50), after()])).toBe(50);
  });

  it('is zero for no instructions', () => {
    expect(totalPercentage([])).toBe(0);
    expect(totalPercentage(null)).toBe(0);
  });
});

describe('paymentInstructionsProblem', () => {
  it('passes terms that come to exactly 100%', () => {
    expect(paymentInstructionsProblem([deposit(50), after(50)])).toBeNull();
  });

  /* "30% deposit, rest implied" is ordinary; demanding exactly 100 would
     block it for no gain. */
  it('passes terms that come to less than 100%', () => {
    expect(paymentInstructionsProblem([deposit(30)])).toBeNull();
  });

  it('passes a sale with no terms', () => {
    expect(paymentInstructionsProblem([])).toBeNull();
    expect(paymentInstructionsProblem(undefined)).toBeNull();
  });

  it('objects when the shares come to more than 100%', () => {
    expect(paymentInstructionsProblem([deposit(50), after(70)])).toContain(
      '120%',
    );
  });

  it('objects to the same milestone twice', () => {
    expect(paymentInstructionsProblem([after(30), after(20)])).toContain(
      'once',
    );
  });

  /* The duplicate is reported before the arithmetic, because fixing it
     usually changes the total anyway. */
  it('reports the duplicate first when a set has both faults', () => {
    expect(paymentInstructionsProblem([after(70), after(70)])).toContain(
      'once',
    );
  });
});
