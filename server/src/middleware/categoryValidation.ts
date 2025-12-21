/**
 * 🛡️ Category Validation Middleware
 * 
 * מטרה: וולידציה של נתוני קטגוריות לפני שמירה ל-DB
 * - מונע נתונים לא תקינים
 * - מספק הודעות שגיאה ברורות בעברית
 * - תומך ביצירה, עריכה ומחיקה
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Category from '../models/Category';

// ============================================================================
// Schema ליצירת קטגוריה
// ============================================================================

const createCategorySchema = Joi.object({
	// שם הקטגוריה - חובה
	name: Joi.string()
		.trim()
		.min(2)
		.max(100)
		.required()
		.messages({
			'string.empty': 'שם הקטגוריה הוא שדה חובה',
			'string.min': 'שם הקטגוריה חייב להכיל לפחות 2 תווים',
			'string.max': 'שם הקטגוריה לא יכול להכיל יותר מ-100 תווים',
			'any.required': 'שם הקטגוריה הוא שדה חובה',
		}),

	// Slug - אופציונלי (אם לא סופק, ייווצר אוטומטית מהשם)
	slug: Joi.string()
		.trim()
		.lowercase()
		.pattern(/^[a-z0-9-]+$/)
		.min(2)
		.max(100)
		.optional()
		.messages({
			'string.pattern.base': 'Slug יכול להכיל רק אותיות קטנות באנגלית, מספרים ומקפים',
			'string.min': 'Slug חייב להכיל לפחות 2 תווים',
			'string.max': 'Slug לא יכול להכיל יותר מ-100 תווים',
		}),

	// קטגוריית אב - אופציונלי
	parentId: Joi.string()
		.allow(null, '')
		.custom((value, helpers) => {
			// אם ריק או null, להחזיר null
			if (!value || value === '') return null;
			
			// בדיקת תקינות ObjectId
			if (!mongoose.Types.ObjectId.isValid(value)) {
				return helpers.error('any.invalid');
			}
			return value;
		})
		.optional()
		.messages({
			'any.invalid': 'מזהה קטגוריית אב לא תקין',
		}),

	// תיאור - אופציונלי
	description: Joi.string()
		.trim()
		.max(500)
		.allow('')
		.optional()
		.messages({
			'string.max': 'תיאור הקטגוריה מוגבל ל-500 תווים',
		}),

	// האם פעיל - ברירת מחדל true
	isActive: Joi.boolean()
		.default(true)
		.messages({
			'boolean.base': 'isActive חייב להיות true או false',
		}),

	// סדר תצוגה - ברירת מחדל 0
	sortOrder: Joi.number()
		.integer()
		.min(0)
		.max(99999)
		.default(0)
		.messages({
			'number.base': 'סדר תצוגה חייב להיות מספר',
			'number.integer': 'סדר תצוגה חייב להיות מספר שלם',
			'number.min': 'סדר תצוגה לא יכול להיות שלילי',
			'number.max': 'סדר תצוגה לא יכול להיות גדול מ-99999',
		}),
});

// ============================================================================
// Schema לעדכון קטגוריה (כל השדות אופציונליים)
// ============================================================================

const updateCategorySchema = Joi.object({
	// שם הקטגוריה - אופציונלי בעדכון
	name: Joi.string()
		.trim()
		.min(2)
		.max(100)
		.optional()
		.messages({
			'string.min': 'שם הקטגוריה חייב להכיל לפחות 2 תווים',
			'string.max': 'שם הקטגוריה לא יכול להכיל יותר מ-100 תווים',
		}),

	// Slug - אופציונלי
	slug: Joi.string()
		.trim()
		.lowercase()
		.pattern(/^[a-z0-9-]+$/)
		.min(2)
		.max(100)
		.optional()
		.messages({
			'string.pattern.base': 'Slug יכול להכיל רק אותיות קטנות באנגלית, מספרים ומקפים',
			'string.min': 'Slug חייב להכיל לפחות 2 תווים',
			'string.max': 'Slug לא יכול להכיל יותר מ-100 תווים',
		}),

	// קטגוריית אב - אופציונלי
	parentId: Joi.string()
		.allow(null, '')
		.custom((value, helpers) => {
			if (!value || value === '') return null;
			if (!mongoose.Types.ObjectId.isValid(value)) {
				return helpers.error('any.invalid');
			}
			return value;
		})
		.optional()
		.messages({
			'any.invalid': 'מזהה קטגוריית אב לא תקין',
		}),

	// תיאור - אופציונלי
	description: Joi.string()
		.trim()
		.max(500)
		.allow('')
		.optional()
		.messages({
			'string.max': 'תיאור הקטגוריה מוגבל ל-500 תווים',
		}),

	// האם פעיל
	isActive: Joi.boolean()
		.optional()
		.messages({
			'boolean.base': 'isActive חייב להיות true או false',
		}),

	// סדר תצוגה
	sortOrder: Joi.number()
		.integer()
		.min(0)
		.max(99999)
		.optional()
		.messages({
			'number.base': 'סדר תצוגה חייב להיות מספר',
			'number.integer': 'סדר תצוגה חייב להיות מספר שלם',
			'number.min': 'סדר תצוגה לא יכול להיות שלילי',
			'number.max': 'סדר תצוגה לא יכול להיות גדול מ-99999',
		}),
});

// ============================================================================
// Schema למחיקה בטוחה
// ============================================================================

const safeDeleteCategorySchema = Joi.object({
	// האם למחוק גם תת-קטגוריות
	deleteSubcategories: Joi.boolean()
		.default(false)
		.messages({
			'boolean.base': 'deleteSubcategories חייב להיות true או false',
		}),

	// לאיזו קטגוריה להעביר מוצרים (null = להסיר קטגוריה מהמוצרים)
	reassignTo: Joi.string()
		.allow(null, '')
		.custom((value, helpers) => {
			if (!value || value === '') return null;
			if (!mongoose.Types.ObjectId.isValid(value)) {
				return helpers.error('any.invalid');
			}
			return value;
		})
		.optional()
		.messages({
			'any.invalid': 'מזהה קטגוריה להעברה לא תקין',
		}),
});

// ============================================================================
// Schema לשינוי סדר קטגוריות
// ============================================================================

const reorderCategoriesSchema = Joi.object({
	items: Joi.array()
		.items(
			Joi.object({
				id: Joi.string()
					.custom((value, helpers) => {
						if (!mongoose.Types.ObjectId.isValid(value)) {
							return helpers.error('any.invalid');
						}
						return value;
					})
					.required()
					.messages({
						'any.invalid': 'מזהה קטגוריה לא תקין',
						'any.required': 'מזהה קטגוריה הוא שדה חובה',
					}),
				sortOrder: Joi.number()
					.integer()
					.min(0)
					.required()
					.messages({
						'number.base': 'סדר תצוגה חייב להיות מספר',
						'number.integer': 'סדר תצוגה חייב להיות מספר שלם',
						'number.min': 'סדר תצוגה לא יכול להיות שלילי',
						'any.required': 'סדר תצוגה הוא שדה חובה',
					}),
			})
		)
		.min(1)
		.required()
		.messages({
			'array.min': 'יש לספק לפחות פריט אחד לשינוי סדר',
			'any.required': 'רשימת פריטים היא שדה חובה',
		}),
});

// ============================================================================
// Schema להעלאת תמונה
// ============================================================================

const uploadCategoryImageSchema = Joi.object({
	url: Joi.string()
		.uri()
		.required()
		.messages({
			'string.uri': 'כתובת URL לא תקינה',
			'any.required': 'כתובת URL היא שדה חובה',
		}),
	public_id: Joi.string()
		.required()
		.messages({
			'any.required': 'public_id הוא שדה חובה',
		}),
});

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * פונקציית עזר להחזרת שגיאות וולידציה
 */
function sendValidationError(res: Response, error: Joi.ValidationError) {
	const errors = error.details.map((detail) => ({
		field: detail.path.join('.'),
		message: detail.message,
	}));

	return res.status(400).json({
		success: false,
		message: 'שגיאת וולידציה',
		errors,
	});
}

/**
 * Middleware לוולידציה של יצירת קטגוריה
 */
export const validateCreateCategory = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { error, value } = createCategorySchema.validate(req.body, {
			abortEarly: false,
			stripUnknown: true,
		});

		if (error) {
			return sendValidationError(res, error);
		}

		// בדיקה אסינכרונית: האם parentId קיים (אם סופק)
		if (value.parentId) {
			const parentExists = await Category.exists({ _id: value.parentId });
			if (!parentExists) {
				return res.status(400).json({
					success: false,
					message: 'שגיאת וולידציה',
					errors: [{ field: 'parentId', message: 'קטגוריית אב לא נמצאה' }],
				});
			}

			// בדיקת עומק עץ (מקסימום 3 רמות: 0, 1, 2)
			const parent = await Category.findById(value.parentId).lean();
			if (parent && (parent.level ?? 0) >= 2) {
				return res.status(400).json({
					success: false,
					message: 'שגיאת וולידציה',
					errors: [{ field: 'parentId', message: 'לא ניתן ליצור יותר מ-3 רמות של קטגוריות' }],
				});
			}
		}

		req.body = value;
		next();
	} catch (err: any) {
		console.error('❌ שגיאה באימות יצירת קטגוריה:', err);
		return res.status(500).json({
			success: false,
			message: 'שגיאת שרת באימות נתונים',
			error: err.message,
		});
	}
};

/**
 * Middleware לוולידציה של עדכון קטגוריה
 */
export const validateUpdateCategory = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		// בדיקת תקינות ה-ID מה-URL
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({
				success: false,
				message: 'שגיאת וולידציה',
				errors: [{ field: 'id', message: 'מזהה קטגוריה לא תקין' }],
			});
		}

		const { error, value } = updateCategorySchema.validate(req.body, {
			abortEarly: false,
			stripUnknown: true,
		});

		if (error) {
			return sendValidationError(res, error);
		}

		// בדיקות אסינכרוניות
		if (value.parentId !== undefined) {
			// בדיקת מניעת מעגליות - קטגוריה לא יכולה להיות הורה של עצמה
			if (value.parentId === id) {
				return res.status(400).json({
					success: false,
					message: 'שגיאת וולידציה',
					errors: [{ field: 'parentId', message: 'קטגוריה לא יכולה להיות הורה של עצמה' }],
				});
			}

			// אם יש parentId חדש, לבדוק שהוא קיים
			if (value.parentId) {
				const parentExists = await Category.exists({ _id: value.parentId });
				if (!parentExists) {
					return res.status(400).json({
						success: false,
						message: 'שגיאת וולידציה',
						errors: [{ field: 'parentId', message: 'קטגוריית אב לא נמצאה' }],
					});
				}
			}
		}

		req.body = value;
		next();
	} catch (err: any) {
		console.error('❌ שגיאה באימות עדכון קטגוריה:', err);
		return res.status(500).json({
			success: false,
			message: 'שגיאת שרת באימות נתונים',
			error: err.message,
		});
	}
};

/**
 * Middleware לוולידציה של מחיקה בטוחה
 */
export const validateSafeDeleteCategory = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	// בדיקת תקינות ה-ID מה-URL
	const { id } = req.params;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({
			success: false,
			message: 'שגיאת וולידציה',
			errors: [{ field: 'id', message: 'מזהה קטגוריה לא תקין' }],
		});
	}

	const { error, value } = safeDeleteCategorySchema.validate(req.body, {
		abortEarly: false,
		stripUnknown: true,
	});

	if (error) {
		return sendValidationError(res, error);
	}

	req.body = value;
	next();
};

/**
 * Middleware לוולידציה של שינוי סדר קטגוריות
 */
export const validateReorderCategories = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { error, value } = reorderCategoriesSchema.validate(req.body, {
		abortEarly: false,
		stripUnknown: true,
	});

	if (error) {
		return sendValidationError(res, error);
	}

	req.body = value;
	next();
};

/**
 * Middleware לוולידציה של העלאת תמונה לקטגוריה
 */
export const validateUploadCategoryImage = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	// בדיקת תקינות ה-ID מה-URL
	const { id } = req.params;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({
			success: false,
			message: 'שגיאת וולידציה',
			errors: [{ field: 'id', message: 'מזהה קטגוריה לא תקין' }],
		});
	}

	const { error, value } = uploadCategoryImageSchema.validate(req.body, {
		abortEarly: false,
		stripUnknown: true,
	});

	if (error) {
		return sendValidationError(res, error);
	}

	req.body = value;
	next();
};

/**
 * Middleware לוולידציה של ID בפרמטרים
 */
export const validateCategoryId = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { id } = req.params;
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({
			success: false,
			message: 'שגיאת וולידציה',
			errors: [{ field: 'id', message: 'מזהה קטגוריה לא תקין' }],
		});
	}
	next();
};
