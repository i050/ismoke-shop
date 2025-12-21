import type { IImage } from '../types/Product';

/**
 * קבוע: תמונת placeholder עבור מוצרים ללא תמונה
 * התמונה מוצגת רק בממשק המשתמש ואינה חלק מנתוני המוצר
 */
export const PRODUCT_PLACEHOLDER_IMAGE = '/ismoke-placeholder.png';

/**
 * פונקציית עזר לקבלת URL מתמונה
 * Phase 1.4: תומכת גם ב-IImage object וגם ב-string (backward compatibility)
 * 
 * @param image - IImage object או string
 * @returns URL של התמונה
 */
export function getImageUrl(image: IImage | string | undefined): string {
  if (!image) {
    return PRODUCT_PLACEHOLDER_IMAGE;
  }
  
  // אם זה string - החזר ישירות
  if (typeof image === 'string') {
    return image;
  }
  
  // אם זה IImage object - החזר את ה-url
  return image.url || PRODUCT_PLACEHOLDER_IMAGE;
}

/**
 * פונקציית עזר להמרת מערך תמונות ל-URLs
 * Phase 1.4: תומכת בשני הפורמטים
 * 
 * @param images - מערך של IImage או string
 * @returns מערך של URLs
 */
export function getImageUrls(images: (IImage | string)[] | undefined): string[] {
  if (!images || images.length === 0) {
    return [PRODUCT_PLACEHOLDER_IMAGE];
  }
  
  return images.map(img => getImageUrl(img));
}

/**
 * פונקציית עזר לקבלת URL ברזולוציה גבוהה לזום
 * מוסיפה פרמטרים אופטימליים ל-Cloudinary או מחזירה את ה-URL המקורי
 * 
 * @param image - IImage object או string
 * @param options - אופציות להתאמת התמונה
 * @returns URL ברזולוציה גבוהה
 */
export function getHighResImageUrl(
  image: IImage | string | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:good' | 'auto:best';
    dpr?: number;
  } = {}
): string {
  const baseUrl = getImageUrl(image);
  
  // אם זה placeholder או URL חיצוני, מחזירים כמו שהוא
  if (baseUrl.startsWith('/placeholder') || !baseUrl.includes('cloudinary')) {
    return baseUrl;
  }
  
  // ברירות מחדל מומלצות לזום
  const { 
    width = 2048, 
    height = 2048, 
    quality = 'auto:good', 
    dpr = 2 
  } = options;
  
  try {
    // אם זה Cloudinary URL, מוסיפים טרנספורמציות
    if (baseUrl.includes('cloudinary.com')) {
      // מציאת נקודת ההכנסה של הטרנספורמציות (אחרי /upload/)
      const uploadIndex = baseUrl.indexOf('/upload/');
      if (uploadIndex !== -1) {
        const beforeUpload = baseUrl.substring(0, uploadIndex + 8); // כולל /upload/
        const afterUpload = baseUrl.substring(uploadIndex + 8);
        
        // בניית מחרוזת טרנספורמציות
        const transforms = [
          `w_${width}`,
          `h_${height}`,
          `q_${quality}`,
          `dpr_${dpr}`,
          'f_auto', // פורמט אוטומטי (WebP אם נתמך)
          'fl_progressive' // progressive loading
        ].join(',');
        
        return `${beforeUpload}${transforms}/${afterUpload}`;
      }
    }
  } catch (error) {
    console.warn('שגיאה בבניית URL ברזולוציה גבוהה:', error);
  }
  
  // fallback - מחזירים את ה-URL המקורי
  return baseUrl;
}

/**
 * פונקציה אסינכרונית לטעינה מוקדמת (preload) של תמונה
 * מחזירה Promise שמתמלא כאשר התמונה נטענה או נכשלה
 * 
 * @param imageUrl - URL של התמונה
 * @param timeout - זמן המתנה מקסימלי במילישניות (ברירת מחדל: 10 שניות)
 * @returns Promise<boolean> - true אם נטענה בהצלחה, false אם נכשלה
 */
export function preloadImageAsync(
  imageUrl: string,
  timeout: number = 10000
): Promise<boolean> {
  return new Promise((resolve) => {
    // אם זה placeholder, אין צורך לטעון
    if (imageUrl.startsWith('/placeholder')) {
      resolve(false);
      return;
    }
    
    const img = new Image();
    let timeoutId: number | undefined;
    
    // ניקוי משאבים
    const cleanup = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      img.onload = null;
      img.onerror = null;
    };
    
    // טעינה מוצלחת
    img.onload = () => {
      cleanup();
      resolve(true);
    };
    
    // שגיאה בטעינה
    img.onerror = () => {
      cleanup();
      console.warn(`שגיאה בטעינת תמונה: ${imageUrl}`);
      resolve(false);
    };
    
    // timeout - למניעת המתנה אין סופית
    timeoutId = window.setTimeout(() => {
      cleanup();
      console.warn(`תם הזמן לטעינת תמונה (${timeout}ms): ${imageUrl}`);
      resolve(false);
    }, timeout);
    
    // התחלת הטעינה
    img.src = imageUrl;
  });
}

/**
 * בדיקה האם תמונה מתאימה לזום (רזולוציה מינימלית)
 * 
 * @param image - IImage object
 * @returns true אם התמונה מתאימה לזום
 */
export function isImageSuitableForZoom(image: IImage | string | undefined): boolean {
  // אם זה string או undefined, לא יודעים את הרזולוציה
  if (!image || typeof image === 'string') {
    return false;
  }
  
  // בדיקת רזולוציה מינימלית (2048x2048)
  const MIN_RESOLUTION = 2048;
  
  return !!(
    image.width &&
    image.height &&
    image.width >= MIN_RESOLUTION &&
    image.height >= MIN_RESOLUTION
  );
}
