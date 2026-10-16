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
  /**
   * The reported symptom, twice: a box dimension and then a sale price in
   * CAD, both refusing a decimal point.
   *
   * It is the *typing* path alone, which is why the tests above — which
   * write values in through the control — all passed while the field was
   * still broken in front of the admin. PrimeNG gates the keystroke:
   *
   *     else if (decimalCharIndex === -1 && this.maxFractionDigits)
   *
   * With no fraction digits set, pressing `.` on a field that has no
   * decimal point in it yet is swallowed and nothing reaches the control.
   */
  describe('typing a decimal point', () => {
    /* The real path: PrimeNG binds (keypress) and reads the character off
       `which`, which cannot be set through the event's initialiser. */
    const press = (input: HTMLInputElement, char: string): void => {
      const event = new KeyboardEvent('keypress', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'which', { get: () => char.charCodeAt(0) });
      Object.defineProperty(event, 'keyCode', { get: () => char.charCodeAt(0) });

      input.dispatchEvent(event);
    };

    const typeOut = async (
      text: string,
      inputs: Record<string, unknown> = {},
    ): Promise<string> => {
      const input = await build(inputs);

      input.focus();
      for (const char of text) {
        input.setSelectionRange(input.value.length, input.value.length);
        press(input, char);
        fixture.detectChanges();
      }
      await fixture.whenStable();

      return input.value;
    };

    it('takes the decimal point and what follows it', async () => {
      expect(await typeOut('42.55')).toBe('42.55');
    });

    it('takes a single place', async () => {
      expect(await typeOut('42.5')).toBe('42.5');
    });

    /* Millimetres on a box dimension in centimetres — the third place is a
       real measurement, and the locale already shows three. */
    it('takes three places', async () => {
      expect(await typeOut('40.125')).toBe('40.125');
    });

    it('still takes a whole number', async () => {
      expect(await typeOut('42')).toBe('42');
    });

    /* Counts stay whole: zero is falsy, so the gate stays shut and the
       point is swallowed — which is the wanted behaviour here. */
    it('refuses the point on a field that states zero places', async () => {
      expect(await typeOut('42.5', { maxFractionDigits: 0 })).toBe('425');
    });
  });

  /**
   * Counts must not be loosened by the default. Two and a half boxes is
   * not a thing, and nor is half a unit of batch stock.
   */
  describe('a field that states zero decimal places', () => {
    const whole = { maxFractionDigits: 0 };

    it('rounds a decimal away', async () => {
      expect(await displayFor(2.5, whole)).toBe('3');
    });

    it('leaves a whole number alone', async () => {
      expect(await displayFor(2, whole)).toBe('2');
    });
  });

  /* The default must not change what any field already shows: three is
     what this locale resolved on its own before it was ever stated. */
  it('shows a decimal exactly as it did before the default existed', async () => {
    expect(await displayFor(40.125)).toBe('40.125');
  });
});
