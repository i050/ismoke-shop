// Utility functions לניהול טוקנים ב-localStorage

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';

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
 * בדיקה אם המשתמש מחובר (יש טוקן ונתוני משתמש)
 */
export const isAuthenticated = (): boolean => {
  return hasValidToken() && !!getUser();
};
