/**
 * 🛡️ Phase 1.3: Product & SKU Validation Middleware
 * 
 * מטרה: וולידציה של נתוני מוצרים ו-SKUs לפני שמירה ל-DB
 * - מונע נתונים לא תקינים
 * - מספק הודעות שגיאה ברורות
 * - תומך ביצירה ועריכה
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { getDynamicAttributesSchema } from './dynamicValidation';

// ============================================================================
// Schema למוצר (Product)
// ============================================================================

const productSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'שם המוצר הוא שדה חובה',
      'string.min': 'שם המוצר חייב להכיל לפחות 3 תווים',
      'string.max': 'שם המוצר לא יכול להכיל יותר מ-200 תווים',
      'any.required': 'שם המוצר הוא שדה חובה',
    }),

  // תיאור המוצר - אופציונלי
  // אם המשתמש מחליט למלא, חייב להכיל עד 2000 תווים (כל אורך מותר)
  // ⚠️ NO TRIM: משמר newlines (\n) במדויק כמו שהם - יש הערה בתצוגה (ProductTabs)
  description: Joi.string()
    .max(2000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'תיאור המוצר לא יכול להכיל יותר מ-2000 תווים',
    }),

  basePrice: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'מחיר בסיס חייב להיות מספר',
      'number.min': 'מחיר בסיס לא יכול להיות שלילי',
      'any.required': 'מחיר בסיס הוא שדה חובה',
    }),

  categoryId: Joi.string()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .required()
    .messages({
      'string.empty': 'קטגוריה היא שדה חובה',
      'any.invalid': 'מזהה קטגוריה לא תקין',
      'any.required': 'קטגוריה היא שדה חובה',
    }),

  images: Joi.array()
    .items(
      Joi.alternatives().try(
        // מבנה חדש - DigitalOcean Spaces
        Joi.object({
          thumbnail: Joi.string().uri().required(),
          medium: Joi.string().uri().required(),
          large: Joi.string().uri().required(),
          key: Joi.string().required(),
          format: Joi.string().optional().default('webp'),
          uploadedAt: Joi.date().optional(),
        }),
        // מבנה ישן - Cloudinary (תאימות לאחור)
        Joi.object({
          url: Joi.string().uri().required(),
          public_id: Joi.string().allow('').default(''),
          width: Joi.number().min(0).optional(),
          height: Joi.number().min(0).optional(),
          format: Joi.string().optional(),
        })
      )
    )
    .max(10)
    .default([])
    .messages({
      'array.max': 'ניתן להעלות עד 10 תמונות למוצר',
      'string.uri': 'כתובת תמונה לא תקינה',
    }),

  brand: Joi.string()
    .min(2)
    .max(100)
    .allow('')
    .trim()
    .messages({
      'string.min': 'שם המותג חייב להכיל לפחות 2 תווים',
      'string.max': 'שם המותג לא יכול להכיל יותר מ-100 תווים',
    }),

  tags: Joi.array()
    .items(Joi.string().min(2).max(50))
    .max(20)
    .default([])
    .messages({
      'array.max': 'ניתן להוסיף עד 20 תגיות',
      'string.min': 'תגית חייבת להכיל לפחות 2 תווים',
      'string.max': 'תגית לא יכולה להכיל יותר מ-50 תווים',
    }),

  isActive: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'isActive חייב להיות true או false',
    }),

  isFeatured: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'isFeatured חייב להיות true או false',
    }),

  metadata: Joi.object()
    .pattern(Joi.string(), Joi.any())
    .default({})
    .messages({
      'object.base': 'metadata חייב להיות אובייקט',
    }),

  // רף התראה למלאי נמוך כפי שהמנהל מגדיר למוצר
  lowStockThreshold: Joi.number()
    .integer()
    .min(0)
    .max(100000)
    .optional()
    .messages({
      'number.base': 'lowStockThreshold חייב להיות מספר',
      'number.integer': 'lowStockThreshold חייב להיות מספר שלם',
      'number.min': 'lowStockThreshold לא יכול להיות שלילי',
      'number.max': 'lowStockThreshold לא יכול להיות גדול מידי',
    }),

  // מפרט טכני - מערך של key-value pairs
  specifications: Joi.array()
    .items(
      Joi.object({
        key: Joi.string()
          .min(1)
          .max(100)
          .required()
          .trim()
          .messages({
            'string.empty': 'שם המאפיין הוא שדה חובה',
            'string.min': 'שם המאפיין לא יכול להיות ריק',
            'string.max': 'שם המאפיין לא יכול להכיל יותר מ-100 תווים',
          }),
        value: Joi.string()
          .min(1)
          .max(500)
          .required()
          .trim()
          .messages({
            'string.empty': 'ערך המאפיין הוא שדה חובה',
            'string.min': 'ערך המאפיין לא יכול להיות ריק',
            'string.max': 'ערך המאפיין לא יכול להכיל יותר מ-500 תווים',
          }),
      })
    )
    .max(50)
    .default([])
    .messages({
      'array.max': 'ניתן להוסיף עד 50 מאפייני מפרט טכני',
    }),
});

// ============================================================================
// Schema ל-SKU
// ============================================================================

const skuSchema = Joi.object({
  sku: Joi.string()
    .pattern(/^[A-Z0-9-]+$/)
    .min(3)
    .max(50)
    .required()
    .uppercase()
    .trim()
    .messages({
      'string.empty': 'קוד SKU הוא שדה חובה',
      'string.pattern.base': 'קוד SKU יכול להכיל רק אותיות אנגליות גדולות, מספרים ומקף',
      'string.min': 'קוד SKU חייב להכיל לפחות 3 תווים',
      'string.max': 'קוד SKU לא יכול להכיל יותר מ-50 תווים',
      'any.required': 'קוד SKU הוא שדה חובה',
    }),

  name: Joi.string()
    .min(3)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'שם SKU הוא שדה חובה',
      'string.min': 'שם SKU חייב להכיל לפחות 3 תווים',
      'string.max': 'שם SKU לא יכול להכיל יותר מ-200 תווים',
      'any.required': 'שם SKU הוא שדה חובה',
    }),

  // Base Price Override Pattern: מחיר SKU אופציונלי
  // אם null/undefined - ישתמש ב-Product.basePrice
  // אם מוגדר - דורס את המחיר הבסיס
  price: Joi.number()
    .min(0)
    .allow(null)
    .optional()
    .messages({
      'number.base': 'מחיר SKU חייב להיות מספר',
      'number.min': 'מחיר SKU לא יכול להיות שלילי',
    }),

  stockQuantity: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'כמות במלאי חייבת להיות מספר',
      'number.integer': 'כמות במלאי חייבת להיות מספר שלם',
      'number.min': 'כמות במלאי לא יכולה להיות שלילית',
      'any.required': 'כמות במלאי היא שדה חובה',
    }),

  // שדות אופציונליים (attributes)
  color: Joi.string()
    .min(2)
    .max(50)
    .allow('')
    .trim()
    .messages({
      'string.min': 'צבע חייב להכיל לפחות 2 תווים',
      'string.max': 'צבע לא יכול להכיל יותר מ-50 תווים',
    }),

  // 🆕 משפחת צבע - מאפשר אחסון וסינון לפי שם משפחה
  colorFamily: Joi.string()
    .max(30)
    .optional()
    .allow('', null)
    .trim()
    .lowercase()
    .messages({
      'string.max': 'משפחת צבע לא יכולה להכיל יותר מ-30 תווים',
    }),

  // מקור משפחת הצבע - auto/manual/import
  colorFamilySource: Joi.string()
    .valid('auto', 'manual', 'import')
    .optional()
    .messages({
      'any.only': 'מקור משפחת צבע חייב להיות auto, manual או import',
    }),

  // size הוסר - עבר להיות מאפיין דינמי ב-attributes
  // ולידציה תתבצע דרך מערכת FilterAttributes

  weight: Joi.number()
    .min(0)
    .allow(null)
    .messages({
      'number.base': 'משקל חייב להיות מספר',
      'number.min': 'משקל לא יכול להיות שלילי',
    }),

  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    height: Joi.number().min(0),
  })
    .allow(null)
    .messages({
      'object.base': 'מידות חייבות להיות אובייקט',
      'number.min': 'מידה לא יכולה להיות שלילית',
    }),

  images: Joi.array()
    .items(
      Joi.alternatives().try(
        // מבנה חדש - DigitalOcean Spaces
        Joi.object({
          thumbnail: Joi.string().uri().required(),
          medium: Joi.string().uri().required(),
          large: Joi.string().uri().required(),
          key: Joi.string().required(),
          format: Joi.string().optional().default('webp'),
          uploadedAt: Joi.date().optional(),
        }),
        // מבנה ישן - Cloudinary (תאימות לאחור)
        Joi.object({
          url: Joi.string().uri().required(),
          public_id: Joi.string().allow('').default(''),
          width: Joi.number().min(0).optional(),
          height: Joi.number().min(0).optional(),
          format: Joi.string().optional(),
        })
      )
    )
    .max(5)
    .default([])
    .messages({
      'array.max': 'ניתן להעלות עד 5 תמונות ל-SKU',
      'string.uri': 'כתובת תמונה לא תקינה',
    }),

  barcode: Joi.string()
    .pattern(/^[0-9]+$/)
    .min(8)
    .max(13)
    .allow('')
    .messages({
      'string.pattern.base': 'ברקוד יכול להכיל רק מספרים',
      'string.min': 'ברקוד חייב להכיל לפחות 8 ספרות',
      'string.max': 'ברקוד לא יכול להכיל יותר מ-13 ספרות',
    }),

  isActive: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'isActive חייב להיות true או false',
    }),

  // ⚠️ attributes יוזרק דינמית ב-runtime (לא מוגדר כאן)
  // הסכמה תיבנה בזמן אמת מתוך FilterAttribute
});

// ============================================================================
// Schema ליצירת מוצר עם SKUs (Combined)
// ============================================================================

const createProductWithSkusSchema = Joi.object({
  product: productSchema.required().messages({
    'any.required': 'נתוני מוצר חסרים',
  }),

  // שינוי: מאפשרים skus להיות ריקים (מערך ברירת מחדל [])
  // השירות ב-server ידאג ליצור SKU בסיס אם יש צורך (hasVariants=false)
  skus: Joi.array()
    .items(skuSchema)
    .default([])
    .messages({
      'array.base': 'שדה SKUs חייב להיות מערך',
    }),
});

// ============================================================================
// Schema לעדכון מוצר עם SKUs
// ============================================================================

const updateProductWithSkusSchema = Joi.object({
  product: productSchema
    .fork(
      ['name', 'basePrice', 'categoryId'], // שדות שהופכים לאופציונליים בעדכון
      (schema) => schema.optional()
    )
    .messages({
      'object.base': 'נתוני מוצר לא תקינים',
    }),

  skus: Joi.array()
    .items(skuSchema)
    .min(1)
    .messages({
      'array.min': 'חובה לספק לפחות SKU אחד למוצר',
    }),
});

// ============================================================================
// Schema לבדיקת SKU availability
// ============================================================================

const checkSkuSchema = Joi.object({
  sku: Joi.string()
    .pattern(/^[A-Z0-9-]+$/)
    .min(3)
    .max(50)
    .required()
    .uppercase()
    .trim()
    .messages({
      'string.empty': 'קוד SKU הוא שדה חובה',
      'string.pattern.base': 'קוד SKU יכול להכיל רק אותיות אנגליות גדולות, מספרים ומקף',
      'any.required': 'קוד SKU הוא שדה חובה',
    }),

  productId: Joi.string()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .allow('')
    .messages({
      'any.invalid': 'מזהה מוצר לא תקין',
    }),
});

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Middleware לוולידציה של יצירת מוצר עם SKUs
 * 🔄 אסינכרוני - בונה סכמה דינמית בזמן ריצה
 */
export const validateCreateProductWithSkus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. קבלת הסכמה הדינמית עבור attributes
    const dynamicAttributesSchema = await getDynamicAttributesSchema();

    // 2. בניית הסכמה המורחבת עם attributes דינמי
    const skuSchemaWithAttributes = skuSchema.keys({
      attributes: dynamicAttributesSchema,
    });

    const fullSchema = createProductWithSkusSchema.keys({
      skus: Joi.array().items(skuSchemaWithAttributes).default([]),
    });

    // 3. ביצוע הוולידציה
    const { error, value } = fullSchema.validate(req.body, {
      abortEarly: false, // החזרת כל השגיאות ולא רק הראשונה
      stripUnknown: true, // הסרת שדות לא מוכרים ברמה העליונה
    });

    if (error) {
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

    // החלפת req.body בערכים המנוקים והמאומתים
    req.body = value;
    next();
  } catch (err: any) {
    console.error('❌ שגיאה באימות מוצר:', err);
    return res.status(500).json({
      success: false,
      message: 'שגיאת שרת באימות נתונים',
      error: err.message,
    });
  }
};

/**
 * Middleware לוולידציה של עדכון מוצר עם SKUs
 * 🔄 אסינכרוני - בונה סכמה דינמית בזמן ריצה
 */
export const validateUpdateProductWithSkus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. קבלת הסכמה הדינמית עבור attributes
    const dynamicAttributesSchema = await getDynamicAttributesSchema();

    // 2. בניית הסכמה המורחבת עם attributes דינמי
    const skuSchemaWithAttributes = skuSchema.keys({
      attributes: dynamicAttributesSchema,
    });

    const fullSchema = updateProductWithSkusSchema.keys({
      skus: Joi.array().items(skuSchemaWithAttributes).min(1),
    });

    // 3. ביצוע הוולידציה
    const { error, value } = fullSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
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

    req.body = value;
    next();
  } catch (err: any) {
    console.error('❌ שגיאה באימות עדכון מוצר:', err);
    return res.status(500).json({
      success: false,
      message: 'שגיאת שרת באימות נתונים',
      error: err.message,
    });
  }
};

/**
 * Middleware לוולידציה של בדיקת SKU
 */
export const validateCheckSku = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = checkSkuSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
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

  req.body = value;
  next();
};

/**
 * Middleware לוולידציה של מוצר בודד (ללא SKUs)
 */
export const validateProduct = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error, value } = productSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
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

  req.body = value;
  next();
};

/**
 * Middleware לוולידציה של SKU בודד
 * 🔄 אסינכרוני - בונה סכמה דינמית בזמן ריצה
 */
export const validateSku = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. קבלת הסכמה הדינמית עבור attributes
    const dynamicAttributesSchema = await getDynamicAttributesSchema();

    // 2. בניית הסכמה המורחבת עם attributes דינמי
    const skuSchemaWithAttributes = skuSchema.keys({
      attributes: dynamicAttributesSchema,
    });

    // 3. ביצוע הוולידציה
    const { error, value } = skuSchemaWithAttributes.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
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

    req.body = value;
    next();
  } catch (err: any) {
    console.error('❌ שגיאה באימות SKU:', err);
    return res.status(500).json({
      success: false,
      message: 'שגיאת שרת באימות נתונים',
      error: err.message,
    });
  }
};
