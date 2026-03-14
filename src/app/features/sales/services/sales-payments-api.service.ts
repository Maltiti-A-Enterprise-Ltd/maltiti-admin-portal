/**
 * Sales Payments API Service
 * Handles all HTTP calls related to payment records on a sale.
 * All amounts are in GHS.
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { IResponse } from '@models/response.model';
import {
  RecordPaymentRequest,
  SalePaymentRecord,
  SalePaymentSummary,
  UpdatePaymentStatusRequest,
} from '../models/sale.model';

@Injectable({
  providedIn: 'root',
})
export class SalesPaymentsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sales`;

  /**
   * Record a new payment instalment for a sale.
   * POST /sales/:saleId/payments
   * Requires admin authorisation (token sent via interceptor).
   */
  public recordPayment(saleId: string, body: RecordPaymentRequest): Observable<SalePaymentRecord> {
    return this.http
      .post<IResponse<SalePaymentRecord>>(`${this.baseUrl}/${saleId}/payments`, body)
      .pipe(map((r) => r.data));
  }

  /**
   * Retrieve the payment summary (all records + totals) for a sale.
   * GET /sales/:saleId/payments
   * No auth required.
   */
  public getPaymentSummary(saleId: string): Observable<SalePaymentSummary> {
    return this.http
      .get<IResponse<SalePaymentSummary>>(`${this.baseUrl}/${saleId}/payments`)
      .pipe(map((r) => r.data));
  }

  /**
   * Retrieve a single payment record.
   * GET /sales/:saleId/payments/:paymentId
   * No auth required.
   */
  public getPaymentRecord(saleId: string, paymentId: string): Observable<SalePaymentRecord> {
    return this.http
      .get<IResponse<SalePaymentRecord>>(`${this.baseUrl}/${saleId}/payments/${paymentId}`)
      .pipe(map((r) => r.data));
  }

  /**
   * Update the status of an existing payment record.
   * PATCH /sales/:saleId/payments/:paymentId/status
   * Requires admin authorisation (token sent via interceptor).
   */
  public updatePaymentStatus(
    saleId: string,
    paymentId: string,
    body: UpdatePaymentStatusRequest,
  ): Observable<SalePaymentRecord> {
    return this.http
      .patch<
        IResponse<SalePaymentRecord>
      >(`${this.baseUrl}/${saleId}/payments/${paymentId}/status`, body)
      .pipe(map((r) => r.data));
  }
}
