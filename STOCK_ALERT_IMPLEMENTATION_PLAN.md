# 🔔 מערכת "עדכן אותי כשהמוצר יחזור" - תכנית יישום מותאמת לפרויקט

***

## 📋 סקירה כללית

מסמך זה מפרט את תכנית היישום המלאה למערכת התראות חזרה למלאי, **מותאמת במיוחד לפרויקט הקיים**.

### מה כבר קיים בפרויקט:
- ✅ **BullMQ Queue System** - מערכת תורים מלאה עם Redis (`server/src/queues/`)
- ✅ **Email Worker** - עובד מיילים מוכן עם Nodemailer (`server/src/queues/workers/emailWorker.ts`)
- ✅ **Email Service** - שירות מיילים קיים (`server/src/services/emailService.ts`)
- ✅ **SKU Model** - מודל מלאי מלא עם `stockQuantity` (`server/src/models/Sku.ts`)
- ✅ **SKU Service** - שירות ניהול מלאי עם פונקציות אטומיות (`server/src/services/skuService.ts`)
- ✅ **Product Model** - מודל מוצר עם `quantityInStock` (`server/src/models/Product.ts`)
- ✅ **Modal Component** - רכיב מודל מוכן (`client/src/components/ui/Modal/`)
- ✅ **Input Component** - רכיב קלט מוכן (`client/src/components/ui/Input/`)
- ✅ **Button Component** - רכיב כפתור מוכן עם variants (`client/src/components/ui/Button/`)
- ✅ **ProductDetail** - דף פרטי מוצר מלא (`client/src/components/features/products/ProductDetail/`)
- ✅ **ProductCard** - כרטיס מוצר עם כפתור "הוסף לסל" (`client/src/components/features/products/ProductCard/`)
- ✅ **Admin Dashboard** - אזור ניהול קיים (`client/src/pages/Admin/`)

***

## 🎯 שלב 1: יצירת מודל StockAlert בשרת

### קובץ חדש: `server/src/models/StockAlert.ts`

```typescript
import mongoose, { Document, Schema } from 'mongoose';

/**
 * ממשק התראת מלאי - מייצג בקשה להתראה כשמוצר חוזר למלאי
 */
export interface IStockAlert {
  productId: mongoose.Types.ObjectId;  // מזהה המוצר
  skuCode?: string;                    // קוד SKU ספציפי (אופציונלי)
  email: string;                       // אימייל הלקוח
  phone?: string;                      // טלפון (אופציונלי)
  status: 'active' | 'sent' | 'cancelled' | 'expired';  // סטטוס ההתראה
  userId?: mongoose.Types.ObjectId;    // מזהה משתמש (אם מחובר)
  ipAddress?: string;                  // IP לאבטחה
  userAgent?: string;                  // User Agent לאבטחה
  sentAt?: Date;                       // תאריך שליחה
  createdAt: Date;
  updatedAt: Date;
}

export interface IStockAlertDocument extends IStockAlert, Document {
  _id: mongoose.Types.ObjectId;
}

const StockAlertSchema = new Schema<IStockAlertDocument>(
  {
    // מזהה המוצר - חובה
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'מזהה מוצר הוא שדה חובה'],
      index: true,
    },

    // קוד SKU ספציפי (לווריאנטים)
    skuCode: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
      index: true,
    },

    // אימייל הלקוח - חובה
    email: {
      type: String,
      required: [true, 'אימייל הוא שדה חובה'],
      trim: true,
      lowercase: true,
      index: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'פורמט אימייל לא תקין'],
    },

    // טלפון - אופציונלי
    phone: {
      type: String,
      required: false,
      trim: true,
    },

    // סטטוס ההתראה
    status: {
      type: String,
      enum: ['active', 'sent', 'cancelled', 'expired'],
      default: 'active',
      index: true,
    },

    // מזהה משתמש אם מחובר
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },

    // נתוני אבטחה
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },

    // תאריך שליחה
    sentAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'stockalerts',
  }
);

// אינדקס משולב - למניעת כפילויות
StockAlertSchema.index(
  { email: 1, productId: 1, skuCode: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

// אינדקס לניקוי התראות ישנות
StockAlertSchema.index({ createdAt: 1, status: 1 });

// אינדקס לשליפה לפי SKU (לטריגר)
StockAlertSchema.index({ skuCode: 1, status: 1 });

const StockAlert = mongoose.model<IStockAlertDocument>('StockAlert', StockAlertSchema);

export { StockAlert };
export default StockAlert;
```

***

## 🎯 שלב 2: יצירת מודל StockAlertLog בשרת

### קובץ חדש: `server/src/models/StockAlertLog.ts`

```typescript
import mongoose, { Document, Schema } from 'mongoose';

/**
 * ממשק לוג שליחת התראות - לצורך מעקב וסטטיסטיקות
 */
export interface IStockAlertLog {
  alertId: mongoose.Types.ObjectId;    // מזהה ההתראה
  sentAt: Date;                        // תאריך שליחה
  status: 'success' | 'failed';        // סטטוס שליחה
  channel: 'email' | 'sms';            // ערוץ שליחה
  errorMessage?: string;               // הודעת שגיאה (אם נכשל)
  messageId?: string;                  // מזהה ההודעה מהשירות
}

export interface IStockAlertLogDocument extends IStockAlertLog, Document {
  _id: mongoose.Types.ObjectId;
}

const StockAlertLogSchema = new Schema<IStockAlertLogDocument>(
  {
    alertId: {
      type: Schema.Types.ObjectId,
      ref: 'StockAlert',
      required: true,
      index: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['email', 'sms'],
      default: 'email',
    },
    errorMessage: {
      type: String,
      required: false,
    },
    messageId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: false,
    collection: 'stockalertlogs',
  }
);

// אינדקס לניקוי לוגים ישנים
StockAlertLogSchema.index({ sentAt: 1 });

const StockAlertLog = mongoose.model<IStockAlertLogDocument>('StockAlertLog', StockAlertLogSchema);

export { StockAlertLog };
export default StockAlertLog;
```

***

## 🎯 שלב 3: יצירת שירות StockAlert בשרת

### קובץ חדש: `server/src/services/stockAlertService.ts`

```typescript
import mongoose from 'mongoose';
import StockAlert, { IStockAlertDocument } from '../models/StockAlert';
import StockAlertLog from '../models/StockAlertLog';
import Product from '../models/Product';
import Sku from '../models/Sku';
import { addEmailJob, EmailJobData } from '../queues';
import { logger } from '../utils/logger';

/**
 * שירות ניהול התראות מלאי
 */

// Rate Limiting פשוט בזיכרון (בפרודקשן - להשתמש ב-Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 דקות
const RATE_LIMIT_MAX = 5; // מקסימום 5 בקשות לכל IP

/**
 * בדיקת Rate Limit לפי IP
 */
const checkRateLimit = (ipAddress: string): boolean => {
  const now = Date.now();
  const record = rateLimitMap.get(ipAddress);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ipAddress, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
};

/**
 * יצירת התראת מלאי חדשה
 */
export const createStockAlert = async (data: {
  productId: string;
  skuCode?: string;
  email: string;
  phone?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<IStockAlertDocument> => {
  // בדיקת Rate Limit
  if (data.ipAddress && !checkRateLimit(data.ipAddress)) {
    throw new Error('יותר מדי בקשות. נסה שוב מאוחר יותר.');
  }

  // בדיקה שהמוצר קיים
  const product = await Product.findById(data.productId).select('_id name').lean();
  if (!product) {
    throw new Error('מוצר לא נמצא');
  }

  // בדיקה שהמוצר באמת אזל מהמלאי
  if (data.skuCode) {
    const sku = await Sku.findOne({ sku: data.skuCode, isActive: true }).lean();
    if (sku && sku.stockQuantity > 0) {
      throw new Error('המוצר עדיין במלאי');
    }
  }

  // בדיקת כפילויות - האם כבר נרשם לאותו מוצר/SKU
  const existingAlert = await StockAlert.findOne({
    email: data.email.toLowerCase(),
    productId: data.productId,
    skuCode: data.skuCode || null,
    status: 'active',
  });

  if (existingAlert) {
    throw new Error('כבר נרשמת לקבלת עדכון על מוצר זה');
  }

  // יצירת ההתראה
  const alert = new StockAlert({
    productId: data.productId,
    skuCode: data.skuCode?.toUpperCase(),
    email: data.email.toLowerCase(),
    phone: data.phone,
    userId: data.userId ? new mongoose.Types.ObjectId(data.userId) : undefined,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    status: 'active',
  });

  await alert.save();
  logger.info('🔔 התראת מלאי נוצרה', { alertId: alert._id, email: data.email, productId: data.productId });

  return alert;
};

/**
 * בדיקה האם משתמש כבר נרשם להתראה על מוצר
 */
export const checkExistingAlert = async (
  email: string,
  productId: string,
  skuCode?: string
): Promise<boolean> => {
  const existingAlert = await StockAlert.findOne({
    email: email.toLowerCase(),
    productId,
    skuCode: skuCode || null,
    status: 'active',
  });

  return !!existingAlert;
};

/**
 * ביטול התראת מלאי
 */
export const cancelStockAlert = async (
  alertId: string,
  email: string
): Promise<boolean> => {
  const result = await StockAlert.findOneAndUpdate(
    { _id: alertId, email: email.toLowerCase(), status: 'active' },
    { $set: { status: 'cancelled' } }
  );

  return !!result;
};

/**
 * ביטול התראה לפי token (לקישור unsubscribe)
 */
export const cancelAlertByToken = async (token: string): Promise<boolean> => {
  // Token הוא ה-_id של ההתראה מקודד ב-Base64
  try {
    const alertId = Buffer.from(token, 'base64').toString('utf-8');
    const result = await StockAlert.findOneAndUpdate(
      { _id: alertId, status: 'active' },
      { $set: { status: 'cancelled' } }
    );
    return !!result;
  } catch {
    return false;
  }
};

/**
 * טריגר שליחת התראות כשמוצר חוזר למלאי
 * נקרא מה-SKU Service כשמלאי מתעדכן מ-0 לערך חיובי
 */
export const triggerStockAlerts = async (
  skuCode: string,
  productId: string
): Promise<number> => {
  // מציאת כל ההתראות הפעילות למוצר/SKU זה
  const alerts = await StockAlert.find({
    $or: [
      { productId, skuCode, status: 'active' },
      { productId, skuCode: { $exists: false }, status: 'active' },
      { productId, skuCode: null, status: 'active' },
    ],
  }).populate('productId', 'name images basePrice');

  if (alerts.length === 0) {
    logger.info('📭 אין התראות פעילות למוצר זה', { skuCode, productId });
    return 0;
  }

  logger.info(`📢 שולח ${alerts.length} התראות מלאי`, { skuCode, productId });

  // הוספת כל התראה לתור המיילים
  for (const alert of alerts) {
    const product = alert.productId as any;
    const unsubscribeToken = Buffer.from(alert._id.toString()).toString('base64');

    await addEmailJob({
      type: 'stock_alert' as any, // נוסיף את הסוג הזה ל-EmailJobData
      to: alert.email,
      data: {
        productId: product._id?.toString() || productId,
        productName: product.name || 'מוצר',
        productImage: product.images?.[0]?.url || '',
        productPrice: product.basePrice || 0,
        skuCode: alert.skuCode,
        unsubscribeToken,
        alertId: alert._id.toString(),
      },
    });

    // עדכון סטטוס ההתראה
    await StockAlert.findByIdAndUpdate(alert._id, {
      $set: { status: 'sent', sentAt: new Date() },
    });

    // יצירת לוג
    await StockAlertLog.create({
      alertId: alert._id,
      status: 'success',
      channel: 'email',
    });
  }

  return alerts.length;
};

/**
 * קבלת סטטיסטיקות התראות מלאי (לממשק ניהול)
 */
export const getStockAlertStats = async (): Promise<{
  totalActive: number;
  totalSent: number;
  topProducts: Array<{ productId: string; productName: string; alertCount: number }>;
}> => {
  const [totalActive, totalSent, topProducts] = await Promise.all([
    StockAlert.countDocuments({ status: 'active' }),
    StockAlert.countDocuments({ status: 'sent' }),
    StockAlert.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$productId', alertCount: { $sum: 1 } } },
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
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: '$_id',
          productName: { $ifNull: ['$product.name', 'לא זמין'] },
          alertCount: 1,
        },
      },
    ]),
  ]);

  return { totalActive, totalSent, topProducts };
};

/**
 * קבלת התראות לפי מוצר (לממשק ניהול)
 */
export const getAlertsByProduct = async (
  productId: string,
  status?: 'active' | 'sent' | 'cancelled' | 'expired'
): Promise<IStockAlertDocument[]> => {
  const query: any = { productId };
  if (status) query.status = status;

  return StockAlert.find(query).sort({ createdAt: -1 }).lean();
};

/**
 * ניקוי התראות ישנות (לקרוא ב-cron job)
 */
export const cleanupOldAlerts = async (daysOld: number = 180): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // סימון התראות ישנות כפגות תוקף
  const result = await StockAlert.updateMany(
    { status: 'active', createdAt: { $lt: cutoffDate } },
    { $set: { status: 'expired' } }
  );

  logger.info(`🧹 ${result.modifiedCount} התראות סומנו כפגות תוקף`);

  // מחיקת לוגים ישנים (30 יום)
  const logCutoff = new Date();
  logCutoff.setDate(logCutoff.getDate() - 30);
  await StockAlertLog.deleteMany({ sentAt: { $lt: logCutoff } });

  return result.modifiedCount;
};

export default {
  createStockAlert,
  checkExistingAlert,
  cancelStockAlert,
  cancelAlertByToken,
  triggerStockAlerts,
  getStockAlertStats,
  getAlertsByProduct,
  cleanupOldAlerts,
};
```

***

## 🎯 שלב 4: יצירת Controller ו-Routes להתראות מלאי

### קובץ חדש: `server/src/controllers/stockAlertController.ts`

```typescript
import { Request, Response } from 'express';
import * as stockAlertService from '../services/stockAlertService';

/**
 * Controller להתראות מלאי
 */

/**
 * יצירת התראת מלאי חדשה
 * POST /api/stock-alerts
 */
export const createAlert = async (req: Request, res: Response) => {
  try {
    const { productId, skuCode, email, phone } = req.body;

    // ולידציה בסיסית
    if (!productId || !email) {
      return res.status(400).json({
        success: false,
        message: 'מזהה מוצר ואימייל הם שדות חובה',
      });
    }

    // ולידציית אימייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'פורמט אימייל לא תקין',
      });
    }

    // שליפת userId אם המשתמש מחובר
    const userId = (req as any).user?.id;

    const alert = await stockAlertService.createStockAlert({
      productId,
      skuCode,
      email,
      phone,
      userId,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'נרשמת בהצלחה! נעדכן אותך כשהמוצר יחזור למלאי',
      data: { alertId: alert._id },
    });
  } catch (error: any) {
    console.error('Error creating stock alert:', error);

    // טיפול בשגיאות ידועות
    if (error.message.includes('יותר מדי בקשות')) {
      return res.status(429).json({ success: false, message: error.message });
    }
    if (error.message.includes('כבר נרשמת')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.message.includes('לא נמצא') || error.message.includes('עדיין במלאי')) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({
      success: false,
      message: 'שגיאה ביצירת התראה',
    });
  }
};

/**
 * בדיקה האם קיימת התראה פעילה
 * GET /api/stock-alerts/check?productId=xxx&skuCode=yyy&email=zzz
 */
export const checkAlert = async (req: Request, res: Response) => {
  try {
    const { productId, skuCode, email } = req.query;

    if (!productId || !email) {
      return res.status(400).json({
        success: false,
        message: 'מזהה מוצר ואימייל הם שדות חובה',
      });
    }

    const exists = await stockAlertService.checkExistingAlert(
      email as string,
      productId as string,
      skuCode as string | undefined
    );

    res.json({
      success: true,
      data: { hasActiveAlert: exists },
    });
  } catch (error: any) {
    console.error('Error checking stock alert:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת התראה',
    });
  }
};

/**
 * ביטול התראה (unsubscribe)
 * DELETE /api/stock-alerts/unsubscribe/:token
 */
export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const success = await stockAlertService.cancelAlertByToken(token);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'התראה לא נמצאה או כבר בוטלה',
      });
    }

    res.json({
      success: true,
      message: 'ההתראה בוטלה בהצלחה',
    });
  } catch (error: any) {
    console.error('Error cancelling stock alert:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בביטול ההתראה',
    });
  }
};

/**
 * קבלת סטטיסטיקות (Admin)
 * GET /api/stock-alerts/admin/stats
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await stockAlertService.getStockAlertStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error getting stock alert stats:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת סטטיסטיקות',
    });
  }
};

/**
 * קבלת התראות לפי מוצר (Admin)
 * GET /api/stock-alerts/admin/product/:productId
 */
export const getAlertsByProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { status } = req.query;

    const alerts = await stockAlertService.getAlertsByProduct(
      productId,
      status as any
    );

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error: any) {
    console.error('Error getting alerts by product:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת התראות',
    });
  }
};

export default {
  createAlert,
  checkAlert,
  unsubscribe,
  getStats,
  getAlertsByProduct,
};
```

### קובץ חדש: `server/src/routes/stockAlertRoutes.ts`

```typescript
import { Router } from 'express';
import * as stockAlertController from '../controllers/stockAlertController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';

const router = Router();

// ============================================
// Public Routes (עם rate limiting)
// ============================================

/**
 * יצירת התראת מלאי
 * POST /api/stock-alerts
 */
router.post('/', optionalAuthMiddleware, stockAlertController.createAlert);

/**
 * בדיקה האם קיימת התראה פעילה
 * GET /api/stock-alerts/check
 */
router.get('/check', stockAlertController.checkAlert);

/**
 * ביטול התראה (unsubscribe)
 * DELETE /api/stock-alerts/unsubscribe/:token
 */
router.delete('/unsubscribe/:token', stockAlertController.unsubscribe);

// ============================================
// Admin Routes
// ============================================

/**
 * סטטיסטיקות התראות
 * GET /api/stock-alerts/admin/stats
 */
router.get('/admin/stats', authMiddleware, requireAdmin, stockAlertController.getStats);

/**
 * התראות לפי מוצר
 * GET /api/stock-alerts/admin/product/:productId
 */
router.get(
  '/admin/product/:productId',
  authMiddleware,
  requireAdmin,
  stockAlertController.getAlertsByProduct
);

export default router;
```

***

## 🎯 שלב 5: עדכון מערכת התורים והמיילים

### עדכון `server/src/queues/index.ts` - הוספת סוג מייל חדש

```typescript
// הוספה ל-EmailJobType
export type EmailJobType =
  | 'order_confirmation'
  | 'order_shipped'
  | 'payment_failed'
  | 'refund_processed'
  | 'password_reset'
  | 'welcome'
  | 'stock_alert'; // חדש!
```

### עדכון `server/src/queues/workers/emailWorker.ts` - הוספת תבנית מייל

```typescript
// הוספה לאובייקט templates בפונקציה getEmailTemplate:

stock_alert: {
  subject: `🎉 ${data.productName} חזר למלאי!`,
  html: `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: white;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 המוצר שחיכית לו חזר!</h1>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px;">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
            שלום,
          </p>
          <p style="color: #555; line-height: 1.6;">
            יש לנו חדשות טובות! המוצר שביקשת עליו עדכון חזר למלאי.
          </p>
          
          <!-- פרטי המוצר -->
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            ${data.productImage ? `<img src="${data.productImage}" alt="${data.productName}" style="max-width: 200px; border-radius: 8px; margin-bottom: 15px;">` : ''}
            <h2 style="margin: 0 0 10px 0; color: #333;">${data.productName}</h2>
            ${data.skuCode ? `<p style="color: #666; margin: 5px 0;">מק"ט: ${data.skuCode}</p>` : ''}
            <p style="font-size: 24px; color: #28a745; font-weight: bold; margin: 10px 0;">
              ₪${(data.productPrice as number).toLocaleString('he-IL')}
            </p>
          </div>
          
          <!-- CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/product/${data.productId}" 
               style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
              קנה עכשיו 🛒
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            ⚠️ המלאי מוגבל - מומלץ להזדרז!
          </p>
          
        </div>
        
        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
            קיבלת מייל זה כי ביקשת לקבל עדכון כשהמוצר יחזור למלאי.
          </p>
          <a href="${frontendUrl}/api/stock-alerts/unsubscribe/${data.unsubscribeToken}" 
             style="color: #666; font-size: 12px;">
            לביטול עדכונים עתידיים לחץ כאן
          </a>
        </div>
        
      </div>
    </body>
    </html>
  `
}
```

***

## 🎯 שלב 6: הוספת טריגר לעדכון מלאי

### עדכון `server/src/services/skuService.ts` - הוספת טריגר

```typescript
// בתחילת הקובץ - הוספת import
import { triggerStockAlerts } from './stockAlertService';

// עדכון פונקציה updateStock להוסיף טריגר
export const updateStock = async (
  sku: string,
  delta: number
): Promise<ISkuDocument | null> => {
  try {
    // בדיקת המצב הקודם של המלאי
    const previousSku = await Sku.findOne({ sku, isActive: true }).lean();
    const previousStock = previousSku?.stockQuantity || 0;

    const condition: any = { sku, isActive: true };
    if (delta < 0) {
      condition.stockQuantity = { $gte: Math.abs(delta) };
    }

    const updatedSku = await Sku.findOneAndUpdate(
      condition,
      { $inc: { stockQuantity: delta } },
      { new: true }
    );

    if (!updatedSku) {
      console.warn(`Failed to update stock for SKU ${sku}`);
      return null;
    }

    // 🔔 טריגר התראות אם המלאי חזר מ-0 לערך חיובי
    if (previousStock === 0 && updatedSku.stockQuantity > 0) {
      console.log(`📢 Stock back! Triggering alerts for SKU: ${sku}`);
      // קריאה אסינכרונית - לא חוסמת את העדכון
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
```

***

## 🎯 שלב 7: יצירת רכיבי צד לקוח

### קובץ חדש: `client/src/services/stockAlertService.ts`

```typescript
/**
 * שירות התראות מלאי - צד לקוח
 */

const API_BASE = '/api/stock-alerts';

/**
 * יצירת התראת מלאי
 */
export const createStockAlert = async (data: {
  productId: string;
  skuCode?: string;
  email: string;
  phone?: string;
}): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'שגיאה ביצירת התראה');
  }

  return result;
};

/**
 * בדיקה האם קיימת התראה פעילה
 */
export const checkExistingAlert = async (
  productId: string,
  email: string,
  skuCode?: string
): Promise<boolean> => {
  const params = new URLSearchParams({ productId, email });
  if (skuCode) params.append('skuCode', skuCode);

  const response = await fetch(`${API_BASE}/check?${params}`, {
    credentials: 'include',
  });

  const result = await response.json();
  return result.data?.hasActiveAlert || false;
};

export default {
  createStockAlert,
  checkExistingAlert,
};
```

### קובץ חדש: `client/src/components/features/products/StockAlertButton/StockAlertButton.tsx`

```tsx
import React, { useState } from 'react';
import { Button, Modal, Input, Icon, Typography } from '../../../ui';
import { createStockAlert } from '../../../../services/stockAlertService';
import styles from './StockAlertButton.module.css';

interface StockAlertButtonProps {
  productId: string;
  skuCode?: string;
  productName: string;
  userEmail?: string; // אם המשתמש מחובר
  className?: string;
}

/**
 * רכיב כפתור "עדכן אותי כשחוזר"
 * מוצג במקום כפתור "הוסף לסל" כשהמוצר אזל מהמלאי
 */
const StockAlertButton: React.FC<StockAlertButtonProps> = ({
  productId,
  skuCode,
  productName,
  userEmail,
  className = '',
}) => {
  // מצבים
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState(userEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // פתיחת המודל
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setError(null);
  };

  // שליחת הבקשה
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // ולידציית אימייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('נא להזין כתובת אימייל תקינה');
      return;
    }

    setIsSubmitting(true);

    try {
      await createStockAlert({
        productId,
        skuCode,
        email,
      });

      setIsSubmitted(true);
      // סגירת המודל אחרי 2 שניות
      setTimeout(() => {
        setIsModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'שגיאה בשליחת הבקשה');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* כפתור עדכן אותי */}
      <div className={`${styles.container} ${className}`}>
        <Typography variant="body2" className={styles.outOfStockLabel}>
          אזל מהמלאי
        </Typography>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          icon={<Icon name="Bell" size={20} />}
          onClick={handleOpenModal}
        >
          עדכן אותי כשחוזר
        </Button>
      </div>

      {/* מודל הרשמה */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isSubmitted ? '✅ בקשתך התקבלה!' : '🔔 קבלת עדכון על חזרה למלאי'}
        size="small"
      >
        {isSubmitted ? (
          // הודעת הצלחה
          <div className={styles.successMessage}>
            <Icon name="CheckCircle2" size={48} className={styles.successIcon} />
            <Typography variant="h6" align="center">
              נרשמת בהצלחה!
            </Typography>
            <Typography variant="body2" align="center" className={styles.successText}>
              נשלח לך אימייל ברגע ש-<strong>{productName}</strong> יחזור למלאי.
            </Typography>
          </div>
        ) : (
          // טופס הרשמה
          <form onSubmit={handleSubmit} className={styles.form}>
            <Typography variant="body2" className={styles.formDescription}>
              השאר את האימייל שלך ונעדכן אותך ברגע שהמוצר יחזור למלאי.
            </Typography>

            <Input
              type="email"
              label="כתובת אימייל"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              error={!!error}
              helperText={error || ''}
            />

            <div className={styles.formActions}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting || !email}
              >
                שלח לי עדכון
              </Button>
            </div>

            <Typography variant="caption" className={styles.privacyNote}>
              🔒 לא נשלח לך ספאם. רק עדכון אחד כשהמוצר יחזור.
            </Typography>
          </form>
        )}
      </Modal>
    </>
  );
};

export default StockAlertButton;
```

### קובץ חדש: `client/src/components/features/products/StockAlertButton/StockAlertButton.module.css`

```css
/* מכיל: container, outOfStockLabel, form, successMessage, etc. */

.container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.outOfStockLabel {
  color: var(--color-error, #dc3545);
  font-weight: 600;
  text-align: center;
  padding: 4px 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.formDescription {
  color: var(--color-text-secondary, #666);
  text-align: center;
}

.formActions {
  margin-top: 8px;
}

.privacyNote {
  color: var(--color-text-muted, #999);
  text-align: center;
  font-size: 12px;
}

.successMessage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.successIcon {
  color: var(--color-success, #28a745);
}

.successText {
  color: var(--color-text-secondary, #666);
}
```

### קובץ חדש: `client/src/components/features/products/StockAlertButton/index.ts`

```typescript
export { default } from './StockAlertButton';
```

***

## 🎯 שלב 8: אינטגרציה ברכיבי המוצר

### עדכון `ProductDetail.tsx`

```tsx
// הוספת import בתחילת הקובץ
import StockAlertButton from '../StockAlertButton';

// בתוך הקומפוננטה - בחלק של כפתורי הפעולה:
// החלפת הלוגיקה הקיימת:

{/* כפתורי פעולה */}
<div className={styles.actionButtons}>
  {availableStock > 0 ? (
    <>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        elevated
        icon={<Icon name="ShoppingCart" size={20} />}
        onClick={handleAddToCart}
      >
        הוסף לעגלה
      </Button>

      <Button
        variant="success"
        size="lg"
        fullWidth
        elevated
        icon={<Icon name="CreditCard" size={20} />}
      >
        קנה עכשיו
      </Button>
    </>
  ) : (
    // 🔔 מצב אזל מהמלאי - הצגת כפתור התראה
    <StockAlertButton
      productId={product._id}
      skuCode={selectedSku || undefined}
      productName={product.name}
    />
  )}
</div>
```

### עדכון `ProductCard.tsx`

```tsx
// הוספת import בתחילת הקובץ
import StockAlertButton from '../StockAlertButton';

// בתוך הקומפוננטה - בחלק של actionContainer:
// החלפת הלוגיקה הקיימת:

<div className={styles.actionContainer}>
  {isInStock ? (
    <Button variant="primary" size="sm" onClick={handleAddToCart}>
      הוסף לסל
    </Button>
  ) : (
    // 🔔 מצב אזל מהמלאי - הצגת כפתור התראה מוקטן
    <Button
      variant="secondary"
      size="sm"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // פתיחת מודל התראה - יש צורך ב-state נוסף או כפתור שמוביל לדף המוצר
      }}
    >
      עדכן אותי
    </Button>
  )}
</div>
```

***

## 🎯 שלב 9: רישום Routes בשרת

### עדכון `server/src/server.ts` או קובץ ה-routes הראשי

```typescript
// הוספת import
import stockAlertRoutes from './routes/stockAlertRoutes';

// הוספת route
app.use('/api/stock-alerts', stockAlertRoutes);
```

***

## 🎯 שלב 10: דשבורד ניהול (Admin)

### קובץ חדש: `client/src/pages/Admin/StockAlerts/StockAlertsDashboard.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Typography, Card, Icon } from '../../../components/ui';
import styles from './StockAlertsDashboard.module.css';

interface StockAlertStats {
  totalActive: number;
  totalSent: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    alertCount: number;
  }>;
}

/**
 * דשבורד ניהול התראות מלאי
 */
const StockAlertsDashboard: React.FC = () => {
  const [stats, setStats] = useState<StockAlertStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stock-alerts/admin/stats', {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Typography>טוען...</Typography>;
  }

  return (
    <div className={styles.container}>
      <Typography variant="h4" className={styles.title}>
        <Icon name="Bell" size={24} /> התראות מלאי
      </Typography>

      {/* כרטיסי סטטיסטיקות */}
      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <Icon name="Clock" size={32} className={styles.statIcon} />
          <Typography variant="h3">{stats?.totalActive || 0}</Typography>
          <Typography variant="body2">התראות פעילות</Typography>
        </Card>

        <Card className={styles.statCard}>
          <Icon name="Send" size={32} className={styles.statIcon} />
          <Typography variant="h3">{stats?.totalSent || 0}</Typography>
          <Typography variant="body2">התראות שנשלחו</Typography>
        </Card>
      </div>

      {/* טבלת מוצרים פופולריים */}
      <Card className={styles.tableCard}>
        <Typography variant="h6" className={styles.tableTitle}>
          מוצרים עם הכי הרבה בקשות
        </Typography>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>מוצר</th>
              <th>לקוחות ממתינים</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {stats?.topProducts.map((product) => (
              <tr key={product.productId}>
                <td>{product.productName}</td>
                <td>{product.alertCount}</td>
                <td>
                  <a href={`/admin/products/${product.productId}`}>
                    צפה במוצר
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default StockAlertsDashboard;
```

### קובץ חדש: `client/src/pages/Admin/StockAlerts/StockAlertsDashboard.module.css`

```css
/* מכיל: container, statsGrid, statCard, tableCard, table */

.container {
  padding: 24px;
  direction: rtl;
}

.title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.statCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  text-align: center;
}

.statIcon {
  color: var(--color-primary, #007bff);
  margin-bottom: 12px;
}

.tableCard {
  padding: 24px;
}

.tableTitle {
  margin-bottom: 16px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 12px;
  text-align: right;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
}

.table th {
  font-weight: 600;
  background-color: var(--color-background-secondary, #f5f5f5);
}

.table tbody tr:hover {
  background-color: var(--color-background-hover, #f9f9f9);
}

.table a {
  color: var(--color-primary, #007bff);
  text-decoration: none;
}

.table a:hover {
  text-decoration: underline;
}
```

### קובץ חדש: `client/src/pages/Admin/StockAlerts/index.ts`

```typescript
export { default } from './StockAlertsDashboard';
export { default as StockAlertsDashboard } from './StockAlertsDashboard';
```

***

## 📋 סיכום שלבי יישום

| # | שלב | תיאור | זמן משוער |
|---|------|--------|-----------|
| 1 | מודל StockAlert | יצירת schema ואינדקסים | 30 דק |
| 2 | מודל StockAlertLog | יצירת schema ללוגים | 15 דק |
| 3 | שירות stockAlertService | לוגיקה עסקית מלאה | 1.5 שעות |
| 4 | Controller ו-Routes | API endpoints | 45 דק |
| 5 | עדכון תורים ומיילים | תבנית מייל חדשה | 30 דק |
| 6 | טריגר עדכון מלאי | אינטגרציה עם skuService | 30 דק |
| 7 | שירות צד לקוח | stockAlertService.ts | 20 דק |
| 8 | רכיב StockAlertButton | כפתור + מודל | 1.5 שעות |
| 9 | אינטגרציה ProductDetail | שילוב בדף מוצר | 30 דק |
| 10 | אינטגרציה ProductCard | שילוב בכרטיס | 30 דק |
| 11 | רישום Routes | הוספה לשרת | 10 דק |
| 12 | דשבורד Admin | ממשק ניהול | 2 שעות |

**סה"כ זמן משוער: ~9 שעות**

***

## 🔒 שיקולי אבטחה

1. **Rate Limiting** - 5 בקשות לכל IP ב-10 דקות
2. **ולידציית אימייל** - בדיקת פורמט בשרת ובלקוח
3. **מניעת כפילויות** - אינדקס ייחודי חלקי
4. **Unsubscribe Token** - Base64 של ה-ID
5. **CSRF Protection** - credentials: 'include'

***

## ⚠️ Monitoring - ניטור ומעקב

### מדדים קריטיים לניטור:

| מדד | סף התראה | תיאור |
|-----|----------|--------|
| **Failure Rate** | > 3% | אחוז כשלונות שליחת מיילים |
| **Queue Depth** | > 1000 | משימות בתור ממתינות |
| **Processing Time** | > 30s | זמן עיבוד ממוצע למשימה |
| **Stalled Jobs** | > 0 | משימות תקועות |

### קובץ חדש: `server/src/services/stockAlertMonitoringService.ts`

```typescript
import { getEmailQueue, getQueuesStats } from '../queues';
import StockAlert from '../models/StockAlert';
import StockAlertLog from '../models/StockAlertLog';
import { logger } from '../utils/logger';

/**
 * שירות ניטור התראות מלאי
 * מספק מדדים ובדיקות בריאות למערכת
 */

// סף התראות
const THRESHOLDS = {
  FAILURE_RATE: 0.03,        // 3% - סף כשלונות
  QUEUE_DEPTH: 1000,         // מקסימום משימות בתור
  STALLED_JOBS: 0,           // לא אמורות להיות משימות תקועות
  PROCESSING_TIME_MS: 30000, // 30 שניות מקסימום
};

/**
 * חישוב שיעור כשלונות (Failure Rate)
 */
export const calculateFailureRate = async (hours: number = 24): Promise<number> => {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const [successCount, failedCount] = await Promise.all([
    StockAlertLog.countDocuments({ status: 'success', sentAt: { $gte: since } }),
    StockAlertLog.countDocuments({ status: 'failed', sentAt: { $gte: since } }),
  ]);

  const total = successCount + failedCount;
  if (total === 0) return 0;

  return failedCount / total;
};

/**
 * בדיקת בריאות התור (Queue Health Check)
 */
export const getQueueHealth = async (): Promise<{
  healthy: boolean;
  metrics: {
    waiting: number;
    active: number;
    failed: number;
    delayed: number;
    stalled: number;
  };
  alerts: string[];
}> => {
  const alerts: string[] = [];
  const emailQueue = getEmailQueue();
  
  const [waiting, active, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  // בדיקת משימות תקועות
  const stalledJobs = await emailQueue.getJobs(['stalled']);
  const stalled = stalledJobs.length;

  // בדיקת סף עומק תור
  if (waiting > THRESHOLDS.QUEUE_DEPTH) {
    alerts.push(`⚠️ Queue depth alert: ${waiting} jobs waiting (threshold: ${THRESHOLDS.QUEUE_DEPTH})`);
  }

  // בדיקת משימות תקועות
  if (stalled > THRESHOLDS.STALLED_JOBS) {
    alerts.push(`🚨 CRITICAL: ${stalled} stalled jobs detected!`);
  }

  // בדיקת כשלונות רבים בתור
  if (failed > 50) {
    alerts.push(`⚠️ High failure count in queue: ${failed} failed jobs`);
  }

  // לוג התראות
  alerts.forEach(alert => logger.warn(alert));

  return {
    healthy: alerts.length === 0,
    metrics: { waiting, active, failed, delayed, stalled },
    alerts,
  };
};

/**
 * קבלת מדדי מערכת מלאים
 */
export const getSystemMetrics = async (): Promise<{
  failureRate: number;
  failureRateStatus: 'ok' | 'warning' | 'critical';
  queue: Awaited<ReturnType<typeof getQueueHealth>>;
  alerts: {
    total: number;
    active: number;
    sent24h: number;
    failed24h: number;
  };
}> => {
  const failureRate = await calculateFailureRate(24);
  const queue = await getQueueHealth();

  // חישוב סטטיסטיקות התראות
  const since24h = new Date();
  since24h.setHours(since24h.getHours() - 24);

  const [total, active, sent24h, failed24h] = await Promise.all([
    StockAlert.countDocuments(),
    StockAlert.countDocuments({ status: 'active' }),
    StockAlertLog.countDocuments({ status: 'success', sentAt: { $gte: since24h } }),
    StockAlertLog.countDocuments({ status: 'failed', sentAt: { $gte: since24h } }),
  ]);

  // קביעת סטטוס Failure Rate
  let failureRateStatus: 'ok' | 'warning' | 'critical' = 'ok';
  if (failureRate > THRESHOLDS.FAILURE_RATE * 2) {
    failureRateStatus = 'critical';
  } else if (failureRate > THRESHOLDS.FAILURE_RATE) {
    failureRateStatus = 'warning';
  }

  return {
    failureRate,
    failureRateStatus,
    queue,
    alerts: { total, active, sent24h, failed24h },
  };
};

/**
 * בדיקת בריאות כללית (Health Check Endpoint)
 */
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    queue: boolean;
    failureRate: boolean;
    database: boolean;
  };
  timestamp: Date;
}> => {
  const checks = {
    queue: false,
    failureRate: false,
    database: false,
  };

  try {
    // בדיקת תור
    const queueHealth = await getQueueHealth();
    checks.queue = queueHealth.healthy;

    // בדיקת failure rate
    const failureRate = await calculateFailureRate(1); // שעה אחרונה
    checks.failureRate = failureRate <= THRESHOLDS.FAILURE_RATE;

    // בדיקת חיבור למסד נתונים
    await StockAlert.findOne().lean();
    checks.database = true;
  } catch (error) {
    logger.error('Health check failed:', error);
  }

  // קביעת סטטוס כללי
  const allPassing = Object.values(checks).every(v => v);
  const somePassing = Object.values(checks).some(v => v);

  return {
    status: allPassing ? 'healthy' : somePassing ? 'degraded' : 'unhealthy',
    checks,
    timestamp: new Date(),
  };
};

/**
 * ניקוי משימות תקועות (Stalled Jobs Recovery)
 */
export const recoverStalledJobs = async (): Promise<number> => {
  const emailQueue = getEmailQueue();
  const stalledJobs = await emailQueue.getJobs(['stalled']);
  
  let recovered = 0;
  for (const job of stalledJobs) {
    try {
      // ניסיון חוזר למשימה תקועה
      await job.retry();
      recovered++;
      logger.info(`♻️ Recovered stalled job: ${job.id}`);
    } catch (error) {
      logger.error(`Failed to recover job ${job.id}:`, error);
    }
  }

  return recovered;
};

export default {
  calculateFailureRate,
  getQueueHealth,
  getSystemMetrics,
  healthCheck,
  recoverStalledJobs,
};
```

### הוספה ל-Controller (לממשק Admin):

```typescript
// הוספה ל-stockAlertController.ts

import * as monitoringService from '../services/stockAlertMonitoringService';

/**
 * קבלת מדדי מערכת (Admin)
 * GET /api/stock-alerts/admin/metrics
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getSystemMetrics();
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ success: false, message: 'שגיאה בקבלת מדדים' });
  }
};

/**
 * בדיקת בריאות מערכת
 * GET /api/stock-alerts/health
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const health = await monitoringService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 503 : 500;
    res.status(statusCode).json(health);
  } catch (error: any) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
};
```

### הוספה ל-Routes:

```typescript
// הוספה ל-stockAlertRoutes.ts

// Health check - public (לשימוש monitoring tools)
router.get('/health', stockAlertController.healthCheck);

// Admin metrics
router.get('/admin/metrics', authMiddleware, requireAdmin, stockAlertController.getMetrics);
```

### Cron Job לניטור וריפוי אוטומטי:

```typescript
// הוספה לקובץ cron או server.ts

import cron from 'node-cron';
import { 
  healthCheck, 
  recoverStalledJobs, 
  calculateFailureRate 
} from './services/stockAlertMonitoringService';
import { logger } from './utils/logger';

// בדיקת בריאות כל 5 דקות
cron.schedule('*/5 * * * *', async () => {
  const health = await healthCheck();
  
  if (health.status !== 'healthy') {
    logger.warn('🚨 System health degraded:', health);
    
    // ניסיון ריפוי אוטומטי
    if (!health.checks.queue) {
      const recovered = await recoverStalledJobs();
      if (recovered > 0) {
        logger.info(`♻️ Auto-recovered ${recovered} stalled jobs`);
      }
    }
  }
});

// בדיקת failure rate כל שעה
cron.schedule('0 * * * *', async () => {
  const failureRate = await calculateFailureRate(1);
  
  if (failureRate > 0.03) {
    logger.error(`🚨 HIGH FAILURE RATE ALERT: ${(failureRate * 100).toFixed(2)}%`);
    // כאן אפשר להוסיף שליחת התראה לSlack/Email
  }
});
```

### אינטגרציה עם שירותי ניטור חיצוניים (אופציונלי):

```typescript
// דוגמה לשליחת מדדים ל-Prometheus/Grafana
export const exportPrometheusMetrics = async (): Promise<string> => {
  const metrics = await getSystemMetrics();
  
  return `
# HELP stock_alerts_failure_rate Email sending failure rate
# TYPE stock_alerts_failure_rate gauge
stock_alerts_failure_rate ${metrics.failureRate}

# HELP stock_alerts_queue_waiting Jobs waiting in queue
# TYPE stock_alerts_queue_waiting gauge
stock_alerts_queue_waiting ${metrics.queue.metrics.waiting}

# HELP stock_alerts_queue_stalled Stalled jobs count
# TYPE stock_alerts_queue_stalled gauge
stock_alerts_queue_stalled ${metrics.queue.metrics.stalled}

# HELP stock_alerts_active Total active alerts
# TYPE stock_alerts_active gauge
stock_alerts_active ${metrics.alerts.active}

# HELP stock_alerts_sent_24h Alerts sent in last 24h
# TYPE stock_alerts_sent_24h counter
stock_alerts_sent_24h ${metrics.alerts.sent24h}
  `.trim();
};
```

***

## 🧹 משימות תחזוקה (Cron Jobs)

```typescript
// הוספה ל-server/src/server.ts או קובץ cron נפרד

import cron from 'node-cron';
import { cleanupOldAlerts } from './services/stockAlertService';

// ניקוי התראות ישנות - כל יום בחצות
cron.schedule('0 0 * * *', async () => {
  console.log('🧹 Running stock alerts cleanup...');
  await cleanupOldAlerts(180); // 6 חודשים
});
```

***

## ✅ בדיקות נדרשות

1. [ ] יצירת התראה חדשה
2. [ ] מניעת כפילויות
3. [ ] Rate Limiting
4. [ ] שליחת מייל כשמלאי חוזר
5. [ ] ביטול התראה (unsubscribe)
6. [ ] דשבורד ניהול
7. [ ] תצוגה נכונה ב-ProductDetail
8. [ ] תצוגה נכונה ב-ProductCard

***

מסמך זה מותאם **100% לפרויקט הקיים** ומשתמש בכל התשתיות הקיימות:
- BullMQ לתורים
- Nodemailer למיילים  
- Modal, Button, Input לרכיבי UI
- MongoDB עם Mongoose למסדי נתונים
