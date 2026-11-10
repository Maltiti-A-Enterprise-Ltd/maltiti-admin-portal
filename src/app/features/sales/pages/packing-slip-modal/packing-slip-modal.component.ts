/**
 * Packing Slip Modal
 *
 * Shows the packing slip before it is downloaded, and lets the admin adjust
 * it on the fly the way the invoice preview does: how many packages, notes
 * for the receiver, pounds beside kilograms, and — for a shipment that
 * carries only part of the order — how much of each line goes in it, and
 * which lines are already packed. Every change rebuilds the preview, so what
 * is downloaded or emailed is what was on screen. Nothing here is written
 * back to the sale.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, take } from 'rxjs';
import { downloadBlob } from '@shared/utils/download-blob';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';

// Local
import { SalesApiService } from '../../services/sales-api.service';
import { Sale } from '../../models/sale.model';
import { GeneratePackingSlipDto } from '../../models/packing-slip.model';
import { PackingSlipQuantities } from '../../utils/packing-slip-quantities';

/** Matches the API's limit. */
export const PACKING_SLIP_NOTES_MAX_LENGTH = 500;

/**
 * Good enough to catch a typo before a round trip. The API validates the
 * address properly; this only decides whether Send is worth trying.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-packing-slip-modal',
  templateUrl: './packing-slip-modal.component.html',
  styleUrls: ['./packing-slip-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DialogModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    ProgressSpinnerModule,
    RadioButtonModule,
    TextareaModule,
  ],
})
export class PackingSlipModalComponent {
  private readonly salesApi = inject(SalesApiService);
  private readonly messageService = inject(MessageService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  public readonly visible = signal(false);
  public readonly generating = signal(false);
  public readonly previewUrl = signal<SafeResourceUrl | null>(null);
  public readonly previewError = signal<string | null>(null);

  // ─── Slip options ───────────────────────────────────────────────────────────
  public readonly packageCount = signal<number | null>(null);
  public readonly notes = signal('');
  public readonly showImperialWeights = signal(false);
  public readonly notesMaxLength = PACKING_SLIP_NOTES_MAX_LENGTH;

  /** Per-line quantities for a part shipment, and which lines are packed. */
  public readonly quantities = new PackingSlipQuantities();

  // ─── Send by email ──────────────────────────────────────────────────────────
  /** The address on the customer record; null when they have none. */
  public readonly customerEmail = signal<string | null>(null);
  public readonly recipient = signal<'customer' | 'other'>('customer');
  public readonly otherEmail = signal('');
  public readonly otherEmailTouched = signal(false);
  public readonly sending = signal(false);
  /** Shown in the dialog, so a failed send cannot go unnoticed. */
  public readonly sendError = signal<string | null>(null);

  /** Where a send would go, or null while there is no usable address. */
  public readonly sendTo = computed(() => {
    if (this.recipient() === 'customer') {
      return this.customerEmail();
    }

    const typed = this.otherEmail().trim();

    return EMAIL_PATTERN.test(typed) ? typed : null;
  });

  public readonly showEmailError = computed(
    () => this.recipient() === 'other' && this.otherEmailTouched() && !this.sendTo(),
  );

  /** Download and Send act on the previewed slip, so both wait for it. */
  public readonly actionsDisabled = computed(
    () => this.generating() || this.sending() || !this.previewUrl() || this.quantities.isEmpty(),
  );

  private readonly saleId = signal<string | null>(null);
  /** What the preview was last built with, so leaving a field unchanged is free. */
  private committedOptions = '';
  private request: Subscription | null = null;
  /** Held so it can be revoked — object URLs leak until they are. */
  private objectUrl: string | null = null;
  private pdfBlob: Blob | null = null;
  private pdfFileName = 'Packing Slip.pdf';

  public constructor() {
    this.quantities.onChange = (): void => this.regenerate();
    this.destroyRef.onDestroy(() => {
      this.request?.unsubscribe();
      this.releasePreview();
    });
  }

  public open(sale: Pick<Sale, 'id' | 'lineItems' | 'customer'>): void {
    const saleId = sale.id;
    const customerEmail = sale.customer?.email?.trim() || null;

    this.saleId.set(saleId);
    this.customerEmail.set(customerEmail);
    this.recipient.set(customerEmail ? 'customer' : 'other');
    this.otherEmail.set('');
    this.otherEmailTouched.set(false);
    this.sendError.set(null);
    this.packageCount.set(null);
    this.notes.set('');
    this.showImperialWeights.set(false);
    this.quantities.reset(sale.lineItems ?? []);
    this.committedOptions = this.optionsSignature();
    this.previewError.set(null);
    this.visible.set(true);
    this.loadPreview(saleId);
  }

  public close(): void {
    this.visible.set(false);
    this.request?.unsubscribe();
    this.request = null;
    this.releasePreview();
    this.saleId.set(null);
    this.quantities.reset();
    this.previewError.set(null);
    this.generating.set(false);
  }

  /** Called when a text or number field is left, and when the tick box changes. */
  public commitOptions(): void {
    const current = this.optionsSignature();

    if (current === this.committedOptions) {
      return;
    }

    this.committedOptions = current;
    this.regenerate();
  }

  public toggleImperial(value: boolean): void {
    this.showImperialWeights.set(value);
    this.commitOptions();
  }

  public download(): void {
    if (!this.pdfBlob) {
      return;
    }

    // `downloadBlob` makes its own object URL, so the preview stays intact.
    downloadBlob(this.pdfBlob, this.pdfFileName);
    this.messageService.add({
      severity: 'success',
      summary: 'Packing slip downloaded',
      detail: this.pdfFileName,
    });
  }

  /**
   * Emails the slip that is on screen — the same options as the preview —
   * to the customer on record or to the address typed in.
   */
  public send(): void {
    const saleId = this.saleId();
    const to = this.sendTo();

    if (!saleId) {
      return;
    }

    if (!to) {
      this.otherEmailTouched.set(true);
      return;
    }

    this.sending.set(true);
    this.sendError.set(null);

    this.salesApi
      .sendPackingSlipEmail(saleId, {
        ...this.payload(),
        ...(this.recipient() === 'other' ? { email: to } : {}),
      })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.sending.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Packing slip sent',
            detail: `Sent to ${response.data.sentTo}`,
          });
          this.close();
        },
        error: (error) => {
          this.sending.set(false);
          this.sendError.set(
            error?.error?.message || 'The packing slip could not be emailed. Please try again.',
          );
        },
      });
  }

  /** The request both the preview and the download come from. */
  public payload(): GeneratePackingSlipDto {
    const packages = this.packageCount();
    const notes = this.notes().trim();

    return {
      ...(packages && packages > 0 ? { packageCount: Math.round(packages) } : {}),
      ...(notes ? { notes: notes.slice(0, PACKING_SLIP_NOTES_MAX_LENGTH) } : {}),
      ...(this.showImperialWeights() ? { showImperialWeights: true } : {}),
      ...this.quantities.payload(),
    };
  }

  private regenerate(): void {
    const saleId = this.saleId();

    if (saleId && this.visible()) {
      this.loadPreview(saleId);
    }
  }

  private loadPreview(saleId: string): void {
    // A newer change supersedes a preview still on its way.
    this.request?.unsubscribe();
    this.generating.set(true);
    this.previewError.set(null);

    this.request = this.salesApi
      .generatePackingSlip(saleId, this.payload())
      .pipe(take(1))
      .subscribe({
        next: ({ blob, fileName }) => {
          this.releasePreview();
          this.pdfBlob = blob;
          this.pdfFileName = fileName;
          this.objectUrl = globalThis.URL.createObjectURL(blob);
          this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
          this.generating.set(false);
        },
        /* Kept open with the message, unlike the invoice: the usual cause is
           a quantity the admin can fix right here, and closing would throw
           their other changes away. */
        error: (error) => {
          this.generating.set(false);
          this.releasePreview();
          this.previewError.set(
            error?.error?.message || 'The packing slip could not be generated.',
          );
        },
      });
  }

  private optionsSignature(): string {
    return [this.packageCount() ?? '', this.notes().trim(), this.showImperialWeights()].join('|');
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
