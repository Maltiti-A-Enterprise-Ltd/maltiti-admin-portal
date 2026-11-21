import { Directive, HostListener, output } from '@angular/core';
import { clickedOnControl } from '@shared/utils/row-click';

/**
 * A table row that opens its record when clicked anywhere except on the
 * controls inside it.
 *
 * On a phone the rows are cards, and the ⋮ menu in the corner was the only
 * way into a record — a small target on a large card. `(appRowOpen)` makes
 * the whole card the way in, while its buttons and links keep working.
 */
@Directive({
  selector: '[appRowOpen]',
  standalone: true,
  host: { class: 'row-link' },
})
export class RowOpenDirective {
  public readonly appRowOpen = output<void>();

  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent): void {
    if (!clickedOnControl(event)) {
      this.appRowOpen.emit();
    }
  }
}
