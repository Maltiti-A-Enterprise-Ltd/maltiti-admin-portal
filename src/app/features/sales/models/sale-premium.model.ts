/**
 * How a line's premium is expressed. Both scale with quantity — a cash
 * premium is charged per unit, a percentage is taken off the line's total.
 *
 * Not to be confused with the `premium` product *grade*, which describes the
 * quality of the goods rather than what is charged for them.
 */
/**
 * `PremiumOnALine` — why the premium fields appear on three line-item
 * shapes rather than one.
 *
 * A line is rebuilt field by field at several seams: the API's response
 * mapper, the sale form's seeding, and both payload builders. Anything
 * not named at each seam is dropped, so the fields have to be declared on
 * the way out *and* on the way back, or a premium is lost the next time
 * the sale is saved.
 */
export enum PremiumType {
  AMOUNT = 'amount',
  PERCENT = 'percent',
}

export const PREMIUM_TYPE_OPTIONS: { label: string; value: PremiumType }[] = [
  { label: 'Amount per unit', value: PremiumType.AMOUNT },
  { label: 'Percentage', value: PremiumType.PERCENT },
];
