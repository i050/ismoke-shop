import mongoose, { Document, Schema } from 'mongoose';
import { autoAssignColorFamily } from '../utils/colorFamilyDetector';

// ============================================================================
// DigitalOcean Spaces Image Interface
// ============================================================================

/**
 * ממשק תמונה עם 3 גדלים קבועים
 * - thumbnail: 200×200 - לרשימות וקרוסלות
 * - medium: 800×800 - תצוגה ראשית
 * - large: 1200×1200 - זום והגדלה
 */
export interface IImage {
  thumbnail: string;  // URL של תמונה קטנה (200×200)
  medium: string;     // URL של תמונה בינונית (800×800)
  large: string;      // URL של תמונה גדולה (1200×1200)
  key: string;        // Base path ב-Spaces (products/productid/timestamp)
  format: string;     // פורמט הקובץ (webp)
  uploadedAt: Date;   // תאריך העלאה
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
  compareAtPrice?: number | null; // מחיר לפני הנחה תצוגתי לגרסה - לא משפיע על חישובים כספיים
  stockQuantity: number; // כמות במלאי

  // ============================================================================
  // Color Variant Fields (variantType: 'color')
  // ============================================================================
  color?: string; // צבע (שדה שטוח - יש לו לוגיקה מיוחדת עם colorFamily)
  colorHex?: string; // 🆕 קוד HEX של הצבע (לתצוגה בכפתורי הצבע)
  colorFamily?: string; // 🆕 משפחת צבע (red, blue, green וכו') - לסינון לפי משפחות צבעים
  colorFamilySource?: 'auto' | 'manual' | 'import'; // מקור זיהוי משפחת הצבע

  // ============================================================================
  // 🆕 Custom Variant Fields (variantType: 'custom')
  // ============================================================================
  
  /**
   * שם הוריאנט הראשי (לוריאנטים מותאמים)
   * לדוגמה: "תפוח", "ענבים", "מנטה"
   * משמש כשvariantType של המוצר הוא 'custom'
   */
  variantName?: string;

  /**
   * שם הוריאנט המשני (אופציונלי)
   * לדוגמה: "3mg", "6mg", "50ml"
   * משמש יחד עם variantName לוריאנטים מורכבים
   */
  subVariantName?: string;

  // ============================================================================
  // Dynamic Attributes
  // ============================================================================
  // size הוסר ממאפיין מובנה - עבר ל-attributes.size ✅
  attributes: {
    // תכונות גמישות נוספות - size, material וכו'
    [key: string]: any;
  };

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
 * סכמת תמונה - Backward Compatible
 * תומכת במבנה החדש (DigitalOcean Spaces) והישן (Cloudinary)
 * 
 * מבנה חדש: {thumbnail, medium, large, key, format, uploadedAt}
 * מבנה ישן: {url, public_id, width?, height?, format?}
 */
const ImageSchema: Schema = new Schema({
  // DigitalOcean Spaces - מבנה חדש (אופציונלי לתאימות לאחור)
  thumbnail: { type: String, required: false },  // תמונה קטנה 200×200
  medium: { type: String, required: false },     // תמונה בינונית 800×800
  large: { type: String, required: false },      // תמונה גדולה 1200×1200
  key: { type: String, required: false },        // Base path ב-Spaces
  
  // Cloudinary - מבנה ישן (לתאימות לאחור)
  url: { type: String, required: false },        // URL ישן של Cloudinary
  public_id: { type: String, required: false },  // Public ID של Cloudinary
  
  // שדות משותפים
  format: { type: String, required: false, default: 'webp' },
  width: { type: Number, required: false },
  height: { type: Number, required: false },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

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

    // מחיר לפני הנחה לגרסה - תצוגתי בלבד ולא משתתף בסל/הזמנה/הנחות
    // תקף להצגה רק כאשר ל-SKU יש price ספציפי; הלוגיקה נאכפת בשכבת התצוגה
    compareAtPrice: {
      type: Number,
      required: false,
      min: [0, 'Compare-at price cannot be negative'],
      default: null,
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

    // 🆕 קוד HEX של הצבע (לתצוגה בכפתור)
    colorHex: {
      type: String,
      required: false,
      trim: true,
    },

    // ============================================================================
    // 🆕 Custom Variant Fields (variantType: 'custom')
    // ============================================================================

    /**
     * שם הוריאנט הראשי (לוריאנטים מותאמים)
     * לדוגמה: "תפוח", "ענבים", "מנטה"
     */
    variantName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
      index: true, // אינדקס לקיבוץ וסינון
    },

    /**
     * שם הוריאנט המשני (אופציונלי)
     * לדוגמה: "3mg", "6mg", "50ml"
     */
    subVariantName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },

    // ============================================================================
    // Dynamic Attributes
    // ============================================================================

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
    // DigitalOcean Spaces - 3 גדלים לכל תמונה
    images: {
      type: [ImageSchema],
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
  
  // 2. Auto-assign colorFamily מ-color (HEX) רק אם:
  //    - השדה color השתנה ואין colorFamily ידני (source !== 'manual')
  //    - או שזה SKU חדש בלי colorFamily בכלל
  const shouldAutoAssign = 
    (this.isModified('color') && this.colorFamilySource !== 'manual') ||
    (this.isNew && this.color && !this.colorFamily);
    
  if (shouldAutoAssign) {
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
