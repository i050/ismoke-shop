import mongoose, { Document, Schema } from 'mongoose';

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

// Interface for the flexible attributes
export interface IAttribute {
  key: string;
  value: string;
}

// Interface for technical specifications (מפרט טכני)
// מאפשר למנהל להזין מפרט key-value דינמי
// 🆕 label - תווית לתצוגה (אופציונלי, מתבנית הקטגוריה)
// 🆕 unit - יחידת מידה (אופציונלי, מתבנית הקטגוריה)
export interface ISpecification {
  key: string;
  value: string;
  label?: string;  // תווית לתצוגה (מתבנית)
  unit?: string;   // יחידת מידה (מתבנית)
}

// Interface for product dimensions
export interface IDimensions {
  length: number;
  width: number;
  height: number;
}

// Interface for product variants
export interface IVariant {
  name: string;
  priceModifier: number;
  stockQuantity: number;
  sku?: string;
  images: IImage[]; // Phase 1.4: שינוי ל-IImage[]
  attributes: {
    color?: string;
    size?: string;
    material?: string;
  };
}

// ============================================================================
// Variant Type - סוג מערכת הוריאנטים
// ============================================================================

/**
 * סוגי וריאנטים אפשריים למוצר:
 * - 'color': וריאנטים מבוססי צבע (כפתורי צבע בכרטיסיות)
 * - 'custom': וריאנטים מותאמים אישית (דרופדאונים בדף מוצר בלבד)
 * - null: מוצר פשוט ללא וריאנטים (SKU בסיס בלבד)
 */
export type VariantType = 'color' | 'custom' | null;

// Interface for the Product document
export interface IProduct extends Document {
  // Basic information
  name: string;
  subtitle?: string; // שם משני אופציונלי - מוצג מתחת לשם הראשי
  description: string;
  basePrice: number;
  quantityInStock: number;
  images: IImage[]; // Phase 1.4: שינוי ל-IImage[]
  attributes: IAttribute[];
  categoryId?: mongoose.Types.ObjectId;
  /**
   * קטגוריות נוספות שבהן המוצר יוצג. הקטגוריה הראשית נשארת ב-categoryId
   * כדי לשמור על התאימות למוצרים ולזרימות קיימים.
   */
  additionalCategoryIds: mongoose.Types.ObjectId[];

  // Status and visibility
  isActive: boolean;

  // 🆕 SKU Management - האם למוצר יש וריאנטים מרובים
  // false = מוצר פשוט → יווצר SKU בסיס אוטומטי
  // true = מוצר מורכב → SKUs ידניים (צבעים, מידות וכו')
  hasVariants: boolean;

  // ============================================================================
  // 🆕 Dual Variant System - מערכת וריאנטים כפולה
  // ============================================================================

  /**
   * סוג מערכת הוריאנטים:
   * - 'color': וריאנטים מבוססי צבע עם כפתורי צבע בכרטיסיות
   * - 'custom': וריאנטים מותאמים אישית עם דרופדאונים בדף מוצר בלבד
   * - null: מוצר פשוט ללא וריאנטים
   * 
   * @default null - ברירת מחדל למוצרים קיימים
   * @migration מוצרים עם hasVariants=true ו-SKUs עם colorFamily יקבלו 'color'
   */
  variantType?: VariantType;

  /**
   * תווית הוריאנט הראשי (מוצג בתור שם הדרופדאון/קבוצה)
   * - לוריאנטי צבע: "צבע" (ברירת מחדל, לא חובה)
   * - לוריאנטים מותאמים: "טעם", "סוג" וכו' (חובה)
   */
  primaryVariantLabel?: string;

  /**
   * תווית הוריאנט המשני (אם יש)
   * - לוריאנטי צבע: "מידה", "התנגדות" וכו'
   * - לוריאנטים מותאמים: "ניקוטין", "כמות" וכו'
   */
  secondaryVariantLabel?: string;

  /**
   * קישור לאטריביוט סינון ראשי (אופציונלי)
   * מאפשר לסנן מוצרים לפי הוריאנט הראשי
   * לדוגמה: "flavor" - יאפשר סינון לפי טעם
   */
  primaryFilterAttribute?: string;

  /**
   * קישור לאטריביוט סינון משני (אופציונלי)
   * מאפשר לסנן מוצרים לפי הוריאנט המשני
   * לדוגמה: "nicotine" - יאפשר סינון לפי אחוז ניקוטין
   */
  secondaryFilterAttribute?: string;

  // ============================================================================
  // Legacy Fields (תאימות לאחור)
  // ============================================================================

  // 🆕 ציר וריאנט משני - קובע את סוג התת-וריאנט בתוך כל צבע
  // null = רק צבעים, ללא תת-וריאנט (כל צבע = SKU אחד)
  // 'size' = צבע + מידה (ברירת מחדל למוצרי לבוש)
  // 'resistance' = צבע + התנגדות (מוצרי vape)
  // 'nicotine' = צבע + אחוז ניקוטין
  // או כל key אחר מ-FilterAttributes
  secondaryVariantAttribute?: string | null;

  // Popularity and analytics
  viewCount: number;
  salesCount: number;
  isFeatured: boolean;
  /** מיקום ידני אופציונלי במיון "חדש" (1 = ראשון). */
  newSortPosition?: number | null;
  /** מיקום ידני אופציונלי במיון "פופולרי" (1 = ראשון). */
  popularSortPosition?: number | null;

  // Pricing and discounts
  compareAtPrice?: number; // מחיר לפני הנחה - להצגת חיסכון ללקוח (אופציונלי)
  isOnSale: boolean;
  discountPercentage: number;
  salePrice?: number;
  costPrice?: number;
  taxRate: number;

  // Filtering and categorization
  colors: string[];
  sizes: string[];
  tags: string[];
  brand?: string;

  // Inventory management
  stockQuantity: number;
  lowStockThreshold: number;
  sku?: string;

  // Shipping and logistics
  weight?: number;
  dimensions?: IDimensions;
  shippingWeight?: number;
  shippingDimensions?: IDimensions;

  // Reviews and ratings
  rating: number;
  reviewCount: number;

  // SEO and optimization
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;

  // Technical Specifications (מפרט טכני)
  // מאפשר למנהל להזין מפרט key-value דינמי
  specifications: ISpecification[];

  // Digital products
  isDigital: boolean;
  downloadUrl?: string;

  // Variants and options
  variants: IVariant[];

  // 🆕 Color Family Images - תמונות לפי משפחת צבע
  colorFamilyImages?: { [colorFamily: string]: IImage[] };

  // 🆕 Color Images - תמונות לפי צבע ספציפי (עדיפות על colorFamilyImages)
  colorImages?: { [color: string]: IImage[] };

  // Time-based features
  featuredUntil?: Date;
  saleUntil?: Date;
  lastViewed?: Date;
  lastSold?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const AttributeSchema: Schema = new Schema({
  key: { type: String, required: true },
  value: { type: String, required: true },
}, { _id: false });

// Schema for technical specifications (מפרט טכני)
// 🆕 תמיכה ב-label ו-unit מתבנית הקטגוריה
const SpecificationSchema: Schema = new Schema({
  key: { type: String, required: true },
  value: { type: String, required: true },
  label: { type: String, required: false },  // תווית לתצוגה (מתבנית)
  unit: { type: String, required: false },   // יחידת מידה (מתבנית)
}, { _id: false });

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

const DimensionsSchema: Schema = new Schema({
  length: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
}, { _id: false });

const VariantSchema: Schema = new Schema({
  name: { type: String, required: true },
  priceModifier: { type: Number, default: 0 },
  stockQuantity: { type: Number, default: 0 },
  sku: { type: String },
  images: { type: [ImageSchema], default: [] }, // Phase 1.4: שינוי ל-ImageSchema
  attributes: {
    color: { type: String },
    size: { type: String },
    material: { type: String },
  },
}, { _id: false });

const ProductSchema: Schema = new Schema({
  // Basic information
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // שם משני אופציונלי - מוצג מתחת לשם הראשי בכרטיסיות ובדפי מוצר
  // לדוגמה: "iPhone 15 Pro" → subtitle: "הטכנולוגיה הכי מתקדמת"
  subtitle: {
    type: String,
    required: false,
    trim: true,
    maxlength: 200, // הגבלת אורך למניעת טקסט ארוך מדי
  },
  // תיאור המוצר - אופציונלי (משתמש לא חייב למלא)
  // משמר newlines (\n) לייצוג ירידות שורה שהמנהל קלד
  // בצד Client, יחד עם CSS white-space: pre-wrap, זה יוצג כראוי
  description: {
    type: String,
    required: false,
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  quantityInStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  images: {
    type: [ImageSchema], // Phase 1.4: שינוי ל-ImageSchema
    default: [],
  },
  attributes: {
    type: [AttributeSchema],
    default: [],
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false,
  },
  additionalCategoryIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Category',
    default: [],
  },

  // Status and visibility
  isActive: {
    type: Boolean,
    default: true,
  },

  // 🆕 SKU Management - האם למוצר יש וריאנטים מרובים
  hasVariants: {
    type: Boolean,
    default: false, // ברירת מחדל: מוצר פשוט (SKU בסיס אוטומטי)
  },

  // ============================================================================
  // 🆕 Dual Variant System - מערכת וריאנטים כפולה
  // ============================================================================

  /**
   * סוג מערכת הוריאנטים:
   * - 'color': וריאנטים מבוססי צבע עם כפתורי צבע בכרטיסיות
   * - 'custom': וריאנטים מותאמים אישית עם דרופדאונים בדף מוצר בלבד
   * - null: מוצר פשוט ללא וריאנטים
   */
  variantType: {
    type: String,
    enum: ['color', 'custom', null],
    default: null,
    required: false,
    index: true, // אינדקס לשאילתות לפי סוג וריאנט
  },

  /**
   * תווית הוריאנט הראשי (מוצג בתור שם הדרופדאון/קבוצה)
   * - לוריאנטי צבע: "צבע" (ברירת מחדל)
   * - לוריאנטים מותאמים: "טעם", "סוג" וכו'
   */
  primaryVariantLabel: {
    type: String,
    required: false,
    trim: true,
    maxlength: 50,
  },

  /**
   * תווית הוריאנט המשני (אם יש)
   * - לוריאנטי צבע: "מידה", "התנגדות" וכו'
   * - לוריאנטים מותאמים: "ניקוטין", "כמות" וכו'
   */
  secondaryVariantLabel: {
    type: String,
    required: false,
    trim: true,
    maxlength: 50,
  },

  /**
   * קישור לאטריביוט סינון ראשי (אופציונלי)
   * מאפשר לסנן מוצרים לפי הוריאנט הראשי
   */
  primaryFilterAttribute: {
    type: String,
    required: false,
    trim: true,
    maxlength: 50,
  },

  /**
   * קישור לאטריביוט סינון משני (אופציונלי)
   * מאפשר לסנן מוצרים לפי הוריאנט המשני
   */
  secondaryFilterAttribute: {
    type: String,
    required: false,
    trim: true,
    maxlength: 50,
  },

  // ============================================================================
  // Legacy Fields (תאימות לאחור)
  // ============================================================================

  // 🆕 ציר וריאנט משני - קובע את סוג התת-וריאנט בתוך כל צבע
  // null = רק צבעים, ללא תת-וריאנט
  // key של FilterAttribute = צבע + תת-וריאנט מהסוג הזה
  secondaryVariantAttribute: {
    type: String,
    required: false,
    default: null, // ברירת מחדל: ללא תת-וריאנט
    trim: true,
    sparse: true, // אינדקס sparse כי רוב המוצרים יהיו null
  },

  // Popularity and analytics
  viewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  salesCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  // כשאין ערך נשמר המיון האוטומטי הקיים.
  newSortPosition: {
    type: Number,
    default: null,
    min: 1,
  },
  popularSortPosition: {
    type: Number,
    default: null,
    min: 1,
  },

  // Pricing and discounts
  // מחיר לפני הנחה - מוצג ללקוח כמחיר מחוק לצד המחיר הנוכחי
  compareAtPrice: {
    type: Number,
    min: 0,
    default: null,
  },
  isOnSale: {
    type: Boolean,
    default: false,
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  salePrice: {
    type: Number,
    min: 0,
  },
  costPrice: {
    type: Number,
    min: 0,
  },
  taxRate: {
    type: Number,
    default: 17,
    min: 0,
    max: 100,
  },

  // Filtering and categorization
  colors: {
    type: [String],
    default: [],
  },
  sizes: {
    type: [String],
    default: [],
  },
  tags: {
    type: [String],
    default: [],
  },
  brand: {
    type: String,
    trim: true,
  },

  // Inventory management
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: 0,
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
  },

  // Shipping and logistics
  weight: {
    type: Number,
    min: 0,
  },
  dimensions: {
    type: DimensionsSchema,
  },
  shippingWeight: {
    type: Number,
    min: 0,
  },
  shippingDimensions: {
    type: DimensionsSchema,
  },

  // Reviews and ratings
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  // SEO and optimization
  seoTitle: {
    type: String,
    trim: true,
  },
  seoDescription: {
    type: String,
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
  },

  // Technical Specifications (מפרט טכני)
  // מאפשר למנהל להזין מפרט key-value דינמי
  specifications: {
    type: [SpecificationSchema],
    default: [],
  },

  // Digital products
  isDigital: {
    type: Boolean,
    default: false,
  },
  downloadUrl: {
    type: String,
  },

  // Variants and options
  variants: {
    type: [VariantSchema],
    default: [],
  },

  // ============================================================================
  // 🆕 Color Family Images - תמונות לפי משפחת צבע
  // ============================================================================
  /**
   * מפה של תמונות לפי משפחת צבע.
   * כל SKU עם colorFamily מסוים "יורש" את התמונות של המשפחה.
   * המפתחות הם שמות משפחות הצבע: red, blue, green, yellow, orange, purple, pink, black, white, gray, brown
   * הערך הוא מערך תמונות (IImage[]) לכל משפחה.
   */
  colorFamilyImages: {
    type: Schema.Types.Mixed,
    default: {},
  },

  /**
   * 🆕 מפה של תמונות לפי צבע ספציפי.
   * עדיפות על colorFamilyImages - מאפשר תמונות שונות לכל גוון צבע.
   * המפתחות הם שמות צבעים ספציפיים ("כחול נייבי", "אדום יין", וכו').
   */
  colorImages: {
    type: Schema.Types.Mixed,
    default: {},
  },

  // Time-based features
  featuredUntil: {
    type: Date,
  },
  saleUntil: {
    type: Date,
  },
  lastViewed: {
    type: Date,
  },
  lastSold: {
    type: Date,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// ============================================================================
// 🚀 Phase 0.5.10: Performance Indexes
// ============================================================================

/**
 * Indexes למיטוב ביצועים:
 * 
 * 1. name (text) - חיפוש טקסטואלי מהיר
 * 2. basePrice - מיון וסינון לפי מחיר
 * 3. categoryId - סינון לפי קטגוריה
 * 4. isActive - הפרדת מוצרים פעילים/לא פעילים
 * 5. createdAt - מיון לפי תאריך יצירה (חדשים/ישנים)
 * 6. viewCount - מיון לפי פופולריות
 * 7. salesCount - מיון לפי מכירות
 * 8. isFeatured - סינון מוצרים מומלצים
 * 9. compound index (isActive + createdAt) - שאילתות נפוצות
 */

// Index טקסטואלי לחיפוש במוצרים
ProductSchema.index({ name: 'text', description: 'text' });

// Indexes בודדים לסינון ומיון
ProductSchema.index({ basePrice: 1 }); // מחיר
ProductSchema.index({ categoryId: 1 }); // קטגוריה
ProductSchema.index({ additionalCategoryIds: 1 }); // קטגוריות נוספות
ProductSchema.index({ isActive: 1 }); // סטטוס
ProductSchema.index({ createdAt: -1 }); // תאריך יצירה (חדשים קודם)
ProductSchema.index({ viewCount: -1 }); // צפיות
ProductSchema.index({ salesCount: -1 }); // מכירות
ProductSchema.index({ isFeatured: 1 }); // מוצרים מומלצים
ProductSchema.index({ newSortPosition: 1 }); // מיקום ידני בחדש
ProductSchema.index({ popularSortPosition: 1 }); // מיקום ידני בפופולרי

// Compound indexes לשאילתות נפוצות
ProductSchema.index({ isActive: 1, createdAt: -1 }); // מוצרים פעילים ממוינים לפי תאריך
ProductSchema.index({ isActive: 1, basePrice: 1 }); // מוצרים פעילים ממוינים לפי מחיר
ProductSchema.index({ categoryId: 1, isActive: 1, createdAt: -1 }); // מוצרים בקטגוריה ממוינים
ProductSchema.index({ additionalCategoryIds: 1, isActive: 1, createdAt: -1 }); // מוצרים בקטגוריה נוספת ממוינים

// ============================================================================
// Pre/Post Hooks - Cascade Operations
// ============================================================================

/**
 * Pre-delete middleware: מחיקת כל ה-SKUs של המוצר לפני מחיקתו
 * 
 * CRITICAL: מבטיח referential integrity - לא נשארים SKUs יתומים.
 * פועל על deleteOne, deleteMany, findOneAndDelete.
 * 
 * הערה: Soft delete (isActive: false) מטופל ב-service layer, לא כאן.
 */
ProductSchema.pre('deleteOne', async function(next) {
  try {
    // @ts-ignore - this מצביע על ה-query
    const productId = this.getQuery()._id;
    
    if (productId) {
      // ייבוא דינמי למניעת circular dependency
      const Sku = (await import('./Sku')).default;
      
      const result = await Sku.deleteMany({ productId });
      console.log(`🗑️ Cascade delete: Removed ${result.deletedCount} SKUs for product ${productId}`);
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in pre-delete cascade:', error);
    next(error as Error);
  }
});

/**
 * Pre-delete middleware עבור findOneAndDelete
 */
ProductSchema.pre('findOneAndDelete', async function(next) {
  try {
    // @ts-ignore
    const productId = this.getQuery()._id;
    
    if (productId) {
      const Sku = (await import('./Sku')).default;
      
      const result = await Sku.deleteMany({ productId });
      console.log(`🗑️ Cascade delete: Removed ${result.deletedCount} SKUs for product ${productId}`);
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in pre-delete cascade:', error);
    next(error as Error);
  }
});

/**
 * Pre-delete middleware עבור deleteMany
 */
ProductSchema.pre('deleteMany', async function(next) {
  try {
    // @ts-ignore
    const query = this.getQuery();
    
    // מציאת כל ה-Products שיימחקו
    const products = await mongoose.model('Product').find(query).select('_id').lean();
    const productIds = products.map(p => p._id);
    
    if (productIds.length > 0) {
      const Sku = (await import('./Sku')).default;
      
      const result = await Sku.deleteMany({ productId: { $in: productIds } });
      console.log(`🗑️ Cascade delete: Removed ${result.deletedCount} SKUs for ${productIds.length} products`);
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in pre-deleteMany cascade:', error);
    next(error as Error);
  }
});

const Product = mongoose.model<IProduct>('Product', ProductSchema);

export { Product };
export default Product;
