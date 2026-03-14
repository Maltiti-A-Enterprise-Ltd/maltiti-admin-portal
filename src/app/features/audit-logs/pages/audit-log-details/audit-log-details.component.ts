/**
 * Audit Log Details Component
 * Displays detailed information about a specific audit log entry
 * Shows full metadata, before/after values, IP address, and user agent
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
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import {
  AuditEntityType,
  AuditLogService,
  getActionSeverity,
  IAuditLog,
} from '@features/audit-logs';
import { AlertSeverity } from '@app/dashboard/models/dashboard.model';
import { Severity } from '@shared/models/shared.model';

@Component({
  selector: 'app-audit-log-details',
  imports: [
    CommonModule,
    DatePipe,
    CardModule,
    ButtonModule,
    TagModule,
    DividerModule,
    ProgressSpinnerModule,
    MessageModule,
  ],
  templateUrl: './audit-log-details.component.html',
  styleUrl: './audit-log-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogDetailsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auditLogService = inject(AuditLogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // State signals
  public readonly auditLog = signal<IAuditLog | null>(null);
  public readonly hasAuditLogMeta = computed(
    () => Object.keys(this.auditLog()!.metadata!).length > 2,
  );
  public readonly isLoading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  public ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAuditLogDetails(id);
    } else {
      this.error.set('Invalid audit log ID');
    }
  }

  /**
   * Load audit log details by ID
   */
  private loadAuditLogDetails(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.auditLogService
      .getAuditLogById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.auditLog.set(data);
          this.isLoading.set(false);
        },
        error: (err: { error?: { message?: string } }) => {
          this.error.set(err?.error?.message || 'Failed to load audit log details');
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Navigate back to audit logs list
   */
  public onBack(): void {
    void this.router.navigate(['/audit-logs']);
  }

  /**
   * Get severity class for action type tag
   */
  public getActionSeverity = getActionSeverity;

  /**
   * Get severity class for entity type tag
   */
  public getEntitySeverity(entityType: AuditEntityType | AlertSeverity): Severity {
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
   * Check if metadata has before/after values
   */
  public hasBeforeAfter(metadata: Record<string, unknown> | undefined): boolean {
    return !!metadata && ('before' in metadata || 'after' in metadata);
  }

  /**
   * Format JSON for display
   */
  public formatJson(obj: unknown): string {
    return JSON.stringify(obj, null, 2);
  }
}
