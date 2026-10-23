import { InvoiceDisplayOptions } from './invoice-display-options';

/**
 * These exist because the invoice dialog's tick boxes were each written out
 * in six places, and the one that matters least visibly — the email
 * payload — is the one that gets forgotten. An option that reaches the
 * preview and not the email produces a PDF the sender never saw.
 */
describe('InvoiceDisplayOptions', () => {
  let options: InvoiceDisplayOptions;

  beforeEach(() => {
    options = new InvoiceDisplayOptions();
  });

  it('starts with everything off', () => {
    expect(options.is('includePayments')).toBeFalse();
    expect(options.is('showImperialWeights')).toBeFalse();
    expect(options.is('showBoxDimensions')).toBeFalse();
    expect(options.is('showExchangeRate')).toBeFalse();
  });

  it('turns one on and back off', () => {
    options.toggle('showBoxDimensions');
    expect(options.is('showBoxDimensions')).toBeTrue();

    options.toggle('showBoxDimensions');
    expect(options.is('showBoxDimensions')).toBeFalse();
  });

  it('leaves the others alone', () => {
    options.toggle('showBoxDimensions');

    expect(options.is('includePayments')).toBeFalse();
    expect(options.is('showImperialWeights')).toBeFalse();
  });

  /* The preview has to be what would be sent, so every toggle regenerates. */
  it('announces a change so the preview can be rebuilt', () => {
    let changes = 0;
    options.onChange = (): void => {
      changes += 1;
    };

    options.toggle('showBoxDimensions');
    options.toggle('includePayments');

    expect(changes).toBe(2);
  });

  it('clears everything on reset, and says nothing changed', () => {
    let changes = 0;
    options.onChange = (): void => {
      changes += 1;
    };

    options.toggle('showBoxDimensions');
    options.toggle('showImperialWeights');
    options.reset();

    expect(options.is('showBoxDimensions')).toBeFalse();
    expect(options.is('showImperialWeights')).toBeFalse();
    // Reset runs on open and on close, where a regenerate would be wrong.
    expect(changes).toBe(2);
  });

  describe('the payload', () => {
    /*
     * The decisive one. It is sent verbatim to both the preview request and
     * the email request, so every option must appear in it — an option
     * missing here is a tick box that visibly does nothing.
     */
    it('carries every option', () => {
      const keys = Object.keys(options.payload()).sort();

      expect(keys).toEqual([
        'includePayments',
        'showBoxDimensions',
        'showExchangeRate',
        'showImperialWeights',
      ]);
    });

    it('reports them all as off to begin with', () => {
      expect(options.payload()).toEqual({
        includePayments: false,
        showImperialWeights: false,
        showBoxDimensions: false,
        /* The one that used to be on by default — it was not a tick box at
           all, it was always printed. */
        showExchangeRate: false,
      });
    });

    it('reports what was actually ticked', () => {
      options.toggle('showBoxDimensions');

      expect(options.payload().showBoxDimensions).toBeTrue();
      expect(options.payload().includePayments).toBeFalse();
    });

    /* Explicit false, not an omitted key: the server reads these with `!!`,
       but an omission is how a flag quietly stops being sent. */
    it('sends an unticked option as false rather than leaving it out', () => {
      expect('showBoxDimensions' in options.payload()).toBeTrue();
      expect(options.payload().showBoxDimensions).toBe(false);
    });
  });
});
