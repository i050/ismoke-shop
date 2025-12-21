/**
 * Payment Worker
 * ==============
 * מעבד משימות תשלום מהתור
 * - עיבוד תשלומים חדשים
 * - אישור תשלומים
 * - החזרות כספיות
 * - טיפול ב-webhooks
 */

import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { 
  QUEUE_NAMES, 
  PaymentJobData, 
  getSharedRedisConnection,
  addEmailJob,
  addInventoryJob
} from '../index';
import * as paymentService from '../../services/paymentService';
import { Order } from '../../models/Order';
import { logger } from '../../utils/logger';

// =============================================================================
// פונקציית עיבוד משימת תשלום
// =============================================================================

async function processPaymentJob(job: Job<PaymentJobData>): Promise<unknown> {
  const { type, orderId, paymentId, amount, webhookEvent } = job.data;
  
  logger.info('💳 מעבד משימת תשלום', {
    jobId: job.id,
    type,
    orderId,
    attempt: job.attemptsMade + 1
  });
  
  try {
    switch (type) {
      case 'process_payment':
        return await handleProcessPayment(orderId, amount!);
        
      case 'confirm_payment':
        return await handleConfirmPayment(paymentId!, orderId);
        
      case 'refund_payment':
        return await handleRefundPayment(paymentId!, amount!);
        
      case 'handle_webhook':
        return await handleWebhookEvent(webhookEvent!);
        
      default:
        throw new Error(`סוג משימה לא מוכר: ${type}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    
    logger.error('❌ כישלון בעיבוד תשלום', {
      jobId: job.id,
      type,
      orderId,
      error: errorMessage,
      attempt: job.attemptsMade + 1
    });
    
    throw error; // BullMQ ינסה שוב לפי הגדרות retry
  }
}

// =============================================================================
// פונקציות טיפול לפי סוג משימה
// =============================================================================

/**
 * עיבוד תשלום חדש
 */
async function handleProcessPayment(
  orderId: string,
  amount: number
): Promise<{ success: boolean; paymentId?: string }> {
  
  // קבלת ההזמנה
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error(`הזמנה ${orderId} לא נמצאה`);
  }
  
  // יצירת תשלום
  const result = await paymentService.createPayment({
    orderId,
    amount,
    currency: 'ILS',
    customerId: order.userId?.toString(),
    metadata: {
      orderNumber: order.orderNumber,
      isGuest: String(order.isGuest)
    }
  });
  
  // עדכון ההזמנה עם פרטי התשלום
  order.payment = {
    gateway: 'mock',
    status: 'pending',
    paymentIntentId: result.paymentId,
    method: 'card'
  };
  
  await order.save();
  
  logger.info('✅ תשלום נוצר בהצלחה', {
    orderId,
    paymentId: result.paymentId
  });
  
  return {
    success: true,
    paymentId: result.paymentId
  };
}

/**
 * אישור תשלום
 */
async function handleConfirmPayment(
  paymentId: string,
  orderId: string
): Promise<{ success: boolean }> {
  
  // אישור התשלום
  const result = await paymentService.confirmPayment(paymentId);
  
  // בדיקת סטטוס לפי התוצאה
  if (result.status === 'failed') {
    throw new Error(`אישור תשלום נכשל - סטטוס: ${result.status}`);
  }
  
  // עדכון ההזמנה
  const order = await Order.findById(orderId);
  if (order) {
    order.payment = {
      ...order.payment!,
      gateway: order.payment?.gateway || 'mock',
      status: 'paid',
      transactionId: paymentId,
      paidAt: new Date()
    };
    
    if (order.status === 'pending') {
      await order.updateStatus('confirmed', 'תשלום אושר');
    }
    
    await order.save();
    
    // שליחת מייל אישור (לתור)
    const email = order.guestEmail;
    if (email) {
      await addEmailJob({
        type: 'order_confirmation',
        to: email,
        data: {
          orderNumber: order.orderNumber,
          total: order.total,
          items: order.items.length
        },
        orderId: (order._id as mongoose.Types.ObjectId).toString()
      });
    }
    
    // שמירת מלאי (כבר בוצע בעת ההזמנה, כאן רק וידוא)
    logger.info('✅ תשלום אושר והזמנה עודכנה', {
      orderId,
      orderNumber: order.orderNumber
    });
  }
  
  return { success: true };
}

/**
 * החזר כספי
 */
async function handleRefundPayment(
  paymentId: string,
  amount: number
): Promise<{ success: boolean; refundId?: string }> {
  
  const result = await paymentService.refundPayment({
    paymentId,
    amount
  });
  
  // בדיקת סטטוס ההחזר
  if (result.status === 'failed') {
    throw new Error(`החזר כספי נכשל - סטטוס: ${result.status}`);
  }
  
  logger.info('✅ החזר כספי בוצע', {
    paymentId,
    amount: result.amount,
    refundId: result.refundId
  });
  
  return {
    success: true,
    refundId: result.refundId
  };
}

/**
 * טיפול באירוע webhook
 */
async function handleWebhookEvent(
  webhookEvent: Record<string, unknown>
): Promise<{ success: boolean }> {
  
  const event = webhookEvent as unknown as paymentService.PaymentWebhookEvent;
  
  logger.info('🔔 מעבד webhook', {
    type: event.type,
    orderId: event.orderId
  });
  
  // הטיפול בפועל נעשה ב-paymentWebhookController
  // כאן רק לוגיקה נוספת אם צריך
  
  return { success: true };
}

// =============================================================================
// יצירת ה-Worker
// =============================================================================

let paymentWorker: Worker | null = null;

export function startPaymentWorker(): Worker {
  if (paymentWorker) {
    logger.warn('Payment Worker כבר רץ');
    return paymentWorker;
  }
  
  paymentWorker = new Worker<PaymentJobData>(
    QUEUE_NAMES.PAYMENTS,
    processPaymentJob,
    {
      connection: getSharedRedisConnection(),
      concurrency: 5,  // עד 5 משימות במקביל
      limiter: {
        max: 10,       // מקסימום 10 משימות
        duration: 1000 // לשנייה
      }
    }
  );
  
  // Event handlers
  paymentWorker.on('completed', (job) => {
    logger.info('✅ משימת תשלום הושלמה', {
      jobId: job.id,
      type: job.data.type,
      orderId: job.data.orderId
    });
  });
  
  paymentWorker.on('failed', (job, error) => {
    logger.error('❌ משימת תשלום נכשלה', {
      jobId: job?.id,
      type: job?.data.type,
      orderId: job?.data.orderId,
      error: error.message,
      attempts: job?.attemptsMade
    });
  });
  
  paymentWorker.on('error', (error) => {
    logger.error('❌ שגיאת Payment Worker', {
      error: error.message
    });
  });
  
  logger.info('💳 Payment Worker התחיל');
  
  return paymentWorker;
}

export async function stopPaymentWorker(): Promise<void> {
  if (paymentWorker) {
    await paymentWorker.close();
    paymentWorker = null;
    logger.info('💳 Payment Worker נעצר');
  }
}

export { paymentWorker };
