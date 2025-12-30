import type { Product } from '../types'
import { ApiError } from '../utils/ApiError';
import { API_BASE_URL as BASE_URL } from '../config/api';

// כתובת ה-API - משתמש במודול מרכזי עם זיהוי אוטומטי של Railway
const API_BASE_URL = `${BASE_URL}/api`;

// ============================================================================
// טיפוסים עבור Autocomplete
// ============================================================================

/**
 * הצעת מוצר להשלמה אוטומטית
 * מכיל רק את השדות הנדרשים להצגה ב-dropdown
 */
export interface ProductSuggestion {
  _id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice?: number;
  isOnSale: boolean;
  thumbnail: string; // URL לתמונה קטנה
}

/**
 * תגובת API עבור autocomplete
 */
export interface AutocompleteResponse {
  success: boolean;
  data: ProductSuggestion[];
  query: string;
  total: number;
}

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
  search?: string; // חיפוש טקסט חופשי
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

// ============================================================================
// Product Details Prefetch Cache - אופטימיזציה של זמן הטעינה
// ============================================================================

// קבוע חיי מטמון עבור Product Details (10 דקות)
const PRODUCT_DETAILS_CACHE_TTL_MS = 10 * 60 * 1000;

// ממשק עבור ערך מטמון מוצר
interface ProductDetailsCacheEntry {
  expiresAt: number;
  data: Product;
}

// מטמון פנימי עבור Product Details (key: product ID → data + ttl)
const productDetailsCache = new Map<string, ProductDetailsCacheEntry>();

// מנגנון דדופ עבור בקשות Prefetch - שמירת Promise פעיל כדי למנוע fetch כפול בו-זמנית
const productDetailsPrefetchRequests = new Map<string, Promise<Product>>();

// פונקציה לניקוי רשומות מטמון שפג תוקפן של Product Details
function cleanupExpiredProductDetailsCache() {
  const now = Date.now();
  for (const [id, entry] of productDetailsCache.entries()) {
    if (entry.expiresAt <= now) {
      productDetailsCache.delete(id);
    }
  }
}

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
      search: params.search ?? null, // חיפוש טקסט
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

  // קבלת מוצר לפי ID עם מחירים מותאמים אישית + Caching
  static async getProductById(id: string, signal?: AbortSignal): Promise<Product> {
    try {
      // בדיקה ראשונה: האם הנתונים נמצאים בcache ותקפים?
      const cachedEntry = productDetailsCache.get(id);
      if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
        // ✅ נתונים תקפים בcache - החזר מיד
        return cachedEntry.data;
      }

      // בדיקה שנייה: האם כבר יש בקשה פעילה עבור אותו ID?
      // (דדופ - למנוע fetch כפול בו-זמנית)
      if (productDetailsPrefetchRequests.has(id)) {
        return productDetailsPrefetchRequests.get(id)!;
      }

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

      const data = await response.json();
      
      // 💾 שמירה בcache עם זמן תפוגה
      productDetailsCache.set(id, {
        data,
        expiresAt: Date.now() + PRODUCT_DETAILS_CACHE_TTL_MS
      });
      
      console.log('ProductService - received product with pricing:', data); // דיבג
      return data;
    } catch (error) {
      // אם זה AbortError (ביטול בקשה), אל תדפיס שגיאה בקונסול - זה תקין
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  // 🚀 Prefetch Product Details - קרא ל-API כשהמשתמש מעביר עליה את העכבר
  // מטרה: להעלות את הנתונים לcache ולBundle לפני שהמשתמש לוחץ
  // זה חוסך 200-500ms של TTFB בממוצע
  static preFetchProductById(id: string): void {
    // בדיקה: האם כבר בcache או בطריק?
    if (productDetailsCache.has(id) || productDetailsPrefetchRequests.has(id)) {
      return; // כבר יש לנו את זה, לא צריך לrefetch
    }

    // יצירת Promise ללא signal (Prefetch לא צריך להיות cancellable)
    const prefetchPromise = this.getProductById(id);
    
    // שמירה בdedupe map
    productDetailsPrefetchRequests.set(id, prefetchPromise);
    
    // ניקוי מה-dedupe map כשהבקשה תסתיים (בהצלחה או בשגיאה)
    prefetchPromise
      .then(() => {
        productDetailsPrefetchRequests.delete(id);
      })
      .catch(() => {
        productDetailsPrefetchRequests.delete(id);
        // לא חשוב אם prefetch נכשל - זה רק אופטימיזציה
      });
  }

  // קבלת מוצרים קשורים למוצר ספציפי (endpoint ייעודי בשרת)
  static async getRelatedProducts(productId: string, limit: number = 4): Promise<Product[]> {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(
        `${API_BASE_URL}/products/${productId}/related?limit=${limit}`, 
        { headers }
      );

      if (!response.ok) {
        let msg = `HTTP error! status: ${response.status}`;
        try {
          const json = await response.json();
          if (json && typeof json === 'object' && json.message) msg = String(json.message);
        } catch (e) {}
        throw new ApiError(response.status, msg);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching related products:', error);
      throw error;
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

    const searchParams = new URLSearchParams()
    if (params.priceMin != null) searchParams.set('priceMin', String(params.priceMin))
    if (params.priceMax != null) searchParams.set('priceMax', String(params.priceMax))
    if (params.sort) searchParams.set('sort', params.sort)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.categoryIds && params.categoryIds.length > 0) searchParams.set('categoryIds', params.categoryIds.join(','))
    if (params.search && params.search.trim()) searchParams.set('search', params.search.trim())
    if (params.attributes) {
      Object.entries(params.attributes).forEach(([key, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          searchParams.set(key, values.join(','))
        }
      })
    }

    const url = `${API_BASE_URL}/products/filter${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

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

  // ============================================================================
  // Autocomplete - חיפוש מוצרים בזמן אמת
  // ============================================================================

  /**
   * חיפוש מוצרים להשלמה אוטומטית (autocomplete)
   * מחזיר רשימת הצעות מוצרים בהתאם לשאילתת החיפוש
   * 
   * @param query - טקסט החיפוש (מינימום 2 תווים)
   * @param limit - מספר תוצאות מקסימלי (ברירת מחדל: 8)
   * @param signal - AbortSignal לביטול הבקשה
   * @returns רשימת הצעות מוצרים
   */
  static async autocomplete(
    query: string,
    limit: number = 8,
    signal?: AbortSignal
  ): Promise<ProductSuggestion[]> {
    // מינימום 2 תווים לחיפוש
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: String(limit),
      });

      const response = await fetch(
        `${API_BASE_URL}/products/autocomplete?${params.toString()}`,
        { signal }
      );

      if (!response.ok) {
        let msg = `HTTP error! status: ${response.status}`;
        try {
          const json = await response.json();
          if (json && typeof json === 'object' && json.message) {
            msg = String(json.message);
          }
        } catch (e) {
          // ignore JSON parse errors
        }
        throw new ApiError(response.status, msg);
      }

      const result: AutocompleteResponse = await response.json();
      return result.data || [];
    } catch (error) {
      // ביטול בקשה (AbortError) - לא שגיאה אמיתית
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error('Error in autocomplete:', error);
      throw error;
    }
  }
}
