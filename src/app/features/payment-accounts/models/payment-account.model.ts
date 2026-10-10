export enum PaymentAccountType {
  BANK = 'bank',
  MOBILE_MONEY = 'mobile_money',
}

export enum AccountCurrency {
  GHS = 'GHS',
  USD = 'USD',
}

export enum MobileMoneyNetwork {
  MTN = 'mtn',
  TELECEL = 'telecel',
  AIRTELTIGO = 'airteltigo',
}

/** How each network wants to be named, matching what the invoice prints. */
export const MOBILE_MONEY_NETWORK_LABELS: Record<MobileMoneyNetwork, string> = {
  [MobileMoneyNetwork.MTN]: 'MTN MoMo',
  [MobileMoneyNetwork.TELECEL]: 'Telecel Cash',
  [MobileMoneyNetwork.AIRTELTIGO]: 'AirtelTigo Money',
};

/** An account customers are asked to pay into. */
export interface PaymentAccount {
  id: string;
  type: PaymentAccountType;
  accountName: string;
  accountNumber: string;
  currency: AccountCurrency;
  isActive: boolean;
  includeOnInvoiceByDefault: boolean;
  displayOrder: number;

  // Bank only
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

  // Mobile money only
  mobileMoneyNetwork: MobileMoneyNetwork | null;
  merchantId: string | null;

  createdAt: string;
  updatedAt: string;
}

/**
 * `| null` on the optional fields is deliberate: emptying one must be sent as
 * an explicit null. Leaving it out means "unchanged" to the API, not
 * "cleared", because TypeORM ignores `undefined` on save.
 */
export interface SavePaymentAccountDto {
  type: PaymentAccountType;
  accountName: string;
  accountNumber: string;
  currency?: AccountCurrency;
  isActive?: boolean;
  includeOnInvoiceByDefault?: boolean;
  displayOrder?: number;

  bankName?: string | null;
  branchName?: string | null;
  branchCode?: string | null;
  swiftCode?: string | null;
  iban?: string | null;
  bankAddress?: string | null;
  correspondentBankName?: string | null;
  correspondentSwiftCode?: string | null;
  correspondentIban?: string | null;
  correspondentBankAddress?: string | null;

  mobileMoneyNetwork?: MobileMoneyNetwork | null;
  merchantId?: string | null;
}

/**
 * How an account is named in a list — the bank or network it belongs to,
 * then the number, since a business often holds several accounts in the same
 * name at the same bank.
 */
export const paymentAccountLabel = (account: PaymentAccount): string => {
  const institution =
    account.type === PaymentAccountType.MOBILE_MONEY
      ? (account.mobileMoneyNetwork
          ? MOBILE_MONEY_NETWORK_LABELS[account.mobileMoneyNetwork]
          : 'Mobile Money')
      : account.bankName || account.accountName;

  return `${institution} — ${account.accountNumber} (${account.currency})`;
};

/**
 * What the downloaded sheet is called on disk.
 *
 * Derived here rather than read from the response's `Content-Disposition`:
 * the API is on a different origin in production, and that header is not one
 * the browser exposes to script unless the server opts in.
 */
export const paymentAccountFileName = (account: PaymentAccount): string => {
  const institution = paymentAccountLabel(account).split(' — ')[0];

  const slug = `${institution}-${account.accountNumber}`
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `payment-details-${slug || 'account'}.pdf`;
};
