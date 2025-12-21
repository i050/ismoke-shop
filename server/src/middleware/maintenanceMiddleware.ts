/**
 * Middleware לבדיקת מצב תחזוקה (Maintenance Mode)
 * 
 * Middleware גלובלי שרץ לפני כל הנתיבים ובודק:
 * 1. האם האתר במצב תחזוקה
 * 2. אם כן - האם המשתמש מורשה לגשת (לפי JWT token ותפקיד)
 * 
 * משתמש ב-Redis cache לביצועים מיטביים
 * 
 * @module middleware/maintenanceMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getMaintenanceStatus, isRoleAllowed } from '../services/siteSettingsService';
import { logger } from '../utils/logger';

// ============================================================================
// קבועים
// ============================================================================

/**
 * נתיבים שתמיד מותרים - גם במצב תחזוקה
 * אלו נתיבים קריטיים שחייבים לעבוד תמיד
 * 
 * הערה: כאשר ה-middleware נטען עם app.use('/api', maintenanceMiddleware),
 * הנתיב שמגיע ל-req.path הוא ללא ה-prefix "/api".
 * לכן אנחנו בודקים גם את הנתיב המלא (req.originalUrl) וגם את הנתיב היחסי (req.path).
 */
const WHITELISTED_PATHS = [
  '/auth/login',               // התחברות - חייב לעבוד כדי שמשתמשים יוכלו להתחבר
  '/auth/register',            // הרשמה - חייב לעבוד כדי שמשתמשים יוכלו להירשם
  '/auth/logout',              // התנתקות
  '/auth/forgot-password',     // שחזור סיסמה
  '/auth/reset-password',      // איפוס סיסמה
  '/auth/login-2fa',           // התחברות עם 2FA
  '/auth/login-otp',           // התחברות עם OTP מייל
  '/auth/resend-login-otp',    // שליחה מחדש של OTP
  '/site-status',              // סטטוס האתר - הלקוח צריך לדעת על מצב התחזוקה
  '/health',                   // בדיקת בריאות
  '/health/detailed',          // בדיקת בריאות מפורטת
];

/**
 * בדיקה אם הנתיב נמצא ב-whitelist
 */
const isWhitelistedPath = (path: string): boolean => {
  return WHITELISTED_PATHS.some(whitelisted => 
    path === whitelisted || path.startsWith(whitelisted + '/')
  );
};

/**
 * חילוץ ופיענוח JWT token מה-header
 */
const extractUserFromToken = (authHeader: string | undefined): { userId: string; role?: string } | null => {
  if (!authHeader) return null;

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return null;
  }

  const token = tokenParts[1];
  const secret = process.env.JWT_SECRET || 'fallback-secret';

  try {
    const decoded = jwt.verify(token, secret) as { userId: string; role?: string };
    return decoded;
  } catch {
    return null;
  }
};

// ============================================================================
// Middleware ראשי
// ============================================================================

/**
 * Middleware לבדיקת מצב תחזוקה
 * 
 * לוגיקה:
 * 1. בודק אם הנתיב ב-whitelist → מאפשר תמיד
 * 2. קורא את סטטוס התחזוקה מ-Redis/MongoDB
 * 3. אם תחזוקה מופעלת:
 *    - מנסה לחלץ token מה-header
 *    - בודק אם התפקיד של המשתמש מורשה
 *    - אם לא מורשה → מחזיר 503 Service Unavailable
 * 4. אם תחזוקה לא מופעלת → מאפשר גישה
 */
export const maintenanceMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // שלב 1: בדיקת whitelist - נתיבים שתמיד מותרים
    if (isWhitelistedPath(req.path)) {
      return next();
    }

    // שלב 2: קבלת סטטוס תחזוקה (מ-cache או DB)
    const maintenanceStatus = await getMaintenanceStatus();

    // שלב 3: אם תחזוקה לא מופעלת - מאפשר גישה לכולם
    if (!maintenanceStatus.enabled) {
      return next();
    }

    // שלב 4: תחזוקה מופעלת - בודקים אם המשתמש מורשה
    const user = extractUserFromToken(req.headers.authorization);

    // אם אין משתמש מחובר - חוסמים
    if (!user) {
      logger.info('MAINTENANCE_BLOCKED', {
        path: req.path,
        ip: req.ip,
        reason: 'no_auth'
      });

      res.status(503).json({
        success: false,
        message: maintenanceStatus.message,
        maintenanceMode: true,
        code: 'MAINTENANCE_MODE'
      });
      return;
    }

    // בדיקה אם התפקיד של המשתמש מורשה
    if (!isRoleAllowed(user.role, maintenanceStatus.allowedRoles)) {
      logger.info('MAINTENANCE_BLOCKED', {
        path: req.path,
        userId: user.userId,
        role: user.role,
        reason: 'role_not_allowed'
      });

      res.status(503).json({
        success: false,
        message: maintenanceStatus.message,
        maintenanceMode: true,
        code: 'MAINTENANCE_MODE'
      });
      return;
    }

    // המשתמש מורשה - מאפשר גישה
    next();

  } catch (error) {
    // במקרה של שגיאה - מאפשרים גישה (fail-open)
    // כי עדיף שהאתר יעבוד מאשר שייחסם בגלל שגיאה טכנית
    logger.error('MAINTENANCE_MIDDLEWARE_ERROR', { error });
    next();
  }
};

export default maintenanceMiddleware;
