import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

import { routes } from './app.routes';
import { authReducer } from '@auth/store/auth.reducer';
import { AuthEffects } from '@auth/store/auth.effects';
import { AuthStorageEffects } from '@auth/store/auth-storage.effects';
import { authInterceptor } from '@interceptors/auth.interceptor';
import { productsReducer } from '@features/products/store/products.reducer';
import { ProductsEffects } from '@features/products/store/products.effects';
import { batchesReducer } from '@features/batches/store/batches.reducer';
import { BatchesEffects } from '@features/batches/store/batches.effects';
import { usersReducer } from '@features/users/store/users.reducer';
import { UsersEffects } from '@features/users/store/users.effects';
import { salesReducer } from '@features/sales/store/sales.reducer';
import { SalesEffects } from '@features/sales/store/sales.effects';
import { customersReducer } from '@features/sales/store/customers.reducer';
import { CustomersEffects } from '@features/sales/store/customers.effects';
import { MessageService } from 'primeng/api';

const MaltitiPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#0F6938',
      100: '#0F6938',
      200: '#0F6938',
      300: '#0F6938',
      400: '#0F6938',
      500: '#0F6938',
      600: '#0F6938',
      700: '#0F6938',
      800: '#0F6938',
      900: '#0F6938',
    },
  },
  colorScheme: {
    light: {
      primary: {
        color: '{primary.500}',
        contrastColor: '{surface.0}',
        hoverColor: '{primary.600}',
        activeColor: '{surface.0}',
      },
      highlight: {
        background: '{primary.500}',
        focusBackground: '{primary.600}',
        color: '{surface.0}',
        focusColor: '{surface.0}',
      },
      surface: {
        0: '#ffffff',
        50: '#f5f5f4',
        100: '#f5f5f4',
        200: '#e7e5e4',
        300: '#d6d3d1',
        400: '#a8a29e',
        500: '#78716c',
        600: '#57534e',
        700: '#44403c',
        800: '#292524',
        900: '#1c1917',
      },
    },
    dark: {
      primary: {
        color: '{primary.400}',
        contrastColor: '{surface.900}',
        hoverColor: '{primary.300}',
        activeColor: '{primary.200}',
      },
      highlight: {
        background: 'rgba(15, 105, 56, .16)',
        focusBackground: 'rgba(15, 105, 56, .24)',
        color: '{primary.200}',
        focusColor: '{primary.200}',
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
      theme: {
        preset: MaltitiPreset,
        options: {
          prefix: 'p',
          darkModeSelector: 'system',
          cssLayer: false,
        },
      },
    }),
    provideStore({
      auth: authReducer,
      products: productsReducer,
      batches: batchesReducer,
      users: usersReducer,
      sales: salesReducer,
      customers: customersReducer,
    }),
    provideEffects([
      AuthEffects,
      AuthStorageEffects,
      ProductsEffects,
      BatchesEffects,
      UsersEffects,
      SalesEffects,
      CustomersEffects,
    ]),
    provideStoreDevtools({ maxAge: 25 }),
    MessageService,
  ],
};
