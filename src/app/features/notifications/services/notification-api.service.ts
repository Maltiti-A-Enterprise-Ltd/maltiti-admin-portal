/**
 * Notification API Service
 * Handles REST API calls for notifications
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import {
  MarkAllAsReadResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
  PaginatedNotificationsResponse,
  UnreadCountResponse,
} from '@models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  /**
   * Get paginated notifications
   */
  public getNotifications(page = 1, limit = 20): Observable<PaginatedNotificationsResponse> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    return this.http.get<PaginatedNotificationsResponse>(this.apiUrl, { params });
  }

  /**
   * Get unread count
   */
  public getUnreadCount(): Observable<number> {
    return this.http
      .get<UnreadCountResponse>(`${this.apiUrl}/unread-count`)
      .pipe(map((response) => response.count));
  }

  /**
   * Mark notification as read
   */
  public markAsRead(notificationId: string): Observable<MarkAsReadResponse> {
    const body: MarkAsReadRequest = { notificationId };
    return this.http.post<MarkAsReadResponse>(`${this.apiUrl}/mark-as-read`, body);
  }

  /**
   * Mark all notifications as read
   */
  public markAllAsRead(): Observable<MarkAllAsReadResponse> {
    return this.http.post<MarkAllAsReadResponse>(`${this.apiUrl}/mark-all-as-read`, {});
  }
}
