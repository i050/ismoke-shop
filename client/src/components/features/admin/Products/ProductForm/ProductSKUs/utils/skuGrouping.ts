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
 * מיפוי משפחות צבע ל-HEX ברירת מחדל ושמות עבריים
 * משמש כגיבוי כשאין colorHex או color במסד הנתונים
 */
const COLOR_FAMILY_DEFAULTS: Record<string, { hex: string; name: string }> = {
  red: { hex: '#FF0000', name: 'אדום' },
  blue: { hex: '#0000FF', name: 'כחול' },
  green: { hex: '#00FF00', name: 'ירוק' },
  yellow: { hex: '#FFFF00', name: 'צהוב' },
  orange: { hex: '#FFA500', name: 'כתום' },
  purple: { hex: '#800080', name: 'סגול' },
  pink: { hex: '#FFC0CB', name: 'ורוד' },
  brown: { hex: '#8B4513', name: 'חום' },
  gray: { hex: '#808080', name: 'אפור' },
  grey: { hex: '#808080', name: 'אפור' },
  black: { hex: '#000000', name: 'שחור' },
  white: { hex: '#FFFFFF', name: 'לבן' },
  beige: { hex: '#F5F5DC', name: 'בז\'' },
  navy: { hex: '#000080', name: 'כחול כהה' },
  teal: { hex: '#008080', name: 'טורקיז' },
  gold: { hex: '#FFD700', name: 'זהב' },
  silver: { hex: '#C0C0C0', name: 'כסף' },
};

/**
 * יצירת colorHex ברירת מחדל על בסיס colorFamily או colorName
 */
const generateDefaultColorHex = (colorName?: string, colorFamily?: string): string | undefined => {
  // 1. אם colorFamily קיים במילון - השתמש בו
  if (colorFamily && COLOR_FAMILY_DEFAULTS[colorFamily.toLowerCase()]) {
    return COLOR_FAMILY_DEFAULTS[colorFamily.toLowerCase()].hex;
  }
  
  // 2. אם colorName הוא hex - השתמש בו
  if (colorName && isHexColor(colorName)) {
    return colorName.startsWith('#') ? colorName : `#${colorName}`;
  }
  
  // 3. נסה לזהות משפחת צבע משם הצבע (אפור אדום -> gray)
  if (colorName) {
    const nameLower = colorName.toLowerCase();
    for (const [family, defaults] of Object.entries(COLOR_FAMILY_DEFAULTS)) {
      if (nameLower.includes(family)) {
        return defaults.hex;
      }
    }
  }
  
  // 4. ברירת מחדל - אפור
  return '#808080';
};

/**
 * יצירת שם צבע ברירת מחדל על בסיס colorFamily
 * @param colorFamily - משפחת הצבע (red, blue וכו')
 * @param existingName - שם קיים (אם יש) - תמיד נעדיף אותו
 * @returns שם הצבע בעברית
 */
export const generateDefaultColorName = (colorFamily?: string, existingName?: string): string => {
  // 1. אם יש שם קיים - השתמש בו
  if (existingName && existingName.trim()) {
    return existingName.trim();
  }
  
  // 2. אם colorFamily קיים במילון - השתמש בשם העברי
  if (colorFamily && COLOR_FAMILY_DEFAULTS[colorFamily.toLowerCase()]) {
    return COLOR_FAMILY_DEFAULTS[colorFamily.toLowerCase()].name;
  }
  
  // 3. ברירת מחדל
  return 'צבע';
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
 * @param attributeKey - 🆕 מפתח המאפיין המשני (size/htngdvt_slylym/nicotine וכו')
 * @returns מערך של קבוצות צבע
 * 
 * @example
 * const groups = groupSkusByColor(skus, 'htngdvt_slylym');
 * // groups[0] = { colorName: 'אדום', sizes: [{size: '0.5Ω'}, {size: '1.0Ω'}], totalStock: 50 }
 */
export function groupSkusByColor(skus: SKUFormData[], attributeKey: string = 'size'): ColorGroup[] {
  // מפה לאיסוף קבוצות
  const grouped = new Map<string, ColorGroup>();
  
  for (const sku of skus) {
    // מפתח הקיבוץ - צבע מנורמל או 'default' אם אין
    const colorKey = normalizeColorKey(sku.color ?? undefined);
    
    // 🆕 יצירת שם צבע אוטומטי אם לא קיים
    const colorName = sku.color?.trim() 
      || generateDefaultColorName(sku.colorFamily ?? undefined, undefined)
      || 'ללא צבע';
    
    // אם זו קבוצה חדשה - צור אותה
    if (!grouped.has(colorKey)) {
      // 🔧 FIX: יצירת colorHex ברירת מחדל אם אין
      const defaultHex = sku.colorHex 
        || (isHexColor(colorName) ? colorName : undefined)
        || generateDefaultColorHex(colorName, sku.colorFamily ?? undefined);
      
      grouped.set(colorKey, {
        colorKey,
        colorName, // 🆕 עכשיו יכול להיות שם אוטומטי
        colorHex: defaultHex, // 🆕 תמיד יש colorHex
        colorFamily: sku.colorFamily || undefined, // 🆕 שמירת משפחת הצבע מה-SKU (המרת null ל-undefined)
        // תמונות מה-SKU הראשון - העתקה עמוקה למניעת mutation
        images: sku.images ? sku.images.map(img => ({ ...img })) : [],
        colorPrice: null,
        sizes: [],
        totalStock: 0,
        isExpanded: false,
      });
    }
    
    const group = grouped.get(colorKey)!;
    
    // 🔧 FIX: עדכון colorHex ו-colorFamily אם SKU יש לו ערכים טובים יותר
    // במקרה שה-SKU הראשון היה ללא colorHex אבל SKU מאוחר יותר יש לו
    if (sku.colorHex && sku.colorHex !== '#808080') {
      // אם ל-SKU יש colorHex שאינו ברירת המחדל - עדכן
      group.colorHex = sku.colorHex;
    }
    if (!group.colorFamily && sku.colorFamily) {
      group.colorFamily = sku.colorFamily;
    }
    
    // 🆕 עדכון שם הצבע אם SKU יש שם ממשי (לא אוטומטי)
    if (sku.color && sku.color.trim()) {
      group.colorName = sku.color.trim();
    }
    
    // 🆕 קריאת הערך מתוך attributes לפי המפתח הדינמי
    const variantValue = sku.attributes?.[attributeKey] || sku.attributes?.size || '';
    
    // הוספת מידה לקבוצה
    group.sizes.push({
      size: variantValue,
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
      // 🆕 attributes - כבר מכיל את המפתח הנכון (size/resistance/nicotine וכו')
      // לא צריך לדרוס - פשוט נשתמש במה שכבר שמור
      const attributes = { ...size.attributes };
      
      skus.push({
        sku: size.sku,
        name: size.name,
        price: size.price,
        stockQuantity: size.stockQuantity,
        // צבע - אם 'ללא צבע' אז ריק
        color: group.colorName === 'ללא צבע' ? '' : group.colorName,
        // 🆕 קוד HEX של הצבע (לתצוגה בכפתורי הצבע בלקוח)
        colorHex: group.colorHex,
        // ✅ שימור colorFamily מה-group (אם קיים) במקום לדרוס ל-undefined
        // כך המנהל יכול לבחור משפחת צבע מפורשת שתישמר ב-DB
        colorFamily: group.colorFamily,
        // אם יש colorFamily מפורש - זה manual, אחרת auto
        colorFamilySource: group.colorFamily ? 'manual' : 'auto',
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
 * @param size - שם המידה/ערך הוריאנט
 * @param skuCode - קוד SKU ייחודי
 * @param options - אפשרויות נוספות (basePrice, initialQuantity, attributeKey)
 * @returns קבוצה מעודכנת (immutable)
 */
export function addSizeToColorGroup(
  group: ColorGroup,
  size: string,
  skuCode: string,
  options: {
    basePrice?: number | null;
    initialQuantity?: number;
    attributeKey?: string; // 🆕 מפתח המאפיין (size/resistance/nicotine וכו')
  } = {}
): ColorGroup {
  const { basePrice = null, initialQuantity = 0, attributeKey = 'size' } = options;
  
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
        attributes: { [attributeKey]: size }, // 🆕 שימוש ב-attributeKey דינמי
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
    attributeKey?: string; // 🆕 מפתח המאפיין (size/resistance/nicotine וכו')
  } = {}
): ColorGroup {
  const { colorHex, basePrice = null, initialQuantity = 0, colorFamily, attributeKey = 'size' } = options;
  
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
  
  const colorKey = normalizeColorKey(colorName || generateDefaultColorName(colorFamily));
  
  // 🆕 יצירת שם צבע - אם לא סופק, יווצר אוטומטית על בסיס colorFamily
  const finalColorName = colorName && colorName.trim()
    ? colorName.trim()
    : generateDefaultColorName(colorFamily, undefined);
  
  // 🆕 יצירת colorHex - אם לא סופק, יווצר אוטומטית על בסיס colorFamily
  const finalColorHex = colorHex 
    || (isHexColor(finalColorName) ? finalColorName : undefined)
    || generateDefaultColorHex(finalColorName, colorFamily);
  
  // 🆕 אם אין מידות - יוצר SKU אחד לצבע בלבד
  if (defaultSizes.length === 0) {
    const skuCode = `${skuPrefix}-${String(nextNumber).padStart(3, '0')}`;
    return {
      colorKey,
      colorName: finalColorName, // 🆕 שם אוטומטי אם לא סופק
      colorHex: finalColorHex,
      colorFamily,
      images: [],
      colorPrice: basePrice,
      sizes: [{
        size: '', // אין מידה
        sku: skuCode,
        name: finalColorName, // 🆕 שם אוטומטי
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
    colorName: finalColorName, // 🆕 שם אוטומטי אם לא סופק
    colorHex: finalColorHex,
    colorFamily,
    images: [],
    colorPrice: basePrice,
    sizes: defaultSizes.map(size => {
      const skuCode = `${skuPrefix}-${String(nextNumber++).padStart(3, '0')}`;
      return {
        size,
        sku: skuCode,
        name: `${finalColorName} - ${size}`, // 🆕 שימוש בשם האוטומטי
        stockQuantity: initialQuantity,
        price: basePrice,
        isActive: true,
        attributes: { [attributeKey]: size }, // 🆕 שימוש ב-attributeKey דינמי
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
