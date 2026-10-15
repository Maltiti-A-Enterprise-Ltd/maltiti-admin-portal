/**
 * Sales API Service - Feature-local service for Sales
 * Handles all HTTP calls to the Sales endpoints
 * Based on Swagger API documentation
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  AssignBatchesDto,
  CancelSaleByAdminDto,
  CreateSaleDto,
  FlagSaleRequest,
  GenerateInvoiceDto,
  GenerateReceiptDto,
  GenerateWaybillDto,
  OrderStatus,
  PaymentStatus,
  Sale,
  SaleAttentionSummary,
  SaleLineItemDto,
  SendInvoiceEmailDto,
  UpdateDeliveryCostDto,
  UpdateSaleDto,
  UpdateSaleStatusDto,
} from '../models/sale.model';
import { IPaginationResponse } from '@models/response.model';
import { SaleAttention } from '../models/sale-attention.model';
import { SalesMetrics } from '../models/sales-metrics.model';

@Injectable({
  providedIn: 'root',
})
export class SalesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sales`;

  /**
   * Create a new sale
   * POST /sales
   */
  public createSale(dto: CreateSaleDto): Observable<Sale> {
    return this.http.post<Sale>(this.baseUrl, dto);
  }

  /**
   * List sales with filters
   * GET /sales
   */
  public getSales(
    orderStatus?: OrderStatus,
    paymentStatus?: PaymentStatus,
    customerId?: string,
    customerName?: string,
    page = 1,
    limit = 10,
    /* Grouped rather than two more positional booleans: the signature is
       already long enough that a bare `true, false` at the end would be
       unreadable at the call site. */
    attention?: {
      needsAttention?: boolean;
      flagged?: boolean;
      /** One bucket, e.g. paid-but-not-delivered. */
      bucket?: SaleAttention;
    },
  ): Observable<IPaginationResponse<Sale>> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (orderStatus) {
      params = params.set('orderStatus', orderStatus);
    }
    if (paymentStatus) {
      params = params.set('paymentStatus', paymentStatus);
    }
    if (customerId) {
      params = params.set('customerId', customerId);
    }
    if (customerName) {
      params = params.set('customerName', customerName);
    }
    if (attention?.needsAttention) {
      params = params.set('needsAttention', 'true');
    }
    if (attention?.flagged) {
      params = params.set('flagged', 'true');
    }
    /* Was never forwarded, so the "Paid, not delivered" chip toggled its own
       appearance and changed nothing about the list. */
    if (attention?.bucket) {
      params = params.set('attention', attention.bucket);
    }

    return this.http.get<IPaginationResponse<Sale>>(this.baseUrl, { params });
  }

  /**
   * Get sale details
   * GET /sales/{id}
   */
  public getSale(id: string): Observable<Sale> {
    return this.http.get<Sale>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update sale
   * PATCH /sales/{id}
   */
  public updateSale(id: string, dto: UpdateSaleDto): Observable<Sale> {
    return this.http.patch<Sale>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Update sale status
   * PUT /sales/{id}/status
   */
  /**
   * Set or clear an admin's flag on a sale.
   *
   * `flagged` is sent explicitly rather than toggled, so two people working
   * the same queue cannot flip each other's decision.
   */
  public setSaleFlag(id: string, body: FlagSaleRequest): Observable<Sale> {
    return this.http.patch<Sale>(`${this.baseUrl}/${id}/flag`, body);
  }

  /** Counts for the chips above the sales list. */
  public getAttentionSummary(): Observable<SaleAttentionSummary> {
    return this.http.get<SaleAttentionSummary>(`${this.baseUrl}/attention-summary`);
  }

  /**
   * What the book is worth and who owes what, for the overview panel.
   *
   * Covers the whole book, not the list's current filters — it answers what
   * the business is owed, not what this page adds up to.
   */
  public getMetrics(): Observable<SalesMetrics> {
    return this.http.get<SalesMetrics>(`${this.baseUrl}/metrics`);
  }

  public updateSaleStatus(id: string, dto: UpdateSaleStatusDto): Observable<Sale> {
    return this.http.put<Sale>(`${this.baseUrl}/${id}/status`, dto);
  }

  /**
   * Add line item to sale
   * POST /sales/{id}/line-items
   */
  public addLineItem(id: string, dto: SaleLineItemDto): Observable<Sale> {
    return this.http.post<Sale>(`${this.baseUrl}/${id}/line-items`, dto);
  }

  /**
   * Assign batches to line item
   * PUT /sales/{id}/batches
   */
  public assignBatches(id: string, dto: AssignBatchesDto): Observable<Sale> {
    return this.http.put<Sale>(`${this.baseUrl}/${id}/batches`, dto);
  }

  /**
   * Cancel sale
   * DELETE /sales/{id}
   */
  public cancelSale(id: string): Observable<Sale> {
    return this.http.delete<Sale>(`${this.baseUrl}/${id}`);
  }

  /**
   * Generate invoice PDF for a sale
   * POST /sales/{id}/invoice
   */
  public generateInvoice(id: string, dto: GenerateInvoiceDto): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/${id}/invoice`, dto, {
      responseType: 'blob',
    });
  }

  /**
   * Email a sale's invoice, with the PDF attached.
   * POST /sales/{id}/invoice/email
   *
   * Omit `email` to send to the address on the customer record.
   */
  public sendInvoiceEmail(
    id: string,
    dto: SendInvoiceEmailDto,
  ): Observable<{ message: string; data: { sentTo: string } }> {
    return this.http.post<{ message: string; data: { sentTo: string } }>(
      `${this.baseUrl}/${id}/invoice/email`,
      dto,
    );
  }

  /**
   * Generate receipt PDF for a sale
   * POST /sales/{id}/receipt
   */
  public generateReceipt(id: string, dto: GenerateReceiptDto): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/${id}/receipt`, dto, {
      responseType: 'blob',
    });
  }

  /**
   * Generate waybill PDF for a sale
   * POST /sales/{id}/waybill
   */
  public generateWaybill(id: string, dto: GenerateWaybillDto): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/${id}/waybill`, dto, {
      responseType: 'blob',
    });
  }

  /**
   * Update delivery cost for a sale
   * PUT /sales/{id}/delivery-cost
   */
  public updateDeliveryCost(id: string, dto: UpdateDeliveryCostDto): Observable<Sale> {
    return this.http.patch<Sale>(`${this.baseUrl}/${id}/delivery-cost`, dto);
  }

  /**
   * Cancel sale by admin
   * POST /sales/{id}/cancel-by-admin
   */
  public cancelSaleByAdmin(id: string, dto: CancelSaleByAdminDto): Observable<Sale> {
    return this.http.post<Sale>(`${this.baseUrl}/${id}/cancel-by-admin`, dto);
  }
}
