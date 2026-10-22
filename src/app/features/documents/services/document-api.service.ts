import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { IResponse } from '@models/response.model';
import {
  CompanyDocument,
  CreateDocumentDto,
  DocumentVersionBody,
  ListDocumentsQuery,
  UpdateDocumentDto,
} from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class DocumentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/documents`;

  /**
   * The register, already ordered by the API with the expired ones first.
   *
   * The ordering is deliberately not redone here — "expired" is one
   * definition, and it lives on the server with the daily report that uses it.
   */
  public getAll(query: ListDocumentsQuery = {}): Observable<CompanyDocument[]> {
    let params = new HttpParams();

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }
    if (query.category) {
      params = params.set('category', query.category);
    }
    if (query.expiringOnly) {
      params = params.set('expiringOnly', 'true');
    }
    if (query.activeOnly) {
      params = params.set('activeOnly', 'true');
    }

    return this.http
      .get<IResponse<CompanyDocument[]>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  /** One document, with its full version history. */
  public getOne(id: string): Observable<CompanyDocument> {
    return this.http
      .get<IResponse<CompanyDocument>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  public create(dto: CreateDocumentDto): Observable<CompanyDocument> {
    return this.http
      .post<IResponse<CompanyDocument>>(this.baseUrl, dto)
      .pipe(map((response) => response.data));
  }

  /** Corrects the record. Cannot change the link — see {@link addVersion}. */
  public update(id: string, dto: UpdateDocumentDto): Observable<CompanyDocument> {
    return this.http
      .patch<IResponse<CompanyDocument>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map((response) => response.data));
  }

  /** Replaces the file, keeping the copy it replaces. */
  public addVersion(id: string, dto: DocumentVersionBody): Observable<CompanyDocument> {
    return this.http
      .post<IResponse<CompanyDocument>>(`${this.baseUrl}/${id}/versions`, dto)
      .pipe(map((response) => response.data));
  }

  /** Removes the record. The file in Microsoft 365 is untouched. */
  public remove(id: string): Observable<void> {
    return this.http
      .delete<IResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }
}
