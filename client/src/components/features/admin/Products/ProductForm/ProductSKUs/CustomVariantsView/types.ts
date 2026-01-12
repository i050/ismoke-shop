/**
 * Shared Types for CustomVariantsView Components
 * ===============================================
 * טיפוסים משותפים לכל הקומפוננטות בתצוגת וריאנטים מותאמים אישית
 * 
 * 🆕 Phase 3: מערכת וריאנטים כפולה
 */

/**
 * קבוצת וריאנט ראשי
 * לדוגמה: "תפוח" עם תת-וריאנטים "3mg", "6mg", "9mg"
 */
export interface VariantGroup {
  /** שם הוריאנט הראשי (לדוגמה: "תפוח", "ענבים") */
  variantName: string;
  /** תת-וריאנטים (SKUs) בתוך הקבוצה */
  skus: VariantSku[];
  /** האם הקבוצה מורחבת בתצוגה */
  isExpanded?: boolean;
}

/**
 * SKU בתוך קבוצת וריאנט
 */
export interface VariantSku {
  /** קוד SKU ייחודי */
  sku: string;
  /** שם ה-SKU */
  name: string;
  /** שם הוריאנט הראשי */
  variantName: string;
  /** שם התת-וריאנט (אופציונלי) */
  subVariantName?: string;
  /** מחיר (null = מחיר בסיס) */
  price: number | null;
  /** כמות במלאי */
  stockQuantity: number;
  /** תמונות */
  images: any[];
  /** האם פעיל */
  isActive: boolean;
  /** מאפיינים דינמיים לסינון */
  attributes?: Record<string, any>;
}

/**
 * נתונים להוספת וריאנט חדש
 * 🆕 Phase 7: תמיכה בשני מצבים - חופשי ומקושר
 * 
 * שם הוריאנט (primaryVariantLabel) מוגדר מראש ב-CustomVariantsView
 * במודאל רק בוחרים ערכים
 */
export interface NewVariantData {
  /** מצב הזנה: חופשי (free) או מקושר (linked) */
  mode: 'free' | 'linked';
  
  /** מחיר בסיס - deprecated */
  basePrice: number;
  /** כמות התחלתית - deprecated */
  initialQuantity: number;
  
  // Free mode:
  /** רשימת ערכי וריאנטים (במצב חופשי) */
  variants?: string[];
  
  /** 🆕 פרטי מלאי ומחיר לכל וריאנט */
  variantDetails?: Record<string, { stock: number; price: number }>;
  
  // Linked mode:
  /** מאפיין סינון מקושר (ראשי) */
  linkedAttribute?: string;
  /** ערכים נבחרים מהמאפיין הראשי */
  // variants מכיל את הערכים גם במצב linked
  
  /** מאפיין סינון משני (אופציונלי) */
  linkedSecondaryAttribute?: string;
  /** ערכים נבחרים מהמאפיין המשני */
  secondaryVariants?: string[];
}

/**
 * הגדרות תצוגה ותוויות
 */
export interface VariantLabels {
  /** תווית הוריאנט הראשי (לדוגמה: "טעם") */
  primaryLabel: string;
  /** תווית התת-וריאנט (לדוגמה: "ניקוטין") */
  secondaryLabel?: string;
}

/**
 * הגדרות קישור לסינון
 */
export interface FilterLinkConfig {
  /** מפתח מאפיין סינון ראשי */
  primaryFilterAttribute?: string;
  /** מפתח מאפיין סינון משני */
  secondaryFilterAttribute?: string;
}
