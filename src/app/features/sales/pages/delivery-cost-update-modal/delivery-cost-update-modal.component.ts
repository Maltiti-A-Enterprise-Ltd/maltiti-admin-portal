/**
 * Delivery Cost Update Modal Component
 * Modal dialog for updating delivery cost for a sale
 */

import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';

// Local imports
import { SalesApiService } from '../../services/sales-api.service';
import { UpdateDeliveryCostDto } from '../../models/sale.model';
import { take } from 'rxjs';

@Component({
  selector: 'app-delivery-cost-update-modal',
  standalone: true,
  templateUrl: './delivery-cost-update-modal.component.html',
  styleUrls: ['./delivery-cost-update-modal.component.scss'],
  imports: [ReactiveFormsModule, DialogModule, InputNumberModule, ButtonModule],
  providers: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryCostUpdateModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly salesApiService = inject(SalesApiService);
  private readonly messageService = inject(MessageService);

  // Outputs
  public readonly deliveryCostUpdated = output<void>();

  // State
  public readonly visible = signal(false);
  public readonly loading = signal(false);
  private readonly currentSaleId = signal<string | null>(null);

  // Form
  public deliveryCostForm = this.fb.group({
    deliveryCost: [0, [Validators.required, Validators.min(0)]],
  });

  public open(saleId: string): void {
    this.currentSaleId.set(saleId);
    this.visible.set(true);
    this.deliveryCostForm.reset({
      deliveryCost: 0,
    });
  }

  public close(): void {
    this.visible.set(false);
    this.deliveryCostForm.reset();
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

    if (this.deliveryCostForm.valid) {
      const formValue = this.deliveryCostForm.value;
      const deliveryData: UpdateDeliveryCostDto = {
        deliveryCost: formValue.deliveryCost || 0,
      };

      this.loading.set(true);
      this.salesApiService
        .updateDeliveryCost(saleId, deliveryData)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Delivery cost updated successfully',
            });

            this.loading.set(false);
            this.deliveryCostUpdated.emit();
            this.close();
          },
          error: (error) => {
            this.loading.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error?.error?.message || 'Failed to update delivery cost',
            });
          },
        });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please enter a valid delivery cost',
      });
    }
  }
}
