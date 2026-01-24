import mongoose, { type PipelineStage } from 'mongoose';
import Sku, { ISku, ISkuDocument } from '../models/Sku';
import Product from '../models/Product';
import StoreSettings from '../models/StoreSettings';
import { clearAttributesCache } from './filterAttributeService';
import { triggerStockAlerts } from './stockAlertService';
import { detectColorFamily } from '../utils/colorFamilyDetector';

type LeanSku = ISku & { _id: mongoose.Types.ObjectId };
type PopulatedProductSummary = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  category?: string;
};
type LeanSkuWithProduct = LeanSku & {
  productId?: mongoose.Types.ObjectId | PopulatedProductSummary;
};

// ⚙️ פונקציה עזר לקביעה האם שינוי ב-SKU דורש ניקוי Cache של מאפייני סינון
const shouldInvalidateAttributesCache = (updates?: Record<string, any>): boolean => {
  if (!updates) {
    return false;
  }

  const keys = Object.keys(updates);
  const criticalFields = ['color', 'colorFamily', 'attributes', 'isActive'];

  return keys.some((key) => criticalFields.includes(key) || key.startsWith('attributes.'));
};

/**
 * סינכרון שדה quantityInStock במוצר לפי סכום המלאי של כל ה-SKUs שלו
 * נקרא אחרי כל עדכון מלאי של SKU
 */
const syncProductQuantityInStock = async (productId: string | mongoose.Types.ObjectId): Promise<void> => {
  try {
    // חישוב סה"כ מלאי מכל ה-SKUs של המוצר
    const result = await Sku.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId.toString()), isActive: true } },
      { $group: { _id: null, totalStock: { $sum: '$stockQuantity' } } }
    ]);
    
    const totalStock = result[0]?.totalStock || 0;
    
    // עדכון המוצר
    await Product.findByIdAndUpdate(productId, { quantityInStock: totalStock });
    
    console.log(`🔄 Synced product ${productId} quantityInStock to ${totalStock}`);
  } catch (error) {
    console.error('Error syncing product quantityInStock:', error);
    // לא זורקים שגיאה - הסינכרון הוא משני לעדכון ה-SKU
  }
};

/**
 * שירות SKU - ניהול יחידות מלאי (Stock Keeping Units)
 * מספק abstraction layer לכל פעולות ה-SKU
 */

/**
 * שליפת SKU לפי קוד
 * @param sku - קוד SKU ייחודי
 * @returns מסמך SKU או null אם לא נמצא
 */
export const getSkuByCode = async (
  sku: string
): Promise<LeanSkuWithProduct | null> => {
  try {
    const skuDoc = await Sku.findOne({ sku, isActive: true })
      .populate('productId', 'name category')
      .lean<LeanSkuWithProduct>(); // lean משיב אובייקט קל עם פרטי מוצר נלווים לצרכי הצגה בלבד
    return skuDoc;
  } catch (error) {
    console.error('Error fetching SKU by code:', error);
    throw new Error('Failed to fetch SKU');
  }
};

/**
 * שליפת כל SKUs של מוצר ספציפי
 * @param productId - מזהה המוצר
 * @param includeInactive - האם לכלול גם SKUs לא פעילים
 * @returns מערך של SKUs
 */
export const getSkusByProductId = async (
  productId: string | mongoose.Types.ObjectId,
  includeInactive: boolean = false
): Promise<LeanSku[]> => {
  try {
    const query: any = { productId };

    // אם לא מבוקש לכלול לא-פעילים, הוסף תנאי
    if (!includeInactive) {
      query.isActive = true;
    }

    const skus = await Sku.find(query)
      .sort({ sku: 1 })
      .lean(); // שימוש ב-lean כדי להחזיר רשומות קלות ללא תקורה של דוקומנט
    return skus;
  } catch (error) {
    console.error('Error fetching SKUs by product ID:', error);
    throw new Error('Failed to fetch SKUs');
  }
};

/**
 * עדכון מלאי אטומי
 * משתמש ב-findOneAndUpdate עם תנאי לעדכון בטוח
 * @param sku - קוד SKU
 * @param delta - שינוי במלאי (חיובי להוספה, שלילי להפחתה)
 * @returns SKU מעודכן או null אם נכשל
 */
export const updateStock = async (
  sku: string,
  delta: number
): Promise<ISkuDocument | null> => {
  try {
    // שמירת המלאי הקודם לבדיקה אם חזר למלאי (רק אם מוסיפים מלאי)
    let previousStock = 0;
    let productId: string | null = null;
    
    if (delta > 0) {
      const previousSku = await Sku.findOne({ sku, isActive: true })
        .select('stockQuantity productId')
        .lean();
      previousStock = previousSku?.stockQuantity || 0;
      productId = previousSku?.productId?.toString() || null;
    }

    // אם מורידים מלאי - ודא שיש מספיק
    const condition: any = { sku, isActive: true };

    if (delta < 0) {
      condition.stockQuantity = { $gte: Math.abs(delta) };
    }

    const updatedSku = await Sku.findOneAndUpdate(
      condition,
      { $inc: { stockQuantity: delta } },
      { new: true } // החזר את המסמך המעודכן
    );

    if (!updatedSku) {
      console.warn(
        `Failed to update stock for SKU ${sku}. Insufficient stock or SKU not found.`
      );
      return null;
    }

    // 🔄 סינכרון מלאי במוצר האב
    await syncProductQuantityInStock(updatedSku.productId);

    // 🔔 טריגר התראות מלאי: אם המוצר חזר למלאי (היה 0, עכשיו > 0)
    if (delta > 0 && previousStock === 0 && updatedSku.stockQuantity > 0) {
      console.log(`🔔 Product back in stock! Triggering alerts for SKU: ${sku}`);
      // שליחה אסינכרונית - לא מעכבת את הפעולה העיקרית
      triggerStockAlerts(sku, updatedSku.productId.toString()).catch((err) => {
        console.error('Error triggering stock alerts:', err);
      });
    }

    return updatedSku;
  } catch (error) {
    console.error('Error updating stock:', error);
    throw new Error('Failed to update stock');
  }
};

// ============================================================================
// 🔥 פונקציות אטומיות חדשות למניעת Race Conditions (Phase 0.5.8)
// ============================================================================

/**
 * הפחתת מלאי אטומית עם בדיקת זמינות (לשימוש בהזמנות)
 * 
 * CRITICAL: משתמש ב-$inc אטומי עם תנאי stockQuantity >= quantity.
 * מבטיח שלא תתבצע overselling גם במקרה של 2 הזמנות בו-זמנית.
 * 
 * @param sku - קוד SKU
 * @param quantity - כמות להפחתה (חיובית)
 * @returns SKU מעודכן או null אם אין מספיק במלאי
 */
export const decrementStockAtomic = async (
  sku: string,
  quantity: number
): Promise<ISkuDocument | null> => {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }

  try {
    // עדכון אטומי: מוריד רק אם יש מספיק במלאי
    const updatedSku = await Sku.findOneAndUpdate(
      {
        sku,
        isActive: true,
        stockQuantity: { $gte: quantity }, // CRITICAL: ודא שיש מספיק
      },
      {
        $inc: { stockQuantity: -quantity }, // ATOMIC: הפחתה אטומית
      },
      { new: true }
    );

    if (!updatedSku) {
      console.warn(
        `Cannot decrement stock for SKU ${sku}. ` +
        `Insufficient stock (needed: ${quantity}) or SKU not found.`
      );
      return null;
    }

    console.log(
      `✅ Stock decremented atomically: ${sku} (-${quantity}, remaining: ${updatedSku.stockQuantity})`
    );

    return updatedSku;
  } catch (error) {
    console.error('Error decrementing stock:', error);
    throw new Error('Failed to decrement stock');
  }
};

/**
 * הוספת מלאי אטומית (לשימוש בביטולים או החזרת מלאי)
 * 
 * @param sku - קוד SKU
 * @param quantity - כמות להוספה (חיובית)
 * @returns SKU מעודכן או null אם SKU לא נמצא
 */
export const incrementStockAtomic = async (
  sku: string,
  quantity: number
): Promise<ISkuDocument | null> => {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive');
  }

  try {
    // שמירת המלאי הקודם לבדיקה אם חזר למלאי
    const previousSku = await Sku.findOne({ sku, isActive: true })
      .select('stockQuantity productId')
      .lean();
    
    const previousStock = previousSku?.stockQuantity || 0;

    // עדכון אטומי: הוספה ללא תנאי נוסף (אין בעיית race condition בהוספה)
    const updatedSku = await Sku.findOneAndUpdate(
      {
        sku,
        isActive: true,
      },
      {
        $inc: { stockQuantity: quantity }, // ATOMIC: הוספה אטומית
      },
      { new: true }
    );

    if (!updatedSku) {
      console.warn(`Cannot increment stock for SKU ${sku}. SKU not found or inactive.`);
      return null;
    }

    console.log(
      `✅ Stock incremented atomically: ${sku} (+${quantity}, total: ${updatedSku.stockQuantity})`
    );

    // 🔔 טריגר התראות מלאי: אם המוצר חזר למלאי (היה 0, עכשיו > 0)
    if (previousStock === 0 && updatedSku.stockQuantity > 0) {
      console.log(`🔔 Product back in stock! Triggering alerts for SKU: ${sku}`);
      // שליחה אסינכרונית - לא מעכבת את הפעולה העיקרית
      triggerStockAlerts(sku, updatedSku.productId.toString()).catch((err) => {
        console.error('Error triggering stock alerts:', err);
      });
    }

    return updatedSku;
  } catch (error) {
    console.error('Error incrementing stock:', error);
    throw new Error('Failed to increment stock');
  }
};

/**
 * הפחתת מלאי למספר SKUs בבת אחת (Transaction)
 * 
 * CRITICAL: מבצע את כל ההפחתות בtransaction אחת.
 * אם אחת נכשלת - כולן מתבטלות (rollback).
 * 
 * @param items - מערך של { sku, quantity }
 * @returns אובייקט עם { success: boolean, failed?: string[] }
 */
export const bulkDecrementStockAtomic = async (
  items: Array<{ sku: string; quantity: number }>
): Promise<{ success: boolean; failed?: string[] }> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const failedSkus: string[] = [];

    for (const item of items) {
      // עדכון אטומי לכל SKU (עם session לתמיכה ב-transaction)
      const result = await Sku.findOneAndUpdate(
        {
          sku: item.sku,
          isActive: true,
          stockQuantity: { $gte: item.quantity },
        },
        {
          $inc: { stockQuantity: -item.quantity },
        },
        { new: true, session }
      );

      if (!result) {
        // אם אחד נכשל - סמן לרשימה
        failedSkus.push(item.sku);
      }
    }

    // אם יש כשלונות - rollback
    if (failedSkus.length > 0) {
      await session.abortTransaction();
      console.warn(
        `Transaction aborted - insufficient stock for: ${failedSkus.join(', ')}`
      );
      return { success: false, failed: failedSkus };
    }

    // הכל עבר - commit
    await session.commitTransaction();
    console.log(
      `✅ Bulk stock decrement completed for ${items.length} SKUs (Transaction committed)`
    );

    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in bulk decrement:', error);
    throw new Error('Failed to decrement stock in bulk');
  } finally {
    session.endSession();
  }
};

/**
 * החזרת מלאי למספר SKUs בבת אחת (Transaction)
 * שימושי לביטול הזמנה.
 * 
 * @param items - מערך של { sku, quantity }
 * @returns true אם הצליח, false אחרת
 */
export const bulkIncrementStockAtomic = async (
  items: Array<{ sku: string; quantity: number }>
): Promise<boolean> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of items) {
      await Sku.findOneAndUpdate(
        {
          sku: item.sku,
          isActive: true,
        },
        {
          $inc: { stockQuantity: item.quantity },
        },
        { new: true, session }
      );
    }

    await session.commitTransaction();
    console.log(
      `✅ Bulk stock increment completed for ${items.length} SKUs (Transaction committed)`
    );

    return true;
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in bulk increment:', error);
    return false;
  } finally {
    session.endSession();
  }
};

/**
 * בדיקת זמינות מלאי
 * @param sku - קוד SKU
 * @param quantity - כמות מבוקשת
 * @returns true אם יש מספיק במלאי, false אם לא
 */
export const checkAvailability = async (
  sku: string,
  quantity: number
): Promise<boolean> => {
  try {
    const skuDoc = await Sku.findOne({ sku, isActive: true })
      .select('stockQuantity')
      .lean(); // קריאה מינימלית לבדיקה בלבד בלי עטיפה של דוקומנט

    if (!skuDoc) {
      return false;
    }

    return skuDoc.stockQuantity >= quantity;
  } catch (error) {
    console.error('Error checking availability:', error);
    throw new Error('Failed to check availability');
  }
};

/**
 * יצירת SKU חדש
 * @param skuData - נתוני SKU
 * @returns SKU שנוצר
 */
export const createSku = async (
  skuData: Partial<ISkuDocument>
): Promise<ISkuDocument> => {
  try {
    // ודא שהמוצר קיים
    const product = await Product.findById(skuData.productId)
      .select('_id')
      .lean(); // וידוא קיום מוצר תוך חיסכון בתקורה של מסמך מלא
    if (!product) {
      throw new Error('Product not found');
    }

    // בדוק אם SKU כבר קיים
    const existingSku = await Sku.findOne({ sku: skuData.sku })
      .select('_id')
      .lean(); // בדיקת כפילות יעילה לפני יצירה
    if (existingSku) {
      throw new Error('SKU code already exists');
    }

    // יצירת SKU חדש עם שדות שטוחים (color, size)
    const newSku = new Sku(skuData);
    await newSku.save();

    // ניקוי ה-Cache של מאפייני סינון כי נוספה יחידת SKU חדשה
    clearAttributesCache();

    return newSku;
  } catch (error) {
    console.error('Error creating SKU:', error);
    throw error;
  }
};

/**
 * עדכון SKU קיים
 * @param sku - קוד SKU לעדכון
 * @param updates - שדות לעדכון
 * @returns SKU מעודכן או null אם לא נמצא
 */
export const updateSku = async (
  sku: string,
  updates: Partial<ISkuDocument>
): Promise<ISkuDocument | null> => {
  try {
    // מנע עדכון של שדות קריטיים
    const { _id, sku: skuCode, productId, ...safeUpdates } = updates as any;

    // 🎨 Auto-assign colorFamily אם color השתנה ואין colorFamilySource='manual'
    if (safeUpdates.color !== undefined && safeUpdates.colorFamilySource !== 'manual') {
      const detection = detectColorFamily(safeUpdates.color);
      if (detection.family) {
        safeUpdates.colorFamily = detection.family;
        safeUpdates.colorFamilySource = 'auto';
      }
    }

    // עדכון SKU עם שדות שטוחים (color, size) - אין צורך בנרמול
    const updatedSku = await Sku.findOneAndUpdate(
      { sku },
      { $set: safeUpdates },
      { new: true, runValidators: true }
    );

    if (updatedSku && shouldInvalidateAttributesCache(safeUpdates)) {
      // אם שדות שמושפעים מסינון השתנו, מנקים Cache כדי לעדכן usageCount
      clearAttributesCache();
    }

    return updatedSku;
  } catch (error) {
    console.error('Error updating SKU:', error);
    throw new Error('Failed to update SKU');
  }
};

/**
 * מחיקה רכה של SKU (סימון כלא פעיל)
 * @param sku - קוד SKU למחיקה
 * @returns SKU מעודכן או null אם לא נמצא
 */
export const softDeleteSku = async (
  sku: string
): Promise<ISkuDocument | null> => {
  try {
    const updatedSku = await Sku.findOneAndUpdate(
      { sku },
      { $set: { isActive: false } },
      { new: true }
    );

    if (updatedSku) {
      // מחיקה רכה משפיעה על ספירות מאפיינים ולכן נדרש ניקוי Cache
      clearAttributesCache();
    }

    return updatedSku;
  } catch (error) {
    console.error('Error deleting SKU:', error);
    throw new Error('Failed to delete SKU');
  }
};

/**
 * מחיקה קשה של SKU (הסרה ממסד הנתונים)
 * **שימוש בזהירות!**
 * @param sku - קוד SKU למחיקה
 * @returns true אם נמחק, false אם לא נמצא
 */
export const hardDeleteSku = async (sku: string): Promise<boolean> => {
  try {
    const result = await Sku.deleteOne({ sku });
    if (result.deletedCount && result.deletedCount > 0) {
      // מחיקה מוחלטת מפחיתה שימוש במאפיינים ולכן צריך לרענן Cache
      clearAttributesCache();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error hard deleting SKU:', error);
    throw new Error('Failed to delete SKU');
  }
};

/**
 * חיפוש SKUs לפי קריטריונים
 * @param filters - פילטרים (למשל: { 'attributes.color': 'red', stockQuantity: { $gt: 0 } })
 * @param options - אפשרויות (limit, skip, sort)
 * @returns מערך SKUs
 */
export const searchSkus = async (
  filters: any = {},
  options: {
    limit?: number;
    skip?: number;
    sort?: any;
  } = {}
): Promise<LeanSkuWithProduct[]> => {
  try {
    const { limit = 50, skip = 0, sort = { sku: 1 } } = options;

    // הוסף תנאי isActive אוטומטית אם לא צוין אחרת
    if (filters.isActive === undefined) {
      filters.isActive = true;
    }

    const skus = await Sku.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('productId', 'name category')
      .lean<LeanSkuWithProduct[]>(); // lean מחזיר מבנים שטוחים לחיפוש ללא צורך במתודות דוקומנט

    return skus;
  } catch (error) {
    console.error('Error searching SKUs:', error);
    throw new Error('Failed to search SKUs');
  }
};

/**
 * ספירת SKUs לפי קריטריונים
 * @param filters - פילטרים
 * @returns מספר SKUs
 */
export const countSkus = async (filters: any = {}): Promise<number> => {
  try {
    if (filters.isActive === undefined) {
      filters.isActive = true;
    }

    const count = await Sku.countDocuments(filters);
    return count;
  } catch (error) {
    console.error('Error counting SKUs:', error);
    throw new Error('Failed to count SKUs');
  }
};

/**
 * שליפת כל SKUs לניהול מלאי עם פגינציה, חיפוש ומיון
 * @param options - אפשרויות חיפוש
 * @returns אובייקט עם SKUs, סה"כ, ומידע נוסף
 */
export const getInventorySkus = async (
  options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    stockFilter?: 'all' | 'low' | 'out' | 'in';
    categoryId?: string;
  } = {}
): Promise<{
  skus: LeanSkuWithProduct[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      sortBy = 'sku',
      sortOrder = 'asc',
      stockFilter = 'all',
      categoryId,
    } = options;

    const skip = (page - 1) * limit;

    // קבלת סף מלאי נמוך מהגדרות החנות
    let globalThreshold = 5;
    try {
      const settings = await StoreSettings.getSettings();
      globalThreshold = settings.inventory?.defaultLowStockThreshold ?? 5;
    } catch {
      // fallback to 5
    }

    // בניית פילטרים בסיסיים
    const matchStage: any = { isActive: true };

    // פילטר מלאי - משתמש בסף מההגדרות
    if (stockFilter === 'out') {
      matchStage.stockQuantity = 0;
    } else if (stockFilter === 'low') {
      matchStage.stockQuantity = { $gt: 0, $lte: globalThreshold };
    } else if (stockFilter === 'in') {
      matchStage.stockQuantity = { $gt: globalThreshold };
    }

    // חיפוש טקסטואלי
    if (search) {
      matchStage.$or = [
        { sku: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    // סינון לפי קטגוריה - אם נבחרה קטגוריה, משתמש ב-aggregation pipeline
    // כדי לסנן SKUs שהמוצר שלהם שייך לקטגוריה זו
    let skus: LeanSkuWithProduct[];
    let total: number;

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      // שימוש ב-aggregation pipeline לסינון לפי קטגוריה של המוצר
      const pipeline: PipelineStage[] = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'productData'
          }
        },
        { $unwind: '$productData' },
        {
          $match: {
            'productData.categoryId': new mongoose.Types.ObjectId(categoryId)
          }
        },
        {
          $addFields: {
            productId: {
              _id: '$productData._id',
              name: '$productData.name',
              category: '$productData.category',
              slug: '$productData.slug',
              images: '$productData.images',
              lowStockThreshold: '$productData.lowStockThreshold'
            }
          }
        },
        { $project: { productData: 0 } }
      ];

      // ספירה כוללת
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await Sku.aggregate(countPipeline);
      total = countResult[0]?.total || 0;

      // מיון ופגינציה
      const sortStage: any = {};
      sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      pipeline.push({ $sort: sortStage });
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      skus = await Sku.aggregate(pipeline);
    } else {
      // אם אין סינון לפי קטגוריה - שימוש בשאילתה רגילה
      const sortStage: any = {};
      sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;

      skus = await Sku.find(matchStage)
        .sort(sortStage)
        .skip(skip)
        .limit(limit)
        .populate('productId', 'name category slug images lowStockThreshold')
        .lean<LeanSkuWithProduct[]>();

      total = await Sku.countDocuments(matchStage);
    }

    return {
      skus,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Error fetching inventory SKUs:', error);
    throw new Error('Failed to fetch inventory SKUs');
  }
};

/**
 * עדכון כמות מלאי ישירה (לא delta) - לניהול מלאי
 * @param sku - קוד SKU
 * @param newQuantity - כמות מלאי חדשה
 * @returns SKU מעודכן או null
 */
export const setStockQuantity = async (
  sku: string,
  newQuantity: number
): Promise<ISkuDocument | null> => {
  if (newQuantity < 0) {
    throw new Error('Stock quantity cannot be negative');
  }

  try {
    // שמירת המלאי הקודם לבדיקה אם חזר למלאי
    const previousSku = await Sku.findOne({ sku, isActive: true })
      .select('stockQuantity productId')
      .lean();
    
    const previousStock = previousSku?.stockQuantity || 0;

    const updatedSku = await Sku.findOneAndUpdate(
      { sku, isActive: true },
      { $set: { stockQuantity: newQuantity } },
      { new: true }
    );

    if (!updatedSku) {
      return null;
    }

    // 🔄 סינכרון מלאי במוצר האב
    await syncProductQuantityInStock(updatedSku.productId);

    // 🔔 טריגר התראות מלאי: אם המוצר חזר למלאי (היה 0, עכשיו > 0)
    if (previousStock === 0 && newQuantity > 0) {
      console.log(`🔔 Product back in stock! Triggering alerts for SKU: ${sku}`);
      triggerStockAlerts(sku, updatedSku.productId.toString()).catch((err) => {
        console.error('Error triggering stock alerts:', err);
      });
    }

    return updatedSku;
  } catch (error) {
    console.error('Error setting stock quantity:', error);
    throw new Error('Failed to set stock quantity');
  }
};

/**
 * קבלת SKUs עם מלאי נמוך (כולל מוצרים שאזלו לגמרי)
 * @param threshold - סף מינימלי (אם לא מצוין, ישתמש בהגדרות החנות או 5)
 * @returns מערך SKUs עם מלאי נמוך או אזל מלאי
 */
export const getLowStockSkus = async (
  threshold?: number
): Promise<LeanSkuWithProduct[]> => {
  try {
    // אם לא הועבר סף, מביאים מהגדרות החנות
    let defaultThreshold = 5;
    if (threshold === undefined) {
      try {
        const settings = await StoreSettings.getSettings();
        defaultThreshold = settings.inventory?.defaultLowStockThreshold ?? 5;
      } catch {
        // fallback to 5
      }
    } else {
      defaultThreshold = threshold;
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          isActive: true,
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          // חישוב הסף האפקטיבי: אם threshold הוגדר במפורש משתמשים בו,
          // אחרת משתמשים בסף של המוצר (או ברירת מחדל אם לא קיים)
          effectiveThreshold:
            threshold !== undefined
              ? { $literal: threshold }
              : { $ifNull: ['$product.lowStockThreshold', defaultThreshold] },
        },
      },
      {
        $match: {
          $expr: {
            $lte: ['$stockQuantity', '$effectiveThreshold'],
          },
        },
      },
      {
        $sort: {
          stockQuantity: 1,
        },
      },
      {
        $project: {
          sku: 1,
          name: 1,
          stockQuantity: 1,
          lowStockThreshold: '$effectiveThreshold',
          productId: {
            $cond: {
              if: { $ifNull: ['$product', false] },
              then: {
                _id: '$product._id',
                name: '$product.name',
                category: '$product.category',
              },
              else: '$productId',
            },
          },
        },
      },
    ];

    const skus = await Sku.aggregate(pipeline).exec();

    return skus as unknown as LeanSkuWithProduct[];
  } catch (error) {
    console.error('Error fetching low stock SKUs:', error);
    throw new Error('Failed to fetch low stock SKUs');
  }
};

/**
 * קבלת SKUs שאזל מלאיים
 * @returns מערך SKUs ללא מלאי
 */
export const getOutOfStockSkus = async (): Promise<LeanSkuWithProduct[]> => {
  try {
    const skus = await Sku.find({
      isActive: true,
      stockQuantity: 0,
    })
      .populate('productId', 'name category')
      .lean<LeanSkuWithProduct[]>(); // lean מחזיר רשימת אזל מלאי ללא צורך במתודות המשך

    return skus;
  } catch (error) {
    console.error('Error fetching out of stock SKUs:', error);
    throw new Error('Failed to fetch out of stock SKUs');
  }
};

/**
 * עדכון מלאי בצובר (Bulk Update)
 * @param updates - מערך של { sku, delta }
 * @returns מערך תוצאות
 */
export const bulkUpdateStock = async (
  updates: Array<{ sku: string; delta: number }>
): Promise<Array<{ sku: string; success: boolean; error?: string }>> => {
  const results = [];

  for (const update of updates) {
    try {
      const result = await updateStock(update.sku, update.delta);
      results.push({
        sku: update.sku,
        success: !!result,
        error: result ? undefined : 'Insufficient stock or SKU not found',
      });
    } catch (error: any) {
      results.push({
        sku: update.sku,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
};

export default {
  getSkuByCode,
  getSkusByProductId,
  updateStock,
  checkAvailability,
  createSku,
  updateSku,
  softDeleteSku,
  hardDeleteSku,
  searchSkus,
  countSkus,
  getLowStockSkus,
  getOutOfStockSkus,
  bulkUpdateStock,
  // Phase 0.5.8: פונקציות אטומיות חדשות
  decrementStockAtomic,
  incrementStockAtomic,
  bulkDecrementStockAtomic,
  bulkIncrementStockAtomic,
};
