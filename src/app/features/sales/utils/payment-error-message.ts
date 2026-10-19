/**
 * What to tell an admin when recording or correcting a payment fails.
 *
 * Both payment dialogs had their own copy of this, character for character.
 * One place means a wording improvement lands in both, rather than in
 * whichever one the next person happened to open.
 */
export function paymentErrorMessage(status?: number): string {
  switch (status) {
    case 400:
      return 'Invalid payment details. Please check the amount and try again.';
    case 401:
      return 'Session expired. Please log in again.';
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return 'Sale or payment record not found.';
    default:
      return 'Something went wrong. Please try again later.';
  }
}
