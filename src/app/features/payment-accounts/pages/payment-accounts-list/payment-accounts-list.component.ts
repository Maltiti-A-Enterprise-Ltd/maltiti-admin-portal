import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Button } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PaymentAccountApiService } from '../../services/payment-account-api.service';
import {
  MOBILE_MONEY_NETWORK_LABELS,
  PaymentAccount,
  PaymentAccountType,
} from '../../models/payment-account.model';
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
