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
  GenerateInvoiceDto,
  GenerateReceiptDto,
  GenerateWaybillDto,
  OrderStatus,
  PaymentStatus,
  Sale,
  SaleLineItemDto,
  SendInvoiceEmailDto,
  UpdateDeliveryCostDto,
  UpdateSaleDto,
  UpdateSaleStatusDto,
} from '../models/sale.model';
import { IPaginationResponse } from '@models/response.model';

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
