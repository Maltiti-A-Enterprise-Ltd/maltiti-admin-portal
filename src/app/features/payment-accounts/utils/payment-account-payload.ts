import {
  AccountCurrency,
  MobileMoneyNetwork,
  PaymentAccountType,
  SavePaymentAccountDto,
} from '../models/payment-account.model';

/**
 * Blank optional fields are sent as an explicit `null` rather than left out:
 * TypeORM ignores `undefined` on save, so an omitted field would mean
 * "unchanged" and clearing a SWIFT code in the UI would silently do nothing.
 */
const cleared = (value: string | null | undefined): string | null =>
  value?.trim() ? value.trim() : null;

interface FormValue {
  type: PaymentAccountType | null;
  accountName: string | null;
  accountNumber: string | null;
  currency: AccountCurrency | null;
  isActive: boolean | null;
  includeOnInvoiceByDefault: boolean | null;
  displayOrder: number | null;
  bankName: string | null;
  branchName: string | null;
  branchCode: string | null;
  swiftCode: string | null;
  iban: string | null;
  bankAddress: string | null;
  correspondentBankName: string | null;
  correspondentSwiftCode: string | null;
  correspondentIban: string | null;
  correspondentBankAddress: string | null;
  mobileMoneyNetwork: MobileMoneyNetwork | null;
  merchantId: string | null;
}

export const buildPaymentAccountPayload = (
  form: FormValue,
): SavePaymentAccountDto => ({
  type: form.type ?? PaymentAccountType.BANK,
  accountName: (form.accountName ?? '').trim(),
  accountNumber: (form.accountNumber ?? '').trim(),
  currency: form.currency ?? AccountCurrency.GHS,
  isActive: form.isActive ?? true,
  includeOnInvoiceByDefault: form.includeOnInvoiceByDefault ?? false,
  displayOrder: form.displayOrder ?? 0,

  bankName: cleared(form.bankName),
  branchName: cleared(form.branchName),
  branchCode: cleared(form.branchCode),
  swiftCode: cleared(form.swiftCode),
  iban: cleared(form.iban),
  bankAddress: cleared(form.bankAddress),
  correspondentBankName: cleared(form.correspondentBankName),
  correspondentSwiftCode: cleared(form.correspondentSwiftCode),
  correspondentIban: cleared(form.correspondentIban),
  correspondentBankAddress: cleared(form.correspondentBankAddress),

  mobileMoneyNetwork: form.mobileMoneyNetwork ?? null,
  merchantId: cleared(form.merchantId),
});
