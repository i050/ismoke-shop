/**
 * Inventory Worker
 * ================
 * מעבד משימות מלאי מהתור
 * - שמירת מלאי להזמנה
 * - שחרור מלאי בביטול
 * - עדכון מלאי
 * - התראות מלאי נמוך
 * 
 * הערה: משתמש ב-stockQuantity מה-SKU model הקיים
 */

import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, InventoryJobData, getSharedRedisConnection } from '../index';
import { Sku, ISkuDocument } from '../../models/Sku';
import { Product } from '../../models/Product';
import StoreSettings from '../../models/StoreSettings';
import { logger } from '../../utils/logger';
import mongoose from 'mongoose';

// סף ברירת מחדל למלאי נמוך (fallback אם אין הגדרות)
const FALLBACK_LOW_STOCK_THRESHOLD = 5;

/**
 * פונקציה לקבלת סף המלאי הנמוך הגלובלי מהגדרות החנות
 */
async function getGlobalLowStockThreshold(): Promise<number> {
  try {
    const settings = await StoreSettings.getSettings();
    return settings.inventory?.defaultLowStockThreshold ?? FALLBACK_LOW_STOCK_THRESHOLD;
  } catch {
    return FALLBACK_LOW_STOCK_THRESHOLD;
  }
}

/**
 * פונקציה לקבלת סף המלאי הנמוך עבור SKU
 * מחזירה את הסף מהמוצר אם הוגדר, אחרת את ברירת המחדל מהגדרות החנות
 */
async function getLowStockThreshold(productId: mongoose.Types.ObjectId | string): Promise<number> {
  try {
    const product = await Product.findById(productId).select('lowStockThreshold').lean();
    if (product?.lowStockThreshold !== undefined && product.lowStockThreshold !== null) {
      return product.lowStockThreshold;
    }
    // אם אין סף ספציפי למוצר, מחזירים את הסף הגלובלי
    return await getGlobalLowStockThreshold();
  } catch {
    return FALLBACK_LOW_STOCK_THRESHOLD;
  }
}

// =============================================================================
// פונקציות טיפול במלאי
// =============================================================================

/**
 * שמירת מלאי להזמנה
 * מוריד מהמלאי הזמין - בפועל בודק שיש מספיק ומקטין אותו
 * (במערכת פשוטה יותר - ללא מעקב אחרי reserved)
 */
async function reserveStock(
  items: InventoryJobData['items'],
  orderId: string
): Promise<{ success: boolean; reserved: string[] }> {
  
  const session = await mongoose.startSession();
  const reserved: string[] = [];
  
  try {
    session.startTransaction();
    
    for (const item of items) {
      const sku = await Sku.findById(item.skuId).session(session);
      
      if (!sku) {
        throw new Error(`SKU ${item.skuId} לא נמצא`);
      }
      
      // בדיקת מלאי זמין
      const availableStock = sku.stockQuantity;
      
      if (availableStock < item.quantity) {
        throw new Error(`אין מספיק מלאי ל-SKU ${sku.sku}. זמין: ${availableStock}, נדרש: ${item.quantity}`);
      }
      
      // הורדת מלאי (במערכת מורכבת יותר היינו מעבירים ל-reserved)
      sku.stockQuantity = sku.stockQuantity - item.quantity;
      await sku.save({ session });
      
      reserved.push(item.skuId);
      
      logger.debug('📦 מלאי הופחת', {
        skuId: item.skuId,
        sku: sku.sku,
        quantity: item.quantity,
        newStock: sku.stockQuantity,
        orderId
      });
      
      // בדיקת התראת מלאי נמוך - לפי סף המוצר או ברירת מחדל
      const threshold = await getLowStockThreshold(sku.productId);
      if (sku.stockQuantity <= threshold) {
        logger.warn('⚠️ מלאי נמוך!', {
          skuId: item.skuId,
          sku: sku.sku,
          stock: sku.stockQuantity,
          threshold
        });
      }
    }
    
    await session.commitTransaction();
    
    logger.info('✅ מלאי נשמר להזמנה', {
      orderId,
      itemsCount: items.length
    });
    
    return { success: true, reserved };
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * שחרור מלאי שמור
 * מחזיר מלאי למלאי זמין (בביטול הזמנה)
 */
async function releaseStock(
  items: InventoryJobData['items'],
  orderId: string
): Promise<{ success: boolean; released: string[] }> {
  
  const session = await mongoose.startSession();
  const released: string[] = [];
  
  try {
    session.startTransaction();
    
    for (const item of items) {
      const sku = await Sku.findById(item.skuId).session(session);
      
      if (!sku) {
        logger.warn(`SKU ${item.skuId} לא נמצא לשחרור מלאי`);
        continue;
      }
      
      // החזרת מלאי
      sku.stockQuantity = sku.stockQuantity + item.quantity;
      await sku.save({ session });
      
      released.push(item.skuId);
      
      logger.debug('📦 מלאי שוחרר', {
        skuId: item.skuId,
        sku: sku.sku,
        quantity: item.quantity,
        newStock: sku.stockQuantity,
        orderId
      });
    }
    
    await session.commitTransaction();
    
    logger.info('✅ מלאי שוחרר', {
      orderId,
      itemsCount: released.length
    });
    
    return { success: true, released };
    
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * עדכון מלאי לאחר משלוח
 * (במימוש הנוכחי - המלאי כבר הופחת בשלב reserve)
 */
async function updateStock(
  items: InventoryJobData['items'],
  orderId: string
): Promise<{ success: boolean }> {
  
  // במימוש פשוט - המלאי כבר הופחת ב-reserveStock
  // כאן רק לוגים לצורך מעקב
  
  logger.info('📦 עדכון מלאי - הזמנה נשלחה', {
    orderId,
    itemsCount: items.length
  });
  
  // בדיקת מלאי נמוך לכל הפריטים - לפי סף המוצר
  for (const item of items) {
    const sku = await Sku.findById(item.skuId);
    
    if (sku) {
      const threshold = await getLowStockThreshold(sku.productId);
      if (sku.stockQuantity <= threshold) {
        logger.warn('⚠️ מלאי נמוך!', {
          skuId: item.skuId,
          sku: sku.sku,
          stock: sku.stockQuantity,
          threshold
        });
      }
    }
  }
  
  return { success: true };
}

/**
 * בדיקת התראות מלאי נמוך
 * משתמש בסף המוגדר לכל מוצר או ברירת מחדל
 */
async function checkLowStockAlerts(): Promise<{ alertsSent: number }> {
  // שליפת כל ה-SKUs הפעילים עם פרטי המוצר
  const skusWithProducts = await Sku.find({
    isActive: true
  }).populate('productId', 'lowStockThreshold').limit(500);
  
  // קבלת הסף הגלובלי מההגדרות
  const globalThreshold = await getGlobalLowStockThreshold();
  
  let alertsSent = 0;
  
  for (const sku of skusWithProducts) {
    // קבלת הסף מהמוצר או ברירת מחדל מההגדרות
    const product = sku.productId as unknown as { lowStockThreshold?: number };
    const threshold = product?.lowStockThreshold ?? globalThreshold;
    
    if (sku.stockQuantity <= threshold) {
      logger.warn('⚠️ התראת מלאי נמוך', {
        skuId: sku._id,
        sku: sku.sku,
        stock: sku.stockQuantity,
        threshold
      });
      alertsSent++;
      
      // TODO: שליחת מייל למנהלים
    }
  }
  
  return { alertsSent };
}

// =============================================================================
// פונקציית עיבוד משימת מלאי
// =============================================================================

async function processInventoryJob(job: Job<InventoryJobData>): Promise<unknown> {
  const { type, items, orderId, reason } = job.data;
  
  logger.info('📦 מעבד משימת מלאי', {
    jobId: job.id,
    type,
    orderId,
    itemsCount: items.length,
    attempt: job.attemptsMade + 1
  });
  
  try {
    switch (type) {
      case 'reserve_stock':
        return await reserveStock(items, orderId!);
        
      case 'release_stock':
        return await releaseStock(items, orderId!);
        
      case 'update_stock':
        return await updateStock(items, orderId!);
        
      case 'low_stock_alert':
        return await checkLowStockAlerts();
        
      default:
        throw new Error(`סוג משימה לא מוכר: ${type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    
    logger.error('❌ כישלון בעיבוד מלאי', {
      jobId: job.id,
      type,
      orderId,
      error: errorMessage,
      attempt: job.attemptsMade + 1
    });
    
    throw error;
  }
}

// =============================================================================
// יצירת ה-Worker
// =============================================================================

let inventoryWorker: Worker | null = null;

export function startInventoryWorker(): Worker {
  if (inventoryWorker) {
    logger.warn('Inventory Worker כבר רץ');
    return inventoryWorker;
  }
  
  inventoryWorker = new Worker<InventoryJobData>(
    QUEUE_NAMES.INVENTORY,
    processInventoryJob,
    {
      connection: getSharedRedisConnection(),
      concurrency: 3,  // מלאי דורש זהירות - פחות במקביל
      limiter: {
        max: 5,
        duration: 1000
      }
    }
  );
  
  // Event handlers
  inventoryWorker.on('completed', (job) => {
    logger.info('✅ משימת מלאי הושלמה', {
      jobId: job.id,
      type: job.data.type,
      orderId: job.data.orderId
    });
  });
  
  inventoryWorker.on('failed', (job, error) => {
    logger.error('❌ משימת מלאי נכשלה', {
      jobId: job?.id,
      type: job?.data.type,
      error: error.message
    });
  });
  
  inventoryWorker.on('error', (error) => {
    logger.error('❌ שגיאת Inventory Worker', {
      error: error.message
    });
  });
  
  logger.info('📦 Inventory Worker התחיל');
  
  return inventoryWorker;
}

export async function stopInventoryWorker(): Promise<void> {
  if (inventoryWorker) {
    await inventoryWorker.close();
    inventoryWorker = null;
    logger.info('📦 Inventory Worker נעצר');
  }
}

export { inventoryWorker };
