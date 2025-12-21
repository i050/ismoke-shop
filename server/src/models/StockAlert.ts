import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// מודל התראות מלאי - Stock Alert Model
// מאפשר ללקוחות להירשם לקבלת התראה כשמוצר חוזר למלאי
// ============================================================================

/**
 * סטטוס התראה - מצבי התראת המלאי
 * @description
 * - active: ההתראה פעילה וממתינה לחזרת המוצר למלאי
 * - sent: ההתראה נשלחה ללקוח
 * - cancelled: הלקוח ביטל את ההתראה
 * - expired: ההתראה פגה (עבר זמן רב מדי)
 */
export type StockAlertStatus = 'active' | 'sent' | 'cancelled' | 'expired';

/**
 * ממשק התראת מלאי - מייצג בקשה להתראה כשמוצר חוזר למלאי
 * @description
 * כל התראה קשורה למוצר ספציפי, ואופציונלית ל-SKU ספציפי
 * מאפשר שליחת התראה במייל (ובעתיד גם SMS)
 */
export interface IStockAlert {
  productId: mongoose.Types.ObjectId;  // מזהה המוצר
  skuCode?: string;                    // קוד SKU ספציפי (אופציונלי)
  email: string;                       // אימייל הלקוח
  phone?: string;                      // טלפון לשליחת SMS (אופציונלי - לעתיד)
  status: StockAlertStatus;            // סטטוס ההתראה
  userId?: mongoose.Types.ObjectId;    // מזהה משתמש (אם מחובר)
  ipAddress?: string;                  // IP לאבטחה ו-Rate Limiting
  userAgent?: string;                  // User Agent לאבטחה
  sentAt?: Date;                       // תאריך שליחת ההתראה
  createdAt: Date;                     // תאריך יצירה
  updatedAt: Date;                     // תאריך עדכון אחרון
}

/**
 * ממשק מסמך התראת מלאי - מרחיב את IStockAlert עם תכונות Mongoose
 */
export interface IStockAlertDocument extends IStockAlert, Document {
  _id: mongoose.Types.ObjectId;
}

/**
 * סכמת התראת מלאי - הגדרת מבנה הנתונים ב-MongoDB
 */
const StockAlertSchema = new Schema<IStockAlertDocument>(
  {
    // מזהה המוצר - חובה
    // קישור למוצר עליו הלקוח רוצה לקבל התראה
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true, // אינדקס לשליפה מהירה לפי מוצר
    },

    // קוד SKU ספציפי - אופציונלי
    // אם הלקוח רוצה התראה על וריאנט ספציפי (צבע/מידה מסוימים)
    skuCode: {
      type: String,
      required: false,
      trim: true,
      uppercase: true, // תואם לפורמט SKU בפרויקט
      index: true, // אינדקס לטריגר בעת עדכון מלאי
    },

    // אימייל הלקוח - חובה
    // כתובת לשליחת ההתראה
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true, // נרמול לאותיות קטנות
      index: true, // אינדקס לחיפוש לפי אימייל
      validate: {
        validator: function (v: string) {
          // ולידציית פורמט אימייל בסיסית
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format',
      },
    },

    // טלפון - אופציונלי (לעתיד: SMS)
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
      required: true,
      index: true, // אינדקס לסינון לפי סטטוס
    },

    // מזהה משתמש - אופציונלי
    // אם הלקוח מחובר למערכת, נשמור את המזהה שלו
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true, // אינדקס לשליפת התראות של משתמש
    },

    // כתובת IP - לאבטחה ו-Rate Limiting
    ipAddress: {
      type: String,
      required: false,
    },

    // User Agent - למעקב ואבטחה
    userAgent: {
      type: String,
      required: false,
    },

    // תאריך שליחת ההתראה
    // יתמלא כשההתראה נשלחת בפועל
    sentAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true, // הוספה אוטומטית של createdAt ו-updatedAt
    collection: 'stockalerts',
  }
);

// ============================================================================
// אינדקסים (Indexes)
// ============================================================================

/**
 * אינדקס ייחודי חלקי (Partial Unique Index)
 * מונע כפילויות: לקוח אחד לא יכול להירשם פעמיים לאותו מוצר/SKU
 * רק על התראות פעילות (status: 'active')
 */
StockAlertSchema.index(
  { email: 1, productId: 1, skuCode: 1, status: 1 },
  { 
    unique: true, 
    partialFilterExpression: { status: 'active' },
    name: 'unique_active_alert' // שם ברור לאינדקס
  }
);

/**
 * אינדקס לניקוי התראות ישנות
 * משמש ל-Cron Job שמנקה התראות ישנות
 */
StockAlertSchema.index(
  { createdAt: 1, status: 1 },
  { name: 'cleanup_old_alerts' }
);

/**
 * אינדקס לשליפה לפי SKU (לטריגר)
 * משמש כשמוצר חוזר למלאי - למציאת כל ההתראות הפעילות
 */
StockAlertSchema.index(
  { skuCode: 1, status: 1 },
  { name: 'sku_status_lookup' }
);

/**
 * אינדקס משולב: מוצר + סטטוס
 * לשליפה מהירה של התראות פעילות למוצר מסוים
 */
StockAlertSchema.index(
  { productId: 1, status: 1 },
  { name: 'product_status_lookup' }
);

// ============================================================================
// Methods
// ============================================================================

/**
 * סימון ההתראה כנשלחה
 * @returns Promise<IStockAlertDocument>
 */
StockAlertSchema.methods.markAsSent = async function (): Promise<IStockAlertDocument> {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

/**
 * ביטול ההתראה
 * @returns Promise<IStockAlertDocument>
 */
StockAlertSchema.methods.cancel = async function (): Promise<IStockAlertDocument> {
  this.status = 'cancelled';
  return this.save();
};

// ============================================================================
// Static Methods
// ============================================================================

/**
 * מציאת התראות פעילות למוצר
 * @param productId - מזהה המוצר
 * @param skuCode - קוד SKU (אופציונלי)
 */
StockAlertSchema.statics.findActiveAlerts = function (
  productId: mongoose.Types.ObjectId | string,
  skuCode?: string
) {
  const query: any = {
    productId,
    status: 'active',
  };
  
  if (skuCode) {
    query.skuCode = skuCode.toUpperCase();
  }
  
  return this.find(query);
};

/**
 * בדיקה האם קיימת התראה פעילה
 * @param email - אימייל הלקוח
 * @param productId - מזהה המוצר
 * @param skuCode - קוד SKU (אופציונלי)
 */
StockAlertSchema.statics.hasActiveAlert = async function (
  email: string,
  productId: mongoose.Types.ObjectId | string,
  skuCode?: string
): Promise<boolean> {
  const query: any = {
    email: email.toLowerCase(),
    productId,
    status: 'active',
  };
  
  if (skuCode) {
    query.skuCode = skuCode.toUpperCase();
  }
  
  const count = await this.countDocuments(query);
  return count > 0;
};

// ============================================================================
// יצירת והחזרת המודל
// ============================================================================

const StockAlert = mongoose.model<IStockAlertDocument>('StockAlert', StockAlertSchema);

export { StockAlert };
export default StockAlert;
