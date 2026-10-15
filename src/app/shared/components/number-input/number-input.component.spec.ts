import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { NumberInputComponent } from './number-input.component';

/**
 * Dimensions, weights and rates are not whole numbers. A box is 40.5 cm
 * long and a rate is 11.8126, so a "number" field that silently refuses a
 * decimal point is wrong for most of what this form collects.
 */
describe('NumberInputComponent — decimals', () => {
  let fixture: ComponentFixture<NumberInputComponent>;
  let control: FormControl<number | null>;

  const build = async (
    inputs: Record<string, unknown> = {},
  ): Promise<HTMLInputElement> => {
    control = new FormControl<number | null>(null);

    fixture = TestBed.createComponent(NumberInputComponent);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('id', 'test');

    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }

    fixture.detectChanges();
    await fixture.whenStable();

    return fixture.nativeElement.querySelector('input');
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberInputComponent],
    }).compileComponents();
  });

  /** What the field shows once a value is written to the control. */
  const displayFor = async (
    value: number,
    inputs: Record<string, unknown> = {},
  ): Promise<string> => {
    const input = await build(inputs);

    control.setValue(value);
    fixture.detectChanges();
    await fixture.whenStable();

    return input.value;
  };

  it('keeps one decimal place', async () => {
    expect(await displayFor(40.5)).toContain('40.5');
  });

  it('keeps two decimal places', async () => {
    expect(await displayFor(40.55)).toContain('40.55');
  });

  /* The field is used for dimensions in centimetres, where a millimetre is
     the third place. Rounding it away loses a real measurement. */
  it('keeps three decimal places', async () => {
    expect(await displayFor(40.125)).toContain('40.125');
  });

  it('leaves a whole number without a decimal point', async () => {
    expect(await displayFor(40)).toBe('40');
  });

  it('still shows two places in currency mode', async () => {
    expect(await displayFor(40.5, { mode: 'currency' })).toContain('40.50');
  });

  /* The control is what gets saved, so this is the figure that matters. */
  it('holds the decimal value on the control', async () => {
    await displayFor(40.125);

    expect(control.value).toBe(40.125);
  });
  /**
   * Typing takes a different path from `setValue` — PrimeNG parses what is
   * in the box rather than formatting a value in. This is the path an
   * admin actually uses.
   */
  describe('typed in by hand', () => {
    const type = async (text: string): Promise<void> => {
      const input = await build();

      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('accepts a decimal point', async () => {
      await type('40.5');

      expect(control.value).toBe(40.5);
    });

    it('accepts two decimal places', async () => {
      await type('40.55');

      expect(control.value).toBe(40.55);
    });

    it('accepts three decimal places', async () => {
      await type('40.125');

      expect(control.value).toBe(40.125);
    });

    it('still accepts a whole number', async () => {
      await type('40');

      expect(control.value).toBe(40);
    });
  });
  /**
   * The point of exposing these: a field that needs decimals says so,
   * rather than inheriting whatever `Intl.NumberFormat` decides for the
   * locale. The dimension fields set them for exactly this reason.
   */
  describe('when the decimal places are stated', () => {
    const stated = { minFractionDigits: 0, maxFractionDigits: 2 };

    it('keeps a decimal that is within the stated places', async () => {
      expect(await displayFor(40.5, stated)).toContain('40.5');
    });

    it('keeps two places', async () => {
      expect(await displayFor(40.55, stated)).toContain('40.55');
    });

    /* A minimum of zero means a round number stays round, rather than
       being padded to "40.00" on a measurement. */
    it('leaves a whole number unpadded', async () => {
      expect(await displayFor(40, stated)).toBe('40');
    });

    it('rounds past the stated maximum rather than refusing it', async () => {
      expect(await displayFor(40.567, stated)).toContain('40.57');
    });

    /* Nothing stated leaves every other field in the app exactly as it
       was — the inputs default to undefined, which is what PrimeNG saw
       before they existed. */
    it('changes nothing when they are not stated', async () => {
      expect(await displayFor(40.5)).toContain('40.5');
    });
  });
});
