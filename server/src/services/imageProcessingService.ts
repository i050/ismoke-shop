/**
 * 🖼️ Image Processing Service
 * 
 * שירות זה מטפל בעיבוד תמונות עם Sharp:
 * - Resize ל-3 גדלים (thumbnail, medium, large)
 * - המירה ל-WebP
 * - אופטימיזציה של איכות
 * - העלאה ל-DigitalOcean Spaces
 * 
 * @module imageProcessingService
 * @requires sharp
 */

import sharp from 'sharp';
import { uploadToSpaces } from './spacesService';
import { 
  IMAGE_SIZES, 
  IMAGE_PROCESSING_CONFIG,
  ImageSize,
  validateImageFile 
} from '../config/imageConfig';

/**
 * תוצאת עיבוד תמונה
 */
export interface ProcessedImage {
  thumbnail: string;
  medium: string;
  large: string;
  key: string;
  format: string;
  uploadedAt: Date;
}

/**
 * עיבוד והעלאה של תמונה בודדת
 * 
 * @param buffer - Buffer של התמונה המקורית
 * @param filename - שם הקובץ המקורי
 * @param productId - מזהה המוצר (לשם בניית path)
 * @param mimeType - MIME type של הקובץ
 * @returns אובייקט ProcessedImage עם כל ה-URLs
 * 
 * @throws {Error} אם Validation נכשל או העיבוד נכשל
 * 
 * @example
 * const result = await processAndUploadImage(
 *   req.file.buffer,
 *   req.file.originalname,
 *   'product-abc-123',
 *   'image/jpeg'
 * );
 * // result.thumbnail: "https://...thumbnail.webp"
 * // result.medium: "https://...medium.webp"
 * // result.large: "https://...large.webp"
 */
export async function processAndUploadImage(
  buffer: Buffer,
  filename: string,
  productId: string,
  mimeType: string = 'image/jpeg'
): Promise<ProcessedImage> {
  
  console.log(`🎨 Processing image: ${filename} for product ${productId}`);
  
  // שלב 1: Validation
  const validation = validateImageFile(buffer, mimeType);
  if (!validation.valid) {
    throw new Error(`Image validation failed: ${validation.error}`);
  }
  
  // שלב 2: בניית base key (path ב-Spaces)
  // דוגמה: products/productabc123/1703347200000
  const sanitizedProductId = productId.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  const timestamp = Date.now();
  const baseKey = `products/${sanitizedProductId}/${timestamp}`;
  
  console.log(`📦 Base key: ${baseKey}`);
  
  try {
    // שלב 3: עיבוד 3 גדלים במקביל
    console.log(`⚙️ Processing 3 sizes in parallel...`);
    
    const [thumbnailUrl, mediumUrl, largeUrl] = await Promise.all([
      processSize(buffer, 'thumbnail', baseKey),
      processSize(buffer, 'medium', baseKey),
      processSize(buffer, 'large', baseKey),
    ]);
    
    console.log(`✅ All sizes processed and uploaded successfully`);
    
    // שלב 4: החזרת התוצאה
    return {
      thumbnail: thumbnailUrl,
      medium: mediumUrl,
      large: largeUrl,
      key: baseKey,
      format: IMAGE_PROCESSING_CONFIG.format,
      uploadedAt: new Date(),
    };
    
  } catch (error) {
    console.error(`❌ Image processing failed for ${filename}:`, error);
    
    if (error instanceof Error) {
      throw new Error(`Failed to process image: ${error.message}`);
    }
    
    throw new Error('Unknown error occurred during image processing');
  }
}

/**
 * עיבוד גודל בודד
 * 
 * @param buffer - Buffer מקורי
 * @param size - גודל מבוקש (thumbnail/medium/large)
 * @param baseKey - Base path ב-Spaces
 * @returns CDN URL של הקובץ שהועלה
 */
async function processSize(
  buffer: Buffer,
  size: ImageSize,
  baseKey: string
): Promise<string> {
  
  const sizeConfig = IMAGE_SIZES[size];
  const key = `${baseKey}-${sizeConfig.suffix}.${IMAGE_PROCESSING_CONFIG.format}`;
  
  console.log(`  📐 Processing ${size}: ${sizeConfig.width}×${sizeConfig.height}`);
  
  try {
    // עיבוד התמונה עם Sharp
    const processedBuffer = await sharp(buffer)
      // Resize עם fit: 'cover' - ימלא את כל הגודל תוך שמירה על יחס גובה-רוחב
      .resize(sizeConfig.width, sizeConfig.height, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: false, // גם אם התמונה קטנה, תגדל אותה
      })
      // המרה לפורמט מבוקש (WebP/JPEG/PNG)
      .toFormat(IMAGE_PROCESSING_CONFIG.format, {
        quality: IMAGE_PROCESSING_CONFIG.quality,
        effort: 6, // WebP compression effort (0-6, יותר גבוה = דחיסה טובה יותר אבל איטית יותר)
      })
      // הסרת metadata (EXIF) לחיסכון בגודל
      .withMetadata(IMAGE_PROCESSING_CONFIG.keepMetadata ? {} : undefined)
      // background לתמונות עם שקיפות (Alpha channel)
      .flatten({ background: IMAGE_PROCESSING_CONFIG.backgroundColor })
      // המרה ל-Buffer
      .toBuffer();
    
    console.log(`  ✓ Processed ${size}: ${(processedBuffer.length / 1024).toFixed(2)} KB`);
    
    // העלאה ל-Spaces
    const url = await uploadToSpaces(
      processedBuffer, 
      key, 
      `image/${IMAGE_PROCESSING_CONFIG.format}`
    );
    
    console.log(`  ✅ Uploaded ${size}: ${url}`);
    
    return url;
    
  } catch (error) {
    console.error(`  ❌ Failed to process ${size}:`, error);
    throw error;
  }
}

/**
 * עיבוד והעלאה של מספר תמונות בבת אחת
 * 
 * @param images - מערך של אובייקטים עם buffer + filename
 * @param productId - מזהה המוצר
 * @returns מערך של ProcessedImage
 * 
 * @example
 * const results = await processAndUploadMultipleImages(
 *   req.files.map(f => ({ buffer: f.buffer, filename: f.originalname, mimeType: f.mimetype })),
 *   'product-abc-123'
 * );
 */
export async function processAndUploadMultipleImages(
  images: Array<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }>,
  productId: string
): Promise<ProcessedImage[]> {
  
  console.log(`🎨 Processing ${images.length} images for product ${productId}`);
  
  try {
    // עיבוד כל התמונות במקביל
    const results = await Promise.all(
      images.map(img => 
        processAndUploadImage(img.buffer, img.filename, productId, img.mimeType)
      )
    );
    
    console.log(`✅ All ${images.length} images processed successfully`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to process multiple images:', error);
    throw error;
  }
}

/**
 * קבלת מידע על תמונה (metadata) ללא עיבוד
 * 
 * @param buffer - Buffer של התמונה
 * @returns אובייקט עם metadata
 * 
 * @example
 * const info = await getImageMetadata(buffer);
 * console.log(info.width, info.height, info.format);
 */
export async function getImageMetadata(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    
    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      size: buffer.length,
    };
    
  } catch (error) {
    console.error('❌ Failed to get image metadata:', error);
    throw error;
  }
}
