// Utility functions לניהול טוקנים ב-localStorage

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';
const LAST_AUTH_AT_KEY = 'last_auth_at'; // 🔐 Soft Login: זמן אימות אחרון

/**
 * שמירת טוקן ב-localStorage
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * שליפת טוקן מ-localStorage
 */
export const getToken = (): string | null => {
  // תמיכה ברקע בעבור מפתחות חלופיים שנמצאים בקוד הישן או בתקופות מעבר
  const keysToTry = [TOKEN_KEY, 'authToken', 'token'];
  for (const key of keysToTry) {
    const value = localStorage.getItem(key);
    // 🔒 בדיקה שהערך תקין ולא מחרוזת פגומה כמו "undefined" או "null"
    if (value && value !== 'undefined' && value !== 'null') {
      return value;
    }
  }
  return null;
};

/**
 * מחיקת טוקן מ-localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * שמירת refresh token ב-localStorage
 */
export const setRefreshToken = (refreshToken: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

/**
 * שליפת refresh token מ-localStorage
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * מחיקת refresh token מ-localStorage
 */
export const removeRefreshToken = (): void => {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * שמירת נתוני משתמש ב-localStorage
 */
import type { User } from '../types/User';

export const setUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * שליפת נתוני משתמש מ-localStorage
 */
export const getUser = (): User | null => {
  const userStr = localStorage.getItem(USER_KEY);
  // 🔒 בדיקה שהערך קיים ותקין (לא מחרוזת פגומה)
  if (!userStr || userStr === 'undefined' || userStr === 'null') {
    return null;
  }
  try {
    return JSON.parse(userStr) as User;
  } catch (err) {
    // שמירה מפני נתון פגום/undefined שנשמר בעבר
    console.warn('⚠️ auth_user corrupted in storage, clearing', err);
    removeUser();
    return null;
  }
};

/**
 * מחיקת נתוני משתמש מ-localStorage
 */
export const removeUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

/**
 * ניקוי כל נתוני האימות מ-localStorage
 */
export const clearAuthData = (): void => {
  console.log('🧹 Clearing auth data from localStorage...');
  removeToken();
  removeRefreshToken();
  removeUser();
  removeLastAuthAt(); // 🔐 Soft Login: ניקוי זמן אימות אחרון
  // 🔒 ניקוי גם מפתחות ישנים/חלופיים שעלולים להכיל ערכים פגומים
  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
  console.log('✅ Auth data cleared from localStorage');
};

/**
 * בדיקה אם יש טוקן תקף
 */
export const hasValidToken = (): boolean => {
  return !!getToken();
};

/**
 * פענוח payload מתוך JWT בצורה בטוחה
 */
const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/**
 * בדיקה האם טוקן JWT פג תוקף לפי שדה exp
 * @param token טוקן JWT
 * @param clockSkewSeconds מרווח בטיחות בשניות למניעת מרוץ בזמן
 */
export const isTokenExpired = (token: string, clockSkewSeconds: number = 30): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    // אם לא ניתן לפענח/אין exp - נתייחס כלא תקין כדי למנוע מצב אימות שגוי
    return true;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= (nowSeconds + clockSkewSeconds);
};

// ============================================================================
// 🔐 Soft Login: ניהול זמן אימות אחרון
// ============================================================================

// חלון זמן מותר לפעולות רגישות (בדקות) - לפי סוג משתמש
export const SENSITIVE_ACTION_WINDOW_MINUTES = 15;  // לקוחות רגילים
export const ADMIN_REAUTH_WINDOW_MINUTES = 30;      // מנהלים - זמן ארוך יותר לעבודה רציפה

/**
 * שמירת זמן אימות אחרון ב-localStorage
 */
export const setLastAuthAt = (timestamp: number): void => {
  localStorage.setItem(LAST_AUTH_AT_KEY, timestamp.toString());
};

/**
 * שליפת זמן אימות אחרון מ-localStorage
 */
export const getLastAuthAt = (): number | null => {
  const value = localStorage.getItem(LAST_AUTH_AT_KEY);
  if (!value || value === 'undefined' || value === 'null') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
};

/**
 * מחיקת זמן אימות אחרון מ-localStorage
 */
export const removeLastAuthAt = (): void => {
  localStorage.removeItem(LAST_AUTH_AT_KEY);
};

/**
 * בדיקה אם האימות האחרון היה בתוך חלון הזמן המותר לפעולות רגישות
 * @param isAdmin - האם המשתמש הוא מנהל (משנה את חלון הזמן)
 * @returns true אם האימות האחרון היה בתוך חלון הזמן המותר
 */
export const isRecentlyAuthenticated = (isAdmin: boolean = false): boolean => {
  const lastAuthAt = getLastAuthAt();
  if (!lastAuthAt) {
    return false;
  }
  
  // 🔐 בחירת חלון זמן לפי סוג משתמש: מנהלים = 30 דקות, לקוחות = 15 דקות
  const windowMinutes = isAdmin ? ADMIN_REAUTH_WINDOW_MINUTES : SENSITIVE_ACTION_WINDOW_MINUTES;
  const minutesSinceAuth = (Date.now() - lastAuthAt) / (1000 * 60);
  return minutesSinceAuth <= windowMinutes;
};

/**
 * קבלת מספר הדקות שעברו מאז האימות האחרון
 */
export const getMinutesSinceAuth = (): number | null => {
  const lastAuthAt = getLastAuthAt();
  if (!lastAuthAt) {
    return null;
  }
  return Math.floor((Date.now() - lastAuthAt) / (1000 * 60));
};

/**
 * בדיקה אם המשתמש מחובר (יש טוקן ונתוני משתמש)
 */
export const isAuthenticated = (): boolean => {
  return hasValidToken() && !!getUser();
};
