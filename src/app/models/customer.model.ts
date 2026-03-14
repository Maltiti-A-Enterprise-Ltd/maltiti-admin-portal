export enum CustomerSortBy {
  NAME = 'name',
  CREATED_AT = 'createdAt',
  EMAIL = 'email',
  CITY = 'city',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface Customer {
  id: string;
  name: string;
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

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  country?: string;
  region?: string;
  city?: string;
  extraInfo?: string;
}

export interface UpdateCustomerDto {
  id: string;
  name?: string;
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
  country?: string;
  region?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: CustomerSortBy;
  sortOrder?: SortOrder;
}
