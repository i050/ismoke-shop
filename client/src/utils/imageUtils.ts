import type { IImage } from '../types/Product';

/**
 * קבוע: תמונת placeholder עבור מוצרים ללא תמונה
 * התמונה מוצגת רק בממשק המשתמש ואינה חלק מנתוני המוצר
 */
export const PRODUCT_PLACEHOLDER_IMAGE = '/ismoke-placeholder.png';

/**
 * פונקציית עזר לקבלת URL של תמונה לפי גודל מבוקש
 * ✅ תומכת במבנה החדש (3 גדלים) + backward compatibility למבנה ישן
 * 
 * @param image - IImage object או string או undefined
 * @param size - גודל התמונה המבוקש: 'thumbnail' (200px), 'medium' (800px), 'large' (1200px)
 * @returns URL של התמונה בגודל המבוקש
 * 
 * @example
 * // שימוש בכרטיס מוצר (ביצועים)
 * getImageUrl(product.images[0], 'thumbnail')
 * 
 * // שימוש בתצוגה ראשית
 * getImageUrl(product.images[0], 'medium')
 * 
 * // שימוש בזום
 * getImageUrl(product.images[0], 'large')
 */
export function getImageUrl(
  image: IImage | string | undefined,
  size: 'thumbnail' | 'medium' | 'large' = 'medium'
): string {
  if (!image) {
    return PRODUCT_PLACEHOLDER_IMAGE;
  }
  
  // אם זה string - החזר ישירות (backward compatibility)
  if (typeof image === 'string') {
    return image;
  }
  
  // אם זה IImage object עם המבנה החדש (3 גדלים)
  if ('thumbnail' in image || 'medium' in image || 'large' in image) {
    // נסיון לקבל את הגודל המבוקש, עם fallback חכם
    const url = image[size] || image.medium || image.large || image.thumbnail;
    return url || PRODUCT_PLACEHOLDER_IMAGE;
  }
  
  // Backward compatibility - אם זה המבנה הישן עם 'url'
  if ('url' in image) {
    return (image as any).url || PRODUCT_PLACEHOLDER_IMAGE;
  }
  
  return PRODUCT_PLACEHOLDER_IMAGE;
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
 * ✅ עם המבנה החדש - פשוט מחזיר את גרסת 'large' (1200×1200)
 * 
 * @param image - IImage object או string
 * @param options - אופציות (לא בשימוש עם המבנה החדש, נשאר לתאימות)
 * @returns URL של התמונה בגרסה הגדולה ביותר
 * 
 * @example
 * // לזום או modal
 * const zoomUrl = getHighResImageUrl(product.images[0]);
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
  // עם המבנה החדש - פשוט מחזירים את הגרסה הגדולה
  // התמונות כבר מעובדות ב-1200×1200 WebP איכותי
  return getImageUrl(image, 'large');
  
  // הערה: options לא בשימוש יותר כי התמונות מעובדות מראש
  // נשאר הפרמטר לתאימות לאחור עם קוד קיים
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
