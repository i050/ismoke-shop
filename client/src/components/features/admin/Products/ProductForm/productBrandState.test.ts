import { describe, expect, it } from 'vitest';
import type { Brand } from '@/services/brandService';
import {
  buildBrandSubmissionPatch,
  buildProductBrandOptions,
  getInitialProductBrand,
} from './productBrandState';

const brand = (overrides: Partial<Brand> = {}): Brand => ({
  _id: 'brand-1',
  name: 'SMOK',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('product brand state', () => {
  it('loads the stored brand when editing a product', () => {
    expect(getInitialProductBrand({ brand: 'SMOK' })).toBe('SMOK');
    expect(getInitialProductBrand({})).toBeNull();
  });

  it('omits an unchanged brand from edit submissions', () => {
    expect(buildBrandSubmissionPatch('SMOK', 'edit', false)).toEqual({});
    expect(buildBrandSubmissionPatch('SMOK', 'edit', true)).toEqual({ brand: 'SMOK' });
    expect(buildBrandSubmissionPatch('', 'edit', true)).toEqual({ brand: '' });
    expect(buildBrandSubmissionPatch(null, 'edit', true)).toEqual({ brand: '' });
  });

  it('keeps brand selection in create submissions', () => {
    expect(buildBrandSubmissionPatch('SMOK', 'create', false)).toEqual({ brand: 'SMOK' });
    expect(buildBrandSubmissionPatch(null, 'create', false)).toEqual({ brand: null });
  });

  it('shows only active brands plus the current inactive brand', () => {
    const options = buildProductBrandOptions([
      brand(),
      brand({ _id: 'brand-2', name: 'OLD', isActive: false }),
      brand({ _id: 'brand-3', name: 'HIDDEN', isActive: false }),
    ], 'OLD');

    expect(options).toEqual([
      expect.objectContaining({ value: 'SMOK', disabled: false }),
      expect.objectContaining({ value: 'OLD', disabled: true }),
    ]);
  });

  it('preserves an orphaned current brand without pretending it is unbranded', () => {
    const options = buildProductBrandOptions([], 'Legacy Brand');

    expect(options).toEqual([
      expect.objectContaining({
        value: 'Legacy Brand',
        disabled: true,
        label: expect.stringContaining('מותג שמור'),
      }),
    ]);
  });
});
