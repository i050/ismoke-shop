// ספריית עזר לצבעים וניגודיות
// פונקציות אלו משמשות לבדיקת ניגודיות לפי WCAG

// המרה של HEX ל-RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const m = normalized.slice(1).match(/.{2}/g);
  if (!m) return null;
  const [r, g, b] = m.map((h) => parseInt(h, 16));
  return { r, g, b };
}

// חישוב relative luminance לפי נוסחת WCAG
export function relativeLuminance(r: number, g: number, b: number): number {
  const srgb = [r, g, b].map((v) => v / 255).map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

// חישוב יחס ניגודיות בין שני צבעים hex
export function contrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 0;
  const L1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const L2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

// נרמול של hex: מחזיר '#rrggbb' lowercase או null אם לא תקין
export function normalizeHex(input: string | undefined | null): string | null {
  if (!input) return null;
  const str = input.trim().toLowerCase();
  // אם קיבלנו פורמט #rgb - נדחוס ל-6 תווים
  const shortMatch = str.match(/^#([0-9a-f]{3})$/);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const fullMatch = str.match(/^#([0-9a-f]{6})$/);
  if (fullMatch) return `#${fullMatch[1]}`;
  return null;
}

/**
 * מציע צבע אופטימלי מתוך רשימה לפי ניגודיות עם צבע רקע
 * @param backgroundColor - צבע רקע (hex)
 * @param candidates - מערך של צבעים פוטנציאליים (hex)
 * @param minRatio - יחס ניגודיות מינימלי (ברירת מחדל 4.5 לפי WCAG AA)
 * @returns הצבע עם הניגודיות הגבוהה ביותר, או null אם אף אחד לא עובר את היחס המינימלי
 */
export function pickBestContrast(
  backgroundColor: string,
  candidates: string[],
  minRatio: number = 4.5
): string | null {
  if (!candidates.length) return null;
  
  let bestColor: string | null = null;
  let bestRatio = 0;

  for (const candidate of candidates) {
    const ratio = contrastRatio(backgroundColor, candidate);
    if (ratio >= minRatio && ratio > bestRatio) {
      bestRatio = ratio;
      bestColor = candidate;
    }
  }

  return bestColor;
}
