import { ApiError } from '../utils/ApiError';
import { getToken } from '../utils/tokenUtils';
import { API_BASE_URL as BASE_URL } from '../config/api';

// כתובת ה-API - משתמש במודול מרכזי עם זיהוי אוטומטי של Railway
const API_BASE_URL = `${BASE_URL}/api`;

/**
 * ממשק לתיאור בעיה שזוהתה במוצר
 */
export interface InconsistencyWarning {
  productId: string;
  productName: string;
  productImage?: string;
  issues: {
    attributeKey: string; // שם התכונה (למשל: "size", "material")
    missingInCount: number; // כמה SKUs חסרה בהם תכונה זו
    totalSkus: number; // סך הכל SKUs למוצר
  }[];
}

/**
 * תגובה מהשרת לבקשת התראות
 */
export interface InconsistenciesResponse {
  success: boolean;
  count: number;
  warnings: InconsistencyWarning[];
}

/**
 * פרמטרים להגדרת התעלמות
 */
export interface SetIgnoreParams {
  productId: string;
  ignoreType: 'forever' | 'snooze';
}

/**
 * Service לניהול התראות אי-עקביות במוצרים
 * מתקשר עם ה-API של השרת
 */
export class AdminWarningsService {
  /**
   * קבלת רשימת מוצרים עם אי-עקביות
   * GET /api/admin/warnings/inconsistencies
   */
  static async getInconsistencies(): Promise<InconsistencyWarning[]> {
    try {
      const token = getToken();
      if (!token) {
        throw new ApiError(401, 'לא מחובר');
      }

      // Debug: show request being made
      console.debug('[AdminWarningsService] Fetching inconsistencies from:', `${API_BASE_URL}/admin/warnings/inconsistencies`);
      const response = await fetch(`${API_BASE_URL}/admin/warnings/inconsistencies`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.debug('[AdminWarningsService] Response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.message || 'שגיאה בקבלת התראות'
        );
      }

      const data: InconsistenciesResponse = await response.json();
      return data.warnings || [];
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('❌ שגיאה בקבלת התראות אי-עקביות:', error);
      throw new ApiError(500, 'שגיאת רשת - לא ניתן לקבל התראות');
    }
  }

  /**
   * הגדרת התעלמות עבור מוצר
   * POST /api/admin/warnings/ignore
   * 
   * @param params - פרמטרים: productId ו-ignoreType
   */
  static async setIgnore(params: SetIgnoreParams): Promise<void> {
    try {
      const token = getToken();
      if (!token) {
        throw new ApiError(401, 'לא מחובר');
      }

      const response = await fetch(`${API_BASE_URL}/admin/warnings/ignore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.message || 'שגיאה בשמירת התעלמות'
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('❌ שגיאה בשמירת התעלמות:', error);
      throw new ApiError(500, 'שגיאת רשת - לא ניתן לשמור התעלמות');
    }
  }

  /**
   * הסרת התעלמות (ביטול ignore/snooze)
   * DELETE /api/admin/warnings/ignore/:productId
   * 
   * @param productId - מזהה המוצר
   */
  static async removeIgnore(productId: string): Promise<void> {
    try {
      const token = getToken();
      if (!token) {
        throw new ApiError(401, 'לא מחובר');
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/warnings/ignore/${productId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          response.status,
          errorData.message || 'שגיאה בהסרת התעלמות'
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('❌ שגיאה בהסרת התעלמות:', error);
      throw new ApiError(500, 'שגיאת רשת - לא ניתן להסיר התעלמות');
    }
  }
}
