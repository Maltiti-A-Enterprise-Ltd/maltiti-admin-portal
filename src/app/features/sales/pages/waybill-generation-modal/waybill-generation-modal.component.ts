/**
 * Waybill Generation Modal Component
 * Modal dialog for generating waybills with driver and optional receiver details
 * Driver details are required, receiver details are optional (falls back to customer)
 */

import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { take } from 'rxjs';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';

// Local imports
import { SalesApiService } from '../../services/sales-api.service';
import { GenerateWaybillDto } from '../../models/sale.model';

@Component({
  selector: 'app-waybill-generation-modal',
  standalone: true,
  templateUrl: './waybill-generation-modal.component.html',
  styleUrls: ['./waybill-generation-modal.component.scss'],
  imports: [
    ReactiveFormsModule,
    DialogModule,
    InputTextModule,
    Textarea,
    ButtonModule,
    DividerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class WaybillGenerationModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly salesApiService = inject(SalesApiService);
  private readonly messageService = inject(MessageService);

  // Outputs
  public readonly waybillGenerated = output<void>();

  // State
  public readonly visible = signal(false);
  public readonly loading = signal(false);
  private readonly currentSaleId = signal<string | null>(null);

  // Form with required driver details and optional receiver details
  public waybillForm = this.fb.group({
    // Driver details (required)
    driverName: ['', [Validators.required]],
    vehicleNumber: ['', [Validators.required]],
    driverPhone: ['', [Validators.required]],
    driverEmail: ['', [Validators.email]],

    // Receiver details (optional - falls back to customer)
    receiverName: [''],
    receiverPhone: [''],
    receiverEmail: ['', [Validators.email]],
    receiverAddress: [''],

    // Remarks (optional)
    remarks: ['All In Good Condition'],
  });

  public open(saleId: string): void {
    this.currentSaleId.set(saleId);
    this.visible.set(true);
    this.waybillForm.reset({
      driverName: '',
      vehicleNumber: '',
      driverPhone: '',
      driverEmail: '',
      receiverName: '',
      receiverPhone: '',
      receiverEmail: '',
      receiverAddress: '',
      remarks: 'All In Good Condition',
    });
  }

  public close(): void {
    this.visible.set(false);
    this.waybillForm.reset();
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

    if (this.waybillForm.valid) {
      const formValue = this.waybillForm.value;

      const waybillData: GenerateWaybillDto = {
        driver: {
          name: formValue.driverName!,
          vehicleNumber: formValue.vehicleNumber!,
          phoneNumber: formValue.driverPhone!,
          email: formValue.driverEmail || undefined,
        },
        remarks: formValue.remarks || undefined,
      };

      // Only include receiver if at least name and phone are provided
      if (formValue.receiverName && formValue.receiverPhone) {
        waybillData.receiver = {
          name: formValue.receiverName,
          phone: formValue.receiverPhone,
          email: formValue.receiverEmail || undefined,
          address: formValue.receiverAddress || undefined,
        };
      }

      this.loading.set(true);
      this.salesApiService
        .generateWaybill(saleId, waybillData)
        .pipe(take(1))
        .subscribe({
          next: (blob: Blob) => {
            // Create a download link for the PDF
            const url = globalThis.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `waybill-${saleId}-${Date.now()}.pdf`;
            link.click();
            globalThis.URL.revokeObjectURL(url);

            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Waybill generated successfully',
            });

            this.loading.set(false);
            this.waybillGenerated.emit();
            this.close();
          },
          error: (error) => {
            this.loading.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error?.error?.message || 'Failed to generate waybill',
            });
          },
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.waybillForm.controls).forEach((key) => {
        const control = this.waybillForm.get(key);
        control?.markAsTouched();
      });

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required driver details',
      });
    }
  }
}
