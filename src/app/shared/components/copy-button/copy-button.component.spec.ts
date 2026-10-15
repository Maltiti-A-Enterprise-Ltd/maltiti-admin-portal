import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CopyButtonComponent } from './copy-button.component';

describe('CopyButtonComponent', () => {
  let fixture: ComponentFixture<CopyButtonComponent>;
  let component: CopyButtonComponent;
  let writeText: jasmine.Spy;

  beforeEach(async () => {
    writeText = jasmine.createSpy('writeText').and.resolveTo();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [CopyButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CopyButtonComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', '0244123456');
    fixture.componentRef.setInput('label', 'phone number');
    fixture.detectChanges();
  });

  const button = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button');

  const click = async (): Promise<void> => {
    await component.copy(new MouseEvent('click'));
    fixture.detectChanges();
  };

  it('copies the value it was given', async () => {
    await click();

    expect(writeText).toHaveBeenCalledWith('0244123456');
  });

  it('shows a tick once it has copied', async () => {
    await click();

    expect(button().querySelector('i')?.className).toContain('pi-check');
    expect(button().classList).toContain('is-copied');
  });

  /* A copy that silently failed is the worst outcome: the admin pastes
     whatever was there before and finds out after it has been sent. */
  it('says so when the copy failed', async () => {
    writeText.and.rejectWith(new Error('denied'));
    spyOn(document, 'execCommand').and.returnValue(false);

    await click();

    expect(button().classList).toContain('is-failed');
    expect(component.tooltip()).toContain('Could not copy');
  });

  it('names what it copies in the tooltip and the label', () => {
    expect(component.tooltip()).toBe('Copy phone number');
    expect(button().getAttribute('aria-label')).toBe('Copy phone number');
  });

  /* The tick is the whole of the visual feedback, so a screen reader would
     get nothing at all without this. */
  it('announces the result for a screen reader', async () => {
    const live = (): string =>
      fixture.nativeElement.querySelector('[aria-live]').textContent.trim();

    expect(live()).toBe('');

    await click();

    expect(live()).toBe('phone number copied');
  });

  /* These sit inside clickable table rows; copying an address must not also
     navigate away from the list. */
  it('does not let the click reach the row underneath', async () => {
    const event = new MouseEvent('click', { cancelable: true });
    const stop = spyOn(event, 'stopPropagation');

    await component.copy(event);

    expect(stop).toHaveBeenCalled();
    expect(event.defaultPrevented).toBeTrue();
  });

  it('goes back to idle after the feedback has been shown', async () => {
    jasmine.clock().install();
    try {
      await click();
      expect(component.state()).toBe('copied');

      jasmine.clock().tick(2000);

      expect(component.state()).toBe('idle');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  /* A button offering to copy nothing is worse than no button: it invites a
     tap that can only fail. Hiding here rather than in every caller keeps
     the decision in one place. */
  describe('with nothing to copy', () => {
    const expectHidden = (value: string | null | undefined): void => {
      fixture.componentRef.setInput('value', value);
      fixture.detectChanges();

      expect(component.hasValue()).toBeFalse();
      expect(button()).toBeNull();
    };

    it('renders nothing for an empty value', () => expectHidden(''));
    it('renders nothing for whitespace', () => expectHidden('   '));
    it('renders nothing for null', () => expectHidden(null));
    it('renders nothing for undefined', () => expectHidden(undefined));

    it('still refuses the copy if it is called anyway', async () => {
      fixture.componentRef.setInput('value', '');
      fixture.detectChanges();

      await click();

      expect(writeText).not.toHaveBeenCalled();
      expect(component.state()).toBe('failed');
    });
  });
});
