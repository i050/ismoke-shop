import { Router } from 'express';
import {
	createCategory,
	getCategories,
	getCategoriesTree,
	getCategory,
	updateCategory,
	deleteCategory,
	// פונקציות חדשות
	getCategoryStats,
	safeDeleteCategory,
	reorderCategories,
	uploadCategoryImage,
	getActiveCategoriesTree,
	// פונקציות לניהול תבנית מפרט טכני
	getSpecificationTemplate,
	updateSpecificationTemplate,
} from '../controllers/categoryController';
import {
	validateCreateCategory,
	validateUpdateCategory,
	validateSafeDeleteCategory,
	validateReorderCategories,
	validateUploadCategoryImage,
	validateCategoryId,
} from '../middleware/categoryValidation';

const router = Router();

// ============================================================================
// נתיבים קיימים - ללא שינוי לתאימות אחורה
// ============================================================================

// GET /api/categories - רשימת קטגוריות שטוחה
router.get('/', getCategories);

// GET /api/categories/tree - עץ קטגוריות (כל הקטגוריות)
router.get('/tree', getCategoriesTree);

// GET /api/categories/tree/active - עץ קטגוריות פעילות בלבד (לחנות)
// חייב להיות לפני /:id!
router.get('/tree/active', getActiveCategoriesTree);

// POST /api/categories - יצירת קטגוריה (עם ולידציה חדשה)
router.post('/', validateCreateCategory, createCategory);

// POST /api/categories/reorder - שינוי סדר קטגוריות (batch)
// חייב להיות לפני /:id!
router.post('/reorder', validateReorderCategories, reorderCategories);

// GET /api/categories/stats/:id - סטטיסטיקות קטגוריה
router.get('/stats/:id', validateCategoryId, getCategoryStats);

// ============================================================================
// נתיבים לניהול תבנית מפרט טכני
// ============================================================================

// GET /api/categories/:id/specification-template - תבנית מפרט עם ירושה
router.get('/:id/specification-template', validateCategoryId, getSpecificationTemplate);

// PUT /api/categories/:id/specification-template - עדכון תבנית מפרט
router.put('/:id/specification-template', validateCategoryId, updateSpecificationTemplate);

// ============================================================================
// נתיבים לקטגוריה בודדת
// ============================================================================

// GET /api/categories/:id - קטגוריה בודדת
router.get('/:id', validateCategoryId, getCategory);

// PUT /api/categories/:id - עדכון קטגוריה (עם ולידציה חדשה)
router.put('/:id', validateUpdateCategory, updateCategory);

// DELETE /api/categories/:id - מחיקה פשוטה (לתאימות אחורה)
router.delete('/:id', validateCategoryId, deleteCategory);

// DELETE /api/categories/:id/safe - מחיקה בטוחה עם אפשרויות
router.delete('/:id/safe', validateSafeDeleteCategory, safeDeleteCategory);

// POST /api/categories/:id/image - העלאת תמונה לקטגוריה
router.post('/:id/image', validateUploadCategoryImage, uploadCategoryImage);

export default router;
