/**
 * 🔐 מערכת אימות מאפיינים דינמית (Dynamic Attribute Validation)
 * 
 * מטרה: בניית סכמות Joi בזמן ריצה על בסיס הגדרות FilterAttribute מה-DB
 * - מאפשר למנהלים להוסיף מאפיינים חדשים (material, fabric וכו') ללא שינוי קוד
 * - מבצע אימות קפדני של סוגי נתונים (טקסט/מספר/צבע)
 * - משתמש ב-Caching למניעת עומס על מסד הנתונים
 * - מונע שמירת שדות לא מוכרים (Security & Data Integrity)
 */

import Joi from 'joi';
import NodeCache from 'node-cache';
import FilterAttribute, { IFilterAttribute } from '../models/FilterAttribute';

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Cache ייעודי לסכמות Joi דינמיות
 * TTL: 600 שניות (10 דקות) - מאזן בין ביצועים לעדכניות
 * checkperiod: 120 שניות - בדיקת תפוגה כל דקתיים
 */
const schemaCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false, // אופטימיזציה - אין צורך ב-Deep Clone של אובייקטי Joi
});

// מפתח Cache אחיד
const SCHEMA_CACHE_KEY = 'dynamic-attributes-joi-schema';

// רשימת שדות אסורים (הגנה מפני Prototype Pollution)
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype', '$where'];

// ============================================================================
// Schema Builder Functions
// ============================================================================

/**
 * בונה Validator של Joi למאפיין בודד לפי הגדרתו ב-DB
 * @param attribute - מאפיין מתוך FilterAttribute
 * @returns Joi Schema מתאים לסוג המאפיין
 */
function buildAttributeValidator(attribute: IFilterAttribute): Joi.Schema {
  const { key, valueType, values, colorFamilies, isRequired } = attribute;

  // בדיקת אבטחה: חסימת שמות מפתח מסוכנים
  if (FORBIDDEN_KEYS.includes(key)) {
    console.error(`⚠️ Forbidden attribute key detected: ${key}`);
    throw new Error(`Attribute key "${key}" is not allowed for security reasons`);
  }

  let validator: Joi.Schema;

  switch (valueType) {
    case 'number':
      // מספר: אופציונלי או חובה לפי isRequired
      validator = Joi.number()
        .min(0)
        .messages({
          'number.base': `${attribute.name} חייב להיות מספר`,
          'number.min': `${attribute.name} לא יכול להיות שלילי`,
        });
      break;

    case 'text':
      // טקסט: תמיד מאפשר ערכים חופשיים (לא enum קשיח)
      // גם אם יש values מוגדרים, המערכת תומכת ב-custom values (secondaryVariantAttribute דינמי)
      validator = Joi.string()
        .min(1)
        .max(100)
        .trim()
        .messages({
          'string.base': `${attribute.name} חייב להיות טקסט`,
          'string.min': `${attribute.name} לא יכול להיות ריק`,
          'string.max': `${attribute.name} לא יכול להכיל יותר מ-100 תווים`,
        });
      break;

    case 'color':
      // צבע: אימות HEX או בדיקה מול colorFamilies
      if (colorFamilies && colorFamilies.length > 0) {
        // אם יש משפחות צבעים מוגדרות, נאסוף את כל ה-HEX codes
        const allHexCodes: string[] = [];
        colorFamilies.forEach((family) => {
          family.variants.forEach((variant) => {
            allHexCodes.push(variant.hex.toUpperCase());
          });
        });

        validator = Joi.string()
          .uppercase()
          .valid(...allHexCodes)
          .messages({
            'string.base': `${attribute.name} חייב להיות קוד צבע תקין`,
            'any.only': `${attribute.name} חייב להיות אחד מהצבעים המוגדרים`,
          });
      } else {
        // צבע כללי - HEX format
        validator = Joi.string()
          .pattern(/^#[0-9A-F]{6}$/i)
          .uppercase()
          .messages({
            'string.base': `${attribute.name} חייב להיות קוד צבע`,
            'string.pattern.base': `${attribute.name} חייב להיות בפורמט HEX (#RRGGBB)`,
          });
      }
      break;

    default:
      // ברירת מחדל: טקסט חופשי
      console.warn(`⚠️ Unknown valueType for attribute "${key}": ${valueType}. Defaulting to string.`);
      validator = Joi.string()
        .trim()
        .max(100)
        .messages({
          'string.base': `${attribute.name} חייב להיות טקסט`,
        });
  }

  // הפיכה לחובה או אופציונלי
  if (isRequired) {
    validator = validator.required().messages({
      'any.required': `${attribute.name} הוא שדה חובה`,
    });
  } else {
    validator = validator.optional().allow('', null);
  }

  return validator;
}

/**
 * בונה את מפת הסכמה המלאה של כל המאפיינים הדינמיים
 * @returns אובייקט Joi.object המכיל את כל הוולידטורים
 */
async function buildDynamicAttributesSchema(): Promise<Joi.ObjectSchema> {
  try {
    console.log('🔨 בונה סכמת אימות דינמית...');

    // שליפת כל המאפיינים מה-DB (lean = מחזיר Plain Objects לביצועים)
    const attributes = await FilterAttribute.find().lean<IFilterAttribute[]>();

    console.log(`📊 נמצאו ${attributes.length} מאפיינים דינמיים`);

    // 🆕 אם אין מאפיינים - מאפשר כל ערך (לתמיכה ב-secondaryVariantAttribute דינמי)
    if (attributes.length === 0) {
      console.log('⚠️ לא נמצאו מאפיינים דינמיים - מאפשר כל attributes');
      return Joi.object()
        .pattern(
          Joi.string(), // מפתח: כל מחרוזת
          Joi.alternatives().try(
            Joi.string().max(100).allow('', null),
            Joi.number()
          )
        )
        .unknown(true) // 🆕 מאפשר כל מפתח
        .optional();
    }

    // בניית מפה של Validators
    const schemaMap: { [key: string]: Joi.Schema } = {};

    attributes.forEach((attr) => {
      try {
        schemaMap[attr.key] = buildAttributeValidator(attr);
        console.log(`  ✓ ${attr.name} (${attr.key}): ${attr.valueType}`);
      } catch (error: any) {
        console.error(`  ✗ שגיאה בבניית validator עבור "${attr.key}":`, error.message);
        // ממשיכים למאפיין הבא - לא נכשל על מאפיין בודד
      }
    });

    // יצירת אובייקט Joi סופי
    // 🆕 unknown(true) = מאפשר גם מפתחות שלא הוגדרו (לתמיכה ב-secondaryVariantAttribute דינמי)
    const finalSchema = Joi.object(schemaMap)
      .unknown(true) // 🆕 שונה מ-false ל-true כדי לאפשר attributes דינמיים
      .optional() // attributes עצמו אופציונלי (SKU יכול להיות בלי attributes בכלל)
      .messages({
        'object.unknown': 'שדה "{#label}" אינו מוכר במערכת המאפיינים',
      });

    console.log('✅ סכמת אימות דינמית נבנתה בהצלחה');
    return finalSchema;
  } catch (error) {
    console.error('❌ שגיאה בבניית סכמת אימות דינמית:', error);
    throw new Error('Failed to build dynamic attributes schema');
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * מחזיר את סכמת ה-Joi הדינמית (מ-Cache אם קיים, אחרת בונה חדש)
 * @returns Joi Schema לאימות אובייקט attributes
 */
export async function getDynamicAttributesSchema(): Promise<Joi.ObjectSchema> {
  // בדיקת Cache
  const cachedSchema = schemaCache.get<Joi.ObjectSchema>(SCHEMA_CACHE_KEY);

  if (cachedSchema) {
    console.log('⚡ משתמש בסכמת אימות מ-Cache');
    return cachedSchema;
  }

  // אין ב-Cache - בונה חדש
  console.log('🔄 בונה סכמת אימות חדשה (Cache Miss)');
  const schema = await buildDynamicAttributesSchema();

  // שמירה ב-Cache
  schemaCache.set(SCHEMA_CACHE_KEY, schema);

  return schema;
}

/**
 * מנקה את ה-Cache של הסכמה הדינמית
 * יש לקרוא לפונקציה זו כל פעם שמתבצע שינוי ב-FilterAttribute
 * (create / update / delete)
 */
export function clearValidationCache(): void {
  const deleted = schemaCache.del(SCHEMA_CACHE_KEY);
  if (deleted > 0) {
    console.log('🗑️ Cache של סכמת אימות נוקה בהצלחה');
  } else {
    console.log('ℹ️ Cache כבר ריק (אין מה לנקות)');
  }
}

/**
 * מחזיר סטטיסטיקות על ה-Cache (לצורכי ניפוי באגים)
 */
export function getValidationCacheStats() {
  const stats = schemaCache.getStats();
  const hasSchema = schemaCache.has(SCHEMA_CACHE_KEY);

  return {
    hits: stats.hits,
    misses: stats.misses,
    keys: stats.keys,
    hasSchema,
    ttl: schemaCache.getTtl(SCHEMA_CACHE_KEY),
  };
}
