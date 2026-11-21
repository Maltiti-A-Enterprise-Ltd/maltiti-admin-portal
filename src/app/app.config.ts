import {
  ApplicationConfig,
  isDevMode,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

import { registerLocaleData } from '@angular/common';
import localeEnGb from '@angular/common/locales/en-GB';
import { routes } from './app.routes';

/* Dates as they are read in Ghana: 20/11/2026, 20 Nov 2026. The default was
   American, so the 11th of December printed as 12/11 and read as November. */
registerLocaleData(localeEnGb);
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

/**
 * Maltiti green as a real scale, with the brand colour (#0F6938) at 500.
 *
 * Every step used to be the same green, so anything PrimeNG paints with a
 * light step — a selected row, the current page in a paginator, a hovered
 * option — came out as a solid block of dark green with dark text on it.
 */
const MaltitiPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef7f2',
      100: '#d5ecdf',
      200: '#abd8bf',
      300: '#78be97',
      400: '#3f9967',
      500: '#0f6938',
      600: '#0d5b31',
      700: '#0b4c29',
      800: '#093d21',
      900: '#072f1a',
      950: '#041c10',
    },
  },
  colorScheme: {
    light: {
      primary: {
        color: '{primary.500}',
        contrastColor: '#ffffff',
        hoverColor: '{primary.600}',
        activeColor: '{primary.700}',
      },
      highlight: {
        background: '{primary.50}',
        focusBackground: '{primary.100}',
        color: '{primary.700}',
        focusColor: '{primary.800}',
      },
      surface: {
        0: '#ffffff',
        50: '#f6f7f6',
        100: '#eef0ee',
        200: '#e2e6e3',
        300: '#cdd3cf',
        400: '#9aa39d',
        500: '#6b746e',
        600: '#4d5550',
        700: '#3a413d',
        800: '#262c28',
        900: '#181d1a',
        950: '#0d110f',
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'en-GB' },
    // Only in production builds: a service worker in development serves stale
    // bundles and makes every change look like it did not apply. The 30s delay
    // keeps registration off the critical path of the first paint.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
      theme: {
        preset: MaltitiPreset,
        options: {
          prefix: 'p',
          /* A class nothing sets, so the app stays light. Following the OS
             turned PrimeNG's own parts dark while every hand-written panel
             stayed light, which left white cards on near-black inputs. */
          darkModeSelector: '.app-dark',
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
