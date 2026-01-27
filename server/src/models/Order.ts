/**
 * מודל הזמנה - Order Model
 * 
 * שומר snapshot מלא של המוצרים בזמן הרכישה
 * כולל תמיכה ב-transactions ו-optimistic concurrency
 * 
 * @module models/Order
 */

import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// Interfaces - הגדרות טיפוסים
// ============================================================================

/**
 * ממשק לפריט בהזמנה - snapshot של המוצר בזמן הרכישה
 * שומר את כל הנתונים הרלוונטיים כדי שלא להיות תלוי במוצר המקורי
 * Phase 4.0: הוספת תמיכה בהנחת קבוצת לקוחות
 */
export interface IOrderItem {
  productId: mongoose.Types.ObjectId;   // reference למוצר המקורי
  skuId?: mongoose.Types.ObjectId;      // reference ל-SKU ספציפי (אופציונלי)
  name: string;                         // שם המוצר בזמן ההזמנה
  skuName?: string;                     // שם ה-SKU הספציפי (למשל: "אמבר", "כחול", וכו')
  sku: string;                          // מק"ט
  price: number;                        // מחיר ביחידה בזמן ההזמנה (אחרי הנחת קבוצה אם יש)
  originalPrice?: number;               // מחיר מקורי לפני הנחת קבוצה
  discountPercentage?: number;          // אחוז ההנחה מקבוצת לקוחות
  customerGroupName?: string;           // שם קבוצת הלקוח (להצגה ולהיסטוריה)
  quantity: number;                     // כמות
  imageUrl?: string;                    // תמונה ראשית
  attributes?: Record<string, any>;     // מאפיינים (צבע, גודל וכו')
  subtotal: number;                     // סכום ביניים (price * quantity)
}

/**
 * ממשק לכתובת משלוח - embedded document
 * נשמר כחלק מההזמנה ולא כ-reference
 */
export interface IShippingAddress {
  fullName: string;           // שם מלא
  phone: string;              // טלפון
  street: string;             // רחוב ומספר
  city: string;               // עיר
  state?: string;             // מדינה/מחוז (אופציונלי)
  postalCode?: string;        // מיקוד (אופציונלי)
  country: string;            // ארץ
  notes?: string;             // הערות למשלוח
}

/**
 * ממשק להיסטוריית סטטוס - מעקב אחר שינויים בהזמנה
 */
export interface IStatusHistory {
  status: string;                         // הסטטוס
  timestamp: Date;                        // מתי השתנה
  note?: string;                          // הערה (סיבת השינוי)
  updatedBy?: mongoose.Types.ObjectId;    // מי ביצע (admin/system)
}

/**
 * ממשק לפרטי תשלום - רק metadata, לא פרטים רגישים!
 * אף פעם לא שומרים פרטי כרטיס אשראי מלאים
 */
export interface IPaymentInfo {
  gateway: 'stripe' | 'paypal' | 'cash' | 'mock';  // שער התשלום
  status?: PaymentStatus;                  // סטטוס התשלום
  transactionId?: string;                  // מזהה טרנזקציה
  paymentIntentId?: string;               // Stripe payment intent ID
  last4?: string;                         // 4 ספרות אחרונות של כרטיס
  brand?: string;                         // visa, mastercard וכו'
  method?: 'card' | 'paypal' | 'cash' | 'bank_transfer';
  paidAt?: Date;                          // מתי שולם
}

/**
 * סטטוסי הזמנה אפשריים
 */
export type OrderStatus = 
  | 'pending'      // ממתין לאישור
  | 'confirmed'    // אושר
  | 'processing'   // בעיבוד
  | 'shipped'      // נשלח
  | 'delivered'    // נמסר
  | 'cancelled'    // בוטל
  | 'returned'     // הוחזר
  | 'attention';   // דורש טיפול

/**
 * סטטוסי תשלום אפשריים
 */
export type PaymentStatus = 
  | 'pending'            // ממתין לתשלום
  | 'paid'               // שולם
  | 'failed'             // נכשל
  | 'cancelled'          // בוטל
  | 'refunded'           // הוחזר
  | 'partially_refunded'; // הוחזר חלקית

/**
 * סטטוסי הכנה למשלוח
 */
export type FulfillmentStatus = 
  | 'pending'    // ממתין
  | 'packed'     // ארוז
  | 'shipped'    // נשלח
  | 'delivered'; // נמסר

/**
 * ממשק למסמך ההזמנה המלא
 */
export interface IOrder extends Document {
  // מזהים
  orderNumber: string;                    // מספר הזמנה ייחודי (ORD-20251123-0001)
  userId: mongoose.Types.ObjectId;        // reference למשתמש
  isGuest: boolean;                       // האם הזמנת אורח
  guestEmail?: string;                    // אימייל לאורח
  
  // פריטי ההזמנה
  items: IOrderItem[];
  
  // חישובי מחיר
  subtotal: number;                       // סכום ביניים (לפני מס ומשלוח)
  tax: number;                            // מע"ם
  shippingCost: number;                   // עלות משלוח
  discount: number;                       // הנחה
  total: number;                          // סך הכל
  currency: string;                       // מטבע (ILS, USD וכו')
  
  // כתובות
  shippingAddress: IShippingAddress;      // כתובת משלוח
  billingAddress?: IShippingAddress;      // כתובת לחיוב (אופציונלי)
  
  // סטטוסים
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  
  // תשלום
  payment?: IPaymentInfo;
  
  // היסטוריה
  statusHistory: IStatusHistory[];
  
  // מטא-דאטה
  notes?: string;                         // הערות מהלקוח
  adminNotes?: string;                    // הערות פנימיות (מנהל)
  
  // הנחת קבוצת לקוח - לתיעוד
  customerGroupDiscount?: {
    groupName?: string;                   // שם הקבוצה
    discountPercentage: number;           // אחוז ההנחה שניתן
  };
  
  // פרטי משלוח - כולם אופציונליים
  trackingNumber?: string;                // מספר מעקב משלוח
  shippingCarrier?: string;               // שם חברת המשלוחים
  courierPhone?: string;                  // טלפון השליח
  estimatedDeliveryDays?: number;         // יגיע תוך X ימי עסקים
  shippingNotes?: string;                 // הערות משלוח (יופיעו במייל ללקוח)
  
  estimatedDelivery?: Date;               // תאריך משלוח משוער
  
  // טיימסטמפים
  createdAt: Date;
  updatedAt: Date;
  
  // Methods - פונקציות מופע
  updateStatus(newStatus: OrderStatus, note?: string, updatedBy?: mongoose.Types.ObjectId): Promise<IOrder>;
  canBeCancelled(): boolean;
  calculateTotals(): void;
}

// ============================================================================
// Schemas - הגדרות סכמות משנה
// ============================================================================

/**
 * סכימת פריט בהזמנה
 * Phase 4.0: הוספת שדות הנחת קבוצת לקוחות
 */
const OrderItemSchema = new Schema<IOrderItem>({
  productId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: [true, 'מזהה מוצר הוא שדה חובה'] 
  },
  skuId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Sku' 
  },
  name: { 
    type: String, 
    required: [true, 'שם המוצר הוא שדה חובה'],
    trim: true
  },
  sku: { 
    type: String, 
    required: [true, 'מק"ט הוא שדה חובה'],
    trim: true
  },
  price: { 
    type: Number, 
    required: [true, 'מחיר הוא שדה חובה'], 
    min: [0, 'מחיר לא יכול להיות שלילי'] 
  },
  originalPrice: {
    type: Number,
    min: [0, 'מחיר מקורי לא יכול להיות שלילי']
  },
  discountPercentage: {
    type: Number,
    min: [0, 'אחוז הנחה לא יכול להיות שלילי'],
    max: [100, 'אחוז הנחה לא יכול לעלות על 100']
  },
  customerGroupName: {
    type: String,
    trim: true
  },
  quantity: { 
    type: Number, 
    required: [true, 'כמות היא שדה חובה'], 
    min: [1, 'כמות חייבת להיות לפחות 1'] 
  },
  imageUrl: { type: String },
  attributes: { type: Schema.Types.Mixed, default: {} },
  subtotal: { 
    type: Number, 
    required: [true, 'סכום ביניים הוא שדה חובה'], 
    min: 0 
  }
}, { _id: false });

/**
 * סכימת כתובת
 */
const AddressSchema = new Schema<IShippingAddress>({
  fullName: { 
    type: String, 
    required: [true, 'שם מלא הוא שדה חובה'],
    trim: true
  },
  phone: { 
    type: String, 
    required: [true, 'טלפון הוא שדה חובה'],
    trim: true
  },
  street: { 
    type: String, 
    required: [true, 'כתובת היא שדה חובה'],
    trim: true
  },
  city: { 
    type: String, 
    required: [true, 'עיר היא שדה חובה'],
    trim: true
  },
  state: { type: String, trim: true },
  postalCode: { 
    type: String, 
    trim: true
  },
  country: { 
    type: String, 
    required: true, 
    default: 'IL',
    trim: true
  },
  notes: { type: String, trim: true }
}, { _id: false });

/**
 * סכימת היסטוריית סטטוס
 */
const StatusHistorySchema = new Schema<IStatusHistory>({
  status: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  note: { type: String },
  updatedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { _id: false });

/**
 * סכימת פרטי תשלום
 */
const PaymentInfoSchema = new Schema<IPaymentInfo>({
  gateway: { 
    type: String, 
    enum: ['stripe', 'paypal', 'cash', 'mock'], 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'],
    default: 'pending'
  },
  transactionId: { type: String },
  paymentIntentId: { type: String },
  last4: { type: String },
  brand: { type: String },
  method: { 
    type: String, 
    enum: ['card', 'paypal', 'cash', 'bank_transfer']
  },
  paidAt: { type: Date }
}, { _id: false });

// ============================================================================
// Main Schema - הסכימה הראשית
// ============================================================================

const OrderSchema = new Schema<IOrder>({
  // מספר הזמנה ייחודי - נוצר אוטומטית ב-pre-save hook
  orderNumber: { 
    type: String, 
    required: false,  // לא required כי נוצר אוטומטית ב-pre-save hook
    unique: true,
    sparse: true,     // מאפשר null עד שה-hook יוצר את הערך
    index: true 
  },
  
  // קישור למשתמש
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'משתמש הוא שדה חובה'],
    index: true 
  },
  
  // הזמנת אורח
  isGuest: { 
    type: Boolean, 
    default: false 
  },
  guestEmail: { 
    type: String,
    lowercase: true,
    trim: true
  },
  
  // פריטי ההזמנה
  items: { 
    type: [OrderItemSchema], 
    required: true, 
    validate: {
      validator: (val: IOrderItem[]) => val.length > 0,
      message: 'הזמנה חייבת להכיל לפחות פריט אחד'
    }
  },
  
  // חישובי מחיר
  subtotal: { 
    type: Number, 
    required: true, 
    min: [0, 'סכום ביניים לא יכול להיות שלילי'] 
  },
  tax: { 
    type: Number, 
    required: true, 
    min: 0, 
    default: 0 
  },
  shippingCost: { 
    type: Number, 
    required: true, 
    min: 0, 
    default: 0 
  },
  discount: { 
    type: Number, 
    min: 0, 
    default: 0 
  },
  total: { 
    type: Number, 
    required: true, 
    min: [0, 'סכום כולל לא יכול להיות שלילי'] 
  },
  currency: { 
    type: String, 
    default: 'ILS',
    uppercase: true
  },
  
  // כתובות
  shippingAddress: { 
    type: AddressSchema, 
    required: [true, 'כתובת משלוח היא שדה חובה'] 
  },
  billingAddress: { type: AddressSchema },
  
  // סטטוסים
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'attention'],
    default: 'pending',
    index: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true 
  },
  fulfillmentStatus: { 
    type: String, 
    enum: ['pending', 'packed', 'shipped', 'delivered']
  },
  
  // תשלום
  payment: { type: PaymentInfoSchema },
  
  // היסטוריה
  statusHistory: { 
    type: [StatusHistorySchema], 
    default: [] 
  },
  
  // מטא-דאטה
  notes: { type: String, trim: true },
  adminNotes: { type: String, trim: true },
  
  // הנחת קבוצת לקוח - לתיעוד
  customerGroupDiscount: {
    groupName: { type: String, trim: true },
    discountPercentage: { type: Number, min: 0, max: 100 }
  },
  
  // פרטי משלוח - כולם אופציונליים
  trackingNumber: { type: String, trim: true },      // מספר מעקב משלוח
  shippingCarrier: { type: String, trim: true },     // שם חברת המשלוחים (דואר ישראל, FedEx וכו')
  courierPhone: { type: String, trim: true },        // טלפון השליח
  estimatedDeliveryDays: { type: Number, min: 1, max: 60 }, // יגיע תוך X ימי עסקים
  shippingNotes: { type: String, trim: true, maxlength: 500 }, // הערות משלוח
  
  estimatedDelivery: { type: Date }
  
}, { 
  timestamps: true,
  optimisticConcurrency: true // תמיכה ב-optimistic locking עם __v
});

// ============================================================================
// Indexes - אינדקסים לביצועים
// ============================================================================

// אינדקס לחיפוש לפי תאריך (מיון חדש לישן)
OrderSchema.index({ createdAt: -1 });

// אינדקס לחיפוש לפי transaction
OrderSchema.index({ 'payment.transactionId': 1 });

// אינדקס להזמנות אורחים
OrderSchema.index({ guestEmail: 1 });

// אינדקס משולב לסינון לפי סטטוס ותאריך
OrderSchema.index({ status: 1, createdAt: -1 });

// אינדקס משולב לסינון לפי סטטוס תשלום ותאריך
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });

// אינדקס משולב למשתמש וסטטוס
OrderSchema.index({ userId: 1, status: 1, createdAt: -1 });

// ============================================================================
// Methods - פונקציות מופע
// ============================================================================

/**
 * עדכון סטטוס עם שמירת היסטוריה
 * @param newStatus - הסטטוס החדש
 * @param note - הערה אופציונלית
 * @param updatedBy - מי ביצע את העדכון
 */
OrderSchema.methods.updateStatus = async function(
  this: IOrder,
  newStatus: OrderStatus,
  note?: string,
  updatedBy?: mongoose.Types.ObjectId
): Promise<IOrder> {
  // שמירת הסטטוס הקודם בהיסטוריה
  this.statusHistory.push({
    status: this.status,
    timestamp: new Date(),
    note,
    updatedBy
  });
  
  // עדכון הסטטוס החדש
  this.status = newStatus;
  
  return await this.save();
};

/**
 * בדיקה האם ניתן לבטל את ההזמנה
 * ניתן לבטל רק הזמנות שעדיין לא נשלחו ולא הוחזרו
 */
OrderSchema.methods.canBeCancelled = function(this: IOrder): boolean {
  const cancellableStatuses: OrderStatus[] = ['pending', 'confirmed'];
  return cancellableStatuses.includes(this.status) && 
         this.paymentStatus !== 'refunded';
};

/**
 * חישוב סכומים מחדש
 * קורא אוטומטית ב-pre-save
 */
OrderSchema.methods.calculateTotals = function(this: IOrder): void {
  // חישוב subtotal מפריטי ההזמנה
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // חישוב total
  this.total = this.subtotal + this.tax + this.shippingCost - this.discount;
};

// ============================================================================
// Pre-save Hooks - middleware לפני שמירה
// ============================================================================

/**
 * יצירת מספר הזמנה ייחודי אוטומטי
 * פורמט: ORD-YYYYMMDD-XXXX (למשל: ORD-20251125-0001)
 */
OrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // מציאת המספר הסידורי לאותו יום
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const count = await mongoose.model('Order').countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
    
    // יצירת מספר ייחודי עם padding של 4 ספרות
    this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  
  next();
});

/**
 * חישוב totals אוטומטי לפני שמירה
 */
OrderSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

// ============================================================================
// Model Export
// ============================================================================

const Order = mongoose.model<IOrder>('Order', OrderSchema);

export { Order };
export default Order;
