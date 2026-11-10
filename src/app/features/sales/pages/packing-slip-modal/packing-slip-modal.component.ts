/**
 * Packing Slip Modal
 *
 * Shows the packing slip before it is downloaded, and lets the admin adjust
 * it on the fly the way the invoice preview does: how many packages, notes
 * for the receiver, pounds beside kilograms, and — for a shipment that
 * carries only part of the order — how much of each line goes in it. Every
 * change rebuilds the preview, so what is downloaded is what was on screen.
 * Nothing here is written back to the sale.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription, take } from 'rxjs';
import { downloadBlob } from '@shared/utils/download-blob';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';

// Local
import { SalesApiService } from '../../services/sales-api.service';
import { SaleLineItem } from '../../models/sale.model';
import { GeneratePackingSlipDto } from '../../models/packing-slip.model';
import { PackingSlipQuantities } from '../../utils/packing-slip-quantities';

/** Matches the API's limit. */
export const PACKING_SLIP_NOTES_MAX_LENGTH = 500;

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
    ProgressSpinnerModule,
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

  /** Per-line quantities for a part shipment. */
  public readonly quantities = new PackingSlipQuantities();

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

  public open(saleId: string, lineItems: readonly SaleLineItem[] = []): void {
    this.saleId.set(saleId);
    this.packageCount.set(null);
    this.notes.set('');
    this.showImperialWeights.set(false);
    this.quantities.reset(lineItems);
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
