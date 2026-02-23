import { User } from '@models/user.model';
import { Product } from '../../products/models/product.model';

export enum PaymentStatus {
  INVOICE_REQUESTED = 'invoice_requested',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  REFUNDED = 'refunded',
  AWAITING_DELIVERY = 'awaiting_delivery',
}

export enum OrderStatus {
  PENDING = 'pending',
  PACKAGING = 'packaging',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface BatchAllocationDto {
  batchId: string;
  quantity: number;
}

export interface SaleLineItemDto {
  productId: string;
  batchAllocations: BatchAllocationDto[];
  requestedQuantity: number;
  finalPrice?: number;
  customPrice?: number;
}

export interface CreateSaleDto {
  customerId: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  lineItems: SaleLineItemDto[];
  deliveryFee?: number;
}

export interface UpdateSaleLineItemDto {
  productId?: string;
  batchAllocations?: BatchAllocationDto[];
  requestedQuantity?: number;
  customPrice?: number;
}

export interface UpdateSaleDto {
  customerId?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  lineItems?: UpdateSaleLineItemDto[];
  deliveryFee?: number;
}

export interface UpdateSaleStatusDto {
  orderStatus: OrderStatus;
}

export interface AssignBatchesDto {
  productId: string;
  batchAllocations: BatchAllocationDto[];
}

export interface GenerateInvoiceDto {
  discount?: number;
  transportation?: number;
}

export interface GenerateReceiptDto {
  paymentMethod?: string;
  discount?: number;
  transportation?: number;
}

export interface DriverDetailsDto {
  name: string;
  vehicleNumber: string;
  phoneNumber: string;
  email?: string;
}

export interface ReceiverDetailsDto {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface GenerateWaybillDto {
  driver: DriverDetailsDto;
  receiver?: ReceiverDetailsDto;
  remarks?: string;
}

export interface SaleLineItem {
  id: string;
  productId: string;
  product?: Product;
  batchAllocations: BatchAllocationDto[];
  requestedQuantity: number;
  customPrice?: number;
  finalPrice?: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  customerId: string;
  confirmedDeliveryDate?: string;
  customer?: User;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  lineItems: SaleLineItem[];
  total: number;
  amount: number;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDeliveryCostDto {
  deliveryCost: number;
}

export interface CancelSaleByAdminDto {
  waivePenalty: boolean;
  reason?: string;
}

export type PriceType = 'wholesale' | 'retail';
