import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IResponse } from '@models/response.model';
import { ExchangeRateQuote, InvoiceCurrency } from '../models/sale.model';

@Injectable({ providedIn: 'root' })
export class ExchangeRateApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/exchange-rates`;

  /**
   * Today's rate, in cedis per one unit of `currency`.
   *
   * Advisory: the caller is expected to put it in front of the admin to
   * accept or overwrite, and to cope with a 503 by letting them type one.
   */
  public getRate(currency: InvoiceCurrency): Observable<ExchangeRateQuote> {
    return this.http
      .get<IResponse<ExchangeRateQuote>>(`${this.baseUrl}/${currency}`)
      .pipe(map((response) => response.data));
  }
}
