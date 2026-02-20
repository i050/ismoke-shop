/**
 * Webhook Routes
 * ==============
 * מקבל webhooks מספקים חיצוניים (Resend).
 * - email.bounced – כתובת לא קיימת (hard bounce)
 * - email.complained – הנמען דיווח ספאם
 *
 * הגדרה ב-Resend Dashboard → Webhooks:
 * URL: https://ismoke-shop-production.up.railway.app/api/webhooks/resend
 * Events: email.bounced, email.complained
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import User from '../models/User';
import StockAlert from '../models/StockAlert';

const router = Router();

// =============================================================================
// Resend Webhook – טיפול באירועי bounce ו-complaint
// =============================================================================

/**
 * POST /api/webhooks/resend
 * Resend שולח POST לכאן כש:
 * - email.bounced – כתובת מייל לא קיימת → סימון המשתמש וביטול התראות
 * - email.complained – דיווח ספאם → סימון המשתמש וביטול התראות
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    // שליפת כתובת המייל מהאירוע
    const email = data?.to?.[0] || data?.email_address;
    if (!email) {
      logger.warn('⚠️ Resend webhook ללא כתובת מייל', { type, data });
      return res.status(400).json({ error: 'חסרה כתובת מייל' });
    }

    switch (type) {
      // Hard bounce – כתובת לא קיימת → סימון שלא לשלוח אליה
      case 'email.bounced': {
        logger.warn('⚠️ Hard bounce מ-Resend', {
          email,
          bounceType: data.bounce?.bounce_type
        });

        // עדכון משתמש אם קיים
        await User.updateOne(
          { email },
          { $set: { emailBounced: true, emailBouncedAt: new Date() } }
        );

        // ביטול התראות מלאי לאימייל הזה
        await StockAlert.updateMany(
          { email, status: 'active' },
          { $set: { status: 'cancelled' } }
        );

        break;
      }

      // דיווח ספאם → סימון וביטול כל השליחות
      case 'email.complained': {
        logger.warn('🚨 Spam complaint מ-Resend', { email });

        await User.updateOne(
          { email },
          { $set: { emailComplaint: true, emailComplaintAt: new Date() } }
        );

        await StockAlert.updateMany(
          { email, status: 'active' },
          { $set: { status: 'cancelled' } }
        );

        break;
      }

      // אירועים אחרים (email.sent, email.delivered, email.opened) – לוג בלבד
      default:
        logger.debug('Resend webhook event', { type, email });
    }

    // Resend מצפה לתשובת 200 כדי לא לשלוח שוב
    res.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    logger.error('❌ שגיאה בעיבוד Resend webhook', { error: message });
    res.status(500).json({ error: 'שגיאה פנימית' });
  }
});

export default router;
