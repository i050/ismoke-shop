/**
 * מודל אירועי Webhook - WebhookEvent Model
 * 
 * שומר אירועי webhook מ-Stripe/PayPal לצורך idempotency
 * מבטיח שכל אירוע מעובד פעם אחת בלבד
 * כולל TTL אוטומטי למחיקת רשומות ישנות
 * 
 * @module models/WebhookEvent
 */

import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// Interfaces - הגדרות טיפוסים
// ============================================================================

/**
 * סטטוסי עיבוד אירוע
 */
export type WebhookEventStatus = 
  | 'received'    // התקבל
  | 'processing'  // בעיבוד
  | 'processed'   // עובד בהצלחה
  | 'failed';     // נכשל

/**
 * שערי תשלום נתמכים
 */
export type PaymentGateway = 'stripe' | 'paypal' | 'mock';

/**
 * ממשק למסמך אירוע webhook
 */
export interface IWebhookEvent extends Document {
  eventId: string;                        // מזהה ייחודי מה-gateway
  gateway: PaymentGateway;                // שער התשלום
  eventType: string;                      // סוג האירוע (payment.succeeded, charge.refunded וכו')
  status: WebhookEventStatus;             // סטטוס העיבוד
  payload: any;                           // הנתונים המלאים שהתקבלו
  orderId?: mongoose.Types.ObjectId;      // קישור להזמנה (אם רלוונטי)
  attempts: number;                       // כמה פעמים ניסינו לעבד
  lastError?: string;                     // שגיאה אחרונה (אם היתה)
  processedAt?: Date;                     // מתי עובד בהצלחה
  expiresAt: Date;                        // TTL - מחיקה אוטומטית
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Schema - הגדרת הסכמה
// ============================================================================

const WebhookEventSchema = new Schema<IWebhookEvent>({
  // מזהה ייחודי מה-gateway - מבטיח idempotency
  eventId: { 
    type: String, 
    required: [true, 'מזהה אירוע הוא שדה חובה'], 
    unique: true, // CRITICAL: מונע עיבוד כפול של אותו אירוע
    index: true,
    trim: true
  },
  
  // שער התשלום
  gateway: { 
    type: String, 
    enum: {
      values: ['stripe', 'paypal', 'mock'],
      message: 'שער תשלום לא תקין: {VALUE}'
    },
    required: [true, 'שער תשלום הוא שדה חובה'],
    index: true 
  },
  
  // סוג האירוע
  eventType: { 
    type: String, 
    required: [true, 'סוג אירוע הוא שדה חובה'],
    index: true,
    trim: true
  },
  
  // סטטוס העיבוד
  status: { 
    type: String, 
    enum: {
      values: ['received', 'processing', 'processed', 'failed'],
      message: 'סטטוס לא תקין: {VALUE}'
    },
    default: 'received',
    index: true 
  },
  
  // הנתונים המלאים שהתקבלו מה-gateway
  payload: { 
    type: Schema.Types.Mixed, 
    required: [true, 'נתוני האירוע הם שדה חובה'] 
  },
  
  // קישור להזמנה (אם האירוע קשור להזמנה)
  orderId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Order',
    index: true 
  },
  
  // מספר ניסיונות עיבוד
  attempts: { 
    type: Number, 
    default: 0,
    min: 0
  },
  
  // שגיאה אחרונה (לדיבוג)
  lastError: { 
    type: String,
    trim: true
  },
  
  // מתי עובד בהצלחה
  processedAt: { 
    type: Date 
  },
  
  // TTL - מחיקה אוטומטית אחרי 90 יום
  // MongoDB ימחק את הרשומה אוטומטית כשהזמן יעבור
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 יום
    index: true 
  }
}, { 
  timestamps: true 
});

// ============================================================================
// Indexes - אינדקסים לביצועים
// ============================================================================

/**
 * TTL Index - MongoDB ימחק אוטומטית documents עם expiresAt שעבר
 * expireAfterSeconds: 0 אומר שהמחיקה תתבצע מיד כש-expiresAt עובר
 */
WebhookEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * אינדקס מורכב לחיפוש מהיר לפי gateway, סוג וסטטוס
 * משמש לשאילתות כמו: "הצג כל אירועי Stripe שנכשלו"
 */
WebhookEventSchema.index({ gateway: 1, eventType: 1, status: 1 });

/**
 * אינדקס לחיפוש אירועים שדורשים retry
 * משמש לשאילתות כמו: "הצג אירועים שנכשלו ויש לנסות שוב"
 */
WebhookEventSchema.index({ status: 1, attempts: 1, createdAt: -1 });

// ============================================================================
// Static Methods - פונקציות סטטיות
// ============================================================================

/**
 * בדיקה האם אירוע כבר עובד
 * @param eventId - מזהה האירוע
 * @returns true אם האירוע כבר קיים במערכת
 */
WebhookEventSchema.statics.isAlreadyProcessed = async function(
  eventId: string
): Promise<boolean> {
  const event = await this.findOne({ eventId });
  return event !== null && event.status === 'processed';
};

/**
 * יצירת אירוע חדש עם בדיקת כפילות
 * @param data - נתוני האירוע
 * @returns האירוע שנוצר או null אם כבר קיים
 */
WebhookEventSchema.statics.createIfNotExists = async function(
  data: Partial<IWebhookEvent>
): Promise<IWebhookEvent | null> {
  try {
    // ניסיון ליצור - אם eventId כבר קיים, יזרוק שגיאת duplicate key
    const event = new this(data);
    return await event.save();
  } catch (error: any) {
    // אם זו שגיאת duplicate key, האירוע כבר קיים
    if (error.code === 11000) {
      return null;
    }
    throw error;
  }
};

/**
 * שליפת אירועים שדורשים retry
 * @param maxAttempts - מספר מקסימלי של ניסיונות
 * @returns רשימת אירועים לעיבוד מחדש
 */
WebhookEventSchema.statics.getFailedForRetry = async function(
  maxAttempts: number = 3
): Promise<IWebhookEvent[]> {
  return await this.find({
    status: 'failed',
    attempts: { $lt: maxAttempts }
  }).sort({ createdAt: 1 }).limit(100);
};

// ============================================================================
// Instance Methods - פונקציות מופע
// ============================================================================

/**
 * סימון האירוע כמעובד בהצלחה
 */
WebhookEventSchema.methods.markAsProcessed = async function(): Promise<IWebhookEvent> {
  this.status = 'processed';
  this.processedAt = new Date();
  return await this.save();
};

/**
 * סימון האירוע ככושל עם שגיאה
 * @param error - הודעת השגיאה
 */
WebhookEventSchema.methods.markAsFailed = async function(
  error: string
): Promise<IWebhookEvent> {
  this.status = 'failed';
  this.lastError = error;
  this.attempts += 1;
  return await this.save();
};

/**
 * סימון האירוע כבעיבוד
 */
WebhookEventSchema.methods.markAsProcessing = async function(): Promise<IWebhookEvent> {
  this.status = 'processing';
  return await this.save();
};

// ============================================================================
// Model Export
// ============================================================================

const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);

export { WebhookEvent };
export default WebhookEvent;
