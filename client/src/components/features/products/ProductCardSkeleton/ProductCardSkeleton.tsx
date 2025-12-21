import React from 'react';
import styles from './ProductCardSkeleton.module.css';

interface ProductCardSkeletonProps {
  /** וריאנט העיצוב - grid או carousel */
  variant?: 'grid' | 'carousel';
  /** className נוסף */
  className?: string;
}

/**
 * קומפוננטת ProductCardSkeleton - שלד טעינה עבור כרטיס מוצר
 * מציגה placeholder אנימטי בזמן טעינת המוצרים
 * שומרת על אותן מידות כמו ProductCard המקורי
 */
const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({
  variant = 'grid',
  className = ''
}) => {
  // איסוף המחלקות לשורש הכרטיס
  const cardClassName = [
    styles.skeletonCard,
    variant === 'grid' ? styles.grid : styles.carousel,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClassName}>
      {/* אזור התמונה - עם אנימציית shimmer */}
      <div className={styles.imageContainer}>
        <div className={styles.imageSkeleton}>
          <div className={styles.shimmer} />
        </div>
      </div>

      {/* אזור התוכן */}
      <div className={styles.content}>
        {/* שם המוצר - 3 שורות לסימולציה של שמות ארוכים יותר */}
        <div className={styles.titleSkeleton}>
          <div className={styles.shimmer} />
        </div>
        <div className={styles.titleSkeleton}>
          <div className={styles.shimmer} />
        </div>
        <div className={`${styles.titleSkeleton} ${styles.titleShort}`}>
          <div className={styles.shimmer} />
        </div>

        {/* תיאור המוצר - 3 שורות */}
        <div className={styles.descriptionSkeleton}>
          <div className={styles.shimmer} />
        </div>
        <div className={styles.descriptionSkeleton}>
          <div className={styles.shimmer} />
        </div>
        <div className={`${styles.descriptionSkeleton} ${styles.descriptionShort}`}>
          <div className={styles.shimmer} />
        </div>

        {/* אזור המחיר והכפתור */}
        <div className={styles.footer}>
          <div className={styles.priceSkeleton}>
            <div className={styles.shimmer} />
          </div>
          <div className={styles.buttonSkeleton}>
            <div className={styles.shimmer} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
