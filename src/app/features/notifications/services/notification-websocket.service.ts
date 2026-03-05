/**
 * WebSocket Service for Real-time Notifications
 * Manages Socket.IO connection and real-time notification events
 */

import { DestroyRef, inject, Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { io, Socket } from 'socket.io-client';
import { environment } from '@environments/environment';
import { StorageService } from '@services/storage.service';
import { NotificationPayload } from '@models/notification-payload.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationWebSocketService {
  private readonly destroyRef = inject(DestroyRef);
  private socket: Socket | null = null;
  private readonly notificationSubject = new Subject<NotificationPayload>();
  private readonly connectionStatusSubject = new BehaviorSubject<boolean>(false);

  /**
   * Observable for incoming notifications
   */
  public readonly notification$ = this.notificationSubject.asObservable();

  /**
   * Observable for connection status
   */
  public readonly connectionStatus$ = this.connectionStatusSubject.asObservable();

  /**
   * Check if socket is connected
   */
  public get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const token = StorageService.getToken();
    if (!token) {
      console.warn('[NotificationWebSocket] No token found, cannot connect');
      return;
    }

    this.socket = io(`${environment.apiUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupSocketListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatusSubject.next(false);
    }
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) {
      return;
    }

    // Connection established
    fromEvent(this.socket, 'connect')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        console.log('[NotificationWebSocket] Connected');
        this.connectionStatusSubject.next(true);
      });

    // Connection error
    fromEvent(this.socket, 'connect_error')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((error) => {
        console.error('[NotificationWebSocket] Connection error:', error);
        this.connectionStatusSubject.next(false);
      });

    // Disconnection
    fromEvent(this.socket, 'disconnect')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((reason) => {
        console.log('[NotificationWebSocket] Disconnected:', reason);
        this.connectionStatusSubject.next(false);
      });

    // Incoming notification
    fromEvent<NotificationPayload>(this.socket, 'notification')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        console.log('[NotificationWebSocket] New notification:', payload);
        this.notificationSubject.next(payload);
      });
  }
}
