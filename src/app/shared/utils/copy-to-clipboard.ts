/**
 * Putting a value on the clipboard, wherever the portal happens to be open.
 *
 * `navigator.clipboard` is the right API and is not always there: it is
 * undefined outside a secure context, and on iOS Safari — which is where the
 * portal mostly lives — `writeText` rejects unless it is called inside the
 * user gesture that asked for it. Both failures are silent from the caller's
 * point of view, which is the worst possible outcome for a copy button: the
 * admin pastes whatever was on the clipboard before and does not find out
 * until it is in an email.
 *
 * So this reports whether it worked, and the button says so. The fallback is
 * the old hidden-textarea trick, which still works in the http and
 * older-Safari cases the modern API refuses.
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  const text = value?.trim();

  if (!text) {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);

      return true;
    }
  } catch {
    /* Fall through — a rejection here is exactly what the fallback is for. */
  }

  return legacyCopy(text);
}

/**
 * Pre-`navigator.clipboard`, and still the only thing that works over plain
 * http. Off-screen rather than `display: none`, because a hidden element
 * cannot be selected and the copy would quietly do nothing.
 */
function legacyCopy(text: string): boolean {
  const field = document.createElement('textarea');

  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.top = '-1000px';
  field.style.opacity = '0';
  document.body.appendChild(field);

  try {
    field.select();

    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(field);
  }
}
