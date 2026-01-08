/**
 * פונקציות Transformation לקיבוץ SKUs לפי צבע
 * ================================
 * 
 * שכבת לוגיקה בלבד (לא משנה DB!) - ממירה בין:
 * - SKUFormData[] (שטוח - מבנה נתונים אמיתי)
 * - ColorGroup[] (מקובץ - לתצוגה בלבד)
 * 
 * זרימה:
 * 1. groupSkusByColor(skus) → קבוצות צבע לתצוגה
 * 2. (עריכות UI)
 * 3. flattenColorGroups(groups) → SKUs שטוחים לשמירה
 */

import type { SKUFormData } from '@/schemas/productFormSchema';

// ============================================================================
// Types - מבני נתונים לקבוצות צבע
// ============================================================================

/**
 * מידה בודדת בתוך קבוצת צבע
 */
export interface ColorSizeEntry {
  /** מידה (S, M, L, XL...) */
  size: string;
  /** קוד SKU ייחודי */
  sku: string;
  /** שם תצוגה */
  name: string;
  /** כמות במלאי */
  stockQuantity: number;
  /** מחיר ספציפי (או null לשימוש ב-basePrice) */
  price: number | null;
  /** האם פעיל */
  isActive: boolean;
  /** מאפיינים נוספים */
  attributes: Record<string, any>;
}

/**
 * קבוצת צבע - מייצגת כל המידות של צבע מסוים
 */
export interface ColorGroup {
  /** מפתח ייחודי לצבע (lowercase, normalized) */
  colorKey: string;
  /** שם הצבע לתצוגה */
  colorName: string;
  /** קוד HEX (אם הצבע הוא hex) */
  colorHex?: string;
  /** משפחת צבע */
  colorFamily?: string;
  /** תמונות משותפות לכל המידות בצבע זה */
  images: SKUFormData['images'];
  /** מחיר ברמת צבע (אופציונלי - override לכל המידות) */
  colorPrice?: number | null;
  /** רשימת המידות והכמויות */
  sizes: ColorSizeEntry[];
  /** סה"כ מלאי לצבע זה */
  totalStock: number;
  /** האם הפאנל פתוח (UI state) */
  isExpanded?: boolean;
}

// ============================================================================
// Helper Functions - פונקציות עזר
// ============================================================================

/**
 * בדיקה האם מחרוזת היא קוד HEX תקין
 * @param str - מחרוזת לבדיקה
 * @returns true אם זה קוד HEX
 */
const isHexColor = (str: string): boolean => {
  if (!str) return false;
  const hex = str.startsWith('#') ? str : `#${str}`;
  return /^#[0-9A-Fa-f]{6}$/.test(hex) || /^#[0-9A-Fa-f]{3}$/.test(hex);
};

/**
 * נרמול שם צבע למפתח ייחודי
 * @param color - שם/קוד צבע
 * @returns מפתח מנורמל
 */
const normalizeColorKey = (color: string | undefined): string => {
  if (!color || !color.trim()) return 'default';
  return color.trim().toLowerCase().replace(/\s+/g, '-');
};

// ============================================================================
// Main Functions - פונקציות עיקריות
// ============================================================================

/**
 * קיבוץ SKUs שטוחים לפי צבע (לתצוגה בלבד)
 * 
 * @param skus - מערך SKUs שטוח
 * @returns מערך של קבוצות צבע
 * 
 * @example
 * const groups = groupSkusByColor(skus);
 * // groups[0] = { colorName: 'אדום', sizes: [{size: 'M'}, {size: 'L'}], totalStock: 50 }
 */
export function groupSkusByColor(skus: SKUFormData[]): ColorGroup[] {
  // מפה לאיסוף קבוצות
  const grouped = new Map<string, ColorGroup>();
  
  for (const sku of skus) {
    // מפתח הקיבוץ - צבע מנורמל או 'default' אם אין
    const colorKey = normalizeColorKey(sku.color ?? undefined);
    const colorName = sku.color?.trim() || 'ללא צבע';
    
    // אם זו קבוצה חדשה - צור אותה
    if (!grouped.has(colorKey)) {
      grouped.set(colorKey, {
        colorKey,
        colorName,
        colorHex: isHexColor(colorName) ? colorName : undefined,
        // תמונות מה-SKU הראשון - העתקה עמוקה למניעת mutation
        images: sku.images ? sku.images.map(img => ({ ...img })) : [],
        colorPrice: null,
        sizes: [],
        totalStock: 0,
        isExpanded: false,
      });
    }
    
    const group = grouped.get(colorKey)!;
    
    // הוספת מידה לקבוצה
    group.sizes.push({
      size: sku.attributes?.size || '',
      sku: sku.sku,
      name: sku.name,
      stockQuantity: sku.stockQuantity,
      price: sku.price ?? null,
      isActive: sku.isActive ?? true,
      attributes: sku.attributes ? { ...sku.attributes } : {},
    });
    
    // עדכון סה"כ מלאי
    group.totalStock += sku.stockQuantity || 0;
  }
  
  // המרה למערך ומיון לפי שם צבע (ללא צבע בסוף)
  return Array.from(grouped.values()).sort((a, b) => {
    if (a.colorKey === 'default') return 1;
    if (b.colorKey === 'default') return -1;
    return a.colorName.localeCompare(b.colorName, 'he');
  });
}

/**
 * המרת קבוצות צבע חזרה ל-SKUs שטוחים (לשמירה)
 * 🆕 תמיכה ב-SKUs ללא מידה (size ריק)
 * 
 * @param colorGroups - מערך קבוצות צבע
 * @returns מערך SKUs שטוח
 * 
 * @example
 * const skus = flattenColorGroups(groups);
 * // skus = [{sku: 'RED-M', color: 'אדום', ...}, ...]
 */
export function flattenColorGroups(colorGroups: ColorGroup[]): SKUFormData[] {
  const skus: SKUFormData[] = [];
  
  for (const group of colorGroups) {
    for (const size of group.sizes) {
      // 🆕 attributes - רק אם יש מידה אמיתית
      const attributes = size.size 
        ? { ...size.attributes, size: size.size }
        : { ...size.attributes }; // בלי size אם ריק
      
      skus.push({
        sku: size.sku,
        name: size.name,
        price: size.price,
        stockQuantity: size.stockQuantity,
        // צבע - אם 'ללא צבע' אז ריק
        color: group.colorName === 'ללא צבע' ? '' : group.colorName,
        colorFamily: undefined, // יחושב בשרת אוטומטית
        colorFamilySource: 'auto',
        // תמונות משותפות לצבע - העתקה עמוקה
        images: group.images ? group.images.map(img => ({ ...img })) : [],
        isActive: size.isActive,
        attributes,
      });
    }
  }
  
  return skus;
}

/**
 * הוספת מידה חדשה לקבוצת צבע קיימת
 * 
 * @param group - קבוצת הצבע
 * @param size - שם המידה
 * @param skuCode - קוד SKU ייחודי
 * @param options - אפשרויות נוספות (basePrice, initialQuantity)
 * @returns קבוצה מעודכנת (immutable)
 */
export function addSizeToColorGroup(
  group: ColorGroup,
  size: string,
  skuCode: string,
  options: {
    basePrice?: number | null;
    initialQuantity?: number;
  } = {}
): ColorGroup {
  const { basePrice = null, initialQuantity = 0 } = options;
  
  return {
    ...group,
    sizes: [
      ...group.sizes,
      {
        size,
        sku: skuCode,
        name: `${group.colorName} - ${size}`,
        stockQuantity: initialQuantity,
        price: basePrice,
        isActive: true,
        attributes: { size },
      },
    ],
    // עדכון סה"כ מלאי
    totalStock: group.totalStock + initialQuantity,
  };
}

/**
 * מחיקת מידה מקבוצת צבע
 * 
 * @param group - קבוצת הצבע
 * @param sizeIndex - אינדקס המידה למחיקה
 * @returns קבוצה מעודכנת (immutable)
 */
export function removeSizeFromColorGroup(
  group: ColorGroup,
  sizeIndex: number
): ColorGroup {
  const removedStock = group.sizes[sizeIndex]?.stockQuantity || 0;
  return {
    ...group,
    sizes: group.sizes.filter((_, i) => i !== sizeIndex),
    totalStock: group.totalStock - removedStock,
  };
}

/**
 * עדכון שדה במידה ספציפית
 * 
 * @param group - קבוצת הצבע
 * @param sizeIndex - אינדקס המידה
 * @param field - שם השדה לעדכון
 * @param value - ערך חדש
 * @returns קבוצה מעודכנת (immutable)
 */
export function updateSizeInColorGroup(
  group: ColorGroup,
  sizeIndex: number,
  field: keyof ColorSizeEntry,
  value: any
): ColorGroup {
  const oldSize = group.sizes[sizeIndex];
  if (!oldSize) return group;
  
  const newSizes = [...group.sizes];
  newSizes[sizeIndex] = { ...oldSize, [field]: value };
  
  // אם עדכנו מלאי, חשב מחדש את הסה"כ
  let newTotalStock = group.totalStock;
  if (field === 'stockQuantity') {
    newTotalStock = newSizes.reduce((sum, s) => sum + (s.stockQuantity || 0), 0);
  }
  
  return {
    ...group,
    sizes: newSizes,
    totalStock: newTotalStock,
  };
}

/**
 * יצירת קבוצת צבע חדשה עם מידות ברירת מחדל
 * 🆕 תמיכה במקרה ללא מידות (defaultSizes ריק) - יוצר SKU אחד לצבע בלבד
 * 
 * @param colorName - שם הצבע
 * @param defaultSizes - רשימת מידות ברירת מחדל (מערך ריק = SKU אחד בלי מידה)
 * @param skuPrefix - prefix לקודי SKU
 * @param existingSkus - SKUs קיימים (לחישוב מספר שוטף)
 * @param options - אפשרויות נוספות (colorHex, basePrice, initialQuantity, colorFamily)
 * @returns קבוצת צבע חדשה
 */
export function createNewColorGroup(
  colorName: string,
  defaultSizes: string[],
  skuPrefix: string,
  existingSkus: SKUFormData[],
  options: {
    colorHex?: string;
    basePrice?: number;
    initialQuantity?: number;
    colorFamily?: string;
  } = {}
): ColorGroup {
  const { colorHex, basePrice = null, initialQuantity = 0, colorFamily } = options;
  
  // חישוב מספר השוטף הבא מכל ה-SKUs הקיימים
  const existingNumbers = existingSkus
    .map(s => {
      const match = s.sku.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n) && n > 0);
  
  let nextNumber = existingNumbers.length > 0 
    ? Math.max(...existingNumbers) + 1 
    : 1;
  
  const colorKey = normalizeColorKey(colorName);
  
  // 🆕 אם אין מידות - יוצר SKU אחד לצבע בלבד
  if (defaultSizes.length === 0) {
    const skuCode = `${skuPrefix}-${String(nextNumber).padStart(3, '0')}`;
    return {
      colorKey,
      colorName,
      colorHex: colorHex || (isHexColor(colorName) ? colorName : undefined),
      colorFamily,
      images: [],
      colorPrice: basePrice,
      sizes: [{
        size: '', // אין מידה
        sku: skuCode,
        name: colorName, // רק שם הצבע
        stockQuantity: initialQuantity,
        price: basePrice,
        isActive: true,
        attributes: {}, // אין attributes
      }],
      totalStock: initialQuantity,
      isExpanded: true,
    };
  }
  
  // מקרה רגיל - עם מידות
  return {
    colorKey,
    colorName,
    colorHex: colorHex || (isHexColor(colorName) ? colorName : undefined),
    colorFamily,
    images: [],
    colorPrice: basePrice,
    sizes: defaultSizes.map(size => {
      const skuCode = `${skuPrefix}-${String(nextNumber++).padStart(3, '0')}`;
      return {
        size,
        sku: skuCode,
        name: `${colorName} - ${size}`,
        stockQuantity: initialQuantity,
        price: basePrice,
        isActive: true,
        attributes: { size },
      };
    }),
    totalStock: initialQuantity * defaultSizes.length,
    isExpanded: true, // צבע חדש נפתח אוטומטית
  };
}

/**
 * מילוי כמות אחידה לכל המידות בקבוצת צבע
 * 
 * @param group - קבוצת הצבע
 * @param quantity - כמות למילוי
 * @returns קבוצה מעודכנת (immutable)
 */
export function fillAllSizesInColorGroup(
  group: ColorGroup,
  quantity: number
): ColorGroup {
  const newSizes = group.sizes.map(size => ({
    ...size,
    stockQuantity: quantity,
  }));
  
  return {
    ...group,
    sizes: newSizes,
    totalStock: quantity * newSizes.length,
  };
}

/**
 * עדכון תמונות של קבוצת צבע
 * 
 * @param group - קבוצת הצבע
 * @param images - תמונות חדשות
 * @returns קבוצה מעודכנת (immutable)
 */
export function updateColorGroupImages(
  group: ColorGroup,
  images: SKUFormData['images']
): ColorGroup {
  return {
    ...group,
    images: images ? images.map(img => ({ ...img })) : [],
  };
}

/**
 * חישוב סטטיסטיקות סיכום לכל הקבוצות
 * 
 * @param colorGroups - מערך קבוצות צבע
 * @returns אובייקט סטטיסטיקות
 */
export function calculateColorGroupsStats(colorGroups: ColorGroup[]): {
  totalColors: number;
  totalSizes: number;
  totalStock: number;
} {
  return {
    totalColors: colorGroups.length,
    totalSizes: colorGroups.reduce((sum, g) => sum + g.sizes.length, 0),
    totalStock: colorGroups.reduce((sum, g) => sum + g.totalStock, 0),
  };
}
