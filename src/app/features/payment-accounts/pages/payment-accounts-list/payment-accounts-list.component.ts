import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Button } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PaymentAccountApiService } from '../../services/payment-account-api.service';
import {
  MOBILE_MONEY_NETWORK_LABELS,
  PaymentAccount,
  paymentAccountFileName,
  PaymentAccountType,
} from '../../models/payment-account.model';
import { downloadBlob } from '@shared/utils/download-blob';
import { PaymentAccountDialogComponent } from '../payment-account-dialog/payment-account-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-payment-accounts-list',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    TagModule,
    Button,
    ConfirmDialogModule,
    TooltipModule,
    PaymentAccountDialogComponent,
  ],
  templateUrl: './payment-accounts-list.component.html',
  styleUrl: './payment-accounts-list.component.scss',
  providers: [ConfirmationService],
})
export class PaymentAccountsListComponent implements OnInit {
  private readonly api = inject(PaymentAccountApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  public readonly accounts = signal<PaymentAccount[]>([]);
  public readonly loading = signal(false);
  public readonly dialogVisible = signal(false);
  public readonly selectedAccount = signal<PaymentAccount | null>(null);

  public readonly downloadingAll = signal(false);
  /** The account whose sheet is being prepared, so only its own button spins. */
  public readonly downloadingId = signal<string | null>(null);

  public readonly AccountType = PaymentAccountType;

  public ngOnInit(): void {
    this.load();
  }

  public load(): void {
    this.loading.set(true);

    this.api.getAll().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not load payment accounts.',
        });
      },
    });
  }

  public onAdd(): void {
    this.selectedAccount.set(null);
    this.dialogVisible.set(true);
  }

  public onEdit(account: PaymentAccount): void {
    this.selectedAccount.set(account);
    this.dialogVisible.set(true);
  }

  public onDelete(account: PaymentAccount): void {
    this.confirmationService.confirm({
      header: 'Delete payment account',
      message:
        `Delete ${this.institution(account)} (${account.accountNumber})? ` +
        'Invoices already issued keep the details they were generated with.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.remove(account.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Payment account deleted',
            });
            this.load();
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Could not delete the payment account.',
            }),
        });
      },
    });
  }

  /**
   * One sheet listing every account still in use — what gets emailed to a
   * customer asking where to pay.
   */
  public onDownloadAll(): void {
    this.downloadingAll.set(true);

    this.api.downloadAll().subscribe({
      next: (blob) => {
        this.downloadingAll.set(false);
        downloadBlob(blob, 'maltiti-payment-details.pdf');
      },
      error: (error: { status?: number }) => {
        this.downloadingAll.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Nothing to download',
          detail:
            error.status === 404
              ? 'No accounts are in use. Add one, or put a retired account back in use.'
              : 'Could not prepare the payment details sheet.',
        });
      },
    });
  }

  public onDownload(account: PaymentAccount): void {
    this.downloadingId.set(account.id);

    this.api.downloadOne(account.id).subscribe({
      next: (blob) => {
        this.downloadingId.set(null);
        downloadBlob(blob, paymentAccountFileName(account));
      },
      error: () => {
        this.downloadingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not prepare the payment details sheet.',
        });
      },
    });
  }

  /** The bank or the network — what the account is actually recognised by. */
  public institution(account: PaymentAccount): string {
    if (account.type === PaymentAccountType.MOBILE_MONEY) {
      return account.mobileMoneyNetwork
        ? MOBILE_MONEY_NETWORK_LABELS[account.mobileMoneyNetwork]
        : 'Mobile Money';
    }

    return account.bankName || '—';
  }

  /** "Tamale Branch (90801)", dropping whichever half is missing. */
  public branch(account: PaymentAccount): string {
    const name = account.branchName?.trim() ?? '';
    const code = account.branchCode?.trim() ?? '';

    if (name && code) {
      return `${name} (${code})`;
    }

    return name || code || '—';
  }
}
