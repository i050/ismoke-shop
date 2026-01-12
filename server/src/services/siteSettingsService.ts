/**
 * שירות הגדרות אתר עם שכבת Cache
 * 
 * שכבה זו מנהלת את הגדרות האתר (כולל מצב תחזוקה) עם מטמון Redis
 * לביצועים מיטביים - במקום לקרוא מ-MongoDB בכל בקשה
 * 
 * @module services/siteSettingsService
 */

import redis from '../config/redis';
import StoreSettings, { IMaintenanceSettings } from '../models/StoreSettings';
import { logger } from '../utils/logger';

// ============================================================================
// קבועים
// ============================================================================

// מפתח ה-cache ב-Redis
const MAINTENANCE_CACHE_KEY = 'site:maintenance';

// זמן תפוגת ה-cache בשניות (60 שניות)
const CACHE_TTL_SECONDS = 60;

// ============================================================================
// Types
// ============================================================================

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  allowedRoles: string[];
}

// ============================================================================
// פונקציות עזר פנימיות
// ============================================================================

/**
 * קריאת סטטוס תחזוקה מ-Redis cache
 * @returns הסטטוס מה-cache או null אם לא קיים
 */
const getFromCache = async (): Promise<MaintenanceStatus | null> => {
  try {
    const cached = await redis.get(MAINTENANCE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    logger.warn('CACHE_READ_ERROR', { error });
    return null;
  }
};

/**
 * שמירת סטטוס תחזוקה ב-Redis cache
 * @param status - הסטטוס לשמירה
 */
const setToCache = async (status: MaintenanceStatus): Promise<void> => {
  try {
    await redis.setex(
      MAINTENANCE_CACHE_KEY,
      CACHE_TTL_SECONDS,
      JSON.stringify(status)
    );
  } catch (error) {
    logger.warn('CACHE_WRITE_ERROR', { error });
  }
};

/**
 * מחיקת ה-cache (לאחר עדכון)
 */
const invalidateCache = async (): Promise<void> => {
  try {
    await redis.del(MAINTENANCE_CACHE_KEY);
  } catch (error) {
    logger.warn('CACHE_DELETE_ERROR', { error });
  }
};

// ============================================================================
// פונקציות ציבוריות
// ============================================================================

/**
 * קבלת סטטוס מצב תחזוקה
 * קודם בודק ב-Redis, אם אין - קורא מ-MongoDB ושומר ב-cache
 * 
 * @returns Promise<MaintenanceStatus> - סטטוס מצב התחזוקה
 */
export const getMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
  // ניסיון ראשון: קריאה מ-cache
  const cached = await getFromCache();
  if (cached) {
    return cached;
  }

  // אם אין cache - קריאה מ-MongoDB
  try {
    const settings = await StoreSettings.getSettings();
    const status: MaintenanceStatus = {
      enabled: settings.maintenance?.enabled ?? false,
      message: settings.maintenance?.message ?? 'האתר במצב תחזוקה',
      allowedRoles: settings.maintenance?.allowedRoles ?? ['admin', 'super_admin', 'customer']
    };

    // שמירה ב-cache לפעמים הבאות
    await setToCache(status);

    return status;
  } catch (error) {
    logger.error('MAINTENANCE_STATUS_ERROR', { error });
    // במקרה של שגיאה - ברירת מחדל: האתר פתוח
    return {
      enabled: false,
      message: '',
      allowedRoles: ['admin', 'super_admin', 'customer']
    };
  }
};

/**
 * עדכון מצב תחזוקה
 * מעדכן גם את MongoDB וגם את ה-cache
 * 
 * @param updates - השדות לעדכון
 * @param adminId - מזהה המנהל שביצע את העדכון
 * @returns Promise<MaintenanceStatus> - הסטטוס המעודכן
 */
export const updateMaintenanceStatus = async (
  updates: Partial<IMaintenanceSettings>,
  adminId?: string
): Promise<MaintenanceStatus> => {
  try {
    // עדכון ב-MongoDB
    const mongoose = await import('mongoose');
    const settings = await StoreSettings.updateSettings(
      { maintenance: updates },
      adminId ? new mongoose.Types.ObjectId(adminId) : undefined
    );

    const status: MaintenanceStatus = {
      enabled: settings.maintenance.enabled,
      message: settings.maintenance.message,
      allowedRoles: settings.maintenance.allowedRoles
    };

    // מחיקת ה-cache הישן ושמירת החדש
    await invalidateCache();
    await setToCache(status);

    logger.info('MAINTENANCE_STATUS_UPDATED', {
      adminId,
      enabled: status.enabled,
      allowedRoles: status.allowedRoles
    });

    return status;
  } catch (error) {
    logger.error('MAINTENANCE_UPDATE_ERROR', { error });
    throw error;
  }
};

/**
 * בדיקה אם תפקיד מורשה לגשת בזמן תחזוקה
 * 
 * @param role - תפקיד המשתמש
 * @param allowedRoles - רשימת התפקידים המורשים
 * @returns boolean - האם מורשה
 */
export const isRoleAllowed = (
  role: string | undefined,
  allowedRoles: string[]
): boolean => {
  if (!role) return false;
  return allowedRoles.includes(role);
};

/**
 * עדכון הגדרת UI
 */
export const toggleShowCartTotalInHeader = async (): Promise<boolean> => {
  try {
    const settings = await StoreSettings.getSettings();
    if (!settings.ui) {
      settings.ui = { showCartTotalInHeader: false };
    }
    settings.ui.showCartTotalInHeader = !settings.ui.showCartTotalInHeader;
    await settings.save();
    return settings.ui.showCartTotalInHeader;
  } catch (error) {
    console.error('Error toggling showCartTotalInHeader:', error);
    throw error;
  }
};

// ייצוא ברירת מחדל
export default {
  getMaintenanceStatus,
  updateMaintenanceStatus,
  isRoleAllowed,
  toggleShowCartTotalInHeader
};
