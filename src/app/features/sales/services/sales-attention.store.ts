import { computed, inject, Injectable, signal } from '@angular/core';
import { first } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SalesApiService } from './sales-api.service';
import { Sale, SaleAttentionSummary } from '../models/sale.model';
import {
  AttentionChipKey,
  buildAttentionChips,
  EMPTY_ATTENTION_SUMMARY,
} from '../utils/attention-chips';

/**
 * The "which sales need looking at" state behind the sales list.
 *
 * Kept out of the list component because that file is already at its
 * 400-line ceiling, and because the chips, their counts and the flag action
 * are one concern that happens to be rendered in two places.
 */
@Injectable({ providedIn: 'root' })
export class SalesAttentionStore {
  private readonly salesApi = inject(SalesApiService);
  private readonly messageService = inject(MessageService);

  private readonly summary = signal<SaleAttentionSummary>(EMPTY_ATTENTION_SUMMARY);

  /**
   * Which chips are switched on.
   *
   * Several at once narrows rather than widens, matching how the API combines
   * them — "needs attention" and "flagged" together means both, not either.
   */
  public readonly activeChips = signal<AttentionChipKey[]>([]);

  public readonly chips = computed(() => buildAttentionChips(this.summary()));

  public isActive(key: AttentionChipKey): boolean {
    return this.activeChips().includes(key);
  }

  public toggleChip(key: AttentionChipKey): void {
    this.activeChips.update((active) =>
      active.includes(key) ? active.filter((k) => k !== key) : [...active, key],
    );
  }

  /** The counts move whenever a flag or a status does, so this is re-run after both. */
  public refresh(): void {
    this.salesApi
      .getAttentionSummary()
      .pipe(first())
      .subscribe({
        /* A failed count is not worth interrupting anyone over — the list
           itself still works, the chips just read zero. */
        next: (summary) => this.summary.set(summary),
      });
  }

  /**
   * Set or clear an admin's flag.
   *
   * `onDone` reloads the list, so the row marker and the counts cannot
   * disagree with each other after a change.
   */
  public toggleFlag(sale: Pick<Sale, 'id' | 'flaggedAt'>, onDone: () => void): void {
    const clearing = !!sale.flaggedAt;

    this.salesApi
      .setSaleFlag(sale.id, { flagged: !clearing })
      .pipe(first())
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: clearing ? 'Flag removed' : 'Flagged for attention',
            detail: clearing
              ? 'This sale no longer appears under Flagged.'
              : 'This sale now appears under Flagged.',
          });
          this.refresh();
          onDone();
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Could not change the flag',
            detail: 'Please try again.',
          }),
      });
  }
}
