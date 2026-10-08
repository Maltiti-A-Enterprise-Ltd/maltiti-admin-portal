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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { take } from 'rxjs';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

// Local
import { SalesApiService } from '../../services/sales-api.service';

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
    DialogModule,
    ButtonModule,
    InputTextModule,
    RadioButtonModule,
    ProgressSpinnerModule,
  ],
})
export class InvoicePreviewModalComponent {
  private readonly salesApiService = inject(SalesApiService);
  private readonly messageService = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  public readonly visible = signal(false);
  public readonly generating = signal(false);
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
    this.loadPreview(saleId);
  }

  public close(): void {
    this.visible.set(false);
    this.sendError.set(null);
    this.releasePreview();
    this.saleId.set(null);
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
      .sendInvoiceEmail(saleId, toOther ? { email: typed } : {})
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
      .generateInvoice(saleId, { discount: 0, transportation: 0 })
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
