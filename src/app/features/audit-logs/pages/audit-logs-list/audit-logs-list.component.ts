/**
 * Audit Logs List Page
 * Displays paginated audit logs with filtering and sorting
 * Super Admin Only
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import {
  AuditEntityType,
  AuditFiltersComponent,
  AuditLogService,
  getActionSeverity,
  IAuditLog,
  IAuditLogFilters,
} from '@features/audit-logs';
import { Severity } from '@shared/models/shared.model';

interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
}

/** Keys that belong to pagination — never passed back to the filter component */
const PAGINATION_KEYS: (keyof IAuditLogFilters)[] = ['page', 'limit', 'sortOrder'];

@Component({
  selector: 'app-audit-logs-list',
  imports: [
    CommonModule,
    DatePipe,
    TableModule,
    ButtonModule,
    TagModule,
    CardModule,
    ProgressSpinnerModule,
    MessageModule,
    TooltipModule,
    AuditFiltersComponent,
  ],
  templateUrl: './audit-logs-list.component.html',
  styleUrl: './audit-logs-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogsListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auditLogService = inject(AuditLogService);
  private readonly router = inject(Router);

  // State signals
  public readonly auditLogs = signal<IAuditLog[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);
  public readonly totalRecords = signal<number>(0);

  /** Full query params (filters + pagination) sent to the API */
  private readonly queryParams = signal<IAuditLogFilters>({
    page: 1,
    limit: 20,
    sortOrder: 'DESC',
  });

  /**
   * Filter-only params (no pagination) — passed back to the filter component
   * so it never gets confused by page/limit/sortOrder changes.
   */
  public readonly activeFilterParams = computed<IAuditLogFilters>(() => {
    const params = this.queryParams();
    const filterOnly: IAuditLogFilters = {};
    (Object.keys(params) as (keyof IAuditLogFilters)[]).forEach((key) => {
      if (!PAGINATION_KEYS.includes(key)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (filterOnly as any)[key] = params[key];
      }
    });
    return filterOnly;
  });

  // Table configuration
  public readonly columns = signal<TableColumn[]>([
    { field: 'timestamp', header: 'Timestamp', sortable: true },
    { field: 'performedByUserName', header: 'User', sortable: false },
    { field: 'performedByRole', header: 'Role', sortable: false },
    { field: 'actionType', header: 'Action', sortable: false },
    { field: 'entityType', header: 'Entity', sortable: false },
    { field: 'description', header: 'Description', sortable: false },
  ]);

  // Computed properties
  public readonly hasData = computed(() => this.auditLogs().length > 0);
  public readonly isEmpty = computed(() => !this.isLoading() && !this.hasData() && !this.error());
  public readonly pageLimit = computed(() => this.queryParams().limit ?? 20);

  public ngOnInit(): void {
    this.loadAuditLogs();
  }

  /**
   * Load audit logs with current query params
   */
  public loadAuditLogs(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.auditLogService
      .getAuditLogs(this.queryParams())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.auditLogs.set(data.items);
          this.totalRecords.set(data.totalItems);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to load audit logs');
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Handle filter changes from the filter component.
   * Replaces all filter keys (not pagination) with the new filter values.
   */
  public onFiltersChange(newFilters: IAuditLogFilters): void {
    this.queryParams.update((current) => {
      // Start from a clean slate of pagination-only params
      const pagination: IAuditLogFilters = {};
      PAGINATION_KEYS.forEach((key) => {
        if (current[key] !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (pagination as any)[key] = current[key];
        }
      });

      // Merge clean pagination + new filter values, resetting to page 1
      return { ...pagination, ...newFilters, page: 1 };
    });
    this.loadAuditLogs();
  }

  /**
   * Handle filter reset — go back to pagination-only defaults
   */
  public onFiltersReset(): void {
    this.queryParams.set({
      page: 1,
      limit: 20,
      sortOrder: 'DESC',
    });
    this.loadAuditLogs();
  }

  /**
   * Navigate to audit log details
   */
  public onViewDetails(auditLog: IAuditLog): void {
    void this.router.navigate(['/audit-logs', auditLog.id]);
  }

  /**
   * Handle page change
   */
  public onPageChange(event: { first: number; rows: number }): void {
    const newPage = Math.floor(event.first / event.rows) + 1;
    this.queryParams.update((current) => ({
      ...current,
      page: newPage,
      limit: event.rows,
    }));
    this.loadAuditLogs();
  }

  /**
   * Get severity class for action type tag
   */
  public getActionSeverity = getActionSeverity;

  /**
   * Get severity class for entity type tag
   */
  public getEntitySeverity(entityType: AuditEntityType): Severity {
    const entityMap: Record<string, Severity> = {
      [AuditEntityType.USER]: 'info',
      [AuditEntityType.PRODUCT]: 'success',
      [AuditEntityType.BATCH]: 'success',
      [AuditEntityType.SALE]: 'warn',
      [AuditEntityType.SYSTEM]: 'secondary',
      [AuditEntityType.AUTHENTICATION]: 'secondary',
    };

    return entityMap[entityType] || 'secondary';
  }

  /**
   * Format enum values for display
   */
  public formatEnumLabel(value: string): string {
    return value
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Truncate long text
   */
  public truncateText(text: string, maxLength = 60): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}
