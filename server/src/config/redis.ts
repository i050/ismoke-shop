/**
 * הגדרת חיבור Redis
 * משמש עבור Rate Limiting, Sessions, ו-Queue System (BullMQ)
 * 
 * @module config/redis
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';

// =============================================================================
// הגדרות חיבור Redis Cloud
// =============================================================================

/**
 * יצירת instance של Redis client
 * תומך ב-Redis Cloud עם אימות
 */
export const redis = new Redis({
  // פרטי חיבור - מקבלים מ-environment variables
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  
  // אימות - נדרש ל-Redis Cloud
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD || undefined,
  
  // הגדרות לתור BullMQ - חובה!
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  
  // הגדרות TLS - נדרש לחלק מספקי Redis Cloud
  // tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  
  // אסטרטגיית ניסיון חוזר בעת ניתוק
  retryStrategy: (times: number) => {
    // מקסימום 10 ניסיונות
    if (times > 10) {
      logger.error('❌ Redis: נכשלו 10 ניסיונות חיבור, מפסיק לנסות');
      return null; // מפסיק לנסות
    }
    
    // חישוב זמן המתנה עם exponential backoff
    // מתחיל מ-100ms, מקסימום 5 שניות
    const delay = Math.min(times * 100, 5000);
    logger.warn(`⏳ Redis: ניסיון חיבור ${times}, ממתין ${delay}ms`);
    return delay;
  },
  
  // הגדרות נוספות
  lazyConnect: false, // מתחבר מיד
  connectTimeout: 15000, // timeout של 15 שניות לחיבור (יותר לענן)
});

// =============================================================================
// Event Listeners לניטור חיבור
// =============================================================================

/**
 * חיבור הצליח
 */
redis.on('connect', () => {
  logger.info('✅ Redis: מחובר בהצלחה');
});

/**
 * מוכן לפעולה (אחרי ready check)
 */
redis.on('ready', () => {
  logger.info('🚀 Redis: מוכן לקבל פקודות');
});

/**
 * שגיאת חיבור
 */
redis.on('error', (err: Error) => {
  logger.error('❌ Redis: שגיאת חיבור', { 
    error: err.message,
    stack: err.stack 
  });
});

/**
 * החיבור נסגר
 */
redis.on('close', () => {
  logger.warn('⚠️ Redis: החיבור נסגר');
});

/**
 * מנסה להתחבר מחדש
 */
redis.on('reconnecting', () => {
  logger.info('🔄 Redis: מנסה להתחבר מחדש...');
});

/**
 * הסתיים החיבור לצמיתות
 */
redis.on('end', () => {
  logger.warn('🔌 Redis: החיבור הסתיים');
});

// =============================================================================
// פונקציות עזר
// =============================================================================

/**
 * בדיקת בריאות Redis
 * מחזיר true אם Redis מגיב ל-PING
 */
export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error('❌ Redis health check נכשל', { error });
    return false;
  }
};

/**
 * בדיקה מפורטת של Redis
 * מחזיר אובייקט עם מידע מפורט על מצב החיבור
 */
export const getRedisInfo = async (): Promise<{
  connected: boolean;
  host: string;
  port: number;
  uptime?: number;
  usedMemory?: string;
  connectedClients?: number;
}> => {
  const baseInfo = {
    connected: false,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };
  
  try {
    // בדיקת חיבור
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      return baseInfo;
    }
    
    // קבלת מידע מפורט מ-Redis
    const info = await redis.info();
    
    // פרסור המידע
    const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const clientsMatch = info.match(/connected_clients:(\d+)/);
    
    return {
      connected: true,
      host: baseInfo.host,
      port: baseInfo.port,
      uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : undefined,
      usedMemory: memoryMatch ? memoryMatch[1] : undefined,
      connectedClients: clientsMatch ? parseInt(clientsMatch[1]) : undefined,
    };
  } catch (error) {
    logger.error('❌ שגיאה בקבלת מידע Redis', { error });
    return baseInfo;
  }
};

/**
 * סגירת חיבור Redis בצורה נקייה
 * חשוב להשתמש בזה ב-graceful shutdown
 */
export const closeRedisConnection = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info('✅ Redis: החיבור נסגר בהצלחה');
  } catch (error) {
    logger.error('❌ Redis: שגיאה בסגירת החיבור', { error });
    // כפיית סגירה
    redis.disconnect();
  }
};

// ייצוא ברירת מחדל
export default redis;
