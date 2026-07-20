import { describe, expect, it } from 'vitest';
import {
  mergeAttributeValue,
  mergeSelectedValue,
  normalizeAttributeValues,
  validateNewAttributeValue,
} from './attributeValueCreation';

describe('attributeValueCreation', () => {
  it('normalizes one human text input without generating an English identifier', () => {
    expect(validateNewAttributeValue('  כותנה   אורגנית  ', 'text')).toEqual({
      value: 'כותנה אורגנית',
      error: null,
    });
  });

  it('rejects empty, oversized and comma-delimited text values', () => {
    expect(validateNewAttributeValue('   ', 'text').error).toBeTruthy();
    expect(validateNewAttributeValue('א'.repeat(51), 'text').error).toBeTruthy();
    expect(validateNewAttributeValue('תפוח, קינמון', 'text').error).toContain('פסיק');
  });

  it('canonicalizes valid non-negative numbers', () => {
    expect(validateNewAttributeValue('0', 'number').value).toBe('0');
    expect(validateNewAttributeValue('010.00', 'number').value).toBe('10');
    expect(validateNewAttributeValue('1,5', 'number').value).toBe('1.5');
  });

  it('rejects negative and non-finite number inputs', () => {
    expect(validateNewAttributeValue('-1', 'number').error).toBeTruthy();
    expect(validateNewAttributeValue('NaN', 'number').error).toBeTruthy();
    expect(validateNewAttributeValue('Infinity', 'number').error).toBeTruthy();
  });

  it('merges a returned value immutably and does not duplicate its identity', () => {
    const values = [{ value: 'cotton', displayName: 'כותנה' }];
    const appended = mergeAttributeValue(values, {
      value: 'linen',
      displayName: 'פשתן',
    });

    expect(appended).not.toBe(values);
    expect(appended).toEqual([
      { value: 'cotton', displayName: 'כותנה' },
      { value: 'linen', displayName: 'פשתן' },
    ]);
    expect(mergeAttributeValue(values, values[0])).toBe(values);
  });

  it('normalizes raw-string and incomplete legacy values before picker use', () => {
    expect(normalizeAttributeValues([
      'XL',
      { value: 'cotton', displayName: 'כותנה' },
      { displayName: 'פשתן' },
      { value: 'silk', displayName: '' },
      { value: '', displayName: 'ויסקוזה' },
      null,
    ])).toEqual([
      { value: 'XL', displayName: 'XL' },
      { value: 'cotton', displayName: 'כותנה' },
      { value: 'פשתן', displayName: 'פשתן' },
      { value: 'silk', displayName: 'silk' },
      { value: 'ויסקוזה', displayName: 'ויסקוזה' },
    ]);

    expect(mergeAttributeValue(['XL'], { value: 'XL', displayName: 'XL' })).toEqual([
      { value: 'XL', displayName: 'XL' },
    ]);
  });

  it('selects the identity returned by the server without changing locked selections', () => {
    const selected = [{ value: 'cotton', displayName: 'כותנה', disabled: true }];
    const next = { value: 'linen', displayName: 'פשתן', disabled: false };

    expect(mergeSelectedValue(selected, next)).toEqual([selected[0], next]);
    expect(mergeSelectedValue(selected, selected[0])).toBe(selected);
  });
});
