/**
 * Shared Types for ColorGroupedView Components
 * =============================================
 * טיפוסים משותפים לכל הקומפוננטות בתצוגת הצבעים
 */

/**
 * הגדרת סוג הוריאנט המשני (מידה/התנגדות/ניקוטין וכו')
 * הציר הראשי תמיד צבע, הציר המשני נבחר מתוך מאפייני הסינון
 */
export interface SecondaryVariantConfig {
  /** מפתח המאפיין (size, resistance, nicotine וכו') */
  attributeKey: string;
  /** שם המאפיין בעברית */
  attributeName: string;
  /** ערכים אפשריים */
  values: Array<{ value: string; displayName?: string }>;
}

/**
 * נתונים להוספת צבע חדש
 */
export interface NewColorData {
  colorName: string;
  colorHex: string;
  colorFamily?: string;
  selectedSizes: string[];
  initialQuantity: number;
  basePrice: number;
}
