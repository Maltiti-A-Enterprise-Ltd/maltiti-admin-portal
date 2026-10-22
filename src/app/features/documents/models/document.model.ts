/**
 * The company's document register.
 *
 * The files themselves live in Microsoft 365 — the register knows which
 * documents exist, what state they are in and where to find them. A renewed
 * certificate becomes a new *version* rather than overwriting the last link,
 * because proving what was valid on a past date is the whole reason this
 * paperwork is kept.
 */

export enum DocumentCategory {
  CERTIFICATION = 'certification',
  LICENCE = 'licence',
  PERMIT = 'permit',
  CONTRACT = 'contract',
  REGISTRATION = 'registration',
  POLICY = 'policy',
  TEMPLATE = 'template',
  FINANCIAL = 'financial',
  OTHER = 'other',
}

export enum DocumentSource {
  MICROSOFT_365 = 'microsoft_365',
  S3 = 's3',
  EXTERNAL = 'external',
}

/**
 * How a document stands against its expiry date.
 *
 * `NO_EXPIRY` is not "valid forever" — the question simply does not apply,
 * and saying so plainly beats a green tick that means nothing.
 */
export enum DocumentExpiryState {
  NO_EXPIRY = 'no_expiry',
  VALID = 'valid',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
}

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.CERTIFICATION]: 'Certification',
  [DocumentCategory.LICENCE]: 'Licence',
  [DocumentCategory.PERMIT]: 'Permit',
  [DocumentCategory.CONTRACT]: 'Contract',
  [DocumentCategory.REGISTRATION]: 'Registration',
  [DocumentCategory.POLICY]: 'Policy',
  [DocumentCategory.TEMPLATE]: 'Template',
  [DocumentCategory.FINANCIAL]: 'Financial',
  [DocumentCategory.OTHER]: 'Other',
};

export const DOCUMENT_SOURCE_LABELS: Record<DocumentSource, string> = {
  [DocumentSource.MICROSOFT_365]: 'Microsoft 365',
  [DocumentSource.S3]: 'Our storage',
  [DocumentSource.EXTERNAL]: 'External link',
};

export interface DocumentVersion {
  id: string;
  /** 1 upwards, per document. Shown as "v3". */
  versionNumber: number;
  url: string;
  source: DocumentSource;
  note: string | null;
  /** Resolved server-side, so it survives the uploader's account being removed. */
  uploadedByName: string | null;
  createdAt: string;
}

export interface CompanyDocument {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  issuer: string | null;
  referenceNumber: string | null;
  /** A plain day, e.g. `2027-03-31`. Null when it never expires. */
  expiresAt: string | null;
  /** Null means the daily report never mentions it. */
  reminderLeadDays: number | null;
  isActive: boolean;
  /** Worked out server-side, so nothing here can disagree about it. */
  expiryState: DocumentExpiryState;
  /** Negative once past. Null when there is no expiry date. */
  daysUntilExpiry: number | null;
  currentVersion: DocumentVersion | null;
  versionCount: number;
  /** Only present when a single document is read, not in the list. */
  versions?: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
}

// ─── Request bodies ───────────────────────────────────────────────────────────

/** A new copy of a document. */
export interface DocumentVersionBody {
  url: string;
  source?: DocumentSource;
  note?: string;
}

export interface CreateDocumentDto {
  title: string;
  description?: string;
  category: DocumentCategory;
  issuer?: string;
  referenceNumber?: string;
  expiresAt?: string | null;
  reminderLeadDays?: number | null;
  version: DocumentVersionBody;
}

/**
 * Everything about the record, nothing about the file.
 *
 * Replacing the file is its own call, so a renewal always leaves the copy it
 * replaced behind. Null clears a value; an omitted field is left alone.
 */
export interface UpdateDocumentDto {
  title?: string;
  description?: string;
  category?: DocumentCategory;
  issuer?: string;
  referenceNumber?: string;
  expiresAt?: string | null;
  reminderLeadDays?: number | null;
  isActive?: boolean;
}

export interface ListDocumentsQuery {
  search?: string;
  category?: DocumentCategory;
  expiringOnly?: boolean;
  activeOnly?: boolean;
}
