import { SaleAttention } from '../models/sale-attention.model';
import { createAction, props } from '@ngrx/store';
import {
  CreateSaleDto,
  OrderStatus,
  PaymentStatus,
  Sale,
  UpdateSaleDto,
} from '../models/sale.model';
import { IPaginationResponse } from '@models/response.model';

export const loadSales = createAction(
  '[Sales] Load Sales',
  props<{
    page?: number;
    limit?: number;
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    customerId?: string;
    customerName?: string;
    /** Only sales waiting on us, as assessed server-side. */
    needsAttention?: boolean;
    /** Only sales an admin flagged by hand. Combines with the above. */
    flagged?: boolean;
    /** Only sales in one attention bucket, e.g. paid but not delivered. */
    attention?: SaleAttention;
  }>(),
);

export const loadSalesSuccess = createAction(
  '[Sales] Load Sales Success',
  props<{ response: IPaginationResponse<Sale> }>(),
);

export const loadSalesFailure = createAction(
  '[Sales] Load Sales Failure',
  props<{ error: string }>(),
);

export const loadSale = createAction('[Sales] Load Sale', props<{ id: string }>());

export const loadSaleSuccess = createAction('[Sales] Load Sale Success', props<{ sale: Sale }>());

export const loadSaleFailure = createAction(
  '[Sales] Load Sale Failure',
  props<{ error: string }>(),
);

export const createSale = createAction('[Sales] Create Sale', props<{ saleData: CreateSaleDto }>());

export const createSaleSuccess = createAction(
  '[Sales] Create Sale Success',
  props<{ sale: Sale }>(),
);

export const createSaleFailure = createAction(
  '[Sales] Create Sale Failure',
  props<{ error: string }>(),
);

export const updateSale = createAction(
  '[Sales] Update Sale',
  props<{ id: string; saleData: UpdateSaleDto }>(),
);

export const updateSaleSuccess = createAction(
  '[Sales] Update Sale Success',
  props<{ sale: Sale }>(),
);

export const updateSaleFailure = createAction(
  '[Sales] Update Sale Failure',
  props<{ error: string }>(),
);

export const updateSaleStatus = createAction(
  '[Sales] Update Sale Status',
  props<{ id: string; orderStatus: OrderStatus; notifyCustomer?: boolean }>(),
);

export const updateSaleStatusSuccess = createAction(
  '[Sales] Update Sale Status Success',
  props<{ sale: Sale }>(),
);

export const updateSaleStatusFailure = createAction(
  '[Sales] Update Sale Status Failure',
  props<{ error: string }>(),
);

export const clearCurrentSale = createAction('[Sales] Clear Current Sale');

export const clearError = createAction('[Sales] Clear Error');
