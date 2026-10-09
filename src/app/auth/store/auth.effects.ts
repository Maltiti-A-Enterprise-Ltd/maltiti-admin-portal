import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, exhaustMap, map, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import * as AuthActions from './auth.actions';
import { APP_ROUTES } from '@config/routes.config';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public readonly login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.authLogin),
      exhaustMap(({ credentials }) =>
        this.authService.login(credentials).pipe(
          map(({ user, accessToken }) => AuthActions.authLoginSuccess({ user, accessToken })),
          catchError((error) => {
            const errorMessage = error?.error?.message || 'Login failed. Please try again.';
            return of(AuthActions.authLoginFailure({ error: errorMessage }));
          }),
        ),
      ),
    ),
  );

  public readonly loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.authLoginSuccess),
        tap(() => {
          void this.router.navigate([APP_ROUTES.dashboard.path]);
        }),
      ),
    { dispatch: false },
  );

  public readonly logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.authLogout),
      exhaustMap(() =>
        this.authService.logout().pipe(
          map(() => AuthActions.authLogoutSuccess()),
          catchError(() => of(AuthActions.authLogoutSuccess())),
        ),
      ),
    ),
  );

  public readonly logoutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.authLogoutSuccess, AuthActions.sessionExpired),
        tap(() => {
          void this.router.navigate([APP_ROUTES.auth.login.fullPath]);
        }),
      ),
    { dispatch: false },
  );

  public readonly microsoftAuth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.microsoftAuthCallback),
      switchMap(({ accessToken }) =>
        this.authService.fetchUserProfile().pipe(
          map((user) => AuthActions.authLoginSuccess({ user, accessToken })),
          catchError((error) => {
            const errorMessage = error?.error?.message || 'Microsoft sign-in failed. Please try again.';
            return of(AuthActions.microsoftAuthFailure({ error: errorMessage }));
          }),
        ),
      ),
    ),
  );

  public readonly microsoftAuthFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.microsoftAuthFailure),
        tap(({ error }) => {
          void this.router.navigate([APP_ROUTES.auth.oauthError.fullPath], {
            queryParams: { message: encodeURIComponent(error) },
          });
        }),
      ),
    { dispatch: false },
  );

  public readonly changePassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.changePassword),
      exhaustMap(({ id, currentPassword, newPassword, confirmPassword }) =>
        this.authService.changePassword(id, currentPassword, newPassword, confirmPassword).pipe(
          map(({ user }) => AuthActions.changePasswordSuccess({ user })),
          catchError((error) =>
            of(
              AuthActions.changePasswordFailure({
                error: error?.error?.message || 'Change password failed. Please try again.',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
