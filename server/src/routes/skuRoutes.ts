import { Router } from 'express';
import * as skuController from '../controllers/skuController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';

/**
 * SKU Routes - ניתוב עבור endpoints של SKU
 * 
 * ⚠️ חשוב: סדר ה-routes קריטי!
 * Routes ספציפיים (כמו /search, /inventory) חייבים להיות לפני routes עם פרמטרים (כמו /:sku)
 * אחרת Express יתפוס את "inventory" כערך של :sku
 */

const router = Router();

// ============================================
// Routes ספציפיים - חייבים להיות ראשונים!
// ============================================

/**
 * חיפוש SKUs
 * GET /api/skus/search?color=red&size=M&inStock=true
 */
router.get('/search', skuController.searchSkus);

/**
 * שליפת SKUs לניהול מלאי (Admin) - עם פגינציה, חיפוש ומיון
 * GET /api/skus/inventory?page=1&limit=50&search=xxx&sortBy=stockQuantity&sortOrder=asc&stockFilter=low
 */
router.get(
  '/inventory',
  authMiddleware,
  requireAdmin,
  skuController.getInventorySkus
);

/**
 * קבלת SKUs עם מלאי נמוך
 * GET /api/skus/reports/low-stock?threshold=5
 */
router.get(
  '/reports/low-stock',
  authMiddleware,
  requireAdmin,
  skuController.getLowStockSkus
);

/**
 * קבלת SKUs שאזל מלאיים
 * GET /api/skus/reports/out-of-stock
 */
router.get(
  '/reports/out-of-stock',
  authMiddleware,
  requireAdmin,
  skuController.getOutOfStockSkus
);

/**
 * קבלת הזדמנויות שהוחמצו - מוצרים במלאי נמוך/אזל שנמצאים בסלי לקוחות
 * GET /api/skus/reports/missed-opportunities
 */
router.get(
  '/reports/missed-opportunities',
  authMiddleware,
  requireAdmin,
  skuController.getMissedOpportunities
);

/**
 * עדכון מלאי בצובר
 * POST /api/skus/bulk/update-stock
 * Body: { updates: [{ sku, delta }] }
 */
router.post(
  '/bulk/update-stock',
  authMiddleware,
  requireAdmin,
  skuController.bulkUpdateStock
);

/**
 * יצירת SKU חדש
 * POST /api/skus
 * Body: { sku, productId, name, price, stockQuantity, attributes, images }
 */
router.post(
  '/',
  authMiddleware,
  requireAdmin,
  skuController.createSku
);

// ============================================
// Routes עם פרמטרים - חייבים להיות אחרונים!
// ============================================

/**
 * קבלת פרטי SKU לפי קוד
 * GET /api/skus/:sku
 */
router.get('/:sku', skuController.getSkuByCode);

/**
 * בדיקת זמינות SKU
 * GET /api/skus/:sku/availability?quantity=5
 */
router.get('/:sku/availability', skuController.checkAvailability);

/**
 * עדכון SKU
 * PATCH /api/skus/:sku
 * Body: { name?, price?, stockQuantity?, attributes?, images?, isActive? }
 */
router.patch(
  '/:sku',
  authMiddleware,
  requireAdmin,
  skuController.updateSku
);

/**
 * עדכון מלאי SKU
 * PATCH /api/skus/:sku/stock
 * Body: { delta: number }
 */
router.patch(
  '/:sku/stock',
  authMiddleware,
  requireAdmin,
  skuController.updateStock
);

/**
 * עדכון כמות מלאי ישירה (לניהול מלאי)
 * PUT /api/skus/:sku/stock-quantity
 * Body: { quantity: number }
 */
router.put(
  '/:sku/stock-quantity',
  authMiddleware,
  requireAdmin,
  skuController.setStockQuantity
);

/**
 * מחיקת SKU (רכה או קשה)
 * DELETE /api/skus/:sku?hard=true
 */
router.delete(
  '/:sku',
  authMiddleware,
  requireAdmin,
  skuController.deleteSku
);

export default router;
