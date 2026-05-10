import { Router } from 'express';
import {
  getAllProducts,
  getAllProductsByDate,
  getPopularProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  incrementViewCount,
  getFilteredProducts,
  createProductWithSkus,
  updateProductWithSkus,
  softDeleteProduct,
  restoreProduct,
  hardDeleteProductController,
  bulkSoftDeleteProducts,
  bulkRestoreProducts,
  bulkHardDeleteProductsController,
  checkSkuAvailability,
  getProductsForManagement,
  getProductsAutocomplete,
  getRelatedProducts,
  reserveSkuSequences,
} from '../controllers/productController';
import { authMiddleware, optionalAuthMiddleware, requireAdmin } from '../middleware/authMiddleware';
import { 
  createProductLimiter, 
  updateProductLimiter, 
  deleteProductLimiter,
  uploadLimiter
} from '../middleware/rateLimiter';
import {
  validateCreateProductWithSkus,
  validateUpdateProductWithSkus,
  validateCheckSku,
} from '../middleware/productValidation';
import { mapSizeToAttributes, mapSizeQueryParam } from '../middleware/sizeCompatibility';
import {
  uploadProductImages,
} from '../middleware/uploadMiddleware';
import { uploadProductImagesController } from '../controllers/imageController';

const router = Router();

// GET /api/products/by-date - Get all products sorted by createdAt (newest first)
router.get('/by-date', optionalAuthMiddleware, getAllProductsByDate);

// GET /api/products/popular - Get popular products sorted by views and sales
router.get('/popular', optionalAuthMiddleware, getPopularProducts);

// ============================================================================
// 🔍 Autocomplete - חיפוש מוצרים בזמן אמת
// ============================================================================
// GET /api/products/autocomplete - השלמה אוטומטית לחיפוש מוצרים
// Query params: q (טקסט חיפוש), limit (מספר תוצאות)
// חייב להיות לפני /:id כדי שלא יתפס כ-ID
router.get('/autocomplete', getProductsAutocomplete);

// POST /api/products/reserve-sequences - הזמנת מספרים סידוריים גלובליים ל-SKUs
// Body: { count: number } - כמה מספרים להזמין
// Response: { success: true, sequences: number[] }
router.post('/reserve-sequences', authMiddleware, requireAdmin, reserveSkuSequences);

// GET /api/products/filter - Get products with filtering + pagination + meta
router.get('/filter', optionalAuthMiddleware, mapSizeQueryParam, getFilteredProducts);

// ============================================================================
// 🚀 Phase 5.0: Admin Products Management עם Cursor Pagination + Server-Side Filters
// ============================================================================
// GET /api/products/admin - Get products for admin management page
// Phase 5.0: Cursor pagination מצד השרת, Filtering ו-Sorting
// Query params: search, categoryId, isActive, sortBy, sortDirection, cursor, limit
// Response: { success, data, cursor, hasMore, total }
// דורש אימות (authMiddleware) + הרשאות מנהל (requireAdmin)
router.get('/admin', authMiddleware, requireAdmin, mapSizeQueryParam, getProductsForManagement);


// Defines the routes for the /api/products endpoint

// GET /api/products - Get all products
router.get('/', optionalAuthMiddleware, mapSizeQueryParam, getAllProducts);

// ============================================================================
// 🚀 Phase 1.5: CRUD Routes עם SKUs, Transactions ו-Validation
// ============================================================================

// POST /api/products/with-skus - Create product with SKUs (Transaction-based)
// Phase 0.5.5: משתמש ב-MongoDB Transaction
// Phase 0.5.3: Rate limiting - 20 יצירות לדקה
// Phase 1.3: Joi Validation
router.post(
  '/with-skus',
  authMiddleware,
  requireAdmin,
  createProductLimiter,
  mapSizeToAttributes,
  validateCreateProductWithSkus,
  createProductWithSkus
);

// PUT /api/products/:id/with-skus - Update product with SKUs (Transaction-based)
// Phase 0.5.5: משתמש ב-MongoDB Transaction
// Phase 0.5.3: Rate limiting - 30 עדכונים לדקה
// Phase 1.3: Joi Validation
router.put(
  '/:id/with-skus',
  authMiddleware,
  requireAdmin,
  updateProductLimiter,
  mapSizeToAttributes,
  validateUpdateProductWithSkus,
  updateProductWithSkus
);

// POST /api/products/bulk/soft-delete - העברה מרובה לפח האשפה
router.post('/bulk/soft-delete', authMiddleware, requireAdmin, deleteProductLimiter, bulkSoftDeleteProducts);

// POST /api/products/bulk/restore - שחזור מרובה מפח האשפה
router.post('/bulk/restore', authMiddleware, requireAdmin, updateProductLimiter, bulkRestoreProducts);

// POST /api/products/bulk/permanent-delete - מחיקה סופית מרובה
router.post('/bulk/permanent-delete', authMiddleware, requireAdmin, deleteProductLimiter, bulkHardDeleteProductsController);

// DELETE /api/products/:id/soft - Soft delete product (isActive: false)
// Phase 0.5.7: מעדכן גם את ה-SKUs ל-isActive: false
// Phase 0.5.3: Rate limiting - 10 מחיקות לדקה
router.delete('/:id/soft', authMiddleware, requireAdmin, deleteProductLimiter, softDeleteProduct);

// POST /api/products/:id/restore - Restore soft-deleted product
// Phase 0.5.7: משחזר גם את ה-SKUs ל-isActive: true
router.post('/:id/restore', authMiddleware, requireAdmin, restoreProduct);

// DELETE /api/products/:id/permanent - Hard delete product (מחיקה לצמיתות)
// Phase 1.X: מוחק את המוצר מהנתונים ומ-Cloudinary - פעולה בלתי הפיכה
// Phase 0.5.3: Rate limiting - 10 מחיקות לדקה (משותף עם soft delete)
router.delete('/:id/permanent', authMiddleware, requireAdmin, deleteProductLimiter, hardDeleteProductController);

// POST /api/products/check-sku - Check SKU availability (uniqueness)
// Phase 0.5.6: בודק אם SKU כבר קיים במערכת
// Phase 1.3: Joi Validation
router.post('/check-sku', authMiddleware, requireAdmin, validateCheckSku, checkSkuAvailability);

// POST /api/products/upload-images - Upload product images to DigitalOcean Spaces
// Phase 1.4: העלאת תמונות עם Multer + Sharp + Spaces
// Phase 0.5.3: Rate limiting - 10 uploads ב-60 שניות
// מחזיר: [{ thumbnail, medium, large, key, format, uploadedAt }]
router.post(
  '/upload-images',
  authMiddleware,
  requireAdmin,
  uploadLimiter,
  uploadProductImages,
  uploadProductImagesController
);

// ============================================================================
// Legacy Routes (Simple CRUD - ללא SKUs/Transactions)
// ============================================================================

// POST /api/products - Create a new product (Simple - ללא SKUs)
router.post('/', createProduct);

// GET /api/products/:id/related - Get related products for a specific product
// מחזיר מוצרים מאותה קטגוריה, ממוינים לפי פופולריות
// Query params: limit (default: 4)
router.get('/:id/related', optionalAuthMiddleware, getRelatedProducts);

// GET /api/products/:id - Get a single product by its ID
router.get('/:id', optionalAuthMiddleware, getProductById);

// PUT /api/products/:id - Update a product by its ID
router.put('/:id', updateProduct);

// PUT /api/products/:id/view - Increment view count for a product
router.put('/:id/view', incrementViewCount);

// DELETE /api/products/:id - Delete a product by its ID
router.delete('/:id', deleteProduct);

export default router;
