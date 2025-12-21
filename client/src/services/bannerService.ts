import { ApiError } from '../utils/ApiError';
import { getToken } from '../utils/tokenUtils';
import { API_URL } from '../config/api';

// ============================================================================
// Banner Service - שירות לניהול באנרים בצד הלקוח
// ============================================================================

const API_BASE_URL = API_URL;

// ============================================================================
// Interfaces & Types
// ============================================================================

/**
 * Interface עבור באנר בצד הלקוח
 */
export interface Banner {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  /**
   * צבעי טקסט ורקע מותאמים אישית עבור אלמנטים שונים בבאנר (hex 6 תווים) או null.
   * כל שדה שווה ל-null משתמש ב-fallback מהמערכת (CSS variables).
   */
  titleColor?: string | null; // צבע כותרת הבאנר
  descriptionColor?: string | null; // צבע תיאור הבאנר
  ctaTextColor?: string | null; // צבע טקסט כפתור ה-CTA
  ctaBackgroundColor?: string | null; // צבע רקע כפתור ה-CTA
  // עוצמת ה-overlay כאחוז (0..100)
  overlayOpacity?: number;
  // גדלי פונטים מותאמים אישית (design tokens)
  titleFontSize?: string | null;
  descriptionFontSize?: string | null;
  ctaFontSize?: string | null;
  ctaText?: string;
  ctaLink?: string;
  order: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  clickCount?: number;
  impressionCount?: number;
  version?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface לתגובת שרת
 */
export interface BannerResponse {
  success: boolean;
  message?: string;
  data?: Banner | Banner[];
  count?: number;
}

/**
 * Interface לנתוני יצירה/עדכון של באנר
 */
export interface BannerFormData {
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  /**
   * שדות צבע אופציונליים - ניתן להעביר כ-hex (לדוגמה '#ffffff') או null לאיפוס.
   */
  titleColor?: string | null; // צבע כותרת
  descriptionColor?: string | null; // צבע תיאור
  ctaTextColor?: string | null; // צבע טקסט CTA
  ctaBackgroundColor?: string | null; // צבע רקע CTA
  // גדלי פונטים (design tokens: xs|sm|base|lg|xl|2xl|3xl)
  titleFontSize?: string | null;
  descriptionFontSize?: string | null;
  ctaFontSize?: string | null;
  ctaText?: string;
  ctaLink?: string;
  order?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  // עוצמת overlay להחזרה לשרת (אחוז 0..100)
  overlayOpacity?: number;
}

// ============================================================================
// Cache Management - TTL דינמי
// ============================================================================

const CACHE_KEY = 'banners_active';
const CACHE_TTL_NORMAL = 5 * 60 * 1000; // 5 דקות
const CACHE_TTL_SHORT = 30 * 1000; // 30 שניות
const TRANSITION_WINDOW = 10 * 60 * 1000; // 10 דקות

/**
 * מחשב TTL דינמי בהתאם לקרבת תאריכי מעבר
 * @param banners - מערך באנרים
 * @returns TTL במילישניות
 */
function calculateDynamicTTL(banners: Banner[]): number {
  const now = new Date().getTime();
  
  // בדיקה אם יש באנרים שעומדים להתחיל/להסתיים בקרוב
  const hasUpcomingTransition = banners.some(banner => {
    if (banner.startDate) {
      const startTime = new Date(banner.startDate).getTime();
      if (startTime - now < TRANSITION_WINDOW && startTime > now) {
        return true; // באנר עומד להתחיל בקרוב
      }
    }
    
    if (banner.endDate) {
      const endTime = new Date(banner.endDate).getTime();
      if (endTime - now < TRANSITION_WINDOW && endTime > now) {
        return true; // באנר עומד להסתיים בקרוב
      }
    }
    
    return false;
  });
  
  return hasUpcomingTransition ? CACHE_TTL_SHORT : CACHE_TTL_NORMAL;
}

/**
 * שמירת באנרים ב-cache עם timestamp
 * @param banners - מערך באנרים לשמירה
 */
function setCachedBanners(banners: Banner[]): void {
  try {
    const cacheData = {
      data: banners,
      timestamp: Date.now(),
      ttl: calculateDynamicTTL(banners),
    };
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache banners:', error);
  }
}

/**
 * קבלת באנרים מה-cache (אם עדיין תקפים)
 * @returns מערך באנרים או null
 */
function getCachedBanners(): Banner[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;
    
    // בדיקה אם ה-cache עדיין תקף
    if (age < cacheData.ttl) {
      return cacheData.data;
    }
    
    // Cache לא תקף - נקה אותו
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.warn('Failed to read cached banners:', error);
    return null;
  }
}

/**
 * ניקוי cache של באנרים
 */
function clearBannersCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear banners cache:', error);
  }
}

// ============================================================================
// Debounced Tracking - מניעת ספירת יתר
// ============================================================================

/**
 * מפה לשמירת timeouts של tracking
 */
const trackingTimeouts = new Map<string, NodeJS.Timeout>();

/**
 * פונקציה debounced לטראקינג
 * @param bannerId - מזהה הבאנר
 * @param trackFn - פונקציית הטראקינג המקורית
 * @param delay - עיכוב במילישניות
 */
function debouncedTrack(
  bannerId: string,
  trackFn: () => Promise<void>,
  delay: number = 1000
): void {
  // ביטול timeout קודם (אם קיים)
  const existingTimeout = trackingTimeouts.get(bannerId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }
  
  // הגדרת timeout חדש
  const newTimeout = setTimeout(() => {
    trackFn();
    trackingTimeouts.delete(bannerId);
  }, delay);
  
  trackingTimeouts.set(bannerId, newTimeout);
}

// ============================================================================
// Public API - ציבורי (ללא אימות)
// ============================================================================

/**
 * קבלת באנרים פעילים ל-Hero Carousel
 * תומך ב-cache עם TTL דינמי
 */
export async function getActiveBanners(): Promise<Banner[]> {
  try {
    // נסה לקבל מה-cache קודם
    const cached = getCachedBanners();
    if (cached) {
      return cached;
    }
    
    // אין cache תקף - שלוף מהשרת
    const response = await fetch(`${API_BASE_URL}/banners`);
    
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to fetch banners');
    }
    
    const result: BannerResponse = await response.json();
    
    if (!result.success || !Array.isArray(result.data)) {
      throw new ApiError(500, 'Invalid response format');
    }
    
    const banners = result.data as Banner[];
    
    // שמור ב-cache
    setCachedBanners(banners);
    
    return banners;
  } catch (error) {
    console.error('Error fetching active banners:', error);
    throw error;
  }
}

/**
 * דיווח על צפייה בבאנר (debounced)
 * @param bannerId - מזהה הבאנר
 */
export function trackImpression(bannerId: string): void {
  debouncedTrack(bannerId, async () => {
    try {
      await fetch(`${API_BASE_URL}/banners/${bannerId}/impression`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Tracking failures לא אמורים להפריע לזרימה
      console.debug('Impression tracking failed:', error);
    }
  });
}

/**
 * דיווח על קליק בבאנר
 * @param bannerId - מזהה הבאנר
 */
export async function trackClick(bannerId: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/banners/${bannerId}/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Tracking failures לא אמורים להפריע לזרימה
    console.debug('Click tracking failed:', error);
  }
}

// ============================================================================
// Admin API - דורש אימות
// ============================================================================

/**
 * קבלת token מה-localStorage
 */
function getAuthToken(): string | null {
  try {
    return getToken();
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * יצירת headers עם אימות
 */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * קבלת כל הבאנרים (Admin)
 */
export async function getAllBanners(): Promise<Banner[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/banners/all`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError(401, 'Unauthorized - please login');
      }
      throw new ApiError(response.status, 'Failed to fetch all banners');
    }
    
    const result: BannerResponse = await response.json();
    
    if (!result.success || !Array.isArray(result.data)) {
      throw new ApiError(500, 'Invalid response format');
    }
    
    return result.data as Banner[];
  } catch (error) {
    console.error('Error fetching all banners:', error);
    throw error;
  }
}

/**
 * יצירת באנר חדש (Admin)
 */
export async function createBanner(bannerData: BannerFormData): Promise<Banner> {
  try {
    const response = await fetch(`${API_BASE_URL}/banners`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bannerData),
    });
    
    const result: BannerResponse = await response.json();
    
    if (!response.ok) {
      if (response.status === 409) {
        throw new ApiError(409, 'באנר עם כותרת ותאריך זהים כבר קיים');
      }
      throw new ApiError(response.status, result.message || 'Failed to create banner');
    }
    
    // נקה cache כדי לכפות טעינה מחדש
    clearBannersCache();
    
    return result.data as Banner;
  } catch (error) {
    console.error('Error creating banner:', error);
    throw error;
  }
}

/**
 * עדכון באנר קיים (Admin)
 */
export async function updateBanner(
  bannerId: string,
  updates: Partial<BannerFormData>,
  expectedVersion?: number
): Promise<Banner> {
  try {
    const url = expectedVersion !== undefined
      ? `${API_BASE_URL}/banners/${bannerId}?expectedVersion=${expectedVersion}`
      : `${API_BASE_URL}/banners/${bannerId}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    
    const result: BannerResponse = await response.json();
    
    if (!response.ok) {
      if (response.status === 409) {
        throw new ApiError(409, 'הבאנר שונה על ידי משתמש אחר. אנא רענן את הדף.');
      }
      throw new ApiError(response.status, result.message || 'Failed to update banner');
    }
    
    // נקה cache
    clearBannersCache();
    
    return result.data as Banner;
  } catch (error) {
    console.error('Error updating banner:', error);
    throw error;
  }
}

/**
 * מחיקת באנר (Admin)
 */
export async function deleteBanner(bannerId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/banners/${bannerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const result: BannerResponse = await response.json();
      throw new ApiError(response.status, result.message || 'Failed to delete banner');
    }
    
    // נקה cache
    clearBannersCache();
  } catch (error) {
    console.error('Error deleting banner:', error);
    throw error;
  }
}

/**
 * שינוי סדר באנרים (Admin)
 */
export async function reorderBanners(bannerIds: string[]): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/banners/reorder`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ bannerIds }),
    });
    
    if (!response.ok) {
      const result: BannerResponse = await response.json();
      throw new ApiError(response.status, result.message || 'Failed to reorder banners');
    }
    
    // נקה cache
    clearBannersCache();
  } catch (error) {
    console.error('Error reordering banners:', error);
    throw error;
  }
}

/**
 * העלאת תמונת באנר (Admin)
 */
export async function uploadBannerImage(
  file: File,
  bannerId?: string
): Promise<{ url: string; publicId: string }> {
  try {
    const formData = new FormData();
    formData.append('image', file);
    if (bannerId) {
      formData.append('bannerId', bannerId);
    }
    
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/banners/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    
    const result: BannerResponse = await response.json();
    
    if (!response.ok) {
      throw new ApiError(response.status, result.message || 'Failed to upload image');
    }
    
    // החזרת התוצאה (מניח שה-server מחזיר את המבנה הנכון)
    return result.data as any as { url: string; publicId: string };
  } catch (error) {
    console.error('Error uploading banner image:', error);
    throw error;
  }
}

/**
 * ניקוי cache (לשימוש פנימי או לאחר logout)
 */
export function clearCache(): void {
  clearBannersCache();
}
