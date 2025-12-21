/**
 * קונטרולר הזמנות - Order Controller
 * 
 * נקודות קצה API לניהול הזמנות
 * מטפל בבקשות HTTP ומעביר ל-service
 * 
 * @module controllers/orderController
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import orderService from '../services/orderService';
import { findUserById } from '../utils/userHelpers';
import { logger } from '../utils/logger';

// ============================================================================
// הרחבת Request להוספת מידע משתמש
// ============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role?: 'customer' | 'admin' | 'super_admin';
  };
}

// ============================================================================
// נקודות קצה - User Endpoints
// ============================================================================

/**
 * יצירת הזמנה חדשה
 * POST /api/orders
 */
export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'נדרש אימות'
      });
    }
    
    // בניית נתוני ההזמנה
    const orderData = {
      userId: new mongoose.Types.ObjectId(userId),
      items: req.body.items,
      shippingAddress: req.body.shippingAddress,
      billingAddress: req.body.billingAddress,
      paymentIntentId: req.body.paymentIntentId,
      notes: req.body.notes,
      isGuest: req.body.isGuest || false,
      guestEmail: req.body.guestEmail
    };
    
    // וידוא שיש פריטים בהזמנה
    if (!orderData.items || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'הזמנה חייבת להכיל לפחות פריט אחד'
      });
    }
    
    // וידוא שיש כתובת משלוח
    if (!orderData.shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'כתובת משלוח היא שדה חובה'
      });
    }

    // אם יש משתמש והכתובת חלקית - נשלים מערכי ברירת מחדל מהפרופיל שלו
    if (userId) {
      try {
        const profile = await findUserById(userId);
        if (profile && profile.address) {
          const addr = profile.address;
          orderData.shippingAddress = {
            ...{
              fullName: orderData.shippingAddress.fullName,
              phone: orderData.shippingAddress.phone,
              street: orderData.shippingAddress.street,
              city: orderData.shippingAddress.city,
              postalCode: orderData.shippingAddress.postalCode,
              country: orderData.shippingAddress.country,
              state: orderData.shippingAddress.state,
              notes: orderData.shippingAddress.notes
            },
            street: orderData.shippingAddress.street || addr.street || '',
            city: orderData.shippingAddress.city || addr.city || '',
            postalCode: orderData.shippingAddress.postalCode || addr.postalCode || '',
            country: orderData.shippingAddress.country || addr.country || 'ישראל'
          };
        }
      } catch (err: any) {
        // אם לא הצלחנו להשלים מהפרופיל - זה לא קריטי, נמשיך עם מה שנשלח
        logger.warn('ORDER_FILL_ADDRESS_FROM_PROFILE_FAILED', { error: err?.message || err });
      }
    }
    
    // יצירת ההזמנה
    const order = await orderService.createOrder(orderData);
    
    logger.info('ORDER_API_CREATED', { 
      orderId: (order._id as any).toString(), 
      orderNumber: order.orderNumber,
      userId 
    });
    
    res.status(201).json({
      success: true,
      message: 'ההזמנה נוצרה בהצלחה',
      data: order
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_CREATE_ERROR', { 
      error: error.message,
      body: req.body 
    });
    
    // סיווג שגיאות לתגובה מתאימה
    const statusCode = error.message.includes('לא נמצא') ? 404 : 
                       error.message.includes('אין מספיק') ? 400 : 
                       400;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'שגיאה ביצירת ההזמנה'
    });
  }
};

/**
 * שליפת הזמנות של המשתמש
 * GET /api/orders
 */
export const getUserOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'נדרש אימות'
      });
    }
    
    // קריאת פרמטרי שאילתה
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    
    const result = await orderService.getUserOrders(userId, {
      page,
      limit,
      status: status as any
    });
    
    res.json({
      success: true,
      data: result.orders,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: result.pages
      }
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_GET_USER_ORDERS_ERROR', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת ההזמנות'
    });
  }
};

/**
 * שליפת הזמנה ספציפית
 * GET /api/orders/:id
 */
export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'נדרש אימות'
      });
    }
    
    // וידוא מזהה תקין
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה הזמנה לא תקין'
      });
    }
    
    // שליפה - אם אדמין, אין צורך לבדוק userId
    const order = await orderService.getOrderById(
      orderId, 
      isAdmin ? undefined : userId
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'הזמנה לא נמצאה'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_GET_BY_ID_ERROR', { 
      error: error.message,
      orderId: req.params.id 
    });
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת ההזמנה'
    });
  }
};

/**
 * שליפת הזמנה לפי מספר הזמנה
 * GET /api/orders/number/:orderNumber
 */
export const getOrderByNumber = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderNumber = req.params.orderNumber;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'נדרש אימות'
      });
    }
    
    const order = await orderService.getOrderByNumber(orderNumber);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'הזמנה לא נמצאה'
      });
    }
    
    // בדיקת הרשאה - רק אדמין או הבעלים יכולים לראות
    if (!isAdmin && order.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'אין הרשאה לצפות בהזמנה זו'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_GET_BY_NUMBER_ERROR', { 
      error: error.message,
      orderNumber: req.params.orderNumber 
    });
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת ההזמנה'
    });
  }
};

/**
 * ביטול הזמנה
 * POST /api/orders/:id/cancel
 */
export const cancelOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const reason = req.body.reason;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'נדרש אימות'
      });
    }
    
    // וידוא מזהה תקין
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה הזמנה לא תקין'
      });
    }
    
    // ביטול - אם אדמין, אין צורך לבדוק userId
    const order = await orderService.cancelOrder(
      orderId,
      isAdmin ? undefined : userId,
      reason
    );
    
    res.json({
      success: true,
      message: 'ההזמנה בוטלה בהצלחה',
      data: order
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_CANCEL_ERROR', { 
      error: error.message,
      orderId: req.params.id 
    });
    
    // סיווג שגיאות
    const statusCode = error.message.includes('לא נמצאה') ? 404 : 
                       error.message.includes('אין הרשאה') ? 403 : 
                       error.message.includes('לא ניתן') ? 400 : 
                       400;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'שגיאה בביטול ההזמנה'
    });
  }
};

// ============================================================================
// נקודות קצה - Admin Endpoints
// ============================================================================

/**
 * שליפת כל ההזמנות (Admin)
 * GET /api/orders/admin/all
 */
export const getAllOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // קריאת פרמטרי שאילתה
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as string,
      paymentStatus: req.query.paymentStatus as string,
      search: req.query.search as string,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      // סינון לפי תאריך (format: YYYY-MM-DD)
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };
    
    const result = await orderService.getAllOrders(options as any);
    
    res.json({
      success: true,
      data: result.orders,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: result.total,
        pages: result.pages
      }
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_GET_ALL_ERROR', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת ההזמנות'
    });
  }
};

/**
 * עדכון סטטוס הזמנה (Admin)
 * PATCH /api/orders/:id/status
 * 
 * כשמעדכנים ל-shipped, ניתן להוסיף פרטי משלוח אופציונליים:
 * - shippingCarrier: שם חברת המשלוחים
 * - trackingNumber: מספר מעקב
 * - courierPhone: טלפון השליח
 */
export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const { 
      status, 
      note,
      // פרטי משלוח אופציונליים - רלוונטיים רק כשעוברים ל-shipped
      shippingCarrier,
      trackingNumber,
      courierPhone,
      estimatedDeliveryDays,
      shippingNotes
    } = req.body;
    const adminId = req.user?.userId;
    
    logger.info('=== ORDER CONTROLLER UPDATE STATUS ===', {
      orderId,
      status,
      shippingCarrier,
      trackingNumber,
      courierPhone,
      estimatedDeliveryDays,
      shippingNotes
    });
    
    // וידוא מזהה תקין
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה הזמנה לא תקין'
      });
    }
    
    // וידוא סטטוס
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'attention'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'סטטוס לא תקין',
        validStatuses
      });
    }
    
    // בניית אובייקט פרטי משלוח - רק אם יש ערכים
    const shippingDetails = (shippingCarrier || trackingNumber || courierPhone || estimatedDeliveryDays || shippingNotes) ? {
      shippingCarrier: shippingCarrier?.trim() || undefined,
      trackingNumber: trackingNumber?.trim() || undefined,
      courierPhone: courierPhone?.trim() || undefined,
      estimatedDeliveryDays: estimatedDeliveryDays ? parseInt(estimatedDeliveryDays, 10) : undefined,
      shippingNotes: shippingNotes?.trim() || undefined
    } : undefined;
    
    logger.info('=== SHIPPING DETAILS BUILT ===', { shippingDetails });
    
    const order = await orderService.updateOrderStatus(
      orderId,
      status,
      note,
      adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      shippingDetails
    );
    
    res.json({
      success: true,
      message: 'הסטטוס עודכן בהצלחה',
      data: order
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_UPDATE_STATUS_ERROR', { 
      error: error.message,
      orderId: req.params.id 
    });
    
    const statusCode = error.message.includes('לא נמצאה') ? 404 : 400;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'שגיאה בעדכון הסטטוס'
    });
  }
};

/**
 * שליחה מחדש של מייל עדכון משלוח (Admin)
 * POST /api/orders/:id/resend-shipped-email
 */
export const resendShippedEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const adminId = req.user?.userId;
    if (!adminId) {
      return res.status(403).json({ success: false, message: 'נדרש הרשאת מנהל' });
    }

    await orderService.resendShippedNotification(orderId);

    res.json({ success: true, message: 'מייל עדכון משלוח נשלח מחדש' });
  } catch (error: any) {
    logger.error('ORDER_API_RESEND_SHIPPED_EMAIL_ERROR', { error: error.message, orderId: req.params.id });
    res.status(400).json({ success: false, message: error.message || 'שגיאה בשליחת המייל' });
  }
};

/**
 * שליפת סטטיסטיקות הזמנות (Admin)
 * GET /api/orders/admin/stats
 * @query startDate - תאריך התחלה (אופציונלי) - לסינון הזמנות
 * @query endDate - תאריך סיום (אופציונלי) - לסינון הזמנות
 */
export const getOrderStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // פרמטרי תאריך אופציונליים לסינון
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const stats = await orderService.getOrderStats({ startDate, endDate });
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_GET_STATS_ERROR', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת סטטיסטיקות'
    });
  }
};

/**
 * שליפת המוצרים הנמכרים ביותר (Admin Dashboard)
 * GET /api/orders/admin/top-selling-products
 */
export const getTopSellingProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // מספר מוצרים להחזיר - ברירת מחדל 10
    const limit = parseInt(req.query.limit as string) || 10;
    
    const products = await orderService.getTopSellingProducts(limit);
    
    res.json({
      success: true,
      data: products
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_GET_TOP_SELLING_ERROR', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת מוצרים נמכרים'
    });
  }
};

/**
 * שליפת הכנסות מחולקות לפי קבוצות לקוחות (Admin)
 * GET /api/orders/admin/revenue-by-group
 * @query startDate - תאריך התחלה (אופציונלי)
 * @query endDate - תאריך סיום (אופציונלי)
 */
export const getRevenueByCustomerGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // פרמטרי תאריך אופציונליים לסינון
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const data = await orderService.getRevenueByCustomerGroup({ startDate, endDate });
    
    res.json({
      success: true,
      data
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_GET_REVENUE_BY_GROUP_ERROR', { error: error.message });
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת הכנסות לפי קבוצות לקוחות'
    });
  }
};

/**
 * עדכון סטטוס תשלום (Admin)
 * PATCH /api/orders/:id/payment-status
 */
export const updatePaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const { paymentStatus, transactionId, last4, brand } = req.body;
    
    // וידוא מזהה תקין
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'מזהה הזמנה לא תקין'
      });
    }
    
    // וידוא סטטוס תשלום
    const validStatuses = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'];
    if (!paymentStatus || !validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'סטטוס תשלום לא תקין',
        validStatuses
      });
    }
    
    const order = await orderService.updatePaymentStatus(
      orderId,
      paymentStatus,
      {
        transactionId,
        last4,
        brand,
        paidAt: paymentStatus === 'paid' ? new Date() : undefined
      }
    );
    
    res.json({
      success: true,
      message: 'סטטוס התשלום עודכן בהצלחה',
      data: order
    });
    
  } catch (error: any) {
    logger.error('ORDER_API_UPDATE_PAYMENT_ERROR', { 
      error: error.message,
      orderId: req.params.id 
    });
    
    const statusCode = error.message.includes('לא נמצאה') ? 404 : 400;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'שגיאה בעדכון סטטוס התשלום'
    });
  }
};
