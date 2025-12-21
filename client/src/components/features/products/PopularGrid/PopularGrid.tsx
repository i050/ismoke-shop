import React, { useEffect, useState } from 'react';
import ProductCard from '../ProductCard/ProductCard';
import ProductCardSkeleton from '../ProductCardSkeleton/ProductCardSkeleton';
import { Typography, Button } from '../../../ui';
import styles from './PopularGrid.module.css';
import type { Product } from '../../../../types/Product';
import { ApiError } from '../../../../utils/ApiError';
import { ProductService } from '../../../../services/productService';
import { useAppDispatch } from '../../../../hooks/reduxHooks';
import { addItemToCart } from '../../../../store/slices/cartSlice';

interface PopularGridProps {
  /** כמה מוצרים להציג בהתחלה */
  initialCount?: number;
  /** כמה מוצרים להוסיף בכל לחיצה על "טען עוד" */
  loadMoreCount?: number;
}

/**
 * קומפוננטת PopularGrid - מציגה מוצרים פופולריים בגריד
 * תומכת בלחיצה על "טען עוד" לטעינה הדרגתית של מוצרים נוספים
 */
const PopularGrid: React.FC<PopularGridProps> = ({
  initialCount = 10,
  loadMoreCount = 10,
}) => {
  const dispatch = useAppDispatch();
  
  // State לניהול המוצרים והטעינה
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  
  // State לניהול כמות המוצרים המוצגים
  const [displayedCount, setDisplayedCount] = useState(initialCount);

  // פונקציה להוספת מוצר לסל
  const handleAddToCart = (product: Product, sku?: string) => {
    if (!sku && product.skus && product.skus.length > 0) {
      // אם לא נשלח SKU אבל יש SKUs, קח את הראשון
      sku = product.skus[0].sku;
    }
    dispatch(addItemToCart({
      productId: product._id,
      quantity: 1,
      sku: sku || '' // SKU חובה
    }));
  };

  // שליפת המוצרים מהשרת
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        // שליחת בקשה לקבלת מוצרים פופולריים
        const data = await ProductService.getPopularProducts();
        console.log('PopularGrid - received products:', data.length);
        console.log('PopularGrid - first product pricing:', data[0]?.pricing); // הדפס pricing של המוצר הראשון
        setProducts(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Error loading popular products:', message);
        const errorObj = err as { status?: number; name?: string };
        if (errorObj?.status || errorObj?.name === 'ApiError' || err instanceof ApiError) {
          setError({ message: message, status: errorObj.status });
        } else {
          setError({ message });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // פונקציה לטעינת מוצרים נוספים
  const handleLoadMore = () => {
    setDisplayedCount(prev => Math.min(prev + loadMoreCount, products.length));
  };

  // בדיקה האם יש עוד מוצרים לטעון
  const hasMore = displayedCount < products.length;

  // מצב טעינה - הצגת שלדי כרטיסים
  if (loading) {
    return (
      <section className={styles.gridSection}>
        <Typography variant="h5" align="center" className={styles.gridTitle}>
          פופולרי
        </Typography>
        <div className={styles.productGrid}>
          {/* יצירת מערך של שלדי כרטיסים לפי initialCount */}
          {Array.from({ length: initialCount }).map((_, index) => (
            <ProductCardSkeleton key={`skeleton-${index}`} variant="grid" />
          ))}
        </div>
      </section>
    );
  }
  
  // מצב שגיאה
  if (error) {
    return (
      <section className={styles.gridSection}>
        <Typography variant="h5" align="center" className={styles.gridTitle}>
          פופולרי
        </Typography>
        <div className={styles.errorState}>
          <Typography variant="body1">{error.message}</Typography>
        </div>
      </section>
    );
  }
  
  // אם אין מוצרים
  if (!products.length) {
    return (
      <section className={styles.gridSection}>
        <Typography variant="h5" align="center" className={styles.gridTitle}>
          פופולרי
        </Typography>
        <div className={styles.emptyState}>
          <Typography variant="body1">לא נמצאו מוצרים פופולריים</Typography>
        </div>
      </section>
    );
  }

  // המוצרים שיוצגו כרגע (לפי displayedCount)
  const displayedProducts = products.slice(0, displayedCount);

  return (
    <section className={styles.gridSection}>
      {/* כותרת */}
      <Typography variant="h5" align="center" className={styles.gridTitle}>
        פופולרי
      </Typography>

      {/* הגריד של כרטיסי המוצר - 5 עמודות בדסקטופ */}
      <div className={styles.productGrid}>
        {displayedProducts.map((product) => (
          <ProductCard
            key={product._id}
            variant="grid"
            product={product}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>

      {/* כפתור "טען עוד" - מוצג רק אם יש עוד מוצרים */}
      {hasMore && (
        <div className={styles.loadMoreContainer}>
          <Button
            variant="secondary"
            size="lg"
            onClick={handleLoadMore}
            className={styles.loadMoreButton}
          >
            טען עוד ({products.length - displayedCount} מוצרים נוספים)
          </Button>
        </div>
      )}
    </section>
  );
};

export default PopularGrid;
