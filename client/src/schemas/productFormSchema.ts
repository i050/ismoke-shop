// Product Form Validation Schema
// מטרת הקובץ: הגדרת כללי validation למוצר ו-SKUs באמצעות yup
// שימוש: react-hook-form + yupResolver

import * as yup from 'yup';

// ==========================================
// SKU Validation Schema (מוגדר ראשון כי productSchema משתמש בו)
// ==========================================

/**
 * Schema לוולידציה של SKU (Stock Keeping Unit)
 * כל SKU מייצג וריאנט של המוצר (צבע, מידה, וכו')
 */
export const skuSchema = yup.object({
  // קוד SKU ייחודי
  sku: yup
    .string()
    .required('קוד SKU הוא שדה חובה')
    .matches(
      /^[A-Z0-9-]+$/,
      'קוד SKU יכול להכיל רק אותיות גדולות באנגלית, מספרים ומקפים'
    )
    .min(3, 'קוד SKU חייב להכיל לפחות 3 תווים')
    .max(50, 'קוד SKU לא יכול להכיל יותר מ-50 תווים')
    .trim(),

  // שם תצוגה
  // 🔧 שם יכול להיות ריק ל-SKU ראשוני של מוצר פשוט
  // הולידציה האמיתית נעשית ברמת המוצר (hasVariants + test על skus)
  name: yup
    .string()
    .optional()
    .test(
      'name-length-if-provided',
      'שם הוריאנט חייב להכיל לפחות 3 תווים',
      function (value) {
        // אם השם ריק או null - תקין (SKU ראשוני למוצר פשוט)
        if (!value || value.trim() === '') return true;
        // אם יש שם - חייב להכיל לפחות 3 תווים
        return value.trim().length >= 3;
      }
    )
    .max(200, 'שם הוריאנט לא יכול להכיל יותר מ-200 תווים')
    .trim(),

  // מחיר ספציפי (אופציונלי - אם לא מוגדר, ישתמש במחיר הבסיס של המוצר)
  // Base Price Override Pattern: SKU.price יכול להיות null (ואז ישתמש ב-Product.basePrice)
  price: yup
    .number()
    .transform((value, originalValue) => {
      // אם השדה ריק או null/undefined, החזר null
      if (originalValue === '' || originalValue === null || originalValue === undefined) {
        return null;
      }
      return value;
    })
    .nullable()
    .optional()
    .test(
      'is-positive-or-null',
      'מחיר חייב להיות מספר חיובי או ריק (לשימוש במחיר הבסיס)',
      function (value) {
        // אם המחיר null או undefined - זה תקין (ישתמש ב-basePrice)
        if (value === null || value === undefined) return true;
        // אם יש ערך - חייב להיות חיובי
        return value > 0;
      }
    )
    .max(999999, 'מחיר לא יכול לעלות על 999,999'),

  // מחיר לפני הנחה לגרסה - תצוגתי בלבד ופעיל רק כאשר לגרסה יש מחיר ספציפי
  compareAtPrice: yup
    .number()
    .transform((value, originalValue) => {
      // שדה ריק מייצג "לא להציג מחיר לפני הנחה" עבור הגרסה
      if (originalValue === '' || originalValue === null || originalValue === undefined) {
        return null;
      }
      return value;
    })
    .nullable()
    .optional()
    .test(
      'compare-at-requires-sku-price',
      'מחיר לפני הנחה לגרסה אפשרי רק כאשר לגרסה יש מחיר ספציפי',
      function (value) {
        if (value === null || value === undefined) return true;
        const { price } = this.parent;
        return price !== null && price !== undefined;
      }
    )
    .test(
      'compare-at-price-higher-than-sku-price',
      'מחיר לפני הנחה לגרסה חייב להיות גבוה ממחיר הגרסה',
      function (value) {
        if (value === null || value === undefined) return true;
        const { price } = this.parent;
        if (price === null || price === undefined) return true;
        return value > price;
      }
    )
    .max(999999, 'מחיר לפני הנחה לא יכול לעלות על 999,999'),

  // מלאי
  stockQuantity: yup
    .number()
    .required('כמות במלאי היא שדה חובה')
    .integer('כמות במלאי חייבת להיות מספר שלם')
    .min(0, 'כמות במלאי לא יכולה להיות שלילית')
    .max(999999, 'כמות במלאי לא יכולה לעלות על 999,999')
    .typeError('כמות במלאי חייבת להיות מספר'),

  // שדות שטוחים (Flat Attributes) - לא מקוננים
  color: yup
    .string()
    .optional()
    .max(50, 'שם הצבע לא יכול להכיל יותר מ-50 תווים')
    .nullable(),

  // 🆕 קוד HEX של הצבע (לתצוגה בכפתורי הצבע)
  colorHex: yup
    .string()
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/, 'קוד צבע HEX חייב להיות בפורמט #RRGGBB')
    .nullable(),

  // size הוסר מהטופ-לבל - כעת מאפיין דינמי ב-attributes

  // 🆕 משפחת צבע - מתוך בנק המאפיינים הגלובלי
  // משמש לסינון דינמי בחזית (red, blue, green וכו')
  colorFamily: yup
    .string()
    .optional()
    .max(30, 'משפחת צבע לא יכולה להכיל יותר מ-30 תווים')
    .nullable(),

  // מקור משפחת הצבע - auto (זיהוי אוטומטי) או manual (בחירה ידנית)
  colorFamilySource: yup
    .string()
    .oneOf(['auto', 'manual', 'import'], 'מקור משפחת צבע חייב להיות auto, manual או import')
    .optional()
    .default('auto')
    .nullable(),

  // ============================================================================
  // 🆕 Custom Variant Fields (variantType: 'custom')
  // ============================================================================

  // שם הוריאנט הראשי (לוריאנטים מותאמים)
  variantName: yup
    .string()
    .optional()
    .max(100, 'שם וריאנט לא יכול להכיל יותר מ-100 תווים')
    .nullable(),

  // שם הוריאנט המשני (אופציונלי)
  subVariantName: yup
    .string()
    .optional()
    .max(100, 'שם תת-וריאנט לא יכול להכיל יותר מ-100 תווים')
    .nullable(),

  // תאימות לאחור - attributes עדיין מקובל (אך לא נשלח לשרת)
  attributes: yup
    .object()
    .optional()
    .default(undefined),

  // תמונות ספציפיות ל-SKU
  // תומך במבנה החדש (DigitalOcean Spaces) והישן (Cloudinary)
  images: yup
    .array()
    .of(
      yup.lazy((value: any) => {
        // אם יש שדה thumbnail - מבנה חדש (DigitalOcean Spaces)
        if (value && (value.thumbnail || value.medium || value.large)) {
          return yup.object({
            thumbnail: yup.string().required('תמונה ממוזערת היא שדה חובה'),
            medium: yup.string().required('תמונה בינונית היא שדה חובה'),
            large: yup.string().required('תמונה גדולה היא שדה חובה'),
            key: yup.string().required('מפתח התמונה הוא שדה חובה'),
            format: yup.string().optional().default('webp'),
            uploadedAt: yup.mixed().optional(), // mixed - מקבל string (JSON) או Date
          });
        }
        // אחרת - מבנה ישן (Cloudinary) - backward compatibility
        return yup.object({
          url: yup.string().required('כתובת תמונה היא שדה חובה'),
          public_id: yup.string().optional().default(''),
          width: yup.number().optional(),
          height: yup.number().optional(),
          format: yup.string().optional(),
        });
      })
    )
    .optional()
    .max(10, 'לא ניתן להעלות יותר מ-10 תמונות ל-SKU')
    .default([]),

  // סטטוס
  isActive: yup
    .boolean()
    .optional()
    .default(true),
}).required();

// ==========================================
// Product Validation Schema
// ==========================================

/**
 * Schema לוולידציה של מוצר (Product)
 * כולל את כל השדות הנדרשים ליצירה/עריכה של מוצר
 */
export const productSchema = yup.object({
  // מידע בסיסי
  name: yup
    .string()
    .required('שם המוצר הוא שדה חובה')
    .min(3, 'שם המוצר חייב להכיל לפחות 3 תווים')
    .max(200, 'שם המוצר לא יכול להכיל יותר מ-200 תווים')
    .trim(),

  // שם משני אופציונלי - מוצג מתחת לשם הראשי
  subtitle: yup
    .string()
    .optional()
    .max(200, 'השם המשני לא יכול להכיל יותר מ-200 תווים')
    .nullable()
    .trim(),

  // תיאור המוצר - אופציונלי
  // אם המשתמש מחליט למלא, חייב להכיל עד 5000 תווים (כל אורך מותר)
  // ⚠️ NO TRIM: משמר newlines (\n) במדויק כמו שהם - לתצוגה עם white-space: pre-wrap
  description: yup
    .string()
    .optional()
    .max(5000, 'תיאור המוצר לא יכול להכיל יותר מ-5000 תווים')
    .typeError('תיאור חייב להיות טקסט')
    .nullable(),

  brand: yup
    .string()
    .optional()
    .max(100, 'שם המותג לא יכול להכיל יותר מ-100 תווים')
    .trim()
    .nullable(),

  // מחירים
  basePrice: yup
    .number()
    .required('מחיר בסיס הוא שדה חובה')
    .positive('מחיר בסיס חייב להיות מספר חיובי')
    .max(999999, 'מחיר בסיס לא יכול לעלות על 999,999')
    .typeError('מחיר בסיס חייב להיות מספר'),

  compareAtPrice: yup
    .number()
    .optional()
    .positive('מחיר להשוואה חייב להיות מספר חיובי')
    .max(999999, 'מחיר להשוואה לא יכול לעלות על 999,999')
    .test(
      'compare-at-price-higher',
      'מחיר להשוואה חייב להיות גבוה ממחיר הבסיס',
      function (value) {
        const { basePrice } = this.parent;
        if (!value || !basePrice) return true; // אם אין ערך, הבדיקה עוברת
        return value > basePrice;
      }
    )
    .nullable(),

  // קטגוריה
  categoryId: yup
    .string()
    .required('קטגוריה היא שדה חובה')
    .matches(
      /^[0-9a-fA-F]{24}$/,
      'מזהה קטגוריה לא תקין (חייב להיות ObjectId של MongoDB)'
    ),

  additionalCategoryIds: yup
    .array()
    .of(
      yup.string().matches(
        /^[0-9a-fA-F]{24}$/,
        'מזהה קטגוריה נוספת לא תקין'
      )
    )
    .max(20, 'ניתן לשייך עד 20 קטגוריות נוספות')
    .test(
      'unique-additional-categories',
      'לא ניתן לבחור אותה קטגוריה יותר מפעם אחת',
      (value) => !value || new Set(value).size === value.length
    )
    .test(
      'additional-categories-exclude-primary',
      'הקטגוריה הראשית אינה יכולה להופיע גם בקטגוריות הנוספות',
      function (value) {
        return !value || !this.parent.categoryId || !value.includes(this.parent.categoryId);
      }
    )
    .default([]),

  // תמונות
  // תומך במבנה החדש (DigitalOcean Spaces) והישן (Cloudinary)
  images: yup
    .array()
    .of(
      yup.lazy((value: any) => {
        // אם יש שדה thumbnail - מבנה חדש (DigitalOcean Spaces)
        if (value && (value.thumbnail || value.medium || value.large)) {
          return yup.object({
            thumbnail: yup.string().required('תמונה ממוזערת היא שדה חובה'),
            medium: yup.string().required('תמונה בינונית היא שדה חובה'),
            large: yup.string().required('תמונה גדולה היא שדה חובה'),
            key: yup.string().required('מפתח התמונה הוא שדה חובה'),
            format: yup.string().optional().default('webp'),
            uploadedAt: yup.mixed().optional(), // mixed - מקבל string (JSON) או Date
          });
        }
        // אחרת - מבנה ישן (Cloudinary) - backward compatibility
        return yup.object({
          url: yup.string().required('כתובת תמונה היא שדה חובה'),
          public_id: yup.string().optional().default(''),
          width: yup.number().optional(),
          height: yup.number().optional(),
          format: yup.string().optional(),
        });
      })
    )
    .optional()
    .max(10, 'לא ניתן להעלות יותר מ-10 תמונות למוצר')
    .default([]),

  // תגיות
  tags: yup
    .array()
    .of(
      yup
        .string()
        .min(2, 'תגית חייבת להכיל לפחות 2 תווים')
        .max(50, 'תגית לא יכולה להכיל יותר מ-50 תווים')
        .trim()
    )
    .optional()
    .max(20, 'לא ניתן להוסיף יותר מ-20 תגיות למוצר')
    .default([]),

  // סטטוס
  isActive: yup
    .boolean()
    .optional()
    .default(true),

  // מלאי (ברמת מוצר - לא SKU מרובים)
  sku: yup
    .string()
    .optional()
    .matches(
      /^[A-Z0-9-]*$/,
      'קוד SKU יכול להכיל רק אותיות גדולות באנגלית, מספרים ומקפים'
    )
    .max(50, 'קוד SKU לא יכול להכיל יותר מ-50 תווים')
    .nullable(),

  stockQuantity: yup
    .number()
    .optional()
    .integer('כמות במלאי חייבת להיות מספר שלם')
    .min(0, 'כמות במלאי לא יכולה להיות שלילית')
    .max(999999, 'כמות במלאי לא יכולה לעלות על 999,999')
    .nullable(),

  trackInventory: yup
    .boolean()
    .optional()
    .default(true),

  // 🆕 ציר וריאנט משני - קובע את סוג התת-וריאנט בתוך כל צבע
  // null = רק צבעים, ללא תת-וריאנט (כל צבע = SKU אחד)
  // 'size' = צבע + מידה
  // או כל key אחר מ-FilterAttributes
  secondaryVariantAttribute: yup
    .string()
    .optional()
    .nullable()
    .default(null),

  // ============================================================================
  // 🆕 Dual Variant System - מערכת וריאנטים כפולה
  // ============================================================================

  // סוג מערכת הוריאנטים: 'color' | 'custom' | null
  variantType: yup
    .mixed<'color' | 'custom' | null>()
    .oneOf(['color', 'custom', null], 'סוג וריאנט חייב להיות color, custom או ריק')
    .optional()
    .nullable()
    .default(null),

  // תווית הוריאנט הראשי
  primaryVariantLabel: yup
    .string()
    .optional()
    .max(50, 'תווית וריאנט ראשי לא יכולה להכיל יותר מ-50 תווים')
    .nullable(),

  // תווית הוריאנט המשני
  secondaryVariantLabel: yup
    .string()
    .optional()
    .max(50, 'תווית וריאנט משני לא יכולה להכיל יותר מ-50 תווים')
    .nullable(),

  // קישור לאטריביוט סינון ראשי
  primaryFilterAttribute: yup
    .string()
    .optional()
    .max(50, 'מזהה אטריביוט סינון ראשי לא יכול להכיל יותר מ-50 תווים')
    .nullable(),

  // קישור לאטריביוט סינון משני
  secondaryFilterAttribute: yup
    .string()
    .optional()
    .max(50, 'מזהה אטריביוט סינון משני לא יכול להכיל יותר מ-50 תווים')
    .nullable(),

  // 🆕 האם המוצר הוא מוצר עם וריאנטים (צבעים/מידות) או מוצר פשוט
  // משפיע על הממשק בטופס ועל יצירת SKU אוטומטית
  hasVariants: yup
    .boolean()
    .optional()
    .default(false),

  lowStockThreshold: yup
    .number()
    .optional()
    .integer('רף אזהרה חייב להיות מספר שלם')
    .min(0, 'רף אזהרה לא יכול להיות שלילי')
    .max(999999, 'רף אזהרה לא יכול לעלות על 999,999')
    .nullable(),

  // SKUs (וריאנטים) - אופציונלי, מוצר יכול להיות ללא SKUs
  skus: yup
    .array()
    .of(skuSchema) // מוגדר למעלה
    .optional()
    .default([])
    .test(
      'has-valid-variants',
      'מוצר עם גירסאות חייב להכיל לפחות גירסא אחת עם צבע או שם',
      function (value) {
        const { hasVariants } = this.parent;
        
        // אם זה לא מוצר עם וריאנטים - לא צריך בדיקה
        if (!hasVariants) return true;
        
        // אם זה מוצר עם וריאנטים - צריך לפחות SKU אחד "אמיתי"
        // SKU אמיתי = יש לו שם או צבע (לא רק SKU דיפולטיבי ריק)
        const validSkus = (value || []).filter(sku => {
          const hasName = sku.name && sku.name.trim() !== '';
          const hasColor = sku.color && sku.color.trim() !== '';
          return hasName || hasColor;
        });
        
        return validSkus.length > 0;
      }
    ),

  // Technical Specifications (מפרט טכני)
  // מאפשר למנהל להזין מפרט key-value דינמי - לא חובה
  // הערה: אנחנו לא מגדירים required כי מסננים specifications ריקים לפני השליחה לשרת
  specifications: yup
    .array()
    .of(
      yup.object({
        key: yup.string()
          .max(100, 'שם המאפיין לא יכול להכיל יותר מ-100 תווים')
          .trim()
          .default(''),
        value: yup.string()
          .max(500, 'ערך המאפיין לא יכול להכיל יותר מ-500 תווים')
          .trim()
          .default(''),
        // 🆕 שדות אופציונליים מתבנית קטגוריה
        label: yup.string().optional().nullable(),
        unit: yup.string().optional().nullable(),
      })
    )
    .optional()
    .max(50, 'לא ניתן להוסיף יותר מ-50 מאפייני מפרט')
    .default([]),

  // ============================================================================
  // 🆕 SEO Fields - שדות קידום אורגני
  // ============================================================================

  // כותרת SEO (meta title)
  seoTitle: yup
    .string()
    .optional()
    .max(70, 'כותרת SEO לא יכולה להכיל יותר מ-70 תווים')
    .nullable(),

  // תיאור SEO (meta description)
  seoDescription: yup
    .string()
    .optional()
    .max(160, 'תיאור SEO לא יכול להכיל יותר מ-160 תווים')
    .nullable(),

  // Slug לכתובת URL
  slug: yup
    .string()
    .optional()
    .test(
      'valid-slug',
      'Slug יכול להכיל רק אותיות קטנות באנגלית, מספרים ומקפים',
      function (value) {
        // אם הערך ריק, null או undefined - תקין
        if (!value || value.trim() === '') return true;
        // אחרת בדוק את הפורמט
        return /^[a-z0-9-]+$/.test(value);
      }
    )
    .max(100, 'Slug לא יכול להכיל יותר מ-100 תווים')
    .nullable(),

  // ============================================================================
  // 🆕 Marketing Fields - שדות שיווק ומבצעים
  // ============================================================================

  // האם המוצר חדש
  isNew: yup
    .boolean()
    .optional()
    .default(false),

  // האם המוצר מומלץ
  isFeatured: yup
    .boolean()
    .optional()
    .default(false),

  // האם המוצר רב-מכר
  isBestSeller: yup
    .boolean()
    .optional()
    .default(false),

  // תגיות קידום מותאמות אישית
  promotionTags: yup
    .array()
    .of(
      yup
        .string()
        .min(2, 'תגית קידום חייבת להכיל לפחות 2 תווים')
        .max(30, 'תגית קידום לא יכולה להכיל יותר מ-30 תווים')
        .trim()
    )
    .optional()
    .max(5, 'לא ניתן להוסיף יותר מ-5 תגיות קידום')
    .default([]),

  // ============================================================================
  // 🆕 Color Family Images - תמונות לפי משפחת צבע
  // ============================================================================
  /**
   * מפה של תמונות לפי משפחת צבע.
   * כל SKU עם colorFamily מסוים "יורש" את התמונות של המשפחה.
   * המפתחות הם שמות משפחות הצבע: red, blue, green וכו'
   * הערך הוא מערך תמונות לכל משפחה.
   */
  colorFamilyImages: yup
    .object()
    .optional()
    .default({}),

  // ============================================================================
  // 🆕 Color Images - תמונות לפי צבע ספציפי
  // ============================================================================
  /**
   * מפה של תמונות לפי צבע ספציפי.
   * עדיפות על colorFamilyImages - מאפשר תמונות שונות לכל גוון צבע.
   * המפתחות הם שמות צבעים ספציפיים ("כחול נייבי", "אדום יין" וכו').
   */
  colorImages: yup
    .object()
    .optional()
    .default({}),
}).required();

// ==========================================
// TypeScript Types (מבוסס על schemas)
// ==========================================

/**
 * טיפוס TypeScript למוצר (מבוסס על productSchema)
 */
export type ProductFormData = yup.InferType<typeof productSchema>;

/**
 * טיפוס TypeScript ל-SKU (מבוסס על skuSchema)
 */
// הרחבת הטיפוס - attributes מוגדר כ-Record<string, any> עבור מאפיינים דינמיים כמו size
export type SKUFormData = Omit<yup.InferType<typeof skuSchema>, 'attributes'> & {
  attributes?: Record<string, any>;
};

// ==========================================
// Validation Helpers - פונקציות עזר
// ==========================================

/**
 * בדיקת ייחודיות של קוד SKU
 * פונקציה זו תקרא מהטופס לבדיקה מול השרת
 * 
 * @param sku - קוד SKU לבדיקה
 * @param existingSKUs - רשימת SKUs קיימים בטופס (למניעת כפילויות פנימיות)
 * @returns true אם SKU ייחודי, false אחרת
 */
export const validateSKUUniqueness = (
  sku: string,
  existingSKUs: string[]
): boolean => {
  const normalizedSKU = sku.trim().toUpperCase();
  const normalizedExisting = existingSKUs.map((s) => s.trim().toUpperCase());
  
  return !normalizedExisting.includes(normalizedSKU);
};

/**
 * חישוב אחוז הנחה
 * 
 * @param basePrice - מחיר בסיס
 * @param compareAtPrice - מחיר להשוואה
 * @returns אחוז הנחה (0-100) או null אם לא רלוונטי
 */
export const calculateDiscountPercentage = (
  basePrice: number,
  compareAtPrice: number | null | undefined
): number | null => {
  if (!compareAtPrice || compareAtPrice <= basePrice) {
    return null;
  }

  const discount = ((compareAtPrice - basePrice) / compareAtPrice) * 100;
  return Math.round(discount);
};

/**
 * ולידציה מותאמת אישית לטופס מוצר
 * מאפשרת ולידציה דינמית בזמן אמת
 * 
 * @param data - נתוני טופס
 * @returns אובייקט שגיאות או null אם הכל תקין
 */
export const validateProductForm = async (
  data: Partial<ProductFormData>
): Promise<{ [key: string]: string } | null> => {
  try {
    await productSchema.validate(data, { abortEarly: false });
    return null; // אין שגיאות
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const errors: { [key: string]: string } = {};
      
      error.inner.forEach((err) => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
      
      return errors;
    }
    
    return null;
  }
};

// ==========================================
// Default Values - ערכי ברירת מחדל
// ==========================================

/**
 * ערכי ברירת מחדל למוצר חדש
 */
export const defaultProductValues: Partial<ProductFormData> = {
  name: '',
  subtitle: '', // שם משני אופציונלי
  description: '',
  brand: null,
  basePrice: 0,
  compareAtPrice: null,
  categoryId: null,
  additionalCategoryIds: [],
  images: [],
  tags: [],
  isActive: true,
  sku: '',
  stockQuantity: 0,
  trackInventory: true,
  lowStockThreshold: null,
  skus: [],
  specifications: [], // מפרט טכני - ברירת מחדל ריקה
  secondaryVariantAttribute: null, // 🆕 ציר וריאנט משני - ברירת מחדל null
  hasVariants: false, // 🆕 ברירת מחדל: מוצר פשוט
  // 🆕 SEO Fields
  seoTitle: null,
  seoDescription: null,
  slug: null,
  // 🆕 Marketing Fields
  isNew: false,
  isFeatured: false,
  isBestSeller: false,
  promotionTags: [],
  // 🆕 Color Family Images - תמונות לפי משפחת צבע
  colorFamilyImages: {},
};

/**
 * ערכי ברירת מחדל ל-SKU חדש
 */
export const defaultSKUValues: Partial<SKUFormData> = {
  sku: '',
  name: '',
  price: null,
  compareAtPrice: null,
  stockQuantity: 0,
  color: '',
  attributes: {},
  colorFamilySource: 'auto',
  images: [],
  isActive: true,
};
