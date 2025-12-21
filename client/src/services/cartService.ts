// Cart Service - שירות לניהול קריאות API של סל הקניות
// מופרד מה-Redux slice כדי לשמור על הפרדת אחריות נקייה

import type { Cart } from '../store/slices/cartSlice';
import { ApiError } from '../utils/ApiError';
import { getToken } from '../utils/tokenUtils';

// כתובת בסיס של ה-API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ממשק לתגובה מהשרת
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * פונקציה עזר לטיפול בשגיאות HTTP
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
  const status = response.status;
  const result: ApiResponse<T> = await response.json().catch(() => ({ success: false } as ApiResponse<T>));

  // אם הסטטוס אינו 2xx - נייצר ApiError עם הפרטים
  if (!response.ok) {
    const msg = result?.message || result?.error || response.statusText || 'שגיאה בתקשורת עם השרת';
    throw new ApiError(status, msg, undefined, result);
  }

  // אם השרת החזיר success=false נחזה זאת כשגיאה עסקית
  if (!result.success || !result.data) {
    const msg = result?.message || 'שגיאה לא צפויה';
    throw new ApiError(status, msg, undefined, result);
  }

  return result.data as T;
};

/**
 * פונקציה עזר ליצירת headers עם טוקן ו-sessionId
 */
  const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // הוספת טוקן אם קיים (למשתמשים מחוברים)
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // הוספת sessionId (למשתמשים אורחים)
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    // יצירת sessionId חדש אם לא קיים
    sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sessionId', sessionId);
  }
  headers['x-session-id'] = sessionId;
  
  return headers;
};

/**
 * שירות ניהול סל קניות
 */
const cartService = {
  /**
   * קבלת הסל הנוכחי מהשרת
   */
  async getCart(): Promise<Cart> {
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    return handleResponse<Cart>(response);
  },

  /**
   * הוספת פריט לסל
   * Phase 3.4: עכשיו שולח SKU במקום variant/variantIndex
   */
  async addItem(
    productId: string,
    quantity: number,
    sku: string // Phase 3.4: SKU הוא חובה עכשיו
  ): Promise<Cart> {
    const response = await fetch(`${API_BASE_URL}/api/cart/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ productId, quantity, sku }), // Phase 3.4: שולח SKU
    });
    
    return handleResponse<Cart>(response);
  },

  /**
   * עדכון כמות של פריט בסל
   */
  async updateItemQuantity(itemId: string, quantity: number): Promise<Cart> {
    const response = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ quantity }),
    });
    
    return handleResponse<Cart>(response);
  },

  /**
   * הסרת פריט מהסל
   */
  async removeItem(itemId: string): Promise<Cart> {
    const response = await fetch(`${API_BASE_URL}/api/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    return handleResponse<Cart>(response);
  },

  /**
   * ניקוי הסל המלא
   */
  async clearCart(): Promise<Cart> {
    const response = await fetch(`${API_BASE_URL}/api/cart`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    
    return handleResponse<Cart>(response);
  },

  /**
   * מיזוג סלים (אורח → משתמש מחובר)
   * נקרא אחרי התחברות מוצלחת
   */
  async mergeCarts(guestSessionId: string): Promise<Cart> {
    const response = await fetch(`${API_BASE_URL}/api/cart/merge`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ guestSessionId }),
    });
    
    return handleResponse<Cart>(response);
  },

  /**
   * קבלת ספירת פריטים בסל (לעדכון מהיר של האייקון)
   */
  async getCartCount(): Promise<number> {
    try {
      const cart = await this.getCart();
      return cart.items.reduce((total, item) => total + item.quantity, 0);
    } catch (error) {
      console.error('שגיאה בקבלת ספירת הסל:', error);
      return 0;
    }
  },

  /**
   * טעינת הסל מ-localStorage (לשימוש אופליין או fallback)
   */
  getLocalCart(): Cart | null {
    try {
      const cartData = localStorage.getItem('cart');
      return cartData ? JSON.parse(cartData) : null;
    } catch (error) {
      console.error('שגיאה בטעינת סל מקומי:', error);
      return null;
    }
  },

  /**
   * שמירת הסל ב-localStorage (לגיבוי מקומי)
   */
  saveLocalCart(cart: Cart): void {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error('שגיאה בשמירת סל מקומי:', error);
    }
  },

  /**
   * מחיקת הסל המקומי
   */
  clearLocalCart(): void {
    try {
      localStorage.removeItem('cart');
    } catch (error) {
      console.error('שגיאה במחיקת סל מקומי:', error);
    }
  },

  /**
   * בדיקת זמינות מלאי לכל הפריטים בעגלה
   * מחזיר רשימה של פריטים עם מצב המלאי העדכני שלהם
   */
  async validateCartStock(): Promise<StockValidationResult> {
    const response = await fetch(`${API_BASE_URL}/api/cart/validate-stock`, {
      method: 'GET',
      headers: getHeaders(),
    });
    
    return handleResponse<StockValidationResult>(response);
  },
};

// ממשק לתוצאת בדיקת מלאי
export interface StockValidationItem {
  itemId: string;           // מזהה הפריט בעגלה
  sku: string;              // קוד SKU
  productId: string;        // מזהה המוצר
  productName: string;      // שם המוצר
  requestedQuantity: number; // הכמות שהלקוח רוצה
  availableStock: number;   // המלאי הזמין בפועל
  isAvailable: boolean;     // האם זמין (מלאי > 0)
  needsAdjustment: boolean; // האם צריך להתאים את הכמות
}

export interface StockValidationResult {
  isValid: boolean;         // האם כל הפריטים זמינים
  items: StockValidationItem[];
  outOfStockItems: StockValidationItem[];    // פריטים שאזלו לגמרי
  adjustedItems: StockValidationItem[];      // פריטים שהכמות שלהם צריכה לרדת
}

export default cartService;
