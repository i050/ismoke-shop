import mongoose, { Document, Schema } from 'mongoose';
import { autoAssignColorFamily } from '../utils/colorFamilyDetector';

// ============================================================================
// Phase 1.4: Image interface עם Cloudinary public_id
// ============================================================================

export interface IImage {
  url: string;
  public_id: string; // נחוץ למחיקה מClouyydinary
  width?: number;
  height?: number;
  format?: string;
  // שדות ל-Soft Delete (Phase 3.1)
  isDeleted?: boolean;   // האם התמונה מסומנת למחיקה
  deletedAt?: Date;      // מתי נמחקה (למעקב ולניקוי)
}

/**
 * ממשק SKU - יחידת מלאי בסיסית (Stock Keeping Unit)
 * מייצג וריאנט ספציפי של מוצר עם מחיר, מלאי ותכונות ייחודיות
 */
export interface ISku {
  sku: string; // קוד SKU ייחודי - מזהה סמכותי
  productId: mongoose.Types.ObjectId; // התייחסות למוצר האב
  name: string; // שם תיאורי (למשל: "חולצה כחולה M")
  price?: number | null; // מחיר הסופי של SKU זה (אופציונלי - Base Price Override)
  stockQuantity: number; // כמות במלאי
  color?: string; // צבע (שדה שטוח - יש לו לוגיקה מיוחדת עם colorFamily)
  // size הוסר ממאפיין מובנה - עבר ל-attributes.size ✅
  attributes: {
    // תכונות גמישות נוספות - size, material וכו'
    [key: string]: any;
  };
  colorFamily?: string; // 🆕 משפחת צבע (red, blue, green וכו') - לסינון לפי משפחות צבעים
  colorFamilySource?: 'auto' | 'manual' | 'import'; // מקור זיהוי משפחת הצבע
  images?: IImage[]; // Phase 1.4: שינוי ל-IImage[]
  isActive: boolean; // האם ה-SKU פעיל למכירה
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * ממשק מסמך SKU - מרחיב את ISku עם תכונות Mongoose
 */
export interface ISkuDocument extends ISku, Document {
  _id: mongoose.Types.ObjectId;
}

/**
 * סכמת SKU - הגדרת מבנה הנתונים ב-MongoDB
 */
const SkuSchema = new Schema<ISkuDocument>(
  {
    // קוד SKU - ייחודי בכל המערכת
    // CRITICAL: unique index מונע race conditions ודבליקטים
    sku: {
      type: String,
      required: [true, 'SKU code is required'],
      unique: true, // MongoDB enforces uniqueness at DB level
      trim: true,
      index: true, // אינדקס ראשי לחיפוש מהיר
      uppercase: true, // תמיד אותיות גדולות
    },

    // התייחסות למוצר האב
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true, // אינדקס לשליפת כל SKUs של מוצר
    },

    // שם תיאורי
    name: {
      type: String,
      required: [true, 'SKU name is required'],
      trim: true,
    },

    // מחיר (אופציונלי - Base Price Override Pattern)
    // אם null/undefined, ישתמש ב-Product.basePrice
    // אם מוגדר, דורס את מחיר המוצר הבסיס
    price: {
      type: Number,
      required: false, // ← אופציונלי: תומך ב-Base Price + Override
      min: [0, 'Price cannot be negative'],
      default: null, // ← ברירת מחדל null = ישתמש ב-basePrice
    },

    // כמות במלאי
    stockQuantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
      default: 0,
      index: true, // אינדקס לשאילתות מלאי (למשל: "הצג רק פריטים במלאי")
    },

    // שדות אטריביוטים שטוחים (Phase: Flat Attributes)
    // color נשאר שדה שטוח - יש לו לוגיקה מיוחדת (colorFamily)
    color: {
      type: String,
      required: false,
      trim: true,
    },

    // size הוסר - עבר להיות מאפיין דינמי ב-attributes ✅

    // תכונות גמישות (size, material וכו') - מאפיינים דינמיים
    attributes: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // 🆕 משפחת צבע (לסינון לפי משפחות צבעים)
    // אופציונלי - ישמש לסינון דינמי בחזית
    // דוגמאות: 'red', 'blue', 'green', 'yellow', 'black', 'white'
    colorFamily: {
      type: String,
      required: false,
      trim: true,
      lowercase: true, // נרמול לאותיות קטנות
      index: true, // אינדקס לסינון מהיר
    },

    // תמונות (אופציונלי)
    // Phase 1.4: תמונות כ-IImage objects
    images: {
      type: [
        {
          url: { type: String, required: true },
          public_id: { type: String, required: false, default: '' }, // אופציונלי - תמונות חיצוניות לא צריכות public_id
          width: { type: Number },
          height: { type: Number },
          format: { type: String },
        },
      ],
      default: [],
    },

    // סטטוס פעיל
    isActive: {
      type: Boolean,
      default: true,
      index: true, // אינדקס לסינון פריטים פעילים
    },
  },
  {
    timestamps: true, // הוספה אוטומטית של createdAt ו-updatedAt
    collection: 'skus',
  }
);

/**
 * אינדקסים מורכבים (Compound Indexes)
 */

// אינדקס משולב על productId + isActive - לשליפת SKUs פעילים של מוצר
SkuSchema.index({ productId: 1, isActive: 1 });

// ✅ אינדקס חדש: color מובנה + size דינמי (attributes.size)
// נוסף לפני מחיקת האינדקס הישן כדי להבטיח ביצועים במהלך המעבר
SkuSchema.index({ color: 1, 'attributes.size': 1 }, { background: true });

// ⚠️ אינדקס ישן: ייוסר בשלב מאוחר יותר (אחרי אימות שהחדש עובד)
SkuSchema.index({ color: 1, size: 1 });

// אינדקס משולב על attributes נפוצים (תאימות לאחור)
SkuSchema.index({ 'attributes.color': 1, 'attributes.size': 1 });

// אינדקס לחיפוש מלאי זמין (במלאי + פעיל)
SkuSchema.index({ stockQuantity: 1, isActive: 1 });

// 🆕 אינדקס משולב על colorFamily + isActive - לסינון מהיר לפי משפחת צבע
// מאפשר שאילתות מהירות כמו: "הצג כל המוצרים הפעילים במשפחת צבע אדום"
SkuSchema.index({ colorFamily: 1, isActive: 1 });

/**
 * Methods (ניתן להוסיף בעתיד)
 */

// בדיקת זמינות
SkuSchema.methods.isAvailable = function (quantity: number = 1): boolean {
  return this.isActive && this.stockQuantity >= quantity;
};

// עדכון מלאי (אטומי)
SkuSchema.methods.updateStock = async function (
  delta: number
): Promise<ISkuDocument> {
  const result = await mongoose.model('Sku').findOneAndUpdate(
    {
      _id: this._id,
      stockQuantity: { $gte: Math.abs(delta) >= delta ? Math.abs(delta) : 0 }, // אם מורידים - בדוק שיש מספיק
    },
    {
      $inc: { stockQuantity: delta },
    },
    { new: true }
  );

  if (!result) {
    throw new Error('Insufficient stock or SKU not found');
  }

  return result;
};

/**
 * Static Methods
 */

// מציאת SKU לפי קוד
SkuSchema.statics.findBySku = function (sku: string) {
  return this.findOne({ sku, isActive: true });
};

// מציאת כל SKUs של מוצר (פעילים)
SkuSchema.statics.findByProductId = function (
  productId: mongoose.Types.ObjectId
) {
  return this.find({ productId, isActive: true });
};

// בדיקת זמינות לפני checkout
SkuSchema.statics.checkAvailability = async function (
  sku: string,
  quantity: number
): Promise<boolean> {
  const skuDoc = await this.findOne({ sku, isActive: true });
  return skuDoc ? skuDoc.stockQuantity >= quantity : false;
};

/**
 * Pre-save hooks
 */

// ולידציה נוספת לפני שמירה + auto-assign colorFamily
SkuSchema.pre('save', function (next) {
  // 1. ודא ש-SKU מתחיל באותיות גדולות
  if (this.sku) {
    this.sku = this.sku.toUpperCase();
  }
  
  // 2. Auto-assign colorFamily מ-color (HEX) אם השדה השתנה או חדש
  // רק אם colorFamilySource לא 'manual' (לכבד בחירה ידנית של המנהל)
  if (this.isModified('color') || (this.isNew && this.color && !this.colorFamily)) {
    autoAssignColorFamily(this);
  }
  
  next();
});

/**
 * Virtual property: size
 * מחזיר את attributes.size כאילו הוא שדה רגיל
 * מאפשר תאימות לאחור עם קוד שמצפה ל-sku.size
 */
SkuSchema.virtual('size').get(function () {
  return this.attributes?.size;
});

// הגדרות תצוגה - כולל virtuals בJSON ובObject
SkuSchema.set('toJSON', { virtuals: true });
SkuSchema.set('toObject', { virtuals: true });

/**
 * יצירת והחזרת המודל
 */
const Sku = mongoose.model<ISkuDocument>('Sku', SkuSchema);

export { Sku };
export default Sku;
