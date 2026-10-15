import { copyToClipboard } from './copy-to-clipboard';

/**
 * The failure modes are the point. `navigator.clipboard` is undefined over
 * plain http and rejects on older iOS Safari, and in both cases the admin
 * pastes whatever was on the clipboard before — so what matters is that this
 * reports honestly rather than appearing to work.
 */
describe('copyToClipboard', () => {
  const withClipboard = (writeText: jasmine.Spy | undefined): void => {
    Object.defineProperty(navigator, 'clipboard', {
      value: writeText ? { writeText } : undefined,
      configurable: true,
    });
  };

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
  });

  it('writes the value and reports success', async () => {
    const writeText = jasmine.createSpy('writeText').and.resolveTo();
    withClipboard(writeText);

    await expectAsync(copyToClipboard('0244123456')).toBeResolvedTo(true);
    expect(writeText).toHaveBeenCalledWith('0244123456');
  });

  /* Trailing whitespace off a table cell would be pasted into a tel: field
     or a mail client, where it is at best ugly and at worst invalid. */
  it('trims what it copies', async () => {
    const writeText = jasmine.createSpy('writeText').and.resolveTo();
    withClipboard(writeText);

    await copyToClipboard('  ama@example.com \n');

    expect(writeText).toHaveBeenCalledWith('ama@example.com');
  });

  it('refuses an empty value rather than clearing the clipboard', async () => {
    const writeText = jasmine.createSpy('writeText').and.resolveTo();
    withClipboard(writeText);

    await expectAsync(copyToClipboard('   ')).toBeResolvedTo(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('refuses a null value', async () => {
    await expectAsync(
      copyToClipboard(null as unknown as string),
    ).toBeResolvedTo(false);
  });

  /* iOS Safari rejects `writeText` outside the gesture that asked for it. */
  it('falls back when the clipboard API rejects', async () => {
    withClipboard(jasmine.createSpy('writeText').and.rejectWith(new Error('denied')));
    const exec = spyOn(document, 'execCommand').and.returnValue(true);

    await expectAsync(copyToClipboard('fallback')).toBeResolvedTo(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  /* The API is simply absent outside a secure context. */
  it('falls back when there is no clipboard API at all', async () => {
    withClipboard(undefined);
    const exec = spyOn(document, 'execCommand').and.returnValue(true);

    await expectAsync(copyToClipboard('fallback')).toBeResolvedTo(true);
    expect(exec).toHaveBeenCalled();
  });

  it('reports failure when the fallback fails too', async () => {
    withClipboard(undefined);
    spyOn(document, 'execCommand').and.returnValue(false);

    await expectAsync(copyToClipboard('nope')).toBeResolvedTo(false);
  });

  it('reports failure when the fallback throws', async () => {
    withClipboard(undefined);
    spyOn(document, 'execCommand').and.throwError('not allowed');

    await expectAsync(copyToClipboard('nope')).toBeResolvedTo(false);
  });

  /* A textarea left behind on every copy would accumulate in the DOM. */
  it('cleans up after itself even when the copy fails', async () => {
    withClipboard(undefined);
    spyOn(document, 'execCommand').and.throwError('not allowed');
    const before = document.querySelectorAll('textarea').length;

    await copyToClipboard('nope');

    expect(document.querySelectorAll('textarea').length).toBe(before);
  });
});
