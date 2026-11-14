/**
 * The statement of account, on screen.
 *
 * Every figure here comes from the API rather than being worked out in the
 * template — the running balance, the opening balance, what counts as money
 * received. The same call backs the PDF and the spreadsheet, so what is read
 * here and what is sent to a customer cannot drift apart.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { CustomerSelectComponent } from '@shared/components/customer-virtual-select/customer-select.component';
import { downloadBlob } from '@shared/utils/download-blob';
import { StatementApiService } from '../../services/statement-api.service';
import { Statement, StatementEntryType, StatementQuery } from '../../models/statement.model';
import { asPlainDay, statementFileName } from '../../utils/statement-period';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-statement-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    CardModule,
    TableModule,
    TagModule,
    ButtonModule,
    DatePickerModule,
    SkeletonModule,
    CheckboxModule,
    CustomerSelectComponent,
  ],
  templateUrl: './statement-page.component.html',
  styleUrl: './statement-page.component.scss',
})
export class StatementPageComponent implements OnInit {
  private readonly api = inject(StatementApiService);
  private readonly messageService = inject(MessageService);

  public readonly statement = signal<Statement | null>(null);
  public readonly loading = signal(false);
  public readonly downloading = signal<'pdf' | 'excel' | null>(null);

  /** Blank means every account. */
  public readonly customerControl = new FormControl<string | null>(null);
  /**
   * With no customer chosen, the page opens on the accounts that still owe —
   * the list someone is going to chase. Ignored once a customer is picked.
   */
  public readonly owingOnlyControl = new FormControl(true, { nonNullable: true });
  public readonly fromControl = new FormControl<Date | null>(null);
  public readonly toControl = new FormControl<Date | null>(null);

  public readonly entryType = StatementEntryType;
  /** Nothing in the future has happened yet. */
  public readonly today = new Date();

  public readonly isEmpty = computed(() => !this.loading() && this.statement()?.rows.length === 0);

  /**
   * Whether the closing balance is money owed to us.
   *
   * It can run the other way — a customer in credit, or money received
   * against an order that was then cancelled — and a figure in red on an
   * account that is actually in hand would be read exactly wrong.
   */
  public readonly isOwed = computed(() => (this.statement()?.totals.closingBalance ?? 0) > 0);

  public ngOnInit(): void {
    this.load();
  }

  public load(): void {
    this.loading.set(true);

    this.api.get(this.query()).subscribe({
      next: (statement) => {
        this.statement.set(statement);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not build the statement.',
        });
      },
    });
  }

  public download(format: 'pdf' | 'excel'): void {
    this.downloading.set(format);

    this.api.download(this.query(), format).subscribe({
      next: (blob) => {
        this.downloading.set(null);
        downloadBlob(blob, statementFileName(this.statement(), format === 'pdf' ? 'pdf' : 'xlsx'));
      },
      error: () => {
        this.downloading.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Could not generate the ${format === 'pdf' ? 'PDF' : 'spreadsheet'}.`,
        });
      },
    });
  }

  public clearFilters(): void {
    this.customerControl.setValue(null, { emitEvent: false });
    this.fromControl.setValue(null, { emitEvent: false });
    this.toControl.setValue(null, { emitEvent: false });
    this.owingOnlyControl.setValue(true, { emitEvent: false });
    this.load();
  }

  public isFiltered(): boolean {
    return !!(
      this.customerControl.value ||
      this.fromControl.value ||
      this.toControl.value ||
      !this.owingOnlyControl.value
    );
  }

  private query(): StatementQuery {
    return {
      customerId: this.customerControl.value ?? undefined,
      from: asPlainDay(this.fromControl.value) ?? undefined,
      to: asPlainDay(this.toControl.value) ?? undefined,
      owingOnly: !this.customerControl.value && this.owingOnlyControl.value ? true : undefined,
    };
  }
}
