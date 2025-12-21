import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

/**
 * 🛡️ Phase 0.5.9: Image Service with Rollback Strategy
 * 
 * Purpose:
 * - Upload images to Cloudinary
 * - Delete images from Cloudinary
 * - Rollback strategy: If product creation fails, delete uploaded images
 * - Prevent orphaned files in cloud storage
 * 
 * Critical for Production:
 * - Prevents storage waste (images without products)
 * - Maintains clean Cloudinary account
 * - Ensures data integrity between DB and storage
 */

/**
 * Initialize Cloudinary configuration
 * Called lazily to ensure environment variables are loaded
 */
function initCloudinary() {
  if (!cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

/**
 * Upload single image to Cloudinary
 * @param buffer - Image file buffer
 * @param folder - Cloudinary folder (default: 'products')
 * @param publicId - Optional custom public_id
 * @returns Upload result with URL and public_id
 */
export async function uploadImage(
  buffer: Buffer,
  folder: string = 'products',
  publicId?: string
): Promise<UploadApiResponse> {
  initCloudinary(); // Ensure Cloudinary is configured

  // Validate configuration
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      'Cloudinary credentials missing! Check CLOUDINARY_* environment variables.'
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        // Optimization settings
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload failed:', error);
          reject(error);
        } else if (result) {
          console.log('✅ Image uploaded:', result.public_id);
          resolve(result);
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
}

/**
 * Upload multiple images to Cloudinary
 * @param buffers - Array of image file buffers
 * @param folder - Cloudinary folder
 * @returns Array of upload results
 */
export async function uploadImages(
  buffers: Buffer[],
  folder: string = 'products'
): Promise<UploadApiResponse[]> {
  const uploadPromises = buffers.map((buffer) =>
    uploadImage(buffer, folder)
  );

  try {
    const results = await Promise.all(uploadPromises);
    console.log(`✅ Uploaded ${results.length} images to Cloudinary`);
    return results;
  } catch (error) {
    console.error('❌ Batch upload failed:', error);
    throw error;
  }
}

/**
 * Delete single image from Cloudinary
 * @param publicId - Cloudinary public_id (e.g., 'products/abc123')
 * @returns Deletion result
 */
export async function deleteImage(publicId: string): Promise<void> {
  initCloudinary(); // Ensure Cloudinary is configured

  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      console.log('✅ Image deleted:', publicId);
    } else if (result.result === 'not found') {
      console.warn('⚠️  Image not found (already deleted?):', publicId);
    } else {
      console.warn('⚠️  Unexpected delete result:', result);
    }
  } catch (error) {
    console.error('❌ Failed to delete image:', publicId, error);
    // Don't throw - deletion failures shouldn't break the app
  }
}

/**
 * Delete multiple images from Cloudinary
 * @param publicIds - Array of Cloudinary public_ids
 */
export async function deleteImages(publicIds: string[]): Promise<void> {
  if (!publicIds || publicIds.length === 0) {
    return;
  }

  const deletePromises = publicIds.map((publicId) => deleteImage(publicId));

  try {
    await Promise.allSettled(deletePromises); // Don't fail if some deletions fail
    console.log(`✅ Deleted ${publicIds.length} images from Cloudinary`);
  } catch (error) {
    console.error('❌ Batch delete failed:', error);
  }
}

/**
 * Extract Cloudinary public_id from URL
 * @param url - Cloudinary image URL
 * @returns public_id or null
 * 
 * Example:
 * Input: "https://res.cloudinary.com/dnhcki0qi/image/upload/v1234567890/products/abc123.jpg"
 * Output: "products/abc123"
 */
export function extractPublicId(url: string): string | null {
  try {
    // Match Cloudinary URL pattern: /upload/{version}/{folder}/{filename}
    const match = url.match(/\/upload\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp)$/i);

    if (match && match[1]) {
      return match[1]; // e.g., "products/abc123"
    }

    // Alternative pattern without version
    const altMatch = url.match(/\/upload\/(.+)\.(jpg|jpeg|png|gif|webp)$/i);
    if (altMatch && altMatch[1]) {
      return altMatch[1];
    }

    console.warn('⚠️  Could not extract public_id from URL:', url);
    return null;
  } catch (error) {
    console.error('❌ Error extracting public_id:', error);
    return null;
  }
}

/**
 * Extract multiple public_ids from array of URLs
 * @param urls - Array of Cloudinary URLs
 * @returns Array of public_ids (filters out nulls)
 */
export function extractPublicIds(urls: string[]): string[] {
  return urls
    .map((url) => extractPublicId(url))
    .filter((id): id is string => id !== null);
}

/**
 * 🎯 ROLLBACK STRATEGY - Image Upload Transaction
 * 
 * Use this pattern when creating/updating products:
 * 
 * ```typescript
 * // Track uploaded images
 * const uploadedImages: UploadApiResponse[] = [];
 * 
 * try {
 *   // 1. Upload images
 *   const imageBuffers = req.files.map(f => f.buffer);
 *   const results = await uploadImages(imageBuffers, 'products');
 *   uploadedImages.push(...results);
 * 
 *   const imageUrls = results.map(r => r.secure_url);
 * 
 *   // 2. Create product in database (with transaction)
 *   const product = await createProductWithSkus({
 *     ...productData,
 *     images: imageUrls
 *   });
 * 
 *   return product;
 * 
 * } catch (error) {
 *   // 3. ROLLBACK: Delete uploaded images if DB operation failed
 *   if (uploadedImages.length > 0) {
 *     const publicIds = uploadedImages.map(img => img.public_id);
 *     await deleteImages(publicIds);
 *     console.log('♻️  Rolled back uploaded images');
 *   }
 *   throw error;
 * }
 * ```
 */

export default {
  uploadImage,
  uploadImages,
  deleteImage,
  deleteImages,
  extractPublicId,
  extractPublicIds,
};
