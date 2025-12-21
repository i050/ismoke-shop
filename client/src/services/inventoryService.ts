import { ApiError } from '../utils/ApiError';
import { getToken } from '../utils/tokenUtils';

/**
 * שירות לניהול מלאי SKU בצד הלקוח.
 * אחראי למשוך ולעדכן נתוני מלאי עבור דשבורד ניהול המלאי.
 */

export interface SkuImage {
  url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
}

export interface InventorySku {
  _id: string;
  sku: string;
  name: string;
  stockQuantity: number;
  price: number;
  color?: string;
  attributes?: Record<string, string>;
  images?: SkuImage[];
  isActive: boolean;
  productId?: {
    _id: string;
    name?: string;
    category?: string;
    slug?: string;
    images?: string[];
    /** סף מלאי נמוך מוגדר למוצר */
    lowStockThreshold?: number;
  };
}

export interface InventoryPagination {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

export interface InventoryResponse {
  success: boolean;
  data: InventorySku[];
  pagination: InventoryPagination;
  message?: string;
}

export interface InventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  stockFilter?: 'all' | 'low' | 'out' | 'in';
}

class InventoryService {
  /** בסיס ה-URL של כל קריאות המלאי */
  private baseUrl = '/api/skus';

  /**
   * עוטף קריאת fetch ומוודא טיפול מסודר בשגיאות מהשרת.
   */
  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();

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
      } catch {
        // אם ה-body אינו JSON נשאיר את הודעת הסטטוס.
      }

      throw new ApiError(response.status, message);
    }

    return response.json() as Promise<T>;
  }

  /**
   * שליפה של רשימת SKUs לניהול מלאי עם פגינציה, חיפוש ומיון
   */
  async getInventorySkus(
    filters: InventoryFilters = {},
    signal?: AbortSignal
  ): Promise<InventoryResponse> {
    const searchParams = new URLSearchParams();

    if (filters.page) {
      searchParams.set('page', String(filters.page));
    }
    if (filters.limit) {
      searchParams.set('limit', String(filters.limit));
    }
    if (filters.search) {
      searchParams.set('search', filters.search);
    }
    if (filters.sortBy) {
      searchParams.set('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      searchParams.set('sortOrder', filters.sortOrder);
    }
    if (filters.stockFilter) {
      searchParams.set('stockFilter', filters.stockFilter);
    }

    const queryString = searchParams.toString();
    const url = `${this.baseUrl}/inventory${queryString ? `?${queryString}` : ''}`;

    const data = await this.makeRequest<InventoryResponse>(url, {
      method: 'GET',
      signal,
    });

    if (!data.success) {
      throw new ApiError(500, data.message || 'שליפת נתוני מלאי נכשלה');
    }

    return data;
  }

  /**
   * עדכון כמות מלאי ישירה
   * @param sku - קוד SKU
   * @param quantity - כמות מלאי חדשה
   */
  async setStockQuantity(sku: string, quantity: number): Promise<InventorySku> {
    const url = `${this.baseUrl}/${encodeURIComponent(sku)}/stock-quantity`;

    const data = await this.makeRequest<{
      success: boolean;
      data: InventorySku;
      message?: string;
    }>(url, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });

    if (!data.success) {
      throw new ApiError(500, data.message || 'עדכון כמות מלאי נכשל');
    }

    return data.data;
  }

  /**
   * עדכון מלאי יחסי (delta)
   * @param sku - קוד SKU
   * @param delta - שינוי במלאי (חיובי להוספה, שלילי להפחתה)
   */
  async updateStock(sku: string, delta: number): Promise<InventorySku> {
    const url = `${this.baseUrl}/${encodeURIComponent(sku)}/stock`;

    const data = await this.makeRequest<{
      success: boolean;
      data: InventorySku;
      message?: string;
    }>(url, {
      method: 'PATCH',
      body: JSON.stringify({ delta }),
    });

    if (!data.success) {
      throw new ApiError(500, data.message || 'עדכון מלאי נכשל');
    }

    return data.data;
  }
}

const inventoryService = new InventoryService();
export default inventoryService;
