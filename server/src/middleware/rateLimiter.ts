import rateLimit from 'express-rate-limit';

/**
 * 🛡️ Phase 0.5.3: Rate Limiting
 * 
 * Rate Limiters למניעת spam ו-brute force attacks.
 * כל limiter מותאם לסוג הפעולה הספציפי.
 * 
 * הערה חשובה: לא משתמשים ב-keyGenerator מותאם אישית כדי להימנע מבעיות IPv6.
 * express-rate-limit מטפל אוטומטית ב-IPv4 ו-IPv6 בצורה נכונה.
 */

/**
 * Rate Limiter כללי לכל ה-API
 * מגביל ל-100 בקשות לדקה למניעת spam
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // חלון זמן של דקה אחת
  max: 100, // מקסימום 100 בקשות בחלון
  message: {
    success: false,
    message: 'יותר מדי בקשות מכתובת זו, נסה שוב מאוחר יותר'
  },
  standardHeaders: true, // החזרת מידע על rate limit ב-headers
  legacyHeaders: false, // השבתת X-RateLimit-* headers ישנים
  // לא צריך keyGenerator - express-rate-limit משתמש ב-req.ip אוטומטית
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'יותר מדי בקשות. אנא המתן לפני שתנסה שוב.',
      retryAfter: Math.ceil(60 / 100) // זמן המתנה משוער בשניות
    });
  }
});

/**
 * Rate Limiter ייעודי לנתיב הציבורי של מאפייני הסינון
 * מונע הצפה של קריאות getAttributesForFilter מהחזית
 */
export const filterAttributesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'יותר מדי בקשות לפילטרים. נסה שוב בעוד מספר שניות.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiter למסלולי Tracking של באנרים
 * מגביל ל-10 בקשות לדקה למניעת זיוף analytics
 */
export const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // חלון זמן של דקה אחת
  max: 10, // מקסימום 10 בקשות tracking בדקה
  message: {
    success: false,
    message: 'יותר מדי בקשות tracking, נסה שוב מאוחר יותר'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'יותר מדי בקשות tracking. אנא המתן.',
      retryAfter: 60
    });
  }
});

/**
 * Rate Limiter ליצירת מוצרים
 * מגביל ל-20 יצירות מוצרים לדקה
 */
export const createProductLimiter = rateLimit({
  windowMs: 60 * 1000, // דקה
  max: 20, // מקסימום 20 יצירות לדקה
  message: {
    success: false,
    message: 'יותר מדי ניסיונות ליצירת מוצרים, נסה שוב מאוחר יותר'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // ספור גם בקשות מוצלחות
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'יצרת יותר מדי מוצרים בזמן קצר. אנא המתן מספר שניות.',
      retryAfter: 60
    });
  }
});

/**
 * Rate Limiter להעלאת תמונות
 * מגביל ל-10 העלאות לדקה (כל העלאה יכולה להכיל עד 5 תמונות)
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // דקה
  max: 10, // מקסימום 10 העלאות לדקה
  message: {
    success: false,
    message: 'יותר מדי העלאות תמונות, נסה שוב מאוחר יותר'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'העלית יותר מדי תמונות בזמן קצר. אנא המתן לפני שתנסה שוב.',
      retryAfter: 60
    });
  }
});

/**
 * Rate Limiter לעדכון מוצרים
 * מגביל ל-30 עדכונים לדקה
 */
export const updateProductLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'יותר מדי ניסיונות עדכון, נסה שוב מאוחר יותר'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate Limiter למחיקת מוצרים
 * מגביל ל-10 מחיקות לדקה (פעולה רגישה)
 */
export const deleteProductLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'יותר מדי ניסיונות מחיקה, נסה שוב מאוחר יותר'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'ניסית למחוק יותר מדי פריטים בזמן קצר.',
      retryAfter: 60
    });
  }
});

/**
 * Rate Limiter קפדני ל-Authentication endpoints
 * מגביל ל-5 ניסיונות התחברות ל-15 דקות למניעת brute force
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 5, // מקסימום 5 ניסיונות
  message: {
    success: false,
    message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // אל תספור בקשות מוצלחות
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'יותר מדי ניסיונות התחברות כושלים. החשבון נעול זמנית למשך 15 דקות.',
      retryAfter: 15 * 60
    });
  }
});

/**
 * Rate Limiter לשאילתות חיפוש
 * מגביל ל-60 חיפושים לדקה
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'יותר מדי שאילתות חיפוש, נסה שוב בעוד מספר שניות'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate Limiter לפעולות CRUD של אדמין (מאפייני סינון וכו')
 * מאפשר יותר גמישות אך עדיין מגן מפני הצפות מקריות
 */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'יותר מדי פעולות ניהול בזמן קצר. המתן מעט ונסה שוב.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// =============================================================================
// Rate Limiters לתשלומים והזמנות
// =============================================================================

/**
 * Rate Limiter ליצירת תשלום
 * מגביל ל-5 ניסיונות תשלום לדקה - מונע ניסיונות חוזרים מהירים
 */
export const createPaymentLimiter = rateLimit({
  windowMs: 60 * 1000, // דקה
  max: 5, // מקסימום 5 ניסיונות תשלום
  message: {
    success: false,
    message: 'יותר מדי ניסיונות תשלום. אנא המתן דקה ונסה שוב.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // ספור גם בקשות מוצלחות
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'יותר מדי ניסיונות תשלום בזמן קצר. אנא המתן דקה לפני שתנסה שוב.',
      retryAfter: 60
    });
  }
});

/**
 * Rate Limiter ליצירת הזמנה
 * מגביל ל-10 הזמנות לדקה - מאפשר checkout רגיל אך מונע abuse
 */
export const createOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'יותר מדי הזמנות בזמן קצר. אנא המתן.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'יצרת יותר מדי הזמנות בזמן קצר. אנא המתן לפני שתנסה שוב.',
      retryAfter: 60
    });
  }
});

/**
 * Rate Limiter לבקשות החזר (Refund)
 * מגביל ל-3 בקשות החזר לדקה - פעולה רגישה
 */
export const refundLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'יותר מדי בקשות החזר. אנא המתן.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'ביצעת יותר מדי בקשות החזר בזמן קצר.',
      retryAfter: 60
    });
  }
});

/**
 * Rate Limiter ל-Webhooks
 * מגביל ל-100 webhooks לדקה מאותו IP - מונע הצפה
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many webhook requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Webhooks לא מחזירים HTML
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Rate limit exceeded for webhooks',
      retryAfter: 60
    });
  }
});

/**
 * Rate Limiter לשאילתות הזמנות
 * מגביל ל-30 שאילתות לדקה
 */
export const orderQueryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'יותר מדי שאילתות הזמנות. אנא המתן.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
