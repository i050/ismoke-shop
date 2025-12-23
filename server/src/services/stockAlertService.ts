import mongoose from 'mongoose';
import StockAlert, { IStockAlertDocument, StockAlertStatus } from '../models/StockAlert';
import StockAlertLog from '../models/StockAlertLog';
import Product from '../models/Product';
import Sku from '../models/Sku';
import { addEmailJob } from '../queues';
import { logger } from '../utils/logger';

// ============================================================================
// שירות התראות מלאי - Stock Alert Service
// מנהל את כל הלוגיקה העסקית של מערכת "עדכן אותי כשהמוצר יחזור"
// ============================================================================

// ============================================================================
// Rate Limiting - הגבלת קצב בקשות
// ============================================================================

/**
 * מפה לשמירת מידע על Rate Limit לפי IP
 * בפרודקשן - מומלץ להשתמש ב-Redis לתמיכה במספר instances
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// הגדרות Rate Limit
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 דקות (במילישניות)
const RATE_LIMIT_MAX = 5; // מקסימום 5 בקשות לכל IP בחלון זמן

/**
 * בדיקת Rate Limit לפי IP
 * מונע שימוש לרעה במערכת ההרשמה
 * @param ipAddress - כתובת IP של המבקש
 * @returns true אם מותר, false אם חרגו ממכסה
 */
const checkRateLimit = (ipAddress: string): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(ipAddress);

  // אם אין רשומה או שעבר זמן האיפוס - צור רשומה חדשה
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ipAddress, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  // בדוק אם חרגו מהמכסה
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  // עדכן את הספירה
  record.count++;
  return true;
};

/**
 * ניקוי רשומות Rate Limit ישנות (לזיכרון)
 * יש לקרוא מעת לעת ב-interval
 */
export const cleanupRateLimitMap = (): void => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
};

// ניקוי אוטומטי כל 10 דקות
setInterval(cleanupRateLimitMap, 10 * 60 * 1000);

// ============================================================================
// פונקציות ראשיות - Core Functions
// ============================================================================

/**
 * יצירת התראת מלאי חדשה
 * @description נרשם לקוח לקבלת התראה כשמוצר/SKU ספציפי חוזר למלאי
 * 
 * @param data - נתוני ההתראה
 * @param data.productId - מזהה המוצר
 * @param data.email - אימייל הלקוח
 * @param data.skuCode - קוד SKU ספציפי (אופציונלי)
 * @param data.phone - טלפון (אופציונלי - לעתיד)
 * @param data.userId - מזהה משתמש (אם מחובר)
 * @param data.ipAddress - כתובת IP
 * @param data.userAgent - User Agent
 * @returns התראה שנוצרה
 * @throws Error אם Rate Limit חרג, מוצר לא נמצא, או קיימת התראה פעילה
 */
export const createStockAlert = async (data: {
  productId: string;
  email: string;
  skuCode?: string;
  phone?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<IStockAlertDocument> => {
  const { productId, email, skuCode, phone, userId, ipAddress, userAgent } = data;

  // 1. בדיקת Rate Limit
  if (ipAddress && !checkRateLimit(ipAddress)) {
    logger.warn('Rate limit exceeded for stock alert', { ipAddress, email });
    throw new Error('TOO_MANY_REQUESTS');
  }

  // 2. ולידציית מוצר - ודא שהמוצר קיים
  const product = await Product.findById(productId).select('_id name').lean();
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  // 3. אם צוין SKU - ודא שהוא קיים ושייך למוצר
  if (skuCode) {
    const sku = await Sku.findOne({ 
      sku: skuCode.toUpperCase(), 
      productId,
      isActive: true 
    }).select('_id').lean();
    
    if (!sku) {
      throw new Error('SKU_NOT_FOUND');
    }
  }

  // 4. בדיקת כפילויות - האם כבר קיימת התראה פעילה?
  const existingAlert = await StockAlert.findOne({
    email: email.toLowerCase(),
    productId,
    skuCode: skuCode ? skuCode.toUpperCase() : { $exists: false },
    status: 'active',
  });

  if (existingAlert) {
    throw new Error('ALERT_ALREADY_EXISTS');
  }

  // 5. יצירת ההתראה
  const alert = await StockAlert.create({
    productId,
    email: email.toLowerCase(),
    skuCode: skuCode ? skuCode.toUpperCase() : undefined,
    phone,
    userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    ipAddress,
    userAgent,
    status: 'active',
  });

  logger.info('Stock alert created', {
    alertId: alert._id,
    productId,
    email: email.toLowerCase(),
    skuCode,
  });

  return alert;
};

/**
 * בדיקה האם משתמש כבר נרשם להתראה על מוצר
 * @param email - אימייל הלקוח
 * @param productId - מזהה המוצר
 * @param skuCode - קוד SKU (אופציונלי)
 * @returns true אם קיימת התראה פעילה
 */
export const checkExistingAlert = async (
  email: string,
  productId: string,
  skuCode?: string
): Promise<boolean> => {
  const query: any = {
    email: email.toLowerCase(),
    productId,
    status: 'active',
  };

  // אם צוין SKU - חפש התראה ספציפית ל-SKU
  if (skuCode) {
    query.skuCode = skuCode.toUpperCase();
  }

  const existingAlert = await StockAlert.findOne(query).select('_id').lean();
  return !!existingAlert;
};

/**
 * ביטול התראת מלאי
 * @param alertId - מזהה ההתראה
 * @param email - אימייל לוידוא (אבטחה)
 * @returns true אם בוטלה בהצלחה
 */
export const cancelStockAlert = async (
  alertId: string,
  email: string
): Promise<boolean> => {
  const result = await StockAlert.findOneAndUpdate(
    {
      _id: alertId,
      email: email.toLowerCase(),
      status: 'active',
    },
    {
      $set: { status: 'cancelled' },
    },
    { new: true }
  );

  if (result) {
    logger.info('Stock alert cancelled', { alertId, email });
  }

  return !!result;
};

/**
 * ביטול התראה לפי token (לקישור unsubscribe במייל)
 * @description Token הוא ה-_id של ההתראה מקודד ב-Base64
 * @param token - טוקן מקודד
 * @returns true אם בוטלה בהצלחה
 */
export const cancelAlertByToken = async (token: string): Promise<boolean> => {
  try {
    // פענוח ה-Token (Base64 -> ObjectId)
    const alertId = Buffer.from(token, 'base64').toString('utf-8');

    // ולידציה שזה ObjectId תקין
    if (!mongoose.Types.ObjectId.isValid(alertId)) {
      return false;
    }

    const result = await StockAlert.findOneAndUpdate(
      {
        _id: alertId,
        status: 'active',
      },
      {
        $set: { status: 'cancelled' },
      },
      { new: true }
    );

    if (result) {
      logger.info('Stock alert cancelled via token', { alertId });
    }

    return !!result;
  } catch (error) {
    logger.error('Error cancelling alert by token', { error, token });
    return false;
  }
};

// ============================================================================
// טריגר שליחת התראות - Alert Trigger
// ============================================================================

/**
 * טריגר שליחת התראות כשמוצר חוזר למלאי
 * @description נקרא אוטומטית כשמתעדכן מלאי ל-SKU
 * 
 * @param skuCode - קוד ה-SKU שחזר למלאי
 * @param productId - מזהה המוצר
 * @returns מספר ההתראות שנשלחו
 */
export const triggerStockAlerts = async (
  skuCode: string,
  productId: string
): Promise<number> => {
  try {
    // מציאת כל ההתראות הפעילות למוצר/SKU זה
    // כולל: התראות ספציפיות ל-SKU + התראות כלליות למוצר
    const alerts = await StockAlert.find({
      $or: [
        { productId, skuCode: skuCode.toUpperCase(), status: 'active' },
        { productId, skuCode: { $exists: false }, status: 'active' },
      ],
    }).lean();

    if (alerts.length === 0) {
      return 0;
    }

    // קבלת פרטי המוצר לתבנית המייל
    const product = await Product.findById(productId)
      .select('name slug images basePrice')
      .lean();

    if (!product) {
      logger.error('Product not found for stock alert trigger', { productId });
      return 0;
    }

    // קבלת פרטי ה-SKU
    const sku = await Sku.findOne({ sku: skuCode.toUpperCase() })
      .select('name price images')
      .lean();

    // שליחת מייל לכל התראה
    let sentCount = 0;

    for (const alert of alerts) {
      try {
        // יצירת Token לביטול התראה (Base64 של ה-ID)
        const unsubscribeToken = Buffer.from(alert._id.toString()).toString('base64');
        
        // URL לביטול התראה
        const unsubscribeUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/unsubscribe/${unsubscribeToken}`;
        
        // URL למוצר - בלי s ב-product
        const productUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/product/${(product as any).slug || productId}`;

        // הוספת משימת מייל לתור
        await addEmailJob({
          type: 'stock_alert' as any, // נוסיף את הסוג בשלב הבא
          to: alert.email,
          data: {
            productName: (product as any).name,
            productUrl,
            productImage: (product as any).images?.[0]?.medium || sku?.images?.[0]?.medium,
            skuName: sku?.name,
            skuCode,
            price: sku?.price || (product as any).basePrice,
            unsubscribeUrl,
          },
        });

        // עדכון סטטוס ההתראה
        await StockAlert.findByIdAndUpdate(alert._id, {
          $set: {
            status: 'sent' as StockAlertStatus,
            sentAt: new Date(),
          },
        });

        // רישום לוג הצלחה
        await StockAlertLog.create({
          alertId: alert._id,
          sentAt: new Date(),
          status: 'success',
          channel: 'email',
          metadata: {
            productName: (product as any).name,
            skuCode,
            recipientEmail: alert.email,
          },
        });

        sentCount++;
      } catch (error) {
        // רישום לוג כשלון
        await StockAlertLog.create({
          alertId: alert._id,
          sentAt: new Date(),
          status: 'failed',
          channel: 'email',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            productName: (product as any).name,
            skuCode,
            recipientEmail: alert.email,
          },
        });

        logger.error('Failed to send stock alert', {
          alertId: alert._id,
          email: alert.email,
          error,
        });
      }
    }

    logger.info('Stock alerts triggered', {
      skuCode,
      productId,
      totalAlerts: alerts.length,
      sentCount,
    });

    return sentCount;
  } catch (error) {
    logger.error('Error triggering stock alerts', { skuCode, productId, error });
    return 0;
  }
};

// ============================================================================
// פונקציות ניהול (Admin) - Admin Functions
// ============================================================================

/**
 * קבלת סטטיסטיקות התראות מלאי (לממשק ניהול)
 * @returns סטטיסטיקות מלאות
 */
export const getStockAlertStats = async (): Promise<{
  totalActive: number;
  totalSent: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    alertCount: number;
  }>;
}> => {
  const [totalActive, totalSent, topProducts] = await Promise.all([
    // ספירת התראות פעילות
    StockAlert.countDocuments({ status: 'active' }),

    // ספירת התראות שנשלחו
    StockAlert.countDocuments({ status: 'sent' }),

    // מוצרים עם הכי הרבה התראות פעילות
    StockAlert.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$productId',
          alertCount: { $sum: 1 },
        },
      },
      { $sort: { alertCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: { $toString: '$_id' },
          productName: '$product.name',
          alertCount: 1,
          _id: 0,
        },
      },
    ]),
  ]);

  return { totalActive, totalSent, topProducts };
};

/**
 * קבלת התראות לפי מוצר (לממשק ניהול)
 * @param productId - מזהה המוצר
 * @param status - סטטוס לסינון (אופציונלי)
 * @returns רשימת התראות
 */
export const getAlertsByProduct = async (
  productId: string,
  status?: StockAlertStatus
): Promise<IStockAlertDocument[]> => {
  const query: any = { productId };

  if (status) {
    query.status = status;
  }

  return StockAlert.find(query)
    .sort({ createdAt: -1 })
    .lean() as unknown as IStockAlertDocument[];
};

/**
 * קבלת כל ההתראות (לממשק ניהול) עם פילטרים ודפדוף
 * @param options - אפשרויות סינון ודפדוף
 * @returns רשימת התראות עם מידע נוסף
 */
export const getAllAlerts = async (options: {
  status?: StockAlertStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  alerts: IStockAlertDocument[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  const {
    status,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const query: any = {};
  if (status) {
    query.status = status;
  }

  const [alerts, total] = await Promise.all([
    StockAlert.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('productId', 'name slug')
      .lean(),
    StockAlert.countDocuments(query),
  ]);

  return {
    alerts: alerts as unknown as IStockAlertDocument[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

// ============================================================================
// פונקציות תחזוקה - Maintenance Functions
// ============================================================================

/**
 * ניקוי התראות ישנות (לקרוא ב-cron job)
 * @description מסמן התראות ישנות כ-expired
 * @param daysOld - כמה ימים לשמור (ברירת מחדל: 180 = 6 חודשים)
 * @returns מספר ההתראות שעודכנו
 */
export const cleanupOldAlerts = async (daysOld: number = 180): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await StockAlert.updateMany(
    {
      status: 'active',
      createdAt: { $lt: cutoffDate },
    },
    {
      $set: { status: 'expired' as StockAlertStatus },
    }
  );

  if (result.modifiedCount > 0) {
    logger.info('Old stock alerts cleaned up', {
      daysOld,
      modifiedCount: result.modifiedCount,
    });
  }

  return result.modifiedCount;
};

/**
 * קבלת סיכום יומי להתראות (לדוחות)
 * @param days - כמה ימים אחורה
 * @returns סיכום יומי
 */
export const getDailySummary = async (days: number = 7): Promise<Array<{
  date: string;
  created: number;
  sent: number;
  cancelled: number;
}>> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const summary = await StockAlert.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.date',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // המרה לפורמט נוח
  return summary.map((day: any) => {
    const result: any = {
      date: day._id,
      created: 0,
      sent: 0,
      cancelled: 0,
    };

    day.statuses.forEach((s: any) => {
      if (s.status === 'active') result.created += s.count;
      if (s.status === 'sent') result.sent += s.count;
      if (s.status === 'cancelled') result.cancelled += s.count;
    });

    return result;
  });
};

// ============================================================================
// ייצוא
// ============================================================================

export default {
  // Core Functions
  createStockAlert,
  checkExistingAlert,
  cancelStockAlert,
  cancelAlertByToken,
  
  // Trigger
  triggerStockAlerts,
  
  // Admin Functions
  getStockAlertStats,
  getAlertsByProduct,
  getAllAlerts,
  
  // Maintenance
  cleanupOldAlerts,
  getDailySummary,
  cleanupRateLimitMap,
};
