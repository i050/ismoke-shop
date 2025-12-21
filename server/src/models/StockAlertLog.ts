import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// מודל לוג התראות מלאי - Stock Alert Log Model
// מתעד כל שליחה של התראת מלאי לצורך מעקב וסטטיסטיקות
// ============================================================================

/**
 * סטטוס שליחה - האם ההתראה נשלחה בהצלחה או נכשלה
 */
export type AlertLogStatus = 'success' | 'failed';

/**
 * ערוץ שליחה - דרך איזה ערוץ נשלחה ההתראה
 */
export type AlertChannel = 'email' | 'sms';

/**
 * ממשק לוג שליחת התראות - מתעד כל ניסיון שליחה
 * @description
 * משמש לצורך:
 * - מעקב אחרי הצלחות/כשלונות
 * - סטטיסטיקות במערכת ניהול
 * - Debug בעיות שליחה
 * - חישוב Failure Rate
 */
export interface IStockAlertLog {
  alertId: mongoose.Types.ObjectId;    // מזהה ההתראה המקורית
  sentAt: Date;                        // תאריך ניסיון השליחה
  status: AlertLogStatus;              // סטטוס השליחה
  channel: AlertChannel;               // ערוץ השליחה
  errorMessage?: string;               // הודעת שגיאה (אם נכשל)
  messageId?: string;                  // מזהה ההודעה מהשירות (לדיבוג)
  metadata?: {                         // מטאדאטה נוספת
    productName?: string;              // שם המוצר (לנוחות)
    skuCode?: string;                  // קוד SKU
    recipientEmail?: string;           // אימייל הנמען
    processingTime?: number;           // זמן עיבוד במילישניות
  };
}

/**
 * ממשק מסמך לוג התראה - מרחיב את IStockAlertLog עם תכונות Mongoose
 */
export interface IStockAlertLogDocument extends IStockAlertLog, Document {
  _id: mongoose.Types.ObjectId;
}

/**
 * סכמת לוג התראות מלאי - הגדרת מבנה הנתונים ב-MongoDB
 */
const StockAlertLogSchema = new Schema<IStockAlertLogDocument>(
  {
    // מזהה ההתראה המקורית
    // קישור להתראה ששליחתה נרשמה בלוג זה
    alertId: {
      type: Schema.Types.ObjectId,
      ref: 'StockAlert',
      required: [true, 'Alert ID is required'],
      index: true, // אינדקס לחיפוש לוגים של התראה ספציפית
    },

    // תאריך ניסיון השליחה
    sentAt: {
      type: Date,
      required: [true, 'Sent date is required'],
      default: Date.now,
      index: true, // אינדקס לשליפה לפי תאריך (ניקוי, סטטיסטיקות)
    },

    // סטטוס השליחה
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: [true, 'Status is required'],
      index: true, // אינדקס לסטטיסטיקות לפי סטטוס
    },

    // ערוץ השליחה
    channel: {
      type: String,
      enum: ['email', 'sms'],
      required: [true, 'Channel is required'],
      default: 'email',
    },

    // הודעת שגיאה (אם נכשל)
    errorMessage: {
      type: String,
      required: false,
    },

    // מזהה ההודעה מהשירות
    // לדוגמה: Message-Id מ-Nodemailer או מזהה מ-Twilio
    messageId: {
      type: String,
      required: false,
    },

    // מטאדאטה נוספת - לנוחות דיבוג וסטטיסטיקות
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false, // לא צריך - יש לנו sentAt
    collection: 'stockalertlogs',
  }
);

// ============================================================================
// אינדקסים (Indexes)
// ============================================================================

/**
 * אינדקס משולב: תאריך + סטטוס
 * לחישוב סטטיסטיקות (Failure Rate, הצלחות לפי זמן)
 */
StockAlertLogSchema.index(
  { sentAt: 1, status: 1 },
  { name: 'stats_by_date_status' }
);

/**
 * אינדקס TTL לניקוי אוטומטי של לוגים ישנים
 * לוגים יימחקו אוטומטית אחרי 90 יום
 */
StockAlertLogSchema.index(
  { sentAt: 1 },
  { 
    name: 'ttl_cleanup',
    expireAfterSeconds: 90 * 24 * 60 * 60 // 90 ימים
  }
);

// ============================================================================
// Static Methods
// ============================================================================

/**
 * יצירת לוג הצלחה
 * @param alertId - מזהה ההתראה
 * @param channel - ערוץ השליחה
 * @param messageId - מזהה ההודעה מהשירות
 * @param metadata - מטאדאטה נוספת
 */
StockAlertLogSchema.statics.logSuccess = async function (
  alertId: mongoose.Types.ObjectId | string,
  channel: AlertChannel = 'email',
  messageId?: string,
  metadata?: Record<string, any>
): Promise<IStockAlertLogDocument> {
  return this.create({
    alertId,
    sentAt: new Date(),
    status: 'success',
    channel,
    messageId,
    metadata,
  });
};

/**
 * יצירת לוג כשלון
 * @param alertId - מזהה ההתראה
 * @param errorMessage - הודעת השגיאה
 * @param channel - ערוץ השליחה
 * @param metadata - מטאדאטה נוספת
 */
StockAlertLogSchema.statics.logFailure = async function (
  alertId: mongoose.Types.ObjectId | string,
  errorMessage: string,
  channel: AlertChannel = 'email',
  metadata?: Record<string, any>
): Promise<IStockAlertLogDocument> {
  return this.create({
    alertId,
    sentAt: new Date(),
    status: 'failed',
    channel,
    errorMessage,
    metadata,
  });
};

/**
 * חישוב שיעור כשלונות (Failure Rate)
 * @param hours - מספר שעות אחורה לבדיקה
 * @returns Promise<number> - אחוז הכשלונות (0-1)
 */
StockAlertLogSchema.statics.calculateFailureRate = async function (
  hours: number = 24
): Promise<number> {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const [stats] = await this.aggregate([
    { $match: { sentAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
      },
    },
  ]);

  if (!stats || stats.total === 0) {
    return 0;
  }

  return stats.failed / stats.total;
};

/**
 * קבלת סטטיסטיקות שליחה
 * @param hours - מספר שעות אחורה
 */
StockAlertLogSchema.statics.getStats = async function (
  hours: number = 24
): Promise<{
  total: number;
  success: number;
  failed: number;
  failureRate: number;
}> {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const [stats] = await this.aggregate([
    { $match: { sentAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        success: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
      },
    },
  ]);

  if (!stats) {
    return { total: 0, success: 0, failed: 0, failureRate: 0 };
  }

  return {
    total: stats.total,
    success: stats.success,
    failed: stats.failed,
    failureRate: stats.total > 0 ? stats.failed / stats.total : 0,
  };
};

// ============================================================================
// יצירת והחזרת המודל
// ============================================================================

const StockAlertLog = mongoose.model<IStockAlertLogDocument>('StockAlertLog', StockAlertLogSchema);

export { StockAlertLog };
export default StockAlertLog;
