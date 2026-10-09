/**
 * Invoice Preview Modal
 *
 * Shows the generated invoice before anything irreversible happens: the admin
 * can read it, download it, or email it — to the address on the customer
 * record, or to one they type in for this send only.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { take } from 'rxjs';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';

// Local
import { SalesApiService } from '../../services/sales-api.service';
import { PaymentAccountApiService } from '@features/payment-accounts/services/payment-account-api.service';
import {
  PaymentAccount,
  paymentAccountLabel,
} from '@features/payment-accounts/models/payment-account.model';

/** Where the invoice should go. */
type Recipient = 'customer' | 'other';

@Component({
  selector: 'app-invoice-preview-modal',
  standalone: true,
  templateUrl: './invoice-preview-modal.component.html',
  styleUrls: ['./invoice-preview-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    RadioButtonModule,
    ProgressSpinnerModule,
    CheckboxModule,
  ],
})
export class InvoicePreviewModalComponent {
  private readonly salesApiService = inject(SalesApiService);
  private readonly messageService = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly paymentAccountApi = inject(PaymentAccountApiService);

  public readonly visible = signal(false);
  public readonly generating = signal(false);

  /** Accounts available to print, and which of them are ticked. */
  public readonly paymentAccounts = signal<PaymentAccount[]>([]);
  public readonly selectedAccountIds = signal<string[]>([]);
  public readonly accountLabel = paymentAccountLabel;
  public readonly allAccountsSelected = computed(
    () =>
      this.paymentAccounts().length > 0 &&
      this.selectedAccountIds().length === this.paymentAccounts().length,
  );

  public readonly sending = signal(false);
  public readonly previewUrl = signal<SafeResourceUrl | null>(null);
  /**
   * Shown inside the dialog. The app's toast is the nicer channel, but a failed
   * send must be visible even if it never reaches the screen.
   */
  public readonly sendError = signal<string | null>(null);

  /** The address on the customer record; absent when they have none. */
  public readonly customerEmail = signal<string | null>(null);

  private readonly saleId = signal<string | null>(null);
  /** Held so it can be revoked — object URLs leak until they are. */
  private objectUrl: string | null = null;
  private pdfBlob: Blob | null = null;

  public readonly form = this.fb.group({
    recipient: this.fb.control<Recipient>('customer'),
    email: this.fb.control('', [Validators.email]),
  });

  /** Falls back to "other" when there is no address to default to. */
  public readonly canUseCustomerEmail = computed(() => !!this.customerEmail());

  /**
   * True once the field has been engaged and holds nothing usable.
   * `Validators.email` passes on an empty value, so emptiness is checked here.
   */
  public showEmailError(): boolean {
    const control = this.form.controls.email;

    return control.touched && (!control.value?.trim() || control.invalid);
  }

  public readonly sendDisabled = computed(
    () => this.generating() || this.sending() || !this.previewUrl(),
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.releasePreview());
  }

  public open(saleId: string, customerEmail?: string | null): void {
    this.saleId.set(saleId);
    this.customerEmail.set(customerEmail?.trim() || null);
    this.form.reset({
      recipient: customerEmail?.trim() ? 'customer' : 'other',
      email: '',
    });
    this.sendError.set(null);
    this.visible.set(true);
    this.loadPaymentAccounts(saleId);
  }

  public isAccountSelected(id: string): boolean {
    return this.selectedAccountIds().includes(id);
  }

  public toggleAccount(id: string): void {
    this.selectedAccountIds.update((ids) =>
      ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id],
    );
    this.regenerate();
  }

  public toggleAllAccounts(): void {
    this.selectedAccountIds.set(
      this.allAccountsSelected() ? [] : this.paymentAccounts().map(({ id }) => id),
    );
    this.regenerate();
  }

  /**
   * Re-renders the preview so what the admin is looking at is the document
   * that would actually be sent.
   */
  private regenerate(): void {
    const saleId = this.saleId();

    if (saleId) {
      this.loadPreview(saleId);
    }
  }

  /**
   * Retired accounts are left out — an invoice must not ask a customer to pay
   * into an account that is no longer in use.
   */
  private loadPaymentAccounts(saleId: string): void {
    this.generating.set(true);

    this.paymentAccountApi
      .getAll(true)
      .pipe(take(1))
      .subscribe({
        next: (accounts) => {
          this.paymentAccounts.set(accounts);
          this.selectedAccountIds.set(
            accounts.filter((a) => a.includeOnInvoiceByDefault).map(({ id }) => id),
          );
          this.loadPreview(saleId);
        },
        // Not being able to list the accounts is no reason to withhold the
        // invoice; it just means none are offered for this one.
        error: () => {
          this.paymentAccounts.set([]);
          this.selectedAccountIds.set([]);
          this.loadPreview(saleId);
        },
      });
  }

  public close(): void {
    this.visible.set(false);
    this.sendError.set(null);
    this.releasePreview();
    this.saleId.set(null);
    this.paymentAccounts.set([]);
    this.selectedAccountIds.set([]);
    this.form.reset({ recipient: 'customer', email: '' });
  }

  public download(): void {
    const blob = this.pdfBlob;
    const saleId = this.saleId();

    if (!blob || !saleId) {
      return;
    }

    // A fresh URL for the download, so revoking it cannot break the preview
    // that is still on screen.
    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${saleId}.pdf`;
    link.click();
    globalThis.URL.revokeObjectURL(url);
  }

  public send(): void {
    const saleId = this.saleId();

    if (!saleId) {
      return;
    }

    const toOther = this.form.controls.recipient.value === 'other';
    const typed = this.form.controls.email.value?.trim() ?? '';

    if (toOther && (!typed || this.form.controls.email.invalid)) {
      // The field shows its own message; no need to say it twice.
      this.form.controls.email.markAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid email',
        detail: 'Enter a valid email address to send the invoice to.',
      });
      return;
    }

    this.sendError.set(null);
    this.sending.set(true);
    this.salesApiService
      .sendInvoiceEmail(saleId, {
        ...(toOther ? { email: typed } : {}),
        // Send what was previewed, not the defaults.
        paymentAccountIds: this.selectedAccountIds(),
      })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.sending.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Invoice sent',
            detail: `Sent to ${response.data.sentTo}`,
          });
          this.close();
        },
        error: (error) => {
          this.sending.set(false);
          const detail =
            error?.error?.message || 'Failed to send the invoice email.';
          this.sendError.set(detail);
          this.messageService.add({
            severity: 'error',
            summary: 'Could not send invoice',
            detail,
          });
        },
      });
  }

  private loadPreview(saleId: string): void {
    this.generating.set(true);
    this.releasePreview();

    this.salesApiService
      .generateInvoice(saleId, {
        discount: 0,
        transportation: 0,
        paymentAccountIds: this.selectedAccountIds(),
      })
      .pipe(take(1))
      .subscribe({
        next: (blob: Blob) => {
          this.pdfBlob = blob;
          this.objectUrl = globalThis.URL.createObjectURL(blob);
          this.previewUrl.set(
            this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl),
          );
          this.generating.set(false);
        },
        error: (error) => {
          this.generating.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Could not generate invoice',
            detail: error?.error?.message || 'Failed to generate the invoice.',
          });
          this.close();
        },
      });
  }

  private releasePreview(): void {
    if (this.objectUrl) {
      globalThis.URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.pdfBlob = null;
    this.previewUrl.set(null);
  }
}
