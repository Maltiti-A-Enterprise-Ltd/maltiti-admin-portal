import { DialogFormSeeder } from './dialog-form-seeder';

describe('DialogFormSeeder', () => {
  let seeder: DialogFormSeeder;

  beforeEach(() => {
    seeder = new DialogFormSeeder();
  });

  it('seeds the first time it sees an entity', () => {
    expect(seeder.shouldSeed('product-1')).toBe(true);
  });

  it('does not re-seed on later passes for the same entity', () => {
    seeder.shouldSeed('product-1');

    expect(seeder.shouldSeed('product-1')).toBe(false);
    expect(seeder.shouldSeed('product-1')).toBe(false);
  });

  it('re-seeds when the dialog switches to a different entity', () => {
    seeder.shouldSeed('product-1');

    expect(seeder.shouldSeed('product-2')).toBe(true);
    expect(seeder.shouldSeed('product-2')).toBe(false);
  });

  // The regression this class exists for: "adding" is a real seeded state, not
  // the absence of one. Treating it as unseeded re-reset the form on every
  // change-detection pass and wiped the user's input.
  describe('add mode (no entity)', () => {
    it('seeds the blank form once', () => {
      expect(seeder.shouldSeed(null)).toBe(true);
    });

    it('does not re-seed the blank form on later passes', () => {
      seeder.shouldSeed(null);

      expect(seeder.shouldSeed(null)).toBe(false);
      expect(seeder.shouldSeed(null)).toBe(false);
    });

    it('seeds again after switching from an entity to add mode', () => {
      seeder.shouldSeed('product-1');

      expect(seeder.shouldSeed(null)).toBe(true);
      expect(seeder.shouldSeed(null)).toBe(false);
    });
  });

  describe('markClosed', () => {
    it('makes the next open re-seed the same entity', () => {
      seeder.shouldSeed('product-1');
      expect(seeder.shouldSeed('product-1')).toBe(false);

      seeder.markClosed();

      expect(seeder.shouldSeed('product-1')).toBe(true);
    });

    it('makes the next open re-seed the blank form', () => {
      seeder.shouldSeed(null);
      expect(seeder.shouldSeed(null)).toBe(false);

      seeder.markClosed();

      expect(seeder.shouldSeed(null)).toBe(true);
    });
  });
});
