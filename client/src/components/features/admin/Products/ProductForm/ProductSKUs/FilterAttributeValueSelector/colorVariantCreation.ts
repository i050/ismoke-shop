import type { ColorFamily } from '../../../../../../../services/filterAttributeService';

const FULL_HEX_PATTERN = /^#[0-9A-F]{6}$/i;

/**
 * Normalizes a full HEX value for the API, or returns null when it is invalid.
 */
export const normalizeShadeHex = (value: string): string | null => {
  const normalized = value.trim().toUpperCase();
  return FULL_HEX_PATTERN.test(normalized) ? normalized : null;
};

/**
 * Shade names are used as selection identifiers in the product form, so a new
 * name must not collide with a shade in any family.
 */
export const findShadeNameCollision = (
  families: ColorFamily[] | undefined,
  name: string
): ColorFamily | undefined => {
  const normalizedName = name.trim().toLocaleLowerCase();
  if (!normalizedName) return undefined;

  return families?.find((family) =>
    family.variants.some(
      (variant) => variant.name.trim().toLocaleLowerCase() === normalizedName
    )
  );
};

/**
 * Adds a shade to the matching family without mutating the attribute returned
 * by the server. The API remains the source of truth for persistence.
 */
export const appendShadeToFamily = (
  families: ColorFamily[] | undefined,
  familyKey: string,
  name: string,
  hex: string
): ColorFamily[] | undefined => {
  if (!families) return families;

  return families.map((family) =>
    family.family === familyKey
      ? {
          ...family,
          variants: [
            ...family.variants,
            { name, displayName: name, hex },
          ],
        }
      : family
  );
};
