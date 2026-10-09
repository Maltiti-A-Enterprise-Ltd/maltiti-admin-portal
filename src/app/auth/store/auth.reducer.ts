import { createReducer, on } from '@ngrx/store';
import { User } from '../../models/user.model';
import * as AuthActions from './auth.actions';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

export const authReducer = createReducer(
  initialState,
  on(AuthActions.authLogin, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(AuthActions.authLoginSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null,
  })),
  on(AuthActions.authLoginFailure, (state, { error }) => ({
    ...state,
    user: null,
    loading: false,
    error,
  })),
  on(AuthActions.authLogout, (state) => ({
    ...state,
    loading: true,
  })),
  on(AuthActions.authLogoutSuccess, () => initialState),
  on(AuthActions.sessionExpired, () => ({
    ...initialState,
    error: 'Your session has expired. Please login again.',
  })),
  on(AuthActions.restoreUserFromStorage, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null,
  })),
  on(AuthActions.noUserInStorage, (state) => ({
    ...state,
    loading: false,
  })),
  on(AuthActions.microsoftAuthCallback, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(AuthActions.microsoftAuthFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
  on(AuthActions.changePassword, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(AuthActions.changePasswordSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null,
  })),
  on(AuthActions.changePasswordFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
);
