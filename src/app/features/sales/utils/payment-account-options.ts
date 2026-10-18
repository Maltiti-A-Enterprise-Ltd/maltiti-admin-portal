/**
 * The "received into" picker, shared by everything that records a payment.
 *
 * Retired accounts are left out: money cannot arrive in an account that is no
 * longer in use, and the API refuses one anyway. Failing to list them at all
 * is not an error either — the link is optional, and an admin should still be
 * able to record a cash payment when the accounts endpoint is down.
 */

import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { PaymentAccountApiService } from '@features/payment-accounts/services/payment-account-api.service';
import { paymentAccountLabel } from '@features/payment-accounts/models/payment-account.model';

export interface PaymentAccountOption {
  label: string;
  value: string;
}

/** An account a payment is already linked to, which may since have retired. */
export interface LinkedAccount {
  id?: string | null;
  label?: string | null;
}

/**
 * Active accounts as "Bank — number (currency)", newest list first.
 *
 * `linked` keeps the account an existing payment points at in the list even
 * once it has been retired. Without it the select would open blank on a
 * retired account and saving would quietly detach it — erasing the record of
 * where the money actually went, which is the one thing the link exists to
 * preserve.
 */
export function paymentAccountOptions(
  api: PaymentAccountApiService,
  linked?: LinkedAccount,
): Observable<PaymentAccountOption[]> {
  return api.getAll(true).pipe(
    take(1),
    map((accounts) =>
      accounts.map((account) => ({
        label: paymentAccountLabel(account),
        value: account.id,
      })),
    ),
    catchError(() => of<PaymentAccountOption[]>([])),
    map((options) => withLinked(options, linked)),
  );
}

function withLinked(
  options: PaymentAccountOption[],
  linked?: LinkedAccount,
): PaymentAccountOption[] {
  const id = linked?.id;

  if (!id || options.some((option) => option.value === id)) {
    return options;
  }

  return [{ label: `${linked?.label ?? 'Account'} — no longer in use`, value: id }, ...options];
}
