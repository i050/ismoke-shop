/**
 * נתיבי הגדרות - Settings Routes
 * 
 * @module routes/settingsRoutes
 */

import { Router } from 'express';
import * as settingsController from '../controllers/settingsController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';

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
 * Body: { enabled?: boolean, message?: string, allowedRoles?: string[] }
 */
router.put('/maintenance', authMiddleware, requireAdmin, settingsController.toggleMaintenanceMode);

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
 */
router.patch('/', authMiddleware, requireAdmin, settingsController.updateSettings);

/**
 * PATCH /api/settings/allow-unpaid-orders
 * עדכון מהיר של הגדרת הזמנות ללא תשלום
 */
router.patch(
  '/allow-unpaid-orders',
  authMiddleware,
  requireAdmin,
  settingsController.toggleAllowUnpaidOrders
);

/**
 * PATCH /api/settings/disable-payment
 * כיבוי/הפעלת אפשרות התשלום - כאשר מכובה, לקוחות יראו רק "הזמנה ללא תשלום"
 */
router.patch(
  '/disable-payment',
  authMiddleware,
  requireAdmin,
  settingsController.toggleDisablePayment
);

/**
 * PATCH /api/settings/require-registration-approval
 * עדכון מהיר של הגדרת דרישת אישור הרשמה
 */
router.patch(
  '/require-registration-approval',
  authMiddleware,
  requireAdmin,
  settingsController.toggleRequireRegistrationApproval
);

/**
 * PATCH /api/settings/require-login-otp
 * עדכון מהיר של הגדרת דרישת OTP בהתחברות
 */
router.patch(
  '/require-login-otp',
  authMiddleware,
  requireAdmin,
  settingsController.toggleRequireLoginOTP
);

export default router;
