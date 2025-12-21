import type { Product } from '../types'
import { ApiError } from '../utils/ApiError';

// כתובת ה-API - משתמש במשתנה סביבה לתמיכה בהפעלה ב-production
const BASE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = `${BASE_API_URL}/api`;

// קבוע חיי מטמון (TTL) עבור תוצאות פילטר
const FILTER_CACHE_TTL_MS = 120_000;

// טיפוס שמייצג את פרמטרי הבקשה המלאים לאחר פילוח
export interface FilteredProductsRequestParams {
  priceMin?: number;
  priceMax?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
  categoryIds?: string[];
  attributes?: Record<string, string[]>;
}

// טיפוס תשובה כפי שמחזיר השרת עבור פילטרים
export interface FilteredProductsResponse {
  data: Product[];
  meta: {
    total: number;
    filtered: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface FilteredProductsCacheEntry {
  expiresAt: number;
  payload: FilteredProductsResponse;
}

// אוסף מטמון פנימי עבור תוצאות פילטר (key → נתונים + זמן תפוגה)
const filteredProductsCache = new Map<string, FilteredProductsCacheEntry>();

// אוסף בקרים לבקשות prefetch כדי שנוכל לבטל אותן במידת הצורך
const prefetchControllers = new Map<string, AbortController>();

// מנגנון דדופ: שמירת Promise פעיל לכל key כדי למנוע fetch כפול של אותו פילטר בו-זמנית
const inflightRequests = new Map<string, Promise<FilteredProductsResponse>>();

// פונקציה לניקוי רשומות מטמון שפג תוקפן כדי למנוע גידול בלתי מבוקר בזיכרון
function cleanupExpiredCache() {
  const now = Date.now();
  for (const [k, v] of filteredProductsCache.entries()) {
    if (v.expiresAt <= now) filteredProductsCache.delete(k);
  }
}

export class ProductService {
  // פונקציה פנימית לבניית key יציב על בסיס פרמטרי הפילטר
  private static buildFilteredKey(params: FilteredProductsRequestParams = {}): string {
    const normalizedAttributes = params.attributes
      ? Object.entries(params.attributes)
          .filter(([, values]) => Array.isArray(values) && values.length > 0)
          .map(([key, values]) => [key, [...values].sort()] as [string, string[]])
          .sort((a, b) => a[0].localeCompare(b[0]))
      : [];

    const normalized = {
      priceMin: params.priceMin ?? null,
      priceMax: params.priceMax ?? null,
      sort: params.sort ?? null,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      categoryIds: params.categoryIds ? [...params.categoryIds].sort() : [],
      attributes: normalizedAttributes,
    };
    return JSON.stringify(normalized);
  }

  // ניקוי מטמון עבור חתימה מסוימת או כלל הקאש
  static invalidateFilteredProductsCache(params?: FilteredProductsRequestParams): void {
    if (!params) {
      // ניקוי כלל המטמון וביטול כל prefetched controllers פעילים
      filteredProductsCache.clear();
      for (const controller of prefetchControllers.values()) {
        try { controller.abort(); } catch (e) { /* ignore */ }
      }
      prefetchControllers.clear();
      return;
    }
    const key = ProductService.buildFilteredKey(params);
    filteredProductsCache.delete(key);
    // אם יש בקר פרה-פאץ' פעיל עבור אותו key - נבטל גם אותו
    const ctrl = prefetchControllers.get(key);
    if (ctrl) {
      try { ctrl.abort(); } catch (e) { /* ignore */ }
      prefetchControllers.delete(key);
    }
  }

  // הפעלת פרה-פאץ' שקט לעמוד הבא – נטען רק אם אין מטמון חי
  static async prefetchFilteredProducts(params: FilteredProductsRequestParams): Promise<void> {
    // נעבור קודם על מטמון וננקות רשומות שפג תוקפן
    cleanupExpiredCache();

    const key = ProductService.buildFilteredKey(params);
    const cached = filteredProductsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return;
    }
    if (prefetchControllers.has(key)) {
      return;
    }
    const controller = new AbortController();
    prefetchControllers.set(key, controller);
    try {
      await ProductService.getFilteredProducts(params, controller.signal);
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        console.warn('הקדמת טעינת מוצרים נכשלה', error);
      }
    } finally {
      prefetchControllers.delete(key);
    }
  }

  // קבלת כל המוצרים עם מחירים מותאמים אישית
  static async getAllProducts(): Promise<Product[]> {
    try {
      // הכנת headers עם טוקן אימות אם קיים
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/products`, { headers });
      
      if (!response.ok) {
        // Try to parse server message, otherwise fallback to generic text
        let msg = `HTTP error! status: ${response.status}`;
        try {
          const json = await response.json();
          if (json && typeof json === 'object' && json.message) msg = String(json.message);
        } catch (e) {
          // ignore JSON parse errors
        }
        throw new ApiError(response.status, msg);
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching products:', error)
      throw error
    }
  }

  // קבלת מוצר לפי ID עם מחירים מותאמים אישית
  static async getProductById(id: string, signal?: AbortSignal): Promise<Product> {
    try {
      // הכנת headers עם טוקן אימות אם קיים
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
  const fetchOptions: RequestInit = { headers };
  if (signal) (fetchOptions as any).signal = signal;
  const response = await fetch(`${API_BASE_URL}/products/${id}`, fetchOptions);
      
      if (!response.ok) {
        let msg = `HTTP error! status: ${response.status}`;
        try {
          const json = await response.json();
          if (json && typeof json === 'object' && json.message) msg = String(json.message);
        } catch (e) {}
        throw new ApiError(response.status, msg);
      }

      const data = await response.json()
      console.log('ProductService - received product with pricing:', data); // דיבג
      return data
    } catch (error) {
      // אם זה AbortError (ביטול בקשה), אל תדפיס שגיאה בקונסול - זה תקין
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error('Error fetching product:', error)
      throw error
    }
  }

  // קבלת מוצרים פופולריים (endpoint ייעודי בשרת)
  static async getPopularProducts(): Promise<Product[]> {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/products/popular`, { headers });
      if (!response.ok) {
        let msg = `HTTP error! status: ${response.status}`;
        try {
          const json = await response.json();
          if (json && typeof json === 'object' && json.message) msg = String(json.message);
        } catch (e) {}
        throw new ApiError(response.status, msg);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching popular products:', error);
      throw error;
    }
  }

  // קבלת מוצרים שנוספו לאחרונה
  static async getRecentlyAddedProducts(): Promise<Product[]> {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/products/by-date`, { headers });
      if (!response.ok) {
        let msg = `HTTP error! status: ${response.status}`;
        try {
          const json = await response.json();
          if (json && typeof json === 'object' && json.message) msg = String(json.message);
        } catch (e) {}
        throw new ApiError(response.status, msg);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching recently added products:', error);
      throw error;
    }
  }

  /**
   * צעד 1: פונקציה חדשה לקבלת מוצרים עם פילטרים + meta מהשרת.
   * פרמטרים אופציונליים: priceMin, priceMax, sort, page, pageSize
   * השרת מחזיר: { data: Product[], meta: { total, filtered, page, pageSize, totalPages, hasNext, hasPrev } }
   */
  static async getFilteredProducts(params: FilteredProductsRequestParams = {}, signal?: AbortSignal): Promise<FilteredProductsResponse> {
    // ניקוי רשומות מוצר שפג תוקפן לפני שימוש במטמון כדי למנוע גידול והחזרת נתונים ישנים
    cleanupExpiredCache();

    const cacheKey = ProductService.buildFilteredKey(params);
    const cached = filteredProductsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[ProductService] cache HIT', { key: cacheKey });
      }
      return cached.payload;
    }
    if (cached) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[ProductService] cache STALE, deleting', { key: cacheKey });
      }
      filteredProductsCache.delete(cacheKey);
    }

    // דדופ: אם יש כבר בקשה פעילה לאותו key, נחזיר את אותה הבטחה במקום fetch כפול
    const inFlight = inflightRequests.get(cacheKey);
    if (inFlight) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[ProductService] inflight REQUEST found, reusing', { key: cacheKey });
      }
      return inFlight;
    }

    const search = new URLSearchParams()
    if (params.priceMin != null) search.set('priceMin', String(params.priceMin))
    if (params.priceMax != null) search.set('priceMax', String(params.priceMax))
    if (params.sort) search.set('sort', params.sort)
    if (params.page) search.set('page', String(params.page))
    if (params.pageSize) search.set('pageSize', String(params.pageSize))
    if (params.categoryIds && params.categoryIds.length > 0) search.set('categoryIds', params.categoryIds.join(','))
    if (params.attributes) {
      Object.entries(params.attributes).forEach(([key, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          search.set(key, values.join(','))
        }
      })
    }

    const url = `${API_BASE_URL}/products/filter${search.toString() ? `?${search.toString()}` : ''}`

    // יצירת Promise ושמירתו ב-inflightRequests כדי שקריאות נוספות יוכלו להצטרף אליו
    const fetchPromise = (async () => {
      try {
        const response = await fetch(url, { signal })
        if (!response.ok) {
          let msg = `HTTP error! status: ${response.status}`;
          try {
            const json = await response.json();
            if (json && typeof json === 'object' && json.message) msg = String(json.message);
          } catch (e) {}
          throw new ApiError(response.status, msg);
        }
        const payload: FilteredProductsResponse = await response.json()
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[ProductService] fetched from network', { url, key: cacheKey, resultCount: payload.data.length });
        }
        filteredProductsCache.set(cacheKey, {
          expiresAt: Date.now() + FILTER_CACHE_TTL_MS,
          payload,
        });
        return payload
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        throw error;
      } finally {
        // ניקוי inflight request לאחר סיום (הצלחה או כשלון)
        inflightRequests.delete(cacheKey);
      }
    })();

    // שמירת ה-Promise ב-map כדי שקריאות נוספות יוכלו להצטרף
    inflightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }
}
