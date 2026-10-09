/**
 * Production Environment Configuration
 * Used for production deployment
 */
export const environment = {
  production: true,
  environment: 'production',
  apiUrl: 'https://api.maltitiaenterprise.com',
  microsoftAuthUrl: 'https://api.maltitiaenterprise.com/authentication/microsoft',
  enableDebug: false,
  enableDevTools: false,
  logLevel: 'error',
} as const;
