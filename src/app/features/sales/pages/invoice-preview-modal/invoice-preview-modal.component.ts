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
import { DecimalPipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { take } from 'rxjs';
import { downloadBlob } from '@shared/utils/download-blob';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

// Local
import { SalesApiService } from '../../services/sales-api.service';
import { PaymentAccountApiService } from '@features/payment-accounts/services/payment-account-api.service';
import {
  PaymentAccount,
  paymentAccountLabel,
} from '@features/payment-accounts/models/payment-account.model';
import { InvoiceDisplayOptions } from '../../utils/invoice-display-options';
import { InvoicePriceAdjustments } from '../../utils/invoice-price-adjustments';
import { CurrencyRateState } from '../../services/currency-rate.state';
import { InvoiceCurrency } from '../../models/sale.model';
import { InvoicePreviewContext } from '../../models/invoice-preview.model';

/** Where the invoice should go. */
type Recipient = 'customer' | 'other';

@Component({
  selector: 'app-invoice-preview-modal',
  standalone: true,
  templateUrl: './invoice-preview-modal.component.html',
  styleUrls: ['./invoice-preview-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CurrencyRateState],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    RadioButtonModule,
    ProgressSpinnerModule,
    CheckboxModule,
    SelectModule,
    InputNumberModule,
    TooltipModule,
    DecimalPipe,
  ],
})
export class InvoicePreviewModalComponent {
  private readonly salesApiService = inject(SalesApiService);
  private readonly messageService = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly paymentAccountApi = inject(PaymentAccountApiService);
  /** Currency and rate, kept apart because it is its own concern. */
  public readonly currencyState = inject(CurrencyRateState);

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

  /**
   * The tick boxes that change how the PDF reads — payments received,
   * pounds beside the metric weights, container sizes.
   *
   * Held together so a new one is added in one place. Each used to be
   * spelled out in six, and a flag that reaches five of them works in the
   * preview and is missing from the emailed copy.
   */
  public readonly display = new InvoiceDisplayOptions();

  /**
   * Unit prices this invoice is to print, where they are not the sale's.
   * Beside the tick boxes for the same reason — see the class.
   */
  public readonly prices = new InvoicePriceAdjustments();

  public readonly sending = signal(false);
  public readonly previewUrl = signal<SafeResourceUrl | null>(null);
  /**
   * Shown inside the dialog. The app's toast is the nicer channel, but a failed
   * send must be visible even if it never reaches the screen.
   */
  public readonly sendError = signal<string | null>(null);

  /** The address on the customer record; absent when they have none. */
  public readonly customerEmail = signal<string | null>(null);

  /** What the sale was struck in, which the invoice may restate. */
  private readonly saleCurrency = signal<InvoiceCurrency>(InvoiceCurrency.GHS);

  /**
   * Whether there is a rate on this invoice worth offering to print.
   *
   * A cedi sale on a cedi invoice has none, and a tick box that visibly does
   * nothing is worse than no tick box. Anything else — a converted invoice,
   * or a foreign sale however it is issued — has a rate behind its figures.
   */
  public readonly showsRate = computed(
    () =>
      this.saleCurrency() !== InvoiceCurrency.GHS ||
      this.currencyState.isForeign(),
  );

  private readonly saleId = signal<string | null>(null);
  /** Held so it can be revoked — object URLs leak until they are. */
  private objectUrl: string | null = null;
  private pdfBlob: Blob | null = null;
  /** What the server called it, for the Download button. */
  private pdfFileName = 'Invoice.pdf';


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
    () =>
      this.generating() ||
      this.sending() ||
      this.currencyState.needsRate() ||
      !this.previewUrl(),
  );

  constructor() {
    this.currencyState.onSettled = (): void => this.regenerate();
    this.display.onChange = (): void => this.regenerate();
    this.prices.onChange = (): void => this.regenerate();
    this.destroyRef.onDestroy(() => this.releasePreview());
  }

  /**
   * Opens on what this sale was last invoiced in, falling back to the
   * currency it was **struck** in.
   *
   * That fallback matters now that a foreign sale can actually be invoiced in
   * cedis. It used to fall back to cedis, which was harmless only because the
   * API ignored the choice for a foreign sale and issued in its own currency
   * regardless. With the API honouring it, the same fallback would quietly
   * turn every dollar invoice into a cedi one.
   */
  public open(saleId: string, context: InvoicePreviewContext = {}): void {
    const saleCurrency = context.currency ?? InvoiceCurrency.GHS;

    this.saleCurrency.set(saleCurrency);
    this.saleId.set(saleId);
    this.customerEmail.set(context.customerEmail?.trim() || null);
    this.currencyState.reset(
      context.invoiceCurrency ?? saleCurrency,
      context.invoiceExchangeRate ?? context.exchangeRate,
    );
    this.display.reset();
    this.prices.reset(context.lineItems);
    this.form.reset({
      recipient: context.customerEmail?.trim() ? 'customer' : 'other',
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

    // Generating now would produce an invoice converted at 1:1 and look like
    // a working preview, which is the most expensive way to get this wrong.
    if (saleId && !this.currencyState.needsRate()) {
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
    this.currencyState.reset();
    this.display.reset();
    this.prices.reset();
    this.form.reset({ recipient: 'customer', email: '' });
  }

  public download(): void {
    const blob = this.pdfBlob;

    if (!blob) {
      return;
    }

    /* `downloadBlob` makes a fresh object URL of its own, so revoking it
       cannot break the preview still on screen. */
    downloadBlob(blob, this.pdfFileName);
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
        ...this.currencyState.payload(),
        ...this.display.payload(),
        ...this.prices.payload(),
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
        ...this.currencyState.payload(),
        ...this.display.payload(),
        ...this.prices.payload(),
      })
      .pipe(take(1))
      .subscribe({
        next: ({ blob, fileName }) => {
          this.pdfBlob = blob;
          /* Kept from the response so Download saves it under the name the
             invoice actually carries, rather than one invented here. */
          this.pdfFileName = fileName;
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
