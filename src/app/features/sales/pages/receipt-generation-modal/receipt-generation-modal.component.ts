/**
 * Receipt Generation Modal Component
 * Modal dialog for generating receipts with optional parameters
 * All fields are optional as per API specification
 */

import { ChangeDetectionStrategy, Component, computed, inject, output,
  signal,
} from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';

// Local imports
import { SalesApiService } from '../../services/sales-api.service';
import { GenerateReceiptDto } from '../../models/sale.model';
import { take } from 'rxjs';

import { currencySymbol } from '@shared/utils/sale-money';
import { InvoiceCurrency } from '../../models/sale.model';
@Component({
  selector: 'app-receipt-generation-modal',
  standalone: true,
  templateUrl: './receipt-generation-modal.component.html',
  styleUrls: ['./receipt-generation-modal.component.scss'],
  imports: [ReactiveFormsModule, DialogModule, InputTextModule, InputNumberModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class ReceiptGenerationModalComponent {
  /** The sale's currency, so the amounts here are labelled correctly. */
  public readonly currency = signal<InvoiceCurrency | undefined>(undefined);
  public readonly symbol = computed(() =>
    currencySymbol({ currency: this.currency() }),
  );

  private readonly fb = inject(FormBuilder);
  private readonly salesApiService = inject(SalesApiService);
  private readonly messageService = inject(MessageService);

  // Outputs
  public readonly receiptGenerated = output<void>();

  // State
  public readonly visible = signal(false);
  public readonly loading = signal(false);
  private readonly currentSaleId = signal<string | null>(null);

  // Form with all optional fields
  public receiptForm = this.fb.group({
    paymentMethod: ['Cash'],
    discount: [0, [Validators.min(0)]],
    transportation: [0, [Validators.min(0)]],
  });

  /**
   * @param currency The sale's own currency. The figures typed here are in
   *   it, so the field has to say so rather than assume cedis.
   */
  public open(saleId: string, currency?: InvoiceCurrency): void {
    this.currency.set(currency);
    this.currentSaleId.set(saleId);
    this.visible.set(true);
    this.receiptForm.reset({
      paymentMethod: 'Cash',
      discount: 0,
      transportation: 0,
    });
  }

  public close(): void {
    this.visible.set(false);
    this.receiptForm.reset();
    this.currentSaleId.set(null);
  }

  public onSubmit(): void {
    const saleId = this.currentSaleId();

    if (!saleId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No sale selected',
      });
      return;
    }

    if (this.receiptForm.valid) {
      const formValue = this.receiptForm.value;
      const receiptData: GenerateReceiptDto = {
        paymentMethod: formValue.paymentMethod || undefined,
        discount: formValue.discount || undefined,
        transportation: formValue.transportation || undefined,
      };

      this.loading.set(true);
      this.salesApiService
        .generateReceipt(saleId, receiptData)
        .pipe(take(1))
        .subscribe({
          next: (blob: Blob) => {
            // Create a download link for the PDF
            const url = globalThis.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `receipt-${saleId}-${Date.now()}.pdf`;
            link.click();
            globalThis.URL.revokeObjectURL(url);

            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Receipt generated successfully',
            });

            this.loading.set(false);
            this.receiptGenerated.emit();
            this.close();
          },
          error: (error) => {
            this.loading.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error?.error?.message || 'Failed to generate receipt',
            });
          },
        });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in valid values',
      });
    }
  }
}
