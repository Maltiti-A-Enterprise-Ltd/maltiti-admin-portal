import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { FieldRendererComponent } from '@shared/components/field-renderer/field-renderer.component';
import { DialogFormSeeder } from '@shared/utils/dialog-form-seeder';
import { PaymentAccountApiService } from '../../services/payment-account-api.service';
import {
  AccountCurrency,
  MobileMoneyNetwork,
  PaymentAccount,
  PaymentAccountType,
} from '../../models/payment-account.model';
import {
  ACCOUNT_CURRENCY_OPTIONS,
  MOBILE_MONEY_NETWORK_OPTIONS,
  PAYMENT_ACCOUNT_TYPE_OPTIONS,
} from '../../constants/payment-account-options';
import { buildPaymentAccountPayload } from '../../utils/payment-account-payload';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-payment-account-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, Dialog, Button, FieldRendererComponent],
  templateUrl: './payment-account-dialog.component.html',
  styleUrl: './payment-account-dialog.component.scss',
})
export class PaymentAccountDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PaymentAccountApiService);
  private readonly messageService = inject(MessageService);

  public readonly visible = input.required<boolean>();
  public readonly account = input<PaymentAccount | null>();

  public readonly visibleChange = output<boolean>();
  public readonly saved = output<void>();

  public readonly saving = signal(false);
  public readonly errorMessage = signal<string | null>(null);

  public readonly form = this.fb.group({
    type: this.fb.control<PaymentAccountType>(PaymentAccountType.BANK, {
      validators: [Validators.required],
    }),
    accountName: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    accountNumber: this.fb.control('', {
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    currency: this.fb.control<AccountCurrency>(AccountCurrency.GHS),
    isActive: this.fb.control(true),
    includeOnInvoiceByDefault: this.fb.control(false),
    displayOrder: this.fb.control<number | null>(0),

    bankName: this.fb.control(''),
    branchName: this.fb.control(''),
    branchCode: this.fb.control(''),
    swiftCode: this.fb.control(''),
    iban: this.fb.control(''),
    bankAddress: this.fb.control(''),
    correspondentBankName: this.fb.control(''),
    correspondentSwiftCode: this.fb.control(''),
    correspondentIban: this.fb.control(''),
    correspondentBankAddress: this.fb.control(''),

    mobileMoneyNetwork: this.fb.control<MobileMoneyNetwork | null>(null),
    merchantId: this.fb.control(''),
  });

  public readonly typeOptions = PAYMENT_ACCOUNT_TYPE_OPTIONS;
  public readonly currencyOptions = ACCOUNT_CURRENCY_OPTIONS;
  public readonly networkOptions = MOBILE_MONEY_NETWORK_OPTIONS;

  public readonly isEdit = computed(() => !!this.account());
  public readonly dialogTitle = computed(() =>
    this.isEdit() ? 'Edit Payment Account' : 'Add Payment Account',
  );

  /** Which half of the form applies. Mobile money has no branch or SWIFT code. */
  public readonly isMobileMoney = signal(false);

  constructor() {
    // The bank name and the network are each required only for their own type,
    // so the validators move with it rather than being declared once.
    this.form.controls.type.valueChanges.subscribe((type) =>
      this.applyTypeRules(type ?? PaymentAccountType.BANK),
    );

    const seeder = new DialogFormSeeder();

    effect(() => {
      const visible = this.visible();
      const account = this.account();

      if (!visible) {
        seeder.markClosed();
        return;
      }

      if (!seeder.shouldSeed(account?.id ?? null)) {
        return;
      }

      this.errorMessage.set(null);

      if (account) {
        this.form.patchValue(account);
        this.applyTypeRules(account.type);
      } else {
        this.resetForm();
      }
    });
  }

  public onHide(): void {
    this.visibleChange.emit(false);
    this.resetForm();
  }

  public onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const payload = buildPaymentAccountPayload(this.form.getRawValue());
    const account = this.account();
    const request = account
      ? this.api.update(account.id, payload)
      : this.api.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: account ? 'Payment account updated' : 'Payment account added',
        });
        this.saved.emit();
        this.visibleChange.emit(false);
        this.resetForm();
      },
      error: (error) => {
        this.saving.set(false);
        // The cross-field rules live on the server, so its wording is the
        // only thing that explains what is actually wrong.
        this.errorMessage.set(
          error?.error?.message ?? 'Could not save the payment account. Please try again.',
        );
      },
    });
  }

  private applyTypeRules(type: PaymentAccountType): void {
    const mobile = type === PaymentAccountType.MOBILE_MONEY;
    this.isMobileMoney.set(mobile);

    const { bankName, mobileMoneyNetwork, currency } = this.form.controls;

    bankName.setValidators(mobile ? [] : [Validators.required]);
    mobileMoneyNetwork.setValidators(mobile ? [Validators.required] : []);
    bankName.updateValueAndValidity({ emitEvent: false });
    mobileMoneyNetwork.updateValueAndValidity({ emitEvent: false });

    // Mobile money in Ghana settles in cedis, and the API enforces it anyway —
    // showing a currency choice here would only invite a wasted round trip.
    if (mobile) {
      currency.setValue(AccountCurrency.GHS, { emitEvent: false });
    }
  }

  private resetForm(): void {
    this.form.reset({
      type: PaymentAccountType.BANK,
      currency: AccountCurrency.GHS,
      isActive: true,
      includeOnInvoiceByDefault: false,
      displayOrder: 0,
    });
    this.applyTypeRules(PaymentAccountType.BANK);
  }
}
