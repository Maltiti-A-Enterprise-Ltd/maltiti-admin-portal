/**
 * Product API Service - Feature-local service for Products
 * Handles all HTTP calls to the Products endpoints
 * Based on Swagger API documentation
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  BestProductsResponse,
  CreateProductDto,
  LightProduct,
  Product,
  ProductQueryParams,
  UpdateProductDto,
} from '../models/product.model';
import { IPaginationResponse, IResponse } from '@models/response.model';

@Injectable({
  providedIn: 'root',
})
export class ProductApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/products`;

  /**
   * Get all products with filtering, pagination, and sorting
   * GET /products/all-products
   */
  public getAllProducts(params?: ProductQueryParams): Observable<IPaginationResponse<Product>> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach((key) => {
        const value = params[key as keyof ProductQueryParams];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http.get<IPaginationResponse<Product>>(`${this.baseUrl}/all-products`, {
      params: httpParams,
    });
  }

  /**
   * Get featured/best products
   * GET /products/best-products
   */
  public getBestProducts(): Observable<BestProductsResponse> {
    return this.http.get<BestProductsResponse>(`${this.baseUrl}/best-products`);
  }

  /**
   * Get single product by ID
   * GET /products/product/:id
   */
  public getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/product/${id}`);
  }

  /**
   * Create new product (Admin only)
   * POST /products/add-product
   */
  public createProduct(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/add-product`, dto);
  }

  /**
   * Update existing product (Admin only)
   * PUT /products/edit-product/:id
   */
  public updateProduct(id: string, dto: UpdateProductDto): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/edit-product/${id}`, dto);
  }

  /**
   * Soft delete product (Admin only)
   * DELETE /products/delete-product/:id
   */
  public deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/delete-product/${id}`);
  }

  /**
   * Toggle product status (Admin only)
   * PATCH /products/change-status/:id
   */
  public changeProductStatus(id: string): Observable<Product> {
    return this.http.patch<Product>(`${this.baseUrl}/change-status/${id}`, {});
  }

  /**
   * Toggle product favorite status
   * PATCH /products/favorite/:id
   */
  public toggleFavorite(id: string): Observable<Product> {
    return this.http.patch<Product>(`${this.baseUrl}/favorite/${id}`, {});
  }

  /**
   * Export products to Excel with optional filtering
   * GET /products/export/excel
   */
  public exportProductsToExcel(params?: Partial<ProductQueryParams>): Observable<Blob> {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach((key) => {
        const value = params[key as keyof ProductQueryParams];
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http.get(`${this.baseUrl}/export/excel`, {
      params: httpParams,
      responseType: 'blob',
    });
  }

  /**
   * Get all products (non-paginated)
   * GET /products
   */
  public getAllProductsSimple(): Observable<IResponse<LightProduct[]>> {
    return this.http.get<IResponse<Product[]>>(`${this.baseUrl}/list`);
  }
}
