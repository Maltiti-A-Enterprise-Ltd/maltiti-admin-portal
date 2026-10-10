import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, switchMap, throwError } from 'rxjs';
import { sessionExpired } from '@auth/store/auth.actions';

import { StorageService } from '@services/storage.service';
import { TokenRefreshService } from '@services/token-refresh.service';

/** Endpoints that must never trigger a refresh, or it would recurse. */
const UNAUTHENTICATED_PATHS = [
  '/authentication/login',
  '/authentication/refresh-token',
];

const withToken = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  req.clone({
    withCredentials: true,
    setHeaders: { Authorization: `Bearer ${token}` },
  });

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const tokenRefresh = inject(TokenRefreshService);

  const token = StorageService.getToken();

  let clonedRequest = req.clone({ withCredentials: true });

  if (token) {
    clonedRequest = withToken(req, token);
  }

  if (UNAUTHENTICATED_PATHS.some((path) => req.url.includes(path))) {
    return next(clonedRequest);
  }

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // One refresh serves every request that failed together, so the server
      // only rotates once. Firing one per request meant the second and third
      // presented a token the first had already rotated away, and the 401
      // that came back was read as "the session is over".
      return tokenRefresh.refresh().pipe(
        switchMap((accessToken) =>
          next(accessToken ? withToken(req, accessToken) : clonedRequest),
        ),
        catchError((refreshError: HttpErrorResponse) => {
          // Only a refusal to refresh ends the session. A network blip or a
          // 500 on the way is not the user's session expiring.
          if (refreshError.status === 401) {
            store.dispatch(sessionExpired());
          }

          return throwError(() => error);
        }),
      );
    }),
  );
};
