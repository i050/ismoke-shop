import { Request, Response } from 'express';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import {
  sendSuccessResponse,
  sendErrorResponse,
  sendServerErrorResponse
} from '../../utils/responseHelpers';
import {
  findUserById,
  findUserByIdWithPassword,
  findUserByEmail,
  findUserByResetToken
} from '../../utils/userHelpers';
import { logUserAction } from '../../utils/logger';
import { addEmailJob } from '../../queues';
import { Setup2FARequest, Verify2FARequest, Disable2FARequest, ForgotPasswordRequest, ResetPasswordRequest } from '../types/auth.types';

// התחלת הגדרת 2FA
export const setup2FA = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { password } = req.body;

    if (!userId) {
      return sendErrorResponse(res, 'משתמש לא מאומת', 401);
    }

    // בדיקת סיסמה
    const user = await findUserByIdWithPassword(userId);
    if (!user) {
      return sendErrorResponse(res, 'משתמש לא נמצא', 404);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendErrorResponse(res, 'סיסמה שגויה', 400);
    }

    // בדיקה אם 2FA כבר מופעל
    if (user.twoFactorEnabled) {
      return sendErrorResponse(res, '2FA כבר מופעל', 400);
    }

    // יצירת secret חדש
    const secret = speakeasy.generateSecret({
      name: `E-commerce App (${user.email})`,
      issuer: 'E-commerce App'
    });

    // שמירת secret זמני (לא נשמור עדיין בדאטהבייס)
    (req as any).tempSecret = secret.base32;

    // יצירת QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    sendSuccessResponse(res, 'הגדרת 2FA התחילה', {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: 'סרוק את ה-QR code באפליקציית אימות ותזין את הקוד שנוצר'
    });

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בהתחלת הגדרת 2FA');
  }
};

// אימות והפעלת 2FA
export const verify2FA = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { token, password } = req.body;

    if (!userId) {
      return sendErrorResponse(res, 'משתמש לא מאומת', 401);
    }

    // בדיקת סיסמה (אם נשלחה)
    if (password) {
      const user = await findUserByIdWithPassword(userId);
      if (!user) {
        return sendErrorResponse(res, 'משתמש לא נמצא', 404);
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return sendErrorResponse(res, 'סיסמה שגויה', 400);
      }
    }

    // קבלת המשתמש
    const user = await findUserById(userId);
    if (!user) {
      return sendErrorResponse(res, 'משתמש לא נמצא', 404);
    }

    // בדיקה אם 2FA כבר מופעל
    if (user.twoFactorEnabled) {
      return sendErrorResponse(res, '2FA כבר מופעל', 400);
    }

    // קבלת secret זמני
    const tempSecret = (req as any).tempSecret;
    if (!tempSecret) {
      return sendErrorResponse(res, 'לא נמצא secret זמני. התחל מחדש את תהליך ההגדרה', 400);
    }

    // אימות הקוד
    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: token,
      window: 2 // סובלנות של 2 צעדים (30 שניות)
    });

    if (!verified) {
      return sendErrorResponse(res, 'קוד אימות שגוי', 400);
    }

    // יצירת קודי גיבוי
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }

    // עדכון המשתמש
    user.twoFactorEnabled = true;
    user.twoFactorSecret = tempSecret;
    user.backupCodes = backupCodes;
    await user.save();

    // לוגינג
    logUserAction('2FA_ENABLED', userId, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    sendSuccessResponse(res, '2FA הופעל בהצלחה', {
      backupCodes: backupCodes,
      message: 'שמור את קודי הגיבוי במקום בטוח! הם לא יוצגו שוב.'
    });

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה באימות 2FA');
  }
};

// ביטול 2FA
export const disable2FA = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { password } = req.body;

    if (!userId) {
      return sendErrorResponse(res, 'משתמש לא מאומת', 401);
    }

    // בדיקת סיסמה
    const user = await findUserByIdWithPassword(userId);
    if (!user) {
      return sendErrorResponse(res, 'משתמש לא נמצא', 404);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return sendErrorResponse(res, 'סיסמה שגויה', 400);
    }

    // בדיקה אם 2FA מופעל
    if (!user.twoFactorEnabled) {
      return sendErrorResponse(res, '2FA לא מופעל', 400);
    }

    // ביטול 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = [];
    await user.save();

    // לוגינג
    logUserAction('2FA_DISABLED', userId, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    sendSuccessResponse(res, '2FA בוטל בהצלחה');

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בביטול 2FA');
  }
};

// שכחתי סיסמה - שליחת מייל עם קישור איפוס
export const forgotPassword = async (req: Request<{}, {}, ForgotPasswordRequest>, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendErrorResponse(res, 'אימייל הוא שדה חובה', 400);
    }

    // מציאת המשתמש לפי אימייל
    const user = await findUserByEmail(email);
    if (!user) {
      // מסיבות אבטחה, לא נחשוף אם האימייל קיים או לא
      return sendSuccessResponse(res, 'אם האימייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה');
    }

    // בדיקה אם המשתמש פעיל
    if (!user.isActive) {
      return sendSuccessResponse(res, 'אם האימייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה');
    }

    // יצירת טוקן איפוס
    const resetToken = user.generateResetToken();
    await user.save();

    // שליחת מייל איפוס סיסמה דרך ה-Queue (אסינכרוני עם retry)
    await addEmailJob({
      type: 'password_reset',
      to: user.email,
      data: {
        resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`
      }
    });

    // לוגינג
    logUserAction('PASSWORD_RESET_REQUEST', user._id.toString(), {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: email
    });

    sendSuccessResponse(res, 'אם האימייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה');

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בבקשת איפוס סיסמה');
  }
};

// איפוס סיסמה עם טוקן
export const resetPassword = async (req: Request<{}, {}, ResetPasswordRequest>, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return sendErrorResponse(res, 'טוקן וסיסמה חדשה הם שדות חובה', 400);
    }

    // מציאת המשתמש לפי טוקן איפוס
    const user = await findUserByResetToken(token);
    if (!user) {
      return sendErrorResponse(res, 'טוקן איפוס לא תקף או פג תוקף', 400);
    }

    // בדיקת אורך סיסמה
    if (newPassword.length < 8) {
      return sendErrorResponse(res, 'סיסמה חייבת להכיל לפחות 8 תווים', 400);
    }

    // עדכון סיסמה
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // לוגינג
    logUserAction('PASSWORD_RESET_SUCCESS', user._id.toString(), {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    sendSuccessResponse(res, 'הסיסמה אופסה בהצלחה');

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה באיפוס הסיסמה');
  }
};
