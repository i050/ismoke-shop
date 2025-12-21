/**
 * useResponsive Hook
 * ==================
 * Hook מרכזי לזיהוי גודל מסך ומצב רספונסיבי
 * 
 * שימוש:
 * const { isMobile, isTablet, isDesktop, orientation } = useResponsive();
 * 
 * @returns ResponsiveState - אובייקט עם מצב המסך הנוכחי
 */

import { useState, useEffect, useCallback } from 'react';

// ==================== Breakpoints ====================
// ערכים אלו תואמים ל-CSS variables ב-design-tokens.css
export const BREAKPOINTS = {
  mobile: 480,       // עד 480px - מובייל
  tablet: 768,       // עד 768px - טאבלט
  laptop: 1024,      // עד 1024px - לפטופ
  desktop: 1200,     // עד 1200px - דסקטופ
  largeDesktop: 1440 // מעל 1440px - מסכים גדולים (4K, ultrawide)
} as const;

// ==================== Types ====================
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveState {
  /** האם המסך בגודל מובייל (עד 480px) */
  isMobile: boolean;
  /** האם המסך בגודל טאבלט (481-768px) */
  isTablet: boolean;
  /** האם המסך בגודל לפטופ (769-1024px) */
  isLaptop: boolean;
  /** האם המסך בגודל דסקטופ (1025-1440px) */
  isDesktop: boolean;
  /** האם המסך בגודל דסקטופ גדול (מעל 1440px) */
  isLargeDesktop: boolean;
  /** האם המסך קטן מ-768px (מובייל או טאבלט) */
  isMobileOrTablet: boolean;
  /** האם זה מכשיר מגע */
  isTouchDevice: boolean;
  /** כיוון המסך - לאורך או לרוחב (חשוב למובייל) */
  orientation: Orientation;
  /** רוחב המסך הנוכחי בפיקסלים */
  width: number;
  /** גובה המסך הנוכחי בפיקסלים */
  height: number;
}

// ==================== Helper Functions ====================

/**
 * חישוב מצב המסך הנוכחי
 * פונקציה נפרדת לשימוש חוזר ולאתחול
 */
function getResponsiveState(): ResponsiveState {
  // בדיקה אם אנחנו בסביבת דפדפן (לא SSR)
  const isClient = typeof window !== 'undefined';
  
  // ברירת מחדל לדסקטופ אם לא בדפדפן
  const width = isClient ? window.innerWidth : 1200;
  const height = isClient ? window.innerHeight : 800;
  
  // זיהוי מכשיר מגע
  const isTouchDevice = isClient && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // זיהוי כיוון המסך - חשוב למובייל ולגלריות תמונות
  const orientation: Orientation = isClient && 
    window.matchMedia('(orientation: portrait)').matches 
      ? 'portrait' 
      : 'landscape';

  // חישוב מצבי המסך
  const isMobile = width <= BREAKPOINTS.mobile;
  const isTablet = width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet;
  const isLaptop = width > BREAKPOINTS.tablet && width <= BREAKPOINTS.laptop;
  const isDesktop = width > BREAKPOINTS.laptop && width <= BREAKPOINTS.largeDesktop;
  const isLargeDesktop = width > BREAKPOINTS.largeDesktop;

  return {
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isLargeDesktop,
    isMobileOrTablet: isMobile || isTablet,
    isTouchDevice,
    orientation,
    width,
    height
  };
}

// ==================== Hook ====================

/**
 * useResponsive Hook
 * 
 * מספק מידע על גודל המסך הנוכחי עם debounce לביצועים אופטימליים
 * 
 * @example
 * ```tsx
 * const { isMobile, isDesktop, orientation } = useResponsive();
 * 
 * return (
 *   <div className={isMobile ? styles.mobileLayout : styles.desktopLayout}>
 *     {isDesktop && <Sidebar />}
 *     {orientation === 'landscape' && <WideGallery />}
 *     <MainContent />
 *   </div>
 * );
 * ```
 */
export const useResponsive = (): ResponsiveState => {
  // אתחול עם המצב הנוכחי
  const [state, setState] = useState<ResponsiveState>(() => getResponsiveState());

  // פונקציית עדכון עם useCallback למניעת יצירה מחדש
  const handleResize = useCallback(() => {
    setState(getResponsiveState());
  }, []);

  useEffect(() => {
    // משתנה לשמירת ה-timeout ID
    let timeoutId: ReturnType<typeof setTimeout>;
    
    /**
     * Debounced resize handler
     * מונע עדכונים מרובים בזמן גרירת חלון
     * 150ms הוא איזון טוב בין תגובתיות לביצועים
     */
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    // האזנה גם לשינוי orientation (חשוב למובייל)
    const orientationHandler = () => handleResize();

    // הוספת event listeners
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', orientationHandler);
    
    // Cleanup - הסרת listeners וביטול timeout
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', orientationHandler);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  return state;
};

// ייצוא ברירת מחדל
export default useResponsive;
