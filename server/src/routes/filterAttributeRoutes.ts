import express from 'express';
import * as controller from '../controllers/filterAttributeController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';
import { filterAttributesLimiter, adminLimiter } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * Routes ציבוריים (לחזית)
 */

// GET /api/filter-attributes/for-filter - מאפיינים לסינון
router.get('/for-filter', filterAttributesLimiter, controller.getAttributesForFilter);

// 🆕 GET /api/filter-attributes/color-families - משפחות צבעים בלבד (לממשק ניהול)
router.get('/color-families', filterAttributesLimiter, controller.getColorFamiliesForAdmin);

/**
 * Routes מוגנים (Admin בלבד)
 */

// GET /api/filter-attributes - כל המאפיינים
router.get('/', authMiddleware, requireAdmin, adminLimiter, controller.getAllAttributes);

// POST /api/filter-attributes - יצירת מאפיין חדש
router.post('/', authMiddleware, requireAdmin, adminLimiter, controller.createAttribute);

// PUT /api/filter-attributes/:id - עדכון מאפיין
router.put('/:id', authMiddleware, requireAdmin, adminLimiter, controller.updateAttribute);

// GET /api/filter-attributes/:id/usage - כמות שימוש במאפיין
router.get('/:id/usage', authMiddleware, requireAdmin, adminLimiter, controller.getAttributeUsage);

// POST /api/filter-attributes/:id/remove-from-skus - הסרת מאפיין מכל SKUs
router.post('/:id/remove-from-skus', authMiddleware, requireAdmin, adminLimiter, controller.removeAttributeFromSkus);

// DELETE /api/filter-attributes/:id - מחיקת מאפיין
router.delete('/:id', authMiddleware, requireAdmin, adminLimiter, controller.deleteAttribute);

// ============================================================================
// 🆕 ניהול גוונים בתוך משפחות צבע
// ============================================================================

// POST /api/filter-attributes/color-families/:family/variants
router.post('/color-families/:family/variants', authMiddleware, requireAdmin, adminLimiter, controller.addColorVariant);

// PUT /api/filter-attributes/color-families/:family/variants/:variantName
router.put('/color-families/:family/variants/:variantName', authMiddleware, requireAdmin, adminLimiter, controller.updateColorVariant);

// DELETE /api/filter-attributes/color-families/:family/variants/:variantName
router.delete('/color-families/:family/variants/:variantName', authMiddleware, requireAdmin, adminLimiter, controller.deleteColorVariant);

// GET /api/filter-attributes/color-families/:family/variants/:variantName/usage
router.get('/color-families/:family/variants/:variantName/usage', authMiddleware, requireAdmin, adminLimiter, controller.getColorVariantUsage);

export default router;
