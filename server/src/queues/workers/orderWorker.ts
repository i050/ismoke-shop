/**
 * Order Worker
 * ============
 * מעבד משימות הזמנה מהתור
 * - עיבוד הזמנות חדשות
 * - ביטול הזמנות
 * - עדכון סטטוס
 * - סנכרון למערכות חיצוניות
 */

import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { 
  QUEUE_NAMES, 
  OrderJobData, 
  getSharedRedisConnection,
  addEmailJob,
  addInventoryJob
} from '../index';
import { Order, IOrder } from '../../models/Order';
import { logger } from '../../utils/logger';

// =============================================================================
// פונקציות טיפול בהזמנות
// =============================================================================

/**
 * עיבוד הזמנה חדשה
 * כולל שמירת מלאי ושליחת מייל
 */
async function processNewOrder(orderId: string): Promise<{ success: boolean }> {
  
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new Error(`הזמנה ${orderId} לא נמצאה`);
  }
  
  logger.info('🛒 מעבד הזמנה חדשה', {
    orderId,
    orderNumber: order.orderNumber,
    itemsCount: order.items.length
  });
  
  // הכנת פריטי מלאי לשמירה
  const inventoryItems = order.items.map(item => ({
    skuId: item.sku.toString(),
    quantity: item.quantity
  }));
  
  // שמירת מלאי (באמצעות תור)
  await addInventoryJob({
    type: 'reserve_stock',
    orderId: (order._id as mongoose.Types.ObjectId).toString(),
    items: inventoryItems
  });
  
  // שליחת מייל אישור (אם יש כתובת)
  const email = order.guestEmail;
  if (email) {
    await addEmailJob({
      type: 'order_confirmation',
      to: email,
      data: {
        orderNumber: order.orderNumber,
        total: order.total,
        items: order.items.length,
        customerName: order.shippingAddress?.fullName || 'לקוח יקר'
      },
      orderId: (order._id as mongoose.Types.ObjectId).toString()
    });
  }
  
  logger.info('✅ הזמנה עובדה בהצלחה', {
    orderId,
    orderNumber: order.orderNumber
  });
  
  return { success: true };
}

/**
 * ביטול הזמנה
 * כולל שחרור מלאי והודעה ללקוח
 */
async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean }> {
  
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new Error(`הזמנה ${orderId} לא נמצאה`);
  }
  
  // בדיקה אם אפשר לבטל
  if (['delivered', 'shipped', 'cancelled'].includes(order.status)) {
    throw new Error(`לא ניתן לבטל הזמנה בסטטוס ${order.status}`);
  }
  
  logger.info('🚫 מבטל הזמנה', {
    orderId,
    orderNumber: order.orderNumber,
    previousStatus: order.status,
    reason
  });
  
  // עדכון סטטוס
  await order.updateStatus('cancelled', reason || 'ביטול לפי בקשה');
  await order.save();
  
  // שחרור מלאי
  const inventoryItems = order.items.map(item => ({
    skuId: item.sku.toString(),
    quantity: item.quantity
  }));
  
  await addInventoryJob({
    type: 'release_stock',
    orderId: (order._id as mongoose.Types.ObjectId).toString(),
    items: inventoryItems,
    reason: 'ביטול הזמנה'
  });
  
  // שליחת מייל על הביטול
  const email = order.guestEmail;
  if (email) {
    await addEmailJob({
      type: 'refund_processed',
      to: email,
      data: {
        orderNumber: order.orderNumber,
        amount: order.total,
        reason: reason || 'ביטול לפי בקשה'
      },
      orderId: (order._id as mongoose.Types.ObjectId).toString()
    });
  }
  
  logger.info('✅ הזמנה בוטלה', {
    orderId,
    orderNumber: order.orderNumber
  });
  
  return { success: true };
}

/**
 * עדכון סטטוס הזמנה
 */
async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  note?: string
): Promise<{ success: boolean }> {
  
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new Error(`הזמנה ${orderId} לא נמצאה`);
  }
  
  const previousStatus = order.status;
  
  // עדכון הסטטוס
  await order.updateStatus(newStatus as IOrder['status'], note);
  await order.save();
  
  logger.info('📝 סטטוס הזמנה עודכן', {
    orderId,
    orderNumber: order.orderNumber,
    previousStatus,
    newStatus,
    note
  });
  
  // אם נשלח - עדכון מלאי ושליחת מייל
  if (newStatus === 'shipped') {
    const inventoryItems = order.items.map(item => ({
      skuId: item.sku.toString(),
      quantity: item.quantity
    }));
    
    await addInventoryJob({
      type: 'update_stock',
      orderId: (order._id as mongoose.Types.ObjectId).toString(),
      items: inventoryItems,
      reason: 'הזמנה נשלחה'
    });
    
    const email = order.guestEmail;
    if (email) {
      await addEmailJob({
        type: 'order_shipped',
        to: email,
        data: {
          orderNumber: order.orderNumber,
          trackingNumber: 'בקרוב' // TODO: add shipping field to IOrder
        },
        orderId: (order._id as mongoose.Types.ObjectId).toString()
      });
    }
  }
  
  return { success: true };
}

/**
 * סנכרון למערכת ERP חיצונית
 * (Placeholder לעתיד)
 */
async function syncToErp(orderId: string): Promise<{ success: boolean }> {
  
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new Error(`הזמנה ${orderId} לא נמצאה`);
  }
  
  // TODO: סנכרון אמיתי למערכת ERP
  logger.info('🔄 [TODO] סנכרון ל-ERP', {
    orderId,
    orderNumber: order.orderNumber
  });
  
  return { success: true };
}

// =============================================================================
// פונקציית עיבוד משימת הזמנה
// =============================================================================

async function processOrderJob(job: Job<OrderJobData>): Promise<unknown> {
  const { type, orderId, data, reason } = job.data;
  
  logger.info('🛒 מעבד משימת הזמנה', {
    jobId: job.id,
    type,
    orderId,
    attempt: job.attemptsMade + 1
  });
  
  try {
    switch (type) {
      case 'process_order':
        return await processNewOrder(orderId);
        
      case 'cancel_order':
        return await cancelOrder(orderId, reason);
        
      case 'update_status':
        return await updateOrderStatus(
          orderId, 
          data?.status as string, 
          data?.note as string
        );
        
      case 'sync_to_erp':
        return await syncToErp(orderId);
        
      default:
        throw new Error(`סוג משימה לא מוכר: ${type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    
    logger.error('❌ כישלון בעיבוד הזמנה', {
      jobId: job.id,
      type,
      orderId,
      error: errorMessage,
      attempt: job.attemptsMade + 1
    });
    
    throw error;
  }
}

// =============================================================================
// יצירת ה-Worker
// =============================================================================

let orderWorker: Worker | null = null;

export function startOrderWorker(): Worker {
  if (orderWorker) {
    logger.warn('Order Worker כבר רץ');
    return orderWorker;
  }
  
  orderWorker = new Worker<OrderJobData>(
    QUEUE_NAMES.ORDERS,
    processOrderJob,
    {
      connection: getSharedRedisConnection(),
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000
      }
    }
  );
  
  // Event handlers
  orderWorker.on('completed', (job) => {
    logger.info('✅ משימת הזמנה הושלמה', {
      jobId: job.id,
      type: job.data.type,
      orderId: job.data.orderId
    });
  });
  
  orderWorker.on('failed', (job, error) => {
    logger.error('❌ משימת הזמנה נכשלה', {
      jobId: job?.id,
      type: job?.data.type,
      orderId: job?.data.orderId,
      error: error.message
    });
  });
  
  orderWorker.on('error', (error) => {
    logger.error('❌ שגיאת Order Worker', {
      error: error.message
    });
  });
  
  logger.info('🛒 Order Worker התחיל');
  
  return orderWorker;
}

export async function stopOrderWorker(): Promise<void> {
  if (orderWorker) {
    await orderWorker.close();
    orderWorker = null;
    logger.info('🛒 Order Worker נעצר');
  }
}

export { orderWorker };
