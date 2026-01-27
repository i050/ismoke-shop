/**
 * 🏷️ Brand Routes
 * 
 * נתיבי API לניהול מותגים
 */

import express from 'express';
import * as brandController from '../controllers/brandController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';
import { adminLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// ============================================================================
// Routes ציבוריים (לטופס מוצר - דרופדאון מותגים)
// ============================================================================

// GET /api/brands/for-select - מותגים פעילים לבחירה בדרופדאון
router.get('/for-select', brandController.getBrandsForSelect);

// ============================================================================
// Routes מוגנים (Admin בלבד)
// ============================================================================

// GET /api/brands - כל המותגים (כולל לא פעילים)
router.get('/', authMiddleware, requireAdmin, adminLimiter, brandController.getAllBrands);

// POST /api/brands - יצירת מותג חדש
router.post('/', authMiddleware, requireAdmin, adminLimiter, brandController.createBrand);

// PUT /api/brands/:id - עדכון מותג
router.put('/:id', authMiddleware, requireAdmin, adminLimiter, brandController.updateBrand);

// GET /api/brands/:id/usage - כמות שימוש במותג
router.get('/:id/usage', authMiddleware, requireAdmin, adminLimiter, brandController.getBrandUsage);

// DELETE /api/brands/:id - מחיקת מותג
router.delete('/:id', authMiddleware, requireAdmin, adminLimiter, brandController.deleteBrand);

export default router;
