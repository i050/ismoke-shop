import mongoose, { Document, Schema } from 'mongoose';
import { deleteFromSpaces } from '../services/spacesService'; // ✅ שימוש ב-Spaces
import { logger } from '../utils/logger';

// ============================================================================
// Banner Model - מערכת ניהול באנרים דינמית
// ============================================================================

/**
 * Helper function לנרמול ערכי צבע HEX
 * מקבל ערך string או null ומחזיר ערך מנורמל או null
 * - מסיר רווחים מיותרים
 * - ממיר לאותיות קטנות
 * - מוודא פורמט #rrggbb תקין
 */
export function normalizeHexColor(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return /^#([0-9a-f]{6})$/.test(normalized) ? normalized : null;
}

/**
 * שמות שדות הצבע במודל הבאנר
 * משמש לאימות ולנרמול דינמי של שדות צבע
 */
export const COLOR_FIELDS = ['titleColor', 'descriptionColor', 'ctaTextColor', 'ctaBackgroundColor'] as const;
export type ColorField = typeof COLOR_FIELDS[number];

/**
 * Interface עבור מסמך Banner
 * מכיל את כל המידע הנדרש לניהול באנר במערכת
 */
export interface IBanner extends Document {
  // מידע בסיסי
  title: string; // כותרת הבאנר
  description: string; // תיאור הבאנר
  
  // תמונה (Cloudinary)
  imageUrl: string; // URL מלא לתמונה
  imagePublicId: string; // Cloudinary public_id למחיקה
  
  // Call-to-Action
  ctaText?: string; // טקסט הכפתור (אופציונלי)
  ctaLink?: string; // קישור ליעד (אופציונלי)
  
  // סדר ותצוגה
  order: number; // סדר התצוגה (מספר נמוך = יוצג קודם)
  isActive: boolean; // האם הבאנר פעיל
  
  // ניהול זמן
  startDate?: Date; // תאריך התחלת תצוגה (אופציונלי)
  endDate?: Date; // תאריך סיום תצוגה (אופציונלי)
  
  // צבעי טקסט ורקע מותאמים אישית (hex 6 תווים, לדוגמה '#ffffff')
  // שמור כ-null כברירת מחדל כדי לשמור על backward compatibility
  titleColor?: string | null; // צבע כותרת הבאנר
  descriptionColor?: string | null; // צבע תיאור הבאנר
  ctaTextColor?: string | null; // צבע טקסט כפתור ה-CTA
  ctaBackgroundColor?: string | null; // צבע רקע כפתור ה-CTA
  // עוצמת ה-overlay המופעלת על תמונת הבאנר (אחוז, 0..100)
  overlayOpacity?: number; 
  
  // גדלי פונטים מותאמים אישית (מבוסס design tokens)
  // שמור כ-null כברירת מחדל כדי לשמור על backward compatibility
  titleFontSize?: string | null; // גודל פונט כותרת ('xs'|'sm'|'base'|'lg'|'xl'|'2xl'|'3xl')
  descriptionFontSize?: string | null; // גודל פונט תיאור
  ctaFontSize?: string | null; // גודל פונט כפתור CTA
  
  // Analytics
  clickCount: number; // מספר קליקים על ה-CTA
  impressionCount: number; // מספר צפיות בבאנר
  
  // Optimistic Locking
  version: number; // גרסה למניעת התנגשויות עריכה מקבילות
  
  // Timestamps (auto-managed)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose Schema עבור Banner
 * כולל אינדקסים, ולידציה ו-hooks
 */
const BannerSchema = new Schema<IBanner>(
  {
    // מידע בסיסי
    title: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'כותרת לא יכולה להיות ארוכה יותר מ-100 תווים'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'תיאור לא יכול להיות ארוך יותר מ-500 תווים'],
    },
    
    // תמונה
    imageUrl: {
      type: String,
      required: [true, 'URL תמונה הוא שדה חובה'],
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'URL תמונה לא תקין',
      },
    },
    imagePublicId: {
      type: String,
      required: [true, 'Cloudinary public_id הוא שדה חובה'],
    },
    
    // Call-to-Action
    ctaText: {
      type: String,
      trim: true,
      maxlength: [50, 'טקסט CTA לא יכול להיות ארוך יותר מ-50 תווים'],
      // ולידציה - רק תווים בטוחים (עברית, אנגלית, ספרות, רווחים וסימני פיסוק בסיסיים)
      validate: {
        validator: function(v: string) {
          if (!v) return true; // אופציונלי
          return /^[\u0590-\u05FFa-zA-Z0-9\s!?.,'\-]+$/.test(v);
        },
        message: 'טקסט CTA מכיל תווים לא חוקיים',
      },
    },
    ctaLink: {
      type: String,
      trim: true,
      // ולידציה - URL או נתיב פנימי תקין
      validate: {
        validator: function(v: string) {
          if (!v) return true; // אופציונלי
          // תומך ב-URL מלא או נתיב יחסי
          return /^(https?:\/\/.+|\/[a-zA-Z0-9\-_/.?=&]+)$/.test(v);
        },
        message: 'קישור CTA לא תקין',
      },
    },
    
    // סדר ותצוגה
    order: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'סדר לא יכול להיות שלילי'],
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true, // אינדקס לסינון מהיר
    },
    
    // ניהול זמן
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
      // ולידציה - תאריך סיום חייב להיות אחרי תאריך התחלה
      validate: {
        validator: function(this: IBanner, v: Date) {
          if (!v || !this.startDate) return true;
          return v > this.startDate;
        },
        message: 'תאריך סיום חייב להיות אחרי תאריך התחלה',
      },
    },
    // שדות צבע חדשים: שליטה מלאה בצבעים לכל אלמנט בבאנר (hex 6 תווים)
    // הערה: כל השדות הם אופציונליים עם ברירת מחדל null להבטחת backward compatibility
    // במידה ולא מוגדר - נשתמש ב-fallback בצד הלקוח (CSS variables של מערכת העיצוב)
    titleColor: {
      type: String,
      default: null,
      validate: {
        validator: function(v: string | null) {
          if (v === null || v === undefined) return true;
          const trimmed = (v as string).trim().toLowerCase();
          return /^#([0-9a-f]{6})$/.test(trimmed);
        },
        message: 'titleColor חייב להיות hex של 6 תווים, לדוגמה #ffffff',
      },
    },
    descriptionColor: {
      type: String,
      default: null,
      validate: {
        validator: function(v: string | null) {
          if (v === null || v === undefined) return true;
          const trimmed = (v as string).trim().toLowerCase();
          return /^#([0-9a-f]{6})$/.test(trimmed);
        },
        message: 'descriptionColor חייב להיות hex של 6 תווים, לדוגמה #ffffff',
      },
    },
    ctaTextColor: {
      type: String,
      default: null,
      validate: {
        validator: function(v: string | null) {
          if (v === null || v === undefined) return true;
          const trimmed = (v as string).trim().toLowerCase();
          return /^#([0-9a-f]{6})$/.test(trimmed);
        },
        message: 'ctaTextColor חייב להיות hex של 6 תווים, לדוגמה #ffffff',
      },
    },
    ctaBackgroundColor: {
      type: String,
      default: null,
      validate: {
        validator: function(v: string | null) {
          if (v === null || v === undefined) return true;
          const trimmed = (v as string).trim().toLowerCase();
          return /^#([0-9a-f]{6})$/.test(trimmed);
        },
        message: 'ctaBackgroundColor חייב להיות hex של 6 תווים, לדוגמה #ffffff',
      },
    },
    // עוצמת ה-overlay על התמונה (0..100) - נשמר כאחוז כדי לשמור על backward compatibility
    overlayOpacity: {
      type: Number,
      default: 40,
      min: [0, 'overlayOpacity חייב להיות בין 0 ל-100'],
      max: [100, 'overlayOpacity חייב להיות בין 0 ל-100'],
    },
    
    // גדלי פונטים - מבוססים על design tokens
    // הערכים המותרים: 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'
    titleFontSize: {
      type: String,
      default: null,
      enum: {
        values: [null, 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'],
        message: 'titleFontSize חייב להיות אחד מהערכים: xs, sm, base, lg, xl, 2xl, 3xl',
      },
    },
    descriptionFontSize: {
      type: String,
      default: null,
      enum: {
        values: [null, 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'],
        message: 'descriptionFontSize חייב להיות אחד מהערכים: xs, sm, base, lg, xl, 2xl, 3xl',
      },
    },
    ctaFontSize: {
      type: String,
      default: null,
      enum: {
        values: [null, 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'],
        message: 'ctaFontSize חייב להיות אחד מהערכים: xs, sm, base, lg, xl, 2xl, 3xl',
      },
    },
    
    // Analytics
    clickCount: {
      type: Number,
      default: 0,
      min: [0, 'מספר קליקים לא יכול להיות שלילי'],
    },
    impressionCount: {
      type: Number,
      default: 0,
      min: [0, 'מספר צפיות לא יכול להיות שלילי'],
    },
    
    // Optimistic Locking
    version: {
      type: Number,
      default: 0,
      min: [0, 'גרסה לא יכולה להיות שלילית'],
    },
  },
  {
    // הוסף createdAt ו-updatedAt אוטומטית
    timestamps: true,
  }
);

// ============================================================================
// אינדקסים למיטוב ביצועים
// ============================================================================

// אינדקס מורכב לשאילתות של באנרים פעילים ממוינים
BannerSchema.index({ isActive: 1, order: 1 });

// אינדקס לסינון לפי טווח תאריכים
BannerSchema.index({ startDate: 1, endDate: 1 });

// אינדקס מורכב לשאילתת באנרים פעילים בטווח תאריכים
BannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// אינדקס ייחודי למניעת כפילויות (כותרת + תאריך התחלה)
// מאפשר אותה כותרת עם תאריכי התחלה שונים (מבצעים חוזרים)
BannerSchema.index(
  { title: 1, startDate: 1 },
  { 
    unique: true,
    // אפשר startDate ריקים מרובים
    partialFilterExpression: {
      startDate: { $type: 'date' },
      title: { $exists: true, $nin: ['', null] }
    }
  }
);

// ============================================================================
// Middleware - Pre-delete hook
// ============================================================================

/**
 * Hook שרץ לפני מחיקת באנר
 * ✅ אחראי על ניקוי תמונת הבאנר מ-DigitalOcean Spaces
 */
BannerSchema.pre('findOneAndDelete', async function(next) {
  try {
    // קבל את המסמך שעומד להימחק
    const banner = await this.model.findOne(this.getFilter());
    
    if (banner && banner.imagePublicId) {
      logger.info(`מוחק תמונת באנר מ-Spaces: ${banner.imagePublicId}`);
      
      // ✅ מחק את התמונה מ-DigitalOcean Spaces (+ .webp extension)
      await deleteFromSpaces(`${banner.imagePublicId}.webp`);
      
      logger.info(`תמונת באנר נמחקה בהצלחה: ${banner.imagePublicId}`);
    }
    
    next();
  } catch (error) {
    logger.error('שגיאה במחיקת תמונת באנר מ-Spaces:', error);
    // המשך עם המחיקה גם אם יש שגיאה ב-Spaces
    // כדי לא לחסום מחיקת רכורד מה-DB
    next();
  }
});

// ============================================================================
// Export Model
// ============================================================================

const Banner = mongoose.model<IBanner>('Banner', BannerSchema);

export default Banner;
