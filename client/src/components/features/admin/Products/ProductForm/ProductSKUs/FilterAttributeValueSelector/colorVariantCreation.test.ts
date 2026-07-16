import { describe, expect, it } from 'vitest';
import type { ColorFamily } from '../../../../../../../services/filterAttributeService';
import {
  appendShadeToFamily,
  findShadeNameCollision,
  normalizeShadeHex,
} from './colorVariantCreation';

const families: ColorFamily[] = [
  {
    family: 'blue',
    displayName: 'כחול',
    variants: [{ name: 'כחול כהה', hex: '#123456' }],
  },
  {
    family: 'green',
    displayName: 'ירוק',
    variants: [{ name: 'ירוק זית', hex: '#667744' }],
  },
];

describe('colorVariantCreation', () => {
  it('normalizes only full HEX values', () => {
    expect(normalizeShadeHex('  #a1b2c3 ')).toBe('#A1B2C3');
    expect(normalizeShadeHex('#abc')).toBeNull();
    expect(normalizeShadeHex('A1B2C3')).toBeNull();
    expect(normalizeShadeHex('#GGGGGG')).toBeNull();
  });

  it('detects a case-insensitive shade-name collision across families', () => {
    expect(findShadeNameCollision(families, '  ירוק זית  ')?.family).toBe('green');
    expect(findShadeNameCollision(families, 'כחול חדש')).toBeUndefined();
  });

  it('appends a shade immutably only to the requested family', () => {
    const updated = appendShadeToFamily(families, 'blue', 'כחול מעושן', '#456789');

    expect(updated).not.toBe(families);
    expect(updated?.[0]).not.toBe(families[0]);
    expect(updated?.[1]).toBe(families[1]);
    expect(updated?.[0]?.variants).toEqual([
      { name: 'כחול כהה', hex: '#123456' },
      { name: 'כחול מעושן', displayName: 'כחול מעושן', hex: '#456789' },
    ]);
    expect(families[0]?.variants).toHaveLength(1);
  });
});
