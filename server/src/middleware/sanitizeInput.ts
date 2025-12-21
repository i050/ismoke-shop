import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware לניקוי וולידציה של נתוני מוצר
 * מונע XSS attacks על ידי escape של תווים מסוכנים
 */
export const sanitizeProduct = [
  // ניקוי שם המוצר
  body('name')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('שם המוצר הוא שדה חובה')
    .isLength({ min: 3, max: 200 })
    .withMessage('שם המוצר חייב להיות בין 3 ל-200 תווים'),

  // ניקוי תיאור
  body('description')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('תיאור המוצר הוא שדה חובה')
    .isLength({ min: 10 })
    .withMessage('תיאור המוצר חייב להכיל לפחות 10 תווים'),

  // ניקוי מותג (אופציונלי)
  body('brand')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage('שם המותג לא יכול לעבור 100 תווים'),

  // ניקוי SKU - רק אותיות גדולות, מספרים ומקף
  body('sku')
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('SKU יכול להכיל רק אותיות גדולות, מספרים ומקף'),

  // ולידציה של מחיר
  body('basePrice')
    .isFloat({ min: 0 })
    .withMessage('מחיר בסיס חייב להיות מספר חיובי'),

  // ולידציה של מחיר להשוואה (אופציונלי)
  body('compareAtPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('מחיר להשוואה חייב להיות מספר חיובי'),

  // ולידציה של מלאי
  body('quantityInStock')
    .isInt({ min: 0 })
    .withMessage('כמות במלאי חייבת להיות מספר שלם חיובי'),

  // ניקוי תגיות (array)
  body('tags.*')
    .optional()
    .trim()
    .escape(),

  // Middleware לבדיקת תוצאות הולידציה
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות ולידציה',
        errors: errors.array().map(error => ({
          field: error.type === 'field' ? (error as any).path : 'unknown',
          message: error.msg
        }))
      });
    }
    
    next();
  }
];

/**
 * Middleware לניקוי וולידציה של נתוני SKU
 */
export const sanitizeSku = [
  // ניקוי SKU code
  body('*.sku')
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('SKU יכול להכיל רק אותיות גדולות, מספרים ומקף'),

  // ניקוי שם SKU
  body('*.name')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('שם ה-SKU הוא שדה חובה'),

  // ולידציה של מחיר (אופציונלי)
  body('*.price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('מחיר חייב להיות מספר חיובי'),

  // ולידציה של מלאי
  body('*.stockQuantity')
    .isInt({ min: 0 })
    .withMessage('כמות במלאי חייבת להיות מספר שלם חיובי'),

  // Middleware לבדיקת תוצאות
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות ולידציה ב-SKUs',
        errors: errors.array().map(error => ({
          field: error.type === 'field' ? (error as any).path : 'unknown',
          message: error.msg
        }))
      });
    }
    
    next();
  }
];

/**
 * Middleware כללי לניקוי text inputs
 * שימושי לשדות כמו שם, תיאור, וכו'
 */
export const sanitizeText = (field: string, required: boolean = false) => {
  const chain = body(field).trim().escape();
  
  if (required) {
    chain.notEmpty().withMessage(`${field} הוא שדה חובה`);
  } else {
    chain.optional();
  }
  
  return chain;
};

/**
 * Middleware לניקוי email
 */
export const sanitizeEmail = () => {
  return body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('כתובת אימייל לא תקינה')
    .normalizeEmail();
};

/**
 * Middleware לניקוי URL
 */
export const sanitizeUrl = (field: string) => {
  return body(field)
    .optional()
    .trim()
    .isURL()
    .withMessage(`${field} חייב להיות URL תקין`);
};
