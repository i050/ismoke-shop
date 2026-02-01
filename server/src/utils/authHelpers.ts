import jwt from 'jsonwebtoken';

// ⏱️ Soft Login הגדרות - תוקף טוקן ארוך לפעולות רגילות, אימות מחדש לפעולות רגישות
// 🛒 לקוחות - חוויה נוחה עם אבטחה לפעולות רגישות
export const SOFT_LOGIN_EXPIRY = '30d'; // 30 ימים לטוקן לקוח
export const SENSITIVE_ACTION_WINDOW_MINUTES = 15; // 15 דקות לפעולות רגישות (checkout)

// 🔐 מנהלים - אבטחה מוגברת ליום עבודה
export const ADMIN_SESSION_EXPIRY = '8h'; // 8 שעות לטוקן מנהל (יום עבודה)
export const ADMIN_REAUTH_WINDOW_MINUTES = 30; // 30 דקות לפעולות רגישות (ארוך יותר בגלל עבודה רציפה)

/**
 * יצירת JWT token עם תמיכה ב-Soft Login
 * 🔐 מנהלים מקבלים טוקן קצר יותר (8 שעות) לאבטחה מוגברת
 * 🛒 לקוחות מקבלים טוקן ארוך (30 יום) לנוחות
 * @param userId - מזהה המשתמש
 * @param role - תפקיד המשתמש
 * @param includeLastAuthAt - האם להוסיף את זמן האימות האחרון (true בהתחברות ראשונית או re-auth)
 */
export const generateToken = (
  userId: string, 
  role?: 'customer' | 'admin' | 'super_admin',
  includeLastAuthAt: boolean = true
): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  
  // 🔐 Soft Login: הוספת lastAuthAt לתמיכה בזיהוי פעולות רגישות
  const payload: {
    userId: string;
    role?: 'customer' | 'admin' | 'super_admin';
    lastAuthAt?: number;
  } = { userId, role };
  
  // הוסף lastAuthAt רק כשמבצעים אימות מלא (login/re-auth)
  if (includeLastAuthAt) {
    payload.lastAuthAt = Date.now();
  }
  
  // 🔐 בחירת תוקף טוקן לפי role: מנהלים = 8 שעות, לקוחות = 30 יום
  const isAdmin = role === 'admin' || role === 'super_admin';
  const tokenExpiry = isAdmin ? ADMIN_SESSION_EXPIRY : SOFT_LOGIN_EXPIRY;
  
  return jwt.sign(payload, secret, { expiresIn: tokenExpiry });
};

/**
 * יצירת טוקן מחודש עם עדכון lastAuthAt (לאחר re-authentication)
 * @param userId - מזהה המשתמש
 * @param role - תפקיד המשתמש
 */
export const generateReAuthToken = (
  userId: string, 
  role?: 'customer' | 'admin' | 'super_admin'
): string => {
  return generateToken(userId, role, true); // תמיד עם lastAuthAt חדש
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
