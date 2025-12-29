/**
 * בקר הגדרות החנות - Store Settings Controller
 * 
 * @module controllers/settingsController
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import StoreSettings from '../models/StoreSettings';
import { getMaintenanceStatus, updateMaintenanceStatus } from '../services/siteSettingsService';
import { logger } from '../utils/logger';

// הגדרת הטיפוס מקומית
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role?: 'customer' | 'admin' | 'super_admin';
  };
}

// ============================================================================
// Public Endpoints - לכל המשתמשים
// ============================================================================

/**
 * קבלת הגדרות ציבוריות
 * GET /api/settings/public
 * 
 * מחזיר רק את ההגדרות שרלוונטיות ללקוחות
 */
export const getPublicSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await StoreSettings.getSettings();
    
    // מחזיר רק הגדרות ציבוריות
    res.json({
      success: true,
      data: {
        orders: {
          allowUnpaidOrders: settings.orders.allowUnpaidOrders,
          disablePayment: settings.orders.disablePayment,
          minOrderAmount: settings.orders.minOrderAmount
        },
        shipping: {
          freeShippingThreshold: settings.shipping.freeShippingThreshold,
          defaultShippingCost: settings.shipping.defaultShippingCost,
          enablePickup: settings.shipping.enablePickup
        },
        payment: {
          enableCreditCard: settings.payment.enableCreditCard,
          enablePaypal: settings.payment.enablePaypal,
          enableCash: settings.payment.enableCash
        },
        // הנחת סף - נגיש לכל הלקוחות
        thresholdDiscount: settings.thresholdDiscount ? {
          enabled: settings.thresholdDiscount.enabled,
          minimumAmount: settings.thresholdDiscount.minimumAmount,
          discountPercentage: settings.thresholdDiscount.discountPercentage
        } : {
          enabled: false,
          minimumAmount: 500,
          discountPercentage: 10
        },
        // מדיניות משלוח והחזרות - נגיש לכל הלקוחות
        shippingPolicy: settings.shippingPolicy || {
          shipping: { enabled: true, title: 'משלוח', icon: 'Truck', items: [] },
          returns: { enabled: true, title: 'החזרות', icon: 'Undo', items: [] },
          warranty: { enabled: true, title: 'אחריות', icon: 'Shield', items: [] }
        }
      }
    });
    
  } catch (error: any) {
    logger.error('SETTINGS_GET_PUBLIC_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת ההגדרות'
    });
  }
};

// ============================================================================
// Admin Endpoints - למנהלים בלבד
// ============================================================================

/**
 * קבלת כל ההגדרות (Admin)
 * GET /api/settings
 */
export const getAllSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await StoreSettings.getSettings();
    
    res.json({
      success: true,
      data: settings
    });
    
  } catch (error: any) {
    logger.error('SETTINGS_GET_ALL_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת ההגדרות'
    });
  }
};

/**
 * עדכון הגדרות (Admin)
 * PATCH /api/settings
 */
export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orders, users, shipping, payment, inventory, thresholdDiscount, shippingPolicy } = req.body;
    const adminId = req.user?.userId;
    
    const settings = await StoreSettings.updateSettings(
      { orders, users, shipping, payment, inventory, thresholdDiscount, shippingPolicy } as any,
      adminId ? new mongoose.Types.ObjectId(adminId) : undefined
    );
    
    logger.info('SETTINGS_UPDATED', { 
      adminId,
      updates: { orders, users, shipping, payment, inventory, thresholdDiscount, shippingPolicy: shippingPolicy ? 'updated' : undefined }
    });
    
    res.json({
      success: true,
      message: 'ההגדרות עודכנו בהצלחה',
      data: settings
    });
    
  } catch (error: any) {
    logger.error('SETTINGS_UPDATE_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון ההגדרות'
    });
  }
};

/**
 * עדכון הגדרת הזמנות ללא תשלום (Admin)
 * PATCH /api/settings/allow-unpaid-orders
 * 
 * Endpoint ייעודי לשינוי מהיר של הגדרה זו
 */
export const toggleAllowUnpaidOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { allow } = req.body;
    const adminId = req.user?.userId;
    
    if (typeof allow !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'ערך לא תקין - נדרש boolean'
      });
    }
    
    // קבלת הגדרות נוכחיות ועדכון שדה בודד
    const currentSettings = await StoreSettings.getSettings();
    currentSettings.orders.allowUnpaidOrders = allow;
    if (adminId) {
      currentSettings.updatedBy = new mongoose.Types.ObjectId(adminId);
    }
    await currentSettings.save();
    
    logger.info('SETTINGS_ALLOW_UNPAID_TOGGLED', { 
      adminId,
      allowUnpaidOrders: allow
    });
    
    res.json({
      success: true,
      message: allow ? 'הזמנות ללא תשלום מופעלות' : 'הזמנות ללא תשלום מבוטלות',
      data: {
        allowUnpaidOrders: currentSettings.orders.allowUnpaidOrders
      }
    });
    
  } catch (error: any) {
    logger.error('SETTINGS_TOGGLE_UNPAID_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון ההגדרה'
    });
  }
};

/**
 * כיבוי/הפעלת אפשרות תשלום (Admin)
 * PATCH /api/settings/disable-payment
 * 
 * כאשר מופעל - הלקוח יראה רק אפשרות "הזמנה ללא תשלום" (ללא אפשרות לשלם)
 */
export const toggleDisablePayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { disable } = req.body;
    const adminId = req.user?.userId;
    
    if (typeof disable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'ערך לא תקין - נדרש boolean'
      });
    }
    
    // קבלת הגדרות נוכחיות ועדכון שדה בודד
    const currentSettings = await StoreSettings.getSettings();
    currentSettings.orders.disablePayment = disable;
    if (adminId) {
      currentSettings.updatedBy = new mongoose.Types.ObjectId(adminId);
    }
    await currentSettings.save();
    
    logger.info('SETTINGS_DISABLE_PAYMENT_TOGGLED', { 
      adminId,
      disablePayment: disable
    });
    
    res.json({
      success: true,
      message: disable ? 'אפשרות התשלום כובתה - לקוחות יראו רק אפשרות הזמנה ללא תשלום' : 'אפשרות התשלום הופעלה',
      data: {
        disablePayment: currentSettings.orders.disablePayment
      }
    });
    
  } catch (error: any) {
    logger.error('SETTINGS_TOGGLE_DISABLE_PAYMENT_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון ההגדרה'
    });
  }
};

/**
 * עדכון הגדרת דרישת אישור הרשמה (Admin)
 * PATCH /api/settings/require-registration-approval
 * 
 * Endpoint ייעודי לשינוי מהיר של הגדרה זו
 */
export const toggleRequireRegistrationApproval = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { require } = req.body;
    const adminId = req.user?.userId;
    
    if (typeof require !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'ערך לא תקין - נדרש boolean'
      });
    }
    
    // קבלת הגדרות נוכחיות ועדכון שדה בודד
    const currentSettings = await StoreSettings.getSettings();
    
    // וידוא שאובייקט users קיים
    if (!currentSettings.users) {
      (currentSettings as any).users = { requireRegistrationApproval: false };
    }
    
    currentSettings.users.requireRegistrationApproval = require;
    if (adminId) {
      currentSettings.updatedBy = new mongoose.Types.ObjectId(adminId);
    }
    await currentSettings.save();
    
    logger.info('SETTINGS_REQUIRE_REGISTRATION_APPROVAL_TOGGLED', { 
      adminId,
      requireRegistrationApproval: require
    });
    
    res.json({
      success: true,
      message: require 
        ? 'אישור מנהל להרשמה הופעל - משתמשים חדשים יצטרכו אישור' 
        : 'אישור מנהל להרשמה בוטל - משתמשים יכולים להירשם באופן חופשי',
      data: {
        requireRegistrationApproval: currentSettings.users.requireRegistrationApproval
      }
    });
    
  } catch (error: any) {
    logger.error('SETTINGS_TOGGLE_REGISTRATION_APPROVAL_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון ההגדרה'
    });
  }
};

/**
 * עדכון הגדרת דרישת OTP בהתחברות (Admin)
 * PATCH /api/settings/require-login-otp
 * 
 * Endpoint ייעודי לשינוי מהיר של הגדרה זו
 */
export const toggleRequireLoginOTP = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { require } = req.body;
    const adminId = req.user?.userId;
    
    if (typeof require !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'ערך לא תקין - נדרש boolean'
      });
    }
    
    // קבלת הגדרות נוכחיות ועדכון שדה בודד
    const currentSettings = await StoreSettings.getSettings();
    
    // וידוא שאובייקט users קיים
    if (!currentSettings.users) {
      (currentSettings as any).users = { requireRegistrationApproval: false, requireLoginOTP: false };
    }
    
    currentSettings.users.requireLoginOTP = require;
    if (adminId) {
      currentSettings.updatedBy = new mongoose.Types.ObjectId(adminId);
    }
    await currentSettings.save();
    
    logger.info('SETTINGS_REQUIRE_LOGIN_OTP_TOGGLED', { 
      adminId,
      requireLoginOTP: require
    });
    
    res.json({
      success: true,
      message: require 
        ? 'אימות OTP בהתחברות הופעל - משתמשים יקבלו קוד במייל בכל התחברות' 
        : 'אימות OTP בהתחברות בוטל',
      data: {
        requireLoginOTP: currentSettings.users.requireLoginOTP
      }
    });
    
  } catch (error: any) {
    logger.error('SETTINGS_TOGGLE_LOGIN_OTP_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון ההגדרה'
    });
  }
};

export default {
  getPublicSettings,
  getAllSettings,
  updateSettings,
  toggleAllowUnpaidOrders,
  toggleDisablePayment,
  toggleRequireRegistrationApproval,
  toggleRequireLoginOTP
};

// ============================================================================
// Site Status Endpoints - מצב האתר
// ============================================================================

/**
 * קבלת סטטוס האתר (ציבורי)
 * GET /api/site-status
 * 
 * מחזיר את מצב התחזוקה של האתר - נגיש לכולם
 */
export const getSiteStatus = async (req: Request, res: Response) => {
  try {
    const status = await getMaintenanceStatus();
    
    res.json({
      success: true,
      data: {
        maintenanceMode: status.enabled,
        message: status.message,
        allowedRoles: status.allowedRoles // תפקידים מורשים לגשת במצב תחזוקה
      }
    });
    
  } catch (error: any) {
    logger.error('SITE_STATUS_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת סטטוס האתר'
    });
  }
};

/**
 * עדכון מצב תחזוקה (Admin)
 * PUT /api/settings/maintenance
 * 
 * מקבל: { enabled: boolean, message?: string, allowedRoles?: string[] }
 */
export const toggleMaintenanceMode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled, message, allowedRoles } = req.body;
    const adminId = req.user?.userId;
    
    // וידוא שנשלח לפחות שדה אחד לעדכון
    if (typeof enabled !== 'boolean' && !message && !allowedRoles) {
      return res.status(400).json({
        success: false,
        message: 'יש לספק לפחות שדה אחד לעדכון (enabled, message, allowedRoles)'
      });
    }
    
    // בניית אובייקט העדכון
    const updates: { enabled?: boolean; message?: string; allowedRoles?: ('admin' | 'super_admin' | 'customer')[] } = {};
    if (typeof enabled === 'boolean') updates.enabled = enabled;
    if (message) updates.message = message;
    if (allowedRoles && Array.isArray(allowedRoles)) {
      // וידוא שהערכים תקינים
      updates.allowedRoles = allowedRoles.filter(
        (role: string): role is 'admin' | 'super_admin' | 'customer' => 
          ['admin', 'super_admin', 'customer'].includes(role)
      );
    }
    
    const status = await updateMaintenanceStatus(updates, adminId);
    
    logger.info('MAINTENANCE_MODE_TOGGLED', { 
      adminId,
      enabled: status.enabled,
      message: status.message,
      allowedRoles: status.allowedRoles
    });
    
    res.json({
      success: true,
      message: status.enabled 
        ? 'מצב תחזוקה הופעל - רק משתמשים מורשים יוכלו לגשת לאתר' 
        : 'מצב תחזוקה כובה - האתר פתוח לכולם',
      data: {
        maintenanceMode: status.enabled,
        message: status.message,
        allowedRoles: status.allowedRoles
      }
    });
    
  } catch (error: any) {
    logger.error('MAINTENANCE_TOGGLE_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בעדכון מצב התחזוקה'
    });
  }
};

/**
 * קבלת הגדרות תחזוקה מלאות (Admin)
 * GET /api/settings/maintenance
 */
export const getMaintenanceSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await getMaintenanceStatus();
    
    res.json({
      success: true,
      data: {
        enabled: status.enabled,
        message: status.message,
        allowedRoles: status.allowedRoles
      }
    });
    
  } catch (error: any) {
    logger.error('MAINTENANCE_GET_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'שגיאה בטעינת הגדרות התחזוקה'
    });
  }
};
