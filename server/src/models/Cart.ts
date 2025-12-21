import mongoose, { Document, Schema } from 'mongoose';

// ממשק לפריט בסל
export interface ICartItem {
  _id?: mongoose.Types.ObjectId; // מזהה הפריט בסל
  productId: mongoose.Types.ObjectId; // מזהה המוצר
  name: string; // שם המוצר (שמור לביצועים)
  price: number; // מחיר סופי ליחידה (כולל הנחת קבוצה אם יש)
  originalPrice?: number; // מחיר מקורי לפני הנחת קבוצה
  discountPercentage?: number; // אחוז ההנחה שהוחל (מקבוצת לקוח)
  customerGroupName?: string; // שם קבוצת הלקוח (להצגה)
  quantity: number; // כמות
  variantIndex?: number; // אינדקס הווריאנט שנבחר במערך הווריאנטים של המוצר
  sku?: string; // SKU של הווריאנט (PRIMARY KEY להשוואה בעתיד)
  availableStock?: number; // כמות זמינה במלאי בעת חישוב הסל
  image: string; // תמונה ראשית (שמור לביצועים)
  variant?: {
    color?: string; // צבע אם יש
    size?: string; // מידה אם יש
    name?: string; // שם הווריאנט
  };
  subtotal: number; // סכום ביניים (price * quantity)
}

// ממשק לקופון
export interface ICoupon {
  code: string; // קוד הקופון
  discountAmount: number; // סכום ההנחה שחושב
  discountType: 'percentage' | 'fixed'; // סוג ההנחה
}

// ממשק למסמך הסל
export interface ICart extends Document {
  userId?: mongoose.Types.ObjectId; // מזהה משתמש (אם מחובר)
  sessionId?: string; // מזהה session (למשתמשים אורחים)
  items: ICartItem[]; // רשימת הפריטים בסל
  subtotal: number; // סכום ביניים (לפני הנחות ומשלוח)
  tax: number; // מע"מ
  shippingCost: number; // עלות משלוח
  discount: number; // סכום הנחה כולל
  totalPrice: number; // מחיר סופי
  coupon?: ICoupon; // קופון מופעל
  status: 'active' | 'abandoned' | 'checkedOut' | 'merged'; // סטטוס הסל
  lastActivity: Date; // פעילות אחרונה (לזיהוי נטישה)
  expiresAt: Date; // תאריך תפוגה (למניעת סלים ישנים)
  createdAt: Date;
  updatedAt: Date;
}

// Schema לפריט בסל
const CartItemSchema: Schema = new Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  originalPrice: {
    type: Number,
    min: 0,
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
  },
  customerGroupName: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  image: {
    type: String,
    default: '',
  },
  variant: {
    color: { type: String },
    size: { type: String },
    name: { type: String },
  },
  variantIndex: {
    type: Number,
    required: false,
  },
  sku: {
    type: String,
    required: false, // לא חובה כרגע (backward compatibility)
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0,
  },
  // כמות זמינה במלאי בזמן חישוב/החזרת הסל
  availableStock: {
    type: Number,
    default: null,
  },
}, { _id: true }); // מאפשר _id לכל פריט לניהול קל יותר

// Schema לקופון
const CouponSchema: Schema = new Schema({
  code: {
    type: String,
    required: true,
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
}, { _id: false });

// Schema ראשי לסל
const CartSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Index מוגדר מפורשות למטה (שורה 177) - אין צורך ב-sparse כאן
  },
  sessionId: {
    type: String,
    // Index מוגדר מפורשות למטה (שורה 178) - אין צורך ב-sparse כאן
  },
  items: {
    type: [CartItemSchema],
    default: [],
  },
  subtotal: {
    type: Number,
    default: 0,
    min: 0,
  },
  tax: {
    type: Number,
    default: 0,
    min: 0,
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  coupon: {
    type: CouponSchema,
  },
  status: {
    type: String,
    enum: ['active', 'abandoned', 'checkedOut', 'merged'],
    default: 'active',
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ימים מהיום
  },
}, {
  timestamps: true, // הוספה אוטומטית של createdAt ו-updatedAt
});

// ============================================================================
// Indexes לביצועים
// ============================================================================

/**
 * Indexes מותאמים לשאילתות נפוצות בסל קניות:
 * 
 * 1. userId - חיפוש סל של משתמש מחובר (sparse = מאפשר null)
 * 2. sessionId - חיפוש סל של משתמש אורח (sparse = מאפשר null)
 * 3. status + lastActivity - זיהוי סלים נטושים
 * 4. expiresAt - מחיקה אוטומטית של סלים ישנים (TTL index)
 */

CartSchema.index({ userId: 1 }, { sparse: true }); // חיפוש מהיר לפי משתמש (מאפשר null)
CartSchema.index({ sessionId: 1 }, { sparse: true }); // חיפוש מהיר לפי session (מאפשר null)
CartSchema.index({ status: 1, lastActivity: -1 }); // לזיהוי סלים נטושים
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // מחיקה אוטומטית של סלים ישנים

// ============================================================================
// Middleware
// ============================================================================

// Pre-save middleware לעדכון lastActivity
CartSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

const Cart = mongoose.model<ICart>('Cart', CartSchema);

export default Cart;
