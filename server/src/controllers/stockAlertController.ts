import { Request, Response } from 'express';
import * as stockAlertService from '../services/stockAlertService';
import { logger } from '../utils/logger';

// ============================================================================
// Controller להתראות מלאי - Stock Alert Controller
// מטפל בכל בקשות ה-API הקשורות למערכת "עדכן אותי כשהמוצר יחזור"
// ============================================================================

/**
 * יצירת התראת מלאי חדשה
 * @route POST /api/stock-alerts
 * @access Public (עם Rate Limiting)
 */
export const createAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, email, skuCode, phone } = req.body;

    // ולידציה בסיסית
    if (!productId) {
      res.status(400).json({
        success: false,
        message: 'מזהה מוצר חסר',
        code: 'MISSING_PRODUCT_ID',
      });
      return;
    }

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'כתובת אימייל חסרה',
        code: 'MISSING_EMAIL',
      });
      return;
    }

    // ולידציית פורמט אימייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'כתובת אימייל לא תקינה',
        code: 'INVALID_EMAIL',
      });
      return;
    }

    // קבלת מידע נוסף מהבקשה
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.get('User-Agent') || '';
    const userId = req.user?.userId;

    // יצירת ההתראה
    const alert = await stockAlertService.createStockAlert({
      productId,
      email,
      skuCode,
      phone,
      userId,
      ipAddress,
      userAgent,
    });

    res.status(201).json({
      success: true,
      message: 'נרשמת בהצלחה! נעדכן אותך כשהמוצר יחזור למלאי',
      data: {
        alertId: alert._id,
        email: alert.email,
        productId: alert.productId,
        skuCode: alert.skuCode,
      },
    });
  } catch (error: any) {
    // טיפול בשגיאות ספציפיות
    if (error.message === 'TOO_MANY_REQUESTS') {
      res.status(429).json({
        success: false,
        message: 'יותר מדי בקשות. נסה שוב מאוחר יותר',
        code: 'TOO_MANY_REQUESTS',
      });
      return;
    }

    if (error.message === 'PRODUCT_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'המוצר לא נמצא',
        code: 'PRODUCT_NOT_FOUND',
      });
      return;
    }

    if (error.message === 'SKU_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'הווריאנט המבוקש לא נמצא',
        code: 'SKU_NOT_FOUND',
      });
      return;
    }

    if (error.message === 'ALERT_ALREADY_EXISTS') {
      res.status(409).json({
        success: false,
        message: 'כבר נרשמת לקבלת התראה על מוצר זה',
        code: 'ALERT_ALREADY_EXISTS',
      });
      return;
    }

    logger.error('Error creating stock alert', { error, body: req.body });
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצירת ההתראה',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * בדיקה האם קיימת התראה פעילה
 * @route GET /api/stock-alerts/check
 * @query productId - מזהה המוצר
 * @query email - אימייל הלקוח
 * @query skuCode - קוד SKU (אופציונלי)
 * @access Public
 */
export const checkAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, email, skuCode } = req.query;

    // ולידציה
    if (!productId || !email) {
      res.status(400).json({
        success: false,
        message: 'חסרים פרמטרים נדרשים (productId, email)',
        code: 'MISSING_PARAMS',
      });
      return;
    }

    const hasActiveAlert = await stockAlertService.checkExistingAlert(
      email as string,
      productId as string,
      skuCode as string | undefined
    );

    res.json({
      success: true,
      data: {
        hasActiveAlert,
      },
    });
  } catch (error) {
    logger.error('Error checking stock alert', { error, query: req.query });
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת ההתראה',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * ביטול התראה (unsubscribe) לפי token
 * @route DELETE /api/stock-alerts/unsubscribe/:token
 * @param token - טוקן ביטול (Base64 של alertId)
 * @access Public
 */
export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'טוקן ביטול חסר',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    const cancelled = await stockAlertService.cancelAlertByToken(token);

    if (cancelled) {
      res.json({
        success: true,
        message: 'ההתראה בוטלה בהצלחה',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'ההתראה לא נמצאה או כבר בוטלה',
        code: 'ALERT_NOT_FOUND',
      });
    }
  } catch (error) {
    logger.error('Error unsubscribing from stock alert', { error, token: req.params.token });
    res.status(500).json({
      success: false,
      message: 'שגיאה בביטול ההתראה',
      code: 'SERVER_ERROR',
    });
  }
};

// ============================================================================
// Admin Routes - פונקציות ניהול
// ============================================================================

/**
 * קבלת סטטיסטיקות (Admin)
 * @route GET /api/stock-alerts/admin/stats
 * @access Admin
 */
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await stockAlertService.getStockAlertStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error fetching stock alert stats', { error });
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת סטטיסטיקות',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * קבלת התראות לפי מוצר (Admin)
 * @route GET /api/stock-alerts/admin/product/:productId
 * @param productId - מזהה המוצר
 * @query status - סינון לפי סטטוס (אופציונלי)
 * @access Admin
 */
export const getAlertsByProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { status } = req.query;

    if (!productId) {
      res.status(400).json({
        success: false,
        message: 'מזהה מוצר חסר',
        code: 'MISSING_PRODUCT_ID',
      });
      return;
    }

    // ולידציה של סטטוס אם נשלח
    const validStatuses = ['active', 'sent', 'cancelled', 'expired'];
    if (status && !validStatuses.includes(status as string)) {
      res.status(400).json({
        success: false,
        message: 'סטטוס לא תקין',
        code: 'INVALID_STATUS',
      });
      return;
    }

    const alerts = await stockAlertService.getAlertsByProduct(
      productId,
      status as any
    );

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error('Error fetching alerts by product', { error, productId: req.params.productId });
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת ההתראות',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * קבלת כל ההתראות עם דפדוף (Admin)
 * @route GET /api/stock-alerts/admin/all
 * @query status - סינון לפי סטטוס
 * @query page - מספר עמוד
 * @query limit - כמות לעמוד
 * @access Admin
 */
export const getAllAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page, limit, sortBy, sortOrder } = req.query;

    const result = await stockAlertService.getAllAlerts({
      status: status as any,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching all alerts', { error, query: req.query });
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת ההתראות',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * קבלת סיכום יומי (Admin)
 * @route GET /api/stock-alerts/admin/daily-summary
 * @query days - כמה ימים אחורה (ברירת מחדל: 7)
 * @access Admin
 */
export const getDailySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days } = req.query;
    const daysNum = days ? parseInt(days as string, 10) : 7;

    const summary = await stockAlertService.getDailySummary(daysNum);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Error fetching daily summary', { error });
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת הסיכום',
      code: 'SERVER_ERROR',
    });
  }
};

/**
 * ביטול התראה ידני (Admin)
 * @route DELETE /api/stock-alerts/admin/:alertId
 * @param alertId - מזהה ההתראה
 * @access Admin
 */
export const cancelAlertAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { alertId } = req.params;

    if (!alertId) {
      res.status(400).json({
        success: false,
        message: 'מזהה התראה חסר',
        code: 'MISSING_ALERT_ID',
      });
      return;
    }

    // ביטול ישיר ללא צורך באימייל (Admin)
    const result = await stockAlertService.cancelAlertByToken(
      Buffer.from(alertId).toString('base64')
    );

    if (result) {
      res.json({
        success: true,
        message: 'ההתראה בוטלה בהצלחה',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'ההתראה לא נמצאה',
        code: 'ALERT_NOT_FOUND',
      });
    }
  } catch (error) {
    logger.error('Error cancelling alert (admin)', { error, alertId: req.params.alertId });
    res.status(500).json({
      success: false,
      message: 'שגיאה בביטול ההתראה',
      code: 'SERVER_ERROR',
    });
  }
};

// ============================================================================
// ייצוא
// ============================================================================

export default {
  // Public
  createAlert,
  checkAlert,
  unsubscribe,
  
  // Admin
  getStats,
  getAlertsByProduct,
  getAllAlerts,
  getDailySummary,
  cancelAlertAdmin,
};
