// ייבוא ספריות React הבסיסיות
import React, { useState, useRef, useEffect, useCallback } from 'react';
// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './Carousel.module.css';
import { Button } from '../Button';

// הגדרת הטיפוסים - מה ה-Carousel יכול לקבל כ-props
interface CarouselProps {
  children: React.ReactNode[];                            // רשימת הפריטים להצגה - חובה
  itemsToShow?: number;                                   // כמה פריטים להציג במקביל - אופציונלי
  itemsToScroll?: number;                                 // כמה פריטים לגלול בכל פעם - אופציונלי
  autoPlay?: boolean;                                     // האם לגלול אוטומטית - אופציונלי
  autoPlayInterval?: number;                              // מרווח זמן בין גלילות (מילישניות) - אופציונלי
  showArrows?: boolean;                                   // האם להציג כפתורי חץ - אופציונלי
  showDots?: boolean;                                     // האם להציג נקודות ניווט - אופציונלי
  infinite?: boolean;                                     // האם גלילה אינסופית - אופציונלי
  responsive?: boolean;                                   // האם להתאים למסכים שונים - אופציונלי
  swipeEnabled?: boolean;                                 // האם לאפשר גרירה/החלקה - אופציונלי
  swipeThreshold?: number;                                // מינימום פיקסלים לקיים גרירה - אופציונלי
  rows?: number;                                          // כמה שורות להציג במקביל (1 = רגיל, 2+ = גריד) - אופציונלי
  className?: string;                                     // קלאס נוסף - אופציונלי
}

// הגדרת הקומפוננטה עצמה + destructuring של ה-props + ערכי ברירת מחדל
const Carousel: React.FC<CarouselProps> = ({
  children,
  itemsToShow = 1,             // ברירת מחדל: פריט אחד במקביל
  itemsToScroll = 1,           // ברירת מחדל: גלילה של פריט אחד
  autoPlay = false,            // ברירת מחדל: ללא גלילה אוטומטית
  autoPlayInterval = 3000,     // ברירת מחדל: 3 שניות
  showArrows = false,          // ברירת מחדל: ללא חצים
  showDots = false,            // ברירת מחדל: ללא נקודות
  infinite = true,             // ברירת מחדל: גלילה אינסופית
  responsive = true,           // ברירת מחדל: רספונסיבי
  swipeEnabled = true,         // ברירת מחדל: גרירה מופעלת
  swipeThreshold = 50,         // ברירת מחדל: 50 פיקסלים
  rows = 1,                    // ברירת מחדל: שורה אחת (קרוסלה רגילה)
  className = ''               // ברירת מחדל: ללא קלאס נוסף
}) => {
  // State לניהול האינדקס הנוכחי
  const [currentIndex, setCurrentIndex] = useState(0);
  // Ref לגישה לאלמנט הקרוסלה
  const carouselRef = useRef<HTMLDivElement>(null);
  // Ref לניהול הטיימר של autoPlay
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // חישוב הערכים הרספונסיביים
  const [responsiveItemsToShow, setResponsiveItemsToShow] = useState(itemsToShow);
  
  // State לניהול הגרירה/החלקה
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // פונקציה לחישוב כמה פריטים להציג בהתאם לגודל המסך
  const calculateItemsToShow = useCallback(() => {
    if (!responsive || !carouselRef.current) return itemsToShow;
    
    const containerWidth = carouselRef.current.offsetWidth;
    if (containerWidth < 640) return 1;        // מובייל
    if (containerWidth < 768) return Math.min(2, itemsToShow);   // טאבלט קטן
    if (containerWidth < 1024) return Math.min(3, itemsToShow);  // טאבלט גדול
    return itemsToShow;                        // דסקטופ
  }, [itemsToShow, responsive]);

  // useEffect לטיפול ברספונסיביות
  useEffect(() => {
    const handleResize = () => {
      setResponsiveItemsToShow(calculateItemsToShow());
    };

    handleResize(); // חישוב ראשוני
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateItemsToShow]);

  // useEffect לטיפול ב-autoPlay
  const goToNext = useCallback(() => {
    if (infinite) {
      setCurrentIndex((prev) => (prev + itemsToScroll) % children.length);
    } else {
      setCurrentIndex((prev) => 
        Math.min(prev + itemsToScroll, children.length - responsiveItemsToShow)
      );
    }
  }, [infinite, itemsToScroll, children.length, responsiveItemsToShow]);

  useEffect(() => {
    if (autoPlay) {
      autoPlayRef.current = setInterval(() => {
        goToNext();
      }, autoPlayInterval);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [autoPlay, autoPlayInterval, goToNext]);

  // פונקציה למעבר לפריט הקודם
  // goToNext מוגדר באמצעות useCallback למניעת אזהרות ותזמון בטוח

  // פונקציה למעבר לפריט הקודם
  const goToPrevious = () => {
    if (infinite) {
      setCurrentIndex((prev) => 
        prev - itemsToScroll < 0 
          ? children.length - responsiveItemsToShow 
          : prev - itemsToScroll
      );
    } else {
      setCurrentIndex((prev) => Math.max(prev - itemsToScroll, 0));
    }
  };

  // פונקציה למעבר לאינדקס ספציפי
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // עצירת autoPlay בעת hover
  const handleMouseEnter = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
  };

  // הפעלת autoPlay מחדש כשיוצאים מ-hover
  const handleMouseLeave = () => {
    if (autoPlay) {
      autoPlayRef.current = setInterval(() => {
        goToNext();
      }, autoPlayInterval);
    }
  };

  // פונקציות טיפול בגרירה - עכבר
  // (גרירת עכבר הוסרה כרגע – אם נרצה נחזיר בהמשך)

  // פונקציות טיפול בגרירה - מגע
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeEnabled) return;
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeEnabled || !isDragging) return;
    const x = e.touches[0].clientX;
    const offset = x - startX;
    setDragOffset(offset);
  };

  const handleTouchEnd = () => {
    if (!swipeEnabled || !isDragging) return;
    setIsDragging(false);
    
    const dragDistance = Math.abs(dragOffset);
    if (dragDistance > swipeThreshold) {
      if (dragOffset > 0) {
        goToPrevious(); // גרירה ימינה = קודם
      } else {
        goToNext(); // גרירה שמאלה = הבא
      }
    }
    
    setDragOffset(0);
  };

  // פונקציה לחישוב סטיילים דינמיים
  // חישובי עיצוב דינמיים הוסרו לעת עתה לטובת פשטות – אפשר לשחזר כשתהיה דרישה.

  return (
    <div 
      className={`${styles.carousel} ${className} ${rows > 1 ? styles.carouselGrid : ''}`}
      ref={carouselRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* כפתור החץ השמאלי */}
      {showArrows && (
        <Button
          variant="ghost"
          size="sm"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          onClick={goToPrevious}
          aria-label="קודם"
        >
          ‹
        </Button>
      )}

      {/* קונטיינר הפריטים עם גלילה טבעית */}
      <div 
        className={rows > 1 ? styles.carouselContainerGrid : styles.carouselContainer}
        style={rows > 1 ? { gridTemplateRows: `repeat(${rows}, 1fr)` } : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children.map((child, index) => (
          <div 
            key={index} 
            className={styles.carouselItem}
          >
            {child}
          </div>
        ))}
      </div>

      {/* כפתור החץ הימני */}
      {showArrows && (
        <Button
          variant="ghost"
          size="sm"
          className={`${styles.arrow} ${styles.arrowRight}`}
          onClick={goToNext}
          aria-label="הבא"
        >
          ›
        </Button>
      )}

      {/* נקודות ניווט */}
      {showDots && (
        <div className={styles.dots}>
          {Array.from({ length: Math.ceil(children.length / (responsiveItemsToShow * rows)) }).map((_, index) => (
            <Button
              key={index}
              variant="ghost"
              size="xs"
              className={`${styles.dot} ${Math.floor(currentIndex / (responsiveItemsToShow * rows)) === index ? styles.dotActive : ''}`}
              onClick={() => goToSlide(index * responsiveItemsToShow * rows)}
              aria-label={`עבור לסלייד ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export default Carousel;
