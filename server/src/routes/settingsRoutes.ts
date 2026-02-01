/**
 * נתיבי הגדרות - Settings Routes
 * 
 * @module routes/settingsRoutes
 */

import { Router } from 'express';
import * as settingsController from '../controllers/settingsController';
import { authMiddleware, requireAdmin, requireRecentAuth } from '../middleware/authMiddleware';

const router = Router();

// ============================================================================
// Public Routes - לכל המשתמשים
// ============================================================================

/**
 * GET /api/settings/public
 * קבלת הגדרות ציבוריות (ללא אימות)
 */
router.get('/public', settingsController.getPublicSettings);

// ============================================================================
// Maintenance Routes - ניהול מצב תחזוקה
// ============================================================================

/**
 * GET /api/settings/maintenance
 * קבלת הגדרות תחזוקה (Admin only)
 */
router.get('/maintenance', authMiddleware, requireAdmin, settingsController.getMaintenanceSettings);

/**
 * PUT /api/settings/maintenance
 * עדכון מצב תחזוקה (Admin only)
 * 🔐 Soft Login: דורש אימות אחרון (פעולה רגישה)
 * Body: { enabled?: boolean, message?: string, allowedRoles?: string[] }
 */
router.put('/maintenance', authMiddleware, requireAdmin, requireRecentAuth, settingsController.toggleMaintenanceMode);

// ============================================================================
// Admin Routes - למנהלים בלבד
// ============================================================================

/**
 * GET /api/settings
 * קבלת כל ההגדרות
 */
router.get('/', authMiddleware, requireAdmin, settingsController.getAllSettings);

/**
 * PATCH /api/settings
 * עדכון הגדרות
 * 🔐 Soft Login: דורש אימות אחרון (פעולה רגישה)
 */
router.patch('/', authMiddleware, requireAdmin, requireRecentAuth, settingsController.updateSettings);

/**
 * PATCH /api/settings/allow-unpaid-orders
 * עדכון מהיר של הגדרת הזמנות ללא תשלום
 * 🔐 Soft Login: דורש אימות אחרון (פעולה רגישה)
 */
router.patch(
  '/allow-unpaid-orders',
  authMiddleware,
  requireAdmin,
  requireRecentAuth,
  settingsController.toggleAllowUnpaidOrders
);

/**
 * PATCH /api/settings/disable-payment
 * כיבוי/הפעלת אפשרות התשלום - כאשר מכובה, לקוחות יראו רק "הזמנה ללא תשלום"
 * 🔐 Soft Login: דורש אימות אחרון (פעולה רגישה)
 */
router.patch(
  '/disable-payment',
  authMiddleware,
  requireAdmin,
  requireRecentAuth,
  settingsController.toggleDisablePayment
);

/**
 * PATCH /api/settings/require-registration-approval
 * עדכון מהיר של הגדרת דרישת אישור הרשמה
 * 🔐 Soft Login: דורש אימות אחרון (פעולה רגישה)
 */
router.patch(
  '/require-registration-approval',
  authMiddleware,
  requireAdmin,
  requireRecentAuth,
  settingsController.toggleRequireRegistrationApproval
);

/**
 * PATCH /api/settings/require-login-otp
 * עדכון מהיר של הגדרת דרישת OTP בהתחברות
 * 🔐 Soft Login: דורש אימות אחרון (פעולה רגישה)
 */
router.patch(
  '/require-login-otp',
  authMiddleware,
  requireAdmin,
  requireRecentAuth,
  settingsController.toggleRequireLoginOTP
);

/**
 * PATCH /api/settings/show-cart-total-in-header
 * הפעלה/ביטול הצגת מחיר כולל ליד אייקון העגלה בהדר
 */
router.patch(
  '/show-cart-total-in-header',
  authMiddleware,
  requireAdmin,
  settingsController.toggleShowCartTotalInHeader
);

export default router;
