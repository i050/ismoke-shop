/**
 * קונטרולר Webhooks לתשלומים
 * ============================
 * 
 * מטפל ב-webhooks מספקי תשלומים (Mock/Meshulam/Stripe).
 * כולל:
 * - אימות חתימה
 * - Idempotency (מניעת עיבוד כפול)
 * - עדכון הזמנות
 * - שליחת התראות
 * 
 * @module controllers/paymentWebhookController
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import WebhookEvent from '../models/WebhookEvent';
import Order from '../models/Order';
import * as paymentService from '../services/paymentService';
import { logger } from '../utils/logger';

// =============================================================================
// טיפוסים
// =============================================================================

interface WebhookProcessingResult {
  success: boolean;
  action: string;
  orderId?: string;
  error?: string;
}

// =============================================================================
// Handler ראשי
// =============================================================================

/**
 * טיפול ב-Webhook מספק תשלומים
 * 
 * זרימה:
 * 1. אימות חתימה
 * 2. בדיקת idempotency (האם כבר עובד?)
 * 3. עיבוד האירוע
 * 4. עדכון הזמנה
 * 5. סימון כמעובד
 */
export const handlePaymentWebhook = async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // === שלב 1: אימות חתימה ===
    const signature = 
      req.headers['x-webhook-signature'] as string ||
      req.headers['x-payment-signature'] as string ||
      req.headers['stripe-signature'] as string ||
      '';
    
    // קבלת ה-body כ-string/buffer
    const rawBody = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);
    
    const isValid = paymentService.verifyWebhook(rawBody, signature);
    
    if (!isValid) {
      logger.warn('Webhook: חתימה לא תקינה', {
        ip: req.ip,
        signature: signature.substring(0, 20) + '...'
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }
    
    // === שלב 2: פענוח האירוע ===
    const event = paymentService.parseWebhookEvent(req.body);
    
    logger.info('Webhook: אירוע התקבל', {
      type: event.type,
      paymentId: event.paymentId,
      orderId: event.orderId
    });
    
    // === שלב 3: בדיקת Idempotency ===
    const eventId = `${event.type}_${event.paymentId}_${event.timestamp.getTime()}`;
    
    const existingEvent = await WebhookEvent.findOne({ eventId });
    
    if (existingEvent) {
      if (existingEvent.status === 'processed') {
        logger.info('Webhook: אירוע כבר עובד (idempotent)', { eventId });
        return res.status(200).json({ 
          received: true, 
          status: 'already_processed' 
        });
      }
      
      if (existingEvent.status === 'processing') {
        logger.warn('Webhook: אירוע בעיבוד כרגע', { eventId });
        return res.status(200).json({ 
          received: true, 
          status: 'processing' 
        });
      }
    }
    
    // === שלב 4: יצירת רשומת webhook ===
    const webhookEvent = await WebhookEvent.create({
      eventId,
      gateway: 'mock', // ישתנה לפי ספק אמיתי
      eventType: event.type,
      payload: req.body,
      status: 'processing',
      attempts: 1,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 יום
    });
    
    // === שלב 5: עיבוד האירוע ===
    let result: WebhookProcessingResult;
    
    try {
      result = await processPaymentEvent(event);
      
      // סימון כמעובד בהצלחה
      webhookEvent.status = 'processed';
      webhookEvent.processedAt = new Date();
      await webhookEvent.save();
      
      logger.info('Webhook: עובד בהצלחה', {
        eventId,
        action: result.action,
        orderId: result.orderId,
        duration: Date.now() - startTime
      });
      
    } catch (processingError: any) {
      // סימון ככישלון
      webhookEvent.status = 'failed';
      webhookEvent.lastError = processingError.message;
      await webhookEvent.save();
      
      logger.error('Webhook: שגיאה בעיבוד', {
        eventId,
        error: processingError.message
      });
      
      // עדיין מחזירים 200 כדי שהספק לא ינסה שוב
      // (נטפל בזה ידנית או דרך queue)
      return res.status(200).json({
        received: true,
        status: 'processing_failed',
        error: processingError.message
      });
    }
    
    // === תגובה מוצלחת ===
    res.status(200).json({
      received: true,
      status: 'processed',
      action: result.action
    });
    
  } catch (error: any) {
    logger.error('Webhook: שגיאה כללית', { error: error.message });
    
    // תמיד מחזירים 200 ל-webhooks למניעת retries אינסופיים
    res.status(200).json({
      received: true,
      status: 'error',
      error: 'Internal processing error'
    });
  }
};

// =============================================================================
// עיבוד אירועים
// =============================================================================

/**
 * עיבוד אירוע תשלום
 */
async function processPaymentEvent(
  event: paymentService.PaymentWebhookEvent
): Promise<WebhookProcessingResult> {
  
  switch (event.type) {
    case 'payment.succeeded':
      return await handlePaymentSucceeded(event);
    
    case 'payment.failed':
      return await handlePaymentFailed(event);
    
    case 'payment.refunded':
      return await handlePaymentRefunded(event);
    
    case 'payment.canceled':
      return await handlePaymentCanceled(event);
    
    default:
      logger.warn('Webhook: סוג אירוע לא מוכר', { type: event.type });
      return {
        success: true,
        action: 'ignored',
        error: `Unknown event type: ${event.type}`
      };
  }
}

/**
 * טיפול בתשלום מוצלח
 */
async function handlePaymentSucceeded(
  event: paymentService.PaymentWebhookEvent
): Promise<WebhookProcessingResult> {
  
  const { orderId, paymentId, amount } = event;
  
  if (!orderId) {
    return {
      success: false,
      action: 'payment_succeeded',
      error: 'Missing orderId in event'
    };
  }
  
  // מציאת ההזמנה
  const order = await Order.findById(orderId);
  
  if (!order) {
    logger.error('Webhook: הזמנה לא נמצאה', { orderId });
    return {
      success: false,
      action: 'payment_succeeded',
      orderId,
      error: 'Order not found'
    };
  }
  
  // עדכון ההזמנה
  order.payment = {
    gateway: order.payment?.gateway || 'mock',
    ...order.payment,
    status: 'paid',
    transactionId: paymentId,
    paidAt: new Date()
  };
  
  // מעבר לסטטוס confirmed אם היה pending
  if (order.status === 'pending') {
    await order.updateStatus('confirmed', 'תשלום התקבל בהצלחה');
  }
  
  await order.save();
  
  logger.info('💳 תשלום הצליח - הזמנה עודכנה', {
    orderId,
    orderNumber: order.orderNumber,
    amount
  });
  
  // TODO: שליחת מייל אישור הזמנה (יעבור ל-queue ב-2.5)
  // await emailService.sendOrderConfirmation(order);
  
  return {
    success: true,
    action: 'payment_succeeded',
    orderId
  };
}

/**
 * טיפול בתשלום כושל
 */
async function handlePaymentFailed(
  event: paymentService.PaymentWebhookEvent
): Promise<WebhookProcessingResult> {
  
  const { orderId, paymentId } = event;
  
  if (!orderId) {
    return {
      success: false,
      action: 'payment_failed',
      error: 'Missing orderId'
    };
  }
  
  const order = await Order.findById(orderId);
  
  if (!order) {
    return {
      success: false,
      action: 'payment_failed',
      orderId,
      error: 'Order not found'
    };
  }
  
  // עדכון סטטוס תשלום
  order.payment = {
    gateway: order.payment?.gateway || 'mock',
    ...order.payment,
    status: 'failed',
    transactionId: paymentId
  };
  
  // הוספה להיסטוריה
  order.statusHistory.push({
    status: order.status,
    note: 'תשלום נכשל',
    timestamp: new Date()
  });
  
  await order.save();
  
  logger.warn('❌ תשלום נכשל', {
    orderId,
    orderNumber: order.orderNumber
  });
  
  // TODO: שליחת מייל על כישלון תשלום
  
  return {
    success: true,
    action: 'payment_failed',
    orderId
  };
}

/**
 * טיפול בהחזר כספי
 */
async function handlePaymentRefunded(
  event: paymentService.PaymentWebhookEvent
): Promise<WebhookProcessingResult> {
  
  const { orderId, paymentId, amount } = event;
  
  if (!orderId) {
    return {
      success: false,
      action: 'payment_refunded',
      error: 'Missing orderId'
    };
  }
  
  const order = await Order.findById(orderId);
  
  if (!order) {
    return {
      success: false,
      action: 'payment_refunded',
      orderId,
      error: 'Order not found'
    };
  }
  
  // בדיקה אם החזר מלא או חלקי
  const isFullRefund = amount >= order.total;
  
  order.payment = {
    gateway: order.payment?.gateway || 'mock',
    ...order.payment,
    status: isFullRefund ? 'refunded' : 'partially_refunded'
  };
  
  // עדכון סטטוס הזמנה
  if (isFullRefund) {
    await order.updateStatus('cancelled', `החזר כספי מלא: ${amount} ₪`);
  } else {
    order.statusHistory.push({
      status: order.status,
      note: `החזר כספי חלקי: ${amount} ₪`,
      timestamp: new Date()
    });
  }
  
  await order.save();
  
  logger.info('💰 החזר כספי בוצע', {
    orderId,
    orderNumber: order.orderNumber,
    amount,
    isFullRefund
  });
  
  // TODO: שליחת מייל על החזר כספי
  
  return {
    success: true,
    action: 'payment_refunded',
    orderId
  };
}

/**
 * טיפול בביטול תשלום
 */
async function handlePaymentCanceled(
  event: paymentService.PaymentWebhookEvent
): Promise<WebhookProcessingResult> {
  
  const { orderId } = event;
  
  if (!orderId) {
    return {
      success: false,
      action: 'payment_canceled',
      error: 'Missing orderId'
    };
  }
  
  const order = await Order.findById(orderId);
  
  if (!order) {
    return {
      success: false,
      action: 'payment_canceled',
      orderId,
      error: 'Order not found'
    };
  }
  
  // עדכון סטטוס תשלום
  order.payment = {
    gateway: order.payment?.gateway || 'mock',
    ...order.payment,
    status: 'cancelled'
  };
  
  // אם ההזמנה עדיין ב-pending, נבטל אותה
  if (order.status === 'pending') {
    await order.updateStatus('cancelled', 'התשלום בוטל');
    
    // TODO: החזרת מלאי (יעבור ל-queue)
  }
  
  await order.save();
  
  logger.info('🚫 תשלום בוטל', {
    orderId,
    orderNumber: order.orderNumber
  });
  
  return {
    success: true,
    action: 'payment_canceled',
    orderId
  };
}

// =============================================================================
// פונקציות עזר
// =============================================================================

/**
 * ניסיון חוזר לעיבוד webhook שנכשל
 * (לשימוש עתידי עם queue)
 */
export async function retryFailedWebhook(eventId: string): Promise<boolean> {
  const webhookEvent = await WebhookEvent.findOne({ eventId, status: 'failed' });
  
  if (!webhookEvent) {
    logger.warn('Webhook retry: אירוע לא נמצא', { eventId });
    return false;
  }
  
  try {
    const event = paymentService.parseWebhookEvent(webhookEvent.payload);
    await processPaymentEvent(event);
    
    webhookEvent.status = 'processed';
    webhookEvent.processedAt = new Date();
    webhookEvent.attempts += 1;
    await webhookEvent.save();
    
    logger.info('Webhook retry: הצליח', { eventId });
    return true;
    
  } catch (error: any) {
    webhookEvent.attempts += 1;
    webhookEvent.lastError = error.message;
    await webhookEvent.save();
    
    logger.error('Webhook retry: נכשל', { eventId, error: error.message });
    return false;
  }
}

/**
 * קבלת webhooks שנכשלו (לדשבורד admin)
 */
export async function getFailedWebhooks(limit = 50) {
  return WebhookEvent.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
