import { Request, Response } from 'express';
import {
  validateRequiredFields,
  validatePasswordLength,
  validateEmailFormat,
  validateEmailExists,
  validateOldPassword
} from '../../utils/validationHelpers';
import {
  sendSuccessResponse,
  sendErrorResponse,
  sendServerErrorResponse,
  formatUserData
} from '../../utils/responseHelpers';
import {
  buildUserUpdateData,
  findUserById,
  findUserByIdWithPassword,
  updateUserById,
  updateUserPassword
} from '../../utils/userHelpers';
import { UpdateProfileRequest, ChangePasswordRequest } from '../types/auth.types';

// קבלת פרופיל משתמש
export const getProfile = async (req: Request, res: Response) => {
  try {
    // המשתמש כבר מאומת ב-middleware, נוכל לקבל אותו מ-req
    const userId = (req as any).user?.userId;

    if (!userId) {
      return sendErrorResponse(res, 'משתמש לא מאומת', 401);
    }

    const user = await findUserById(userId);
    if (!user) {
      return sendErrorResponse(res, 'משתמש לא נמצא', 404);
    }

    sendSuccessResponse(res, '', { user: formatUserData(user, true) });

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בקבלת פרופיל המשתמש');
  }
};

// עדכון פרופיל
export const updateProfile = async (req: Request<{}, {}, UpdateProfileRequest>, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { firstName, lastName, email, phone, address } = req.body;

    if (!userId) {
      return sendErrorResponse(res, 'משתמש לא מאומת', 401);
    }

    // בניית אובייקט העדכון
    const updateData = buildUserUpdateData({ firstName, lastName, email, phone, address });

    // בדיקת אימייל אם נשלח
    if (email) {
      const emailFormatError = validateEmailFormat(email);
      if (emailFormatError) {
        return sendErrorResponse(res, emailFormatError, 400);
      }

      // בדיקת אימייל קיים (לא כולל המשתמש הנוכחי)
      const emailExistsError = await validateEmailExists(email, userId);
      if (emailExistsError) {
        return sendErrorResponse(res, emailExistsError, 400);
      }
    }

    // עדכון המשתמש
    const user = await updateUserById(userId, updateData);

    if (!user) {
      return sendErrorResponse(res, 'משתמש לא נמצא', 404);
    }

    sendSuccessResponse(res, 'הפרופיל עודכן בהצלחה', { user: formatUserData(user) });

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בעדכון הפרופיל');
  }
};

// שינוי סיסמה
export const changePassword = async (req: Request<{}, {}, ChangePasswordRequest>, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return sendErrorResponse(res, 'משתמש לא מאומת', 401);
    }

    // בדיקת שדות חובה
    const requiredFieldsError = validateRequiredFields(
      { oldPassword, newPassword },
      ['oldPassword', 'newPassword']
    );
    if (requiredFieldsError) {
      return sendErrorResponse(res, requiredFieldsError, 400);
    }

    // בדיקת אורך סיסמה חדשה
    const passwordLengthError = validatePasswordLength(newPassword);
    if (passwordLengthError) {
      return sendErrorResponse(res, passwordLengthError, 400);
    }

    // מציאת המשתמש עם סיסמה
    const user = await findUserByIdWithPassword(userId);
    if (!user) {
      return sendErrorResponse(res, 'משתמש לא נמצא', 404);
    }

    // בדיקת סיסמה ישנה
    const oldPasswordError = await validateOldPassword(user, oldPassword);
    if (oldPasswordError) {
      return sendErrorResponse(res, oldPasswordError, 400);
    }

    // עדכון סיסמה (תוצפן אוטומטית ב-pre save middleware)
    await updateUserPassword(user, newPassword);

    sendSuccessResponse(res, 'הסיסמה שונתה בהצלחה');

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה בשינוי הסיסמה');
  }
};
