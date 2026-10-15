import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { copyToClipboard } from '@shared/utils/copy-to-clipboard';

/** How long the tick stays up. Long enough to notice, short enough to forget. */
const FEEDBACK_MS = 1600;

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * A small button that puts the value beside it on the clipboard.
 *
 * Admins read a phone number or an email off a row and retype it into
 * WhatsApp or an email client, which is where a transposed digit gets into a
 * conversation with a customer. Selecting it by hand is worse on a phone,
 * where the portal mostly lives — a long press selects the whole cell.
 *
 * The result is always shown. A copy that silently failed is the one failure
 * mode that really hurts: the admin pastes whatever was on the clipboard
 * before and does not find out until it has been sent.
 */
@Component({
  selector: 'app-copy-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TooltipModule],
  template: `
    <!-- Nothing to copy, nothing to show. Hiding itself rather than making
         every caller wrap it in an @if keeps the decision in one place, and
         spares the callers a branch each. -->
    @if (hasValue()) {
      <button
        class="copy-button"
        tooltipPosition="top"
        type="button"
        [attr.aria-label]="ariaLabel()"
        [class.is-copied]="state() === 'copied'"
        [class.is-failed]="state() === 'failed'"
        [pTooltip]="tooltip()"
        (click)="copy($event)"
      >
        <i aria-hidden="true" [class]="icon()"></i>
      </button>
      <!-- Announced rather than only drawn: the tick is the entire feedback,
           and a screen reader would otherwise get nothing at all. -->
      <span aria-live="polite" class="sr-only">{{ announcement() }}</span>
    }
  `,
  styleUrl: './copy-button.component.scss',
})
export class CopyButtonComponent {
  private readonly destroyRef = inject(DestroyRef);

  /** The text to copy. The button hides itself when there is none. */
  public readonly value = input<string | null | undefined>('');

  /** What this is, for the tooltip and the label: "email", "phone number". */
  public readonly label = input<string>('value');

  public readonly state = signal<CopyState>('idle');

  /** Whether there is anything worth offering to copy. */
  public readonly hasValue = computed(() => !!this.value()?.trim());

  public readonly icon = computed(() => {
    const state = this.state();

    if (state === 'copied') {
      return 'pi pi-check';
    }

    return state === 'failed' ? 'pi pi-exclamation-triangle' : 'pi pi-copy';
  });

  public readonly tooltip = computed(() => {
    const state = this.state();

    if (state === 'copied') {
      return 'Copied';
    }

    return state === 'failed' ? 'Could not copy — select it by hand' : `Copy ${this.label()}`;
  });

  public readonly ariaLabel = computed(() => `Copy ${this.label()}`);

  /** Empty while idle so it is not read out on every change detection. */
  public readonly announcement = computed(() => {
    const state = this.state();

    if (state === 'copied') {
      return `${this.label()} copied`;
    }

    return state === 'failed' ? `Could not copy the ${this.label()}` : '';
  });

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
  }

  public async copy(event: Event): Promise<void> {
    /* The button sits inside table rows and links that have their own click
       handlers; copying an address must not also open the row. */
    event.stopPropagation();
    event.preventDefault();

    const copied = await copyToClipboard(this.value() ?? '');

    this.state.set(copied ? 'copied' : 'failed');

    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.state.set('idle'), FEEDBACK_MS);
  }
}
