/**
 * Environment Configuration Type
 * Ensures type safety across all environment files
 */
export interface Environment {
  production: boolean;
  environment: 'local' | 'testing' | 'production';
  apiUrl: string;
  microsoftAuthUrl: string;
  enableDebug: boolean;
  enableDevTools: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

