/**
 * קובץ ניהול צבעים
 * מטרה: תרגום אוטומטי של HEX לשמות צבעים בעברית
 */

import ntc from '@trihargianto/ntcjs';
import { translateColorName, mergeExternalTranslations } from './colorNames';

/**
 * 🎨 מילון תרגום: אנגלית → עברית
 * כולל 80+ צבעים נפוצים
 */
export const COLOR_TRANSLATIONS: Record<string, string> = {
  // ✦ כחולים
  'Alice Blue': 'כחול אליס',
  'Azure': 'תכלת',
  'Blue': 'כחול',
  'Cadet Blue': 'כחול קדט',
  'Cornflower Blue': 'כחול תלתן',
  'Deep Sky Blue': 'כחול שמיים כהה',
  'Dodger Blue': 'כחול דודג׳ר',
  'Light Blue': 'כחול בהיר',
  'Light Sky Blue': 'כחול שמיים בהיר',
  'Midnight Blue': 'כחול חצות',
  'Navy': 'כחול נייבי',
  'Navy Blue': 'כחול נייבי',
  'Powder Blue': 'כחול פודרה',
  'Royal Blue': 'כחול מלכותי',
  'Sky Blue': 'כחול שמיים',
  'Steel Blue': 'כחול פלדה',
  'Turquoise': 'טורקיז',
  'Cyan': 'ציאן',
  'Dark Cyan': 'ציאן כהה',
  'Light Cyan': 'ציאן בהיר',

  // ✦ ורודים
  'Deep Pink': 'ורוד עמוק',
  'Hot Pink': 'ורוד חזק',
  'Light Pink': 'ורוד בהיר',
  'Medium Violet Red': 'ורוד סגול בינוני',
  'Pale Violet Red': 'ורוד סגול חיוור',
  'Pink': 'ורוד',
  'Fuchsia': 'פוקסיה',
  'Magenta': 'מג׳נטה',

  // ✦ אדומים
  'Crimson': 'ארגמן',
  'Dark Red': 'אדום כהה',
  'Fire Brick': 'אדום לבנים',
  'Indian Red': 'אדום הודי',
  'Light Coral': 'אלמוג בהיר',
  'Red': 'אדום',
  'Salmon': 'סלמון',
  'Tomato': 'עגבניה',
  'Light Salmon': 'סלמון בהיר',
  'Dark Salmon': 'סלמון כהה',

  // ✦ כתומים
  'Coral': 'אלמוג',
  'Dark Orange': 'כתום כהה',
  'Orange': 'כתום',
  'Orange Red': 'כתום אדום',
  'Peach Puff': 'אפרסק',
  'Bisque': 'ביסקוויט',

  // ✦ צהובים
  'Gold': 'זהב',
  'Khaki': 'חאקי',
  'Light Yellow': 'צהוב בהיר',
  'Yellow': 'צהוב',
  'Light Goldenrod Yellow': 'צהוב זהוב בהיר',
  'Lemon Chiffon': 'שיפון לימון',
  'Moccasin': 'מוקסין',

  // ✦ ירוקים
  'Chartreuse': 'ירוק צהבהב',
  'Dark Green': 'ירוק כהה',
  'Forest Green': 'ירוק יער',
  'Green': 'ירוק',
  'Green Yellow': 'צהוב ירוק',
  'Lawn Green': 'ירוק דשא',
  'Light Green': 'ירוק בהיר',
  'Lime': 'ליים',
  'Lime Green': 'ירוק ליים',
  'Medium Sea Green': 'ירוק ים בינוני',
  'Medium Spring Green': 'ירוק אביב בינוני',
  'Olive': 'זית',
  'Olive Drab': 'זית עמום',
  'Pale Green': 'ירוק חיוור',
  'Sea Green': 'ירוק ים',
  'Spring Green': 'ירוק אביב',
  'Yellow Green': 'ירוק צהוב',
  'Dark Olive Green': 'ירוק זית כהה',
  'Medium Aquamarine': 'אקווה מרין בינוני',
  'Dark Sea Green': 'ירוק ים כהה',
  'Light Sea Green': 'ירוק ים בהיר',

  // ✦ סגולים
  'Blue Violet': 'סגול כחלחל',
  'Dark Magenta': 'מג׳נטה כהה',
  'Dark Orchid': 'סחלב כהה',
  'Dark Violet': 'סגול כהה',
  'Indigo': 'אינדיגו',
  'Lavender': 'לבנדר',
  'Medium Orchid': 'סחלב בינוני',
  'Medium Purple': 'סגול בינוני',
  'Orchid': 'סחלב',
  'Plum': 'שזיף',
  'Purple': 'סגול',
  'Thistle': 'גדילן',
  'Violet': 'סגול בהיר',
  'Medium Slate Blue': 'כחול צפחה בינוני',
  'Slate Blue': 'כחול צפחה',
  'Dark Slate Blue': 'כחול צפחה כהה',

  // ✦ חומים
  'Brown': 'חום',
  'Burlywood': 'חום בהיר',
  'Chocolate': 'שוקולד',
  'Peru': 'פרו',
  'Rosy Brown': 'חום ורדרד',
  'Saddle Brown': 'חום אוכף',
  'Sandy Brown': 'חום חולי',
  'Sienna': 'סיינה',
  'Tan': 'שזוף',
  'Maroon': 'ערמוני',
  'Dark Goldenrod': 'זהב כהה',
  'Goldenrod': 'זהב',

  // ✦ שחורים ואפורים
  'Black': 'שחור',
  'Charcoal': 'פחמי',
  'Dark Gray': 'אפור כהה',
  'Dark Grey': 'אפור כהה',
  'Dark Slate Gray': 'אפור צפחה כהה',
  'Dim Gray': 'אפור עמום',
  'Gray': 'אפור',
  'Grey': 'אפור',
  'Light Gray': 'אפור בהיר',
  'Light Grey': 'אפור בהיר',
  'Light Slate Gray': 'אפור צפחה בהיר',
  'Silver': 'כסף',
  'Slate Gray': 'אפור צפחה',

  // ✦ לבנים וקרמים
  'Antique White': 'לבן עתיק',
  'Beige': 'בז׳',
  'Blanched Almond': 'שקד מולבן',
  'Cornsilk': 'משי תירס',
  'Floral White': 'לבן פרחוני',
  'Ghost White': 'לבן רוח',
  'Honeydew': 'מלון דבש',
  'Ivory': 'שנהב',
  'Linen': 'פשתן',
  'Mint Cream': 'קרם מנטה',
  'Misty Rose': 'ורד מעורפל',
  'Navajo White': 'לבן נאבאחו',
  'Old Lace': 'תחרה עתיקה',
  'Papaya Whip': 'פפאיה',
  'Seashell': 'צדף',
  'Snow': 'שלג',
  'Wheat': 'חיטה',
  'White': 'לבן',
  'White Smoke': 'עשן לבן',
};

// מיזוג הערכים ל-`colorNames` (מיזוג מתבצע כאן כדי להימנע מ- circular import)
try {
  mergeExternalTranslations(COLOR_TRANSLATIONS);
} catch (err) {
  // don't throw during module initialization — best-effort merge
  // errors here are non-fatal; the translation lookup will still fall back
  // to `COLOR_TRANSLATIONS` when `translateColorName` doesn't find a match.
  // Log for debugging only.
  // eslint-disable-next-line no-console
  console.warn('mergeExternalTranslations failed:', err);
}

/**
 * 🎨 רשימת צבעים זמינים עם HEX ושמות בעברית (לדרופדאונים)
 */
export const AVAILABLE_COLORS = [
  { hex: '#00bfff', name: 'כחול שמיים' },
  { hex: '#ff69b4', name: 'ורוד חזק' },
  { hex: '#ff8c00', name: 'כתום כהה' },
  { hex: '#2c2c2c', name: 'שחור' },
  { hex: '#ffffff', name: 'לבן' },
  { hex: '#ff0000', name: 'אדום' },
  { hex: '#008000', name: 'ירוק' },
  { hex: '#ffff00', name: 'צהוב' },
  { hex: '#800080', name: 'סגול' },
  { hex: '#ffc0cb', name: 'ורוד בהיר' },
  { hex: '#808080', name: 'אפור' },
  { hex: '#a52a2a', name: 'חום' },
  { hex: '#ffd700', name: 'זהב' },
  { hex: '#c0c0c0', name: 'כסף' },
  { hex: '#000000', name: 'שחור' },
];

/**
 * 🎨 פונקציה מרכזית: המרת HEX לשם צבע בעברית
 * @param hex - קוד HEX של הצבע (למשל: '#00BFFF')
 * @returns שם הצבע בעברית
 */
export const getColorName = (hex: string): string => {
  if (!hex || !isHexColor(hex)) return 'לא נבחר';

  try {
    // שלב 1: זיהוי שם הצבע באנגלית באמצעות ntcjs
    const result = ntc.name(hex);
    const englishName = result[1]; // "Sky Blue"

    // שלב 2: תרגום לעברית באמצעות המילון הרחב (`colorNames.ts`) או COLOR_TRANSLATIONS
    const translated = translateColorName(englishName);
    if (translated && translated !== englishName) {
      return translated;
    }

    // אם translateColorName לא מצא תרגום ידידותי, בדוק את COLOR_TRANSLATIONS הישן
    if (COLOR_TRANSLATIONS[englishName]) {
      return COLOR_TRANSLATIONS[englishName];
    }

    // שלב 3: Fallback - החזרת השם באנגלית אם אין תרגום
    return englishName;
  } catch (error) {
    console.error('שגיאה בזיהוי צבע:', error);
    return hex; // במקרה של שגיאה, מחזירים את ה-HEX
  }
};

/**
 * 🔍 בדיקה אם מחרוזת היא HEX חוקי
 * @param value - הערך לבדיקה
 * @returns האם זה HEX חוקי
 */
export const isHexColor = (value: string): boolean => {
  if (!value) return false;
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(value);
};

/**
 * 🎨 המרת HEX ל-RGBA (לשימוש ב-CSS)
 * @param hex - קוד HEX
 * @param alpha - שקיפות (0-1)
 * @returns מחרוזת RGBA
 */
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  if (!isHexColor(hex)) return `rgba(0, 0, 0, ${alpha})`;

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * 🔄 חיפוש HEX לפי שם בעברית
 * @param hebrewName - שם הצבע בעברית
 * @returns קוד HEX או undefined
 */
export const getColorHex = (hebrewName: string): string | undefined => {
  const entry = Object.entries(COLOR_TRANSLATIONS).find(
    ([_, hebrew]) => hebrew === hebrewName
  );
  return entry ? entry[0] : undefined;
};
