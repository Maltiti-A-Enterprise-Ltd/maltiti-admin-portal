/**
 * Dashboard Models and DTOs
 * Based on Swagger API documentation for Dashboard endpoints
 */

/**
 * Dashboard Summary Query Parameters
 */
export interface DashboardSummaryParams {
  fromDate?: string;
  toDate?: string;
  includeComparison?: boolean;
  [key: string]: string | boolean | undefined;
}

/**
 * Dashboard Trends Query Parameters
 */
export interface DashboardTrendsParams {
  period?: '7' | '30' | '90';
  [key: string]: string | undefined;
}

/**
 * Dashboard Highlights Query Parameters
 */
export interface DashboardHighlightsParams {
  limit?: number;
  [key: string]: number | undefined;
}

/**
 * Dashboard Alerts Query Parameters
 */
export interface DashboardAlertsParams {
  lowStockThreshold?: number;
  expiryWarningDays?: number;
  [key: string]: number | undefined;
}

/**
 * Dashboard Activity Query Parameters
 */
export interface DashboardActivityParams {
  limit?: number;
  [key: string]: number | undefined;
}

/**
 * Dashboard KPIs - Key Performance Indicators
 */
export interface DashboardKPIs {
  revenue: {
    total: number;
    period: number;
    previousPeriod?: number;
    growthPercentage?: number;
  };
  sales: {
    total: number;
    period: number;
    previousPeriod?: number;
    growthPercentage?: number;
  };
  products: {
    total: number;
    active: number;
    inactive: number;
  };
  batches: {
    total: number;
    active: number;
  };
  inventory: {
    totalValue: number;
    totalQuantity: number;
    lowStockItems: number;
  };
  production: {
    totalProduced: number;
    totalSold: number;
    utilizationRate: number;
  };
}

/**
 * Dashboard Summary Response - Main KPI metrics
 */
export interface DashboardSummary {
  kpis: DashboardKPIs;
  period: {
    from: string;
    to: string;
  };
  comparisonPeriod?: {
    from: string;
    to: string;
  };
  lastUpdated: string;
}

/**
 * Trend Data Point
 */
export interface TrendDataPoint {
  date: string;
  value: number;
}

/**
 * Trend Direction
 */
export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * Dashboard Trends Response
 */
export interface DashboardTrends {
  period: string;
  sales: {
    label: string;
    data: TrendDataPoint[];
    total: number;
    trend: TrendDirection;
    changePercentage: number;
  };
  revenue: {
    label: string;
    data: TrendDataPoint[];
    total: number;
    trend: TrendDirection;
    changePercentage: number;
  };
  productionVsSales: {
    produced: TrendDataPoint[];
    sold: TrendDataPoint[];
  };
}

/**
 * Product Highlight (Top/Bottom Performer)
 */
export interface ProductHighlight {
  productId: string;
  productName: string;
  category: string;
  revenue: number;
  quantitySold: number;
  salesCount: number;
  growthRate?: number;
}

/**
 * Dashboard Highlights Response
 */
export interface DashboardHighlights {
  topSellers: ProductHighlight[];
  bottomPerformers: ProductHighlight[];
  fastestGrowing: ProductHighlight[];
  declining: ProductHighlight[];
}

/**
 * Alert Severity Levels
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alert Types
 */
export type AlertType = 'low_stock' | 'overstock' | 'expiring_soon' | 'expired';

/**
 * Inventory Alert
 */
export interface InventoryAlert {
  type: AlertType;
  severity: AlertSeverity;
  productId?: string;
  productName?: string;
  batchId?: string;
  batchNumber?: string;
  message: string;
  value: number;
  threshold?: number;
  daysUntilExpiry?: number;
}

/**
 * Dashboard Alerts Response
 */
export interface DashboardAlerts {
  total: number;
  critical: number;
  warnings: number;
  alerts: InventoryAlert[];
}

/**
 * Recent Sale Activity
 */
export interface RecentSale {
  saleId: string;
  customerName: string;
  /**
   * What the entry is worth, in cedis — not what it earned. Debt carried in
   * from before this system earns nothing but is worth what is owed.
   */
  totalAmount: number;
  itemCount: number;
  orderStatus: string;
  paymentStatus: string;
  /** `order`, or `opening_balance` for debt brought forward. */
  kind: string;
  createdAt: string;
}

/**
 * Recent Batch Activity
 */
export interface RecentBatch {
  batchId: string;
  batchNumber: string;
  productName: string;
  quantity: number;
  productionDate: string;
}

/**
 * Recent Inventory Change
 */
export interface RecentInventoryChange {
  id: string;
  productName: string;
  changeType: 'production' | 'sale' | 'adjustment';
  quantityChange: number;
  timestamp: string;
}

/**
 * Dashboard Activity Response
 */
export interface DashboardActivity {
  recentSales: RecentSale[];
  recentBatches: RecentBatch[];
  recentChanges: RecentInventoryChange[];
}
