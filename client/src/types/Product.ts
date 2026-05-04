// ממשק לנתוני מחיר דינמיים שמגיעים מהשרת
export interface PricingData {
  productId: string;
  originalPrice: number;       // מחיר מקורי להצגה (compareAtPrice או basePrice)
  finalPrice: number;          // מחיר סופי שהלקוח משלם
  discountPercentage: number;  // אחוז הנחת קבוצת לקוח (0 אם אין קבוצה)
  customerGroupName?: string;  // שם קבוצת הלקוח (אם יש)
  hasDiscount: boolean;        // האם יש הנחה כלשהי (compareAtPrice או קבוצה)
  compareAtPrice?: number;     // מחיר לפני הנחה מהמוצר (אופציונלי)
}

// ✅ ממשק לתמונה עם DigitalOcean Spaces (3 גדלים מעובדים מראש)
export interface IImage {
  thumbnail: string;  // 200×200 WebP - לכרטיסי מוצר
  medium: string;     // 800×800 WebP - לתצוגה ראשית
  large: string;      // 1200×1200 WebP - לזום ותצוגה מוגדלת
  key: string;        // Base path ב-Spaces (לצורך מחיקה)
  format: string;     // 'webp'
  uploadedAt?: unknown; // Date string מ-JSON (או ערך זמני בזמן עריכה)
}

// ממשק למפרט טכני (Technical Specification)
// מאפשר להציג key-value דינמי בעמוד המוצר
// 🆕 label - תווית לתצוגה (אופציונלי, מתבנית הקטגוריה)
// 🆕 unit - יחידת מידה (אופציונלי, מתבנית הקטגוריה)
export interface ISpecification {
  key: string;
  value: string;
  label?: string;  // תווית לתצוגה (מתבנית)
  unit?: string;   // יחידת מידה (מתבנית)
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

// Phase 3.4: ממשק ל-SKU (מודל חדש)
// Base Price Override Pattern: price אופציונלי - אם null, משתמשים ב-Product.basePrice
// Flat Attributes: color כשדה שטוח, size עבר ל-attributes
export interface Sku {
  _id: string;
  sku: string; // קוד SKU ייחודי
  productId: string;
  name: string;
  price?: number | null; // אופציונלי - Base Price Override Pattern
  compareAtPrice?: number | null; // מחיר לפני הנחה לגרסה - תצוגתי בלבד
  stockQuantity: number;

  // ============================================================================
  // Color Variant Fields (variantType: 'color')
  // ============================================================================
  color?: string; // שדה שטוח (Flat Attribute)
  colorHex?: string; // 🆕 קוד HEX של הצבע (לתצוגה בכפתורי הצבע)
  colorFamily?: string; // 🆕 משפחת צבע (לסינון)

  // ============================================================================
  // 🆕 Custom Variant Fields (variantType: 'custom')
  // ============================================================================
  
  /**
   * שם הוריאנט הראשי (לוריאנטים מותאמים)
   * לדוגמה: "תפוח", "ענבים", "מנטה"
   */
  variantName?: string;

  /**
   * שם הוריאנט המשני (אופציונלי)
   * לדוגמה: "3mg", "6mg", "50ml"
   */
  subVariantName?: string;

  // ============================================================================
  // Dynamic Attributes
  // ============================================================================
  // size עבר להיות מאפיין דינמי ב-attributes
  // תאימות לאחור - attributes מכיל מאפיינים דינמיים
  attributes?: {
    size?: string;
    material?: string;
    [key: string]: string | undefined;
  };
  images: IImage[]; // Phase 1.4: שונה מ-string[] ל-IImage[]
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {// זה הטייפ של מוצר
  _id: string;
  name: string;
  subtitle?: string; // שם משני אופציונלי - מוצג מתחת לשם הראשי
  description: string;
  basePrice: number;
  compareAtPrice?: number; // מחיר לפני הנחה - להצגת חיסכון
  images: IImage[]; // Phase 1.4: שונה מ-string[] ל-IImage[]
  quantityInStock: number;
  sku?: string; // קוד SKU ברמת מוצר (לא SKU מרובים)
  trackInventory?: boolean; // האם לעקוב אחרי מלאי
  lowStockThreshold?: number; // רף אזהרה למלאי נמוך
  attributes: Array<{ key: string; value: string }>;
  specifications?: ISpecification[]; // מפרט טכני - key/value דינמי
  categoryId?: string;
  isActive: boolean;
  viewCount: number;// מספר צפיות במוצר
  salesCount: number;// מספר מכירות של המוצר
  variants?: Array<{ // גרסאות מוצר לצבעים/גדלים וכו' (ישן - לתקופת מעבר)
    name: string;
    priceModifier: number;
    stockQuantity: number;
    sku?: string;
    images: IImage[]; // Phase 1.4: שונה מ-string[] ל-IImage[]
    attributes: {
      color?: string;
      size?: string;
      material?: string;
    };
  }>;
  skus?: Sku[]; // Phase 3.4: SKUs מה-SKU Collection (חדש)

  // ============================================================================
  // 🆕 Color Family Images - תמונות לפי משפחת צבע
  // ============================================================================
  /**
   * מפה של תמונות לפי משפחת צבע.
   * כל SKU עם colorFamily מסוים "יורש" את התמונות של המשפחה.
   * המפתחות הם שמות משפחות הצבע: red, blue, green, yellow, orange, purple, pink, black, white, gray, brown
   * הערך הוא מערך תמונות (IImage[]) לכל משפחה.
   */
  colorFamilyImages?: { [family: string]: IImage[] };

  /**
   * 🆕 מפה של תמונות לפי צבע ספציפי.
   * עדיפות על colorFamilyImages - מאפשר תמונות שונות לכל גוון צבע.
   * המפתחות הם שמות צבעים ספציפיים ("כחול נייבי", "אדום יין" וכו').
   */
  colorImages?: { [color: string]: IImage[] };

  // ============================================================================
  // 🆕 Dual Variant System - מערכת וריאנטים כפולה
  // ============================================================================

  /**
   * סוג מערכת הוריאנטים:
   * - 'color': וריאנטים מבוססי צבע עם כפתורי צבע בכרטיסיות
   * - 'custom': וריאנטים מותאמים אישית עם דרופדאונים בדף מוצר בלבד
   * - null: מוצר פשוט ללא וריאנטים
   */
  variantType?: VariantType;

  /**
   * תווית הוריאנט הראשי
   * - לוריאנטי צבע: "צבע" (ברירת מחדל)
   * - לוריאנטים מותאמים: "טעם", "סוג" וכו'
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
   */
  primaryFilterAttribute?: string;

  /**
   * קישור לאטריביוט סינון משני (אופציונלי)
   */
  secondaryFilterAttribute?: string;

  /**
   * 🆕 האם המוצר מכיל וריאנטים (צבעים/מידות) או שהוא מוצר פשוט
   * משפיע על הממשק בטופס הניהול ועל יצירת SKU אוטומטית
   */
  hasVariants?: boolean;

  // Legacy Field (תאימות לאחור)
  secondaryVariantAttribute?: string | null; // 🆕 מפתח המאפיין המשני (size/resistance/nicotine וכו') - null = רק צבעים

  pricing?: PricingData; // נתוני מחיר מותאמים אישית (מהשרת החדש)
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCreateRequest {// כשאנחנו רוצים ליצור מוצר חדש
  name: string;
  description: string;
  basePrice: number;
  images?: string[];
  quantityInStock: number;
  attributes?: Array<{ key: string; value: string }>;
  categoryId?: string;
  isActive?: boolean;
}

export interface ProductUpdateRequest {// כשאנחנו רוצים לעדכן מוצר קיים
  name?: string;
  description?: string;
  basePrice?: number;
  images?: string[];
  quantityInStock?: number;
  attributes?: Array<{ key: string; value: string }>;
  categoryId?: string;
  isActive?: boolean;
}
// בקובץ הזה אנחנו מגדירים את הטייפים של המוצרים
// זה עוזר לנו לדעת איך נראה מוצר ואילו שדות יש לו
