import { Router } from 'express';
import {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  trackImpression,
  trackClick,
  reorderBanners,
  uploadBannerImage,
} from '../controllers/bannerController';
import { authMiddleware, requireAdmin } from '../middleware/authMiddleware';
import { trackingLimiter } from '../middleware/rateLimiter';
import { uploadSingleImage } from '../middleware/uploadMiddleware';

// ============================================================================
// Banner Routes - מערכת ניהול באנרים
// ============================================================================

const router = Router();

// ============================================================================
// מסלולים ציבוריים (ללא אימות)
// ============================================================================

/**
 * GET /api/banners
 * קבלת באנרים פעילים ל-Hero Carousel
 * ציבורי - נגיש לכל המשתמשים
 */
router.get('/', getActiveBanners);
/**
 * POST /api/banners/:id/impression
 * הגדלת מונה צפיות (ציבורי עם rate limiting)
 */
router.post('/:id/impression', trackingLimiter, trackImpression);

/**
 * POST /api/banners/:id/click
 * דיווח על קליק בבאנר (ציבורי עם rate limiting)
 */
router.post('/:id/click', trackingLimiter, trackClick);

// ============================================================================
// מסלולי Admin (דורשים אימות + הרשאות מנהל)
// ============================================================================

/**
 * GET /api/banners/all
 * קבלת כל הבאנרים (כולל לא פעילים)
 * Admin בלבד
 */
router.get('/all', authMiddleware, requireAdmin, getAllBanners);

/**
 * POST /api/banners
 * יצירת באנר חדש
 * Admin בלבד
 */
router.post('/', authMiddleware, requireAdmin, createBanner);

/**
 * PUT /api/banners/reorder
 * שינוי סדר באנרים (Admin בלבד)
 * מקבל body: { bannerIds: string[] }
 */
router.put('/reorder', authMiddleware, requireAdmin, reorderBanners);

/**
 * PUT /api/banners/:id
 * עדכון באנר קיים
 * Admin בלבד
 * תומך ב-optimistic locking דרך query param ?expectedVersion=X
 */
router.put('/:id', authMiddleware, requireAdmin, updateBanner);

/**
 * DELETE /api/banners/:id
 * מחיקת באנר (כולל תמונה מ-Cloudinary)
 * Admin בלבד
 */
router.delete('/:id', authMiddleware, requireAdmin, deleteBanner);

/**
 * PUT /api/banners/reorder
 * שינוי סדר באנרים
 * Admin בלבד
 * מקבל body: { bannerIds: string[] }
 */
// NOTE: route defined earlier above '/:id' to avoid matching by the dynamic ':id' route.
// The earlier registration handles this endpoint; duplicate registration removed.

/**
 * POST /api/banners/upload
 * העלאת תמונת באנר ל-Cloudinary
 * Admin בלבד
 * מקבל multipart/form-data עם שדה 'image'
 * body אופציונלי: { bannerId: string }
 */
router.post(
  '/upload',
  authMiddleware,
  requireAdmin,
  uploadSingleImage, // העלאת תמונה בודדת לבאנר
  uploadBannerImage
);

export default router;
