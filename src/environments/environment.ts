/**
 * Local Environment Configuration
 * Used for testing/staging environment
 */
export const environment = {
  production: false,
  environment: 'local',
  apiUrl: 'http://localhost:3002',
  microsoftAuthUrl: 'http://localhost:3002/authentication/microsoft',
  enableDebug: true,
  enableDevTools: true,
  logLevel: 'info',
} as const;
