import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IResponse } from '@models/response.model';
import { PaymentAccount, SavePaymentAccountDto } from '../models/payment-account.model';

@Injectable({ providedIn: 'root' })
export class PaymentAccountApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/payment-accounts`;

  /** @param activeOnly leave out retired accounts, e.g. when building an invoice */
  public getAll(activeOnly = false): Observable<PaymentAccount[]> {
    const params = activeOnly ? new HttpParams().set('activeOnly', 'true') : undefined;

    return this.http
      .get<IResponse<PaymentAccount[]>>(this.baseUrl, { params })
      .pipe(map((response) => response.data));
  }

  public create(dto: SavePaymentAccountDto): Observable<PaymentAccount> {
    return this.http
      .post<IResponse<PaymentAccount>>(this.baseUrl, dto)
      .pipe(map((response) => response.data));
  }

  public update(id: string, dto: Partial<SavePaymentAccountDto>): Observable<PaymentAccount> {
    return this.http
      .patch<IResponse<PaymentAccount>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map((response) => response.data));
  }

  public remove(id: string): Observable<void> {
    return this.http
      .delete<IResponse<null>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }
}
