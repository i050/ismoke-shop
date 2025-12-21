/**
 * ניתובי הזמנות - Order Routes
 * 
 * מגדיר את כל נקודות הקצה של ה-API להזמנות
 * כולל הרשאות, rate limiting ו-validation מתאימים
 * 
 * @module routes/orderRoutes
 */

import express from 'express';
import * as orderController from '../controllers/orderController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/roleMiddleware';
import { 
  createOrderLimiter, 
  orderQueryLimiter,
  refundLimiter 
} from '../middleware/rateLimiter';
import {
  validateCreateOrder,
  validateUpdateOrderStatus,
  validateOrderQuery
} from '../validators/orderValidators';

const router = express.Router();

// ============================================================================
// Middleware - כל הניתובים דורשים אימות
// ============================================================================

router.use(authMiddleware);

// ============================================================================
// User Endpoints - נקודות קצה למשתמשים רגילים
// ============================================================================

/**
 * יצירת הזמנה חדשה
 * POST /api/orders
 * 
 * Rate limiting: 10 הזמנות לדקה
 * Validation: כתובת, פריטים, סכומים
 */
router.post(
  '/',
  createOrderLimiter,
  validateCreateOrder,
  orderController.createOrder
);

/**
 * שליפת הזמנות של המשתמש המחובר
 * GET /api/orders
 * 
 * Query params:
 * - page: מספר עמוד (ברירת מחדל: 1)
 * - limit: כמות תוצאות לעמוד (ברירת מחדל: 10)
 * - status: סינון לפי סטטוס
 */
router.get(
  '/',
  orderQueryLimiter,
  validateOrderQuery,
  orderController.getUserOrders
);

/**
 * שליפת הזמנה לפי מספר הזמנה
 * GET /api/orders/number/:orderNumber
 * 
 * דוגמה: GET /api/orders/number/ORD-20251125-0001
 */
router.get('/number/:orderNumber', orderController.getOrderByNumber);

/**
 * שליפת הזמנה ספציפית לפי ID
 * GET /api/orders/:id
 */
router.get('/:id', orderController.getOrderById);

/**
 * ביטול הזמנה
 * POST /api/orders/:id/cancel
 * 
 * Body:
 * - reason: סיבת הביטול (אופציונלי)
 * 
 * ניתן לבטל רק הזמנות בסטטוס pending או confirmed
 */
router.post('/:id/cancel', orderController.cancelOrder);

// ============================================================================
// Admin Endpoints - נקודות קצה למנהלים
// ============================================================================

/**
 * שליפת סטטיסטיקות הזמנות (Admin)
 * GET /api/orders/admin/stats
 * 
 * מחזיר:
 * - totalOrders: סך כל ההזמנות
 * - pendingOrders: הזמנות ממתינות
 * - completedOrders: הזמנות שהושלמו
 * - cancelledOrders: הזמנות שבוטלו
 * - totalRevenue: סך הכנסות
 * - averageOrderValue: ערך הזמנה ממוצע
 */
router.get(
  '/admin/stats',
  requireAdmin,
  orderController.getOrderStats
);

/**
 * שליפת המוצרים הנמכרים ביותר (Admin Dashboard)
 * GET /api/orders/admin/top-selling-products
 * 
 * Query params:
 * - limit: כמות מוצרים להחזיר (ברירת מחדל: 10)
 * 
 * מחזיר:
 * - productId: מזהה המוצר
 * - productName: שם המוצר
 * - totalQuantity: סך כמות שנמכרה
 * - totalRevenue: סך הכנסות מהמוצר
 * - imageUrl: תמונת המוצר
 */
router.get(
  '/admin/top-selling-products',
  requireAdmin,
  orderController.getTopSellingProducts
);

/**
 * שליפת הכנסות מחולקות לפי קבוצות לקוחות (Admin)
 * GET /api/orders/admin/revenue-by-group
 * 
 * Query params:
 * - startDate: תאריך התחלה (אופציונלי, פורמט ISO)
 * - endDate: תאריך סיום (אופציונלי, פורמט ISO)
 * 
 * מחזיר:
 * - groupName: שם קבוצת הלקוח (או "ללא קבוצה")
 * - groupId: מזהה קבוצת הלקוח (או null אם ללא קבוצה)
 * - revenue: סה"כ הכנסות מקבוצה זו
 * 
 * דוגמה:
 * GET /api/orders/admin/revenue-by-group?startDate=2024-01-01&endDate=2024-12-31
 */
router.get(
  '/admin/revenue-by-group',
  requireAdmin,
  orderController.getRevenueByCustomerGroup
);

/**
 * שליפת כל ההזמנות (Admin)
 * GET /api/orders/admin/all
 * 
 * Query params:
 * - page: מספר עמוד (ברירת מחדל: 1)
 * - limit: כמות תוצאות לעמוד (ברירת מחדל: 20)
 * - status: סינון לפי סטטוס
 * - paymentStatus: סינון לפי סטטוס תשלום
 * - search: חיפוש טקסטואלי (מספר הזמנה, שם לקוח, אימייל)
 * - sortBy: שדה למיון (ברירת מחדל: createdAt)
 * - sortOrder: כיוון מיון (asc/desc, ברירת מחדל: desc)
 */
router.get(
  '/admin/all',
  requireAdmin,
  orderQueryLimiter,
  validateOrderQuery,
  orderController.getAllOrders
);

/**
 * עדכון סטטוס הזמנה (Admin)
 * PATCH /api/orders/:id/status
 * 
 * Body:
 * - status: הסטטוס החדש (חובה)
 * - note: הערה (אופציונלי)
 * 
 * סטטוסים אפשריים:
 * pending, confirmed, processing, shipped, delivered, cancelled, returned, attention
 */
router.patch(
  '/:id/status',
  requireAdmin,
  validateUpdateOrderStatus,
  orderController.updateOrderStatus
);

/**
 * עדכון סטטוס תשלום (Admin)
 * PATCH /api/orders/:id/payment-status
 * 
 * Body:
 * - paymentStatus: סטטוס התשלום החדש (חובה)
 * - transactionId: מזהה טרנזקציה (אופציונלי)
 * - last4: 4 ספרות אחרונות של כרטיס (אופציונלי)
 * - brand: מותג הכרטיס (אופציונלי)
 * 
 * סטטוסים אפשריים:
 * pending, paid, failed, refunded, partially_refunded
 */
router.patch(
  '/:id/payment-status',
  requireAdmin,
  orderController.updatePaymentStatus
);

/**
 * שליחה מחדש של מייל עדכון משלוח (Admin)
 * POST /api/orders/:id/resend-shipped-email
 */
router.post(
  '/:id/resend-shipped-email',
  requireAdmin,
  orderController.resendShippedEmail
);

// ============================================================================
// Export
// ============================================================================

export default router;
