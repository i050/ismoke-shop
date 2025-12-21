// ==========================================
// Role Middleware - הגנת הרשאות לפי תפקיד משתמש
// ==========================================
// מטרה: לוודא שרק משתמשים עם התפקיד המתאים יכולים לגשת ל-endpoints ניהוליים
// חשוב: middleware זה חייב לרוץ **אחרי** authMiddleware שמוסיף את userId ל-req

import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

// הרחבת טיפוס Request כדי לכלול את user שמגיע מ-authMiddleware
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

/**
 * requireRole - middleware גנרי לבדיקת תפקיד משתמש
 * @param allowedRoles - מערך של תפקידים מורשים (למשל: ['admin', 'super_admin'])
 * @returns middleware function שבודקת אם למשתמש יש אחד מהתפקידים המורשים
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // שלב 1: בדיקה שיש user.userId (צריך לרוץ אחרי authMiddleware!)
      if (!req.user?.userId) {
        return res.status(401).json({
          success: false,
          message: 'לא מזוהה - נדרשת התחברות'
        });
      }

      // שלב 2: טעינת המשתמש מהמסד נתונים
      const user = await User.findById(req.user.userId).select('role isActive');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }

      // שלב 3: בדיקה שהמשתמש פעיל
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'חשבון המשתמש אינו פעיל'
        });
      }

      // שלב 4: בדיקת תפקיד - האם המשתמש ברשימת התפקידים המורשים?
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה לבצע פעולה זו',
          required: allowedRoles,
          current: user.role
        });
      }

      // שלב 5: הכל תקין - המשך לפונקציה הבאה
      next();

    } catch (error) {
      console.error('❌ Role middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בבדיקת הרשאות'
      });
    }
  };
};

// ==========================================
// קיצורי דרך נפוצים - middleware מוכנים לשימוש
// ==========================================

/**
 * requireAdmin - דורש הרשאת מנהל (admin או super_admin)
 * שימוש: router.use(authMiddleware, requireAdmin);
 */
export const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * requireSuperAdmin - דורש הרשאת מנהל עליון בלבד
 * שימוש: router.delete('/critical-data', authMiddleware, requireSuperAdmin, controller.delete);
 */
export const requireSuperAdmin = requireRole(['super_admin']);

/**
 * requireCustomer - דורש משתמש רגיל (כולל מנהלים)
 * שימוש נדיר - בדרך כלל authMiddleware מספיק
 */
export const requireCustomer = requireRole(['customer', 'admin', 'super_admin']);
