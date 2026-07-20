/**
 * 🏷️ Brand Service
 * 
 * שירות לניהול מותגים - תקשורת עם ה-API
 */

import { API_BASE_URL as BASE_URL } from '../config/api';
import { getToken } from '../utils/tokenUtils';
import { ProductService } from './productService';

// כתובת ה-API
const API_BASE_URL = `${BASE_URL}/api/brands`;

// ============================================================================
// טיפוסים
// ============================================================================

/**
 * ממשק מותג
 */
export interface Brand {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * מותג לבחירה בדרופדאון (מינימלי)
 */
export interface BrandForSelect {
  _id: string;
  name: string;
}

// ============================================================================
// פונקציות עזר
// ============================================================================

/**
 * פרסור שגיאה מתגובת ה-API
 */
const parseErrorResponse = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    return data.message || data.error || `שגיאת HTTP! status: ${response.status}`;
  } catch {
    return `שגיאת HTTP! status: ${response.status}`;
  }
};

/**
 * יצירת headers עם אוטוריזציה
 */
const getAuthHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * שליפת כל המותגים (Admin)
 * @param activeOnly - האם להביא רק פעילים
 */
export const getAllBrands = async (activeOnly = false): Promise<Brand[]> => {
  try {
    const url = activeOnly 
      ? `${API_BASE_URL}?activeOnly=true`
      : API_BASE_URL;
      
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error: any) {
    console.error('❌ שגיאה בטעינת מותגים:', error);
    throw error;
  }
};

/**
 * שליפת מותגים לבחירה בדרופדאון (ציבורי - מותגים פעילים בלבד)
 */
export const getBrandsForSelect = async (): Promise<BrandForSelect[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/for-select`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error: any) {
    console.error('❌ שגיאה בטעינת מותגים לבחירה:', error);
    throw error;
  }
};

/**
 * יצירת מותג חדש
 */
export const createBrand = async (name: string): Promise<Brand> => {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.data;
  } catch (error: any) {
    console.error('❌ שגיאה ביצירת מותג:', error);
    throw error;
  }
};

/**
 * עדכון מותג
 */
export const updateBrand = async (
  id: string,
  updates: { name?: string; isActive?: boolean; expectedUpdatedAt?: string }
): Promise<Brand> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    ProductService.invalidateProductDetailsCache();
    ProductService.invalidateFilteredProductsCache();
    return data.data;
  } catch (error: any) {
    console.error('❌ שגיאה בעדכון מותג:', error);
    throw error;
  }
};

/**
 * מחיקת מותג
 */
export const deleteBrand = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error('❌ שגיאה במחיקת מותג:', error);
    throw error;
  }
};

/**
 * בדיקת כמות שימוש במותג
 */
export const getBrandUsage = async (id: string): Promise<{ usageCount: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${id}/usage`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorMessage = await parseErrorResponse(response);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return { usageCount: data.data.usageCount };
  } catch (error: any) {
    console.error('❌ שגיאה בבדיקת שימוש במותג:', error);
    throw error;
  }
};

// Export as object for consistency with other services
export const BrandService = {
  getAllBrands,
  getBrandsForSelect,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandUsage,
};

export default BrandService;
