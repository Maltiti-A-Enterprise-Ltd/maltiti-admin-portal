/**
 * Testing Environment Configuration
 * Used for testing/staging environment
 */
export const environment = {
  production: false,
  environment: 'testing',
  apiUrl: 'https://api-testing.maltitiaenterprise.com',
  microsoftAuthUrl: 'https://api-testing.maltitiaenterprise.com/authentication/microsoft',
  enableDebug: true,
  enableDevTools: true,
  logLevel: 'info',
} as const;
