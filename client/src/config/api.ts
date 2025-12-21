// קובץ תצורה מרכזי ל-API
// משתמש ב-VITE_API_URL מ-environment variables, עם fallback ל-localhost לפיתוח מקומי

/**
 * בסיס ה-URL של ה-API
 * ב-production: נטען מ-VITE_API_URL
 * ב-development: localhost:5000
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * URL מלא של ה-API עם /api prefix
 */
export const API_URL = `${API_BASE_URL}/api`;

/**
 * בדיקה אם אנחנו ב-production
 */
export const isProduction = import.meta.env.PROD;

/**
 * בדיקה אם אנחנו ב-development
 */
export const isDevelopment = import.meta.env.DEV;

/**
 * הדפסת מידע על התצורה (לבדיקות בלבד)
 */
if (isDevelopment) {
  console.log('🔧 API Configuration:', {
    API_BASE_URL,
    API_URL,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    MODE: import.meta.env.MODE,
  });
}
