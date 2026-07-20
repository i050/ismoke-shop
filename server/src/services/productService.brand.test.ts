jest.mock('./stockAlertService', () => ({
  triggerStockAlerts: jest.fn(),
}));

jest.mock('./filterAttributeService', () => ({
  clearAttributesCache: jest.fn(),
}));

import {
  buildCaseInsensitiveBrandFilter,
  buildProductUpdateDocument,
  normalizeProductDataForCreate,
} from './productService';

describe('product brand compatibility helpers', () => {
  it('builds exact case-insensitive filters and escapes regex syntax', () => {
    const filter = buildCaseInsensitiveBrandFilter(['  SMOK  ', 'A.C+']);

    expect(filter.$in).toHaveLength(2);
    expect(filter.$in[0].test('smok')).toBe(true);
    expect(filter.$in[0].test('SMOK extra')).toBe(false);
    expect(filter.$in[1].test('a.c+')).toBe(true);
    expect(filter.$in[1].test('ABC')).toBe(false);
  });

  it('ignores empty query values rather than creating a match-all expression', () => {
    expect(buildCaseInsensitiveBrandFilter(['', '   ']).$in).toEqual([]);
  });

  it('leaves the stored brand unchanged when an update omits the field', () => {
    const productData = { name: 'Updated product' };

    expect(buildProductUpdateDocument(productData)).toBe(productData);
  });

  it.each([null, '', '   '])(
    'turns an explicitly empty brand (%p) into $unset while preserving other fields',
    (brand) => {
      const update = buildProductUpdateDocument({
        name: 'Updated product',
        brand,
      } as any);

      expect(update).toEqual({
        $set: { name: 'Updated product' },
        $unset: { brand: 1 },
      });
    }
  );

  it('does not persist empty brands when creating products', () => {
    const normalized = normalizeProductDataForCreate({
      name: 'New product',
      brand: '',
    } as any);

    expect(normalized).toEqual({ name: 'New product' });
    expect(normalized).not.toHaveProperty('brand');
  });

  it('preserves a real brand on creation', () => {
    const productData = { name: 'New product', brand: 'SMOK' } as any;

    expect(normalizeProductDataForCreate(productData)).toBe(productData);
  });
});
