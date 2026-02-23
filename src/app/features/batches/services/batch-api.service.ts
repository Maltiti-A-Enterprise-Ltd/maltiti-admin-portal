/**
 * Batch API Service - Feature-local service for Batches
 * Handles all HTTP calls to the Batches endpoints
 * Based on Swagger API documentation
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Batch, BatchQueryParams, CreateBatchDto } from '../models/batch.model';
import { IPaginationResponse, IResponse } from '@models/response.model';

@Injectable({
  providedIn: 'root',
})
export class BatchApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/products/batches`;

  /**
   * Get all batches with pagination and filters
   * GET /products/batches
   */
  public getAllBatches(params?: BatchQueryParams): Observable<IPaginationResponse<Batch>> {
    const queryParams = this.buildQueryParams(params);
    return this.http.get<IPaginationResponse<Batch>>(this.baseUrl, { params: queryParams });
  }

  /**
   * Get batches for a specific product
   * GET /products/batches/product/:productId
   */
  public getBatchesByProduct(productId: string): Observable<IResponse<Batch[]>> {
    return this.http.get<IResponse<Batch[]>>(`${this.baseUrl}/product/${productId}`);
  }

  /**
   * Get batches for multiple products
   * GET /products/batches/products?productIds=...
   */
  public getBatchesByProductIds(productIds: string[]): Observable<IResponse<Batch[]>> {
    const params = { productIds };
    return this.http.get<IResponse<Batch[]>>(`${this.baseUrl}/products`, { params });
  }

  /**
   * Get single batch by ID with associated products
   * GET /products/batches/:id
   */
  public getBatch(id: string): Observable<Batch> {
    return this.http.get<Batch>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new batch (Admin only)
   * POST /products/batches
   */
  public createBatch(dto: CreateBatchDto): Observable<Batch> {
    return this.http.post<Batch>(this.baseUrl, dto);
  }

  private buildQueryParams(params?: BatchQueryParams): {
    [key: string]: string | number | boolean;
  } {
    const queryParams: { [key: string]: string | number | boolean } = {};

    if (params) {
      if (params.page !== undefined) {
        queryParams['page'] = params.page;
      }
      if (params.limit !== undefined) {
        queryParams['limit'] = params.limit;
      }
      if (params.productId) {
        queryParams['productId'] = params.productId;
      }
      if (params.batchNumber) {
        queryParams['batchNumber'] = params.batchNumber;
      }
      if (params.qualityCheckStatus) {
        queryParams['qualityCheckStatus'] = params.qualityCheckStatus;
      }
      if (params.isActive !== undefined) {
        queryParams['isActive'] = params.isActive;
      }
      if (params.sortBy) {
        queryParams['sortBy'] = params.sortBy;
      }
      if (params.sortOrder) {
        queryParams['sortOrder'] = params.sortOrder;
      }
    }

    return queryParams;
  }
}
