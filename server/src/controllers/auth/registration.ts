import { Request, Response } from 'express';
import {
  validateRequiredFields,
  validatePasswordLength,
  validateEmailFormat,
  validateEmailExists
} from '../../utils/validationHelpers';
import { generateToken } from '../../utils/authHelpers';
import {
  sendSuccessResponse,
  sendErrorResponse,
  sendServerErrorResponse,
  formatUserWithToken
} from '../../utils/responseHelpers';
import { createNewUser } from '../../utils/userHelpers';
import { RegisterRequest } from '../types/auth.types';

// רישום משתמש חדש
export const register = async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // בדיקת שדות חובה
    const requiredFieldsError = validateRequiredFields(
      { firstName, lastName, email, password },
      ['firstName', 'lastName', 'email', 'password']
    );
    if (requiredFieldsError) {
      return sendErrorResponse(res, requiredFieldsError, 400);
    }

    // בדיקת אורך סיסמה
    const passwordLengthError = validatePasswordLength(password);
    if (passwordLengthError) {
      return sendErrorResponse(res, passwordLengthError, 400);
    }

    // בדיקת אימייל תקין
    const emailFormatError = validateEmailFormat(email);
    if (emailFormatError) {
      return sendErrorResponse(res, emailFormatError, 400);
    }

    // בדיקת אימייל קיים
    const emailExistsError = await validateEmailExists(email);
    if (emailExistsError) {
      return sendErrorResponse(res, emailExistsError, 400);
    }

    // יצירת משתמש חדש
    const { user, requiresApproval } = await createNewUser({ firstName, lastName, email, password });

    // אם נדרש אישור מנהל - החזר הודעה מתאימה ללא token
    if (requiresApproval) {
      return sendSuccessResponse(
        res, 
        'בקשתך להרשמה נשלחה למנהל החנות. תקבל הודעה כאשר חשבונך יאושר.', 
        {
          pendingApproval: true,
          email: user.email
        },
        201
      );
    }

    // יצירת token (רק אם לא נדרש אישור)
    const token = generateToken((user._id as any).toString(), user.role);

    // החזרת תגובה
    sendSuccessResponse(res, 'המשתמש נרשם בהצלחה', formatUserWithToken(user, token), 201);

  } catch (error) {
    sendServerErrorResponse(res, error, 'שגיאה ברישום המשתמש');
  }
};
