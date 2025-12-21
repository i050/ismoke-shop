import { Response } from 'express';

/**
 * תגובת הצלחה כללית
 */
export const sendSuccessResponse = (res: Response, message: string, data?: any, statusCode: number = 200): void => {
  res.status(statusCode).json({
    success: true,
    message,
    ...(data && { data })
  });
};

/**
 * תגובת שגיאה כללית
 */
export const sendErrorResponse = (res: Response, message: string, statusCode: number = 400): void => {
  res.status(statusCode).json({
    success: false,
    message
  });
};

/**
 * תגובת שגיאת שרת
 */
export const sendServerErrorResponse = (res: Response, error: any, message: string = 'שגיאה בשרת'): void => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message
  });
};

/**
 * פורמט נתוני משתמש ללא סיסמה
 */
export const formatUserData = (user: any, includeSensitive: boolean = false) => {
  const baseData = {
    // keep both _id and id for compatibility with different clients
    _id: user._id,
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    avatar: user.avatar,
    role: user.role,
    customerGroupId: user.customerGroupId,
    isActive: user.isActive,
    isVerified: user.isVerified,
    createdAt: user.createdAt
  };

  if (includeSensitive) {
    return {
      ...baseData,
      providers: user.providers,
      lastLogin: user.lastLogin,
      loginAttempts: user.loginAttempts,
      updatedAt: user.updatedAt
    };
  }

  return baseData;
};

/**
 * פורמט נתוני משתמש עם token
 */
export const formatUserWithToken = (user: any, token: string, includeLastLogin: boolean = false) => {
  const userData = formatUserData(user, false);

  if (includeLastLogin) {
    (userData as any).lastLogin = user.lastLogin;
  }

  return {
    user: userData,
    token
  };
};
