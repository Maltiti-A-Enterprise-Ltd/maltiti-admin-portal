import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { IResponse } from '@models/response.model';
import { StorageService } from '@services/storage.service';

/**
 * Refreshing the access token, once, however many requests are waiting on it.
 *
 * A page load fires several requests together — notifications, the unread
 * count, the list being opened. When the access token has expired they all
 * come back 401 at once, and each used to set off its own refresh carrying
 * the same cookie. The server rotates on the first, so the second and third
 * arrive holding a token that no longer exists, get a 401 of their own, and
 * the app concludes the session is over and signs the user out — in the
 * middle of a page that was loading perfectly well.
 *
 * So the first 401 starts a refresh and the rest wait on that same call.
 * `shareReplay` is what makes them one network request rather than three.
 */
@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private readonly http = inject(HttpClient);

  /** The refresh in flight, if there is one. */
  private inFlight: Observable<string> | null = null;

  /**
   * Resolves with a usable access token, starting a refresh only if one is
   * not already running.
   */
  public refresh(): Observable<string> {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.http
      .post<IResponse<string>>(
        `${environment.apiUrl}/authentication/refresh-token`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map(({ data }) => data),
        tap((accessToken) => {
          if (accessToken) {
            StorageService.saveToken(accessToken);
          }
        }),
        catchError((error) => {
          // Cleared here as well as in finalize: a waiting request that
          // subscribes after the failure must start a fresh attempt rather
          // than replay the error forever.
          this.inFlight = null;
          return throwError(() => error);
        }),
        finalize(() => {
          this.inFlight = null;
        }),
        // Without this, every subscriber would trigger its own POST — which
        // is the bug this class exists to fix.
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.inFlight;
  }
}
