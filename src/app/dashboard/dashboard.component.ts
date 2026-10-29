/**
 * Dashboard Component
 * Executive-style dashboard with KPIs, trends, highlights, alerts, and recent activity
 */

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { first } from 'rxjs';
import { DashboardApiService } from './services/dashboard-api.service';
import {
  AlertSeverity,
  DashboardActivity,
  DashboardAlerts,
  DashboardHighlights,
  DashboardKPIs,
  DashboardSummary,
  DashboardTrends,
} from './models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  imports: [
    CardModule,
    ChartModule,
    TableModule,
    TagModule,
    SkeletonModule,
    ButtonModule,
    DatePipe,
    DecimalPipe,
    CurrencyPipe,
    RouterLink,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly router = inject(Router);

  public readonly isLoadingSummary = signal(false);
  public readonly isLoadingTrends = signal(false);
  public readonly isLoadingHighlights = signal(false);
  public readonly isLoadingAlerts = signal(false);
  public readonly isLoadingActivity = signal(false);

  public readonly summary = signal<DashboardSummary | null>(null);
  public readonly trends = signal<DashboardTrends | null>(null);
  public readonly highlights = signal<DashboardHighlights | null>(null);
  public readonly alerts = signal<DashboardAlerts | null>(null);
  public readonly activity = signal<DashboardActivity | null>(null);

  public readonly salesChartData = signal<unknown>(null);
  public readonly salesChartOptions = signal<unknown>(null);
  public readonly revenueChartData = signal<unknown>(null);
  public readonly revenueChartOptions = signal<unknown>(null);

  constructor() {
    this.initializeChartOptions();
  }

  public ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.loadSummary();
    this.loadTrends();
    this.loadHighlights();
    this.loadAlerts();
    this.loadActivity();
  }

  private loadSummary(): void {
    this.isLoadingSummary.set(true);
    this.dashboardApi
      .getSummary({ includeComparison: true })
      .pipe(first())
      .subscribe({
        next: (data) => {
          this.summary.set(data);
          this.isLoadingSummary.set(false);
        },
        error: (error) => {
          console.error('Failed to load dashboard summary:', error);
          this.isLoadingSummary.set(false);
        },
      });
  }

  private loadTrends(): void {
    this.isLoadingTrends.set(true);
    this.dashboardApi
      .getTrends({ period: '30' })
      .pipe(first())
      .subscribe({
        next: (data) => {
          this.trends.set(data);
          this.updateCharts(data);
          this.isLoadingTrends.set(false);
        },
        error: (error) => {
          console.error('Failed to load dashboard trends:', error);
          this.isLoadingTrends.set(false);
        },
      });
  }

  private loadHighlights(): void {
    this.isLoadingHighlights.set(true);
    this.dashboardApi
      .getHighlights({ limit: 5 })
      .pipe(first())
      .subscribe({
        next: (data) => {
          this.highlights.set(data);
          this.isLoadingHighlights.set(false);
        },
        error: (error) => {
          console.error('Failed to load dashboard highlights:', error);
          this.isLoadingHighlights.set(false);
        },
      });
  }

  private loadAlerts(): void {
    this.isLoadingAlerts.set(true);
    this.dashboardApi
      .getAlerts({ lowStockThreshold: 100, expiryWarningDays: 30 })
      .pipe(first())
      .subscribe({
        next: (data) => {
          this.alerts.set(data);
          this.isLoadingAlerts.set(false);
        },
        error: (error) => {
          console.error('Failed to load dashboard alerts:', error);
          this.isLoadingAlerts.set(false);
        },
      });
  }

  private loadActivity(): void {
    this.isLoadingActivity.set(true);
    this.dashboardApi
      .getActivity({ limit: 5 })
      .pipe(first())
      .subscribe({
        next: (data) => {
          this.activity.set(data);
          this.isLoadingActivity.set(false);
        },
        error: (error) => {
          console.error('Failed to load dashboard activity:', error);
          this.isLoadingActivity.set(false);
        },
      });
  }

  private updateCharts(trendsData: DashboardTrends): void {
    const documentStyle = getComputedStyle(document.documentElement);

    // Sales Chart Data
    this.salesChartData.set({
      labels: trendsData.sales.data.map((t) =>
        new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ),
      datasets: [
        {
          label: trendsData.sales.label,
          data: trendsData.sales.data.map((t) => t.value),
          borderColor: documentStyle.getPropertyValue('--p-primary-color'),
          backgroundColor: documentStyle.getPropertyValue('--p-primary-color') + '20',
          tension: 0.4,
          fill: true,
        },
      ],
    });

    // Revenue Chart Data with Production vs Sales
    this.revenueChartData.set({
      labels: trendsData.revenue.data.map((t) =>
        new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ),
      datasets: [
        {
          label: trendsData.revenue.label,
          data: trendsData.revenue.data.map((t) => t.value),
          borderColor: documentStyle.getPropertyValue('--p-green-500'),
          backgroundColor: documentStyle.getPropertyValue('--p-green-500') + '20',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Produced',
          data: trendsData.productionVsSales.produced.map((t) => t.value),
          borderColor: documentStyle.getPropertyValue('--p-blue-500'),
          backgroundColor: documentStyle.getPropertyValue('--p-blue-500') + '20',
          tension: 0.4,
          fill: false,
        },
        {
          label: 'Sold',
          data: trendsData.productionVsSales.sold.map((t) => t.value),
          borderColor: documentStyle.getPropertyValue('--p-orange-500'),
          backgroundColor: documentStyle.getPropertyValue('--p-orange-500') + '20',
          tension: 0.4,
          fill: false,
        },
      ],
    });
  }

  private initializeChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
    const surfaceBorder = documentStyle.getPropertyValue('--p-surface-border');
    const baseOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: {
          ticks: { color: textColorSecondary, font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: textColorSecondary, font: { size: 11 } },
          grid: { color: surfaceBorder },
        },
      },
    };
    this.salesChartOptions.set(baseOptions);
    this.revenueChartOptions.set(baseOptions);
  }

  public getAlertSeverity(severity: AlertSeverity): 'success' | 'warn' | 'danger' {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'warning':
        return 'warn';
      default:
        return 'success';
    }
  }

  public getStockAlerts(): {
    productId?: string;
    productName?: string;
    message: string;
    severity: AlertSeverity;
  }[] {
    if (!this.alerts()) {
      return [];
    }
    return this.alerts()!.alerts.filter(
      (alert) => alert.type === 'low_stock' || alert.type === 'overstock',
    );
  }

  public getExpiryAlerts(): {
    batchId?: string;
    batchNumber?: string;
    productName?: string;
    message: string;
    severity: AlertSeverity;
  }[] {
    if (!this.alerts()) {
      return [];
    }
    return this.alerts()!.alerts.filter(
      (alert) => alert.type === 'expiring_soon' || alert.type === 'expired',
    );
  }

  public navigateToReports(section: string): void {
    void this.router.navigate(['/reports', section]);
  }

  public navigateToSales(): void {
    void this.router.navigate(['/sales']);
  }

  /**
   * What has been sold and not yet paid for.
   *
   * The gap between the two revenue cards, said out loud rather than left
   * to be worked out by subtracting one from the other. Floored at zero:
   * collecting more than was booked means money arrived against sales made
   * before the window, which is a real thing and not a negative debt.
   */
  public outstanding(kpis: DashboardKPIs): number {
    return Math.max(0, kpis.revenue.total - kpis.collected.total);
  }

  public navigateToBatches(): void {
    void this.router.navigate(['/batches']);
  }

  public navigateToProducts(): void {
    void this.router.navigate(['/products']);
  }

  public navigateToInventory(): void {
    void this.router.navigate(['/reports/inventory']);
  }
}
