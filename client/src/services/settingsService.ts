/**
 * שירות הגדרות - Settings Service
 * 
 * @module services/settingsService
 */

import { API_BASE_URL } from '../config/api';

// ============================================================================
// Types
// ============================================================================

export interface PublicSettings {
  orders: {
    allowUnpaidOrders: boolean;
    disablePayment: boolean;
    minOrderAmount: number;
  };
  shipping: {
    freeShippingThreshold: number;
    defaultShippingCost: number;
    enablePickup: boolean;
  };
  payment: {
    enableCreditCard: boolean;
    enablePaypal: boolean;
    enableCash: boolean;
  };
  // הנחת סף - הנחה אוטומטית מעל סכום מסוים
  thresholdDiscount?: {
    enabled: boolean;
    minimumAmount: number;
    discountPercentage: number;
  };
  // מדיניות משלוח והחזרות
  shippingPolicy?: ShippingPolicy;
}

/**
 * חלק במדיניות משלוח/החזרות/אחריות
 */
export interface ShippingPolicySection {
  enabled: boolean;    // האם להציג חלק זה
  title: string;       // כותרת (משלוח/החזרות/אחריות)
  icon: string;        // שם האייקון
  items: string[];     // רשימת הפריטים (טקסטים)
}

/**
 * מדיניות משלוח והחזרות - מוצגת בטאב בעמוד המוצר
 */
export interface ShippingPolicy {
  shipping: ShippingPolicySection;
  returns: ShippingPolicySection;
  warranty: ShippingPolicySection;
}

export interface AllSettings {
  orders: {
    allowUnpaidOrders: boolean;
    disablePayment: boolean;
    requirePhoneVerification: boolean;
    minOrderAmount: number;
    maxItemsPerOrder: number;
  };
  users?: {
    requireRegistrationApproval: boolean;
    requireLoginOTP: boolean;
  };
  shipping: {
    freeShippingThreshold: number;
    defaultShippingCost: number;
    enablePickup: boolean;
  };
  payment: {
    enableCreditCard: boolean;
    enablePaypal: boolean;
    enableBankTransfer: boolean;
    enableCash: boolean;
  };
  inventory?: {
    defaultLowStockThreshold: number;
  };
  // הנחת סף - הנחה אוטומטית מעל סכום מסוים
  thresholdDiscount?: {
    enabled: boolean;
    minimumAmount: number;
    discountPercentage: number;
  };
  maintenance?: {
    enabled: boolean;
    message: string;
    allowedRoles: string[];
  };
  // מדיניות משלוח והחזרות
  shippingPolicy?: ShippingPolicy;
  updatedAt?: string;
}

/**
 * סטטוס האתר (מצב תחזוקה)
 */
export interface SiteStatus {
  maintenanceMode: boolean;
  message: string;
  allowedRoles?: string[]; // תפקידים מורשים לגשת במצב תחזוקה
}

/**
 * הגדרות תחזוקה מלאות (Admin)
 */
export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  allowedRoles: string[];
}

// ============================================================================
// Helpers
// ============================================================================

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'שגיאה בשרת');
  }
  
  return data;
};

// ============================================================================
// Public API
// ============================================================================

/**
 * קבלת הגדרות ציבוריות (לא דורש אימות)
 */
export const getPublicSettings = async (): Promise<{ success: boolean; data: PublicSettings }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings/public`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  return handleResponse(response);
};

// ============================================================================
// Admin API
// ============================================================================

/**
 * קבלת כל ההגדרות (Admin)
 */
export const getAllSettings = async (): Promise<{ success: boolean; data: AllSettings }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings`, {
    method: 'GET',
    headers: getHeaders()
  });
  
  return handleResponse(response);
};

/**
 * עדכון הגדרות (Admin)
 */
export const updateSettings = async (
  updates: Partial<Pick<AllSettings, 'orders' | 'shipping' | 'payment'>>
): Promise<{ success: boolean; data: AllSettings; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  
  return handleResponse(response);
};

/**
 * עדכון מהיר של הגדרת הזמנות ללא תשלום (Admin)
 */
export const toggleAllowUnpaidOrders = async (
  allow: boolean
): Promise<{ success: boolean; data: { allowUnpaidOrders: boolean }; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings/allow-unpaid-orders`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ allow })
  });
  
  return handleResponse(response);
};

/**
 * כיבוי/הפעלת אפשרות התשלום (Admin)
 * כאשר מכובה - הלקוח יראה רק אפשרות "הזמנה ללא תשלום"
 */
export const toggleDisablePayment = async (
  disable: boolean
): Promise<{ success: boolean; data: { disablePayment: boolean }; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings/disable-payment`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ disable })
  });
  
  return handleResponse(response);
};

/**
 * עדכון מהיר של הגדרת דרישת אישור הרשמה (Admin)
 */
export const toggleRequireRegistrationApproval = async (
  require: boolean
): Promise<{ success: boolean; data: { requireRegistrationApproval: boolean }; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings/require-registration-approval`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ require })
  });
  
  return handleResponse(response);
};

/**
 * עדכון מהיר של הגדרת דרישת OTP בהתחברות (Admin)
 */
export const toggleRequireLoginOTP = async (
  require: boolean
): Promise<{ success: boolean; data: { requireLoginOTP: boolean }; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings/require-login-otp`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ require })
  });
  
  return handleResponse(response);
};

/**
 * עדכון הגדרות מלאי (Admin)
 */
export const updateInventorySettings = async (
  inventorySettings: { defaultLowStockThreshold: number }
): Promise<{ success: boolean; data: AllSettings; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ inventory: inventorySettings })
  });
  
  return handleResponse(response);
};

/**
 * עדכון הגדרות הנחת סף (Admin)
 * הנחה אוטומטית כשהזמנה עוברת סכום מסוים
 */
export const updateThresholdDiscountSettings = async (
  thresholdDiscountSettings: { enabled?: boolean; minimumAmount?: number; discountPercentage?: number }
): Promise<{ success: boolean; data: AllSettings; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ thresholdDiscount: thresholdDiscountSettings })
  });
  
  return handleResponse(response);
};

/**
 * עדכון מדיניות משלוח והחזרות (Admin)
 * מוצג בטאב "משלוח והחזרות" בעמוד המוצר
 */
export const updateShippingPolicy = async (
  shippingPolicyUpdates: Partial<ShippingPolicy>
): Promise<{ success: boolean; data: AllSettings & { shippingPolicy: ShippingPolicy }; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ shippingPolicy: shippingPolicyUpdates })
  });
  
  return handleResponse(response);
};

// ============================================================================
// Export
// ============================================================================

export default {
  getPublicSettings,
  getAllSettings,
  updateSettings,
  toggleAllowUnpaidOrders,
  toggleDisablePayment
};

// ============================================================================
// Site Status API - סטטוס האתר (מצב תחזוקה)
// ============================================================================

/**
 * קבלת סטטוס האתר (ציבורי - לא דורש אימות)
 * GET /api/site-status
 */
export const getSiteStatus = async (): Promise<{ success: boolean; data: SiteStatus }> => {
  const response = await fetch(`${API_BASE_URL}/api/site-status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  
  return handleResponse(response);
};

/**
 * קבלת הגדרות תחזוקה מלאות (Admin)
 * GET /api/settings/maintenance
 */
export const getMaintenanceSettings = async (): Promise<{ success: boolean; data: MaintenanceSettings }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings/maintenance`, {
    method: 'GET',
    headers: getHeaders()
  });
  
  return handleResponse(response);
};

/**
 * עדכון מצב תחזוקה (Admin)
 * PUT /api/settings/maintenance
 */
export const updateMaintenanceSettings = async (
  updates: Partial<MaintenanceSettings>
): Promise<{ success: boolean; data: { maintenanceMode: boolean; message: string; allowedRoles: string[] }; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/settings/maintenance`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  
  return handleResponse(response);
};
