import NodeCache from 'node-cache';
import FilterAttribute, { IFilterAttribute } from '../models/FilterAttribute';
import SKU from '../models/Sku';
import { clearValidationCache } from '../middleware/dynamicValidation';

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

    const result = attributes
      .map((attr) => ({
        attribute: attr,
        usageCount: countMap.get(attr.key) || 0,
      }))
      .filter((item) => item.usageCount > 0);

    console.log(`📊 Found ${result.length} attributes with products`);
    attributesCache.set(FILTER_ATTRIBUTES_CACHE_KEY, result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching filter attributes:', error);
    throw new Error('Failed to fetch filter attributes');
  }
};
