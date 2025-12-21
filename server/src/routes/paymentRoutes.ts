/**
 * ניתובי תשלומים - Payment Routes
 * 
 * מגדיר את כל נקודות הקצה של ה-API לתשלומים
 * כולל הרשאות, rate limiting ו-validation
 * 
 * @module routes/paymentRoutes
 */

import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';
import {
  createPaymentLimiter,
  refundLimiter,
  webhookLimiter
} from '../middleware/rateLimiter';
import {
  validateCreatePayment,
  validateConfirmPayment,
  validateRefund
} from '../validators/orderValidators';
import * as paymentService from '../services/paymentService';
import { handlePaymentWebhook, getFailedWebhooks, retryFailedWebhook } from '../controllers/paymentWebhookController';
import { logger } from '../utils/logger';

const router = express.Router();

// =============================================================================
// Public Endpoints (ללא אימות - webhooks)
// =============================================================================

/**
 * Webhook מספק תשלומים
 * POST /api/payments/webhook
 * 
 * Rate limited: 100 בקשות לדקה
 * לא דורש אימות - מאומת באמצעות חתימה
 */
router.post(
  '/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  handlePaymentWebhook
);

// =============================================================================
// Protected Endpoints (דורשים אימות)
// =============================================================================

router.use(authMiddleware);

/**
 * יצירת תשלום חדש
 * POST /api/payments
 * 
 * Rate limited: 5 ניסיונות לדקה
 * Validation: orderId, amount
 * 
 * Body:
 * - orderId: מזהה הזמנה (חובה)
 * - amount: סכום לתשלום (חובה)
 * - currency: מטבע (ברירת מחדל: ILS)
 * - paymentMethod: אמצעי תשלום
 * - successUrl: URL להצלחה
 * - cancelUrl: URL לביטול
 */
router.post(
  '/',
  createPaymentLimiter,
  validateCreatePayment,
  async (req: Request, res: Response) => {
    try {
      const { orderId, amount, currency, successUrl, cancelUrl, metadata } = req.body;
      const userId = (req as any).user?.userId;
      
      const result = await paymentService.createPayment({
        orderId,
        amount,
        currency,
        customerId: userId,
        customerEmail: (req as any).user?.email,
        successUrl,
        cancelUrl,
        metadata
      });
      
      logger.info('תשלום נוצר', {
        paymentId: result.paymentId,
        orderId,
        amount,
        userId
      });
      
      res.status(201).json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('שגיאה ביצירת תשלום', { error });
      res.status(500).json({
        success: false,
        message: 'שגיאה ביצירת התשלום'
      });
    }
  }
);

/**
 * אישור תשלום (מ-Mock - לבדיקות)
 * POST /api/payments/:paymentId/confirm
 * 
 * ב-Mock בלבד - מסמלץ שהלקוח שילם
 * בספק אמיתי - זה יגיע דרך webhook
 */
router.post(
  '/:paymentId/confirm',
  validateConfirmPayment,
  async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      
      const result = await paymentService.confirmPayment(paymentId);
      
      logger.info('תשלום אושר', {
        paymentId,
        status: result.status
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      logger.error('שגיאה באישור תשלום', { error });
      res.status(400).json({
        success: false,
        message: error.message || 'שגיאה באישור התשלום'
      });
    }
  }
);

/**
 * קבלת סטטוס תשלום
 * GET /api/payments/:paymentId
 */
router.get(
  '/:paymentId',
  async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      
      const result = await paymentService.getPaymentStatus(paymentId);
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      logger.error('שגיאה בקבלת סטטוס תשלום', { error });
      res.status(404).json({
        success: false,
        message: error.message || 'תשלום לא נמצא'
      });
    }
  }
);

/**
 * ביטול תשלום
 * POST /api/payments/:paymentId/cancel
 */
router.post(
  '/:paymentId/cancel',
  async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      
      const result = await paymentService.cancelPayment(paymentId);
      
      logger.info('תשלום בוטל', { paymentId });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      logger.error('שגיאה בביטול תשלום', { error });
      res.status(400).json({
        success: false,
        message: error.message || 'שגיאה בביטול התשלום'
      });
    }
  }
);

// =============================================================================
// Admin Endpoints
// =============================================================================

/**
 * ביצוע החזר (Admin)
 * POST /api/payments/:paymentId/refund
 * 
 * Rate limited: 3 בקשות לדקה
 * 
 * Body:
 * - amount: סכום להחזר (אופציונלי - אם לא מסופק, החזר מלא)
 * - reason: סיבת ההחזר (חובה)
 * - notes: הערות (אופציונלי)
 */
router.post(
  '/:paymentId/refund',
  requireAdmin,
  refundLimiter,
  validateRefund,
  async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const { amount, reason, notes } = req.body;
      
      const result = await paymentService.refundPayment({
        paymentId,
        amount,
        reason
      });
      
      logger.info('החזר בוצע', {
        refundId: result.refundId,
        paymentId,
        amount: result.amount,
        reason,
        adminId: (req as any).user?.userId
      });
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error: any) {
      logger.error('שגיאה בביצוע החזר', { error });
      res.status(400).json({
        success: false,
        message: error.message || 'שגיאה בביצוע ההחזר'
      });
    }
  }
);

/**
 * בדיקת תקינות שירות תשלומים (Admin)
 * GET /api/payments/health
 */
router.get(
  '/admin/health',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const health = await paymentService.checkPaymentHealth();
      
      res.json({
        success: true,
        data: health
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה בבדיקת שירות תשלומים'
      });
    }
  }
);

/**
 * סימולציית Webhook (Mock בלבד - לבדיקות)
 * POST /api/payments/:paymentId/simulate-webhook
 * 
 * זמין רק כש-PAYMENT_MOCK_MODE=true
 */
router.post(
  '/:paymentId/simulate-webhook',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const { eventType = 'payment.succeeded' } = req.body;
      
      const event = paymentService.simulateWebhook(paymentId, eventType);
      
      logger.info('Webhook מדומה נוצר', {
        paymentId,
        eventType,
        adminId: (req as any).user?.userId
      });
      
      res.json({
        success: true,
        message: 'Webhook simulated successfully',
        data: event
      });
      
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'שגיאה בסימולציית Webhook'
      });
    }
  }
);

/**
 * קבלת webhooks שנכשלו (Admin)
 * GET /api/payments/admin/failed-webhooks
 */
router.get(
  '/admin/failed-webhooks',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const failedWebhooks = await getFailedWebhooks(limit);
      
      res.json({
        success: true,
        data: failedWebhooks,
        count: failedWebhooks.length
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'שגיאה בקבלת webhooks שנכשלו'
      });
    }
  }
);

/**
 * ניסיון חוזר לעיבוד webhook (Admin)
 * POST /api/payments/admin/retry-webhook/:eventId
 */
router.post(
  '/admin/retry-webhook/:eventId',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const success = await retryFailedWebhook(eventId);
      
      if (success) {
        res.json({
          success: true,
          message: 'Webhook עובד בהצלחה'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'העיבוד מחדש נכשל'
        });
      }
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'שגיאה בניסיון חוזר'
      });
    }
  }
);

// =============================================================================
// Export
// =============================================================================

export default router;
