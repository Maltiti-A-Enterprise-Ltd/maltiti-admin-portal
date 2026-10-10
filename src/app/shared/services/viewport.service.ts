import { DestroyRef, inject, Injectable, signal, Signal } from '@angular/core';

/** Below this the layout switches to the phone shell: bottom tabs, cards, sheets. */
export const MOBILE_BREAKPOINT_PX = 768;

/**
 * What the current viewport can do.
 *
 * `matchMedia` rather than a resize listener: the browser only notifies on an
 * actual crossing of the breakpoint, instead of firing on every pixel of a
 * drag and leaving the component to debounce it.
 *
 * Capability, never user agent — an iPad with a trackpad and a laptop with a
 * touchscreen both exist, and sniffing gets each of them wrong.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  /** True on phone-sized viewports. */
  public readonly isMobile: Signal<boolean>;

  /**
   * True when the primary pointer cannot hover — a finger. Used to withhold
   * hover affordances rather than to guess at the device.
   */
  public readonly isTouch: Signal<boolean>;

  /** True when launched from the home screen rather than a browser tab. */
  public readonly isStandalone: Signal<boolean>;

  constructor() {
    this.isMobile = this.fromMediaQuery(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    this.isTouch = this.fromMediaQuery('(hover: none) and (pointer: coarse)');
    this.isStandalone = this.fromMediaQuery('(display-mode: standalone)');
  }

  private fromMediaQuery(query: string): Signal<boolean> {
    // Server-side or test environments have no matchMedia; default to the
    // desktop layout rather than throwing.
    if (typeof window === 'undefined' || !window.matchMedia) {
      return signal(false).asReadonly();
    }

    const list = window.matchMedia(query);
    const matches = signal(list.matches);
    const onChange = (event: MediaQueryListEvent): void => matches.set(event.matches);

    list.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => list.removeEventListener('change', onChange));

    return matches.asReadonly();
  }
}
