import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, switchMap, throwError } from 'rxjs';
import { sessionExpired } from '@auth/store/auth.actions';
import { environment } from '@environments/environment';

import { StorageService } from '@services/storage.service';
import { IResponse } from '@models/response.model';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const http = inject(HttpClient);

  const token = StorageService.getToken();

  // Add withCredentials to all requests and Authorization header if token exists
  let clonedRequest = req.clone({
    withCredentials: true,
  });

  if (token) {
    clonedRequest = clonedRequest.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Skip session expiration check for login and refresh endpoints
  if (
    req.url.includes('/authentication/login') ||
    req.url.includes('/authentication/refresh-token')
  ) {
    return next(clonedRequest);
  }

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized - Try to refresh token
      if (error.status === 401) {
        return http
          .post<
            IResponse<string>
          >(`${environment.apiUrl}/authentication/refresh-token`, {}, { withCredentials: true })
          .pipe(
            switchMap(({ data: accessToken }) => {
              if (accessToken) {
                StorageService.saveToken(accessToken);

                // Retry request with new token
                const newRequest = req.clone({
                  withCredentials: true,
                  setHeaders: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                });
                return next(newRequest);
              }

              // If refresh succeeds, retry the original request
              return next(clonedRequest).pipe(
                catchError((newError: HttpErrorResponse) => throwError(() => newError || error)),
              );
            }),
            catchError((refreshError: HttpErrorResponse) => {
              // If refresh fails with 401, session is expired
              if (refreshError.status === 401) {
                store.dispatch(sessionExpired());
              }
              return throwError(() => error); // Return original error
            }),
          );
      }

      return throwError(() => error);
    }),
  );
};
