import {
  dimensionsPayload,
  dimensionsSeed,
  formatDimensions,
  hasDimensions,
} from './product-dimensions';
import { DimensionUnit, Product, QuantityUnit } from '../models/product.model';

describe('hasDimensions', () => {
  it('offers the section for containers that have a shape', () => {
    [QuantityUnit.BOX, QuantityUnit.CARTON, QuantityUnit.DRUM].forEach(
      (unit) => {
        expect(hasDimensions(unit)).toBeTrue();
      },
    );
  });

  /* A product sold loose by the piece or the sachet has no container to
     measure, and empty fields on every product form get ignored. */
  it('does not offer it for things with no container', () => {
    [QuantityUnit.PIECE, QuantityUnit.SACHET, QuantityUnit.BAG].forEach(
      (unit) => {
        expect(hasDimensions(unit)).toBeFalse();
      },
    );
  });

  it('does not offer it before a unit has been chosen', () => {
    expect(hasDimensions(null)).toBeFalse();
    expect(hasDimensions(undefined)).toBeFalse();
  });
});

describe('dimensionsPayload', () => {
  const cm = DimensionUnit.CENTIMETRE;

  it('sends a full set as it was entered', () => {
    expect(
      dimensionsPayload({ length: 40, breadth: 30, height: 25, unit: cm }),
    ).toEqual({ length: 40, breadth: 30, height: 25, unit: cm });
  });

  /* A half-filled set is useful, and demanding all three means nobody
     records any. Only the measurements given are sent. */
  it('sends a partial set without the measurements that are missing', () => {
    expect(dimensionsPayload({ length: 40, breadth: null, unit: cm })).toEqual({
      length: 40,
      unit: cm,
    });
  });

  /* Null rather than undefined: emptying the fields has to clear what is
     stored, and an omitted key means "unchanged" to the API. */
  it('clears the dimensions when every measurement is empty', () => {
    expect(dimensionsPayload({ length: null, height: null, unit: cm })).toBeNull();
  });

  it('clears them for an empty or absent form value', () => {
    expect(dimensionsPayload({})).toBeNull();
    expect(dimensionsPayload(null)).toBeNull();
    expect(dimensionsPayload(undefined)).toBeNull();
  });

  /* A bare unit says nothing about the box. */
  it('does not store a unit on its own', () => {
    expect(dimensionsPayload({ unit: DimensionUnit.INCH })).toBeNull();
  });

  it('drops a measurement of zero rather than storing it', () => {
    expect(dimensionsPayload({ length: 40, height: 0, unit: cm })).toEqual({
      length: 40,
      unit: cm,
    });
  });

  it('drops a negative measurement', () => {
    expect(dimensionsPayload({ length: 40, breadth: -5, unit: cm })).toEqual({
      length: 40,
      unit: cm,
    });
  });

  it('keeps inches when that is what was chosen', () => {
    expect(dimensionsPayload({ length: 16, unit: DimensionUnit.INCH })).toEqual({
      length: 16,
      unit: DimensionUnit.INCH,
    });
  });

  /* The control defaults to centimetres, but a cleared select must not
     produce a unitless record. */
  it('falls back to centimetres when no unit came through', () => {
    expect(dimensionsPayload({ length: 40, unit: null })?.unit).toBe(cm);
  });
});

describe('dimensionsSeed', () => {
  it('fills the form from a stored set', () => {
    expect(
      dimensionsSeed({
        dimensions: { length: 40, height: 25, unit: DimensionUnit.INCH },
      } as Product),
    ).toEqual({
      length: 40,
      breadth: null,
      height: 25,
      unit: DimensionUnit.INCH,
    });
  });

  /* Every product that predates the column. */
  it('opens blank, in centimetres, for a product with none', () => {
    expect(dimensionsSeed({ dimensions: null } as Product)).toEqual({
      length: null,
      breadth: null,
      height: null,
      unit: DimensionUnit.CENTIMETRE,
    });
  });

  it('survives being handed nothing at all', () => {
    expect(dimensionsSeed(null).unit).toBe(DimensionUnit.CENTIMETRE);
  });
});

describe('formatDimensions', () => {
  it('reads as a size with the unit once', () => {
    expect(
      formatDimensions({
        length: 40,
        breadth: 30,
        height: 25,
        unit: DimensionUnit.CENTIMETRE,
      }),
    ).toBe('40 × 30 × 25 cm');
  });

  /* "40 × — × 25" reads as a missing value; "40 × 25 cm" reads as two
     measurements, which is what it is. */
  it('prints only the measurements that exist', () => {
    expect(
      formatDimensions({ length: 40, height: 25, unit: DimensionUnit.INCH }),
    ).toBe('40 × 25 in');
  });

  it('shows nothing for a product with no dimensions', () => {
    expect(formatDimensions(null)).toBeNull();
    expect(formatDimensions(undefined)).toBeNull();
  });

  it('shows nothing for a record that somehow has only a unit', () => {
    expect(formatDimensions({ unit: DimensionUnit.CENTIMETRE })).toBeNull();
  });
});
