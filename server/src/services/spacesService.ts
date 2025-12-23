/**
 * 🗄️ DigitalOcean Spaces Service
 * 
 * שירות זה מטפל בכל פעולות האחסון ב-DigitalOcean Spaces:
 * - העלאת קבצים
 * - מחיקת קבצים
 * - קבלת URLs
 * 
 * @module spacesService
 * @requires @aws-sdk/client-s3
 */

import { 
  PutObjectCommand, 
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  PutObjectCommandInput 
} from '@aws-sdk/client-s3';
import { spacesClient, SPACES_CONFIG } from '../config/spacesConfig';

/**
 * העלאת buffer בודד ל-DigitalOcean Spaces
 * 
 * @param buffer - Buffer של הקובץ להעלאה
 * @param key - Path בתוך ה-bucket (דוגמה: products/abc123/thumbnail.webp)
 * @param contentType - MIME type (ברירת מחדל: image/webp)
 * @returns CDN URL של הקובץ שהועלה
 * 
 * @throws {Error} אם ההעלאה נכשלה
 * 
 * @example
 * const imageBuffer = await sharp(originalBuffer).webp().toBuffer();
 * const url = await uploadToSpaces(imageBuffer, 'products/123/thumb.webp');
 */
export async function uploadToSpaces(
  buffer: Buffer,
  key: string,
  contentType: string = 'image/webp'
): Promise<string> {
  try {
    // Validation של input
    if (!buffer || buffer.length === 0) {
      throw new Error('Buffer is empty or undefined');
    }

    if (!key || key.trim() === '') {
      throw new Error('Key must be a non-empty string');
    }

    console.log(`📤 Uploading to Spaces: ${key} (${(buffer.length / 1024).toFixed(2)} KB)`);

    // הגדרת פרמטרים להעלאה
    const uploadParams: PutObjectCommandInput = {
      Bucket: SPACES_CONFIG.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read', // תמונות ציבוריות - גישה לכולם
      CacheControl: 'public, max-age=31536000', // Cache למשך שנה (תמונות לא משתנות)
    };

    // ביצוע ההעלאה
    const command = new PutObjectCommand(uploadParams);
    await spacesClient.send(command);

    // בניית CDN URL
    const cdnUrl = `${SPACES_CONFIG.cdnUrl}/${key}`;

    console.log(`✅ Upload successful: ${cdnUrl}`);

    return cdnUrl;

  } catch (error) {
    console.error(`❌ Upload failed for key: ${key}`, error);
    
    // Error handling מפורש
    if (error instanceof Error) {
      throw new Error(`Failed to upload to Spaces: ${error.message}`);
    }
    
    throw new Error('Unknown error occurred during upload to Spaces');
  }
}

/**
 * מחיקת קובץ בודד מ-DigitalOcean Spaces
 * 
 * @param key - Path של הקובץ למחוק
 * @returns true אם המחיקה הצליחה
 * 
 * @throws {Error} אם המחיקה נכשלה
 * 
 * @example
 * await deleteFromSpaces('products/123/old-image.webp');
 */
export async function deleteFromSpaces(key: string): Promise<boolean> {
  try {
    if (!key || key.trim() === '') {
      throw new Error('Key must be a non-empty string');
    }

    console.log(`🗑️ Deleting from Spaces: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: SPACES_CONFIG.bucket,
      Key: key,
    });

    await spacesClient.send(command);

    console.log(`✅ Delete successful: ${key}`);
    return true;

  } catch (error) {
    console.error(`❌ Delete failed for key: ${key}`, error);
    
    if (error instanceof Error) {
      throw new Error(`Failed to delete from Spaces: ${error.message}`);
    }
    
    throw new Error('Unknown error occurred during delete from Spaces');
  }
}

/**
 * מחיקת מספר קבצים בבת אחת (bulk delete)
 * 
 * @param keys - מערך של paths למחוק
 * @returns מספר הקבצים שנמחקו בהצלחה
 * 
 * @example
 * await deleteBulkFromSpaces([
 *   'products/123/thumb.webp',
 *   'products/123/medium.webp',
 *   'products/123/large.webp'
 * ]);
 */
export async function deleteBulkFromSpaces(keys: string[]): Promise<number> {
  try {
    if (!keys || keys.length === 0) {
      console.warn('⚠️ No keys provided for bulk delete');
      return 0;
    }

    console.log(`🗑️ Bulk deleting ${keys.length} files from Spaces`);

    // DeleteObjects תומך עד 1000 קבצים בבת אחת
    const command = new DeleteObjectsCommand({
      Bucket: SPACES_CONFIG.bucket,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
        Quiet: false, // נרצה לקבל דיווח על כל קובץ
      },
    });

    const response = await spacesClient.send(command);

    const deletedCount = response.Deleted?.length || 0;
    const errorCount = response.Errors?.length || 0;

    if (errorCount > 0) {
      console.error(`⚠️ ${errorCount} files failed to delete:`, response.Errors);
    }

    console.log(`✅ Bulk delete successful: ${deletedCount}/${keys.length} files deleted`);

    return deletedCount;

  } catch (error) {
    console.error('❌ Bulk delete failed:', error);
    
    if (error instanceof Error) {
      throw new Error(`Failed bulk delete from Spaces: ${error.message}`);
    }
    
    throw new Error('Unknown error occurred during bulk delete from Spaces');
  }
}

/**
 * בדיקה אם קובץ קיים ב-Spaces
 * 
 * @param key - Path של הקובץ לבדוק
 * @returns true אם הקובץ קיים
 * 
 * @example
 * const exists = await fileExistsInSpaces('products/123/thumb.webp');
 */
export async function fileExistsInSpaces(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: SPACES_CONFIG.bucket,
      Key: key,
    });

    await spacesClient.send(command);
    return true;

  } catch (error: any) {
    // אם הקובץ לא קיים, נקבל NotFound error
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }

    // שגיאה אחרת - זרוק
    throw error;
  }
}

/**
 * בניית CDN URL מ-key
 * 
 * @param key - Path בתוך ה-bucket
 * @returns CDN URL מלא
 * 
 * @example
 * const url = buildCdnUrl('products/123/thumb.webp');
 * // Returns: https://ismoke-images.fra1.cdn.digitaloceanspaces.com/products/123/thumb.webp
 */
export function buildCdnUrl(key: string): string {
  if (!key) return '';
  return `${SPACES_CONFIG.cdnUrl}/${key}`;
}
