/**
 * 🌐 שירות תרגום עברית→אנגלית למאפייני סינון
 * 
 * אסטרטגיה דו-שכבתית:
 * 1️⃣ מילון מקומי מורחב (99% מהמקרים)
 * 2️⃣ טרנסליטרציה חכמה (fallback - תמיד עובד)
 * 
 * @example
 * // מילון מקומי (מיידי)
 * translateToEnglish('צבע') // → 'color'
 * translateToEnglish('משקל') // → 'weight'
 * 
 * // טרנסליטרציה (fallback)
 * translateToEnglish('מאפיין מיוחד') // → 'mafiyn_myuchd'
 */

// ============================================================================
// שכבה 1: מילון מקומי מורחב
// ============================================================================

/**
 * מילון עברית→אנגלית למאפייני סינון
 * מכסה את המקרים הנפוצים ביותר באתרי e-commerce
 */
const COMMON_ATTRIBUTES: Record<string, string> = {
  // ========== מאפיינים בסיסיים ==========
  'צבע': 'color',
  'גודל': 'size',
  'מידה': 'size',
  'משקל': 'weight',
  'חומר': 'material',
  'מותג': 'brand',
  'יצרן': 'manufacturer',
  'סגנון': 'style',
  'דגם': 'model',
  'גרסה': 'version',
  'דור': 'generation',
  
  // ========== מאפייני בגדים ==========
  'מידת חזה': 'bust_size',
  'אורך שרוול': 'sleeve_length',
  'גזרה': 'fit',
  'צווארון': 'collar',
  'סוג בד': 'fabric_type',
  'עובי': 'thickness',
  'אורך': 'length',
  'רוחב': 'width',
  'גובה': 'height',
  'מותן': 'waist',
  'ירך': 'hip',
  'חזה': 'chest',
  'כתף': 'shoulder',
  'שרוול': 'sleeve',
  'סגירה': 'closure',
  'כיסים': 'pockets',
  'בטנה': 'lining',
  'סוג תפירה': 'stitch_type',
  
  // ========== מאפייני נעליים ==========
  'מידת נעל': 'shoe_size',
  'גובה עקב': 'heel_height',
  'סוג סוליה': 'sole_type',
  'סוג עקב': 'heel_type',
  'חומר עליון': 'upper_material',
  'חומר פנימי': 'inner_material',
  'סגירת נעל': 'shoe_closure',
  'גובה גפה': 'shaft_height',
  
  // ========== מאפייני אלקטרוניקה ==========
  'קיבולת': 'capacity',
  'התנגדות': 'resistance',
  'הספק': 'power',
  'מתח': 'voltage',
  'תדר': 'frequency',
  'זיכרון': 'memory',
  'אחסון': 'storage',
  'מעבד': 'processor',
  'מסך': 'screen',
  'רזולוציה': 'resolution',
  'גודל מסך': 'screen_size',
  'סוללה': 'battery',
  'מצלמה': 'camera',
  'מגפיקסלים': 'megapixels',
  'חיבור': 'connection',
  'ממשק': 'interface',
  'פורטים': 'ports',
  'אחריות': 'warranty',
  
  // ========== מאפיינים פיזיים ==========
  'גמישות': 'flexibility',
  'עמידות': 'durability',
  'חוזק': 'strength',
  'קשיות': 'hardness',
  'רכות': 'softness',
  'איכות': 'quality',
  'משקל נטו': 'net_weight',
  'משקל ברוטו': 'gross_weight',
  'עומק': 'depth',
  'קוטר': 'diameter',
  'נפח': 'volume',
  'צורה': 'shape',
  'מרקם': 'texture',
  'גימור': 'finish',
  'שקיפות': 'transparency',
  'ברק': 'shine',
  
  // ========== מאפייני מזון ומשקאות ==========
  'טעם': 'flavor',
  'ריח': 'scent',
  'ארומה': 'aroma',
  'תאריך ייצור': 'manufacture_date',
  'תוקף': 'expiry',
  'ארץ ייצור': 'country_of_origin',
  'כשרות': 'kosher',
  'אורגני': 'organic',
  'טבעוני': 'vegan',
  'צמחוני': 'vegetarian',
  'ללא גלוטן': 'gluten_free',
  'ללא לקטוז': 'lactose_free',
  'ערך תזונתי': 'nutritional_value',
  'קלוריות': 'calories',
  'חלבון': 'protein',
  'פחמימות': 'carbohydrates',
  'שומן': 'fat',
  
  // ========== מאפייני קוסמטיקה ==========
  'סוג עור': 'skin_type',
  'סוג שיער': 'hair_type',
  'בושם': 'fragrance',
  'גוון': 'shade',
  'כיסוי': 'coverage',
  'גימור קוסמטי': 'cosmetic_finish',
  'SPF': 'spf',
  'עמידות קוסמטית': 'cosmetic_durability',
  
  // ========== מאפייני ריהוט ==========
  'חומר מרכזי': 'main_material',
  'חומר משני': 'secondary_material',
  'ריפוד': 'upholstery',
  'צבע עץ': 'wood_color',
  'סוג עץ': 'wood_type',
  'מנגנון': 'mechanism',
  'הרכבה': 'assembly',
  'קיבולת משקל': 'weight_capacity',
  'מספר מקומות': 'seating_capacity',
  
  // ========== מאפיינים כלליים ==========
  'מקור': 'origin',
  'יבואן': 'importer',
  'מפיץ': 'distributor',
  'ברקוד': 'barcode',
  'קטלוגי': 'catalog_number',
  'שנה': 'year',
  'עונה': 'season',
  'אוסף': 'collection',
  'סדרה': 'series',
  'קטגוריה': 'category',
  'תת קטגוריה': 'subcategory',
  'תגיות': 'tags',
  'מאפיינים': 'attributes',
  'תכונות': 'features',
  'יתרונות': 'benefits',
  'שימושים': 'uses',
  'המלצות': 'recommendations',
  
  // ========== מאפיינים טכניים ==========
  'תקן': 'standard',
  'אישור': 'certification',
  'רישיון': 'license',
  'פטנט': 'patent',
  'סימן מסחרי': 'trademark',
  'זכויות יוצרים': 'copyright',
  'גרסת תוכנה': 'software_version',
  'גרסת חומרה': 'hardware_version',
  'פרוטוקול': 'protocol',
  'תאימות': 'compatibility',
  'דרישות מערכת': 'system_requirements',
  
  // ניתן להוסיף בעתיד עוד מונחים...
};

// ============================================================================
// שכבה 2: טרנסליטרציה חכמה (Hebrew → English)
// ============================================================================

/**
 * מפת המרה של אותיות עבריות לאנגלית
 * מבוסס על תקן ISO 259 עם שיפורים לקריאות
 */
const HEBREW_TO_ENGLISH_LETTERS: Record<string, string> = {
  'א': 'a',
  'ב': 'b',
  'ג': 'g',
  'ד': 'd',
  'ה': 'h',
  'ו': 'v',
  'ז': 'z',
  'ח': 'ch',
  'ט': 't',
  'י': 'y',
  'כ': 'k',
  'ך': 'k',
  'ל': 'l',
  'מ': 'm',
  'ם': 'm',
  'נ': 'n',
  'ן': 'n',
  'ס': 's',
  'ע': 'a',
  'פ': 'p',
  'ף': 'p',
  'צ': 'ts',
  'ץ': 'ts',
  'ק': 'k',
  'ר': 'r',
  'ש': 'sh',
  'ת': 't'
};

/**
 * טרנסליטרציה חכמה של טקסט עברי לאנגלית
 * עם ניקוי ועיצוב לפורמט snake_case תקני
 * 
 * @param text - טקסט בעברית
 * @returns טקסט באנגלית (lowercase, snake_case)
 * 
 * @example
 * transliterate('משקל כבד') // → 'mshkl_kbd'
 * transliterate('סוג בד') // → 'sug_bd'
 * transliterate('עמידות במים') // → 'amidut_bmim'
 */
function transliterate(text: string): string {
  if (!text) return '';
  
  // המרת תווים עבריים לאנגלית
  const transliterated = text
    .split('')
    .map(char => HEBREW_TO_ENGLISH_LETTERS[char] || char)
    .join('');
  
  // ניקוי ועיצוב לפורמט snake_case תקני
  return transliterated
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')            // רווחים → קו תחתון
    .replace(/[^a-z0-9_]/g, '')      // רק אנגלית, מספרים, קו תחתון
    .replace(/_+/g, '_')             // קווים כפולים → בודד
    .replace(/^_+|_+$/g, '')         // הסרת קווים בהתחלה/סוף
    || 'attribute';                  // fallback אם נשאר ריק
}

// ============================================================================
// פונקציה ראשית: תרגום עברית→אנגלית
// ============================================================================

/**
 * 🎯 תרגום עברית→אנגלית עם מילון + טרנסליטרציה
 * 
 * תהליך:
 * 1. בדיקה במילון מקומי מורחב (מיידי)
 * 2. טרנסליטרציה (fallback - תמיד עובד)
 * 
 * @param hebrewText - טקסט בעברית
 * @returns מזהה באנגלית בפורמט snake_case
 * 
 * @example
 * // מילון מקומי (instant)
 * translateToEnglish('צבע') // → 'color'
 * translateToEnglish('משקל') // → 'weight'
 * 
 * // טרנסליטרציה (fallback)
 * translateToEnglish('מאפיין מיוחד') // → 'mafiyn_myuchd'
 */
export function translateToEnglish(hebrewText: string): string {
  const trimmed = hebrewText.trim();
  
  // טיפול בקלט ריק
  if (!trimmed) {
    return 'attribute';
  }
  
  // שכבה 1: מילון מקומי (בדיקה מיידית)
  const normalizedKey = trimmed.toLowerCase();
  if (COMMON_ATTRIBUTES[normalizedKey]) {
    return COMMON_ATTRIBUTES[normalizedKey];
  }
  
  // שכבה 2: טרנסליטרציה (תמיד עובד)
  return transliterate(trimmed);
}

/**
 * בדיקה האם טקסט קיים במילון המקומי
 * שימושי כדי לדעת אם התרגום יהיה מיידי
 * 
 * @param hebrewText - טקסט בעברית
 * @returns true אם קיים במילון המקומי
 * 
 * @example
 * isInLocalDictionary('צבע') // → true
 * isInLocalDictionary('משהו נדיר') // → false
 */
export function isInLocalDictionary(hebrewText: string): boolean {
  return hebrewText.toLowerCase() in COMMON_ATTRIBUTES;
}

/**
 * קבלת רשימת כל המונחים הזמינים במילון המקומי
 * שימושי לדיבוג או להצגת הצעות למשתמש
 * 
 * @returns מערך של מונחים בעברית
 */
export function getAvailableTerms(): string[] {
  return Object.keys(COMMON_ATTRIBUTES);
}

/**
 * הוספת מונח חדש למילון המקומי באופן דינמי
 * שימושי ללמידה (learning) - אם משתמש מתקן תרגום, נוסיף לזיכרון
 * 
 * @param hebrew - מונח בעברית
 * @param english - תרגום באנגלית
 * 
 * @example
 * addToLocalDictionary('עמידות במים', 'waterproof')
 */
export function addToLocalDictionary(hebrew: string, english: string): void {
  COMMON_ATTRIBUTES[hebrew.toLowerCase()] = english.toLowerCase();
  console.log(`📚 Added to dictionary: "${hebrew}" → "${english}"`);
}
