import { NotificationTopic } from './notification.model';
interface BaseNotificationPayload {
  readonly topic: NotificationTopic;
  readonly userId: string;
  readonly title: string;
  readonly message: string;
  readonly link: string;
}
export interface OrderCreatedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ORDER_CREATED;
  readonly orderId: string;
  readonly totalAmount: number;
  readonly orderDate: string;
}
export interface OrderStatusUpdatedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ORDER_STATUS_UPDATED;
  readonly orderId: string;
  readonly oldStatus: string;
  readonly newStatus: string;
  readonly paymentStatus?: string;
}
export interface OrderCancelledPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ORDER_CANCELLED;
  readonly orderId: string;
  readonly cancellationReason?: string;
  readonly refundAmount?: number;
  readonly cancelledBy: 'customer' | 'admin';
}
export interface OrderDeliveredPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ORDER_DELIVERED;
  readonly orderId: string;
  readonly deliveryDate: string;
}
export interface PaymentReceivedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PAYMENT_RECEIVED;
  readonly orderId: string;
  readonly amount: number;
  readonly paymentMethod: string;
  readonly transactionId?: string;
}
export interface PaymentFailedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PAYMENT_FAILED;
  readonly orderId: string;
  readonly amount: number;
  readonly reason: string;
}
export interface RefundProcessedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.REFUND_PROCESSED;
  readonly orderId: string;
  readonly refundAmount: number;
  readonly refundMethod: string;
}
export interface ProductCreatedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PRODUCT_CREATED;
  readonly productId: string;
  readonly productName: string;
  readonly productImage?: string;
  readonly category?: string;
  readonly price?: number;
}
export interface ProductPriceChangedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PRODUCT_PRICE_CHANGED;
  readonly productId: string;
  readonly productName: string;
  readonly oldPrice: number;
  readonly newPrice: number;
  readonly priceDecreased: boolean;
}
export interface ProductOutOfStockPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PRODUCT_OUT_OF_STOCK;
  readonly productId: string;
  readonly productName: string;
}
export interface ProductBackInStockPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.PRODUCT_BACK_IN_STOCK;
  readonly productId: string;
  readonly productName: string;
  readonly currentStock: number;
}
export interface UserAccountCreatedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.USER_ACCOUNT_CREATED;
  readonly userName: string;
  readonly userType: string;
}
export interface UserEmailVerifiedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.USER_EMAIL_VERIFIED;
  readonly verificationDate: string;
}
export interface UserPasswordResetPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.USER_PASSWORD_RESET;
  readonly resetToken: string;
  readonly expiresAt: string;
}
export interface UserProfileUpdatedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.USER_PROFILE_UPDATED;
  readonly updatedFields: string[];
}
export interface AdminNewOrderPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ADMIN_NEW_ORDER;
  readonly orderId: string;
  readonly customerName: string;
  readonly totalAmount: number;
  readonly orderDate: string;
}
export interface AdminOrderCancelledPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ADMIN_ORDER_CANCELLED;
  readonly orderId: string;
  readonly customerName: string;
  readonly cancellationReason?: string;
  readonly cancelledBy: 'customer' | 'admin';
}
export interface AdminContactFormSubmittedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ADMIN_CONTACT_FORM_SUBMITTED;
  readonly senderName: string;
  readonly senderEmail: string;
  readonly subject: string;
}
export interface AdminLowStockAlertPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.ADMIN_LOW_STOCK_ALERT;
  readonly productId: string;
  readonly productName: string;
  readonly currentStock: number;
  readonly minimumStock: number;
}
export interface ReviewSubmittedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.REVIEW_SUBMITTED;
  readonly reviewId: string;
  readonly productId: string;
  readonly productName: string;
  readonly rating: number;
}
export interface ReviewApprovedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.REVIEW_APPROVED;
  readonly reviewId: string;
  readonly productId: string;
  readonly productName: string;
}
export interface ReviewRejectedPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.REVIEW_REJECTED;
  readonly reviewId: string;
  readonly productId: string;
  readonly productName: string;
  readonly reason?: string;
}
export interface SystemMaintenancePayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.SYSTEM_MAINTENANCE;
  readonly scheduledDate: string;
  readonly estimatedDuration: string;
}
export interface SystemAnnouncementPayload extends BaseNotificationPayload {
  readonly topic: NotificationTopic.SYSTEM_ANNOUNCEMENT;
  readonly announcementType: 'info' | 'warning' | 'success';
  readonly expiresAt?: string;
}
export type NotificationPayload =
  | OrderCreatedPayload
  | OrderStatusUpdatedPayload
  | OrderCancelledPayload
  | OrderDeliveredPayload
  | PaymentReceivedPayload
  | PaymentFailedPayload
  | RefundProcessedPayload
  | ProductCreatedPayload
  | ProductPriceChangedPayload
  | ProductOutOfStockPayload
  | ProductBackInStockPayload
  | UserAccountCreatedPayload
  | UserEmailVerifiedPayload
  | UserPasswordResetPayload
  | UserProfileUpdatedPayload
  | AdminNewOrderPayload
  | AdminOrderCancelledPayload
  | AdminContactFormSubmittedPayload
  | AdminLowStockAlertPayload
  | ReviewSubmittedPayload
  | ReviewApprovedPayload
  | ReviewRejectedPayload
  | SystemMaintenancePayload
  | SystemAnnouncementPayload;
