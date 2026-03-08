/**
 * Production Environment Configuration
 * Used for production deployment
 */
export const environment = {
  production: true,
  environment: 'production',
  apiUrl: 'https://api.maltitiaenterprise.com',
  enableDebug: false,
  enableDevTools: false,
  logLevel: 'error',
} as const;
