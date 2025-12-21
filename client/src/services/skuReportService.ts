import { ApiError } from '../utils/ApiError';
import { getToken } from '../utils/tokenUtils';
import { API_BASE_URL } from '../config/api'; // 🔧 FIX: שימוש ב-API_BASE_URL המרכזי

/**
 * שירות לדוחות מלאי SKU בצד הלקוח.
 * אחראי למשוך נתונים חיים של מלאי נמוך עבור דשבורד הניהול.
 */
export interface LowStockSku {
  _id: string;
  sku: string;
  name?: string;
  stockQuantity: number;
  /** הסף שמוגדר למוצר זה (מברירת מחדל או מההגדרה הספציפית) */
  lowStockThreshold?: number;
  productId?: {
    _id: string;
    name?: string;
    category?: string;
  } | string;
}

/** ממשק להזדמנות שהוחמצה */
export interface MissedOpportunity {
  sku: string;
  productId: string;
  productName: string;
  price: number;
  image: string;
  stockQuantity: number;
  customersCount: number;
  potentialValue: number;
  reason: string;
}

class SkuReportService {
  /** בסיס ה-URL של כל קריאות הדוחות עבור SKUs */
  private baseUrl = `${API_BASE_URL}/skus`; // 🔧 FIX: שימוש ב-URL המלא של Backend

  /**
   * עוטף קריאת fetch ומוודא טיפול מסודר בשגיאות מהשרת.
   */
  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();

    // דואגים לHeaders כאובייקט תקין כך שיתאים לכל הצורות של HeadersInit
    const headers = new Headers(options.headers ?? {});

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let message = response.statusText;

      try {
        const errorData = await response.json();
        message = errorData?.message || message;
      } catch (parseError) {
        // אם ה-body אינו JSON נשאיר את הודעת הסטטוס.
      }

      throw new ApiError(response.status, message);
    }

    return response.json() as Promise<T>;
  }

  /**
   * שליפה של רשימת SKUs עם מלאי נמוך לפי סף מוגדר.
   * @param threshold סף מלאי שנחשב "נמוך" (ברירת מחדל 5).
   */
  async getLowStockSkus(threshold?: number, signal?: AbortSignal): Promise<LowStockSku[]> {
    const searchParams = new URLSearchParams();

    if (typeof threshold === 'number') {
      // מאפשר לשלוח סף מותאם במקרה הצורך אך ברירת המחדל להסתמך על הסף של המוצר
      searchParams.set('threshold', String(threshold));
    }

    const url = `${this.baseUrl}/reports/low-stock${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

    const data = await this.makeRequest<{
      success: boolean;
      data: LowStockSku[];
      message?: string;
    }>(url, {
      method: 'GET',
      signal,
    });

    if (!data.success) {
      throw new ApiError(500, data.message || 'שליפת מלאי נמוך נכשלה');
    }

    return data.data;
  }

  /**
   * שליפה של הזדמנויות שהוחמצו - מוצרים במלאי נמוך/אזל שנמצאים בסלי לקוחות
   */
  async getMissedOpportunities(signal?: AbortSignal): Promise<MissedOpportunity[]> {
    const url = `${this.baseUrl}/reports/missed-opportunities`;

    const data = await this.makeRequest<{
      success: boolean;
      data: MissedOpportunity[];
      message?: string;
    }>(url, {
      method: 'GET',
      signal,
    });

    if (!data.success) {
      throw new ApiError(500, data.message || 'שליפת הזדמנויות שהוחמצו נכשלה');
    }

    return data.data;
  }
}

const skuReportService = new SkuReportService();
export default skuReportService;
