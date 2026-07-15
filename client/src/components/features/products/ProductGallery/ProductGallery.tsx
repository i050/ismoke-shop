import React, { useState, useCallback } from 'react';
import styles from './ProductGallery.module.css';
import { Button, Icon, ImageMagnifier } from '@ui';
import { getImageUrl } from '../../../../utils/imageUtils'; // ✅ שימוש בפונקציה החדשה
import type { IImage } from '../../../../types/Product'; // ✅ ייבוא IImage עם type
import { useResponsive } from '../../../../hooks'; // ✅ Hook לזיהוי גודל מסך

interface ProductGalleryProps {
  images: IImage[]; // ✅ שינוי מ-string[] ל-IImage[]
  productName: string;
  currentIndex: number;
  onImageChange: (index: number) => void;
  selectedSku: string | null;
}

/**
 * גלריית תמונות המוצר - מחקה בדיוק את ה-HTML המצורף
 * כוללת תמונה ראשית ותמונות ממוזערות למטה + זום דינמי
 */
const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  productName,
  currentIndex,
  onImageChange,
}) => {
  
  // זיהוי גודל מסך - הזום יופעל רק במסכים גדולים (desktop)
  const { isDesktop, isLargeDesktop } = useResponsive();
  
  // האם להפעיל זום? רק במסכים גדולים (1024px+)
  // במובייל/טאבלט המשתמש יכול להשתמש ב-pinch-to-zoom הטבעי
  const isZoomEnabled = isDesktop || isLargeDesktop;
  
  // מצב הזום - האם פעיל כרגע
  const [isZoomActive, setIsZoomActive] = useState(false);
  
  // Callbacks לזום
  const handleZoomStart = useCallback(() => {
    setIsZoomActive(true);
  }, []);
  
  const handleZoomEnd = useCallback(() => {
    setIsZoomActive(false);
  }, []);
  
  // אם אין תמונות
  if (!images || images.length === 0) {
    return (
      <div className={styles.imageContainer}>
        <div className={styles.mainImage}>
          <div className={styles.imagePlaceholder}>
            <div className={styles.placeholderIcon} aria-hidden="true"><Icon name="Image" size={36} /></div>
            <div className={styles.placeholderText}>אין תמונה זמינה</div>
          </div>
        </div>
      </div>
    );
  }

  // מעבר לתמונה הקודמת
  const handlePrevImage = () => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    onImageChange(newIndex);
  };

  // מעבר לתמונה הבאה
  const handleNextImage = () => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    onImageChange(newIndex);
  };

  return (
    <div className={styles.imageContainer}>
      
      {/* תמונה ראשית עם זום דינמי */}
      <div className={styles.mainImage}>
        {/* ✅ שימוש ב-medium (800×800) לתצוגה ראשית */}
        {/* ✅ ImageMagnifier יטען אוטומטית תמונת large (1200×1200) לזום */}
        {/* ✅ הזום מופעל רק במסכים גדולים (desktop) - במובייל/טאבלט המשתמש יכול להשתמש ב-pinch-to-zoom */}
        <ImageMagnifier
          src={getImageUrl(images[currentIndex], 'medium')}
          alt={`${productName} - תמונה ${currentIndex + 1}`}
          zoomScale={2.5}
          lensSize={150}
          mode="overlay"
          onZoomStart={handleZoomStart}
          onZoomEnd={handleZoomEnd}
          enabled={isZoomEnabled}
        />
        
        {/* כפתורי ניווט - רק אם יש יותר מתמונה אחת ולא בזום */}
        {images.length > 1 && !isZoomActive && (
          <>
            <Icon
              name="ChevronLeftCircle"
              size={40}
              className={`${styles.navButton} ${styles.navButtonPrev}`}
              onClick={handlePrevImage}
              aria-label="תמונה קודמת"
            />
            <Icon
              name="ChevronRightCircle"
              size={40}
              className={`${styles.navButton} ${styles.navButtonNext}`}
              onClick={handleNextImage}
              aria-label="תמונה הבאה"
            />
          </>
        )}
        
        {/* אינדיקטור תמונות */}
        {images.length > 1 && (
          <div className={styles.imageIndicator}>
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* תמונות ממוזערות - בדיוק כמו ב-HTML */}
      {images.length > 1 && (
        <div className={styles.thumbnailContainer}>
          <div className={styles.thumbnailWrapper}>
            {images.map((image, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className={`${styles.thumbnail} ${
                  index === currentIndex ? styles.thumbnailActive : ''
                }`}
                onClick={() => onImageChange(index)}
                aria-label={`הצג תמונה ${index + 1}`}
              >
                {/* ✅ שימוש ב-thumbnail (200×200) בתמונות הממוזערות */}
                <img
                  src={getImageUrl(image, 'thumbnail')}
                  alt={`${productName} - תמונה ממוזערת ${index + 1}`}
                  className={styles.thumbnailImg}
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-thumbnail.jpg';
                  }}
                />
              </Button>
            ))}
          </div>
          
          {/* חצים לניווט בתמונות ממוזערות אם יש הרבה */}
          {images.length > 5 && (
            <>
              <Icon
                name="ChevronLeftCircle"
                size={30}
                className={`${styles.thumbnailNavButton} ${styles.thumbnailNavButtonPrev}`}
                aria-label="תמונות ממוזערות קודמות"
              />
              <Icon
                name="ChevronRightCircle"
                size={30}
                className={`${styles.thumbnailNavButton} ${styles.thumbnailNavButtonNext}`}
                aria-label="תמונות ממוזערות הבאות"
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
