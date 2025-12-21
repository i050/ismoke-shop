import { v2 as cloudinary } from 'cloudinary';

/**
 * ניקוי תמונות temp_ שיותר מ-7 יום
 * פותר בעיה: משתמש מעלה תמונות אבל לא שומר את המוצר
 */
export const cleanupTempImages = async (): Promise<{
  deletedCount: number;
  deletedImages: string[];
}> => {
  console.log('🧹 Starting temp images cleanup...');
  
  const deletedImages: string[] = [];
  let deletedCount = 0;
  
  try {
    // חישוב תאריך של 7 ימים אחורה
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const timestampLimit = Math.floor(sevenDaysAgo.getTime() / 1000);
    
    // חיפוש תמונות עם prefix "temp_" בכל התיקיות
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'products/', // מחפש בתיקיית products
      max_results: 500,
      resource_type: 'image'
    });
    
    console.log(`📊 Found ${result.resources.length} images in products folder`);
    
    // סינון תמונות temp_ ישנות
    for (const resource of result.resources) {
      const publicId = resource.public_id;
      
      // בדיקה אם זה temp_ image
      if (publicId.includes('temp_')) {
        // חילוץ timestamp מה-public_id
        const match = publicId.match(/temp_(\d+)/);
        
        if (match) {
          const imageTimestamp = parseInt(match[1], 10);
          const imageTimestampSeconds = Math.floor(imageTimestamp / 1000); // המרה לשניות
          
          // בדיקה אם התמונה ישנה מ-7 ימים
          if (imageTimestampSeconds < timestampLimit) {
            try {
              // מחיקת התמונה מCloudinary
              await cloudinary.uploader.destroy(publicId);
              
              deletedImages.push(publicId);
              deletedCount++;
              
              console.log(`🗑️ Deleted temp image: ${publicId}`);
            } catch (deleteError) {
              console.error(`❌ Failed to delete ${publicId}:`, deleteError);
            }
          }
        }
      }
    }
    
    console.log(`✅ Cleanup completed. Deleted ${deletedCount} temp images.`);
    
    return {
      deletedCount,
      deletedImages
    };
    
  } catch (error) {
    console.error('❌ Error in cleanupTempImages:', error);
    
    return {
      deletedCount: 0,
      deletedImages: []
    };
  }
};
