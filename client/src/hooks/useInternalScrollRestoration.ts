// useInternalScrollRestoration.ts - Hook מותאם לשחזור מיקום גלילה של אלמנטים פנימיים
// מטפל באלמנטים עם data-scroll-container שיש להם overflow/scrolling

import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Custom Hook לשחזור גלילה פנימית
 * ========================================
 * אחראי על:
 * 1. זיהוי אלמנטים עם data-scroll-container
 * 2. שמירת מיקום scrollTop עבור כל אלמנט
 * 3. שחזור המיקום בעת ניווט POP (back/forward)
 * 4. גלילה לראש עבור אלמנטים בעת ניווט PUSH
 */
export const useInternalScrollRestoration = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  // שמירת מיקומי גלילה במפה לפי location.key
  const scrollPositions = useRef<Map<string, Map<string, number>>>(new Map());

  useEffect(() => {
    // מפתח ייחודי לנתיב הנוכחי
    const locationKey = location.key || 'default';

    // איתור כל האלמנטים עם data-scroll-container
    const scrollContainers = document.querySelectorAll('[data-scroll-container]');

    if (navigationType === 'POP') {
      // ניווט אחורה/קדימה - שחזור מיקומים שמורים
      // המתנה קצרה לאחר render מלא של התוכן
      requestAnimationFrame(() => {
        const savedPositions = scrollPositions.current.get(locationKey);
        
        if (savedPositions) {
          scrollContainers.forEach((container) => {
            const containerId = (container as HTMLElement).dataset.scrollContainer;
            if (containerId) {
              const savedPosition = savedPositions.get(containerId);
              if (savedPosition !== undefined) {
                // שחזור מיקום הגלילה השמור
                (container as HTMLElement).scrollTop = savedPosition;
              }
            }
          });
        }
      });
    } else {
      // ניווט חדש (PUSH/REPLACE) - גלילה לראש
      requestAnimationFrame(() => {
        scrollContainers.forEach((container) => {
          (container as HTMLElement).scrollTop = 0;
        });
      });
    }

    // שמירת מיקומים נוכחיים לפני יציאה מהדף
    return () => {
      const positionsMap = new Map<string, number>();
      
      scrollContainers.forEach((container) => {
        const containerId = (container as HTMLElement).dataset.scrollContainer;
        if (containerId) {
          // שמירת המיקום הנוכחי
          positionsMap.set(containerId, (container as HTMLElement).scrollTop);
        }
      });

      // שמירה במפה הגלובלית
      if (positionsMap.size > 0) {
        scrollPositions.current.set(locationKey, positionsMap);
      }
    };
  }, [location, navigationType]);
};
