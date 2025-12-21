import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// הרחבת ממשק Request להוספת מידע על המשתמש
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role?: 'customer' | 'admin' | 'super_admin';
      };
    }
  }
}

// Middleware לאימות JWT token
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // קבלת ה-token מה-header
    const authHeader = req.headers.authorization;

    console.log('[authMiddleware] Authorization header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'אסימון גישה חסר'
      });
    }

    // בדיקת פורמט ה-token (Bearer token)
    const tokenParts = authHeader.split(' ');
    console.log('[authMiddleware] Token parts:', tokenParts.length, 'First part:', tokenParts[0]);
    
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      console.log('[authMiddleware] Invalid token format');
      return res.status(401).json({
        success: false,
        message: 'פורמט אסימון לא תקין'
      });
    }

    const token = tokenParts[1];
    console.log('[authMiddleware] Token extracted, length:', token.length, 'Preview:', token.substring(0, 20) + '...');

    // אימות ה-token
    const secret = process.env.JWT_SECRET || 'fallback-secret';

    try {
      const decoded = jwt.verify(token, secret) as { userId: string; role?: 'customer' | 'admin' | 'super_admin' };
      console.log('[authMiddleware] Token verified successfully. UserId:', decoded.userId, 'Role:', decoded.role);

      // הוספת מידע המשתמש ל-request
      req.user = {
        userId: decoded.userId,
        role: decoded.role
      };

      // המשך לפונקציה הבאה
      next();

    } catch (jwtError) {
      // טיפול בשגיאות JWT ספציפיות
      console.error('[authMiddleware] JWT verification failed:', jwtError);
      if (jwtError instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: 'אסימון גישה פג תוקף'
        });
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          message: 'אסימון גישה לא תקין'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'שגיאה באימות אסימון'
        });
      }
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה באימות המשתמש'
    });
  }
};

// Middleware אופציונלי לאימות - לא חוסם אם אין טוקן, רק מוסיף מידע משתמש אם קיים
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // קבלת ה-token מה-header
    const authHeader = req.headers.authorization;

    // אם אין טוקן, פשוט ממשיכים בלי מידע משתמש
    if (!authHeader) {
      return next();
    }

    // בדיקת פורמט ה-token (Bearer token)
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return next(); // ממשיכים גם אם הפורמט לא תקין
    }

    const token = tokenParts[1];

    // אימות ה-token
    const secret = process.env.JWT_SECRET || 'fallback-secret';

    try {
      const decoded = jwt.verify(token, secret) as { userId: string; role?: 'customer' | 'admin' | 'super_admin' };

      // הוספת מידע המשתמש ל-request אם הטוקן תקף
      req.user = {
        userId: decoded.userId,
        role: decoded.role
      };

    } catch (jwtError: any) {
      // אם יש שגיאה בטוקן, פשוט ממשיכים בלי מידע משתמש
      console.log('Optional auth failed:', jwtError?.message || 'Unknown error');
    }

    // תמיד ממשיכים - גם אם יש שגיאה
    next();

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // גם במקרה של שגיאה כללית, ממשיכים
    next();
  }
};

// Middleware לאימות תפקיד מנהל - חייב לרוץ אחרי authMiddleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // בדיקה שיש משתמש מחובר (authMiddleware רץ לפני)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'נדרש אימות'
    });
  }

  // בדיקת תפקיד מנהל
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'גישה נדחתה - נדרשות הרשאות מנהל'
    });
  }

  // המשתמש הוא מנהל - אפשר להמשיך
  next();
};

// Middleware לאימות תפקיד super admin בלבד
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  // בדיקה שיש משתמש מחובר
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'נדרש אימות'
    });
  }

  // בדיקת תפקיד super admin
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'גישה נדחתה - נדרשות הרשאות מנהל על'
    });
  }

  // המשתמש הוא super admin - אפשר להמשיך
  next();
};
