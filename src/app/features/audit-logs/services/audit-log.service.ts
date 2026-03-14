/**
 * Audit Log Service
 * Handles all API calls related to audit logs
 * Uses Swagger-defined endpoints as single source of truth
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { IAuditLog, IAuditLogFilters, IAuditStatistics } from '@features/audit-logs';
import { IPaginationResponse, IResponse } from '@models/response.model';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/audits`;

  /**
   * Fetch audit logs with optional filters
   * Endpoint: GET /audits
   * Operation ID: AuditController_findAll
   */
  public getAuditLogs(filters?: IAuditLogFilters): Observable<IPaginationResponse<IAuditLog>> {
    const params = this.buildAuditLogParams(filters);
    return this.http.get<IPaginationResponse<IAuditLog>>(this.baseUrl, { params });
  }

  /**
   * Build HttpParams from audit log filters
   */
  private buildAuditLogParams(filters?: IAuditLogFilters): HttpParams {
    let params = new HttpParams();

    if (!filters) {
      return params;
    }

    const mappings: {
      key: keyof IAuditLogFilters;
      param: string;
      transform?: (value: unknown) => string;
    }[] = [
      { key: 'from', param: 'from' },
      { key: 'to', param: 'to' },
      { key: 'actionType', param: 'actionType' },
      { key: 'entityType', param: 'entityType' },
      { key: 'userId', param: 'userId' },
      { key: 'role', param: 'role' },
      { key: 'page', param: 'page', transform: (v) => (v as number).toString() },
      { key: 'limit', param: 'limit', transform: (v) => (v as number).toString() },
      { key: 'sortOrder', param: 'sortOrder' },
    ];

    for (const mapping of mappings) {
      const value = filters[mapping.key];
      if (!!value && (typeof value !== 'string' || value)) {
        const paramValue = mapping.transform ? mapping.transform(value) : (value as string);
        params = params.set(mapping.param, paramValue);
      }
    }

    return params;
  }

  /**
   * Fetch a single audit log by ID
   * Endpoint: GET /audits/{id}
   * Operation ID: AuditController_findOne
   */
  public getAuditLogById(id: string): Observable<IResponse<IAuditLog>> {
    return this.http.get<IResponse<IAuditLog>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Fetch audit log statistics
   * Endpoint: GET /audits/stats/overview
   * Operation ID: AuditController_getStatistics
   */
  public getAuditStatistics(from?: string, to?: string): Observable<IAuditStatistics> {
    let params = new HttpParams();

    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }

    return this.http.get<IAuditStatistics>(`${this.baseUrl}/stats/overview`, { params });
  }
}
