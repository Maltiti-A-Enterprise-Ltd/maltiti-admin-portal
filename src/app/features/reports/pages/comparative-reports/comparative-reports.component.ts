/**
 * Comparative Reports Component
 * Displays period-over-period comparisons and growth metrics
 */

import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ReportsApiService } from '../../services/reports-api.service';
import {
  ComparativeQueryParams,
  ComparativeReport,
  ProductCategory,
} from '../../models/report.model';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { first } from 'rxjs';
import { CHART_COLORS } from '@shared/utils/chart-palette';

@Component({
  selector: 'app-comparative-reports',
  imports: [
    CardModule,
    ChartModule,
    DatePickerModule,
    SelectModule,
    ButtonModule,
    SkeletonModule,
    ReactiveFormsModule,
    DecimalPipe,
    CurrencyPipe,
  ],
  templateUrl: './comparative-reports.component.html',
  styleUrl: './comparative-reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparativeReportsComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly fb = inject(FormBuilder);

  public readonly isLoading = signal(false);
  public readonly report = signal<ComparativeReport | null>(null);
  public readonly chartData = signal<unknown>(null);
  public readonly chartOptions = signal<unknown>(null);

  public readonly filterForm: FormGroup = this.fb.group({
    currentFromDate: [null, Validators.required],
    currentToDate: [null, Validators.required],
    previousFromDate: [null, Validators.required],
    previousToDate: [null, Validators.required],
    category: [null],
  });

  public readonly categories: ProductCategory[] = [
    'Shea Butter',
    'Black Soap',
    'Cosmetics',
    'Shea Soap',
    'Powdered Soap',
    'Dawadawa',
    'Essential Oils',
    'Hair Oil',
    'Grains',
    'Legumes',
    'Other',
  ];

  constructor() {
    this.initializeChartOptions();
  }

  ngOnInit(): void {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const startOfPreviousYear = new Date(today.getFullYear() - 1, 0, 1);
    const endOfPreviousYear = new Date(today.getFullYear() - 1, 11, 31);

    this.filterForm.patchValue({
      currentFromDate: startOfYear,
      currentToDate: today,
      previousFromDate: startOfPreviousYear,
      previousToDate: endOfPreviousYear,
    });

    this.onApplyFilters();
  }

  public onApplyFilters(): void {
    if (this.filterForm.invalid) {
      return;
    }

    const formValue = this.filterForm.value;
    const params: ComparativeQueryParams = {
      currentFromDate: this.formatDate(formValue.currentFromDate),
      currentToDate: this.formatDate(formValue.currentToDate),
      previousFromDate: this.formatDate(formValue.previousFromDate),
      previousToDate: this.formatDate(formValue.previousToDate),
      category: formValue.category,
    };

    this.loadReport(params);
  }

  public onResetFilters(): void {
    this.ngOnInit();
    this.report.set(null);
    this.chartData.set(null);
  }

  private loadReport(params: ComparativeQueryParams): void {
    this.isLoading.set(true);

    this.reportsApi
      .getComparativeReport(params)
      .pipe(first())
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.updateChartData(report);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load comparative report:', error);
          this.isLoading.set(false);
        },
      });
  }

  private updateChartData(report: ComparativeReport): void {

    this.chartData.set({
      labels: ['Revenue', 'Sales Count', 'Avg Order Value'],
      datasets: [
        {
          label: 'Previous Period',
          data: [
            report.previous.totalRevenue,
            report.previous.totalQuantitySold,
            report.previous.averageOrderValue,
            report.previous.totalSales,
          ],
          backgroundColor: CHART_COLORS.grey,
        },
        {
          label: 'Current Period',
          data: [
            report.current.totalRevenue,
            report.current.totalQuantitySold,
            report.current.averageOrderValue,
            report.current.totalSales,
          ],
          backgroundColor: CHART_COLORS.primary,
        },
      ],
    });
  }

  private initializeChartOptions(): void {
    const textColor = '#181d1a';
    const textColorSecondary = CHART_COLORS.text;
    const surfaceBorder = CHART_COLORS.grid;

    this.chartOptions.set({
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: {
          labels: { color: textColor },
        },
      },
      scales: {
        x: {
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder },
        },
        y: {
          ticks: { color: textColorSecondary },
          grid: { color: surfaceBorder },
        },
      },
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
