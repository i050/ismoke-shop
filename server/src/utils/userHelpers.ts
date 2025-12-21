import User, { IUser } from '../models/User';
import StoreSettings from '../models/StoreSettings';

/**
 * בניית אובייקט עדכון משתמש
 */
export const buildUserUpdateData = (data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}): Partial<IUser> => {
  const updateData: Partial<IUser> = {};

  if (data.firstName) updateData.firstName = data.firstName.trim();
  if (data.lastName) updateData.lastName = data.lastName.trim();
  if (data.email) updateData.email = data.email.toLowerCase().trim();
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || undefined;
  if (data.address) updateData.address = data.address;

  return updateData;
};

/**
 * בדיקה האם נדרש אישור הרשמה
 */
export const isRegistrationApprovalRequired = async (): Promise<boolean> => {
  try {
    const settings = await StoreSettings.getSettings();
    return settings.users?.requireRegistrationApproval ?? false;
  } catch (error) {
    console.error('Error checking registration approval setting:', error);
    return false;
  }
};

/**
 * יצירת משתמש חדש
 * @param userData - פרטי המשתמש
 * @param options - אפשרויות נוספות (כמו אם לכפות isApproved)
 */
export const createNewUser = async (
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  },
  options?: {
    forceApproved?: boolean; // כפה אישור (למשל כשמנהל יוצר משתמש)
  }
): Promise<{ user: any; requiresApproval: boolean }> => {
  // בדיקה האם נדרש אישור הרשמה
  const requiresApproval = options?.forceApproved ? false : await isRegistrationApprovalRequired();
  
  const user = new User({
    firstName: userData.firstName.trim(),
    lastName: userData.lastName.trim(),
    email: userData.email.toLowerCase().trim(),
    password: userData.password,
    isApproved: !requiresApproval // אם נדרש אישור - isApproved = false
  });

  await user.save();
  
  return { user, requiresApproval };
};

/**
 * מציאת משתמש לפי ID
 */
export const findUserById = async (userId: string): Promise<any> => {
  return await User.findById(userId);
};

/**
 * מציאת משתמש לפי אימייל עם סיסמה
 */
export const findUserByEmailWithPassword = async (email: string): Promise<any> => {
  return await User.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * עדכון משתמש
 */
export const updateUserById = async (userId: string, updateData: Partial<IUser>): Promise<any> => {
  return await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  );
};

/**
 * מציאת משתמש לפי ID עם סיסמה
 */
export const findUserByIdWithPassword = async (userId: string): Promise<any> => {
  return await User.findById(userId).select('+password');
};

/**
 * עדכון סיסמה של משתמש
 */
export const updateUserPassword = async (user: any, newPassword: string): Promise<void> => {
  user.password = newPassword;
  await user.save();
};

/**
 * מציאת משתמש לפי אימייל
 */
export const findUserByEmail = async (email: string): Promise<any> => {
  return await User.findOne({ email: email.toLowerCase() });
};

/**
 * מציאת משתמש לפי טוקן איפוס סיסמה
 */
export const findUserByResetToken = async (token: string): Promise<any> => {
  return await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() }
  });
};
