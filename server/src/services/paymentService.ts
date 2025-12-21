/**
 * שירות תשלומים - Mock
 * ======================
 * 
 * שירות תשלומים גנרי עם מימוש Mock לפיתוח.
 * מאפשר פיתוח מלא של מערכת ההזמנות ללא תלות בספק תשלומים.
 * 
 * כשתהיה מוכן - החלף למימוש Meshulam/Stripe/אחר.
 * 
 * @module services/paymentService
 */

import { logger } from '../utils/logger';

// === הגדרות ===

/** האם להשתמש ב-Mock (true) או ספק אמיתי (false) */
const USE_MOCK = process.env.PAYMENT_MOCK_MODE !== 'false';

/** סיכוי לכישלון בתשלום ב-Mock (0-1) - לבדיקת error handling */
const MOCK_FAILURE_RATE = parseFloat(process.env.MOCK_PAYMENT_FAILURE_RATE || '0');

/** עיכוב מלאכותי ב-ms לסימולציה של קריאת רשת */
const MOCK_DELAY_MS = parseInt(process.env.MOCK_PAYMENT_DELAY_MS || '500', 10);

// === טיפוסים ===

/**
 * סטטוס תשלום
 */
export type PaymentStatus = 
  | 'pending'        // ממתין לתשלום
  | 'processing'     // בעיבוד
  | 'succeeded'      // הצליח
  | 'failed'         // נכשל
  | 'canceled'       // בוטל
  | 'refunded'       // הוחזר
  | 'partially_refunded'; // הוחזר חלקית

/**
 * פרטים ליצירת תשלום
 */
export interface CreatePaymentParams {
  /** סכום לתשלום (בש"ח) */
  amount: number;
  /** מטבע (ברירת מחדל: ILS) */
  currency?: string;
  /** מזהה הזמנה במערכת */
  orderId: string;
  /** אימייל הלקוח */
  customerEmail?: string;
  /** מזהה לקוח במערכת */
  customerId?: string;
  /** תיאור התשלום */
  description?: string;
  /** מטא-דאטא נוסף */
  metadata?: Record<string, string>;
  /** כתובת חזרה להצלחה */
  successUrl?: string;
  /** כתובת חזרה לביטול */
  cancelUrl?: string;
}

/**
 * תוצאת יצירת תשלום
 */
export interface PaymentResult {
  /** מזהה התשלום (מהספק או mock) */
  paymentId: string;
  /** URL להפניית הלקוח (אם רלוונטי) */
  redirectUrl?: string;
  /** טוקן לשימוש בצד לקוח */
  clientToken?: string;
  /** סטטוס נוכחי */
  status: PaymentStatus;
  /** סכום */
  amount: number;
  /** מטבע */
  currency: string;
  /** האם זה mock */
  isMock: boolean;
}

/**
 * פרטים להחזר
 */
export interface RefundParams {
  /** מזהה התשלום */
  paymentId: string;
  /** סכום להחזר (אם לא מסופק - מלא) */
  amount?: number;
  /** סיבת ההחזר */
  reason?: string;
}

/**
 * תוצאת החזר
 */
export interface RefundResult {
  /** מזהה ההחזר */
  refundId: string;
  /** מזהה התשלום */
  paymentId: string;
  /** סכום שהוחזר */
  amount: number;
  /** סטטוס */
  status: 'pending' | 'succeeded' | 'failed';
  /** האם זה mock */
  isMock: boolean;
}

/**
 * סטטוס תשלום מפורט
 */
export interface PaymentStatusResult {
  /** מזהה התשלום */
  paymentId: string;
  /** סטטוס */
  status: PaymentStatus;
  /** סכום */
  amount: number;
  /** סכום שנתפס */
  amountCaptured: number;
  /** סכום שהוחזר */
  amountRefunded: number;
  /** מטבע */
  currency: string;
  /** תאריך יצירה */
  createdAt: Date;
  /** תאריך עדכון אחרון */
  updatedAt: Date;
  /** מטא-דאטא */
  metadata: Record<string, string>;
  /** האם זה mock */
  isMock: boolean;
}

/**
 * אירוע Webhook מספק תשלומים
 */
export interface PaymentWebhookEvent {
  /** סוג האירוע */
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded' | 'payment.canceled';
  /** מזהה התשלום */
  paymentId: string;
  /** מזהה ההזמנה */
  orderId: string;
  /** סכום */
  amount: number;
  /** מטבע */
  currency: string;
  /** חותמת זמן */
  timestamp: Date;
  /** מטא-דאטא נוסף */
  metadata?: Record<string, string>;
}

// === Mock Storage (לפיתוח בלבד) ===
const mockPayments = new Map<string, {
  amount: number;
  currency: string;
  status: PaymentStatus;
  orderId: string;
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  refundedAmount: number;
}>();

// === פונקציות עזר ===

/**
 * יצירת מזהה mock ייחודי
 */
function generateMockId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_mock_${timestamp}_${random}`;
}

/**
 * סימולציית עיכוב רשת
 */
async function simulateNetworkDelay(): Promise<void> {
  if (MOCK_DELAY_MS > 0) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS));
  }
}

/**
 * סימולציית כישלון אקראי
 */
function shouldFail(): boolean {
  return Math.random() < MOCK_FAILURE_RATE;
}

// === פונקציות ראשיות ===

/**
 * יצירת תשלום חדש
 * 
 * @param params - פרטי התשלום
 * @returns תוצאת התשלום
 */
export async function createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
  const {
    amount,
    currency = 'ILS',
    orderId,
    customerEmail,
    customerId,
    description,
    metadata = {},
    successUrl,
    cancelUrl,
  } = params;

  logger.info('יוצר תשלום', { orderId, amount, currency, useMock: USE_MOCK });

  if (amount <= 0) {
    throw new Error('סכום התשלום חייב להיות חיובי');
  }

  if (USE_MOCK) {
    // === Mock Implementation ===
    await simulateNetworkDelay();

    if (shouldFail()) {
      throw new Error('Mock: סימולציית כישלון תשלום');
    }

    const paymentId = generateMockId('pay');
    
    // שמירה ב-mock storage
    mockPayments.set(paymentId, {
      amount,
      currency: currency.toUpperCase(),
      status: 'pending',
      orderId,
      metadata: {
        customerId: customerId || '',
        customerEmail: customerEmail || '',
        description: description || '',
        ...metadata,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      refundedAmount: 0,
    });

    logger.info('Mock: תשלום נוצר', { paymentId, orderId });

    return {
      paymentId,
      redirectUrl: successUrl ? `${successUrl}?payment_id=${paymentId}&mock=true` : undefined,
      clientToken: `mock_token_${paymentId}`,
      status: 'pending',
      amount,
      currency: currency.toUpperCase(),
      isMock: true,
    };
  }

  // === Real Implementation (Meshulam/Other) ===
  // TODO: החלף למימוש אמיתי כשיהיה מוכן
  throw new Error('ספק תשלומים אמיתי לא מוגדר. הפעל PAYMENT_MOCK_MODE=true לפיתוח');
}

/**
 * אישור תשלום (סימולציה של הלקוח שמשלם)
 * ב-Mock - משמש לבדיקות. במציאות - ה-webhook יעדכן.
 * 
 * @param paymentId - מזהה התשלום
 * @returns סטטוס מעודכן
 */
export async function confirmPayment(paymentId: string): Promise<PaymentStatusResult> {
  logger.info('מאשר תשלום', { paymentId });

  if (USE_MOCK) {
    await simulateNetworkDelay();

    const payment = mockPayments.get(paymentId);
    if (!payment) {
      throw new Error(`תשלום ${paymentId} לא נמצא`);
    }

    if (payment.status !== 'pending') {
      throw new Error(`לא ניתן לאשר תשלום בסטטוס ${payment.status}`);
    }

    // סימולציית כישלון
    if (shouldFail()) {
      payment.status = 'failed';
      payment.updatedAt = new Date();
      logger.warn('Mock: תשלום נכשל', { paymentId });
    } else {
      payment.status = 'succeeded';
      payment.updatedAt = new Date();
      logger.info('Mock: תשלום אושר', { paymentId });
    }

    return {
      paymentId,
      status: payment.status,
      amount: payment.amount,
      amountCaptured: payment.status === 'succeeded' ? payment.amount : 0,
      amountRefunded: payment.refundedAmount,
      currency: payment.currency,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      metadata: payment.metadata,
      isMock: true,
    };
  }

  throw new Error('ספק תשלומים אמיתי לא מוגדר');
}

/**
 * קבלת סטטוס תשלום
 * 
 * @param paymentId - מזהה התשלום
 * @returns סטטוס מפורט
 */
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
  logger.debug('מקבל סטטוס תשלום', { paymentId });

  if (USE_MOCK) {
    await simulateNetworkDelay();

    const payment = mockPayments.get(paymentId);
    if (!payment) {
      throw new Error(`תשלום ${paymentId} לא נמצא`);
    }

    return {
      paymentId,
      status: payment.status,
      amount: payment.amount,
      amountCaptured: payment.status === 'succeeded' ? payment.amount : 0,
      amountRefunded: payment.refundedAmount,
      currency: payment.currency,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      metadata: payment.metadata,
      isMock: true,
    };
  }

  throw new Error('ספק תשלומים אמיתי לא מוגדר');
}

/**
 * ביטול תשלום (לפני השלמה)
 * 
 * @param paymentId - מזהה התשלום
 * @returns סטטוס מעודכן
 */
export async function cancelPayment(paymentId: string): Promise<PaymentStatusResult> {
  logger.info('מבטל תשלום', { paymentId });

  if (USE_MOCK) {
    await simulateNetworkDelay();

    const payment = mockPayments.get(paymentId);
    if (!payment) {
      throw new Error(`תשלום ${paymentId} לא נמצא`);
    }

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      throw new Error(`לא ניתן לבטל תשלום בסטטוס ${payment.status}`);
    }

    payment.status = 'canceled';
    payment.updatedAt = new Date();

    logger.info('Mock: תשלום בוטל', { paymentId });

    return {
      paymentId,
      status: payment.status,
      amount: payment.amount,
      amountCaptured: 0,
      amountRefunded: 0,
      currency: payment.currency,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      metadata: payment.metadata,
      isMock: true,
    };
  }

  throw new Error('ספק תשלומים אמיתי לא מוגדר');
}

/**
 * ביצוע החזר
 * 
 * @param params - פרטי ההחזר
 * @returns תוצאת ההחזר
 */
export async function refundPayment(params: RefundParams): Promise<RefundResult> {
  const { paymentId, amount, reason } = params;

  logger.info('מבצע החזר', { paymentId, amount, reason });

  if (USE_MOCK) {
    await simulateNetworkDelay();

    const payment = mockPayments.get(paymentId);
    if (!payment) {
      throw new Error(`תשלום ${paymentId} לא נמצא`);
    }

    if (payment.status !== 'succeeded' && payment.status !== 'partially_refunded') {
      throw new Error(`לא ניתן להחזיר תשלום בסטטוס ${payment.status}`);
    }

    const refundAmount = amount || (payment.amount - payment.refundedAmount);
    const availableForRefund = payment.amount - payment.refundedAmount;

    if (refundAmount > availableForRefund) {
      throw new Error(`סכום ההחזר (${refundAmount}) גדול מהזמין להחזר (${availableForRefund})`);
    }

    const refundId = generateMockId('ref');
    payment.refundedAmount += refundAmount;
    payment.status = payment.refundedAmount >= payment.amount ? 'refunded' : 'partially_refunded';
    payment.updatedAt = new Date();

    logger.info('Mock: החזר בוצע', { refundId, paymentId, refundAmount });

    return {
      refundId,
      paymentId,
      amount: refundAmount,
      status: 'succeeded',
      isMock: true,
    };
  }

  throw new Error('ספק תשלומים אמיתי לא מוגדר');
}

/**
 * אימות Webhook (לספק אמיתי)
 * ב-Mock - מחזיר תמיד true
 * 
 * @param payload - גוף הבקשה
 * @param signature - חתימה מה-header
 * @returns האם תקין
 */
export function verifyWebhook(
  payload: string | Buffer,
  signature: string
): boolean {
  if (USE_MOCK) {
    // ב-mock, כל webhook "תקין"
    logger.debug('Mock: webhook אומת', { signature: signature.substring(0, 20) + '...' });
    return true;
  }

  // TODO: מימוש לספק אמיתי
  throw new Error('ספק תשלומים אמיתי לא מוגדר');
}

/**
 * פענוח אירוע Webhook
 * 
 * @param payload - גוף הבקשה
 * @returns אירוע מפוענח
 */
export function parseWebhookEvent(payload: string | object): PaymentWebhookEvent {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

  // פורמט mock/גנרי
  return {
    type: data.type || 'payment.succeeded',
    paymentId: data.paymentId || data.payment_id,
    orderId: data.orderId || data.order_id || data.metadata?.orderId,
    amount: data.amount,
    currency: data.currency || 'ILS',
    timestamp: new Date(data.timestamp || Date.now()),
    metadata: data.metadata,
  };
}

/**
 * סימולציית Webhook (לבדיקות Mock בלבד)
 * 
 * @param paymentId - מזהה התשלום
 * @param eventType - סוג האירוע
 * @returns אירוע מדומה
 */
export function simulateWebhook(
  paymentId: string,
  eventType: PaymentWebhookEvent['type'] = 'payment.succeeded'
): PaymentWebhookEvent {
  if (!USE_MOCK) {
    throw new Error('simulateWebhook זמין רק במצב Mock');
  }

  const payment = mockPayments.get(paymentId);
  if (!payment) {
    throw new Error(`תשלום ${paymentId} לא נמצא`);
  }

  // עדכון סטטוס בהתאם לאירוע
  switch (eventType) {
    case 'payment.succeeded':
      payment.status = 'succeeded';
      break;
    case 'payment.failed':
      payment.status = 'failed';
      break;
    case 'payment.canceled':
      payment.status = 'canceled';
      break;
    case 'payment.refunded':
      payment.status = 'refunded';
      payment.refundedAmount = payment.amount;
      break;
  }
  payment.updatedAt = new Date();

  logger.info('Mock: סימולציית webhook', { paymentId, eventType });

  return {
    type: eventType,
    paymentId,
    orderId: payment.orderId,
    amount: payment.amount,
    currency: payment.currency,
    timestamp: new Date(),
    metadata: payment.metadata,
  };
}

/**
 * בדיקת תקינות שירות התשלומים
 */
export async function checkPaymentHealth(): Promise<{
  connected: boolean;
  provider: string;
  mode: 'mock' | 'live';
  error?: string;
}> {
  if (USE_MOCK) {
    return {
      connected: true,
      provider: 'Mock Payment Provider',
      mode: 'mock',
    };
  }

  // TODO: בדיקת חיבור לספק אמיתי
  return {
    connected: false,
    provider: 'Unknown',
    mode: 'live',
    error: 'ספק תשלומים לא מוגדר',
  };
}

/**
 * ניקוי Mock Storage (לבדיקות)
 */
export function clearMockPayments(): void {
  if (USE_MOCK) {
    mockPayments.clear();
    logger.debug('Mock: כל התשלומים נוקו');
  }
}

/**
 * קבלת כל התשלומים ב-Mock (לבדיקות)
 */
export function getAllMockPayments(): Map<string, any> {
  return new Map(mockPayments);
}

// === ייצוא ברירת מחדל ===
export default {
  createPayment,
  confirmPayment,
  getPaymentStatus,
  cancelPayment,
  refundPayment,
  verifyWebhook,
  parseWebhookEvent,
  simulateWebhook,
  checkPaymentHealth,
  clearMockPayments,
  getAllMockPayments,
};
