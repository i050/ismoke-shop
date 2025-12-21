import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getHighResImageUrl, preloadImageAsync } from '@utils/imageUtils';
import styles from './ImageMagnifier.module.css';

/**
 * ממשק Props לרכיב ImageMagnifier
 */
export interface ImageMagnifierProps {
  /** URL של התמונה המקורית */
  src: string;
  /** טקסט חלופי לנגישות */
  alt: string;
  /** URL אופציונלי של תמונה ברזולוציה גבוהה (אם לא מסופק, נבנה אוטומטית) */
  zoomSrc?: string;
  /** רמת ההגדלה (ברירת מחדל: 2.5) */
  zoomScale?: number;
  /** גודל העדשה בפיקסלים (ברירת מחדל: 150) */
  lensSize?: number;
  /** מצב תצוגה: overlay (צף מעל) או panel (חלונית בצד) */
  mode?: 'overlay' | 'panel';
  /** callback כאשר הזום מתחיל */
  onZoomStart?: () => void;
  /** callback כאשר הזום מסתיים */
  onZoomEnd?: () => void;
  /** האם הפיצ'ר מופעל (feature flag) */
  enabled?: boolean;
}

/**
 * רכיב ImageMagnifier - זכוכית מגדלת דינמית לתמונות מוצר
 * 
 * מאפשר למשתמשים לבחון פרטים קטנים בתמונה על ידי hover או tap.
 * תומך ב-RTL, נגישות מלאה, ו-responsive design.
 */
const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
  src,
  alt,
  zoomSrc,
  zoomScale = 2.5,
  lensSize = 150,
  mode = 'overlay',
  onZoomStart,
  onZoomEnd,
  enabled = true,
}) => {
  // ===== State Management =====
  
  // מצב הזום: האם פעיל, מיקום, והאם התמונה ברזולוציה גבוהה נטענה
  const [zoomState, setZoomState] = useState({
    isZoomActive: false,
    zoomPosition: { x: 0, y: 0 }, // מיקום העכבר/טאץ'
    isImageLoaded: false, // האם התמונה ברזולוציה גבוהה נטענה
  });
  
  // ===== Refs =====
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isTouch = useRef<boolean>(false); // האם זה מכשיר מגע
  
  // ===== High-Res Image URL =====
  
  // בניית URL ברזולוציה גבוהה (או שימוש ב-zoomSrc אם סופק)
  const highResUrl = zoomSrc || getHighResImageUrl(src, {
    width: 2048,
    height: 2048,
    quality: 'auto:good',
    dpr: 2,
  });
  
  // ===== Preload Effect =====
  
  /**
   * טעינה מוקדמת של התמונה ברזולוציה גבוהה
   * מופעל רק אם הפיצ'ר מופעל והתמונה עדיין לא נטענה
   */
  useEffect(() => {
    if (!enabled || zoomState.isImageLoaded) return;
    
    let cancelled = false;
    
    // טעינה אסינכרונית
    preloadImageAsync(highResUrl).then((success) => {
      if (!cancelled && success) {
        setZoomState(prev => ({ ...prev, isImageLoaded: true }));
      }
    });
    
    return () => {
      cancelled = true;
    };
  }, [enabled, highResUrl, zoomState.isImageLoaded]);
  
  // ===== Zoom Handlers =====
  
  /**
   * טיפול בתחילת זום (עכבר נכנס או טאץ')
   */
  const handleZoomStart = useCallback(() => {
    if (!enabled) return;
    
    setZoomState(prev => ({ ...prev, isZoomActive: true }));
    onZoomStart?.();
  }, [enabled, onZoomStart]);
  
  /**
   * טיפול בסיום זום (עכבר יוצא או טאץ' נוסף)
   */
  const handleZoomEnd = useCallback(() => {
    setZoomState(prev => ({ ...prev, isZoomActive: false }));
    onZoomEnd?.();
  }, [onZoomEnd]);
  
  /**
   * טיפול בתנועת עכבר - עדכון מיקום הזום
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !zoomState.isZoomActive || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    
    // חישוב מיקום יחסי בתוך התמונה (0-1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // עדכון state עם המיקום
    setZoomState(prev => ({
      ...prev,
      zoomPosition: { x, y },
    }));
  }, [enabled, zoomState.isZoomActive]);
  
  /**
   * טיפול ב-Touch (מכשירי מגע)
   */
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!enabled) return;
    
    isTouch.current = true;
    
    // Toggle: אם הזום פעיל, כבה אותו. אחרת, הפעל אותו.
    if (zoomState.isZoomActive) {
      handleZoomEnd();
    } else {
      handleZoomStart();
      
      // עדכון מיקום לפי הטאץ'
      const touch = e.touches[0];
      if (touch && imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        const x = (touch.clientX - rect.left) / rect.width;
        const y = (touch.clientY - rect.top) / rect.height;
        
        setZoomState(prev => ({
          ...prev,
          zoomPosition: { x, y },
        }));
      }
    }
  }, [enabled, zoomState.isZoomActive, handleZoomStart, handleZoomEnd]);
  
  /**
   * טיפול בתנועת touch
   */
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!enabled || !zoomState.isZoomActive || !imageRef.current) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;
    
    setZoomState(prev => ({
      ...prev,
      zoomPosition: { x, y },
    }));
  }, [enabled, zoomState.isZoomActive]);
  
  // ===== Keyboard Support (נגישות) =====
  
  /**
   * טיפול במקלדת - Enter/Space להפעלת זום
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!enabled) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      
      if (zoomState.isZoomActive) {
        handleZoomEnd();
      } else {
        handleZoomStart();
        // מיקום ברירת מחדל במרכז
        setZoomState(prev => ({
          ...prev,
          zoomPosition: { x: 0.5, y: 0.5 },
        }));
      }
    } else if (e.key === 'Escape' && zoomState.isZoomActive) {
      handleZoomEnd();
    }
  }, [enabled, zoomState.isZoomActive, handleZoomStart, handleZoomEnd]);
  
  // ===== Render Helpers =====
  
  /**
   * חישוב סטייל לעדשה והזום pane
   */
  const getLensStyle = (): React.CSSProperties => {
    const { x, y } = zoomState.zoomPosition;
    
    return {
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      width: `${lensSize}px`,
      height: `${lensSize}px`,
      transform: 'translate(-50%, -50%)',
    };
  };
  
  const getZoomPaneStyle = (): React.CSSProperties => {
    const { x, y } = zoomState.zoomPosition;
    
    // חישוב מיקום התמונה המוגדלת
    const bgPosX = x * 100;
    const bgPosY = y * 100;
    
    return {
      backgroundImage: `url(${highResUrl})`,
      backgroundPosition: `${bgPosX}% ${bgPosY}%`,
      backgroundSize: `${zoomScale * 100}%`,
    };
  };
  
  // ===== Render =====
  
  // אם הפיצ'ר לא מופעל, הצג רק תמונה רגילה
  if (!enabled) {
    return (
      <img
        src={src}
        alt={alt}
        className={styles.image}
      />
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={styles.container}
      onMouseEnter={handleZoomStart}
      onMouseLeave={handleZoomEnd}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="img"
      aria-label={`${alt} - לחץ Enter להגדלה`}
      style={{
        // CSS variables דינמיים
        ['--lens-size' as string]: `${lensSize}px`,
        ['--zoom-scale' as string]: zoomScale,
      }}
    >
      {/* תמונה ראשית */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={styles.image}
      />
      
      {/* עדשה - מוצגת רק כשהזום פעיל */}
      {zoomState.isZoomActive && (
        <div
          className={styles.lens}
          style={getLensStyle()}
          aria-hidden="true"
        />
      )}
      
      {/* חלונית זום - מוצגת לפי המצב */}
      {zoomState.isZoomActive && (
        <div
          className={`${styles.zoomPane} ${
            mode === 'panel' ? styles.zoomPanePanel : styles.zoomPaneOverlay
          }`}
          style={getZoomPaneStyle()}
          aria-hidden="true"
        >
          {/* אינדיקטור טעינה */}
          {!zoomState.isImageLoaded && (
            <div className={styles.loadingIndicator}>
              <div className={styles.spinner} />
              <span>טוען תמונה באיכות גבוהה...</span>
            </div>
          )}
        </div>
      )}
      
      {/* תמונה נסתרת לצרכי SEO */}
      <img
        src={src}
        alt={alt}
        className={styles.hiddenSeoImage}
        aria-hidden="true"
      />
    </div>
  );
};

export default ImageMagnifier;
