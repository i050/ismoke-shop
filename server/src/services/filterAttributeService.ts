import NodeCache from 'node-cache';
import FilterAttribute, { IFilterAttribute } from '../models/FilterAttribute';
import SKU from '../models/Sku';
import { clearValidationCache } from '../middleware/dynamicValidation';
import { loadColorFamilies } from '../utils/colorFamilyDetector';

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
export const getColorFamiliesForAdmin = (): Array<{
  family: string;
  displayName: string;
  representativeHex: string;
}> => {
  try {
    const allFamilies = loadColorFamilies();
    
    // מיפוי למבנה פשוט - רק משפחה + HEX ייצוגי (הראשון ברשימה)
    return allFamilies.map((fam) => ({
      family: fam.family,
      displayName: fam.displayName,
      representativeHex: fam.variants[0]?.hex || '#000000', // HEX ייצוגי
    }));
  } catch (error) {
    console.error('❌ Error loading color families for admin:', error);
    return [];
  }
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
