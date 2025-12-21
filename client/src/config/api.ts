/**
 * קונפיגורציית API מרכזית
 * ========================================
 * 
 * פונקציה זו מזהה אוטומטית את סביבת הריצה ומחזירה את ה-API URL הנכון:
 * - בפיתוח: http://localhost:5000
 * - ב-Railway: URL של ה-Backend Service
 * 
 * הזיהוי מבוסס על:
 * 1. משתנה סביבה VITE_API_URL (אם מוגדר בזמן Build)
 * 2. זיהוי אוטומטי של Railway על פי hostname
 */

/**
 * מחזיר את ה-API Base URL
 * זוהי הפונקציה המרכזית שכל ה-services צריכים להשתמש בה
 */
export function getApiBaseUrl(): string {
  // 1. בדיקה אם יש משתנה סביבה מוגדר (build-time)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }

  // 2. זיהוי אוטומטי של סביבת Railway בזמן ריצה
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // אם אנחנו על Railway (domain מסתיים ב-.railway.app)
    if (hostname.endsWith('.railway.app')) {
      // ה-Backend נמצא באותו פרויקט אבל ב-subdomain אחר
      // לדוגמה: אם ה-Frontend הוא ismoke-shop-production-4981.up.railway.app
      // ה-Backend הוא ismoke-shop-production.up.railway.app
      // 
      // הלוגיקה: מסירים את ה-suffix המספרי (-XXXX) מהשם
      const match = hostname.match(/^(.+?)-production(-\d+)?\.up\.railway\.app$/);
      if (match) {
        // מחזירים את ה-URL של ה-Backend (ללא ה-suffix המספרי)
        const baseName = match[1];
        return `https://${baseName}-production.up.railway.app`;
      }
      
      // fallback - אם הפורמט שונה, ננסה להסיר רק את המספרים בסוף
      const simpleMatch = hostname.match(/^(.+?)-\d+\.up\.railway\.app$/);
      if (simpleMatch) {
        return `https://${simpleMatch[1]}.up.railway.app`;
      }
      
      // אם לא מצליחים לזהות את הפורמט, נשתמש ב-URL קשיח
      // (צריך לעדכן ידנית אם משנים את שם ה-Backend)
      console.warn('[API Config] לא הצלחתי לזהות את ה-Backend URL אוטומטית');
      return 'https://ismoke-shop-production.up.railway.app';
    }
    
    // אם אנחנו על Vercel או פלטפורמה אחרת
    if (hostname.endsWith('.vercel.app')) {
      // Vercel - צריך להגדיר VITE_API_URL
      console.warn('[API Config] Vercel זוהה אך VITE_API_URL לא מוגדר');
    }
  }

  // 3. ברירת מחדל - פיתוח מקומי
  return 'http://localhost:5000';
}

/**
 * ה-API Base URL לשימוש גלובלי
 * מחושב פעם אחת בטעינת המודול
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * בודק אם אנחנו בסביבת פרודקשן
 */
export const isProduction = import.meta.env.PROD;

/**
 * בודק אם אנחנו על Railway
 */
export const isRailway = typeof window !== 'undefined' && 
  window.location.hostname.endsWith('.railway.app');
