import { SelectOption } from '@shared/components/field-renderer/field-renderer.component';
import {
  AccountCurrency,
  MOBILE_MONEY_NETWORK_LABELS,
  MobileMoneyNetwork,
  PaymentAccountType,
} from '../models/payment-account.model';

export const PAYMENT_ACCOUNT_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Bank Account', value: PaymentAccountType.BANK },
  { label: 'Mobile Money', value: PaymentAccountType.MOBILE_MONEY },
];

export const ACCOUNT_CURRENCY_OPTIONS: SelectOption[] = [
  { label: 'Cedis (GHS)', value: AccountCurrency.GHS },
  { label: 'US Dollars (USD)', value: AccountCurrency.USD },
];

export const MOBILE_MONEY_NETWORK_OPTIONS: SelectOption[] = Object.values(
  MobileMoneyNetwork,
).map((network) => ({
  label: MOBILE_MONEY_NETWORK_LABELS[network],
  value: network,
}));
