import React from 'react';
import { ProductCard } from '../ProductCard';
import { Carousel } from '@ui';
import type { Product } from '../../../../types';
import styles from './ProductCarousel.module.css';

interface ProductCarouselProps {
  /** רשימת המוצרים להצגה */
  products: Product[];
  /** כותרת הקרוסלה */
  title?: string;
  /** תיאור או תת-כותרת */
  subtitle?: string;
  /** כמות מוצרים להצגה במקביל */
  itemsToShow?: number;
  /** כמות מוצרים לגלילה */
  itemsToScroll?: number;
  /** כמה שורות להציג במקביל (2-3 לדף הבית) */
  rows?: number;
  /** האם לאפשר גלילה אוטומטית */
  autoPlay?: boolean;
  /** זמן בין החלפות אוטומטיות (במילישניות) */
  autoPlayInterval?: number;
  /** האם להציג כפתורי חץ */
  showArrows?: boolean;
  /** האם להציג נקודות ניווט */
  showDots?: boolean;
  /** האם גלילה אינסופית */
  infinite?: boolean;
  /** האם רספונסיבי */
  responsive?: boolean;
  /** האם לאפשר גרירה */
  swipeEnabled?: boolean;
  /** פונקציה שתופעל בלחיצה על מוצר */
  onProductClick?: (product: Product) => void;
  /** פונקציה שתופעל בהוספת מוצר לסל */
  onAddToCart?: (product: Product) => void;
  /** className נוסף לעיצוב מותאם */
  className?: string;
}

/**
 * קומפוננטת ProductCarousel - מציגה מוצרים בקרוסלה אופקית
 * משתמשת ברכיב Carousel הבסיסי מה-Design System
 */
export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  products,
  title,
  subtitle,
  itemsToShow = 4,
  itemsToScroll = 2,
  rows = 2,
  autoPlay = false,
  autoPlayInterval = 5000,
  showArrows = true,
  showDots = false,
  infinite = true,
  responsive = true,
  swipeEnabled = true,
  onProductClick,
  onAddToCart,
  className,
}) => {
  // אם אין מוצרים - לא מציגים כלום
  if (!products || products.length === 0) {
    return (
      <div className={`${styles.emptyState} ${className || ''}`}>
        <div className={styles.emptyContent}>
          <h3 className={styles.emptyTitle}>אין מוצרים להצגה</h3>
          <p className={styles.emptyDescription}>נסה שוב מאוחר יותר</p>
        </div>
      </div>
    );
  }

  // יצירת רשימת ProductCard עבור הקרוסלה
  const productCards = products.map((product) => (
    <div key={product._id} className={styles.productItem}>
      <ProductCard
        product={{
          ...product, // מעבירים את כל התכונות של המוצר
          id: product._id, // הוספת id נוסף אם נדרש
          price: product.basePrice, // מחיר בסיס
          inStock: product.quantityInStock > 0, // בדיקת מלאי
          isOnSale: product.pricing ? product.pricing.hasDiscount : false, // בדיקת מבצע
          discountPercentage: product.pricing ? product.pricing.discountPercentage : 0, // אחוז הנחה
        }}
        onAddToCart={() => onAddToCart?.(product)}
        onProductClick={() => onProductClick?.(product)}
      />
    </div>
  ));

  return (
    <div className={`${styles.carouselWrapper} ${className || ''}`}>
      {/* כותרת */}
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}

      {/* הקרוסלה עצמה */}
      <Carousel
        itemsToShow={itemsToShow}
        itemsToScroll={itemsToScroll}
        rows={rows}
        autoPlay={autoPlay}
        autoPlayInterval={autoPlayInterval}
        showArrows={showArrows}
        showDots={showDots}
        infinite={infinite}
        responsive={responsive}
        swipeEnabled={swipeEnabled}
        className={styles.carousel}
      >
        {productCards}
      </Carousel>
    </div>
  );
};

export default ProductCarousel;
