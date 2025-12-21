// Service לניהול מוצרים (Products Management)
// מטרת הקובץ: טיפול בכל הקריאות ל-API הקשורות לניהול מוצרים
// Phase 3: גרסה מקוצרת - רק getProducts + deleteProduct

import type { Product } from '../types/Product';
import type { FetchProductsParams, FetchProductsResponse } from '../store/slices/productsManagementSlice';
import type { ProductFormData } from '../schemas/productFormSchema';
import { ApiError } from '../utils/ApiError';
import { API_BASE_URL } from '../config/api'; // 🔧 FIX: שימוש ב-API_BASE_URL המרכזי

/**
 * Service לניהול מוצרים
 * Phase 3: רק 2 פונקציות - getProducts + deleteProduct
 * Phase 5: יתווספו createProduct, updateProduct, duplicateProduct, restoreProduct, uploadImages
 */
class ProductManagementService {
  private baseUrl = `${API_BASE_URL}/products`; // 🔧 FIX: שימוש ב-URL המלא של Backend

  /**
   * Helper: keep image objects as-is (no conversion to strings)
   */
  private normalizeImages(images: ProductFormData['images']): any[] {
    if (!images || images.length === 0) {
      return [];
    }

    // 🔧 FIX: השרת מצפה ל-array of objects (url, public_id, format, etc.)
    return images.map((img) => {
      if (typeof img === 'string') {
        // אם זה מחרוזת, המר לאובייקט
        return { url: img, public_id: '', format: '' };
      }
      // נקה שדות מונגו (_id, __v) שהשרת לא מצפה להם
      const { _id, __v, ...cleanImg } = img as any;
      return cleanImg;
    });
  }

  /**
   * Helper: normalize SKUs for server with attributes
   * Server expects: { sku, name, price, stockQuantity, color?, attributes?: {...} }
   * Form sends: { sku, name, price, stockQuantity, color?, attributes?: {...} }
   */
  private normalizeSKUs(skus: ProductFormData['skus']): any[] {
    if (!skus || skus.length === 0) {
      return [];
    }

    return skus.map((sku) => {
      const { attributes, images, ...rest } = sku;
      
      // נרמול תמונות - שמור אובייקטים כמו שהם אבל נקה _id ו-__v
      const normalizedImages = images && Array.isArray(images)
        ? images.map(img => {
            if (typeof img === 'string') {
              return { url: img, public_id: '', format: '' };
            }
            // נקה שדות מונגו (_id, __v)
            const { _id, __v, ...cleanImg } = img as any;
            return cleanImg;
          })
        : [];
      
      // שדות שטוחים (color, size) - לא attributes מקונן
      // השרת מצפה לשדות שטוחים ישירות
      const normalizedSku: any = {
        ...rest,
        // תמונות כ-array של objects
        images: normalizedImages,
      };

      // אם יש attributes - הוסף אותן ללודא נקודה אחידה לשרת
      if (attributes && Object.keys(attributes || {}).length > 0) {
        normalizedSku.attributes = attributes;
      }
      
      // נקה null values
      return this.cleanPayload(normalizedSku);
    });
  }

  /**
   * Helper: remove null/undefined values from object
   * Server validation fails on null values
   */
  private cleanPayload(obj: any): any {
    const cleaned: any = {};
    
    for (const key in obj) {
      const value = obj[key];
      
      // דלג על null ו-undefined
      if (value === null || value === undefined) {
        continue;
      }
      
      // אם זה object (לא array), נקה רקורסיבית
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = this.cleanPayload(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }

  // ==========================================
  // Helper Methods - מתודות עזר
  // ==========================================

  /**
   * טיפול בתגובות API
   * בודק אם התגובה תקינה ומחזיר את הנתונים או שגיאה
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'שגיאת רשת' }));
      const message = errorData?.message || response.statusText || `HTTP ${response.status}`;
      
      console.error('🔴 [API Error]', {
        status: response.status,
        url: response.url,
        message,
        errorData,
        errors: errorData?.errors || []
      });
      
      // 🔧 FIX: הדפס כל שגיאה בנפרד לקריאות טובה יותר
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        console.error('📋 שגיאות פירוט:');
        errorData.errors.forEach((err: any, index: number) => {
          console.error(`  ${index + 1}. ${err.field || 'unknown'}: ${err.message || JSON.stringify(err)}`);
        });
      }
      
      throw new ApiError(response.status, message, undefined, errorData);
    }

    const data = await response.json();
    return data;
  }

  /**
   * ביצוע בקשות עם לוגיקת retry
   * מנסה שוב אם הבקשה נכשלת (עד 2 פעמים)
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // הוספת Authorization token מ-localStorage
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // העתקת headers קיימים
        if (options.headers) {
          const existingHeaders = options.headers as Record<string, string>;
          Object.assign(headers, existingHeaders);
        }
        
        // הוספת token אם קיים
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        const response = await fetch(url, {
          ...options,
          headers,
        });

        return await this.handleResponse<T>(response);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        // המתנה לפני ניסיון חוזר (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('חרג ממספר הניסיונות המקסימלי');
  }

  /**
   * בניית query string מפרמטרים
   */
  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    
    return searchParams.toString();
  }

  // ==========================================
  // Product Management Methods - מתודות ניהול מוצרים
  // ==========================================

  /**
   * קבלת רשימת מוצרים עם פילטרים ו-pagination (cursor-based)
   * Phase 5.0: שדרוג - שימוש ב-endpoint חדש עם server-side filtering
   * 
   * @param params - פרמטרים לפילטור, מיון ועימוד
   * @returns רשימת מוצרים + מידע על pagination
   */
  async getProducts(params: FetchProductsParams = {}): Promise<FetchProductsResponse> {
    try {
      // בניית query string
      const queryParams: Record<string, any> = {};
      
      // פילטרים - עוברים לשרת
      if (params.filters) {
        if (params.filters.search) queryParams.search = params.filters.search;
        if (params.filters.categoryId) queryParams.categoryId = params.filters.categoryId;
        if (params.filters.isActive !== undefined) queryParams.isActive = params.filters.isActive;
        if (params.filters.stockStatus && params.filters.stockStatus !== 'all') {
          queryParams.stockStatus = params.filters.stockStatus;
        }
        // minPrice ו-maxPrice יתווספו בעתיד (Phase 6)
      }
      
      // מיון - עובר לשרת
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortDirection) queryParams.sortDirection = params.sortDirection;
      
      // pagination - cursor-based
      if (params.cursor) queryParams.cursor = params.cursor;
      if (params.limit) queryParams.limit = params.limit;
      
      const queryString = this.buildQueryString(queryParams);
      
      // Phase 5.0: שימוש ב-endpoint חדש - /api/products/admin
      // הendpoint החדש מחזיר: { success, data, cursor, hasMore, total }
      const url = `${this.baseUrl}/admin${queryString ? `?${queryString}` : ''}`;
      
      // קריאה לendpoint החדש
      const response = await this.makeRequest<{
        success: boolean;
        data: Product[];
        cursor: string | null;
        hasMore: boolean;
        total: number;
      }>(url, {
        method: 'GET',
      });
      
      // החזרת הנתונים בפורמט שה-Redux מצפה לו
      return {
        products: response.data,
        cursor: response.cursor,
        hasMore: response.hasMore,
        total: response.total,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      throw new ApiError(500, 'שגיאה בטעינת המוצרים', message);
    }
  }

  /**
   * מחיקת מוצר (soft delete)
   * Phase 3: פונקציה מינימלית למחיקה
   * 
   * @param productId - מזהה המוצר למחיקה
   * @returns הצלחה/כשלון
   */
  async deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!productId) {
        throw new ApiError(400, 'מזהה מוצר חסר');
      }
      
      const response = await this.makeRequest<{ success: boolean; message: string }>(
        `${this.baseUrl}/${productId}/soft`,
        {
          method: 'DELETE',
        }
      );
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      throw new ApiError(500, 'שגיאה במחיקת המוצר', message);
    }
  }

  /**
   * יצירת מוצר חדש
   * Phase 6.2: הוספה כחלק מהאינטגרציה עם ProductForm
   * 
   * @param productData - נתוני המוצר מהטופס
   * @returns המוצר שנוצר (כולל SKUs)
   */
  async createProduct(productData: ProductFormData): Promise<Product> {
    try {
      // בדיקת שדות חובה - name וגם basePrice (אבל לא אם basePrice=0)
      if (!productData.name || productData.name.trim() === '') {
        throw new ApiError(400, 'שם מוצר הוא שדה חובה');
      }
      if (productData.basePrice == null || isNaN(productData.basePrice) || productData.basePrice < 0) {
        throw new ApiError(400, 'מחיר בסיס חייב להיות מספר חיובי או 0');
      }
      
  const { skus, ...productFields } = productData;
      
      // תמיד נשתמש ב-/with-skus endpoint. גם כשאין SKUs נקבל מערך ריק -
      // השרת יודע ליצור SKU בסיס אוטומטית לפי כללי ה-service.
      const payload = this.cleanPayload({
        product: {
          ...productFields,
          images: this.normalizeImages(productFields.images),
          quantityInStock: productFields.stockQuantity ?? 0,
          sku: productFields.sku || undefined,
          lowStockThreshold: productFields.lowStockThreshold ?? 5,
        },
        skus: this.normalizeSKUs(skus), // יכול להיות []
      });

      console.log('📤 [createProduct] Sending payload to /with-skus:', {
        url: `${this.baseUrl}/with-skus`,
        productKeys: Object.keys(payload.product),
        skusCount: payload.skus.length,
      });

      const response = await this.makeRequest<
        | Product
        | { success: boolean; data: { product: Product; skus: any[] }; message?: string }
      >(
        `${this.baseUrl}/with-skus`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      // Normalize response: server may return either the raw product or a wrapper { success, data: { product, skus } }
      // החזרת אובייקט מוצר מלא כולל שורה skus כדי שה-UI יתעדכן מיד
      if (response && typeof response === 'object' && 'data' in response) {
        const payloadData: any = (response as any).data;
        const product = payloadData.product || payloadData;
        const skus = payloadData.skus || [];
        return { ...(product as any), skus } as Product;
      }

      return response as Product;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      throw new ApiError(500, 'שגיאה ביצירת המוצר', message);
    }
  }

  /**
   * עדכון מוצר קיים
   * Phase 6.2: הוספה כחלק מהאינטגרציה עם ProductForm
   * 
   * @param productId - מזהה המוצר לעדכון
   * @param productData - נתוני המוצר המעודכנים
   * @returns המוצר המעודכן (כולל SKUs)
   */
  async updateProduct(productId: string, productData: ProductFormData): Promise<Product> {
    try {
      if (!productId) {
        throw new ApiError(400, 'מזהה מוצר חסר');
      }
      
      // בדיקת שדות חובה - name וגם basePrice (אבל לא אם basePrice=0)
      if (!productData.name || productData.name.trim() === '') {
        throw new ApiError(400, 'שם מוצר הוא שדה חובה');
      }
      if (productData.basePrice == null || isNaN(productData.basePrice) || productData.basePrice < 0) {
        throw new ApiError(400, 'מחיר בסיס חייב להיות מספר חיובי או 0');
      }
      
      const { skus, ...productFields } = productData;
      const hasSkus = skus && Array.isArray(skus) && skus.length > 0;
      
      // 🔧 FIX: אם יש SKUs, משתמשים ב-/with-skus endpoint
      if (hasSkus) {
        const normalizedSkus = this.normalizeSKUs(skus);
        const payload = this.cleanPayload({
          product: {
            ...productFields,
            images: this.normalizeImages(productFields.images),
            quantityInStock: productFields.stockQuantity ?? 0,
            sku: productFields.sku || undefined,
            lowStockThreshold: productFields.lowStockThreshold ?? 5,
          },
          skus: normalizedSkus, // 🔧 FIX: שטח attributes
        });

        console.log('📤 [updateProduct] Sending payload:', {
          url: `${this.baseUrl}/${productId}/with-skus`,
          productKeys: Object.keys(payload.product),
          skusCount: payload.skus.length,
          firstSku: payload.skus[0],
          fullPayload: JSON.stringify(payload, null, 2)
        });

        const response = await this.makeRequest<
          | Product
          | { success: boolean; data: { product: Product; skus: any[] }; message?: string }
        >(
          `${this.baseUrl}/${productId}/with-skus`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );

        if (response && typeof response === 'object' && 'data' in response) {
          const payloadData: any = (response as any).data;
          const product = payloadData.product || payloadData;
          const skus = payloadData.skus || [];
          return { ...(product as any), skus } as Product;
        }

        return response as Product;
      } else {
        // אם אין SKUs, משתמשים ב-endpoint הרגיל
        const payload = this.cleanPayload({
          ...productFields,
          images: this.normalizeImages(productFields.images),
          quantityInStock: productFields.stockQuantity ?? 0,
          sku: productFields.sku || undefined,
          lowStockThreshold: productFields.lowStockThreshold ?? 5,
        });

        const response = await this.makeRequest<Product | { success: boolean; data: Product; message?: string }>(
          `${this.baseUrl}/${productId}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );

        return 'data' in response ? response.data : response;
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      throw new ApiError(500, 'שגיאה בעדכון המוצר', message);
    }
  }

  /**
   * שמירת SKUs בלבד עבור מוצר קיים (batch save)
   * שימושי ל-SKU inline inventory save כאשר רוצים לשמור רק את ה-SKUs מבלי לשלוח את כל שדות המוצר
   * Endpoint בשרת: PUT /api/products/:productId/with-skus
   */
  async saveProductSkus(productId: string, skus: ProductFormData['skus']): Promise<Product> {
    try {
      if (!productId) {
        throw new ApiError(400, 'מזהה מוצר חסר');
      }

      const normalizedSkus = this.normalizeSKUs(skus || []);

      const payload = this.cleanPayload({
        product: {}, // ניתן לשלוח אובייקט מוצר ריק - השרת מאפשר זאת בעדכון
        skus: normalizedSkus,
      });

      const response = await this.makeRequest<
        | Product
        | { success: boolean; data: { product: Product; skus: any[] }; message?: string }
      >(
        `${this.baseUrl}/${productId}/with-skus`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      );

      if (response && typeof response === 'object' && 'data' in response) {
        const payloadData: any = (response as any).data;
        const product = payloadData.product || payloadData;
        const skus = payloadData.skus || [];
        return { ...(product as any), skus } as Product;
      }

      return response as Product;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      throw new ApiError(500, 'שגיאה בשמירת SKUs', message);
    }
  }

  /**
   * שכפול מוצר קיים
   * Phase 6.2: הוספה כחלק מהאינטגרציה עם ProductForm
   * 
   * @param productId - מזהה המוצר לשכפול
   * @returns המוצר החדש (עותק)
   */
  async duplicateProduct(productId: string): Promise<Product> {
    try {
      if (!productId) {
        throw new ApiError(400, 'מזהה מוצר חסר');
      }
      
        const response = await this.makeRequest<
          | Product
          | { success: boolean; data: { product: Product; skus: any[] }; message?: string }
        >(
          `${this.baseUrl}/${productId}/duplicate`,
          {
            method: 'POST',
          }
        );

        if (response && typeof response === 'object' && 'data' in response) {
          const payloadData: any = (response as any).data;
          const product = payloadData.product || payloadData;
          const skus = payloadData.skus || [];
          return { ...(product as any), skus } as Product;
        }

        return response as Product;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      throw new ApiError(500, 'שגיאה בשכפול המוצר', message);
    }
  }

  /**
   * בדיקת זמינות קוד SKU
   * Phase 6.2: הוספה כחלק מהאינטגרציה עם ProductForm
   * 
   * @param sku - קוד SKU לבדיקה
   * @param excludeProductId - מזהה מוצר להחרגה (למקרה של עריכה)
   * @returns האם ה-SKU זמין (true) או כבר קיים (false)
   */
  async checkSkuAvailability(sku: string, excludeProductId?: string): Promise<boolean> {
    try {
      if (!sku || !sku.trim()) {
        throw new ApiError(400, 'קוד SKU חסר');
      }
      
      // בניית body לבקשת POST (השרת מצפה ל-POST ולא GET)
      const body: Record<string, any> = { sku };
      if (excludeProductId) {
        body.excludeProductId = excludeProductId;
      }
      
      const response = await this.makeRequest<{ success: boolean; available: boolean }>(
        `${this.baseUrl}/check-sku`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      
      return response.available;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      throw new ApiError(500, 'שגיאה בבדיקת זמינות SKU', message);
    }
  }

  // ==========================================
  // Image Upload Methods - העלאת תמונות
  // ==========================================

  /**
   * העלאת תמונות ל-Cloudinary עם מבנה Folders היררכי
   * Phase 1.4: הוספה כחלק מהאינטגרציה של Cloudinary Best Practices
   * 
   * @param files - קבצי התמונות להעלאה
   * @param options - אופציות העלאה (category, productId, sku, isVariant)
   * @returns מערך של אובייקטי תמונות (url, public_id, width, height, format)
   */
  async uploadImages(
    files: File[],
    options: {
      category?: string;
      productId?: string;
      sku?: string;
      isVariant?: boolean;
    } = {}
  ): Promise<Array<{
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
  }>> {
    try {
      // בדיקת תקינות - חייבים להיות קבצים
      if (!files || files.length === 0) {
        throw new ApiError(400, 'לא נבחרו קבצים להעלאה');
      }

      // בדיקת מקסימום קבצים (10 תמונות לפי הגדרות השרת)
      if (files.length > 10) {
        throw new ApiError(400, 'ניתן להעלות עד 10 תמונות בו זמנית');
      }

      // בניית FormData עם הקבצים והפרמטרים
      const formData = new FormData();
      
      // הוספת קבצים
      files.forEach((file) => {
        formData.append('images', file);
      });

      // הוספת פרמטרים נוספים
      if (options.category) {
        formData.append('category', options.category);
      }
      if (options.productId) {
        formData.append('productId', options.productId);
      }
      if (options.sku) {
        formData.append('sku', options.sku);
      }
      if (options.isVariant !== undefined) {
        formData.append('isVariant', String(options.isVariant));
      }

      // קריאה ל-endpoint העלאת תמונות
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // שים לב: לא מוסיפים Content-Type כי הדפדפן יוסיף אוטומטית את multipart/form-data עם boundary
      const response = await fetch(`${this.baseUrl}/upload-images`, {
        method: 'POST',
        headers,
        body: formData,
      });

      // טיפול בתגובה
      const result = await this.handleResponse<{
        success: boolean;
        message: string;
        data: Array<{
          url: string;
          public_id: string;
          width: number;
          height: number;
          format: string;
        }>;
      }>(response);

      return result.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      throw new ApiError(500, 'שגיאה בהעלאת התמונות', message);
    }
  }

  // ==========================================
  // שחזור מוצר שנמחק (Soft Delete Restore)
  // ==========================================

  /**
   * שחזור מוצר שנמחק (soft delete)
   * מעדכן את isActive ל-true עבור המוצר וכל ה-SKUs שלו
   * 
   * @param productId - מזהה המוצר לשחזור
   * @returns הצלחה/כשלון + הודעה
   */
  async restoreProduct(productId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!productId) {
        throw new ApiError(400, 'מזהה מוצר חסר');
      }
      
      // קריאה ל-endpoint שחזור בשרת
      const response = await this.makeRequest<{ success: boolean; message: string }>(
        `${this.baseUrl}/${productId}/restore`,
        {
          method: 'POST',
        }
      );
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      throw new ApiError(500, 'שגיאה בשחזור המוצר', message);
    }
  }

  // ==========================================
  // Phase 7+: פונקציות נוספות שיתווספו בעתיד
  // ==========================================
  
  /*
   * פונקציות שיתווספו בשלבים מאוחרים יותר:
   * 
   * - deleteImage(publicId): מחיקת תמונה מ-Cloudinary
   * - bulkUpdateStatus(productIds, isActive): עדכון סטטוס מרובה
   * - exportProducts(filters): ייצוא מוצרים ל-CSV/Excel
   */
}

// ייצוא singleton instance
const productManagementService = new ProductManagementService();
export default productManagementService;
