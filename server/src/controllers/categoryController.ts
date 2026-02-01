import { Request, Response } from 'express';
import * as categoryService from '../services/categoryService';

// ============================================================================
// פונקציות CRUD קיימות - ללא שינוי לתאימות אחורה
// ============================================================================

// יצירת קטגוריה חדשה (משודרגת - תומכת בשדות החדשים)
export const createCategory = async (req: Request, res: Response) => {
	try {
		const { name, slug, parentId, description, isActive, sortOrder } = req.body;
		const created = await categoryService.createCategory({ 
			name, 
			slug, 
			parentId,
			description,
			isActive,
			sortOrder,
		});
		res.status(201).json(created);
	} catch (err: any) {
		res.status(400).json({ message: 'שגיאה ביצירת קטגוריה', error: err.message });
	}
};

// קבלת כל הקטגוריות
export const getCategories = async (_req: Request, res: Response) => {
	try {
		const list = await categoryService.getAllCategories();
		res.json(list);
	} catch (err: any) {
		res.status(500).json({ message: 'שגיאה בקבלת קטגוריות', error: err.message });
	}
};

// קבלת עץ קטגוריות היררכי
export const getCategoriesTree = async (_req: Request, res: Response) => {
	try {
		const tree = await categoryService.getCategoriesTree();
		console.log('🌳 [getCategoriesTree] Returning tree with', tree.length, 'root categories');
		console.log('🔍 [getCategoriesTree] First category:', JSON.stringify(tree[0], null, 2));
		res.json(tree);
	} catch (err: any) {
		res.status(500).json({ message: 'שגיאה בבניית עץ קטגוריות', error: err.message });
	}
};

// קבלת קטגוריה לפי מזהה
export const getCategory = async (req: Request, res: Response) => {
	try {
		const cat = await categoryService.getCategoryById(req.params.id);
		if (!cat) return res.status(404).json({ message: 'קטגוריה לא נמצאה' });
		res.json(cat);
	} catch (err: any) {
		res.status(500).json({ message: 'שגיאה בקבלת קטגוריה', error: err.message });
	}
};

// עדכון קטגוריה לפי מזהה (משודרגת - תומכת בשדות החדשים)
export const updateCategory = async (req: Request, res: Response) => {
	try {
		const cat = await categoryService.updateCategory(req.params.id, req.body);
		if (!cat) return res.status(404).json({ message: 'קטגוריה לא נמצאה' });
		res.json(cat);
	} catch (err: any) {
		res.status(400).json({ message: 'שגיאה בעדכון קטגוריה', error: err.message });
	}
};

// מחיקת קטגוריה לפי מזהה (פשוטה - לתאימות אחורה)
export const deleteCategory = async (req: Request, res: Response) => {
	try {
		const cat = await categoryService.deleteCategory(req.params.id);
		if (!cat) return res.status(404).json({ message: 'קטגוריה לא נמצאה' });
		res.json({ message: 'נמחק בהצלחה' });
	} catch (err: any) {
		res.status(500).json({ message: 'שגיאה במחיקת קטגוריה', error: err.message });
	}
};

// ============================================================================
// פונקציות חדשות לניהול Admin
// ============================================================================

/**
 * קבלת סטטיסטיקות קטגוריה
 * מחזיר: מספר תת-קטגוריות, מספר מוצרים, מספר מוצרים כולל צאצאים
 * GET /api/categories/stats/:id
 */
export const getCategoryStats = async (req: Request, res: Response) => {
	try {
		const stats = await categoryService.getCategoryStats(req.params.id);
		res.json(stats);
	} catch (err: any) {
		res.status(500).json({ message: 'שגיאה בקבלת סטטיסטיקות', error: err.message });
	}
};

/**
 * מחיקה בטוחה עם אפשרויות
 * - deleteSubcategories: האם למחוק גם תת-קטגוריות
 * - reassignTo: לאיזו קטגוריה להעביר מוצרים (null = להסיר)
 * DELETE /api/categories/:id/safe
 */
export const safeDeleteCategory = async (req: Request, res: Response) => {
	try {
		const { deleteSubcategories, reassignTo } = req.body;
		const result = await categoryService.safeDeleteCategory(req.params.id, {
			deleteSubcategories,
			reassignTo,
		});
		res.json(result);
	} catch (err: any) {
		res.status(400).json({ message: err.message });
	}
};

/**
 * שינוי סדר קטגוריות (batch update)
 * מקבל מערך של { id, sortOrder }
 * POST /api/categories/reorder
 */
export const reorderCategories = async (req: Request, res: Response) => {
	try {
		const { items } = req.body;
		await categoryService.reorderCategories(items);
		res.json({ message: 'הסדר עודכן בהצלחה' });
	} catch (err: any) {
		res.status(400).json({ message: 'שגיאה בעדכון סדר', error: err.message });
	}
};

/**
 * העלאת/עדכון תמונה לקטגוריה
 * מקבל url ו-public_id (מ-Cloudinary)
 * POST /api/categories/:id/image
 */
export const uploadCategoryImage = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { url, public_id } = req.body;
		
		// עדכון הקטגוריה עם התמונה
		const category = await categoryService.updateCategory(id, {
			image: { url, public_id },
		} as any);
		
		if (!category) {
			return res.status(404).json({ message: 'קטגוריה לא נמצאה' });
		}
		
		res.json(category);
	} catch (err: any) {
		res.status(400).json({ message: 'שגיאה בהעלאת תמונה', error: err.message });
	}
};

/**
 * קבלת עץ קטגוריות פעילות בלבד (לשימוש בחנות)
 * GET /api/categories/tree/active
 */
export const getActiveCategoriesTree = async (_req: Request, res: Response) => {
	try {
		const tree = await categoryService.getActiveCategoriesTree();
		res.json(tree);
	} catch (err: any) {
		res.status(500).json({ message: 'שגיאה בבניית עץ קטגוריות', error: err.message });
	}
};

// ============================================================================
// פונקציות לניהול תבנית מפרט טכני
// ============================================================================

/**
 * קבלת תבנית מפרט טכני עם ירושה מקטגוריות אב
 * GET /api/categories/:id/specification-template
 * 
 * מחזיר:
 * - fields: מערך שדות ממוזג (כולל ירושה)
 * - inheritanceChain: שרשרת הירושה עם מידע על כל קטגוריה
 */
export const getSpecificationTemplate = async (req: Request, res: Response) => {
	try {
		const result = await categoryService.getSpecificationTemplateWithInheritance(req.params.id);
		if (!result) {
			return res.status(404).json({ message: 'קטגוריה לא נמצאה' });
		}
		res.json(result);
	} catch (err: any) {
		res.status(500).json({ 
			message: 'שגיאה בקבלת תבנית מפרט טכני', 
			error: err.message 
		});
	}
};

/**
 * עדכון תבנית מפרט טכני לקטגוריה
 * PUT /api/categories/:id/specification-template
 * 
 * Body: { template: ISpecificationField[] }
 */
export const updateSpecificationTemplate = async (req: Request, res: Response) => {
	try {
		const { template } = req.body;
		
		if (!Array.isArray(template)) {
			return res.status(400).json({ 
				message: 'נדרש מערך של שדות תבנית' 
			});
		}
		
		const result = await categoryService.updateSpecificationTemplate(
			req.params.id, 
			template
		);
		
		if (!result) {
			return res.status(404).json({ message: 'קטגוריה לא נמצאה' });
		}
		
		res.json(result);
	} catch (err: any) {
		res.status(400).json({ 
			message: err.message || 'שגיאה בעדכון תבנית מפרט טכני'
		});
	}
};
