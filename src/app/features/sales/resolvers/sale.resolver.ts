/**
 * Sale Resolver
 * Loads sale data before the route activates in edit mode
 */

import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { APP_ROUTES } from '@config/routes.config';
import { Sale, SaleKind } from '../models/sale.model';
import { loadSale } from '../store/sales.actions';
import { selectCurrentSale, selectLoading } from '../store/sales.selectors';

export const saleResolver: ResolveFn<Sale | null> = (route) => {
  const store = inject(Store);
  const router = inject(Router);
  const messageService = inject(MessageService);
  const saleId = route.paramMap.get('id');

  if (!saleId) {
    return of(null);
  }

  // Dispatch the load action
  store.dispatch(loadSale({ id: saleId }));

  // Wait for loading to complete and return the sale
  return store.select(selectLoading).pipe(
    filter((loading) => !loading),
    take(1),
    switchMap(() => store.select(selectCurrentSale)),
    take(1),
    map((sale) => (isEditable(sale, router, messageService) ? sale : null)),
  );
};

/**
 * Turns an opening balance away from the sale form.
 *
 * A debt carried in from before this system has no line items, so the form
 * would open on an empty product list and refuse to save. The row's menu
 * sends it to its own dialog instead; this catches a bookmarked or typed
 * URL, which is the only other way in.
 *
 * Here rather than in the component so the form is never built at all.
 */
function isEditable(
  sale: Sale | null,
  router: Router,
  messageService: MessageService,
): boolean {
  if (sale?.kind !== SaleKind.OPENING_BALANCE) {
    return true;
  }

  messageService.add({
    severity: 'info',
    summary: 'Opening balance',
    detail:
      'Debt brought forward is corrected from the sales list — it has no ' +
      'products to edit here.',
  });
  void router.navigate([APP_ROUTES.sales.list.fullPath]);

  return false;
}
