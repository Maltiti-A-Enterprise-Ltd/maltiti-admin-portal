/**
 * Type-safe route configuration
 * This defines all application routes in a centralized location
 * with full TypeScript support for route parameters and navigation
 */

/**
 * Interface for a route configuration entry
 */
export interface IRouteConfig {
  path: string;
  fullPath: string;
}

/**
 * Interface for nested route configuration (e.g., auth.login)
 */
export interface INestedRouteConfig {
  [key: string]: IRouteConfig;
}

/**
 * Interface for the main APP_ROUTES configuration
 */
export interface IAppRoutes {
  auth: {
    login: IRouteConfig;
  };
  dashboard: IRouteConfig;
  products: IRouteConfig;
  batches: IRouteConfig;
  orders: IRouteConfig;
  cooperatives: IRouteConfig;
  reports: IRouteConfig;
  settings: IRouteConfig;
  users: IRouteConfig;
  customers: IRouteConfig;
  sales: IRouteConfig & {
    list: IRouteConfig;
    create: IRouteConfig;
    edit: (id: string) => string;
  };
  auditLogs: IRouteConfig & {
    details: (id: string) => string;
  };
  root: IRouteConfig;
}

export const APP_ROUTES: IAppRoutes = {
  auth: {
    login: {
      path: 'login',
      fullPath: '/login',
    },
  },
  dashboard: {
    path: 'dashboard',
    fullPath: '/dashboard',
  },
  products: {
    path: 'products',
    fullPath: '/products',
  },
  batches: {
    path: 'batches',
    fullPath: '/batches',
  },
  orders: {
    path: 'orders',
    fullPath: '/orders',
  },
  cooperatives: {
    path: 'cooperatives',
    fullPath: '/cooperatives',
  },
  reports: {
    path: 'reports',
    fullPath: '/reports',
  },
  settings: {
    path: 'settings',
    fullPath: '/settings',
  },
  users: {
    path: 'users',
    fullPath: '/users',
  },
  customers: {
    path: 'customers',
    fullPath: '/customers',
  },
  sales: {
    path: 'sales',
    fullPath: '/sales',
    list: {
      path: '',
      fullPath: '/sales',
    },
    create: {
      path: 'create',
      fullPath: '/sales/create',
    },
    edit: (id: string) => `/sales/${id}`,
  },
  auditLogs: {
    path: 'audit-logs',
    fullPath: '/audit-logs',
    details: (id: string) => `/audit-logs/${id}`,
  },
  root: {
    path: '',
    fullPath: '/',
  },
};

/**
 * Helper function to get route path with type safety
 */
export function getRoutePath(route: keyof typeof APP_ROUTES, subRoute?: string): string {
  const routeConfig = APP_ROUTES[route];

  if (subRoute && routeConfig && typeof routeConfig === 'object' && subRoute in routeConfig) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (routeConfig as any)[subRoute].fullPath;
  }

  if (routeConfig && 'fullPath' in routeConfig) {
    return routeConfig.fullPath;
  }

  return '/';
}

/**
 * Route helper for common navigation patterns
 */
export class RouteHelper {
  public static readonly Login = APP_ROUTES.auth.login.fullPath;
  public static readonly Dashboard = APP_ROUTES.dashboard.fullPath;
  public static readonly Root = APP_ROUTES.root.fullPath;
}
