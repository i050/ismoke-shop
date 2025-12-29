/**
 * שירות הזמנות - Order Service
 * 
 * לוגיקה עסקית מרכזית לניהול הזמנות
 * כולל תמיכה ב-transactions, optimistic locking ו-saga pattern
 * Phase 4.0: תמיכה בהנחת קבוצת לקוחות
 * 
 * @module services/orderService
 */

import mongoose from 'mongoose';
import Order, { IOrder, IOrderItem, OrderStatus } from '../models/Order';
import Product from '../models/Product';
import Sku from '../models/Sku';
import User from '../models/User';
import { logger } from '../utils/logger';
import { addEmailJob } from '../queues';

// ============================================================================
// DTOs - אובייקטי העברת נתונים
// ============================================================================

/**
 * נתוני יצירת הזמנה חדשה
 */
export interface CreateOrderDTO {
  userId: mongoose.Types.ObjectId | string;
  isGuest?: boolean;
  guestEmail?: string;
  items: Array<{
    productId: string;
    skuId?: string;     // ObjectId of SKU (optional)
    skuCode?: string;   // SKU code string (optional) - used when skuId not available
    quantity: number;
  }>;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
    notes?: string;
  };
  billingAddress?: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: string;
    notes?: string;
  };
  paymentIntentId?: string;
  notes?: string;
}

/**
 * אפשרויות לשליפת הזמנות
 */
export interface GetOrdersOptions {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // סינון לפי תאריך (YYYY-MM-DD format)
  startDate?: string;
  endDate?: string;
}

/**
 * תוצאת שליפת הזמנות עם pagination
 */
export interface OrdersResult {
  orders: IOrder[];
  total: number;
  pages: number;
}

/**
 * פרטי משלוח אופציונליים לעדכון כשהסטטוס משתנה ל-shipped
 */
export interface ShippingDetails {
  trackingNumber?: string;       // מספר מעקב - אופציונלי
  shippingCarrier?: string;      // שם חברת המשלוחים - אופציונלי
  courierPhone?: string;         // טלפון השליח - אופציונלי
  estimatedDeliveryDays?: number; // ימי עסקים צפויים - אופציונלי
  shippingNotes?: string;        // הערות משלוח - אופציונלי
}

// ============================================================================
// Constants - קבועים
// ============================================================================

// Phase 4.2: מע"מ כלול במחיר - לא מחשבים בנפרד

// סף למשלוח חינם (בש"ח)
const FREE_SHIPPING_THRESHOLD = 200;

// עלות משלוח רגיל (בש"ח)
const STANDARD_SHIPPING_COST = 30;

// ============================================================================
// Order Service Class
// ============================================================================

/**
 * טיפוס לתוצאת חישוב מחיר עם הנחת קבוצה
 */
interface CustomerGroupPricing {
  originalPrice: number;
  finalPrice: number;
  discountPercentage: number;
  customerGroupName?: string;
  hasDiscount: boolean;
}

class OrderService {
  
  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  /**
   * חישוב מחיר עם הנחת קבוצת לקוח
   * Phase 4.0: תמיכה בהנחת קבוצת לקוחות בהזמנות
   */
  private async calculatePriceWithGroupDiscount(
    basePrice: number,
    userId: mongoose.Types.ObjectId | string
  ): Promise<CustomerGroupPricing> {
    const result: CustomerGroupPricing = {
      originalPrice: basePrice,
      finalPrice: basePrice,
      discountPercentage: 0,
      hasDiscount: false
    };

    try {
      // שליפת המשתמש עם קבוצת הלקוח שלו
      const user = await User.findById(userId)
        .populate('customerGroupId')
        .lean();

      if (!user || !user.customerGroupId) {
        return result;
      }

      const customerGroup = user.customerGroupId as any;

      // בדיקה שהקבוצה פעילה ויש לה הנחה
      if (customerGroup && customerGroup.isActive && customerGroup.discountPercentage > 0) {
        const discountAmount = (basePrice * customerGroup.discountPercentage) / 100;
        result.finalPrice = Math.round((basePrice - discountAmount) * 100) / 100;
        
        // בדיקה: האם להציג ללקוח שיש הנחה?
        // אם showOriginalPrice === false, הלקוח לא יידע שהוא מקבל הנחה
        const shouldShowDiscount = customerGroup.showOriginalPrice !== false;
        
        if (shouldShowDiscount) {
          // מצב רגיל - להציג את ההנחה ללקוח
          result.discountPercentage = customerGroup.discountPercentage;
          result.customerGroupName = customerGroup.name;
          result.hasDiscount = true;

          logger.info('ORDER_GROUP_DISCOUNT_APPLIED', {
            userId: userId.toString(),
            groupName: customerGroup.name,
            discountPercentage: customerGroup.discountPercentage,
            originalPrice: basePrice,
            finalPrice: result.finalPrice,
            visible: true
          });
        } else {
          // מצב "הנחה שקטה" - הלקוח לא יודע שהוא מקבל הנחה
          // המחיר הסופי כבר חושב, אבל לא נחשוף את המידע
          result.originalPrice = result.finalPrice; // המחיר "המקורי" = המחיר הסופי
          result.hasDiscount = false; // נסתיר את העובדה שיש הנחה
          // לא נשלח discountPercentage או customerGroupName

          logger.info('ORDER_SILENT_DISCOUNT_APPLIED', {
            userId: userId.toString(),
            groupName: customerGroup.name,
            discountPercentage: customerGroup.discountPercentage,
            originalPrice: basePrice,
            finalPrice: result.finalPrice,
            showOriginalPrice: false
          });
        }
      }
    } catch (error) {
      logger.warn('ORDER_GROUP_DISCOUNT_ERROR', { userId: userId.toString(), error: String(error) });
      // במקרה של שגיאה, החזר מחיר ללא הנחה
    }

    return result;
  }
  
  // ==========================================================================
  // יצירת הזמנה
  // ==========================================================================

  /**
   * יצירת הזמנה חדשה עם transaction מלא
   * 
   * מבטיח אטומיות: או שהכל מצליח או שהכל מתבטל
   * משתמש ב-saga pattern להחזרת מלאי במקרה של כשלון
   * 
   * @param data - נתוני ההזמנה
   * @returns ההזמנה שנוצרה
   */
  async createOrder(data: CreateOrderDTO): Promise<IOrder> {
    // פתיחת session ל-transaction
    const session = await mongoose.startSession();
    
    // רשימת compensations למקרה של שגיאה (saga pattern)
    const compensations: Array<() => Promise<void>> = [];
    
    try {
      session.startTransaction();
      
      logger.info('ORDER_CREATE_START', { 
        userId: data.userId, 
        itemsCount: data.items.length 
      });
      
      // =====================================
      // שלב 1: וידוא ואיסוף נתוני מוצרים
      // =====================================
      const orderItems: IOrderItem[] = [];
      
      for (const item of data.items) {
        // שליפת המוצר
        const product = await Product.findById(item.productId).session(session);
        if (!product) {
          throw new Error(`המוצר ${item.productId} לא נמצא`);
        }
        
        if (!product.isActive) {
          throw new Error(`המוצר "${product.name}" אינו זמין למכירה`);
        }
        
        let sku;
        let price: number;
        let skuCode: string;
        let imageUrl: string | undefined;
        let attributes: Record<string, any> = {};
        
        if (item.skuId || item.skuCode) {
          // אם יש SKU ספציפי - חיפוש לפי ID או לפי קוד
          if (item.skuId && mongoose.Types.ObjectId.isValid(item.skuId)) {
            // חיפוש לפי ObjectId
            sku = await Sku.findById(item.skuId).session(session);
          } else {
            // חיפוש לפי קוד SKU (מחרוזת)
            const skuCodeToSearch = item.skuCode || item.skuId;
            sku = await Sku.findOne({ 
              sku: skuCodeToSearch,
              productId: item.productId 
            }).session(session);
          }
          
          if (!sku) {
            throw new Error(`וריאנט ${item.skuId || item.skuCode} לא נמצא`);
          }
          
          if (!sku.isActive) {
            throw new Error(`הוריאנט "${sku.name}" אינו זמין למכירה`);
          }
          
          // בדיקת מלאי
          if (sku.stockQuantity < item.quantity) {
            throw new Error(
              `אין מספיק במלאי עבור "${product.name}" (${sku.sku}). ` +
              `זמין: ${sku.stockQuantity}, מבוקש: ${item.quantity}`
            );
          }
          
          // שימוש במחיר SKU או מחיר בסיס של המוצר
          price = sku.price ?? product.basePrice;
          skuCode = sku.sku;
          imageUrl = sku.images?.[0]?.medium || product.images?.[0]?.medium;
          attributes = {
            color: sku.color,
            size: sku.attributes?.size,
            ...sku.attributes
          };
          
          // עדכון מלאי עם optimistic locking
          // בודק version למניעת race conditions
          const updateResult = await Sku.updateOne(
            { 
              _id: sku._id, 
              stockQuantity: { $gte: item.quantity },
              __v: sku.__v // בדיקת version
            },
            { 
              $inc: { stockQuantity: -item.quantity, __v: 1 }
            }
          ).session(session);
          
          if (updateResult.modifiedCount === 0) {
            throw new Error(
              `לא ניתן לעדכן מלאי עבור "${product.name}" - ייתכן שהמלאי השתנה`
            );
          }
          
          // הוספת compensation - החזרת מלאי במקרה של שגיאה
          const skuId = sku._id;
          const returnQuantity = item.quantity;
          compensations.push(async () => {
            await Sku.updateOne(
              { _id: skuId },
              { $inc: { stockQuantity: returnQuantity } }
            );
            logger.info('ORDER_COMPENSATION_STOCK', { 
              skuId: skuId.toString(), 
              quantity: returnQuantity 
            });
          });
          
        } else {
          // אם אין SKU - שימוש במחיר הבסיסי של המוצר
          price = product.basePrice;
          skuCode = product.sku || `PROD-${product._id}`;
          imageUrl = product.images?.[0]?.medium;
          
          // בדיקת מלאי של המוצר עצמו
          if (product.stockQuantity < item.quantity) {
            throw new Error(
              `אין מספיק במלאי עבור "${product.name}". ` +
              `זמין: ${product.stockQuantity}, מבוקש: ${item.quantity}`
            );
          }
          
          // עדכון מלאי המוצר
          const updateResult = await Product.updateOne(
            { 
              _id: product._id, 
              stockQuantity: { $gte: item.quantity }
            },
            { 
              $inc: { stockQuantity: -item.quantity }
            }
          ).session(session);
          
          if (updateResult.modifiedCount === 0) {
            throw new Error(
              `לא ניתן לעדכן מלאי עבור "${product.name}" - ייתכן שהמלאי השתנה`
            );
          }
          
          // הוספת compensation
          const productIdToRestore = product._id;
          const returnQuantity = item.quantity;
          compensations.push(async () => {
            await Product.updateOne(
              { _id: productIdToRestore },
              { $inc: { stockQuantity: returnQuantity } }
            );
            logger.info('ORDER_COMPENSATION_PRODUCT_STOCK', { 
              productId: String(productIdToRestore), 
              quantity: returnQuantity 
            });
          });
        }
        
        // Phase 4.0: חישוב מחיר עם הנחת קבוצת לקוח
        const pricingResult = await this.calculatePriceWithGroupDiscount(price, data.userId);
        
        // יצירת פריט ההזמנה (snapshot) עם הנחת קבוצה
        orderItems.push({
          productId: new mongoose.Types.ObjectId(item.productId),
          skuId: sku ? sku._id : undefined,
          name: product.name,
          sku: skuCode,
          price: pricingResult.finalPrice,
          originalPrice: pricingResult.hasDiscount ? pricingResult.originalPrice : undefined,
          discountPercentage: pricingResult.hasDiscount ? pricingResult.discountPercentage : undefined,
          customerGroupName: pricingResult.customerGroupName,
          quantity: item.quantity,
          imageUrl,
          attributes,
          subtotal: pricingResult.finalPrice * item.quantity
        });
      }
      
      // =====================================
      // שלב 2: חישוב סכומים
      // Phase 4.2: מע"מ כלול במחיר - לא מחשבים בנפרד
      // =====================================
      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const tax = 0; // Phase 4.2: מע"מ כלול במחיר
      const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
      const total = subtotal + shippingCost; // ללא מע"מ
      
      // =====================================
      // שלב 3: יצירת ההזמנה
      // =====================================
      const order = new Order({
        userId: new mongoose.Types.ObjectId(data.userId.toString()),
        isGuest: data.isGuest || false,
        guestEmail: data.guestEmail,
        items: orderItems,
        subtotal,
        tax,
        shippingCost,
        discount: 0,
        total,
        currency: 'ILS',
        shippingAddress: {
          ...data.shippingAddress,
          country: data.shippingAddress.country || 'IL'
        },
        billingAddress: data.billingAddress,
        status: 'pending',
        paymentStatus: data.paymentIntentId ? 'pending' : 'pending',
        payment: data.paymentIntentId ? {
          gateway: 'stripe',
          paymentIntentId: data.paymentIntentId,
          method: 'card'
        } : undefined,
        notes: data.notes,
        statusHistory: [{
          status: 'pending',
          timestamp: new Date(),
          note: 'הזמנה נוצרה'
        }]
      });
      
      await order.save({ session });
      
      logger.info('ORDER_CREATED', { 
        orderId: String(order._id), 
        orderNumber: order.orderNumber,
        total: order.total,
        itemsCount: order.items.length
      });
      
      // =====================================
      // שלב 4: עדכון סטטיסטיקות משתמש
      // =====================================
      await User.findByIdAndUpdate(
        data.userId,
        { 
          $inc: { 
            'stats.totalOrders': 1,
            'stats.totalSpent': total
          },
          $set: {
            'stats.lastOrderDate': new Date()
          }
        },
        { session }
      ).catch(() => {
        // לא נכשל אם עדכון הסטטיסטיקות נכשל
        logger.warn('ORDER_USER_STATS_UPDATE_FAILED', { userId: data.userId });
      });
      
      // =====================================
      // שלב 5: Commit - כל הפעולות הצליחו!
      // =====================================
      await session.commitTransaction();
      
      logger.info('ORDER_TRANSACTION_COMMITTED', { 
        orderId: String(order._id),
        orderNumber: order.orderNumber
      });
      
      // =====================================
      // שלב 6: שליחת מייל אישור הזמנה
      // =====================================
      // מבוצע מחוץ ל-transaction כדי לא לחסום את התהליך
      try {
        // קבלת אימייל המשתמש
        let customerEmail: string | undefined;
        let customerName: string = 'לקוח/ה יקר/ה';
        
        if (order.isGuest && order.guestEmail) {
          customerEmail = order.guestEmail;
          customerName = order.shippingAddress.fullName;
        } else {
          const user = await User.findById(data.userId).select('email firstName lastName').lean() as any;
          if (user) {
            customerEmail = user.email;
            customerName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : order.shippingAddress.fullName;
          }
        }
        
        if (customerEmail) {
          await addEmailJob({
            type: 'order_confirmation',
            to: customerEmail,
            data: {
              orderId: String(order._id),
              orderNumber: order.orderNumber,
              orderDate: order.createdAt || new Date(),
              customerName,
              items: order.items.map(item => ({
                productName: item.name,
                quantity: item.quantity,
                subtotal: item.subtotal,
                imageUrl: item.imageUrl,
                attributes: item.attributes
              })),
              subtotal: order.subtotal,
              tax: order.tax,
              shippingCost: order.shippingCost,
              discount: order.discount || 0,
              total: order.total,
              shippingAddress: {
                fullName: order.shippingAddress.fullName,
                street: order.shippingAddress.street,
                city: order.shippingAddress.city,
                postalCode: order.shippingAddress.postalCode,
                phone: order.shippingAddress.phone
              }
            }
          });
          
          logger.info('ORDER_CONFIRMATION_EMAIL_QUEUED', {
            orderId: String(order._id),
            orderNumber: order.orderNumber,
            email: customerEmail
          });
        } else {
          logger.warn('ORDER_NO_EMAIL_FOR_CONFIRMATION', {
            orderId: String(order._id),
            isGuest: order.isGuest
          });
        }
      } catch (emailError: any) {
        // לא מכשילים את ההזמנה בגלל כישלון מייל
        logger.error('ORDER_CONFIRMATION_EMAIL_FAILED', {
          orderId: String(order._id),
          error: emailError.message
        });
      }
      
      return order;
      
    } catch (error: any) {
      // =====================================
      // Rollback - ביצוע compensations
      // =====================================
      await session.abortTransaction();
      
      logger.error('ORDER_CREATE_ERROR', { 
        error: error.message,
        userId: data.userId.toString(),
        stack: error.stack
      });
      
      // ביצוע כל ה-compensations בסדר הפוך
      for (const compensate of compensations.reverse()) {
        try {
          await compensate();
        } catch (compError: any) {
          // שגיאה קריטית - compensation נכשל!
          logger.error('ORDER_COMPENSATION_FAILED', { 
            error: compError.message,
            originalError: error.message 
          });
          // TODO: שליחת התראה לצוות
        }
      }
      
      throw error;
      
    } finally {
      session.endSession();
    }
  }

  // ==========================================================================
  // שליפת הזמנות
  // ==========================================================================

  /**
   * שליפת הזמנות של משתמש ספציפי
   * 
   * @param userId - מזהה המשתמש
   * @param options - אפשרויות סינון ו-pagination
   * @returns הזמנות עם מידע על pagination
   */
  async getUserOrders(
    userId: string, 
    options: GetOrdersOptions = {}
  ): Promise<OrdersResult> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 10, 50); // מקסימום 50
    const skip = (page - 1) * limit;
    
    // בניית filter
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
    
    if (options.status) {
      filter.status = options.status;
    }
    
    // הרצת שאילתות במקביל
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter)
    ]);
    
    return {
      orders: orders as IOrder[],
      total,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * שליפת הזמנה לפי ID
   * 
   * @param orderId - מזהה ההזמנה
   * @param userId - מזהה המשתמש (לבדיקת הרשאה, אופציונלי)
   * @returns ההזמנה או null
   */
  async getOrderById(orderId: string, userId?: string): Promise<IOrder | null> {
    const filter: any = { _id: new mongoose.Types.ObjectId(orderId) };
    
    // אם יש userId, בדוק שההזמנה שייכת למשתמש
    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }
    
    const order = await Order.findOne(filter).lean();
    return order as IOrder | null;
  }

  /**
   * שליפת הזמנה לפי מספר הזמנה
   * 
   * @param orderNumber - מספר ההזמנה (למשל: ORD-20251125-0001)
   * @returns ההזמנה או null
   */
  async getOrderByNumber(orderNumber: string): Promise<IOrder | null> {
    const order = await Order.findOne({ orderNumber }).lean();
    return order as IOrder | null;
  }

  // ==========================================================================
  // עדכון הזמנות
  // ==========================================================================

  /**
   * עדכון סטטוס הזמנה (Admin)
   * 
   * @param orderId - מזהה ההזמנה
   * @param newStatus - הסטטוס החדש
   * @param note - הערה אופציונלית
   * @param updatedBy - מי ביצע את העדכון
   * @param shippingDetails - פרטי משלוח אופציונליים (רק כשעובר ל-shipped)
   * @returns ההזמנה המעודכנת
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    updatedBy?: mongoose.Types.ObjectId,
    shippingDetails?: ShippingDetails
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new Error('הזמנה לא נמצאה');
    }
    
    const oldStatus = order.status;
    
    // רשום פרטי משלוח אם נשלחו (אנו תומכים בשליחה גם בעת עדכון בלבד)
    const originalShippingCarrier = (order.shippingCarrier || '').trim();
    const originalTrackingNumber = (order.trackingNumber || '').trim();
    const originalCourierPhone = (order.courierPhone || '').trim();
    const originalEstimatedDeliveryDays = order.estimatedDeliveryDays;
    const originalShippingNotes = (order.shippingNotes || '').trim();

    let shippingChanged = false;
    if (shippingDetails) {
      logger.info('=== UPDATING SHIPPING DETAILS ===', {
        shippingDetails,
        originalShippingCarrier,
        originalTrackingNumber,
        originalCourierPhone,
        originalEstimatedDeliveryDays,
        originalShippingNotes
      });
      
      const newShippingCarrier = (shippingDetails.shippingCarrier || '').trim();
      const newTrackingNumber = (shippingDetails.trackingNumber || '').trim();
      const newCourierPhone = (shippingDetails.courierPhone || '').trim();
      const newEstimatedDeliveryDays = shippingDetails.estimatedDeliveryDays;
      const newShippingNotes = (shippingDetails.shippingNotes || '').trim();

      if (newShippingCarrier !== originalShippingCarrier) {
        logger.info('Updating shippingCarrier', { from: originalShippingCarrier, to: newShippingCarrier });
        order.shippingCarrier = newShippingCarrier;
        shippingChanged = true;
      }
      if (newTrackingNumber !== originalTrackingNumber) {
        logger.info('Updating trackingNumber', { from: originalTrackingNumber, to: newTrackingNumber });
        order.trackingNumber = newTrackingNumber;
        shippingChanged = true;
      }
      if (newCourierPhone !== originalCourierPhone) {
        logger.info('Updating courierPhone', { from: originalCourierPhone, to: newCourierPhone });
        order.courierPhone = newCourierPhone;
        shippingChanged = true;
      }
      if (newEstimatedDeliveryDays !== originalEstimatedDeliveryDays) {
        logger.info('Updating estimatedDeliveryDays', { from: originalEstimatedDeliveryDays, to: newEstimatedDeliveryDays });
        order.estimatedDeliveryDays = newEstimatedDeliveryDays;
        shippingChanged = true;
      }
      if (newShippingNotes !== originalShippingNotes) {
        logger.info('Updating shippingNotes', { from: originalShippingNotes, to: newShippingNotes });
        order.shippingNotes = newShippingNotes;
        shippingChanged = true;
      }
      
      logger.info('Shipping update complete', { shippingChanged });
    }
    
    // עדכון הסטטוס עם היסטוריה
    await order.updateStatus(newStatus, note, updatedBy);
    
    logger.info('ORDER_STATUS_UPDATED', { 
      orderId, 
      oldStatus,
      newStatus,
      updatedBy: updatedBy?.toString(),
      shippingDetails: shippingDetails || null
    });
    
    // שליחת מייל על שינוי סטטוס או כשפרטי המשלוח נוספו/שונו וההזמנה כבר בסטטוס shipped
    const isNowShipped = order.status === 'shipped';
    const shouldSendShippedEmail = (newStatus === 'shipped') || (isNowShipped && shippingChanged);
    if (shouldSendShippedEmail) {
      this.sendShippedNotification(order).catch(err => {
        logger.error('ORDER_SHIPPED_EMAIL_FAILED', { orderId, error: err.message });
      });
    }
    
    return order;
  }
  
  /**
   * שליחת התראה על משלוח ההזמנה
   * כולל פרטי משלוח אם הוזנו על ידי המנהל
   */
  private async sendShippedNotification(order: IOrder): Promise<void> {
    let customerEmail: string | undefined;
    let customerName: string = 'לקוח/ה יקר/ה';
    
    if (order.isGuest && order.guestEmail) {
      customerEmail = order.guestEmail;
      customerName = order.shippingAddress.fullName;
    } else {
      const user = await User.findById(order.userId).select('email firstName lastName').lean() as any;
      if (user) {
        customerEmail = user.email;
        customerName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : order.shippingAddress.fullName;
      }
    }
    
    if (customerEmail) {
      // שליחת פרטי משלוח רק אם הוזנו - כולם אופציונליים
      await addEmailJob({
        type: 'order_shipped',
        to: customerEmail,
        data: {
          orderNumber: order.orderNumber,
          customerName,
          // פרטי משלוח אופציונליים - יופיעו במייל רק אם קיימים
          trackingNumber: order.trackingNumber || undefined,
          shippingCarrier: order.shippingCarrier || undefined,
          courierPhone: order.courierPhone || undefined,
          estimatedDeliveryDays: order.estimatedDeliveryDays || undefined,
          shippingNotes: order.shippingNotes || undefined
        }
      });
      
      logger.info('ORDER_SHIPPED_EMAIL_QUEUED', {
        orderId: String(order._id),
        orderNumber: order.orderNumber
      });
    }
  }

  /**
   * שליחה מחדש של מייל עדכון משלוח (לשימוש ע"י Controller)
   * @param orderId - מזהה ההזמנה
   */
  async resendShippedNotification(orderId: string): Promise<void> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error(`הזמנה ${orderId} לא נמצאה`);
    }
    if (order.status !== 'shipped' && order.status !== 'delivered') {
      throw new Error('ניתן לשלוח מייל משלוח רק להזמנות שנשלחו');
    }
    await this.sendShippedNotification(order);
  }

  /**
   * עדכון סטטוס תשלום
   * 
   * @param orderId - מזהה ההזמנה
   * @param paymentStatus - סטטוס התשלום החדש
   * @param paymentInfo - מידע נוסף על התשלום
   * @returns ההזמנה המעודכנת
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded',
    paymentInfo?: Partial<{
      transactionId: string;
      last4: string;
      brand: string;
      paidAt: Date;
    }>
  ): Promise<IOrder> {
    const update: any = { paymentStatus };
    
    if (paymentInfo) {
      if (paymentInfo.transactionId) {
        update['payment.transactionId'] = paymentInfo.transactionId;
      }
      if (paymentInfo.last4) {
        update['payment.last4'] = paymentInfo.last4;
      }
      if (paymentInfo.brand) {
        update['payment.brand'] = paymentInfo.brand;
      }
      if (paymentInfo.paidAt) {
        update['payment.paidAt'] = paymentInfo.paidAt;
      }
    }
    
    // אם התשלום הצליח, עדכן גם את סטטוס ההזמנה
    if (paymentStatus === 'paid') {
      update.status = 'confirmed';
    }
    
    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: update },
      { new: true }
    );
    
    if (!order) {
      throw new Error('הזמנה לא נמצאה');
    }
    
    logger.info('ORDER_PAYMENT_UPDATED', { 
      orderId, 
      paymentStatus,
      transactionId: paymentInfo?.transactionId
    });
    
    return order;
  }

  // ==========================================================================
  // ביטול הזמנה
  // ==========================================================================

  /**
   * ביטול הזמנה והחזרת מלאי
   * 
   * @param orderId - מזהה ההזמנה
   * @param userId - מזהה המשתמש (לבדיקת הרשאה, אופציונלי לאדמין)
   * @param reason - סיבת הביטול
   * @returns ההזמנה המבוטלת
   */
  async cancelOrder(
    orderId: string, 
    userId?: string, 
    reason?: string
  ): Promise<IOrder> {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const order = await Order.findById(orderId).session(session);
      
      if (!order) {
        throw new Error('הזמנה לא נמצאה');
      }
      
      // בדיקת הרשאה (אם יש userId)
      if (userId && order.userId.toString() !== userId) {
        throw new Error('אין הרשאה לבטל הזמנה זו');
      }
      
      // בדיקה אם ניתן לבטל
      if (!order.canBeCancelled()) {
        throw new Error('לא ניתן לבטל הזמנה זו בשלב הנוכחי');
      }
      
      // החזרת מלאי לכל פריט
      for (const item of order.items) {
        if (item.skuId) {
          // החזרת מלאי ל-SKU
          await Sku.updateOne(
            { _id: item.skuId },
            { $inc: { stockQuantity: item.quantity } }
          ).session(session);
        } else {
          // החזרת מלאי למוצר
          await Product.updateOne(
            { _id: item.productId },
            { $inc: { stockQuantity: item.quantity } }
          ).session(session);
        }
      }
      
      // עדכון סטטוס ההזמנה
      order.status = 'cancelled';
      order.statusHistory.push({
        status: 'cancelled',
        timestamp: new Date(),
        note: reason || 'בוטל על ידי המשתמש'
      });
      
      // אם שולם - צריך לסמן להחזר
      if (order.paymentStatus === 'paid') {
        order.paymentStatus = 'refunded';
        // TODO: אינטגרציה עם refund של Stripe/PayPal
      }
      
      await order.save({ session });
      
      await session.commitTransaction();
      
      logger.info('ORDER_CANCELLED', { 
        orderId, 
        reason,
        userId
      });
      
      return order;
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ==========================================================================
  // פונקציות Admin
  // ==========================================================================

  /**
   * שליפת כל ההזמנות (Admin)
   * 
   * @param options - אפשרויות סינון ו-pagination
   * @returns הזמנות עם מידע על pagination
   */
  async getAllOrders(options: GetOrdersOptions = {}): Promise<OrdersResult> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // מקסימום 100
    const skip = (page - 1) * limit;
    
    // בניית filter
    const filter: any = {};
    
    if (options.status) {
      filter.status = options.status;
    }
    
    if (options.paymentStatus) {
      filter.paymentStatus = options.paymentStatus;
    }
    
    // סינון לפי טווח תאריך
    if (options.startDate || options.endDate) {
      filter.createdAt = {};
      
      // תאריך התחלה - מתחילים מתחילת היום
      if (options.startDate) {
        const startDateObj = new Date(options.startDate);
        startDateObj.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = startDateObj;
      }
      
      // תאריך סיום - עד סוף היום
      if (options.endDate) {
        const endDateObj = new Date(options.endDate);
        endDateObj.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateObj;
      }
    }
    
    // חיפוש טקסטואלי
    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      filter.$or = [
        { orderNumber: searchRegex },
        { 'shippingAddress.fullName': searchRegex },
        { guestEmail: searchRegex }
      ];
    }
    
    // מיון
    const sort: any = {};
    const sortBy = options.sortBy || 'createdAt';
    sort[sortBy] = options.sortOrder === 'asc' ? 1 : -1;
    
    // הרצת שאילתות במקביל
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email phone')
        .lean(),
      Order.countDocuments(filter)
    ]);
    
    return {
      orders: orders as IOrder[],
      total,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * קבלת סטטיסטיקות הזמנות (Admin)
   * תומך בסינון לפי טווח תאריכים - לצורך הצגת הכנסות חודשיות
   * 
   * @param options - אופציות סינון
   * @param options.startDate - תאריך התחלה (כולל)
   * @param options.endDate - תאריך סיום (כולל)
   * @returns סטטיסטיקות כלליות
   */
  async getOrderStats(options?: { startDate?: Date; endDate?: Date }): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<string, number>;
    recentOrders: IOrder[];
  }> {
    // בניית פילטר תאריכים אם סופק
    const dateFilter: Record<string, any> = {};
    if (options?.startDate || options?.endDate) {
      dateFilter.createdAt = {};
      if (options.startDate) {
        dateFilter.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        dateFilter.createdAt.$lte = options.endDate;
      }
    }

    const [totals, revenue, recentOrders] = await Promise.all([
      // ספירת הזמנות לפי סטטוס - עם סינון תאריכים
      Order.aggregate([
        { $match: { ...dateFilter } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      // חישוב הכנסות - מהזמנות ששולמו או confirmed/delivered, עם סינון תאריכים
      Order.aggregate([
        {
          $match: { 
            ...dateFilter,
            $or: [
              { paymentStatus: 'paid' },
              { status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } }
            ]
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
            count: { $sum: 1 }
          }
        }
      ]),
      // הזמנות אחרונות - עם סינון תאריכים
      Order.find(dateFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);
    
    // המרת תוצאות ל-ordersByStatus
    const ordersByStatus: Record<string, number> = {};
    for (const item of totals) {
      ordersByStatus[item._id] = item.count;
    }
    
    const totalRevenue = revenue[0]?.total || 0;
    const paidOrdersCount = revenue[0]?.count || 0;
    
    return {
      totalOrders: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
      pendingOrders: (ordersByStatus['pending'] || 0) + (ordersByStatus['confirmed'] || 0),
      completedOrders: ordersByStatus['delivered'] || 0,
      cancelledOrders: ordersByStatus['cancelled'] || 0,
      totalRevenue,
      averageOrderValue: paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0,
      ordersByStatus,
      recentOrders: recentOrders as IOrder[]
    };
  }

  /**
   * קבלת המוצרים הנמכרים ביותר (Admin Dashboard)
   * מחשב מתוך ההזמנות את המוצרים שהוזמנו הכי הרבה
   * 
   * @param limit - כמה מוצרים להחזיר (ברירת מחדל: 10)
   * @returns רשימת המוצרים הנמכרים ביותר עם כמות מכירות
   */
  async getTopSellingProducts(limit: number = 10): Promise<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    imageUrl?: string;
  }[]> {
    const results = await Order.aggregate([
      // רק הזמנות שלא בוטלו
      {
        $match: {
          status: { $nin: ['cancelled', 'returned'] }
        }
      },
      // פריסת פריטי ההזמנה למסמכים נפרדים
      { $unwind: '$items' },
      // קיבוץ לפי מזהה המוצר
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.name' },
          imageUrl: { $first: '$items.imageUrl' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' }
        }
      },
      // מיון לפי כמות מכירות (מהגבוה לנמוך)
      { $sort: { totalQuantity: -1 } },
      // הגבלת תוצאות
      { $limit: limit },
      // הוספת productId כ-string
      {
        $project: {
          _id: 0,
          productId: { $toString: '$_id' },
          productName: 1,
          imageUrl: 1,
          totalQuantity: 1,
          totalRevenue: 1
        }
      }
    ]);

    return results;
  }

  /**
   * קבלת הכנסות מחולקות לפי קבוצות לקוחות
   * מחשב את סה"כ ההכנסה מכל קבוצת לקוח כולל "ללא קבוצה"
   * 
   * @param options.startDate - תאריך התחלה (אופציונלי)
   * @param options.endDate - תאריך סיום (אופציונלי)
   * @returns מערך של קבוצות עם הכנסות
   */
  async getRevenueByCustomerGroup(options?: { startDate?: Date; endDate?: Date }): Promise<{
    groupName: string;
    groupId: string | null;
    revenue: number;
  }[]> {
    // בניית פילטר תאריכים אם סופק
    const dateFilter: Record<string, any> = {};
    if (options?.startDate || options?.endDate) {
      dateFilter.createdAt = {};
      if (options.startDate) {
        dateFilter.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        dateFilter.createdAt.$lte = options.endDate;
      }
    }

    // שאילתה Aggregation:
    // 1. מסננים הזמנות לפי תאריך וסטטוס תשלום
    // 2. מחברים למשתמשים כדי לקבל את customerGroupId
    // 3. מחברים לקבוצות לקוחות כדי לקבל את השם
    // 4. מקבצים לפי קבוצה וסכמים את ההכנסות
    const results = await Order.aggregate([
      // סינון הזמנות ששולמו או בהן יש סטטוס שמעיד על הכנסה
      {
        $match: {
          ...dateFilter,
          $or: [
            { paymentStatus: 'paid' },
            { status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } }
          ]
        }
      },
      // הצטרפות לטבלת משתמשים כדי לקבל customerGroupId
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      // פרוק המערך (כי lookup מחזיר מערך)
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      // הצטרפות לטבלת קבוצות לקוחות - בדוק את השם הנכון של הטבלה
      {
        $lookup: {
          from: 'customergroups',
          let: { groupId: '$userInfo.customerGroupId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$groupId'] } } }
          ],
          as: 'customerGroupInfo'
        }
      },
      // פרוק המערך של customerGroup עם preserveNullAndEmptyArrays
      { $unwind: { path: '$customerGroupInfo', preserveNullAndEmptyArrays: true } },
      // יצירת שדות עזר ברורים
      {
        $project: {
          _id: 0,
          groupId: {
            $cond: [
              { $eq: ['$userInfo.customerGroupId', null] },
              'no-group',
              { $toString: '$userInfo.customerGroupId' }
            ]
          },
          groupName: {
            $cond: [
              { $eq: ['$customerGroupInfo.name', null] },
              'ללא קבוצה',
              '$customerGroupInfo.name'
            ]
          },
          revenue: '$total'
        }
      },
      // קביעת grouping לפי שם הקבוצה
      {
        $group: {
          _id: {
            groupId: '$groupId',
            groupName: '$groupName'
          },
          totalRevenue: { $sum: '$revenue' }
        }
      },
      // ניקוי הפלט
      {
        $project: {
          _id: 0,
          groupId: {
            $cond: [
              { $eq: ['$_id.groupId', 'no-group'] },
              null,
              '$_id.groupId'
            ]
          },
          groupName: '$_id.groupName',
          revenue: '$totalRevenue'
        }
      },
      // מיון לפי הכנסות (מהגבוה לנמוך)
      { $sort: { revenue: -1 } }
    ]);

    console.log('📊 Aggregation Results:', results);

    // החזרת התוצאות עם fallback values
    const final = results.map((item: any) => ({
      groupName: item.groupName && item.groupName !== '' ? item.groupName : 'ללא קבוצה',
      groupId: item.groupId === 'no-group' ? null : (item.groupId || null),
      revenue: Number(item.revenue) || 0
    }));

    console.log('✅ Final Results:', final);
    return final || [];
  }
}

// ============================================================================
// Export
// ============================================================================

export const orderService = new OrderService();
export default orderService;
