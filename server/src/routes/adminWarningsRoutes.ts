import express from 'express';
import * as adminWarningsController from '../controllers/adminWarningsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';

const router = express.Router();

/**
 * נתיבי API לניהול התראות אי-עקביות במוצרים
 * כל הנתיבים מוגנים ב-authentication + הרשאת מנהל
 */

// GET /api/admin/warnings/inconsistencies - קבלת רשימת מוצרים עם בעיות
router.get(
  '/inconsistencies',
  authMiddleware,
  requireAdmin,
  adminWarningsController.getInconsistentProducts
);

// POST /api/admin/warnings/ignore - הוספת התעלמות
router.post(
  '/ignore',
  authMiddleware,
  requireAdmin,
  adminWarningsController.setIgnore
);

// DELETE /api/admin/warnings/ignore/:productId - הסרת התעלמות
router.delete(
  '/ignore/:productId',
  authMiddleware,
  requireAdmin,
  adminWarningsController.removeIgnore
);

export default router;
