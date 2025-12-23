/**
 * 🖼️ Image Controller
 * 
 * Controller להעלאה ועיבוד תמונות
 * - מטפל ב-upload של מוצרים
 * - עיבוד עם Sharp
 * - העלאה ל-DigitalOcean Spaces
 * 
 * @module imageController
 */

import { Request, Response } from 'express';
import { processAndUploadImage } from '../services/imageProcessingService';

/**
 * Controller להעלאת תמונות מוצר
 * 
 * Route: POST /api/products/upload-images
 * Middleware: authMiddleware, requireAdmin, uploadLimiter, uploadProductImages (Multer)
 * 
 * מקבל: Array של files (עד 10 תמונות)
 * מחזיר: Array של ProcessedImage objects
 * 
 * @param req - Express Request עם req.files (Multer)
 * @param res - Express Response
 * 
 * Response format:
 * {
 *   success: true,
 *   data: [
 *     {
 *       thumbnail: "https://...",
 *       medium: "https://...",
 *       large: "https://...",
 *       key: "products/abc/123",
 *       format: "webp",
 *       uploadedAt: "2025-12-23T..."
 *     }
 *   ]
 * }
 */
export const uploadProductImagesController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // בדיקה שיש קבצים
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'לא התקבלו קבצים להעלאה',
      });
      return;
    }
    
    console.log(`📤 Upload request: ${files.length} images`);
    
    // עיבוד כל התמונות במקביל
    const uploadPromises = files.map((file, index) => {
      // יצירת productId זמני (ניתן להעביר בגוף הבקשה במקום)
      const productId = `temp-${Date.now()}-${index}`;
      
      return processAndUploadImage(
        file.buffer,
        file.originalname,
        productId,
        file.mimetype
      );
    });
    
    const results = await Promise.all(uploadPromises);
    
    console.log(`✅ Upload completed: ${results.length} images processed`);
    
    // החזרת התוצאות
    res.status(200).json({
      success: true,
      data: results,
    });
    
  } catch (error) {
    console.error('❌ Error in uploadProductImagesController:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'שגיאה בהעלאת תמונות',
    });
  }
};

/**
 * Controller להעלאת תמונה בודדת
 * 
 * Route: POST /api/products/upload-single-image
 * 
 * מקבל: File בודד
 * מחזיר: ProcessedImage object
 */
export const uploadSingleImageController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const file = req.file;
    
    if (!file) {
      res.status(400).json({
        success: false,
        error: 'לא התקבל קובץ להעלאה',
      });
      return;
    }
    
    console.log(`📤 Upload single image: ${file.originalname}`);
    
    // יצירת productId זמני
    const productId = `temp-${Date.now()}`;
    
    const result = await processAndUploadImage(
      file.buffer,
      file.originalname,
      productId,
      file.mimetype
    );
    
    console.log(`✅ Single image uploaded successfully`);
    
    res.status(200).json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error('❌ Error in uploadSingleImageController:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'שגיאה בהעלאת תמונה',
    });
  }
};
