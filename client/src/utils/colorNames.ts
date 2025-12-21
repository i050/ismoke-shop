/**
 * תרגום שמות צבעים מאנגלית לעברית
 * מבוסס על ספריית Name That Color (ntcjs)
 */

/**
 * מיפוי שמות צבעים מאנגלית לעברית
 * כולל את הצבעים הנפוצים ביותר
 */
// NOTE: Do NOT import `COLOR_TRANSLATIONS` here to avoid a circular
// dependency during module initialization. Instead, `colorConstants.ts`
// should call `mergeExternalTranslations` after it defines
// `COLOR_TRANSLATIONS`.

export const colorNamesHebrew: Record<string, string> = {
  // אדומים
  'red': 'אדום',
  'crimson': 'ארגמן',
  'scarlet': 'ארגמן בהיר',
  'maroon': 'חום-אדום',
  'burgundy': 'בורדו',
  'coral': 'אלמוגי',
  'salmon': 'סלמון',
  'rose': 'ורוד',
  'pink': 'ורוד',
  'hot pink': 'ורוד עז',
  'deep pink': 'ורוד עמוק',
  'light pink': 'ורוד בהיר',
  'ruby': 'אודם',
  
  // כתומים
  'orange': 'כתום',
  'dark orange': 'כתום כהה',
  'tangerine': 'מנדרינה',
  'peach': 'אפרסק',
  'apricot': 'משמש',
  'amber': 'ענבר',
  'copper': 'נחושת',
  
  // צהובים
  'yellow': 'צהוב',
  'gold': 'זהב',
  'golden': 'זהוב',
  'lemon': 'לימון',
  'canary': 'קנרי',
  'mustard': 'חרדל',
  'cream': 'שמנת',
  'ivory': 'שנהב',
  'beige': 'בז',
  'khaki': 'חאקי',
  
  // ירוקים
  'green': 'ירוק',
  'lime': 'ליים',
  'olive': 'זית',
  'forest green': 'ירוק יער',
  'emerald': 'ברקת',
  'jade': 'ירקן',
  'mint': 'נענע',
  'sage': 'מרווה',
  'teal': 'טורקיז כהה',
  'aqua': 'תכלת',
  'turquoise': 'טורקיז',
  'cyan': 'ציאן',
  
  // כחולים
  'blue': 'כחול',
  'navy': 'כחול כהה',
  'royal blue': 'כחול מלכותי',
  'sky blue': 'כחול שמים',
  'azure': 'תכלת',
  'cobalt': 'קובלט',
  'indigo': 'אינדיגו',
  'sapphire': 'ספיר',
  'cerulean': 'תכלת בהיר',
  
  // סגולים
  'purple': 'סגול',
  'violet': 'סגול',
  'lavender': 'לבנדר',
  'lilac': 'לילך',
  'mauve': 'סגול בהיר',
  'plum': 'שזיף',
  'orchid': 'סחלב',
  'magenta': 'מגנטה',
  'fuchsia': 'פוקסיה',
  
  // חומים
  'brown': 'חום',
  'chocolate': 'שוקולד',
  'coffee': 'קפה',
  'tan': 'שזוף',
  'sand': 'חול',
  'sienna': 'סיינה',
  'mahogany': 'מהגוני',
  'chestnut': 'ערמון',
  
  // אפורים
  'gray': 'אפור',
  'grey': 'אפור',
  'silver': 'כסף',
  'charcoal': 'פחם',
  'slate': 'צפחה',
  'ash': 'אפר',
  
  // שחור ולבן
  'black': 'שחור',
  'white': 'לבן',
  'off white': 'לבן שבור',
  'snow': 'שלג',
  'pearl': 'פנינה',
  'alabaster': 'אלבסטר',
};

/*
  שילוב תרגומים נוספים מתוך `COLOR_TRANSLATIONS` ב-`colorConstants.ts`
  המטרה: להרחיב את כיסוי התרגומים (lowercased keys) כדי לשפר את הכיסוי
  כאשר ספריית ntcjs מחזירה שמות באנגלית.
*/
const EXTRA_TRANSLATIONS: Record<string, string> = {
  'alice blue': 'כחול אליס',
  'azure': 'תכלת',
  'blue': 'כחול',
  'cadet blue': 'כחול קדט',
  'cornflower blue': 'כחול תלתן',
  'deep sky blue': 'כחול שמיים כהה',
  'dodger blue': 'כחול דודג׳ר',
  'light blue': 'כחול בהיר',
  'light sky blue': 'כחול שמיים בהיר',
  'midnight blue': 'כחול חצות',
  'navy': 'כחול נייבי',
  'navy blue': 'כחול נייבי',
  'powder blue': 'כחול פודרה',
  'royal blue': 'כחול מלכותי',
  'sky blue': 'כחול שמים',
  'steel blue': 'כחול פלדה',
  'turquoise': 'טורקיז',
  'cyan': 'ציאן',
  'dark cyan': 'ציאן כהה',
  'light cyan': 'ציאן בהיר',

  'deep pink': 'ורוד עמוק',
  'hot pink': 'ורוד חזק',
  'light pink': 'ורוד בהיר',
  'medium violet red': 'ורוד סגול בינוני',
  'pale violet red': 'ורוד סגול חיוור',
  'pink': 'ורוד',
  'fuchsia': 'פוקסיה',
  'magenta': 'מג׳נטה',

  'crimson': 'ארגמן',
  'dark red': 'אדום כהה',
  'fire brick': 'אדום לבנים',
  'indian red': 'אדום הודי',
  'light coral': 'אלמוג בהיר',
  'red': 'אדום',
  'salmon': 'סלמון',
  'tomato': 'עגבניה',
  'light salmon': 'סלמון בהיר',
  'dark salmon': 'סלמון כהה',

  'coral': 'אלמוג',
  'dark orange': 'כתום כהה',
  'orange': 'כתום',
  'orange red': 'כתום אדום',
  'peach puff': 'אפרסק',
  'bisque': 'ביסקוויט',

  'gold': 'זהב',
  'khaki': 'חאקי',
  'light yellow': 'צהוב בהיר',
  'yellow': 'צהוב',
  'light goldenrod yellow': 'צהוב זהוב בהיר',
  'lemon chiffon': 'שיפון לימון',
  'moccasin': 'מוקסין',

  'chartreuse': 'ירוק צהבהב',
  'dark green': 'ירוק כהה',
  'forest green': 'ירוק יער',
  'green': 'ירוק',
  'green yellow': 'צהוב ירוק',
  'lawn green': 'ירוק דשא',
  'light green': 'ירוק בהיר',
  'lime': 'ליים',
  'lime green': 'ירוק ליים',
  'medium sea green': 'ירוק ים בינוני',
  'medium spring green': 'ירוק אביב בינוני',
  'olive': 'זית',
  'olive drab': 'זית עמום',
  'pale green': 'ירוק חיוור',
  'sea green': 'ירוק ים',
  'spring green': 'ירוק אביב',
  'yellow green': 'ירוק צהוב',
  'dark olive green': 'ירוק זית כהה',
  'medium aquamarine': 'אקווה מרין בינוני',
  'dark sea green': 'ירוק ים כהה',
  'light sea green': 'ירוק ים בהיר',

  'blue violet': 'סגול כחלחל',
  'dark magenta': 'מג׳נטה כהה',
  'dark orchid': 'סחלב כהה',
  'dark violet': 'סגול כהה',
  'indigo': 'אינדיגו',
  'lavender': 'לבנדר',
  'medium orchid': 'סחלב בינוני',
  'medium purple': 'סגול בינוני',
  'orchid': 'סחלב',
  'plum': 'שזיף',
  'purple': 'סגול',
  'thistle': 'גדילן',
  'violet': 'סגול בהיר',
  'medium slate blue': 'כחול צפחה בינוני',
  'slate blue': 'כחול צפחה',
  'dark slate blue': 'כחול צפחה כהה',

  'brown': 'חום',
  'burlywood': 'חום בהיר',
  'chocolate': 'שוקולד',
  'peru': 'פרו',
  'rosy brown': 'חום ורדרד',
  'saddle brown': 'חום אוכף',
  'sandy brown': 'חום חולי',
  'sienna': 'סיינה',
  'tan': 'שזוף',
  'maroon': 'ערמוני',
  'dark goldenrod': 'זהב כהה',
  'goldenrod': 'זהב',

  'charcoal': 'פחמי',
  'dark gray': 'אפור כהה',
  'dark grey': 'אפור כהה',
  'dark slate gray': 'אפור צפחה כהה',
  'dim gray': 'אפור עמום',
  'gray': 'אפור',
  'grey': 'אפור',
  'light gray': 'אפור בהיר',
  'light grey': 'אפור בהיר',
  'light slate gray': 'אפור צפחה בהיר',
  'silver': 'כסף',
  'slate gray': 'אפור צפחה',

  'antique white': 'לבן עתיק',
  'beige': 'בז׳',
  'blanched almond': 'שקד מולבן',
  'cornsilk': 'משי תירס',
  'floral white': 'לבן פרחוני',
  'ghost white': 'לבן רוח',
  'honeydew': 'מלון דבש',
  'ivory': 'שנהב',
  'linen': 'פשתן',
  'mint cream': 'קרם מנטה',
  'misty rose': 'ורד מעורפל',
  'navajo white': 'לבן נאבאחו',
  'old lace': 'תחרה עתיקה',
  'papaya whip': 'פפאיה',
  'seashell': 'צדף',
  'snow': 'שלג',
  'wheat': 'חיטה',
  'white smoke': 'עשן לבן',
};

// מיזוג EXTRA_TRANSLATIONS לתוך המילון הראשי אם יש צורך
for (const [k, v] of Object.entries(EXTRA_TRANSLATIONS)) {
  if (!colorNamesHebrew[k]) {
    // מוסיף כניסה חדשה רק אם אין קיימת
    // @ts-ignore - עדכון דינמי של האובייקט
    colorNamesHebrew[k] = v;
  }
}

// External translation merging moved to `mergeExternalTranslations`

/**
 * מיזוג תרגומים חיצוניים (למשל `COLOR_TRANSLATIONS`) לתוך המילון
 * מוסיף רק כניסות חסרות כדי לא לשנות תרגומים ידניים קיימים
 */
export const mergeExternalTranslations = (
  external: Record<string, string> | undefined | null
) => {
  if (!external || typeof external !== 'object') return;
  for (const [eng, heb] of Object.entries(external)) {
    const key = eng.toLowerCase();
    if (!colorNamesHebrew[key]) {
      // @ts-ignore - עדכון דינמי של האובייקט
      colorNamesHebrew[key] = heb;
    }
  }
};

/**
 * פונקציה לחיפוש תרגום לצבע
 * מחפשת התאמה חלקית אם אין התאמה מלאה
 */
export const translateColorName = (englishName: string): string => {
  const lowerName = englishName.toLowerCase();
  
  // חיפוש התאמה מדויקת
  if (colorNamesHebrew[lowerName]) {
    return colorNamesHebrew[lowerName];
  }
  
  // חיפוש התאמה חלקית - מוצא את המילה הארוכה ביותר שיש לה תרגום
  const words = lowerName.split(' ');
  for (let i = words.length; i > 0; i--) {
    for (let j = 0; j <= words.length - i; j++) {
      const phrase = words.slice(j, j + i).join(' ');
      if (colorNamesHebrew[phrase]) {
        return colorNamesHebrew[phrase];
      }
    }
  }
  
  // אם לא נמצא תרגום, מחזיר את השם המקורי באנגלית
  return englishName;
};
