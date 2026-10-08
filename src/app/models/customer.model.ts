export enum CustomerSortBy {
  NAME = 'name',
  ORGANIZATION_NAME = 'organizationName',
  CREATED_AT = 'createdAt',
  EMAIL = 'email',
  CITY = 'city',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * A customer is identified by a contact `name`, an `organizationName`, or both —
 * at least one is always set. Resolve labels via `@shared/utils/customer-name`
 * rather than reading `name` directly.
 */
export interface Customer {
  id: string;
  name?: string;
  organizationName?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  country?: string;
  region?: string;
  city?: string;
  extraInfo?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** At least one of `name` / `organizationName` must be supplied. */
export interface CreateCustomerDto {
  name?: string;
  organizationName?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  country?: string;
  region?: string;
  city?: string;
  extraInfo?: string;
}

/** Partial update; sending `''` clears a field. The merged record must still
 * carry at least one of `name` / `organizationName`. */
export interface UpdateCustomerDto {
  id: string;
  name?: string;
  organizationName?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  country?: string;
  region?: string;
  city?: string;
  extraInfo?: string;
}

export interface CustomerQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  email?: string;
  phone?: string;
  organizationName?: string;
  country?: string;
  region?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: CustomerSortBy;
  sortOrder?: SortOrder;
}
