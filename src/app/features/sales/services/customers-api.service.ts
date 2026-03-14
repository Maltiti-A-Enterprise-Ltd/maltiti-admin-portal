/**
 * Customers API Service
 * Handles all HTTP calls to the Customers endpoints
 * Based on Swagger API documentation
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  CreateCustomerDto,
  Customer,
  CustomerQueryDto,
  UpdateCustomerDto,
} from '@models/customer.model';
import { IPaginationResponse, IResponse } from '@models/response.model';

@Injectable({
  providedIn: 'root',
})
export class CustomersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/customers`;

  /**
   * Get all customers with pagination and optional filters
   * GET /customers
   */
  public getCustomers(query: CustomerQueryDto = {}): Observable<IPaginationResponse<Customer>> {
    let params = new HttpParams();

    if (query.page !== null && query.page !== undefined) {
      params = params.set('page', query.page.toString());
    }
    if (query.limit !== null && query.limit !== undefined) {
      params = params.set('limit', query.limit.toString());
    }
    if (query.search) {
      params = params.set('search', query.search);
    }
    if (query.email) {
      params = params.set('email', query.email);
    }
    if (query.phone) {
      params = params.set('phone', query.phone);
    }
    if (query.country) {
      params = params.set('country', query.country);
    }
    if (query.region) {
      params = params.set('region', query.region);
    }
    if (query.city) {
      params = params.set('city', query.city);
    }
    if (query.startDate) {
      params = params.set('startDate', query.startDate);
    }
    if (query.endDate) {
      params = params.set('endDate', query.endDate);
    }
    if (query.sortBy) {
      params = params.set('sortBy', query.sortBy);
    }
    if (query.sortOrder) {
      params = params.set('sortOrder', query.sortOrder);
    }

    return this.http.get<IPaginationResponse<Customer>>(this.baseUrl, { params });
  }

  /**
   * Get customer by ID
   * GET /customers/{id}
   */
  public getCustomer(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create a new customer
   * POST /customers
   */
  public createCustomer(dto: CreateCustomerDto): Observable<IResponse<Customer>> {
    return this.http.post<IResponse<Customer>>(this.baseUrl, dto);
  }

  /**
   * Update an existing customer
   * PATCH /customers/{id}
   */
  public updateCustomer(dto: UpdateCustomerDto): Observable<Customer> {
    return this.http.patch<Customer>(`${this.baseUrl}`, dto);
  }

  /**
   * Delete a customer (soft delete)
   * DELETE /customers/{id}
   */
  public deleteCustomer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
