import NodeCache from 'node-cache';
import FilterAttribute, { IFilterAttribute } from '../models/FilterAttribute';
import SKU from '../models/Sku';
import { clearValidationCache } from '../middleware/dynamicValidation';
import { loadColorFamilies, refreshColorFamiliesCache } from '../utils/colorFamilyDetector';

// 🧠 Cache פנימי למאפייני סינון כדי להימנע משאילתות חוזרות
const attributesCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const FILTER_ATTRIBUTES_CACHE_KEY = 'filter-attributes';

type AttributeValueType = 'text' | 'number';
type StoredAttributeValue = string | {
  value?: unknown;
  displayName?: unknown;
};

export interface AttributeValueMutationResult {
  value: string;
  displayName: string;
  created: boolean;
}

export class AttributeValueMutationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 404 | 409
  ) {
    super(message);
    this.name = 'AttributeValueMutationError';
  }
}

export class AttributeUpdateConflictError extends Error {
  public readonly statusCode = 409;

  constructor() {
    super('המאפיין השתנה במקביל. יש לסגור את החלון, לפתוח אותו מחדש ולנסות שוב');
    this.name = 'AttributeUpdateConflictError';
  }
}

type AttributeUpdateInput = Partial<IFilterAttribute> & {
  expectedUpdatedAt?: unknown;
};

const normalizeHumanText = (value: string): string =>
  value.normalize('NFKC').trim().replace(/\s+/gu, ' ');

const normalizeNumberText = (value: string): string | null => {
  const normalizedText = normalizeHumanText(value);
  if (!normalizedText) return null;

  const decimalText = normalizedText.includes('.')
    ? normalizedText
    : normalizedText.replace(',', '.');

  if ((decimalText.match(/\./g) || []).length > 1) return null;

  const numericValue = Number(decimalText);
  if (!Number.isFinite(numericValue) || numericValue < 0) return null;

  return String(numericValue);
};

const normalizeComparableAttributeValue = (
  value: unknown,
  valueType: AttributeValueType
): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const normalized = valueType === 'number'
    ? normalizeNumberText(String(value))
    : normalizeHumanText(String(value));

  return normalized ? normalized.toLocaleLowerCase() : null;
};

const findStoredAttributeValue = (
  values: unknown,
  requestedValue: string,
  valueType: AttributeValueType
): Omit<AttributeValueMutationResult, 'created'> | null => {
  if (!Array.isArray(values)) return null;

  const requestedComparable = normalizeComparableAttributeValue(requestedValue, valueType);
  if (!requestedComparable) return null;

  for (const rawEntry of values as StoredAttributeValue[]) {
    if (typeof rawEntry === 'string') {
      if (normalizeComparableAttributeValue(rawEntry, valueType) === requestedComparable) {
        return { value: rawEntry, displayName: rawEntry };
      }
      continue;
    }

    if (!rawEntry || typeof rawEntry !== 'object') continue;

    const storedValue = typeof rawEntry.value === 'string'
      ? rawEntry.value
      : typeof rawEntry.value === 'number'
        ? String(rawEntry.value)
        : '';
    const storedDisplayName = typeof rawEntry.displayName === 'string'
      ? rawEntry.displayName
      : typeof rawEntry.displayName === 'number'
        ? String(rawEntry.displayName)
        : '';

    const matchesValue =
      normalizeComparableAttributeValue(storedValue, valueType) === requestedComparable;
    const matchesDisplayName =
      normalizeComparableAttributeValue(storedDisplayName, valueType) === requestedComparable;

    if (matchesValue || matchesDisplayName) {
      const fallback = storedValue || storedDisplayName;
      return {
        value: storedValue || fallback,
        displayName: storedDisplayName || fallback,
      };
    }
  }

  return null;
};

const buildEquivalentValuePattern = (value: string): RegExp => {
  const escapedParts = value
    .split(' ')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  return new RegExp(`^\\s*${escapedParts.join('\\s+')}\\s*$`, 'i');
};

/**
 * ניקוי Cache של מאפייני הסינון (משמש אחרי כל שינוי רלוונטי)
 */
export const clearAttributesCache = (): void => {
  attributesCache.del(FILTER_ATTRIBUTES_CACHE_KEY);
  
  // 🔄 ניקוי גם של Cache הוולידציה הדינמית
  clearValidationCache();
  
  console.log('🗑️ Attributes cache cleared');
};

/**
 * שירות ניהול מאפייני סינון
 * מספק פונקציות CRUD ושאילתות מתקדמות למאפייני סינון
 */

/**
 * 🆕 קבלת כל משפחות הצבעים האפשריות (לממשק הניהול)
 * מחזירה את הרשימה המלאה מ-colorFamilies.json ללא תלות בשימוש
 * משמש ב-AddColorModal כדי להציג למנהל את כל האפשרויות
 */
export const getAllColorFamilies = (): Array<{
  family: string;
  displayName: string;
  variants: Array<{ name: string; hex: string }>;
}> => {
  try {
    const colorFamilies = loadColorFamilies();
    console.log(`📊 Loaded ${colorFamilies.length} color families from JSON`);
    return colorFamilies;
  } catch (error) {
    console.error('❌ Error loading color families:', error);
    return [];
  }
};

/**
 * קבלת כל המאפיינים
 */
export const getAllAttributes = async (): Promise<IFilterAttribute[]> => {
  try {
    return await FilterAttribute.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean();
  } catch (error) {
    console.error('❌ Error fetching filter attributes:', error);
    throw new Error('Failed to fetch filter attributes');
  }
};

/**
 * קבלת מאפיין לפי key
 */
export const getAttributeByKey = async (
  key: string
): Promise<IFilterAttribute | null> => {
  try {
    return await FilterAttribute.findOne({ key }).lean();
  } catch (error) {
    console.error(`❌ Error fetching attribute ${key}:`, error);
    throw new Error('Failed to fetch attribute');
  }
};

/**
 * יצירת מאפיין חדש
 */
export const createAttribute = async (
  data: Partial<IFilterAttribute>
): Promise<IFilterAttribute> => {
  try {
    // בדיקה שה-key לא קיים
    const existing = await FilterAttribute.findOne({ key: data.key });
    if (existing) {
      throw new Error(`Attribute with key "${data.key}" already exists`);
    }

    const attribute = new FilterAttribute(data);
    await attribute.save();
    
    console.log(`✅ Created attribute: ${attribute.name} (${attribute.key})`);
    clearAttributesCache();
    return attribute;
  } catch (error: any) {
    console.error('❌ Error creating attribute:', error);
    throw error;
  }
};

/**
 * עדכון מאפיין
 * 🛡️ כולל בדיקת בטיחות למניעת שבירת נתונים קיימים
 */
export const updateAttribute = async (
  id: string,
  updates: AttributeUpdateInput
): Promise<IFilterAttribute | null> => {
  try {
    const {
      expectedUpdatedAt,
      ...requestedUpdates
    } = updates;
    const safeUpdates = requestedUpdates as Partial<IFilterAttribute> & Record<string, unknown>;

    // These fields are server-owned and must never be accepted from a generic update payload.
    delete safeUpdates._id;
    delete safeUpdates.createdAt;
    delete safeUpdates.updatedAt;
    delete safeUpdates.__v;

    const replacesValueLibrary = Object.prototype.hasOwnProperty.call(safeUpdates, 'values');
    let expectedTimestamp: Date | null = null;

    if (replacesValueLibrary) {
      if (typeof expectedUpdatedAt !== 'string') {
        throw new AttributeUpdateConflictError();
      }

      expectedTimestamp = new Date(expectedUpdatedAt);
      if (Number.isNaN(expectedTimestamp.getTime())) {
        throw new AttributeUpdateConflictError();
      }
    }

    // אם מנסים לשנות את valueType, צריך לבדוק שאין שימוש
    if (safeUpdates.valueType) {
      const existingAttribute = await FilterAttribute.findById(id);
      
      if (!existingAttribute) {
        throw new Error('Attribute not found');
      }

      // אם valueType משתנה ויש SKUs שמשתמשים במאפיין
      if (existingAttribute.valueType !== safeUpdates.valueType) {
        const usageCount = await SKU.countDocuments({
          $or: [
            { [existingAttribute.key]: { $exists: true } },
            { [`attributes.${existingAttribute.key}`]: { $exists: true } },
          ],
        });

        if (usageCount > 0) {
          throw new Error(
            `Cannot change valueType for attribute "${existingAttribute.name}". ` +
            `It is currently used in ${usageCount} SKU(s). ` +
            `Changing the type may break existing data. ` +
            `Please remove it from all SKUs first or use a migration tool.`
          );
        }
      }
    }

    const updateFilter: Record<string, unknown> = { _id: id };
    if (expectedTimestamp) {
      updateFilter.updatedAt = expectedTimestamp;
    }

    const attribute = await FilterAttribute.findOneAndUpdate(
      updateFilter,
      safeUpdates,
      { new: true, runValidators: true }
    );

    if (!attribute) {
      if (expectedTimestamp && await FilterAttribute.exists({ _id: id })) {
        throw new AttributeUpdateConflictError();
      }
      throw new Error('Attribute not found');
    }

    console.log(`✅ Updated attribute: ${attribute.name}`);
    clearAttributesCache();
    return attribute;
  } catch (error: any) {
    console.error('❌ Error updating attribute:', error);
    throw error;
  }
};

/**
 * הוספת ערך טקסט/מספר לספריית מאפיין מתוך טופס מוצר.
 *
 * הפעולה idempotent ואטומית: ערך קיים מוחזר בזהות המקורית שלו, וערך חדש
 * נוסף רק אם אין התאמה ל-value, ל-displayName או למבנה string ישן.
 */
export const addAttributeValue = async (
  id: string,
  displayName: unknown
): Promise<AttributeValueMutationResult> => {
  if (typeof displayName !== 'string') {
    throw new AttributeValueMutationError('יש להזין שם לערך החדש', 400);
  }

  const humanText = normalizeHumanText(displayName);
  if (!humanText) {
    throw new AttributeValueMutationError('יש להזין שם לערך החדש', 400);
  }

  if (humanText.length > 50) {
    throw new AttributeValueMutationError('שם הערך יכול להכיל עד 50 תווים', 400);
  }

  const attribute = await FilterAttribute.findById(id).lean();
  if (!attribute) {
    throw new AttributeValueMutationError('המאפיין לא נמצא', 404);
  }

  if (attribute.valueType === 'color') {
    throw new AttributeValueMutationError(
      'למאפיין צבע יש להוסיף גוון דרך משפחת הצבע המתאימה',
      400
    );
  }

  const valueType = attribute.valueType as AttributeValueType;
  if (valueType === 'text' && humanText.includes(',')) {
    throw new AttributeValueMutationError(
      'שם הערך לא יכול להכיל פסיק, משום שפסיקים משמשים להפרדה בין ערכי סינון',
      400
    );
  }

  const normalizedValue = valueType === 'number'
    ? normalizeNumberText(humanText)
    : humanText;

  if (!normalizedValue) {
    throw new AttributeValueMutationError(
      'יש להזין מספר תקין שאינו שלילי',
      400
    );
  }

  const initiallyExistingValue = findStoredAttributeValue(
    attribute.values,
    normalizedValue,
    valueType
  );
  const equivalentPatterns = [
    normalizedValue,
    initiallyExistingValue?.value,
    initiallyExistingValue?.displayName,
  ]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .map(buildEquivalentValuePattern);
  const noEquivalentValueConditions = equivalentPatterns.flatMap((valuePattern) => [
    { values: valuePattern },
    { values: { $elemMatch: { value: valuePattern } } },
    { values: { $elemMatch: { displayName: valuePattern } } },
  ]);

  const result = await FilterAttribute.updateOne(
    {
      _id: id,
      valueType,
      $nor: noEquivalentValueConditions,
    },
    {
      $push: {
        values: {
          value: normalizedValue,
          displayName: normalizedValue,
        },
      },
    },
    { runValidators: true }
  );

  if (result.modifiedCount === 1) {
    clearAttributesCache();
    console.log(`✅ Added value "${normalizedValue}" to attribute "${attribute.name}"`);
    return {
      value: normalizedValue,
      displayName: normalizedValue,
      created: true,
    };
  }

  // בקשה אחרת עשויה הייתה להוסיף את אותו ערך בין הקריאה לעדכון.
  // קריאה חוזרת מחזירה את הזהות שנשמרה בפועל במקום ליצור כפילות.
  const currentAttribute = await FilterAttribute.findById(id).lean();
  if (!currentAttribute) {
    throw new AttributeValueMutationError('המאפיין לא נמצא', 404);
  }

  if (currentAttribute.valueType !== valueType) {
    throw new AttributeValueMutationError(
      'סוג המאפיין השתנה במקביל. יש לטעון אותו מחדש ולנסות שוב',
      409
    );
  }

  const concurrentValue = findStoredAttributeValue(
    currentAttribute.values,
    normalizedValue,
    valueType
  );
  if (concurrentValue) {
    return { ...concurrentValue, created: false };
  }

  throw new AttributeValueMutationError(
    'ספריית הערכים השתנתה במקביל. יש לנסות שוב',
    409
  );
};

/**
 * בדיקת כמות השימוש של מאפיין
 * מחזיר כמה SKUs משתמשים במאפיין
 */
export const getAttributeUsageCount = async (id: string): Promise<{
  attribute: IFilterAttribute;
  usageCount: number;
}> => {
  try {
    const attribute = await FilterAttribute.findById(id);
    if (!attribute) {
      throw new Error('Attribute not found');
    }

    const usageCount = await SKU.countDocuments({
      $or: [
        { [attribute.key]: { $exists: true } },
        { [`attributes.${attribute.key}`]: { $exists: true } },
      ],
    });

    return { attribute, usageCount };
  } catch (error: any) {
    console.error('❌ Error getting attribute usage count:', error);
    throw error;
  }
};

/**
 * הסרת מאפיין מכל ה-SKUs
 * משמש לפני מחיקה כדי לאפשר למנהל להסיר מאפיין בשימוש
 */
export const removeAttributeFromAllSkus = async (id: string): Promise<{
  modifiedCount: number;
  attributeName: string;
}> => {
  try {
    const attribute = await FilterAttribute.findById(id);
    if (!attribute) {
      throw new Error('Attribute not found');
    }

    const key = attribute.key;
    
    // הסרה מתוך אובייקט attributes ומהשדה הישיר (אם קיים)
    const result = await SKU.updateMany(
      {
        $or: [
          { [key]: { $exists: true } },
          { [`attributes.${key}`]: { $exists: true } },
        ],
      },
      {
        $unset: {
          [key]: '',
          [`attributes.${key}`]: '',
        },
      }
    );

    console.log(`✅ Removed attribute "${attribute.name}" from ${result.modifiedCount} SKU(s)`);
    clearAttributesCache();
    
    return {
      modifiedCount: result.modifiedCount,
      attributeName: attribute.name,
    };
  } catch (error: any) {
    console.error('❌ Error removing attribute from SKUs:', error);
    throw error;
  }
};

/**
 * מחיקת מאפיין - רק אם לא בשימוש
 */
export const deleteAttribute = async (id: string): Promise<void> => {
  try {
    const attribute = await FilterAttribute.findById(id);
    if (!attribute) {
      throw new Error('Attribute not found');
    }

    // בדיקה: כמה SKUs משתמשים במאפיין הזה?
    const usageCount = await SKU.countDocuments({
      $or: [
        { [attribute.key]: { $exists: true } },
        { [`attributes.${attribute.key}`]: { $exists: true } },
      ],
    });

    if (usageCount > 0) {
      throw new Error(
        `Cannot delete attribute "${attribute.name}". ` +
        `It is used in ${usageCount} SKU(s). ` +
        `Please remove it from all SKUs first.`
      );
    }

    const result = await FilterAttribute.findByIdAndDelete(id);
    
    if (!result) {
      throw new Error('Failed to delete attribute - may have been deleted already');
    }
    
    console.log(`✅ Deleted attribute: ${attribute.name}`);
    clearAttributesCache();
  } catch (error: any) {
    console.error('❌ Error deleting attribute:', error);
    throw error;
  }
};

// ============================================================================
// 🆕 קבלת משפחות צבעים להצגה למנהל (ללא variants)
// ============================================================================

/**
 * מחזיר רשימה של משפחות צבעים בלבד - לשימוש בממשק הניהול
 * המנהל בוחר רק משפחה (אדום, כחול וכו') - לא גוון ספציפי
 * 
 * @returns מערך פשוט של משפחות עם שם תצוגה ו-HEX ייצוגי
 */
export const getColorFamiliesForAdmin = async (): Promise<Array<{
  family: string;
  displayName: string;
  representativeHex: string;
  variants?: Array<{ name: string; hex: string }>;
}>> => {
  try {
    // MongoDB is the source of truth. Returning only the in-memory JSON cache
    // can hide a shade that an admin has just created or edited.
    const colorAttribute = await FilterAttribute.findOne({ key: 'color' }).lean();
    const allFamilies = colorAttribute?.colorFamilies || loadColorFamilies();
    
    // 🆕 מחזיר גם variants — backward compatible (צרכנים קיימים מתעלמים מהשדה הנוסף)
    return allFamilies.map((fam) => ({
      family: fam.family,
      displayName: fam.displayName,
      representativeHex: fam.variants[0]?.hex || '#000000',
      variants: fam.variants,
    }));
  } catch (error) {
    console.error('❌ Error loading color families for admin:', error);
    return [];
  }
};

// ============================================================================
// 🆕 CRUD — ניהול גוונים בתוך משפחות צבע (פעולות אטומיות)
// ============================================================================

/**
 * 🆕 הוספת גוון למשפחת צבע — $push אטומי
 */
export const addColorVariant = async (
  family: string,
  name: string,
  hex: string
): Promise<void> => {
  family = family.trim().toLowerCase();
  name = name.trim();
  hex = hex.trim().toUpperCase();

  if (!family || !name || !hex) {
    throw new Error('family, name ו-hex הם שדות חובה');
  }

  if (!/^#[0-9A-F]{6}$/.test(hex)) {
    throw new Error('Color must be a full HEX value, for example #1A2B3C');
  }

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactNamePattern = new RegExp(`^${escapedName}$`, 'i');

  // הוספה אטומית שמותנית בכך שהשם אינו קיים באף משפחה. שם הגוון
  // משמש כמזהה בטופס המוצר, ולכן כפילות בין משפחות אינה ניתנת להבחנה.
  const result = await FilterAttribute.updateOne(
    {
      key: 'color',
      'colorFamilies.family': family,
      $nor: [
        {
          colorFamilies: {
            $elemMatch: {
              variants: { $elemMatch: { name: exactNamePattern } },
            },
          },
        },
      ],
    },
    { $push: { 'colorFamilies.$.variants': { name, hex } } }
  );

  if (result.modifiedCount === 0) {
    const colorAttribute = await FilterAttribute.findOne({ key: 'color' }).lean();
    const targetFamily = colorAttribute?.colorFamilies?.find((item) => item.family === family);

    if (!targetFamily) {
      throw new Error(`משפחת צבע "${family}" לא נמצאה`);
    }

    const collisionFamily = colorAttribute?.colorFamilies?.find((item) =>
      item.variants.some((variant) => exactNamePattern.test(variant.name))
    );
    if (collisionFamily) {
      throw new Error(`גוון "${name}" כבר קיים במשפחת "${collisionFamily.displayName}"`);
    }

    throw new Error('לא ניתן היה להוסיף את הגוון. יש לרענן ולנסות שוב');
  }

  await refreshColorFamiliesCache();
  clearAttributesCache();
  console.log(`✅ Added variant "${name}" (${hex}) to family "${family}"`);
};

/**
 * 🆕 עריכת גוון — $set אטומי עם arrayFilters
 */
export const updateColorVariant = async (
  family: string,
  variantName: string,
  updates: { name?: string; hex?: string }
): Promise<void> => {
  if (!family || !variantName) {
    throw new Error('family ו-variantName הם שדות חובה');
  }

  family = family.trim().toLowerCase();
  variantName = variantName.trim();
  const nextName = updates.name?.trim();
  const nextHex = updates.hex?.trim().toUpperCase();

  if (updates.name !== undefined && !nextName) {
    throw new Error('Variant name is required');
  }
  if (nextHex !== undefined && !/^#[0-9A-F]{6}$/.test(nextHex)) {
    throw new Error('Color must be a full HEX value, for example #1A2B3C');
  }

  const colorAttribute = await FilterAttribute.findOne({ key: 'color' }).lean();
  const targetFamily = colorAttribute?.colorFamilies?.find((item) => item.family === family);
  const targetVariant = targetFamily?.variants.find(
    (item) => item.name.toLocaleLowerCase() === variantName.toLocaleLowerCase()
  );

  if (!targetFamily || !targetVariant) {
    throw new Error('Color family or variant was not found');
  }

  const isRenaming = Boolean(
    nextName && nextName.toLocaleLowerCase() !== targetVariant.name.toLocaleLowerCase()
  );
  const nextNamePattern = isRenaming && nextName
    ? new RegExp(`^${nextName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    : null;

  if (nextNamePattern) {
    const collisionFamily = colorAttribute?.colorFamilies?.find((item) =>
      item.variants.some((variant) => nextNamePattern.test(variant.name))
    );
    if (collisionFamily) {
      throw new Error(`גוון "${nextName}" כבר קיים במשפחת "${collisionFamily.displayName}"`);
    }
  }

  variantName = targetVariant.name;
  updates = {
    ...(nextName !== undefined ? { name: nextName } : {}),
    ...(nextHex !== undefined ? { hex: nextHex } : {}),
  };

  const setOps: Record<string, string> = {};
  if (updates.name !== undefined) setOps['colorFamilies.$[fam].variants.$[var].name'] = updates.name;
  if (updates.hex !== undefined) setOps['colorFamilies.$[fam].variants.$[var].hex'] = updates.hex;

  if (Object.keys(setOps).length === 0) return;

  const result = await FilterAttribute.updateOne(
    {
      key: 'color',
      colorFamilies: {
        $elemMatch: {
          family,
          'variants.name': variantName,
        },
      },
      ...(nextNamePattern
        ? {
            $nor: [
              {
                colorFamilies: {
                  $elemMatch: {
                    variants: { $elemMatch: { name: nextNamePattern } },
                  },
                },
              },
            ],
          }
        : {}),
    },
    { $set: setOps },
    {
      arrayFilters: [
        { 'fam.family': family },
        { 'var.name': variantName }
      ]
    }
  );

  if (result.matchedCount === 0) {
    const currentAttribute = await FilterAttribute.findOne({ key: 'color' }).lean();
    const collisionFamily = nextNamePattern
      ? currentAttribute?.colorFamilies?.find((item) =>
          item.variants.some((variant) => nextNamePattern.test(variant.name))
        )
      : undefined;

    if (collisionFamily) {
      throw new Error(`גוון "${nextName}" כבר קיים במשפחת "${collisionFamily.displayName}"`);
    }

    throw new Error(`גוון "${variantName}" לא נמצא במשפחת "${family}"`);
  }

  await refreshColorFamiliesCache();
  clearAttributesCache();
  console.log(`✅ Updated variant "${variantName}" in family "${family}"`);
};

/**
 * 🆕 מחיקת גוון — $pull אטומי + בדיקת SKUs בשימוש
 */
export const deleteColorVariant = async (
  family: string,
  variantName: string
): Promise<{ usageCount: number }> => {
  if (!family || !variantName) {
    throw new Error('family ו-variantName הם שדות חובה');
  }

  family = family.trim().toLowerCase();
  variantName = variantName.trim();
  const colorAttribute = await FilterAttribute.findOne({ key: 'color' }).lean();
  const targetFamily = colorAttribute?.colorFamilies?.find((item) => item.family === family);
  const variant = targetFamily?.variants.find(
    (item) => item.name.toLocaleLowerCase() === variantName.toLocaleLowerCase()
  );

  if (!targetFamily || !variant) {
    throw new Error('Color family or variant was not found');
  }
  if (targetFamily.variants.length <= 1) {
    throw new Error('A color family must retain at least one shade');
  }

  variantName = variant.name;

  const usageCount = variant
    ? await SKU.countDocuments({
        $or: [
          { colorHex: variant.hex },
          { color: variant.name }
        ]
      })
    : 0;

  // שלב 2: $pull אטומי
  const result = await FilterAttribute.updateOne(
    { key: 'color', 'colorFamilies.family': family },
    { $pull: { 'colorFamilies.$.variants': { name: variantName } } }
  );

  if (result.modifiedCount === 0) {
    throw new Error(`גוון "${variantName}" לא נמצא במשפחת "${family}"`);
  }

  await refreshColorFamiliesCache();
  clearAttributesCache();
  console.log(`✅ Deleted variant "${variantName}" from family "${family}" (${usageCount} SKUs affected)`);

  return { usageCount };
};

/**
 * 🆕 בדיקת שימוש בגוון (בלי מחיקה) — לתצוגה מקדימה באזהרה
 */
export const getColorVariantUsage = async (
  family: string,
  variantName: string
): Promise<number> => {
  const colorAttribute = await FilterAttribute.findOne({ key: 'color' }).lean();
  const targetFamily = colorAttribute?.colorFamilies?.find(
    (item) => item.family === family.trim().toLowerCase()
  );
  const variant = targetFamily?.variants.find(
    (item) => item.name.toLocaleLowerCase() === variantName.trim().toLocaleLowerCase()
  );

  if (!variant) return 0;

  return SKU.countDocuments({
    $or: [
      { colorHex: variant.hex },
      { color: variant.name }
    ]
  });
};

// ============================================================================
// 🆕 בניית colorFamilies דינמית מה-SKUs הפעילים
// ============================================================================

/**
 * בניית רשימת משפחות צבעים דינמית מתוך ה-SKUs הפעילים
 * מחזירה רק את הצבעים שהמנהל בחר בפועל (לא את כל הרשימה המוכנה)
 * 
 * @returns מערך של משפחות צבעים עם variants שקיימים במוצרים פעילים
 */
const buildDynamicColorFamilies = async (): Promise<Array<{
  family: string;
  displayName: string;
  variants: Array<{ name: string; hex: string }>;
}>> => {
  try {
    // 1. שליפת כל הצבעים הייחודיים מ-SKUs פעילים
    const colorData = await SKU.aggregate([
      { $match: { isActive: true, color: { $exists: true, $nin: [null, ''] } } },
      {
        $group: {
          _id: '$colorFamily', // קיבוץ לפי משפחת צבע
          colors: { $addToSet: '$color' }, // כל הצבעים הייחודיים במשפחה
        }
      },
      { $match: { _id: { $ne: null } } }, // רק משפחות עם ערך
    ]);

    if (colorData.length === 0) {
      console.log('📊 No active colors found in SKUs');
      return [];
    }

    // 2. טעינת רשימת הצבעים המוכנה מראש (לקבלת displayName ו-variants)
    const allColorFamilies = loadColorFamilies();
    
    // 3. מיפוי לפורמט הנכון - רק משפחות שקיימות בפועל ב-SKUs
    const dynamicFamilies = colorData
      .map((item) => {
        const familyKey = item._id as string;
        
        // מציאת המשפחה ברשימה המוכנה מראש
        const predefinedFamily = allColorFamilies.find(
          (f) => f.family.toLowerCase() === familyKey.toLowerCase()
        );

        if (!predefinedFamily) {
          // משפחה לא מוכרת - ניצור אחת בסיסית
          console.log(`⚠️ Unknown color family: ${familyKey}`);
          return {
            family: familyKey,
            displayName: familyKey, // שם המשפחה כ-displayName
            variants: (item.colors as string[]).map((hex: string) => ({
              name: hex,
              hex: hex.startsWith('#') ? hex : `#${hex}`,
            })),
          };
        }

        // סינון variants - רק אלו שקיימים בפועל ב-SKUs
        // או אם אין התאמה מדויקת - להציג את ה-variants של המשפחה
        const skuColors = new Set((item.colors as string[]).map((c: string) => c.toUpperCase()));
        
        // בדיקה אם יש התאמה ישירה ל-variants
        const matchedVariants = predefinedFamily.variants.filter(
          (v) => skuColors.has(v.hex.toUpperCase())
        );

        // אם יש התאמות - נציג רק אותן, אחרת נציג את כל ה-variants של המשפחה
        const variantsToShow = matchedVariants.length > 0 
          ? matchedVariants 
          : predefinedFamily.variants;

        return {
          family: predefinedFamily.family,
          displayName: predefinedFamily.displayName,
          variants: variantsToShow,
        };
      })
      .filter(Boolean);

    console.log(`📊 Built ${dynamicFamilies.length} dynamic color families from SKUs`);
    return dynamicFamilies;
  } catch (error) {
    console.error('❌ Error building dynamic color families:', error);
    return [];
  }
};

/**
 * קבלת מאפיינים שמוצגים בסינון (עם ספירת שימוש)
 * משתמש ב-Aggregation יחיד למניעת N+1 queries
 */
const VARIANT_NAME_USAGE_KEY = '__variantName';
const SUB_VARIANT_NAME_USAGE_KEY = '__subVariantName';

interface AggregatedAttributeValueUsage {
  _id: {
    key: string;
    value: unknown;
  };
  skuIds: unknown[];
}

type AttributeUsageIndex = Map<string, Map<string, Set<string>>>;

/**
 * Build a lookup of exact stored SKU values. Exact matching is deliberate:
 * the public product query also uses MongoDB's exact `$in` matching, so a
 * value is only advertised when selecting it can actually match a SKU.
 */
const buildAttributeUsageIndex = (
  rows: AggregatedAttributeValueUsage[]
): AttributeUsageIndex => {
  const usageIndex: AttributeUsageIndex = new Map();

  rows.forEach((row) => {
    if (typeof row?._id?.key !== 'string' || typeof row?._id?.value !== 'string') {
      return;
    }

    let valuesForKey = usageIndex.get(row._id.key);
    if (!valuesForKey) {
      valuesForKey = new Map();
      usageIndex.set(row._id.key, valuesForKey);
    }

    const skuIds = valuesForKey.get(row._id.value) || new Set<string>();
    (row.skuIds || []).forEach((skuId) => skuIds.add(String(skuId)));
    valuesForKey.set(row._id.value, skuIds);
  });

  return usageIndex;
};

const normalizeLibraryValue = (
  value: unknown
): { value: string; displayName: string } | null => {
  if (typeof value === 'string') {
    return value ? { value, displayName: value } : null;
  }
  if (!value || typeof value !== 'object') return null;

  const rawValue = (value as { value?: unknown }).value;
  const rawDisplayName = (value as { displayName?: unknown }).displayName;
  const identity = typeof rawValue === 'string' && rawValue
    ? rawValue
    : typeof rawDisplayName === 'string' && rawDisplayName
      ? rawDisplayName
      : '';
  const displayName = typeof rawDisplayName === 'string' && rawDisplayName
    ? rawDisplayName
    : identity;

  return identity ? { value: identity, displayName } : null;
};

/**
 * Keep only values backed by an active SKU and return the distinct SKU count
 * for the attribute. `variantName`/`subVariantName` remain compatibility
 * fallbacks because product editors have historically used those fields for
 * custom variant axes while writing inconsistent `attributes` keys.
 */
const filterAttributeValuesByActiveUsage = (
  attribute: IFilterAttribute,
  usageIndex: AttributeUsageIndex
): { values: unknown[]; usageCount: number } => {
  const libraryValues = (Array.isArray(attribute.values) ? attribute.values : [])
    .map(normalizeLibraryValue)
    .filter((value): value is { value: string; displayName: string } => Boolean(value));
  const directUsage = usageIndex.get(attribute.key);
  const primaryVariantUsage = usageIndex.get(VARIANT_NAME_USAGE_KEY);
  const secondaryVariantUsage = usageIndex.get(SUB_VARIANT_NAME_USAGE_KEY);
  const matchingSkuIds = new Set<string>();

  const values = libraryValues.filter((libraryValue) => {
    const identity = libraryValue.value;

    const skuIdSets = [
      directUsage?.get(identity),
      primaryVariantUsage?.get(identity),
      secondaryVariantUsage?.get(identity),
    ].filter((skuIds): skuIds is Set<string> => Boolean(skuIds));

    skuIdSets.forEach((skuIds) => {
      skuIds.forEach((skuId) => matchingSkuIds.add(skuId));
    });

    return skuIdSets.length > 0;
  });

  return { values, usageCount: matchingSkuIds.size };
};

export const getAttributesForFilter = async (): Promise<Array<{
  attribute: IFilterAttribute;
  usageCount: number;
}>> => {
  // בדיקה מוקדמת האם קיימת תוצאה בזיכרון כדי לחסוך גישה ל-DB
  const cachedResult = attributesCache.get<Array<{
    attribute: IFilterAttribute;
    usageCount: number;
  }>>(FILTER_ATTRIBUTES_CACHE_KEY);

  if (cachedResult) {
    console.log('⚡ מחזיר מאפיינים מה-Cache');
    return cachedResult;
  }

  try {
    const attributes = await FilterAttribute.find({ showInFilter: true })
      .sort({ sortOrder: 1 })
      .lean();

    if (attributes.length === 0) return [];

    // שאילתת aggregation יחידה לחישוב כל הספירות
    const attributeKeys = attributes.map((a) => a.key);
    
    const usageRows = await SKU.aggregate<AggregatedAttributeValueUsage>([
      { $match: { isActive: true } },
      {
        $project: {
          skuId: '$_id',
          candidates: {
            $concatArrays: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: {
                        $objectToArray: {
                          $cond: [
                            { $eq: [{ $type: '$attributes' }, 'object'] },
                            '$attributes',
                            {},
                          ],
                        },
                      },
                      as: 'entry',
                      cond: { $in: ['$$entry.k', attributeKeys] },
                    },
                  },
                  as: 'entry',
                  in: { key: '$$entry.k', value: '$$entry.v' },
                },
              },
              [
                // Color is intentionally stored as a top-level SKU field.
                { key: 'color', value: '$color' },
                { key: VARIANT_NAME_USAGE_KEY, value: '$variantName' },
                { key: SUB_VARIANT_NAME_USAGE_KEY, value: '$subVariantName' },
              ],
            ],
          },
        },
      },
      { $unwind: { path: '$candidates', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'candidates.value': { $type: 'string', $nin: ['', null] },
        },
      },
      {
        $group: {
          _id: {
            key: '$candidates.key',
            value: '$candidates.value',
          },
          skuIds: { $addToSet: '$skuId' },
        }
      }
    ]);

    // מיפוי התוצאות
    const usageIndex = buildAttributeUsageIndex(usageRows);

    // 🆕 בניית colorFamilies דינמית מה-SKUs הפעילים
    // במקום להשתמש ב-colorFamilies הסטטי מה-FilterAttribute
    const activeColorFamilies = await buildDynamicColorFamilies();

    const result = attributes
      .map((attr) => {
        // 🎨 עבור מאפיין צבע - החלפת colorFamilies בנתונים דינמיים
        if (attr.key === 'color' && attr.valueType === 'color') {
          // בניית values מ-colorFamilies (שטוח - לתאימות לקומפוננטות)
          const values = activeColorFamilies.flatMap(family =>
            family.variants.map(variant => ({
              value: variant.name,
              displayName: variant.name,
              hex: variant.hex,
              family: family.family,
            }))
          );
          
          const colorUsageCount = activeColorFamilies.length > 0
            ? new Set(
                Array.from(usageIndex.get(attr.key)?.values() || [])
                  .flatMap((skuIds) => Array.from(skuIds))
              ).size
            : 0;

          return {
            attribute: {
              ...attr,
              colorFamilies: activeColorFamilies,
              values, // ✅ הוספת values שטוח
            } as IFilterAttribute,
            usageCount: colorUsageCount,
          };
        }
        
        const { values, usageCount } = filterAttributeValuesByActiveUsage(
          attr as IFilterAttribute,
          usageIndex
        );

        return {
          attribute: {
            ...attr,
            values,
          } as IFilterAttribute,
          usageCount,
        };
      })
      .filter((item) => item.usageCount > 0);

    console.log(`📊 Found ${result.length} attributes with products`);
    attributesCache.set(FILTER_ATTRIBUTES_CACHE_KEY, result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching filter attributes:', error);
    throw new Error('Failed to fetch filter attributes');
  }
};
