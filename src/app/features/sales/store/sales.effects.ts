import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { SalesApiService } from '../services/sales-api.service';
import * as SalesActions from './sales.actions';
import { MessageService } from 'primeng/api';
import { APP_ROUTES } from '@config/routes.config';
import { Router } from '@angular/router';

@Injectable()
export class SalesEffects {
  private readonly salesApi = inject(SalesApiService);
  private readonly actions$ = inject(Actions);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  public loadSales$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SalesActions.loadSales),
      mergeMap(
        ({
          page,
          limit,
          orderStatus,
          paymentStatus,
          customerId,
          customerName,
          needsAttention,
          flagged,
          attention,
        }) =>
        this.salesApi
          .getSales(orderStatus, paymentStatus, customerId, customerName, page, limit, {
            bucket: attention,
            needsAttention,
            flagged,
          })
          .pipe(
            map((response) => SalesActions.loadSalesSuccess({ response })),
            catchError((error) =>
              of(
                SalesActions.loadSalesFailure({
                  error: error.error.message || 'Failed to load sales',
                }),
              ),
            ),
          ),
      ),
    ),
  );

  public loadSale$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SalesActions.loadSale),
      mergeMap(({ id }) =>
        this.salesApi.getSale(id).pipe(
          map((sale) => SalesActions.loadSaleSuccess({ sale })),
          catchError((error) =>
            of(
              SalesActions.loadSaleFailure({ error: error.error.message || 'Failed to load sale' }),
            ),
          ),
        ),
      ),
    ),
  );

  public createSale$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SalesActions.createSale),
      mergeMap(({ saleData }) =>
        this.salesApi.createSale(saleData).pipe(
          map((sale) => SalesActions.createSaleSuccess({ sale })),
          catchError((error) =>
            of(
              SalesActions.createSaleFailure({
                error: error.error.message || 'Failed to create sale',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  public updateSale$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SalesActions.updateSale),
      mergeMap(({ id, saleData }) =>
        this.salesApi.updateSale(id, saleData).pipe(
          map((sale) => SalesActions.updateSaleSuccess({ sale })),
          catchError((error) =>
            of(
              SalesActions.updateSaleFailure({
                error: error.error.message || 'Failed to update sale',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  public updateSaleStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SalesActions.updateSaleStatus),
      mergeMap(({ id, orderStatus, notifyCustomer }) =>
        this.salesApi.updateSaleStatus(id, { orderStatus, notifyCustomer }).pipe(
          map((sale) => SalesActions.updateSaleStatusSuccess({ sale })),
          catchError((error) =>
            of(
              SalesActions.updateSaleStatusFailure({
                error: error.error.message || 'Failed to update sale status',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  // Success message effects
  public createSaleSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SalesActions.createSaleSuccess),
        tap(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sale created successfully',
          });
          void this.router.navigate([APP_ROUTES.sales.list.fullPath]);
        }),
      ),
    { dispatch: false },
  );

  public updateSaleSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SalesActions.updateSaleSuccess),
        tap(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sale updated successfully',
          });
          void this.router.navigate([APP_ROUTES.sales.list.fullPath]);
        }),
      ),
    { dispatch: false },
  );

  public updateSaleStatusSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SalesActions.updateSaleStatusSuccess),
        tap(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sale status updated successfully',
          });
          void this.router.navigate([APP_ROUTES.sales.list.fullPath]);
        }),
      ),
    { dispatch: false },
  );

  // Error message effects
  public createSaleFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SalesActions.createSaleFailure),
        tap(({ error }) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error || 'Failed to create sale',
          });
        }),
      ),
    { dispatch: false },
  );

  public updateSaleFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SalesActions.updateSaleFailure),
        tap(({ error }) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error || 'Failed to update sale',
          });
        }),
      ),
    { dispatch: false },
  );

  public updateSaleStatusFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(SalesActions.updateSaleStatusFailure),
        tap(({ error }) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error || 'Failed to update sale status',
          });
        }),
      ),
    { dispatch: false },
  );
}
