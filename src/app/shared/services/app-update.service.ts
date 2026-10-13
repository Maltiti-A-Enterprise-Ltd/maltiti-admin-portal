import { inject, Injectable } from '@angular/core';
import { NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

/**
 * Keeps the installed app from getting stuck on a version that no longer works.
 *
 * The portal is a PWA, so a service worker caches the whole app shell. That is
 * what makes it usable on a patchy connection, but it has a failure mode that
 * looks exactly like a broken button:
 *
 *  1. a phone keeps running the cached build, because nothing here ever asked
 *     the service worker to apply an update;
 *  2. a deploy replaces every hashed chunk on the server;
 *  3. the cached build asks for a lazy chunk it no longer has — evicted, or
 *     never fetched — and the server 404s it, because that file is gone;
 *  4. the dynamic import rejects, the router raises NavigationError, and with
 *     nobody listening the tap simply does nothing. No error, no page, no clue.
 *
 * That is what "the Customers tab doesn't work" was. Reproduced by serving a
 * single 404 for the customers chunk: the URL never leaves /dashboard.
 *
 * So: recover from a missing chunk by reloading the page properly, and stop
 * the app getting that stale in the first place.
 */

/** One per engine — Chrome, Safari and Firefox each word this differently. */
const CHUNK_LOAD_FAILURE = new RegExp(
  [
    'failed to fetch dynamically imported module', // Chrome
    'error loading dynamically imported module', // Firefox
    'importing a module script failed', // Safari
    'chunkloaderror', // webpack-era builds
    "'text/html' is not a valid javascript", // a 404 served as the SPA shell
  ].join('|'),
  'i',
);

/** Remembers the URL a recovery reload was already attempted for. */
const RECOVERY_KEY = 'maltiti:recovery-reload';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly router = inject(Router);

  /** Set once a newer version is downloaded and waiting to take over. */
  private updateReady = false;

  public start(): void {
    this.recoverFromMissingChunk();
    this.clearRecoveryMarkerOnSuccess();

    if (!this.updates.isEnabled) {
      return;
    }

    this.updates.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateReady = true;
      });

    /* The cache is damaged beyond the worker's ability to repair it. Nothing
       is salvageable from this page, so take the reload now. */
    this.updates.unrecoverable.subscribe(() => this.hardLoad(this.router.url));

    this.applyUpdateOnNextNavigation();
  }

  /**
   * A full page load fetches a fresh index.html and a fresh chunk list, which
   * is the only thing that fixes a cached build pointing at files that are
   * gone. Client-side retries cannot: the import is already poisoned.
   */
  private recoverFromMissingChunk(): void {
    this.router.events
      .pipe(filter((event): event is NavigationError => event instanceof NavigationError))
      .subscribe((event) => {
        const reason = String(event.error?.message ?? event.error ?? '');

        if (CHUNK_LOAD_FAILURE.test(reason)) {
          this.hardLoad(event.url);
        }
      });
  }

  /**
   * Swap to the new version when the user changes page, rather than the moment
   * it arrives. Reloading under someone part-way through a sale would throw
   * away what they had typed; a page change is already a clean break.
   */
  private applyUpdateOnNextNavigation(): void {
    this.router.events
      .pipe(filter((event): event is NavigationStart => event instanceof NavigationStart))
      .subscribe((event) => {
        if (this.updateReady) {
          this.updateReady = false;
          this.hardLoad(event.url);
        }
      });
  }

  /**
   * Reaching the page we reloaded for means the recovery worked, so forget it
   * and let a later failure recover again.
   *
   * Matched on the URL rather than cleared on any navigation: a redirect to
   * the login page also ends a navigation, and clearing on that would re-arm
   * the reload for a page that is still broken.
   */
  private clearRecoveryMarkerOnSuccess(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (this.recalled() === event.urlAfterRedirects) {
          this.remember(null);
        }
      });
  }

  /**
   * Reload at `url`, but never twice for the same one — if a fresh copy of the
   * app still cannot reach that page, the problem is not a stale cache and a
   * reload loop would be worse than the broken link.
   */
  private hardLoad(url: string): void {
    if (this.recalled() === url) {
      return;
    }

    this.remember(url);
    window.location.assign(url);
  }

  private recalled(): string | null {
    try {
      return sessionStorage.getItem(RECOVERY_KEY);
    } catch {
      /* Private mode and locked-down browsers throw on storage access. Losing
         the guard is survivable; losing the recovery is not. */
      return null;
    }
  }

  private remember(url: string | null): void {
    try {
      if (url === null) {
        sessionStorage.removeItem(RECOVERY_KEY);
      } else {
        sessionStorage.setItem(RECOVERY_KEY, url);
      }
    } catch {
      /* As above — the guard is best-effort. */
    }
  }
}
