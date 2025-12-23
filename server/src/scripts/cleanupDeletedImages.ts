import cron from 'node-cron';
import { cleanupTempImages } from './cleanupTempImages';
// ✅ permanentlyDeleteMarkedImages and detectBrokenImages removed - not needed with DigitalOcean Spaces (hard delete only)

/**
 * Cron Jobs - ניקוי תמונות אוטומטי
 * מריץ ניקוי temp images בלבד
 */
export const scheduleImageCleanup = () => {
  // ניקוי #1: Soft-deleted images - REMOVED (שדה החדש לא תומך ב-soft delete)
  
  // ניקוי #2: Temp images (7+ ימים) - שבועי ב-03:00 (ימי ראשון)
  cron.schedule('0 3 * * 0', async () => {
    console.log('⏰ [Cron] Starting weekly temp images cleanup...');
    
    try {
      const result = await cleanupTempImages();
      console.log(`✅ [Cron] Temp cleanup completed. Deleted: ${result.deletedCount}`);
      
      if (result.deletedImages.length > 0) {
        console.log('📋 Deleted images:', result.deletedImages);
      }
    } catch (error) {
      console.error('❌ [Cron] Temp cleanup failed:', error);
    }
  });
  
  // זיהוי #3: Broken images - REMOVED (Cloudinary specific)
  
  console.log('⏰ Image cleanup job scheduled:');
  console.log('   - Temp images: Weekly (Sunday) at 03:00');
};
