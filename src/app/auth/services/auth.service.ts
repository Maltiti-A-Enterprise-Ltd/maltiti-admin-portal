import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '@models/user.model';
import { IResponse } from '@models/response.model';
import { LoginRequest } from '@models/login-request.model';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  public login(credentials: LoginRequest): Observable<{ user: User; accessToken: string }> {
    return this.http
      .post<
        IResponse<{ user: User; accessToken: string }>
      >(`${this.apiUrl}/authentication/login`, credentials)
      .pipe(map((response) => response.data));
  }

  public fetchUserProfile(): Observable<User> {
    return this.http
      .get<IResponse<User>>(`${this.apiUrl}/me/profile`)
      .pipe(map((response) => response.data));
  }

  public logout(): Observable<void> {
    return this.http
      .post<IResponse<void>>(`${this.apiUrl}/auth/logout`, {})
      .pipe(map(() => undefined));
  }

  public changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Observable<{ user: User }> {
    return this.http
      .post<
        IResponse<User>
      >(`${this.apiUrl}/authentication/change-password/${id}`, { currentPassword, newPassword, confirmPassword })
      .pipe(map(({ data }) => ({ user: data })));
  }
}
