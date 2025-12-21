import { ApiError } from '../utils/ApiError';
import { getToken } from '../utils/tokenUtils';

// כתובת ה-API - משתמש במשתנה סביבה לתמיכה בהפעלה ב-production
const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = `${BASE_API_URL}/api`;

/**
 * פונקציה עוזרת לטיפול בשגיאות API
 * מנסה לפרסר JSON ולהוציא הודעת שגיאה ברורה
 */
const parseErrorResponse = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    return data.message || data.error || `שגיאת HTTP! status: ${response.status}`;
  } catch {
    const text = await response.text().catch(() => '');
    return text || response.statusText || `שגיאת HTTP! status: ${response.status}`;
  }
};

/**
 * ממשק משפחת צבעים - Color Family
 */
export interface ColorFamily {
  family: string;
  displayName: string;
  variants: Array<{
    name: string;
    hex: string;
  }>;
}

/**
 * ממשק ערך מאפיין בסיסי (לטקסט ומספרים)
 */
export interface AttributeValue {
  value: string;
  displayName: string;
}

/**
 * ממשק מאפיין סינון גלובלי
 */
export interface FilterAttribute {
  _id: string;
  name: string;
  key: string;
  valueType: 'text' | 'color' | 'number';
  icon?: string;
  showInFilter: boolean;
  isRequired: boolean;
  sortOrder: number;
  colorFamilies?: ColorFamily[];
  values?: AttributeValue[];
  createdAt: string;
  updatedAt: string;
}

/**
 * תשובת API סטנדרטית
 */
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * מאפיין עם ספירת שימוש (לפילטרים)
 */
export interface AttributeWithUsage {
  attribute: FilterAttribute;
  usageCount: number;
}

/**
 * שירות ניהול מאפייני סינון - Client Side
 * משתמש ב-fetch API הנייטיבי עם ניהול טוקנים ידני
 */
export class FilterAttributeService {
  /**
   * קבלת כל המאפיינים (למנהל)
   * דורש authentication
   */
  static async getAllAttributes(): Promise<FilterAttribute[]> {
    try {
      const token = getToken();
      if (!token) {
        throw new ApiError(401, 'לא נמצא טוקן אימות');
      }

      const response = await fetch(`${API_BASE_URL}/filter-attributes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new ApiError(response.status, message);
      }

      const result: ApiResponse<FilterAttribute[]> = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching all filter attributes:', error);
      throw error;
    }
  }

  /**
   * קבלת מאפיינים לסינון (ציבורי)
   * כולל ספירת שימוש - לא דורש authentication
   */
  static async getAttributesForFilter(): Promise<AttributeWithUsage[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/filter-attributes/for-filter`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new ApiError(response.status, message);
      }

      const result: ApiResponse<AttributeWithUsage[]> = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error fetching filter attributes:', error);
      throw error;
    }
  }

  /**
   * יצירת מאפיין חדש
   * דורש authentication + הרשאות מנהל
   */
  static async createAttribute(
    data: Partial<FilterAttribute>
  ): Promise<FilterAttribute> {
    try {
      const token = getToken();
      if (!token) {
        throw new ApiError(401, 'לא נמצא טוקן אימות');
      }

      const response = await fetch(`${API_BASE_URL}/filter-attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new ApiError(response.status, message);
      }

      const result: ApiResponse<FilterAttribute> = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error creating filter attribute:', error);
      throw error;
    }
  }

  /**
   * עדכון מאפיין קיים
   * דורש authentication + הרשאות מנהל
   */
  static async updateAttribute(
    id: string,
    data: Partial<FilterAttribute>
  ): Promise<FilterAttribute> {
    try {
      const token = getToken();
      if (!token) {
        throw new ApiError(401, 'לא נמצא טוקן אימות');
      }

      const response = await fetch(`${API_BASE_URL}/filter-attributes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new ApiError(response.status, message);
      }

      const result: ApiResponse<FilterAttribute> = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error updating filter attribute:', error);
      throw error;
    }
  }

  /**
   * מחיקת מאפיין
   * דורש authentication + הרשאות מנהל
   * רק אם המאפיין לא בשימוש
   */
  static async deleteAttribute(id: string): Promise<void> {
    try {
      const token = getToken();
      if (!token) {
        throw new ApiError(401, 'לא נמצא טוקן אימות');
      }

      const response = await fetch(`${API_BASE_URL}/filter-attributes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new ApiError(response.status, message);
      }

      // מחיקה מוצלחת - אין צורך להחזיר data
    } catch (error) {
      console.error('❌ Error deleting filter attribute:', error);
      throw error;
    }
  }

  /**
   * קבלת כמות השימוש של מאפיין
   * דורש authentication + הרשאות מנהל
   */
  static async getAttributeUsage(id: string): Promise<{
    attribute: FilterAttribute;
    usageCount: number;
  }> {
    try {
      const token = getToken();
      if (!token) {
        throw new ApiError(401, 'לא נמצא טוקן אימות');
      }

      const response = await fetch(`${API_BASE_URL}/filter-attributes/${id}/usage`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new ApiError(response.status, message);
      }

      const result: ApiResponse<{
        attribute: FilterAttribute;
        usageCount: number;
      }> = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error getting attribute usage:', error);
      throw error;
    }
  }

  /**
   * הסרת מאפיין מכל ה-SKUs
   * דורש authentication + הרשאות מנהל
   * משמש לפני מחיקה כדי לאפשר למנהל להסיר מאפיין בשימוש
   */
  static async removeAttributeFromAllSkus(id: string): Promise<{
    modifiedCount: number;
    attributeName: string;
  }> {
    try {
      const token = getToken();
      if (!token) {
        throw new ApiError(401, 'לא נמצא טוקן אימות');
      }

      const response = await fetch(`${API_BASE_URL}/filter-attributes/${id}/remove-from-skus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response);
        throw new ApiError(response.status, message);
      }

      const result: ApiResponse<{
        modifiedCount: number;
        attributeName: string;
      }> = await response.json();
      return result.data;
    } catch (error) {
      console.error('❌ Error removing attribute from SKUs:', error);
      throw error;
    }
  }
}
