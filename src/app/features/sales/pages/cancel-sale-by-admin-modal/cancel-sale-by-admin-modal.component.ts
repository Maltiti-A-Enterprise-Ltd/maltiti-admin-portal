/**
 * Cancel Sale By Admin Modal Component
 * Modal dialog for cancelling a sale by admin with penalty waiver option
 */

import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';

// Local imports
import { SalesApiService } from '../../services/sales-api.service';
import { CancelSaleByAdminDto } from '../../models/sale.model';
import { take } from 'rxjs';

@Component({
  selector: 'app-cancel-sale-by-admin-modal',
  standalone: true,
  templateUrl: './cancel-sale-by-admin-modal.component.html',
  styleUrls: ['./cancel-sale-by-admin-modal.component.scss'],
  imports: [ReactiveFormsModule, DialogModule, TextareaModule, CheckboxModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class CancelSaleByAdminModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly salesApiService = inject(SalesApiService);
  private readonly messageService = inject(MessageService);

  // Outputs
  public readonly saleCancelled = output<void>();

  // State
  public readonly visible = signal(false);
  public readonly loading = signal(false);
  private readonly currentSaleId = signal<string | null>(null);

  // Form
  public cancelForm = this.fb.group({
    waivePenalty: [false],
    reason: [''],
  });

  public open(saleId: string): void {
    this.currentSaleId.set(saleId);
    this.visible.set(true);
    this.cancelForm.reset({
      waivePenalty: false,
      reason: '',
    });
  }

  public close(): void {
    this.visible.set(false);
    this.cancelForm.reset();
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

    if (this.cancelForm.valid) {
      const formValue = this.cancelForm.value;
      const cancelData: CancelSaleByAdminDto = {
        waivePenalty: formValue.waivePenalty || false,
        reason: formValue.reason || undefined,
      };

      this.loading.set(true);
      this.salesApiService
        .cancelSaleByAdmin(saleId, cancelData)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Sale cancelled successfully',
            });

            this.loading.set(false);
            this.saleCancelled.emit();
            this.close();
          },
          error: (error) => {
            this.loading.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error?.error?.message || 'Failed to cancel sale',
            });
          },
        });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in the required fields',
      });
    }
  }
}
