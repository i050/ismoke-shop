/**
 * מערכת תורים (Queue System) עם BullMQ
 * ===============================================
 * מטפל במשימות אסינכרוניות כמו:
 * - עיבוד תשלומים
 * - שליחת מיילים
 * - עדכון מלאי
 * - ניקוי נתונים
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// =============================================================================
// הגדרת חיבור Redis לתורים
// =============================================================================

/**
 * בניית URL לחיבור Redis
 * תומך גם ב-REDIS_URL וגם בהגדרות נפרדות
 */
function buildRedisUrl(): string {
  // אם יש REDIS_URL מוכן - השתמש בו
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  
  // בנה URL מהגדרות נפרדות
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';
  const username = process.env.REDIS_USERNAME || 'default';
  const password = process.env.REDIS_PASSWORD;
  
  if (password) {
    return `redis://${username}:${password}@${host}:${port}`;
  }
  
  return `redis://${host}:${port}`;
}

// יצירת חיבור Redis ייעודי לתורים
const getRedisConnection = () => {
  const redisUrl = buildRedisUrl();
  
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null, // נדרש ל-BullMQ
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error('Redis Queue: נכשל לאחר 10 ניסיונות');
        return null;
      }
      return Math.min(times * 100, 3000);
    }
  });
};

// חיבור Redis משותף לכל התורים
let sharedConnection: Redis | null = null;

export function getSharedRedisConnection(): Redis {
  if (!sharedConnection) {
    sharedConnection = getRedisConnection();
    
    sharedConnection.on('connect', () => {
      logger.info('📦 Queue Redis: מתחבר...');
    });
    
    sharedConnection.on('ready', () => {
      logger.info('✅ Queue Redis: מוכן');
    });
    
    sharedConnection.on('error', (err) => {
      logger.error('❌ Queue Redis שגיאה:', { error: err.message });
    });
  }
  
  return sharedConnection;
}

// =============================================================================
// הגדרות תורים
// =============================================================================

// שמות התורים
export const QUEUE_NAMES = {
  PAYMENTS: 'payments',
  EMAILS: 'emails',
  INVENTORY: 'inventory',
  ORDERS: 'orders',
  CLEANUP: 'cleanup'
} as const;

// סוגי משימות
export type PaymentJobType = 
  | 'process_payment'
  | 'confirm_payment'
  | 'refund_payment'
  | 'handle_webhook';

export type EmailJobType =
  | 'order_confirmation'
  | 'order_shipped'
  | 'payment_failed'
  | 'refund_processed'
  | 'password_reset'
  | 'welcome'
  | 'stock_alert' // התראת חזרה למלאי
  | 'admin_new_order'; // התראת הזמנה חדשה למנהל

export type InventoryJobType =
  | 'reserve_stock'
  | 'release_stock'
  | 'update_stock'
  | 'low_stock_alert';

export type OrderJobType =
  | 'process_order'
  | 'cancel_order'
  | 'update_status'
  | 'sync_to_erp';

// =============================================================================
// ממשקי נתוני משימות
// =============================================================================

// נתוני משימת תשלום
export interface PaymentJobData {
  type: PaymentJobType;
  orderId: string;
  paymentId?: string;
  amount?: number;
  gateway?: string;
  metadata?: Record<string, unknown>;
  webhookEvent?: Record<string, unknown>;
}

// נתוני משימת מייל
export interface EmailJobData {
  type: EmailJobType;
  to: string;
  subject?: string;
  templateId?: string;
  data: Record<string, unknown>;
  orderId?: string;
  userId?: string;
}

// נתוני משימת מלאי
export interface InventoryJobData {
  type: InventoryJobType;
  orderId?: string;
  items: Array<{
    skuId: string;
    quantity: number;
  }>;
  reason?: string;
}

// נתוני משימת הזמנה
export interface OrderJobData {
  type: OrderJobType;
  orderId: string;
  data?: Record<string, unknown>;
  reason?: string;
}

// =============================================================================
// יצירת תורים (Lazy initialization)
// =============================================================================

// משתנים לתורים - נוצרים רק כשצריך
let _paymentQueue: Queue<PaymentJobData> | null = null;
let _emailQueue: Queue<EmailJobData> | null = null;
let _inventoryQueue: Queue<InventoryJobData> | null = null;
let _orderQueue: Queue<OrderJobData> | null = null;

// הגדרות ברירת מחדל לתורים
function getDefaultQueueOptions() {
  return {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,  // מספר ניסיונות
      backoff: {
        type: 'exponential' as const,
        delay: 1000  // התחל מ-1 שניה
      },
      removeOnComplete: {
        count: 100,  // שמור 100 משימות אחרונות
        age: 24 * 3600  // או 24 שעות
      },
      removeOnFail: {
        count: 500  // שמור 500 כישלונות אחרונים לדיבוג
      }
    }
  };
}

// תור תשלומים - עדיפות גבוהה
export function getPaymentQueue(): Queue<PaymentJobData> {
  if (!_paymentQueue) {
    const opts = getDefaultQueueOptions();
    _paymentQueue = new Queue<PaymentJobData>(QUEUE_NAMES.PAYMENTS, {
      ...opts,
      defaultJobOptions: {
        ...opts.defaultJobOptions,
        priority: 1,  // עדיפות גבוהה
        attempts: 5   // יותר ניסיונות לתשלומים
      }
    });
  }
  return _paymentQueue;
}

// תור מיילים
export function getEmailQueue(): Queue<EmailJobData> {
  if (!_emailQueue) {
    const opts = getDefaultQueueOptions();
    _emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAILS, {
      ...opts,
      defaultJobOptions: {
        ...opts.defaultJobOptions,
        priority: 3,
        attempts: 3
      }
    });
  }
  return _emailQueue;
}

// תור מלאי - עדיפות גבוהה
export function getInventoryQueue(): Queue<InventoryJobData> {
  if (!_inventoryQueue) {
    const opts = getDefaultQueueOptions();
    _inventoryQueue = new Queue<InventoryJobData>(QUEUE_NAMES.INVENTORY, {
      ...opts,
      defaultJobOptions: {
        ...opts.defaultJobOptions,
        priority: 2,  // עדיפות גבוהה - מלאי קריטי
        attempts: 5
      }
    });
  }
  return _inventoryQueue;
}

// תור הזמנות
export function getOrderQueue(): Queue<OrderJobData> {
  if (!_orderQueue) {
    const opts = getDefaultQueueOptions();
    _orderQueue = new Queue<OrderJobData>(QUEUE_NAMES.ORDERS, {
      ...opts,
      defaultJobOptions: {
        ...opts.defaultJobOptions,
        priority: 2,
        attempts: 3
      }
    });
  }
  return _orderQueue;
}

// Aliases לתאימות לאחור
export { getPaymentQueue as paymentQueue };
export { getEmailQueue as emailQueue };
export { getInventoryQueue as inventoryQueue };
export { getOrderQueue as orderQueue };

// =============================================================================
// פונקציות עזר להוספת משימות
// =============================================================================

/**
 * הוספת משימת תשלום
 */
export async function addPaymentJob(
  data: PaymentJobData,
  options?: { delay?: number; priority?: number }
): Promise<Job<PaymentJobData>> {
  const queue = getPaymentQueue();
  const job = await queue.add(data.type, data, {
    ...options,
    jobId: `payment-${data.orderId}-${data.type}-${Date.now()}`
  });
  
  logger.info('📦 משימת תשלום נוספה לתור', {
    jobId: job.id,
    type: data.type,
    orderId: data.orderId
  });
  
  return job;
}

/**
 * הוספת משימת מייל
 */
export async function addEmailJob(
  data: EmailJobData,
  options?: { delay?: number }
): Promise<Job<EmailJobData>> {
  const queue = getEmailQueue();
  const job = await queue.add(data.type, data, {
    ...options,
    jobId: `email-${data.type}-${data.to}-${Date.now()}`
  });
  
  logger.info('📧 משימת מייל נוספה לתור', {
    jobId: job.id,
    type: data.type,
    to: data.to
  });
  
  return job;
}

/**
 * הוספת משימת מלאי
 */
export async function addInventoryJob(
  data: InventoryJobData,
  options?: { priority?: number }
): Promise<Job<InventoryJobData>> {
  const queue = getInventoryQueue();
  const job = await queue.add(data.type, data, {
    ...options,
    jobId: `inventory-${data.type}-${data.orderId || 'bulk'}-${Date.now()}`
  });
  
  logger.info('📦 משימת מלאי נוספה לתור', {
    jobId: job.id,
    type: data.type,
    orderId: data.orderId
  });
  
  return job;
}

/**
 * הוספת משימת הזמנה
 */
export async function addOrderJob(
  data: OrderJobData,
  options?: { delay?: number }
): Promise<Job<OrderJobData>> {
  const queue = getOrderQueue();
  const job = await queue.add(data.type, data, {
    ...options,
    jobId: `order-${data.orderId}-${data.type}-${Date.now()}`
  });
  
  logger.info('🛒 משימת הזמנה נוספה לתור', {
    jobId: job.id,
    type: data.type,
    orderId: data.orderId
  });
  
  return job;
}

// =============================================================================
// סטטיסטיקות תורים
// =============================================================================

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * קבלת סטטיסטיקות כל התורים
 */
export async function getQueuesStats(): Promise<QueueStats[]> {
  // קבל את התורים רק אם הם קיימים
  const queues = [
    _paymentQueue,
    _emailQueue, 
    _inventoryQueue, 
    _orderQueue
  ].filter((q): q is Queue => q !== null);
  
  if (queues.length === 0) {
    return [];
  }
  
  const stats = await Promise.all(
    queues.map(async (queue) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount()
      ]);
      
      return {
        name: queue.name,
        waiting,
        active,
        completed,
        failed,
        delayed
      };
    })
  );
  
  return stats;
}

/**
 * ניקוי משימות שהושלמו/נכשלו
 */
export async function cleanQueues(
  grace: number = 24 * 3600 * 1000 // 24 שעות
): Promise<void> {
  const queues = [
    _paymentQueue,
    _emailQueue, 
    _inventoryQueue, 
    _orderQueue
  ].filter((q): q is Queue => q !== null);
  
  for (const queue of queues) {
    await queue.clean(grace, 1000, 'completed');
    await queue.clean(grace * 7, 1000, 'failed'); // שמור כישלונות שבוע
  }
  
  logger.info('🧹 תורים נוקו');
}

// =============================================================================
// סגירת תורים
// =============================================================================

export async function closeQueues(): Promise<void> {
  logger.info('🔌 סוגר תורים...');
  
  const closePromises: Promise<void>[] = [];
  
  if (_paymentQueue) closePromises.push(_paymentQueue.close());
  if (_emailQueue) closePromises.push(_emailQueue.close());
  if (_inventoryQueue) closePromises.push(_inventoryQueue.close());
  if (_orderQueue) closePromises.push(_orderQueue.close());
  
  await Promise.all(closePromises);
  
  // איפוס ה-instances
  _paymentQueue = null;
  _emailQueue = null;
  _inventoryQueue = null;
  _orderQueue = null;
  
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
  }
  
  logger.info('✅ תורים נסגרו');
}

// =============================================================================
// ייצוא
// =============================================================================

export default {
  // תורים (getters)
  getPaymentQueue,
  getEmailQueue,
  getInventoryQueue,
  getOrderQueue,
  
  // פונקציות
  addPaymentJob,
  addEmailJob,
  addInventoryJob,
  addOrderJob,
  getQueuesStats,
  cleanQueues,
  closeQueues,
  getSharedRedisConnection,
  
  // קבועים
  QUEUE_NAMES
};
