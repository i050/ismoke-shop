/**
 * 🖼️ Image Upload Middleware (Multer + DigitalOcean Spaces)
 * 
 * מטרה: העלאת תמונות מאובטחת ומוגבלת
 * - File type validation (רק תמונות)
 * - File size validation (מקסימום 10MB)
 * - Memory storage - Sharp יעבד את ה-Buffer
 * - העלאה ל-DigitalOcean Spaces דרך imageProcessingService
 */

import multer from 'multer';
import { Request } from 'express';
import { IMAGE_PROCESSING_CONFIG } from '../config/imageConfig';

// ============================================================================
// Multer Configuration
// ============================================================================

/**
 * אחסון זיכרון זמני (MemoryStorage)
 * Sharp צריך Buffer לעיבוד, לא קובץ בדיסק
 */
const storage = multer.memoryStorage();

/**
 * פילטר לסוגי קבצים מותרים - רק תמונות
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // בדיקה מול הרשימה המוגדרת ב-imageConfig
  if (IMAGE_PROCESSING_CONFIG.allowedMimeTypes.includes(file.mimetype as any)) {
    cb(null, true); // קובץ תקין
  } else {
    cb(
      new Error(
        `סוג קובץ לא נתמך: ${file.mimetype}. מותרים: ${IMAGE_PROCESSING_CONFIG.allowedMimeTypes.join(', ')}`
      )
    );
  }
};

/**
 * הגדרת Multer עם הגבלות
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: IMAGE_PROCESSING_CONFIG.maxFileSize, // 10MB ברירת מחדל
    files: 10, // מקסימום 10 קבצים בבקשה אחת
  },
});

// ============================================================================
// Middleware Exports
// ============================================================================

/**
 * Middleware להעלאת עד 10 תמונות למוצר
 * מחזיר Array של files עם buffer
 * 
 * @example
 * router.post('/upload', uploadProductImages, async (req, res) => {
 *   const files = req.files as Express.Multer.File[];
 *   // files[0].buffer -> Buffer זמין לעיבוד
 * });
 */
export const uploadProductImages = upload.array('images', 10);

/**
 * Middleware להעלאת תמונה בודדת
 * מחזיר file בודד עם buffer
 * 
 * @example
 * router.post('/upload-single', uploadSingleImage, async (req, res) => {
 *   const file = req.file;
 *   // file.buffer -> Buffer זמין לעיבוד
 * });
 */
export const uploadSingleImage = upload.single('image');

// ============================================================================
// הערה: פונקציות העיבוד וההעלאה מתבצעות ב-imageProcessingService
// ============================================================================
