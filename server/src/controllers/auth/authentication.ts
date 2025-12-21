import { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import crypto from 'crypto';
import {
  validateRequiredFields,
  validatePasswordLength,
  validateEmailFormat,
  validateEmailExists,
  validateOldPassword
} from '../../utils/validationHelpers';
import {
  generateToken,
  checkAccountLocked,
  resetLoginAttempts,
  incrementLoginAttempts,
  checkAccountActive,
  checkAccountApproved,
  updateLastLogin
} from '../../utils/authHelpers';
import {
  sendSuccessResponse,
  sendErrorResponse,
  sendServerErrorResponse,
  formatUserWithToken,
  formatUserData
} from '../../utils/responseHelpers';
import {
  findUserByEmailWithPassword,
  findUserById
} from '../../utils/userHelpers';
import { logUserAction, logSecurityEvent } from '../../utils/logger';
import { LoginRequest, LoginWith2FARequest } from '../types/auth.types';
import CartService from '../../services/cartService';
import Cart, { ICart } from '../../models/Cart';
import StoreSettings from '../../models/StoreSettings';
import { sendLoginOTPEmail } from '../../services/emailService';

// התחברות
export const login = async (req: Request<{}, {}, LoginRequest>, res: Response) => {
  try {
    const { email, password, guestSessionId } = req.body as LoginRequest & { guestSessionId?: string };

    // בדיקת שדות חובה
    const requiredFieldsError = validateRequiredFields({ email, password }, ['email', 'password']);
    if (requiredFieldsError) {
      return sendErrorResponse(res, requiredFieldsError, 400);
    }

    // מציאת משתמש לפי אימייל
    const user = await findUserByEmailWithPassword(email);
    if (!user) {
      return sendErrorResponse(res, 'אימייל או סיסמה שגויים', 401);
    }

    // בדיקת חשבון נעול
    const lockedError = checkAccountLocked(user);
    if (lockedError) {
      return sendErrorResponse(res, lockedError, 423);
    }

    // בדיקת סיסמה
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // לוגינג של כשלון התחברות
      logSecurityEvent('LOGIN_FAILED_INVALID_PASSWORD', {
        email: user.email,
        userId: (user._id as any).toString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        attemptNumber: user.loginAttempts + 1
      });

      // הגדלת מספר הניסיונות הכושלים
      incrementLoginAttempts(user);
      await user.save();

      return sendErrorResponse(res, 'אימייל או סיסמה שגויים', 401);
    }

    // איפוס ניסיונות התחברות כושלים בהתחברות מוצלחת
    resetLoginAttempts(user);

    // בדיקת חשבון פעיל
    const activeError = checkAccountActive(user);
    if (activeError) {
      return sendErrorResponse(res, activeError, 401);
    }

    // בדיקת אישור הרשמה
    const approvedError = checkAccountApproved(user);
    if (approvedError) {
      return sendErrorResponse(res, approvedError, 403);
    }

    // עדכון lastLogin
    updateLastLogin(user);
    await user.save();

    // בדיקה אם 2FA מופעל
    if (user.twoFactorEnabled) {
      // החזרת תגובה שמבקשת קוד 2FA
      sendSuccessResponse(res, 'נדרש קוד אימות', {
        requires2FA: true,
        userId: (user._id as any).toString(),
        message: 'הזן את קוד האימות מהאפליקציה שלך'
      });
      return;
    }

    // בדיקה אם נדרש Login OTP (מהגדרות האתר)
    const settings = await StoreSettings.findOne();
    if (settings?.users?.requireLoginOTP) {
      // יצירת קוד OTP בן 6 ספרות
      const otpCode = crypto.randomInt(100000, 999999).toString();
      
      // שמירת קוד ה-OTP במשתמש (תוקף 10 דקות)
      user.loginOTPCode = otpCode;
      user.loginOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 דקות
      await user.save();
      
      // שליחת קוד OTP למייל
      try {
        await sendLoginOTPEmail(user.email, otpCode);
        logSecurityEvent('LOGIN_OTP_SENT', {
          userId: (user._id as any).toString(),
          email: user.email,
          ip: req.ip
        });
      } catch (emailError) {
        console.error('Failed to send login OTP email:', emailError);
        return sendServerErrorResponse(res, emailError, 'שגיאה בשליחת קוד אימות למייל');
      }
      
      // החזרת תגובה שמבקשת קוד OTP
      sendSuccessResponse(res, 'נדרש קוד אימות', {
        requiresLoginOTP: true,
        userId: (user._id as any).toString(),
        message: 'קוד אימות נשלח למייל שלך'
      });
      return;
    }

    // Server-Side Cart Merge: אם יש guestSessionId, מזג את cart האורח לסל המשתמש
    let userCart = null;
    if (guestSessionId) {
      try {
        // קבלת סל האורח
        const guestCart = await Cart.findOne({ sessionId: guestSessionId, status: 'active' });
        
        // קבלת או יצירת סל המשתמש
        let userCartObj = await Cart.findOne({ userId: user._id, status: 'active' });
        if (!userCartObj) {
          userCartObj = (await Cart.create({
            userId: user._id,
            items: [],
            status: 'active',
          })) as any;
        }

        // אם יש סל אורח, מזג אותו לסל המשתמש
        if (guestCart && guestCart.items && guestCart.items.length > 0 && userCartObj) {
          userCartObj = (await CartService.mergeCarts(userCartObj as ICart, guestCart)) as any;
          logUserAction('CART_MERGED_ON_LOGIN', (user._id as any).toString(), {
            guestSessionId,
            guestCartItemsCount: guestCart.items.length,
            mergedCartItemsCount: (userCartObj as any).items?.length || 0
          });
        }

        userCart = userCartObj;
      } catch (mergeError) {
        // לוג שגיאה אבל לא נכשל את התחברות
        console.error('Cart merge error during login:', mergeError);
        logSecurityEvent('CART_MERGE_FAILED_ON_LOGIN', {
          userId: (user._id as any).toString(),
          guestSessionId,
          error: (mergeError as any).message
        });
      }
    }

    // יצירת token
    const token = generateToken((user._id as any).toString(), user.role);

    // לוגינג של התחברות מוצלחת
    logUserAction('LOGIN_SUCCESS', (user._id as any).toString(), {
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // החזרת תגובה עם cart מה-merge אם קיים
    const response = formatUserWithToken(user, token, true);
    if (userCart) {
      (response as any).cart = userCart;
    }

    sendSuccessResponse(res, 'התחברות בוצעה בהצלחה', response);

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בהתחברות');
  }
};

// התנתקות
export const logout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    // לוגינג של התנתקות
    if (userId) {
      logUserAction('LOGOUT', userId, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // בהתנתקות פשוטה, אנחנו לא צריכים לעשות משהו מיוחד
    // בצד ה-client נמחק את ה-token מה-localStorage
    sendSuccessResponse(res, 'התנתקות בוצעה בהצלחה');
  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בהתנתקות');
  }
};

// אימות קוד 2FA (לשימוש בהתחברות)
export const verify2FAToken = async (userId: string, token: string): Promise<boolean> => {
  try {
    const user = await findUserById(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    // אימות קוד רגיל
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (verified) {
      return true;
    }

    // בדיקת קודי גיבוי
    if (user.backupCodes.includes(token)) {
      // הסרת הקוד המשומש
      user.backupCodes = user.backupCodes.filter((code: string) => code !== token);
      await user.save();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return false;
  }
};

// התחברות עם 2FA
export const loginWith2FA = async (req: Request, res: Response) => {
  try {
    const { userId, token, guestSessionId } = req.body as { userId: string; token: string; guestSessionId?: string };

    if (!userId || !token) {
      return sendErrorResponse(res, 'נדרש userId ו-token', 400);
    }

    // אימות קוד 2FA
    const isValid = await verify2FAToken(userId, token);
    if (!isValid) {
      logSecurityEvent('2FA_FAILED', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return sendErrorResponse(res, 'קוד אימות שגוי', 400);
    }

    // קבלת המשתמש
    const user = await findUserById(userId);
    if (!user) {
      return sendErrorResponse(res, 'משתמש לא נמצא', 404);
    }

    // Server-Side Cart Merge: אם יש guestSessionId, מזג את cart האורח לסל המשתמש
    let userCart = null;
    if (guestSessionId) {
      try {
        // קבלת סל האורח
        const guestCart = await Cart.findOne({ sessionId: guestSessionId, status: 'active' });
        
        // קבלת או יצירת סל המשתמש
        let userCartObj = await Cart.findOne({ userId: user._id, status: 'active' });
        if (!userCartObj) {
          userCartObj = (await Cart.create({
            userId: user._id,
            items: [],
            status: 'active',
          })) as any;
        }

        // אם יש סל אורח, מזג אותו לסל המשתמש
        if (guestCart && guestCart.items && guestCart.items.length > 0 && userCartObj) {
          userCartObj = (await CartService.mergeCarts(userCartObj as ICart, guestCart)) as any;
          logUserAction('CART_MERGED_ON_LOGIN_2FA', userId, {
            guestSessionId,
            guestCartItemsCount: guestCart.items.length,
            mergedCartItemsCount: (userCartObj as any).items?.length || 0
          });
        }

        userCart = userCartObj;
      } catch (mergeError) {
        // לוג שגיאה אבל לא נכשל את התחברות
        console.error('Cart merge error during 2FA login:', mergeError);
        logSecurityEvent('CART_MERGE_FAILED_ON_LOGIN_2FA', {
          userId,
          guestSessionId,
          error: (mergeError as any).message
        });
      }
    }

    // יצירת token עם role של המשתמש
    const accessToken = generateToken(userId, user.role);

    // לוגינג
    logUserAction('LOGIN_SUCCESS_2FA', userId, {
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // החזרת תגובה עם cart מה-merge אם קיים
    const response = {
      user: formatUserData(user),
      token: accessToken
    };
    if (userCart) {
      (response as any).cart = userCart;
    }

    sendSuccessResponse(res, 'התחברות עם 2FA בוצעה בהצלחה', response);

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בהתחברות עם 2FA');
  }
};

// התחברות עם OTP (קוד מייל)
export const loginWithOTP = async (req: Request, res: Response) => {
  try {
    const { userId, otpCode, guestSessionId } = req.body as { userId: string; otpCode: string; guestSessionId?: string };

    if (!userId || !otpCode) {
      return sendErrorResponse(res, 'נדרש userId ו-otpCode', 400);
    }

    // קבלת המשתמש
    const user = await findUserById(userId);
    if (!user) {
      return sendErrorResponse(res, 'משתמש לא נמצא', 404);
    }

    // בדיקת קוד OTP
    if (!user.loginOTPCode || !user.loginOTPExpires) {
      logSecurityEvent('LOGIN_OTP_FAILED_NO_CODE', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return sendErrorResponse(res, 'לא נמצא קוד אימות פעיל. נסה להתחבר מחדש', 400);
    }

    // בדיקת תוקף הקוד
    if (new Date() > user.loginOTPExpires) {
      // ניקוי קוד שפג תוקף
      user.loginOTPCode = undefined;
      user.loginOTPExpires = undefined;
      await user.save();
      
      logSecurityEvent('LOGIN_OTP_EXPIRED', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return sendErrorResponse(res, 'קוד האימות פג תוקף. נסה להתחבר מחדש', 400);
    }

    // בדיקת התאמת הקוד
    if (user.loginOTPCode !== otpCode) {
      logSecurityEvent('LOGIN_OTP_FAILED_INVALID_CODE', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return sendErrorResponse(res, 'קוד אימות שגוי', 400);
    }

    // ניקוי קוד OTP לאחר שימוש
    user.loginOTPCode = undefined;
    user.loginOTPExpires = undefined;
    await user.save();

    // Server-Side Cart Merge: אם יש guestSessionId, מזג את cart האורח לסל המשתמש
    let userCart = null;
    if (guestSessionId) {
      try {
        // קבלת סל האורח
        const guestCart = await Cart.findOne({ sessionId: guestSessionId, status: 'active' });
        
        // קבלת או יצירת סל המשתמש
        let userCartObj = await Cart.findOne({ userId: user._id, status: 'active' });
        if (!userCartObj) {
          userCartObj = (await Cart.create({
            userId: user._id,
            items: [],
            status: 'active',
          })) as any;
        }

        // אם יש סל אורח, מזג אותו לסל המשתמש
        if (guestCart && guestCart.items && guestCart.items.length > 0 && userCartObj) {
          userCartObj = (await CartService.mergeCarts(userCartObj as ICart, guestCart)) as any;
          logUserAction('CART_MERGED_ON_LOGIN_OTP', userId, {
            guestSessionId,
            guestCartItemsCount: guestCart.items.length,
            mergedCartItemsCount: (userCartObj as any).items?.length || 0
          });
        }

        userCart = userCartObj;
      } catch (mergeError) {
        // לוג שגיאה אבל לא נכשל את התחברות
        console.error('Cart merge error during OTP login:', mergeError);
        logSecurityEvent('CART_MERGE_FAILED_ON_LOGIN_OTP', {
          userId,
          guestSessionId,
          error: (mergeError as any).message
        });
      }
    }

    // יצירת token עם role של המשתמש
    const accessToken = generateToken(userId, user.role);

    // לוגינג
    logUserAction('LOGIN_SUCCESS_OTP', userId, {
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // החזרת תגובה עם cart מה-merge אם קיים
    const response = {
      user: formatUserData(user),
      token: accessToken
    };
    if (userCart) {
      (response as any).cart = userCart;
    }

    sendSuccessResponse(res, 'התחברות עם קוד אימות בוצעה בהצלחה', response);

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בהתחברות עם קוד אימות');
  }
};

// שליחה מחדש של קוד OTP
export const resendLoginOTP = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId: string };

    if (!userId) {
      return sendErrorResponse(res, 'נדרש userId', 400);
    }

    // קבלת המשתמש
    const user = await findUserById(userId);
    if (!user) {
      return sendErrorResponse(res, 'משתמש לא נמצא', 404);
    }

    // יצירת קוד OTP חדש בן 6 ספרות
    const otpCode = crypto.randomInt(100000, 999999).toString();
    
    // שמירת קוד ה-OTP במשתמש (תוקף 10 דקות)
    user.loginOTPCode = otpCode;
    user.loginOTPExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 דקות
    await user.save();
    
    // שליחת קוד OTP למייל
    try {
      await sendLoginOTPEmail(user.email, otpCode);
      logSecurityEvent('LOGIN_OTP_RESENT', {
        userId,
        email: user.email,
        ip: req.ip
      });
    } catch (emailError) {
      console.error('Failed to resend login OTP email:', emailError);
      return sendServerErrorResponse(res, emailError, 'שגיאה בשליחת קוד אימות למייל');
    }

    sendSuccessResponse(res, 'קוד אימות חדש נשלח למייל שלך');

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בשליחת קוד אימות מחדש');
  }
};
