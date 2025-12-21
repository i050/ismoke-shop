import cron from 'node-cron';
import { permanentlyDeleteMarkedImages } from '../services/productService';
import { cleanupTempImages } from './cleanupTempImages';
import { detectBrokenImages } from './detectBrokenImages';

/**
 * Cron Jobs - ניקוי תמונות אוטומטי + זיהוי תמונות שבורות
 * מריץ 3 משימות בזמנים שונים
 */
export const scheduleImageCleanup = () => {
  // ניקוי #1: Soft-deleted images (30+ ימים) - יומי ב-02:00
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ [Cron] Starting daily soft-deleted images cleanup...');
    
    try {
      const deletedCount = await permanentlyDeleteMarkedImages();
      console.log(`✅ [Cron] Soft-deleted cleanup completed. Deleted: ${deletedCount}`);
    } catch (error) {
      console.error('❌ [Cron] Soft-deleted cleanup failed:', error);
    }
  });
  
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
  
  // זיהוי #3: Broken images - יומי ב-04:00
  cron.schedule('0 4 * * *', async () => {
    console.log('⏰ [Cron] Starting daily broken images detection...');
    
    try {
      const result = await detectBrokenImages();
      console.log(`✅ [Cron] Broken images detection completed. Found: ${result.brokenCount}`);
      
      if (result.brokenCount > 0) {
        console.log('⚠️ [Cron] Broken images detected! Check logs for details.');
      }
    } catch (error) {
      console.error('❌ [Cron] Broken images detection failed:', error);
    }
  });
  
  console.log('⏰ Image cleanup jobs scheduled:');
  console.log('   - Soft-deleted images: Daily at 02:00');
  console.log('   - Temp images: Weekly (Sunday) at 03:00');
  console.log('   - Broken images detection: Daily at 04:00');
};
