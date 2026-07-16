import NodeCache from 'node-cache';
import FilterAttribute, { IFilterAttribute } from '../models/FilterAttribute';
import SKU from '../models/Sku';
import { clearValidationCache } from '../middleware/dynamicValidation';
import { loadColorFamilies, refreshColorFamiliesCache } from '../utils/colorFamilyDetector';

// 🧠 Cache פנימי למאפייני סינון כדי להימנע משאילתות חוזרות
const attributesCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const FILTER_ATTRIBUTES_CACHE_KEY = 'filter-attributes';

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
  updates: Partial<IFilterAttribute>
): Promise<IFilterAttribute | null> => {
  try {
    // אם מנסים לשנות את valueType, צריך לבדוק שאין שימוש
    if (updates.valueType) {
      const existingAttribute = await FilterAttribute.findById(id);
      
      if (!existingAttribute) {
        throw new Error('Attribute not found');
      }

      // אם valueType משתנה ויש SKUs שמשתמשים במאפיין
      if (existingAttribute.valueType !== updates.valueType) {
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

    const attribute = await FilterAttribute.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!attribute) {
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
    
    const counts = await SKU.aggregate([
      { $match: { isActive: true } },
      {
        $project: {
          // בודק אילו מאפיינים קיימים ב-SKU
          attributeKeys: {
            $filter: {
              input: attributeKeys,
              as: 'attrKey',
              cond: {
                $or: [
                  // בדיקה אם השדה קיים ברמה העליונה (color, size)
                  { $ne: [{ $ifNull: [`$$attrKey`, null] }, null] },
                  // בדיקה אם השדה קיים בתוך attributes
                  { 
                    $ne: [
                      { $ifNull: [{ $getField: { field: '$$attrKey', input: '$attributes' } }, null] },
                      null
                    ]
                  }
                ]
              }
            }
          }
        }
      },
      { $unwind: { path: '$attributeKeys', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$attributeKeys',
          count: { $sum: 1 }
        }
      }
    ]);

    // מיפוי התוצאות
    const countMap = new Map(counts.map((c) => [c._id, c.count]));

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
          
          return {
            attribute: {
              ...attr,
              colorFamilies: activeColorFamilies,
              values, // ✅ הוספת values שטוח
            } as IFilterAttribute,
            usageCount: countMap.get(attr.key) || 0,
          };
        }
        
        return {
          attribute: attr,
          usageCount: countMap.get(attr.key) || 0,
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
