import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TokenRefreshService } from './token-refresh.service';
import { StorageService } from '@services/storage.service';
import { environment } from '@environments/environment';

const REFRESH_URL = `${environment.apiUrl}/authentication/refresh-token`;

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TokenRefreshService);
    http = TestBed.inject(HttpTestingController);

    spyOn(StorageService, 'saveToken');
  });

  afterEach(() => http.verify());

  /**
   * The bug this exists to fix. A page load fires several requests; when the
   * access token has expired they all 401 together. One refresh per request
   * meant the server rotated on the first, and the rest arrived holding a
   * token that no longer existed — read by the app as a dead session.
   */
  it('makes one request however many callers are waiting', () => {
    const tokens: string[] = [];

    service.refresh().subscribe((token) => tokens.push(token));
    service.refresh().subscribe((token) => tokens.push(token));
    service.refresh().subscribe((token) => tokens.push(token));

    // expectOne fails outright if a second POST was made.
    http.expectOne(REFRESH_URL).flush({ data: 'fresh-token' });

    expect(tokens).toEqual(['fresh-token', 'fresh-token', 'fresh-token']);
  });

  it('stores the new token once', () => {
    service.refresh().subscribe();
    service.refresh().subscribe();

    http.expectOne(REFRESH_URL).flush({ data: 'fresh-token' });

    expect(StorageService.saveToken).toHaveBeenCalledOnceWith('fresh-token');
  });

  it('starts a new request once the first has finished', () => {
    service.refresh().subscribe();
    http.expectOne(REFRESH_URL).flush({ data: 'first' });

    service.refresh().subscribe();
    http.expectOne(REFRESH_URL).flush({ data: 'second' });

    expect(StorageService.saveToken).toHaveBeenCalledTimes(2);
  });

  describe('when the refresh fails', () => {
    it('reports the failure to everyone waiting', () => {
      const statuses: number[] = [];

      service.refresh().subscribe({ error: (e) => statuses.push(e.status) });
      service.refresh().subscribe({ error: (e) => statuses.push(e.status) });

      http
        .expectOne(REFRESH_URL)
        .flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(statuses).toEqual([401, 401]);
    });

    // A failure must not be remembered: the next 401 deserves a real attempt,
    // not a replay of the last error.
    it('tries again on the next call rather than replaying the error', () => {
      service.refresh().subscribe({ error: () => undefined });
      http
        .expectOne(REFRESH_URL)
        .flush({}, { status: 401, statusText: 'Unauthorized' });

      let token: string | undefined;
      service.refresh().subscribe((value) => (token = value));
      http.expectOne(REFRESH_URL).flush({ data: 'recovered' });

      expect(token).toBe('recovered');
    });
  });
});
