/**
 * 🖼️ Phase 1.4: Image Upload Middleware (Multer + Cloudinary)
 * 
 * מטרה: העלאת תמונות מאובטחת ומוגבלת
 * - Rate limiting (10 uploads ב-60 שניות)
 * - File type validation (רק תמונות)
 * - File size validation (מקסימום 5MB)
 * - Upload ל-Cloudinary עם optimization
 * - שמירת public_id לצורך מחיקה עתידית
 */

import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// ============================================================================
// הגדרת Cloudinary
// ============================================================================

// טעינת configuration מ-.env (lazy initialization)
let cloudinaryConfigured = false;

const initCloudinary = () => {
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinaryConfigured = true;
    console.log('✅ Cloudinary configured successfully');
  }
};

// ============================================================================
// Multer Configuration
// ============================================================================

// אחסון זיכרון זמני (לא שומרים בדיסק)
const storage = multer.memoryStorage();

// פילטר לסוגי קבצים מותרים
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // רק תמונות
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // קובץ תקין
  } else {
    cb(
      new Error(
        `סוג קובץ לא נתמך: ${file.mimetype}. רק תמונות מותרות (JPEG, PNG, GIF, WebP)`
      )
    );
  }
};

// הגדרת multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB מקסימום
    files: 10, // מקסימום 10 קבצים בבקשה אחת
  },
});

// ============================================================================
// Middleware להעלאת תמונות מוצר (מקסימום 10)
// ============================================================================

/**
 * Middleware להעלאת עד 10 תמונות למוצר
 * שימוש: router.post('/upload', uploadProductImages, controller)
 */
export const uploadProductImages = upload.array('images', 10);

// ============================================================================
// Middleware להעלאת תמונה בודדת
// ============================================================================

/**
 * Middleware להעלאת תמונה בודדת
 * שימוש: router.post('/upload-single', uploadSingleImage, controller)
 */
export const uploadSingleImage = upload.single('image');

// ============================================================================
// פונקציות עזר ל-Cloudinary Upload
// ============================================================================

/**
 * ממשק אופציות העלאה - תומך במבנה Folders היררכי
 */
export interface UploadOptions {
  buffer: Buffer;
  folder?: string;           // תיקייה כללית (ברירת מחדל: 'products')
  category?: string;         // קטגוריה (electronics, clothing)
  productId?: string;        // מזהה מוצר
  sku?: string;             // SKU של וריאנט
  isVariant?: boolean;      // האם זו תמונת וריאנט
  filename?: string;        // שם קובץ (main_0, front, back)
  tags?: string[];          // תגיות (נוסיף ב-Phase 2)
}

/**
 * העלאת Buffer ל-Cloudinary עם מבנה Folders היררכי
 * מחזיר: { url, public_id, width, height, format }
 */
export const uploadBufferToCloudinary = (
  options: UploadOptions
): Promise<{
  url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}> => {
  initCloudinary(); // וידוא שCloudinary מוגדר

  // בניית מבנה Folders היררכי - עם ברירת מחדל ל-folder
  const {
    buffer,
    folder = 'products', // ברירת מחדל: 'products'
    category,
    productId,
    sku,
    isVariant,
    filename
  } = options;
  
  let hierarchicalFolder = folder;
  
  // אם יש קטגוריה - הוסף אותה לתיקייה
  if (category) {
    hierarchicalFolder = `${hierarchicalFolder}/${category}`;
  }
  
  // אם יש productId - הוסף אותו לתיקייה
  if (productId) {
    hierarchicalFolder = `${hierarchicalFolder}/${productId}`;
  }
  
  // אם זו תמונת וריאנט - הוסף תת-תיקיית variants
  if (isVariant && sku) {
    hierarchicalFolder = `${hierarchicalFolder}/variants/${sku}`;
  }
  
  // בניית public_id עם filename אופציונלי
  const publicId = filename ? `${filename}_${Date.now()}` : undefined;

  // בניית מערך Tags אוטומטי
  const uploadTags: string[] = ['product']; // תגית בסיסית לכל תמונה
  
  // הוספת תגית קטגוריה
  if (category) {
    uploadTags.push(`category:${category}`);
  }
  
  // הוספת תגית product-id
  if (productId) {
    uploadTags.push(`product-id:${productId}`);
  }
  
  // הוספת תגית shared או variant
  if (isVariant) {
    uploadTags.push('variant');
    // אם יש SKU - הוסף תגית sku
    if (sku) {
      uploadTags.push(`sku:${sku}`);
    }
  } else {
    uploadTags.push('shared');
  }
  
  // שילוב עם tags מותאמים אישית (אם נשלחו)
  if (options.tags && options.tags.length > 0) {
    uploadTags.push(...options.tags);
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: hierarchicalFolder, // תיקייה היררכית ב-Cloudinary
        public_id: publicId, // אופציונלי - שם ייחודי
        resource_type: 'image',
        tags: uploadTags, // תגיות אוטומטיות
        // אופטימיזציה אוטומטית
        transformation: [
          { quality: 'auto:good' }, // איכות אוטומטית
          { fetch_format: 'auto' }, // פורמט אוטומטי (WebP אם נתמך)
        ],
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          return reject(new Error(`שגיאה בהעלאת תמונה: ${error.message}`));
        }

        if (!result) {
          return reject(new Error('שגיאה לא צפויה בהעלאת תמונה'));
        }

        // לוג הצלחה עם פרטי התמונה והתגיות
        console.log('✅ Image uploaded successfully:', {
          public_id: result.public_id,
          folder: hierarchicalFolder,
          tags: uploadTags,
          size: `${result.width}x${result.height}`,
          format: result.format
        });

        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );

    // המרת Buffer ל-Stream והעלאה
    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
};

/**
 * העלאת מערך קבצים ל-Cloudinary (מקבילי) עם תמיכה במבנה היררכי
 * מחזיר: Array של { url, public_id, width, height, format }
 */
export const uploadMultipleBuffersToCloudinary = async (
  files: Express.Multer.File[],
  options: Omit<UploadOptions, 'buffer' | 'filename'>
): Promise<
  Array<{
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
  }>
> => {
  const uploadPromises = files.map((file, index) =>
    uploadBufferToCloudinary({
      buffer: file.buffer,
      filename: file.originalname || `image_${index}`,
      ...options
    })
  );

  return Promise.all(uploadPromises);
};

/**
 * מחיקת תמונה מ-Cloudinary לפי public_id
 */
export const deleteImageFromCloudinary = async (
  publicId: string
): Promise<void> => {
  initCloudinary();

  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary delete failed: ${result.result}`);
    }

    console.log(`🗑️ Image deleted from Cloudinary: ${publicId}`);
  } catch (error: any) {
    console.error('❌ Error deleting image from Cloudinary:', error);
    // לא זורקים שגיאה - מחיקה שנכשלת לא תעצור את התהליך
  }
};

/**
 * מחיקת מספר תמונות מ-Cloudinary (מקבילי)
 */
export const deleteMultipleImagesFromCloudinary = async (
  publicIds: string[]
): Promise<void> => {
  initCloudinary();

  try {
    const deletePromises = publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId).catch((error) => {
        console.error(`❌ Failed to delete ${publicId}:`, error.message);
        return { result: 'error' }; // ממשיכים גם אם מחיקה אחת נכשלה
      })
    );

    await Promise.all(deletePromises);
    console.log(`🗑️ Deleted ${publicIds.length} images from Cloudinary`);
  } catch (error: any) {
    console.error('❌ Error in bulk delete:', error);
  }
};

/**
 * חילוץ public_id מ-URL של Cloudinary
 * דוגמה: https://res.cloudinary.com/dnhcki0qi/image/upload/v1234/products/abc123.jpg
 * מחזיר: products/abc123
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    const regex = /\/upload\/(?:v\d+\/)?(.+?)\.\w+$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error('❌ Error extracting public_id:', error);
    return null;
  }
};

/**
 * חילוץ public_ids ממערך URLs
 */
export const extractPublicIdsFromUrls = (urls: string[]): string[] => {
  return urls
    .map((url) => extractPublicIdFromUrl(url))
    .filter((id): id is string => id !== null);
};

// ============================================================================
// Middleware לטיפול בשגיאות העלאה
// ============================================================================

/**
 * Error handler ל-Multer errors
 */
export const handleUploadErrors = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    // שגיאות Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'גודל הקובץ חורג מהמותר (מקסימום 5MB)',
        error: err.message,
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'מספר הקבצים חורג מהמותר (מקסימום 10 תמונות)',
        error: err.message,
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'שדה קובץ לא צפוי',
        error: err.message,
      });
    }

    // שגיאת Multer כללית
    return res.status(400).json({
      success: false,
      message: 'שגיאה בהעלאת קובץ',
      error: err.message,
    });
  }

  // שגיאה כללית (כולל file filter)
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'שגיאה בהעלאת קובץ',
    });
  }

  next();
};

// ============================================================================
// קטגוריות מותרות - למניעת שבירת מבנה Folders
// ============================================================================

const VALID_CATEGORIES = [
  'electronics',
  'clothing',
  'home-garden',
  'sports',
  'toys',
  'books',
  'beauty',
  'automotive',
];

// מקסימום קבצים בהעלאה אחת - למניעת העלאת מעל לכמות סבירה
const MAX_FILES = 10;

// ============================================================================
// Controller Example - Upload Product Images
// ============================================================================

/**
 * Controller להעלאת תמונות מוצר עם מבנה Folders היררכי
 * POST /api/products/upload-images
 * Body (multipart/form-data): 
 *   - images: File[]
 *   - category?: string
 *   - productId?: string
 *   - sku?: string
 *   - isVariant?: boolean
 * 
 * דוגמה לשימוש:
 * router.post('/upload-images', 
 *   requireAdmin, 
 *   uploadLimiter, 
 *   uploadProductImages, 
 *   handleUploadErrors,
 *   uploadProductImagesController
 * );
 */
export const uploadProductImagesController = async (
  req: Request,
  res: Response
) => {
  try {
    // בדיקה שהועלו קבצים
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'לא הועלו תמונות',
      });
    }

    // בדיקת מקסימום קבצים
    if (req.files.length > MAX_FILES) {
      return res.status(400).json({
        success: false,
        message: `ניתן להעלות עד ${MAX_FILES} תמונות בו זמנית`,
      });
    }

    // קבלת פרמטרים מה-body
    const { category, productId, sku, isVariant } = req.body;

    // לוג למעקב אחרי העלאות
    console.log(
      `📤 [Upload] קטגוריה: ${category || 'ללא'}, מוצר: ${productId || 'חדש'}, ` +
      `SKU: ${sku || 'ללא'}, וריאנט: ${isVariant ? 'כן' : 'לא'}, קבצים: ${req.files.length}`
    );

    // ולידציה של קטגוריה (אם הועברה)
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `קטגוריה לא חוקית. קטגוריות מותרות: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    // העלאה ל-Cloudinary עם מבנה היררכי
    const uploadResults = await uploadMultipleBuffersToCloudinary(
      req.files as Express.Multer.File[],
      {
        folder: 'products',
        category,
        productId,
        sku,
        isVariant: isVariant === 'true' || isVariant === true,
      }
    );

    // החזרת התוצאות (כולל public_id לשמירה ב-DB!)
    res.json({
      success: true,
      message: `${uploadResults.length} תמונות הועלו בהצלחה`,
      data: uploadResults,
    });
  } catch (error: any) {
    console.error('❌ Error in uploadProductImagesController:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בהעלאת התמונות',
      error: error.message,
    });
  }
};

// ============================================================================
// Export All
// ============================================================================

export default {
  uploadProductImages,
  uploadSingleImage,
  uploadBufferToCloudinary,
  uploadMultipleBuffersToCloudinary,
  deleteImageFromCloudinary,
  deleteMultipleImagesFromCloudinary,
  extractPublicIdFromUrl,
  extractPublicIdsFromUrls,
  handleUploadErrors,
  uploadProductImagesController,
};
