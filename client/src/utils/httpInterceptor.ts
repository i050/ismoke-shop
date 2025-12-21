import { getToken } from '../utils/tokenUtils'

/**
 * HTTP Interceptor - מוסיף Authorization header לכל בקשה
 */
class HttpInterceptor {
  private originalFetch: typeof fetch
  // נתיבים שלא צריכים Authorization header
  private publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/auth/forgot-password',
    '/api/auth/reset-password'
  ]

  constructor() {
    console.log('🔧 [HTTP Interceptor] Initializing...');
    this.originalFetch = window.fetch.bind(window)
    this.setupInterceptors()
  }

  private setupInterceptors() {
    // החלפת fetch המקורי ב-interceptor
    const boundInterceptFetch = this.interceptFetch.bind(this);
    window.fetch = boundInterceptFetch as typeof fetch;
    console.log('✅ [HTTP Interceptor] Successfully installed. window.fetch replaced.');
  }

  private async interceptFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    console.debug('[HTTP Interceptor] interceptFetch called for:', url);
    
    // בדיקה אם הנתיב הוא public (לא צריך Authorization header)
    if (this.isPublicPath(input)) {
      console.debug('[HTTP Interceptor] Public path detected, skipping auth header');
      // לבקשות public - השתמש ב-fetch המקורי ללא Authorization header
      try {
        const response = await this.originalFetch.call(window, input, init)

        // טיפול בתגובות 401 (Unauthorized)
        if (response.status === 401) {
          console.warn('Unauthorized request - token might be expired')
        }

        return response
      } catch (error) {
        // אם זו שגיאת ביטול (AbortError) — זה צפוי בגלל ביטול בקשות מרובות בממשק
        // אל נדפיס את השגיאה בקונסול כדי לא לגרום לבלבול
        if (error instanceof Error && error.name === 'AbortError') {
          throw error
        }
        console.error('Fetch error:', error)
        throw error
      }
    }

    // לבקשות מוגנות - הוסף Authorization header
    console.debug('[HTTP Interceptor] Protected path detected, adding auth header');
    const modifiedInit = this.addAuthHeader(init)

    try {
      // ביצוע הבקשה עם ה-header - שימוש ב-call כדי לשמור על this binding נכון
      if (typeof input === 'string' && input.includes('/admin/warnings')) {
        const headers = modifiedInit?.headers;
        const headersObj = headers instanceof Headers 
          ? Object.fromEntries(headers.entries())
          : headers || {};
        console.debug('[HTTP Interceptor] Sending request to /admin/warnings with headers:', headersObj);
      }
      const response = await this.originalFetch(input, modifiedInit)

      // טיפול בתגובות 401 (Unauthorized)
      if (response.status === 401) {
        // כאן אפשר להוסיף לוגיקה לרענון טוקן אוטומטי
        console.warn('[HTTP Interceptor] 401 Unauthorized - token might be expired')
      }
      if (typeof input === 'string' && input.includes('/admin/warnings')) {
        console.debug('[HTTP Interceptor] Response from /admin/warnings status:', response.status);
      }

      return response
    } catch (error) {
      // באותה צורת טיפול - השתק AbortError כדי שלא ידפיס בקונסול
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }
      console.error('Fetch error:', error)
      throw error
    }
  }

  private isPublicPath(input: RequestInfo | URL): boolean {
    if (typeof input === 'string') {
      return this.publicPaths.some(path => input.includes(path))
    } else if (input instanceof URL) {
      return this.publicPaths.some(path => input.pathname.includes(path))
    } else if (input instanceof Request) {
      return this.publicPaths.some(path => input.url.includes(path))
    }
    return false
  }

  private addAuthHeader(init?: RequestInit): RequestInit | undefined {
    const token = getToken()

    console.debug('[HTTP Interceptor] addAuthHeader called. Token exists:', !!token);

    if (!token) {
      console.warn('[HTTP Interceptor] No token found in localStorage');
      return init
    }

    // יצירת headers חדשים או עדכון קיימים
    const headers = new Headers(init?.headers)

    // הוספת Authorization header
    headers.set('Authorization', `Bearer ${token}`)

    console.debug('[HTTP Interceptor] Added Authorization header. Token preview:', token.substring(0, 20) + '...');
    console.debug('[HTTP Interceptor] All headers:', Object.fromEntries(headers.entries()));

    return {
      ...init,
      headers
    }
  }

  /**
   * שחזור fetch המקורי (למשל לטסטים)
   */
  restore() {
    window.fetch = this.originalFetch
  }
}

// יצירת instance יחיד של ה-interceptor
const httpInterceptor = new HttpInterceptor()

export default httpInterceptor
