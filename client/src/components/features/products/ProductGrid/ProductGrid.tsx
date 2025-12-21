import React, { forwardRef, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { VirtuosoGrid, type GridComponents } from 'react-virtuoso';
import { ProductCard } from '../ProductCard';
import type { Product } from '../../../../types';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  /** רשימת המוצרים להצגה */
  products: Product[];
  /** כמות עמודות ברשת - ברירת מחדל מותאמת רספונסיבית */
  columns?: number;
  /** רווח בין הרכיבים */
  gap?: 'small' | 'medium' | 'large';
  /** האם להציג אנימציה בטעינה */
  showLoadingAnimation?: boolean;
  /** טקסט להצגה כאשר אין מוצרים */
  emptyStateText?: string;
  /** פונקציה שתופעל בלחיצה על מוצר */
  onProductClick?: (product: Product) => void;
  /** פונקציה שתופעל בהוספת מוצר לסל - מקבלת מוצר וקוד SKU */
  onAddToCart?: (product: Product, sku?: string) => void;
  /** className נוסף לעיצוב מותאם */
  className?: string;
}

const VIRTUALIZATION_THRESHOLD = 40;
const SKELETON_PLACEHOLDER_COUNT = 12;

/**
 * קומפוננטת ProductGrid - מציגה רשת של מוצרים בצורה רספונסיבית
 * תומכת בהתאמה אוטומטית למסכים שונים ובמספר אפשרויות עיצוב
 */
export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  columns,
  gap = 'medium',
  showLoadingAnimation = false,
  emptyStateText = 'לא נמצאו מוצרים',
  onProductClick,
  onAddToCart,
  className,
}) => {
  // אם אין מוצרים - הצגת מצב ריק
  if (!products || products.length === 0) {
    return (
      <div className={`${styles.emptyState} ${className || ''}`}>
        <div className={styles.emptyStateContent}>
          <h3 className={styles.emptyStateTitle}>
            {emptyStateText}
          </h3>
          <p className={styles.emptyStateDescription}>
            נסה לחפש משהו אחר או לבדוק שוב מאוחר יותר
          </p>
        </div>
      </div>
    );
  }

  // שמירת ערך עמודות כ-attribue כדי להימנע משימוש ב-inline style
  const gridColumnsAttr = useMemo(() => (
    columns ? String(columns) : undefined
  ), [columns]);

  // חיבור המחלקות כך שהוירטואליזציה תשמור על מראה אחיד עם המצב הקיים
  const gridClassName = useMemo(
    () => clsx(
      styles.productGrid,
      styles[`gap-${gap}`],
      showLoadingAnimation && styles.loading,
      className,
    ),
    [gap, showLoadingAnimation, className],
  );

  // קביעת האם להפעיל וירטואליזציה לפי כמות הפריטים (מעל סף שנקבע)
  const shouldVirtualize = products.length >= VIRTUALIZATION_THRESHOLD;

  // הפקת תוכן הפריטים בצורה ממורכזת למניעת הפעלות מחדש מיותרות
  const renderItem = useCallback((_: number, product: Product) => (
    <ProductCard
      product={product}
      onAddToCart={(nextProduct, sku) => onAddToCart?.(nextProduct, sku)}
      onProductClick={() => onProductClick?.(product)}
    />
  ), [onAddToCart, onProductClick]);

  // בניית קומפוננטים מותאמים ל-VirtuosoGrid לשימור ה-RTL והסגנונות הקיימים
  const gridComponents = useMemo<GridComponents<Product>>(() => ({
    List: forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
      <div
        {...props}
        ref={ref}
        className={clsx(props.className, gridClassName)}
        data-grid-columns={gridColumnsAttr}
      />
    )),
    Item: forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
      <div
        {...props}
        ref={ref}
        className={styles.gridItem}
      />
    )),
  }), [gridClassName, gridColumnsAttr]);

  if (!shouldVirtualize) {
    return (
      <div
        className={gridClassName}
        data-grid-columns={gridColumnsAttr}
      >
        {products.map((product) => (
          <div
            key={product._id}
            className={styles.gridItem}
          >
            <ProductCard
              product={product}
              onAddToCart={(nextProduct, sku) => onAddToCart?.(nextProduct, sku)}
              onProductClick={() => onProductClick?.(product)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.virtualizedContainer}>
      <VirtuosoGrid
        useWindowScroll
        data={products}
        components={gridComponents}
        itemContent={renderItem}
        computeItemKey={(_, product) => product._id}
        overscan={200}
        scrollSeekConfiguration={{
          enter: (velocity) => Math.abs(velocity) > 1200,
          change: (velocity) => Math.abs(velocity) > 1200,
          exit: (velocity) => Math.abs(velocity) < 30,
        }}
      />
      {showLoadingAnimation && (
        <div
          className={styles.skeletonOverlay}
          data-gap-size={gap}
          aria-hidden="true"
        >
          {Array.from({ length: SKELETON_PLACEHOLDER_COUNT }).map((_, index) => (
            <div key={`skeleton-${index}`} className={styles.skeletonItem}>
              <div className={styles.cardSkeleton} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
