import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { IResponse } from '@models/response.model';
import { Statement, StatementQuery } from '../models/statement.model';

@Injectable({ providedIn: 'root' })
export class StatementApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/statements`;

  public get(query: StatementQuery): Observable<Statement> {
    return this.http
      .get<IResponse<Statement>>(this.base, { params: this.params(query) })
      .pipe(map((response) => response.data));
  }

  /**
   * The same ledger as a file.
   *
   * `responseType: 'blob'` rather than JSON: these come back as a PDF or a
   * workbook, and parsing either as JSON throws before the download starts.
   */
  public download(
    query: StatementQuery,
    format: 'pdf' | 'excel',
  ): Observable<Blob> {
    return this.http.get(`${this.base}/${format}`, {
      params: this.params(query),
      responseType: 'blob',
    });
  }

  /** Only what was actually chosen — an empty filter means no filter. */
  private params(query: StatementQuery): HttpParams {
    let params = new HttpParams();

    if (query.customerId) {
      params = params.set('customerId', query.customerId);
    }

    if (query.from) {
      params = params.set('from', query.from);
    }

    if (query.to) {
      params = params.set('to', query.to);
    }

    return params;
  }
}
