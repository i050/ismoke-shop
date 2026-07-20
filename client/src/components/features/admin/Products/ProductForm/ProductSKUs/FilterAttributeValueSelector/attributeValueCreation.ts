import type { AttributeValue } from '../../../../../../../services/filterAttributeService';

export type CreatableAttributeValueType = 'text' | 'number';

export type AttributeValueValidationResult =
  | { value: string; error: null }
  | { value: null; error: string };

const normalizeHumanText = (value: string): string =>
  value.normalize('NFKC').trim().replace(/\s+/gu, ' ');

/**
 * Old database records can contain a raw string instead of the current
 * { value, displayName } shape. Normalize at the picker boundary so search,
 * select-all and rendering never have to branch on the legacy format.
 */
export const normalizeAttributeValues = (values: unknown): AttributeValue[] => {
  if (!Array.isArray(values)) return [];

  const isAlreadyCanonical = values.every((entry) =>
    Boolean(
      entry &&
      typeof entry === 'object' &&
      'value' in entry &&
      typeof entry.value === 'string' &&
      entry.value.length > 0 &&
      'displayName' in entry &&
      typeof entry.displayName === 'string' &&
      entry.displayName.length > 0
    )
  );
  if (isAlreadyCanonical) return values as AttributeValue[];

  return values.flatMap((entry): AttributeValue[] => {
    if (typeof entry === 'string') {
      return entry ? [{ value: entry, displayName: entry }] : [];
    }

    if (!entry || typeof entry !== 'object') return [];

    const rawValue = 'value' in entry ? entry.value : undefined;
    const rawDisplayName = 'displayName' in entry ? entry.displayName : undefined;
    const value = typeof rawValue === 'string' && rawValue.length > 0
      ? rawValue
      : typeof rawDisplayName === 'string' && rawDisplayName.length > 0
        ? rawDisplayName
        : '';
    const displayName = typeof rawDisplayName === 'string' && rawDisplayName.length > 0
      ? rawDisplayName
      : value;

    return value ? [{ value, displayName: displayName || value }] : [];
  });
};

/**
 * Mirrors the server's user-facing validation. The API still remains the
 * authority and returns the final identity, including legacy values.
 */
export const validateNewAttributeValue = (
  input: string,
  valueType: CreatableAttributeValueType
): AttributeValueValidationResult => {
  const humanText = normalizeHumanText(input);

  if (!humanText) {
    return { value: null, error: 'יש להזין ערך' };
  }

  if (humanText.length > 50) {
    return { value: null, error: 'הערך יכול להכיל עד 50 תווים' };
  }

  if (valueType === 'text') {
    if (humanText.includes(',')) {
      return {
        value: null,
        error: 'הערך לא יכול להכיל פסיק; פסיקים משמשים להפרדה בין מסננים',
      };
    }

    return { value: humanText, error: null };
  }

  const decimalText = humanText.includes('.')
    ? humanText
    : humanText.replace(',', '.');
  if ((decimalText.match(/\./g) || []).length > 1) {
    return { value: null, error: 'יש להזין מספר תקין שאינו שלילי' };
  }

  const numericValue = Number(decimalText);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return { value: null, error: 'יש להזין מספר תקין שאינו שלילי' };
  }

  return { value: String(numericValue), error: null };
};

/**
 * Adds the server-authoritative value to the loaded library without mutating
 * it. An idempotent response for a value already present keeps the same array.
 */
export const mergeAttributeValue = (
  values: unknown,
  nextValue: AttributeValue
): AttributeValue[] => {
  const currentValues = normalizeAttributeValues(values);
  if (currentValues.some((value) => value.value === nextValue.value)) {
    return currentValues;
  }

  return [...currentValues, nextValue];
};

/** Keeps existing selection metadata (for example disabled/locked values). */
export const mergeSelectedValue = <T extends { value: string }>(
  values: T[],
  nextValue: T
): T[] => {
  if (values.some((value) => value.value === nextValue.value)) {
    return values;
  }

  return [...values, nextValue];
};
