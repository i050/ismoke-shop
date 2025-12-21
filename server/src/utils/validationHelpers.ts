import User from '../models/User';

/**
 * בדיקת שדות חובה
 */
export const validateRequiredFields = (fields: Record<string, any>, requiredFields: string[]): string | null => {
  for (const field of requiredFields) {
    if (!fields[field]) {
      return `השדה ${field} הוא חובה`;
    }
  }
  return null;
};

/**
 * בדיקת אורך סיסמה
 */
export const validatePasswordLength = (password: string, minLength: number = 8): string | null => {
  if (password.length < minLength) {
    return `סיסמה חייבת להכיל לפחות ${minLength} תווים`;
  }
  return null;
};

/**
 * בדיקת אימייל תקין
 */
export const validateEmailFormat = (email: string): string | null => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return 'אימייל לא תקין';
  }
  return null;
};

/**
 * בדיקת אימייל קיים
 */
export const validateEmailExists = async (email: string, excludeUserId?: string): Promise<string | null> => {
  const query: any = { email: email.toLowerCase() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }

  const existingUser = await User.findOne(query);
  if (existingUser) {
    return 'אימייל זה כבר רשום במערכת';
  }
  return null;
};

/**
 * בדיקת סיסמה ישנה
 */
export const validateOldPassword = async (user: any, oldPassword: string): Promise<string | null> => {
  const isOldPasswordValid = await user.comparePassword(oldPassword);
  if (!isOldPasswordValid) {
    return 'סיסמה ישנה שגויה';
  }
  return null;
};
