/**
 * Whether a click on a table row landed on a control inside it — a button,
 * a link, a field, the actions cell or a menu — rather than on the row.
 *
 * Rows that open their record on click use this so the controls inside them
 * keep doing their own thing.
 */
export function clickedOnControl(event: Event): boolean {
  const target = event.target as HTMLElement | null;

  return Boolean(target?.closest('button, a, input, .cell-actions, .p-menu'));
}
