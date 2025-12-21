import jwt from 'jsonwebtoken';

/**
 * יצירת JWT token
 */
export const generateToken = (userId: string, role?: 'customer' | 'admin' | 'super_admin'): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  return jwt.sign({ userId, role }, secret, { expiresIn: '7d' });
};

/**
 * בדיקת חשבון נעול
 */
export const checkAccountLocked = (user: any): string | null => {
  if (user.isLocked()) {
    return 'החשבון נעול זמנית עקב ניסיונות התחברות כושלים רבים';
  }
  return null;
};

/**
 * איפוס ניסיונות התחברות כושלים
 */
export const resetLoginAttempts = (user: any): void => {
  user.resetLoginAttempts();
};

/**
 * הגדלת ניסיונות התחברות כושלים
 */
export const incrementLoginAttempts = (user: any): void => {
  user.incLoginAttempts();
};

/**
 * בדיקת חשבון פעיל
 */
export const checkAccountActive = (user: any): string | null => {
  if (!user.isActive) {
    return 'החשבון אינו פעיל';
  }
  return null;
};

/**
 * בדיקת אישור הרשמה מנהל
 */
export const checkAccountApproved = (user: any): string | null => {
  if (user.isApproved === false) {
    return 'החשבון שלך ממתין לאישור מנהל החנות';
  }
  return null;
};

/**
 * עדכון lastLogin
 */
export const updateLastLogin = (user: any): void => {
  user.lastLogin = new Date();
};
