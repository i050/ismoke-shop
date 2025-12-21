import { Router } from 'express';
import * as stockAlertController from '../controllers/stockAlertController';
import { authMiddleware, optionalAuthMiddleware, requireAdmin } from '../middleware/authMiddleware';

// ============================================================================
// Routes להתראות מלאי - Stock Alert Routes
// API endpoints למערכת "עדכן אותי כשהמוצר יחזור"
// ============================================================================

const router = Router();

// ============================================================================
// Public Routes - נגישים לכל המשתמשים (עם Rate Limiting בשירות)
// ============================================================================

/**
 * יצירת התראת מלאי חדשה
 * @route POST /api/stock-alerts
 * @body { productId, email, skuCode?, phone? }
 * @access Public (עם Rate Limiting)
 * @description מאפשר ללקוחות להירשם לקבלת התראה כשמוצר חוזר למלאי.
 *              אם המשתמש מחובר, נשמור גם את ה-userId שלו.
 */
router.post('/', optionalAuthMiddleware, stockAlertController.createAlert);

/**
 * בדיקה האם קיימת התראה פעילה
 * @route GET /api/stock-alerts/check
 * @query productId - מזהה המוצר (חובה)
 * @query email - אימייל הלקוח (חובה)
 * @query skuCode - קוד SKU (אופציונלי)
 * @access Public
 * @description בודק אם הלקוח כבר נרשם להתראה על מוצר זה
 */
router.get('/check', stockAlertController.checkAlert);

/**
 * ביטול התראה (unsubscribe)
 * @route DELETE /api/stock-alerts/unsubscribe/:token
 * @param token - טוקן ביטול (Base64 של alertId)
 * @access Public
 * @description מאפשר ללקוח לבטל את ההרשמה דרך קישור במייל
 */
router.delete('/unsubscribe/:token', stockAlertController.unsubscribe);

// ============================================================================
// Admin Routes - דורשים הרשאות מנהל
// ============================================================================

/**
 * סטטיסטיקות התראות מלאי
 * @route GET /api/stock-alerts/admin/stats
 * @access Admin
 * @description מחזיר סטטיסטיקות כלליות: סה"כ פעילות, שנשלחו, מוצרים מובילים
 */
router.get(
  '/admin/stats',
  authMiddleware,
  requireAdmin,
  stockAlertController.getStats
);

/**
 * סיכום יומי
 * @route GET /api/stock-alerts/admin/daily-summary
 * @query days - כמה ימים אחורה (ברירת מחדל: 7)
 * @access Admin
 * @description מחזיר סיכום יומי של התראות שנוצרו, נשלחו ובוטלו
 */
router.get(
  '/admin/daily-summary',
  authMiddleware,
  requireAdmin,
  stockAlertController.getDailySummary
);

/**
 * כל ההתראות עם דפדוף
 * @route GET /api/stock-alerts/admin/all
 * @query status - סינון לפי סטטוס (active, sent, cancelled, expired)
 * @query page - מספר עמוד (ברירת מחדל: 1)
 * @query limit - כמות לעמוד (ברירת מחדל: 20)
 * @query sortBy - שדה למיון (ברירת מחדל: createdAt)
 * @query sortOrder - סדר מיון (asc/desc, ברירת מחדל: desc)
 * @access Admin
 */
router.get(
  '/admin/all',
  authMiddleware,
  requireAdmin,
  stockAlertController.getAllAlerts
);

/**
 * התראות לפי מוצר ספציפי
 * @route GET /api/stock-alerts/admin/product/:productId
 * @param productId - מזהה המוצר
 * @query status - סינון לפי סטטוס (אופציונלי)
 * @access Admin
 * @description מחזיר את כל ההתראות עבור מוצר מסוים
 */
router.get(
  '/admin/product/:productId',
  authMiddleware,
  requireAdmin,
  stockAlertController.getAlertsByProduct
);

/**
 * ביטול התראה ידני
 * @route DELETE /api/stock-alerts/admin/:alertId
 * @param alertId - מזהה ההתראה
 * @access Admin
 * @description מאפשר למנהל לבטל התראה באופן ידני
 */
router.delete(
  '/admin/:alertId',
  authMiddleware,
  requireAdmin,
  stockAlertController.cancelAlertAdmin
);

// ============================================================================
// ייצוא
// ============================================================================

export default router;
