/**
 * שירות התראות מלאי - צד לקוח
 * מנהל תקשורת עם ה-API של התראות "עדכן אותי כשחוזר למלאי"
 */

const API_BASE_URL = 'http://localhost:5000/api/stock-alerts';

// ממשק לתגובת יצירת התראה
export interface CreateStockAlertResponse {
  success: boolean;
  message: string;
  data?: {
    alertId: string;
    productName: string;
  };
}

// ממשק לתגובת בדיקת התראה קיימת
export interface CheckAlertResponse {
  success: boolean;
  data?: {
    hasActiveAlert: boolean;
    alertId?: string;
    createdAt?: string;
  };
}

// ממשק לנתוני יצירת התראה
export interface CreateStockAlertData {
  productId: string;
  email: string;
  skuCode?: string;
  productName?: string;
  phone?: string;
}

// ממשק לסטטיסטיקות התראות (Admin)
export interface StockAlertStats {
  totalActive: number;
  totalSent: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    alertCount: number;
  }>;
}

// ממשק להתראה בודדת
export interface StockAlertItem {
  _id: string;
  productId: string;
  productName: string;
  email: string;
  skuCode?: string;
  status: 'active' | 'sent' | 'cancelled' | 'expired';
  createdAt: string;
  notifiedAt?: string;
}

// ממשק לסיכום יומי
export interface DailySummary {
  date: string;
  newAlerts: number;
  sentAlerts: number;
  cancelledAlerts: number;
}

/**
 * יצירת התראת מלאי חדשה
 * @param data - נתוני ההתראה (מוצר, אימייל, וכו')
 * @returns תגובת השרת עם סטטוס היצירה
 */
export const createStockAlert = async (
  data: CreateStockAlertData
): Promise<CreateStockAlertResponse> => {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // שליחת cookies לאימות
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'שגיאה ביצירת ההתראה',
      };
    }

    return result;
  } catch (error) {
    console.error('Error creating stock alert:', error);
    return {
      success: false,
      message: 'שגיאה בתקשורת עם השרת',
    };
  }
};

/**
 * בדיקה האם קיימת התראה פעילה למשתמש על מוצר מסוים
 * @param productId - מזהה המוצר
 * @param email - כתובת האימייל
 * @param skuCode - קוד SKU (אופציונלי)
 * @returns האם קיימת התראה פעילה
 */
export const checkExistingAlert = async (
  productId: string,
  email: string,
  skuCode?: string
): Promise<boolean> => {
  try {
    const params = new URLSearchParams({ productId, email });
    if (skuCode) {
      params.append('skuCode', skuCode);
    }

    const response = await fetch(`${API_BASE_URL}/check?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return false;
    }

    const result: CheckAlertResponse = await response.json();
    return result.data?.hasActiveAlert || false;
  } catch (error) {
    console.error('Error checking existing alert:', error);
    return false;
  }
};

/**
 * ביטול התראה לפי token (משמש לקישור unsubscribe במייל)
 * @param token - הטוקן מהקישור
 * @returns האם הביטול הצליח
 */
export const unsubscribeByToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/unsubscribe/${token}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return false;
  }
};

// ============================================
// פונקציות Admin - דורשות הרשאות מנהל
// ============================================

/**
 * קבלת סטטיסטיקות התראות מלאי (Admin)
 * @returns סטטיסטיקות מפורטות
 */
export const getStockAlertStats = async (): Promise<StockAlertStats | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching stock alert stats:', error);
    return null;
  }
};

/**
 * קבלת סיכום יומי של התראות (Admin)
 * @param days - מספר הימים לסיכום (ברירת מחדל: 7)
 * @returns מערך של סיכומים יומיים
 */
export const getDailySummary = async (days: number = 7): Promise<DailySummary[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/daily-summary?days=${days}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return [];
  }
};

/**
 * קבלת כל ההתראות (Admin)
 * @param status - סינון לפי סטטוס (אופציונלי)
 * @param page - מספר עמוד
 * @param limit - כמות לעמוד
 * @returns רשימת התראות
 */
export const getAllAlerts = async (
  status?: 'active' | 'sent' | 'cancelled' | 'expired',
  page: number = 1,
  limit: number = 50
): Promise<{ alerts: StockAlertItem[]; total: number }> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) {
      params.append('status', status);
    }

    const response = await fetch(`${API_BASE_URL}/admin/all?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return { alerts: [], total: 0 };
    }

    const result = await response.json();
    return {
      alerts: result.data || [],
      total: result.meta?.total || 0,
    };
  } catch (error) {
    console.error('Error fetching all alerts:', error);
    return { alerts: [], total: 0 };
  }
};

/**
 * קבלת התראות לפי מוצר (Admin)
 * @param productId - מזהה המוצר
 * @param status - סינון לפי סטטוס (אופציונלי)
 * @returns רשימת התראות למוצר
 */
export const getAlertsByProduct = async (
  productId: string,
  status?: 'active' | 'sent' | 'cancelled' | 'expired'
): Promise<StockAlertItem[]> => {
  try {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }

    const url = status
      ? `${API_BASE_URL}/admin/product/${productId}?${params.toString()}`
      : `${API_BASE_URL}/admin/product/${productId}`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching alerts by product:', error);
    return [];
  }
};

/**
 * ביטול התראה על ידי מנהל (Admin)
 * @param alertId - מזהה ההתראה
 * @returns האם הביטול הצליח
 */
export const cancelAlertAdmin = async (alertId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/${alertId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    return response.ok;
  } catch (error) {
    console.error('Error cancelling alert:', error);
    return false;
  }
};

// ייצוא ברירת מחדל - אובייקט עם כל הפונקציות
export default {
  createStockAlert,
  checkExistingAlert,
  unsubscribeByToken,
  // Admin functions
  getStockAlertStats,
  getDailySummary,
  getAllAlerts,
  getAlertsByProduct,
  cancelAlertAdmin,
};
