/**
 * Utility להמרת קוד HEX לשם צבע בעברית
 * משתמש בספריית ntcjs לזיהוי שם הצבע באנגלית
 * ומתרגם לעברית באמצעות מילון מותאם אישית
 */

import ntc from '@trihargianto/ntcjs';
import { translateColorName, colorNamesHebrew } from './colorNames';
import { AVAILABLE_COLORS, isHexColor } from './colorConstants';
import type { ColorFamily } from '../services/filterAttributeService';

/**
 * מפת צבעים - שמות עברית/אנגלית ל-HEX
 * משמש להמרה הפוכה: משם צבע לקוד HEX
 */
const COLOR_NAME_TO_HEX_MAP: { [key: string]: string } = {
  // עברית
  'שחור': '#1a1a1a',
  'כחול': '#007bff',
  'אדום': '#dc3545',
  'ירוק': '#28a745',
  'צהוב': '#ffc107',
  'סגול': '#6f42c1',
  'כתום': '#fd7e14',
  'ורוד': '#e83e8c',
  'חום': '#795548',
  'אפור': '#6c757d',
  'לבן': '#f8f9fa',
  'זהב': '#ffd700',
  'כסף': '#c0c0c0',
  'טורקיז': '#17a2b8',
  
  // אנגלית (fallback)
  'black': '#1a1a1a',
  'blue': '#007bff',
  'red': '#dc3545',
  'green': '#28a745',
  'yellow': '#ffc107',
  'purple': '#6f42c1',
  'orange': '#fd7e14',
  'pink': '#e83e8c',
  'brown': '#795548',
  'gray': '#6c757d',
  'grey': '#6c757d',
  'white': '#f8f9fa',
  'gold': '#ffd700',
  'silver': '#c0c0c0',
  'turquoise': '#17a2b8',
};

/**
 * ממיר קוד HEX לשם צבע בעברית
 * @param hexColor - קוד צבע בפורמט HEX (עם או בלי #)
 * @returns אובייקט עם שם הצבע בעברית ובאנגלית
 * @example
 * getColorName('#FF0000') // { hebrew: 'אדום', english: 'Red', exactMatch: true }
 * getColorName('#FF5733') // { hebrew: 'כתום', english: 'Orange', exactMatch: false }
 */
export const getColorName = (hexColor: string | null | undefined): {
  hebrew: string;
  english: string;
  exactMatch: boolean;
} => {
  // ברירת מחדל אם אין צבע
  if (!hexColor) {
    return {
      hebrew: 'ללא צבע',
      english: 'No color',
      exactMatch: true
    };
  }

  try {
    // וידוא שיש # בתחילת הקוד
    const normalizedHex = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
    
    // בדיקה מהירה ברשימת צבעים זמינים (מגדיר אפשרויות קצרות/ידניות)
    const found = AVAILABLE_COLORS.find(c => c.hex.toLowerCase() === normalizedHex.toLowerCase());
    if (found) {
      return {
        hebrew: found.name,
        english: found.name,
        exactMatch: true,
      };
    }

    // קריאה לספריית ntcjs לזיהוי שם הצבע באנגלית
    const result = ntc.name(normalizedHex);

    // מבנה החזרה תלוי בגרסה, אך הראשון הוא HEX קרוב והשני שם הצבע
    const englishName = result[1] ?? result[0];
    const exactMatch = (result[0] ?? '').toLowerCase() === normalizedHex.toLowerCase();

    // תרגום לעברית
    const hebrewName = translateColorName(englishName);

    // ניסיון אחרון: אם אין תרגום מלא, נסו למצוא מילה בסיסית במחרוזת האנגלית
    let displayName = hebrewName;
    if (hebrewName === englishName) {
      // חפש מילת בסיס מהמילון שלנו
      const lower = englishName.toLowerCase();
      const tokens = lower.split(/[^a-z]+/);
      for (const token of tokens) {
        if (token && colorNamesHebrew[token]) {
          displayName = colorNamesHebrew[token];
          break;
        }
      }
    }

    // אם עדיין אין תרגום ידידותי - נחזיר את ה-HEX (עדיף על אנגלית לא מתורגמת בממשק בעברית)
    if (!displayName || displayName === englishName) {
      displayName = englishName || normalizedHex;
    }

    return {
      hebrew: displayName,
      english: englishName,
      exactMatch: Boolean(exactMatch),
    };
  } catch (error) {
    console.error('שגיאה בזיהוי שם צבע:', error);
    return {
      hebrew: hexColor,
      english: hexColor,
      exactMatch: false
    };
  }
};

/**
 * מחזיר רק את השם בעברית (פונקציה מקוצרת)
 * @param hexColor - קוד צבע בפורמט HEX
 * @returns שם הצבע בעברית
 */
export const getColorNameHebrew = (hexColor: string | null | undefined): string => {
  return getColorName(hexColor).hebrew;
};

/**
 * ממיר שם צבע (עברית/אנגלית) או קוד HEX לקוד HEX מנורמל
 * תומך גם בצבעים מורכבים (צבע1-צבע2, צבע1 צבע2)
 * 
 * @param colorValue - שם הצבע (עברית/אנגלית) או קוד HEX
 * @returns קוד HEX של הצבע (אם זיהה), אחרת מחזיר את הקלט כמו שהוא
 * 
 * @example
 * getColorCode('אדום') // '#DC3545'
 * getColorCode('#FF0000') // '#FF0000'
 * getColorCode('אדום-כהה') // '#DC3545' (לוקח את הראשון)
 * getColorCode('unknown') // 'unknown' (לא מזוהה)
 */
export function getColorCode(colorValue: string | null | undefined): string {
  if (!colorValue) return '#999999'; // ברירת מחדל אפור

  const trimmed = colorValue.trim();

  // אם זה כבר HEX תקין, החזר מנורמל
  if (isHexColor(trimmed)) {
    return trimmed.toUpperCase();
  }

  // נרמול: לאותיות קטנות והסרת רווחים מיותרים
  const normalized = trimmed.toLowerCase();

  // בדיקה ישירה במפה
  if (COLOR_NAME_TO_HEX_MAP[normalized]) {
    return COLOR_NAME_TO_HEX_MAP[normalized].toUpperCase();
  }

  // אם הצבע מכיל מקף (צבע מורכב), קח את הצבע הראשון
  if (normalized.includes('-')) {
    const firstColor = normalized.split('-')[0].trim();
    if (COLOR_NAME_TO_HEX_MAP[firstColor]) {
      return COLOR_NAME_TO_HEX_MAP[firstColor].toUpperCase();
    }
  }

  // אם הצבע מכיל רווח (צבע מורכב), קח את הצבע הראשון
  if (normalized.includes(' ')) {
    const firstColor = normalized.split(' ')[0].trim();
    if (COLOR_NAME_TO_HEX_MAP[firstColor]) {
      return COLOR_NAME_TO_HEX_MAP[firstColor].toUpperCase();
    }
  }

  // נסה לחפש ב-AVAILABLE_COLORS
  const found = AVAILABLE_COLORS.find(c => 
    c.name.toLowerCase() === normalized ||
    c.hex.toLowerCase() === normalized.toLowerCase()
  );
  if (found) {
    return found.hex.toUpperCase();
  }

  // אם לא מצאנו התאמה, החזר את הקלט כמו שהוא
  // (עשוי להיות CSS color name כמו 'red', 'blue' וכו')
  return trimmed;
}

/**
 * Convert HEX -> RGB
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (!hex) return null;
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  if (normalized.length !== 6) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

/**
 * המרת RGB -> XYZ -> Lab ו-DeltaE לפי CIE76 (Euclidean in Lab space)
 */
const rgbToXyz = (rgb: { r: number; g: number; b: number }) => {
  const srgb = { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 };
  const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = linearize(srgb.r);
  const g = linearize(srgb.g);
  const b = linearize(srgb.b);
  return {
    x: r * 0.4124 + g * 0.3576 + b * 0.1805,
    y: r * 0.2126 + g * 0.7152 + b * 0.0722,
    z: r * 0.0193 + g * 0.1192 + b * 0.9505,
  };
};

const xyzToLab = (xyz: { x: number; y: number; z: number }) => {
  const refX = 0.95047,
    refY = 1.0,
    refZ = 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + 16 / 116);
  const fx = f(xyz.x / refX);
  const fy = f(xyz.y / refY);
  const fz = f(xyz.z / refZ);
  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
};

const deltaE = (labA: { L: number; a: number; b: number }, labB: { L: number; a: number; b: number }) => {
  const dL = labA.L - labB.L;
  const da = labA.a - labB.a;
  const db = labA.b - labB.b;
  return Math.sqrt(dL * dL + da * da + db * db);
};

/**
 * Compute centroid RGB for a family
 */
// Note: getFamilyCentroid removed — kept hexToRgb/rgbDistance for simplicity

/**
 * Try to detect the base color family for any input color.
 * - If exact variant match (hex or english/name), returns exact
 * - If name includes a family token (e.g., 'red', 'blue'), returns name
 * - Else compute nearest family by RGB distance and return fuzzy if within threshold
 */
export const detectColorFamily = (
  colorValue: string | null | undefined,
  colorFamilies: ColorFamily[],
  opts?: { distanceThreshold?: number }
): { family: string | null; variant?: { name?: string; hex?: string } | null; method: 'exact' | 'name' | 'fuzzy' | 'none'; score?: number | null } => {
  const defaultResult = { family: null, variant: null, method: 'none' as const, score: null };
  if (!colorValue || !colorFamilies || !colorFamilies.length) return defaultResult;

  const threshold = opts?.distanceThreshold ?? 20; // default deltaE threshold - adjust as needed (20 is perceptual-ish)
  const valueString = String(colorValue).trim();
  const normalizedHex = isHexColor(valueString) ? (valueString.startsWith('#') ? valueString.toLowerCase() : `#${valueString.toLowerCase()}`) : null;
  const valueLower = valueString.toLowerCase();

  // 1) Exact hex match or exact name match (variant name or english candidate)
  let engCandidate: string | null = null;
  if (normalizedHex) {
    engCandidate = getColorName(normalizedHex).english?.toLowerCase() || null;
  } else {
    const found = AVAILABLE_COLORS.find(c => c.name.toLowerCase() === valueLower);
    if (found) engCandidate = getColorName(found.hex).english?.toLowerCase() || null;
    else engCandidate = valueLower;
  }

  // try exact hex or name matching
  for (const family of colorFamilies) {
    for (const variant of family.variants) {
      const variantHex = variant.hex?.toLowerCase?.();
      const variantNameLower = variant.name?.toString?.().toLowerCase?.();
      if ((normalizedHex && variantHex && normalizedHex === variantHex) || (variantNameLower && (valueLower === variantNameLower || engCandidate === variantNameLower))) {
        return { family: family.family, variant: { name: variant.name, hex: variant.hex }, method: 'exact', score: 0 };
      }
    }
  }

  // 2) Token-based name match: find token inside engCandidate
  if (engCandidate) {
    const token = engCandidate.split(/[^a-z]+/).find(t => !!t);
    if (token) {
      const lowerToken = token.toLowerCase();
      for (const family of colorFamilies) {
        for (const variant of family.variants) {
          const variantNameLower = variant.name?.toString?.().toLowerCase?.();
          if (variantNameLower && variantNameLower.includes(lowerToken)) {
            return { family: family.family, variant: { name: variant.name, hex: variant.hex }, method: 'name', score: null };
          }
        }
      }
    }
  }

  // 3) Fuzzy matching by RGB distance
  if (normalizedHex) {
    const pickerRgb = hexToRgb(normalizedHex);
    if (pickerRgb) {
      let bestFamily: string | null = null;
      let bestVariant: { name?: string; hex?: string } | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      // העדפה לחישוב יחס למשפחת הצבע הראשון בוריאנטים
      for (const family of colorFamilies) {
        const rep = family.variants && family.variants.length ? family.variants[0].hex : null;
        if (!rep) continue;
        const repRgb = hexToRgb(rep);
        if (!repRgb) continue;
        const repLab = xyzToLab(rgbToXyz(repRgb));
        const pickerLab = xyzToLab(rgbToXyz(pickerRgb));
        const dist = deltaE(pickerLab, repLab);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestFamily = family.family;
          bestVariant = { name: family.variants[0]?.name, hex: rep };
        }
      }

      // אם רזולוציית מרחק טובה - חזור
      if (bestDistance <= threshold) {
        return { family: bestFamily, variant: bestVariant, method: 'fuzzy', score: Math.round(bestDistance) };
      }
    }
  }

  // nothing found
  return defaultResult;
};

