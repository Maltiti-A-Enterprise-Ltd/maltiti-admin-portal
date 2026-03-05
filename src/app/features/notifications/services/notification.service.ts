/**
 * Notification Service
 * Main service that orchestrates API calls, WebSocket, and state management
 */

import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, of, Subject, tap } from 'rxjs';
import { NotificationApiService, NotificationWebSocketService } from '@features/notifications';
import { Notification, NotificationTopic } from '@models/notification.model';
import {
  AdminNewOrderPayload,
  NotificationPayload,
  OrderStatusUpdatedPayload,
  ProductBackInStockPayload,
  ProductOutOfStockPayload,
  ProductPriceChangedPayload,
} from '@models/notification-payload.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly apiService = inject(NotificationApiService);
  private readonly wsService = inject(NotificationWebSocketService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // State signals
  private readonly notificationsSignal = signal<Notification[]>([]);
  private readonly unreadCountSignal = signal<number>(0);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly currentPageSignal = signal<number>(1);
  private readonly hasMoreSignal = signal<boolean>(true);

  // Public computed signals
  public readonly notifications = this.notificationsSignal.asReadonly();
  public readonly unreadCount = this.unreadCountSignal.asReadonly();
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly hasMore = this.hasMoreSignal.asReadonly();

  // Event emitters for realtime UI updates
  private readonly orderStatusUpdated$ = new Subject<OrderStatusUpdatedPayload>();
  private readonly productPriceChanged$ = new Subject<ProductPriceChangedPayload>();
  private readonly productStockChanged$ = new Subject<
    ProductOutOfStockPayload | ProductBackInStockPayload
  >();
  private readonly newOrder$ = new Subject<AdminNewOrderPayload>();

  // Public observables
  public readonly orderStatusUpdated = this.orderStatusUpdated$.asObservable();
  public readonly productPriceChanged = this.productPriceChanged$.asObservable();
  public readonly productStockChanged = this.productStockChanged$.asObservable();
  public readonly newOrder = this.newOrder$.asObservable();

  constructor() {
    this.initializeWebSocket();
  }

  /**
   * Initialize WebSocket connection and listeners
   */
  private initializeWebSocket(): void {
    this.wsService.connect();

    // Listen for incoming notifications
    this.wsService.notification$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((payload) => {
      this.handleIncomingNotification(payload);
    });
  }

  /**
   * Load initial notifications
   */
  public loadNotifications(page = 1, limit = 20): void {
    this.loadingSignal.set(true);

    this.apiService
      .getNotifications(page, limit)
      .pipe(
        tap((response) => {
          if (page === 1) {
            this.notificationsSignal.set(response.notifications);
          } else {
            this.notificationsSignal.update((current) => [...current, ...response.notifications]);
          }
          this.unreadCountSignal.set(response.unreadCount);
          this.currentPageSignal.set(response.page);
          this.hasMoreSignal.set(response.hasMore);
          this.loadingSignal.set(false);
        }),
        catchError((error) => {
          console.error('[NotificationService] Error loading notifications:', error);
          this.loadingSignal.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /**
   * Load more notifications (infinite scroll)
   */
  public loadMore(): void {
    if (!this.hasMoreSignal() || this.loadingSignal()) {
      return;
    }

    const nextPage = this.currentPageSignal() + 1;
    this.loadNotifications(nextPage);
  }

  /**
   * Refresh unread count
   */
  public refreshUnreadCount(): void {
    this.apiService
      .getUnreadCount()
      .pipe(
        tap((count) => {
          this.unreadCountSignal.set(count);
        }),
        catchError((error) => {
          console.error('[NotificationService] Error refreshing unread count:', error);
          return of(0);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /**
   * Mark notification as read
   */
  public markAsRead(notificationId: string): void {
    this.apiService
      .markAsRead(notificationId)
      .pipe(
        tap(() => {
          this.notificationsSignal.update((notifications) =>
            notifications.map((n) =>
              n.id === notificationId
                ? { ...n, isRead: true, readAt: new Date().toISOString() }
                : n,
            ),
          );
          this.unreadCountSignal.update((count) => Math.max(0, count - 1));
        }),
        catchError((error) => {
          console.error('[NotificationService] Error marking as read:', error);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /**
   * Mark all notifications as read
   */
  public markAllAsRead(): void {
    this.apiService
      .markAllAsRead()
      .pipe(
        tap(() => {
          this.notificationsSignal.update((notifications) =>
            notifications.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
          );
          this.unreadCountSignal.set(0);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'All notifications marked as read',
          });
        }),
        catchError((error) => {
          console.error('[NotificationService] Error marking all as read:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to mark all as read',
          });
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  /**
   * Handle incoming WebSocket notification
   */
  private handleIncomingNotification(payload: NotificationPayload): void {
    console.log('We got new notification', payload);
    // Create notification object from payload
    const notification: Notification = {
      id: crypto.randomUUID(), // Temporary ID until we get the real one from backend
      userId: payload.userId,
      topic: payload.topic,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      payload: payload as unknown as Record<string, unknown>,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to notifications list (prepend)
    this.notificationsSignal.update((notifications) => [notification, ...notifications]);

    // Increment unread count
    this.unreadCountSignal.update((count) => count + 1);

    // Show toast notification
    this.showToast(payload);

    // Emit realtime events for UI updates
    this.emitRealtimeEvent(payload);
  }

  /**
   * Emit realtime event based on notification topic
   */
  private emitRealtimeEvent(payload: NotificationPayload): void {
    switch (payload.topic) {
      case NotificationTopic.ORDER_STATUS_UPDATED:
        this.orderStatusUpdated$.next(payload);
        break;
      case NotificationTopic.PRODUCT_PRICE_CHANGED:
        this.productPriceChanged$.next(payload);
        break;
      case NotificationTopic.PRODUCT_OUT_OF_STOCK:
        this.productStockChanged$.next(payload);
        break;
      case NotificationTopic.PRODUCT_BACK_IN_STOCK:
        this.productStockChanged$.next(payload);
        break;
      case NotificationTopic.ADMIN_NEW_ORDER:
        this.newOrder$.next(payload);
        break;
      // Add more cases as needed
    }
  }

  /**
   * Show toast notification for incoming notification
   */
  private showToast(payload: NotificationPayload): void {
    const severity = this.getSeverityFromTopic(payload.topic);

    this.messageService.add({
      severity,
      summary: payload.title,
      detail: payload.message,
      life: 5000,
    });
  }

  /**
   * Get severity for PrimeNG toast based on notification topic
   */
  private getSeverityFromTopic(topic: NotificationTopic): 'success' | 'info' | 'warn' | 'error' {
    const errorTopics = [
      NotificationTopic.PAYMENT_FAILED,
      NotificationTopic.ORDER_CANCELLED,
      NotificationTopic.ADMIN_ORDER_CANCELLED,
      NotificationTopic.PRODUCT_OUT_OF_STOCK,
    ];

    const warningTopics = [
      NotificationTopic.ADMIN_LOW_STOCK_ALERT,
      NotificationTopic.SYSTEM_MAINTENANCE,
    ];

    const successTopics = [
      NotificationTopic.ORDER_DELIVERED,
      NotificationTopic.PAYMENT_RECEIVED,
      NotificationTopic.REFUND_PROCESSED,
      NotificationTopic.PRODUCT_BACK_IN_STOCK,
      NotificationTopic.REVIEW_APPROVED,
    ];

    if (errorTopics.includes(topic)) {
      return 'error';
    }
    if (warningTopics.includes(topic)) {
      return 'warn';
    }
    if (successTopics.includes(topic)) {
      return 'success';
    }
    return 'info';
  }

  /**
   * Navigate to notification link
   */
  public navigateToNotification(notification: Notification): void {
    // Mark as read first if unread
    if (!notification.isRead) {
      this.markAsRead(notification.id);
    }

    // Navigate to the link
    if (notification.link) {
      void this.router.navigateByUrl(notification.link);
    }
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    this.wsService.disconnect();
  }
}
