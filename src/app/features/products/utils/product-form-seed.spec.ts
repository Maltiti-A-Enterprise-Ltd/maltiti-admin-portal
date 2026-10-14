import { Product, QuantityUnit, UnitOfMeasurement } from '../models/product.model';
import { productFormSeed } from './product-form-seed';

const product = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    sku: 'SB-500G-A',
    name: 'Shea Butter',
    ingredients: [{ id: 'i1', name: 'Shea' }],
    weight: '500',
    unitOfMeasurement: UnitOfMeasurement.GRAM,
    quantityUnit: QuantityUnit.TUB,
    category: 'Shea Butter',
    description: 'Pure shea butter',
    status: 'active',
    images: ['a.jpg'],
    image: 'a.jpg',
    wholesale: 10,
    retail: 15,
    inBoxPrice: 110,
    quantityInBox: 12,
    favorite: false,
    rating: 0,
    reviews: 0,
    grade: 'A',
    isFeatured: true,
    isOrganic: true,
    certifications: ['Ecocert'],
    supplierReference: 'SUP-1',
    minOrderQuantity: 5,
    costPrice: 8,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...over,
  }) as Product;

describe('productFormSeed', () => {
  describe('editing', () => {
    it('keeps the product on its own SKU', () => {
      expect(productFormSeed(product()).sku).toBe('SB-500G-A');
    });

    it('defaults to editing when no mode is given', () => {
      expect(productFormSeed(product())).toEqual(productFormSeed(product(), { duplicate: false }));
    });
  });

  describe('duplicating', () => {
    /* A SKU names one product. Carried over, the copy is rejected on save and
       the cause is nowhere on screen. */
    it('clears the SKU', () => {
      expect(productFormSeed(product(), { duplicate: true }).sku).toBe('');
    });

    /* Everything else is the point of copying: the sibling sizes of a product
       share their prices, ingredients and description. */
    const carried: [string, keyof Product][] = [
      ['name', 'name'],
      ['description', 'description'],
      ['category', 'category'],
      ['wholesale', 'wholesale'],
      ['retail', 'retail'],
      ['grade', 'grade'],
      ['weight', 'weight'],
      ['unitOfMeasurement', 'unitOfMeasurement'],
      ['quantityUnit', 'quantityUnit'],
      ['quantityInBox', 'quantityInBox'],
      ['supplierReference', 'supplierReference'],
    ];

    carried.forEach(([label, field]) => {
      it(`carries ${label} over`, () => {
        const source = product();
        const seed = productFormSeed(source, { duplicate: true }) as Record<string, unknown>;

        expect(seed[field]).toEqual(source[field] as unknown);
      });
    });

    it('carries the ingredients over as ids', () => {
      expect(productFormSeed(product(), { duplicate: true }).ingredients).toEqual(['i1']);
    });
  });

  describe('fields the API can return empty', () => {
    /* These controls are typed as arrays; the API returns null for an empty
       list, and anything reading them as arrays then throws. */
    const nulled: [string, Partial<Product>, 'ingredients' | 'certifications' | 'images'][] = [
      ['ingredients', { ingredients: null as unknown as Product['ingredients'] }, 'ingredients'],
      [
        'certifications',
        { certifications: null as unknown as Product['certifications'] },
        'certifications',
      ],
      ['images', { images: null as unknown as Product['images'] }, 'images'],
    ];

    nulled.forEach(([label, over, field]) => {
      it(`turns a null ${label} into an empty array`, () => {
        expect(productFormSeed(product(over))[field]).toEqual([]);
      });
    });

    it('keeps a missing cost price as null rather than zero, which would read as free', () => {
      expect(productFormSeed(product({ costPrice: undefined })).costPrice).toBeNull();
    });

    it('floors a missing minimum order quantity at one', () => {
      expect(productFormSeed(product({ minOrderQuantity: 0 })).minOrderQuantity).toBe(1);
    });
  });

  /* Spreading the whole product would also work — patchValue ignores unknown
     keys — but it quietly carries the original's identity into a copy. */
  it('does not carry the original product id', () => {
    expect(productFormSeed(product(), { duplicate: true })).not.toEqual(
      jasmine.objectContaining({ id: 'p1' } as object),
    );
  });
});
