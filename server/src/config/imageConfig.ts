/**
 * 🎨 Image Processing Configuration
 * 
 * קובץ זה מגדיר את כל הפרמטרים של עיבוד תמונות במערכת:
 * - גדלי תמונות (thumbnail, medium, large)
 * - איכות ופורמט
 * - Validation של קבצים
 * 
 * @module imageConfig
 */

/**
 * גדלי תמונות במערכת
 * כל גודל מותאם לשימוש ספציפי:
 * - thumbnail: רשימות מוצרים, קרוסלות
 * - medium: תצוגה ראשית של מוצר
 * - large: זום/הגדלה, הדפסה
 */
export const IMAGE_SIZES = {
  thumbnail: {
    width: parseInt(process.env.IMAGE_THUMBNAIL_SIZE || '200'),
    height: parseInt(process.env.IMAGE_THUMBNAIL_SIZE || '200'),
    suffix: 'thumbnail',
    description: 'תמונה קטנה לרשימות וקרוסלות (200×200)',
  },
  medium: {
    width: parseInt(process.env.IMAGE_MEDIUM_SIZE || '800'),
    height: parseInt(process.env.IMAGE_MEDIUM_SIZE || '800'),
    suffix: 'medium',
    description: 'תמונה בינונית לתצוגה ראשית (800×800)',
  },
  large: {
    width: parseInt(process.env.IMAGE_LARGE_SIZE || '1200'),
    height: parseInt(process.env.IMAGE_LARGE_SIZE || '1200'),
    suffix: 'large',
    description: 'תמונה גדולה לזום והגדלה (1200×1200)',
  },
} as const;

/**
 * Type helper לגדלי תמונות
 */
export type ImageSize = keyof typeof IMAGE_SIZES;

/**
 * הגדרות איכות ופורמט
 */
export const IMAGE_PROCESSING_CONFIG = {
  /** פורמט פלט (WebP מומלץ - חיסכון של 30-40%) */
  format: (process.env.IMAGE_FORMAT || 'webp') as 'webp' | 'jpeg' | 'png',
  
  /** איכות דחיסה (1-100) - 85 הוא sweet spot */
  quality: parseInt(process.env.IMAGE_QUALITY || '85'),
  
  /** גודל מקסימלי לקובץ מקור (10MB) */
  maxFileSize: 10 * 1024 * 1024, // 10MB
  
  /** פורמטים מותרים להעלאה */
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif', // GIF יומר לתמונה סטטית
  ],
  
  /** האם לשמור EXIF metadata */
  keepMetadata: false, // false = גודל קובץ קטן יותר
  
  /** background color לתמונות עם שקיפות */
  backgroundColor: { r: 255, g: 255, b: 255 }, // רקע לבן
} as const;

/**
 * Validation של file upload
 * 
 * @param buffer - Buffer של הקובץ שהועלה
 * @param mimeType - MIME type של הקובץ
 * @returns אובייקט עם valid=true/false ושגיאה אם יש
 */
export function validateImageFile(
  buffer: Buffer, 
  mimeType: string
): { valid: boolean; error?: string } {
  
  // בדיקת גודל buffer
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Buffer is empty' };
  }
  
  // בדיקת גודל קובץ
  if (buffer.length > IMAGE_PROCESSING_CONFIG.maxFileSize) {
    const maxSizeMB = IMAGE_PROCESSING_CONFIG.maxFileSize / 1024 / 1024;
    return { 
      valid: false, 
      error: `File size exceeds ${maxSizeMB}MB limit` 
    };
  }
  
  // בדיקת MIME type
  if (!(IMAGE_PROCESSING_CONFIG.allowedMimeTypes as readonly string[]).includes(mimeType)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed: ${IMAGE_PROCESSING_CONFIG.allowedMimeTypes.join(', ')}` 
    };
  }
  
  return { valid: true };
}

/**
 * Logging של configuration
 */
console.log('🎨 Image Processing Configuration:', {
  sizes: Object.keys(IMAGE_SIZES),
  format: IMAGE_PROCESSING_CONFIG.format,
  quality: IMAGE_PROCESSING_CONFIG.quality,
  maxFileSize: `${IMAGE_PROCESSING_CONFIG.maxFileSize / 1024 / 1024}MB`,
});
