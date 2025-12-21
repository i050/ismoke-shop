/**
 * Validation Schemas לתשלומים והזמנות
 * =====================================
 * 
 * סכמות Joi לאימות קלט בכל הנוגע להזמנות ותשלומים.
 * משמש להגנה מפני קלט זדוני ולהבטחת תקינות הנתונים.
 * 
 * @module validators/orderValidators
 */

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// =============================================================================
// טיפוסים
// =============================================================================

/**
 * תוצאת validation
 */
interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  value?: any;
}

// =============================================================================
// סכמות בסיסיות
// =============================================================================

/**
 * סכמת MongoDB ObjectId
 */
const objectIdSchema = Joi.string()
  .pattern(/^[a-fA-F0-9]{24}$/)
  .messages({
    'string.pattern.base': 'מזהה לא תקין'
  });

/**
 * סכמת מספר טלפון ישראלי
 */
const israeliPhoneSchema = Joi.string()
  .pattern(/^(\+972|0)([23489]|5[0-9]|77)[0-9]{7}$/)
  .messages({
    'string.pattern.base': 'מספר טלפון לא תקין'
  });

/**
 * סכמת אימייל
 */
const emailSchema = Joi.string()
  .email()
  .max(254)
  .messages({
    'string.email': 'כתובת אימייל לא תקינה',
    'string.max': 'כתובת אימייל ארוכה מדי'
  });

/**
 * סכמת מחיר (סכום כספי)
 */
const priceSchema = Joi.number()
  .min(0)
  .max(1000000) // מקסימום מיליון ש"ח
  .precision(2)
  .messages({
    'number.min': 'סכום לא יכול להיות שלילי',
    'number.max': 'סכום גדול מדי'
  });

/**
 * סכמת כמות
 */
const quantitySchema = Joi.number()
  .integer()
  .min(1)
  .max(1000)
  .messages({
    'number.min': 'כמות חייבת להיות לפחות 1',
    'number.max': 'כמות גדולה מדי',
    'number.integer': 'כמות חייבת להיות מספר שלם'
  });

// =============================================================================
// סכמות כתובת
// =============================================================================

/**
 * סכמת כתובת משלוח
 */
export const shippingAddressSchema = Joi.object({
  fullName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'שם מלא חייב להכיל לפחות 2 תווים',
      'string.max': 'שם מלא ארוך מדי',
      'any.required': 'שם מלא הוא שדה חובה'
    }),
  
  phone: israeliPhoneSchema.required()
    .messages({
      'any.required': 'מספר טלפון הוא שדה חובה'
    }),
  
  email: emailSchema.optional(),
  
  street: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'כתובת רחוב חייבת להכיל לפחות 2 תווים',
      'any.required': 'כתובת רחוב היא שדה חובה'
    }),
  
  apartment: Joi.string()
    .max(20)
    .optional()
    .allow(''),
  
  city: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'any.required': 'עיר היא שדה חובה'
    }),
  
  postalCode: Joi.string()
    .pattern(/^[0-9]{5,7}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'מיקוד לא תקין'
    }),
  
  country: Joi.string()
    .default('ישראל')
    .max(50),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .allow('')
});

/**
 * סכמת כתובת חיוב
 */
export const billingAddressSchema = shippingAddressSchema.keys({
  companyName: Joi.string()
    .max(100)
    .optional()
    .allow(''),
  
  taxId: Joi.string()
    .pattern(/^[0-9]{9}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': 'מספר עוסק לא תקין (חייב להכיל 9 ספרות)'
    })
});

// =============================================================================
// סכמות פריטי הזמנה
// =============================================================================

/**
 * סכמת פריט בהזמנה
 * הערה: name, unitPrice וכו' לא נדרשים כי השרת שולף אותם מה-DB
 */
export const orderItemSchema = Joi.object({
  productId: objectIdSchema.required()
    .messages({
      'any.required': 'מזהה מוצר הוא שדה חובה'
    }),
  
  // skuId יכול להיות ObjectId או קוד SKU (מחרוזת)
  skuId: Joi.string()
    .max(50)
    .optional(),
  
  // תמיכה גם ב-skuCode
  skuCode: Joi.string()
    .max(50)
    .optional(),
  
  // שדות אופציונליים - השרת שולף אותם מה-DB אם לא מסופקים
  name: Joi.string()
    .min(1)
    .max(200)
    .optional(),
  
  sku: Joi.string()
    .max(50)
    .optional(),
  
  quantity: quantitySchema.required()
    .messages({
      'any.required': 'כמות היא שדה חובה'
    }),
  
  unitPrice: priceSchema.optional(),
  
  totalPrice: priceSchema.optional(),
  
  // מאפייני וריאנט (צבע, גודל וכו')
  attributes: Joi.object()
    .pattern(
      Joi.string(),
      Joi.alternatives().try(
        Joi.string().max(100),
        Joi.number()
      )
    )
    .optional(),
  
  imageUrl: Joi.string()
    .uri()
    .optional()
    .allow('')
});

// =============================================================================
// סכמות הזמנה
// =============================================================================

/**
 * סכמת יצירת הזמנה
 */
export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(orderItemSchema)
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'הזמנה חייבת להכיל לפחות פריט אחד',
      'array.max': 'הזמנה יכולה להכיל עד 50 פריטים',
      'any.required': 'פריטי הזמנה הם שדה חובה'
    }),
  
  shippingAddress: shippingAddressSchema.required()
    .messages({
      'any.required': 'כתובת משלוח היא שדה חובה'
    }),
  
  billingAddress: billingAddressSchema.optional(),
  
  // אם לא מסופק, יהיה זהה לכתובת משלוח
  useSameAddressForBilling: Joi.boolean().default(true),
  
  shippingMethod: Joi.string()
    .valid('standard', 'express', 'pickup', 'free')
    .default('standard'),
  
  shippingCost: priceSchema.default(0),
  
  couponCode: Joi.string()
    .max(50)
    .optional()
    .allow(''),
  
  notes: Joi.string()
    .max(1000)
    .optional()
    .allow(''),
  
  // מטא-דאטא לקוח (מזהה אם מחובר)
  customerId: objectIdSchema.optional(),
  
  // UTM וכו' ל-analytics
  source: Joi.object({
    utm_source: Joi.string().max(100).optional(),
    utm_medium: Joi.string().max(100).optional(),
    utm_campaign: Joi.string().max(100).optional(),
    referrer: Joi.string().max(500).optional()
  }).optional()
});

/**
 * סכמת עדכון סטטוס הזמנה
 */
export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'returned',
      'attention'
    )
    .required()
    .messages({
      'any.only': 'סטטוס לא תקין',
      'any.required': 'סטטוס הוא שדה חובה'
    }),
  
  // תמיכה גם ב-reason וגם ב-note (הקליינט שולח note)
  reason: Joi.string()
    .max(500)
    .optional(),
  
  note: Joi.string()
    .max(500)
    .optional(),
  
  // פרטי משלוח אופציונליים
  shippingCarrier: Joi.string()
    .max(100)
    .allow('')
    .optional(),
  
  trackingNumber: Joi.string()
    .max(100)
    .allow('')
    .optional(),
  
  courierPhone: Joi.string()
    .max(20)
    .allow('')
    .optional(),
  
  estimatedDeliveryDays: Joi.number()
    .integer()
    .min(1)
    .max(60)
    .allow(null)
    .optional(),
  
  shippingNotes: Joi.string()
    .max(500)
    .allow('')
    .optional(),
  
  trackingUrl: Joi.string()
    .uri()
    .optional()
});

// =============================================================================
// סכמות תשלום
// =============================================================================

/**
 * סכמת יצירת תשלום
 */
export const createPaymentSchema = Joi.object({
  orderId: objectIdSchema.required()
    .messages({
      'any.required': 'מזהה הזמנה הוא שדה חובה'
    }),
  
  amount: priceSchema
    .min(1) // מינימום 1 ש"ח
    .required()
    .messages({
      'number.min': 'סכום מינימלי לתשלום הוא 1 ש"ח',
      'any.required': 'סכום תשלום הוא שדה חובה'
    }),
  
  currency: Joi.string()
    .valid('ILS', 'USD', 'EUR')
    .default('ILS'),
  
  // פרטי כרטיס (לא נשמרים - רק לאימות מבנה)
  paymentMethod: Joi.string()
    .valid('credit_card', 'bit', 'paypal', 'bank_transfer', 'cash')
    .default('credit_card'),
  
  // עבור redirect-based payments
  successUrl: Joi.string()
    .uri()
    .optional(),
  
  cancelUrl: Joi.string()
    .uri()
    .optional(),
  
  metadata: Joi.object()
    .pattern(
      Joi.string().max(50),
      Joi.string().max(500)
    )
    .optional()
});

/**
 * סכמת אישור תשלום (מ-frontend אחרי שהלקוח שילם)
 */
export const confirmPaymentSchema = Joi.object({
  paymentId: Joi.string()
    .required()
    .messages({
      'any.required': 'מזהה תשלום הוא שדה חובה'
    }),
  
  // טוקן מספק התשלומים (אופציונלי - תלוי בספק)
  providerToken: Joi.string()
    .max(500)
    .optional()
});

/**
 * סכמת בקשת החזר
 */
export const refundSchema = Joi.object({
  paymentId: Joi.string()
    .required()
    .messages({
      'any.required': 'מזהה תשלום הוא שדה חובה'
    }),
  
  amount: priceSchema.optional(), // אם לא מסופק - החזר מלא
  
  reason: Joi.string()
    .valid('duplicate', 'fraudulent', 'requested_by_customer', 'other')
    .required()
    .messages({
      'any.required': 'סיבת החזר היא שדה חובה'
    }),
  
  notes: Joi.string()
    .max(500)
    .optional()
});

// =============================================================================
// סכמות Webhook
// =============================================================================

/**
 * סכמת Webhook מספק תשלומים (גנרית)
 */
export const paymentWebhookSchema = Joi.object({
  type: Joi.string()
    .required(),
  
  paymentId: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.number()
    )
    .required(),
  
  orderId: Joi.string()
    .optional(),
  
  status: Joi.string()
    .optional(),
  
  amount: Joi.number()
    .optional(),
  
  currency: Joi.string()
    .optional(),
  
  timestamp: Joi.alternatives()
    .try(
      Joi.date(),
      Joi.string(),
      Joi.number()
    )
    .optional(),
  
  // מאפשר שדות נוספים מהספק
  metadata: Joi.object()
    .unknown(true)
    .optional()
}).unknown(true); // מאפשר שדות נוספים שלא הגדרנו

// =============================================================================
// סכמות שאילתות
// =============================================================================

/**
 * סכמת שאילתת הזמנות
 */
export const orderQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  
  status: Joi.string()
    .valid(
      'pending', 'confirmed', 'processing', 
      'shipped', 'delivered', 'cancelled', 'refunded'
    )
    .optional(),
  
  customerId: objectIdSchema.optional(),
  
  fromDate: Joi.date()
    .optional(),
  
  toDate: Joi.date()
    .optional(),
  
  minTotal: priceSchema.optional(),
  
  maxTotal: priceSchema.optional(),
  
  search: Joi.string()
    .max(100)
    .optional(),
  
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'total', 'status')
    .default('createdAt'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});

// =============================================================================
// Middleware לאימות
// =============================================================================

/**
 * יוצר middleware לאימות לפי סכמה
 * 
 * @param schema - סכמת Joi
 * @param source - מקור הנתונים (body, query, params)
 */
export function validate(
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // החזר את כל השגיאות, לא רק הראשונה
      stripUnknown: true, // הסר שדות לא מוכרים
      convert: true // המר טיפוסים אוטומטית
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'שגיאת אימות נתונים',
        errors
      });
    }
    
    // החלף את הנתונים בנתונים המאומתים והמנוקים
    // שימוש ב-Object.assign כי req.query הוא getter בגרסאות חדשות של Express
    if (source === 'query') {
      // עבור query - נקה ועדכן את האובייקט הקיים
      Object.keys(req.query).forEach(key => delete (req.query as any)[key]);
      Object.assign(req.query, value);
    } else if (source === 'body') {
      req.body = value;
    } else if (source === 'params') {
      Object.assign(req.params, value);
    }
    next();
  };
}

/**
 * אימות ידני של נתונים (לשימוש בתוך services)
 * 
 * @param schema - סכמת Joi
 * @param data - נתונים לאימות
 */
export function validateData<T>(
  schema: Joi.ObjectSchema,
  data: unknown
): ValidationResult & { value?: T } {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(d => d.message)
    };
  }
  
  return {
    isValid: true,
    value: value as T
  };
}

// =============================================================================
// ייצוא נוחות - Middleware מוכנים
// =============================================================================

export const validateCreateOrder = validate(createOrderSchema, 'body');
export const validateUpdateOrderStatus = validate(updateOrderStatusSchema, 'body');
export const validateCreatePayment = validate(createPaymentSchema, 'body');
export const validateConfirmPayment = validate(confirmPaymentSchema, 'body');
export const validateRefund = validate(refundSchema, 'body');
export const validateOrderQuery = validate(orderQuerySchema, 'query');
