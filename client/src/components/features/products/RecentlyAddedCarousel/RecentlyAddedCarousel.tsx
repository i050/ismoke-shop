import React, { useEffect, useState } from 'react';
import ProductCard from '../ProductCard/ProductCard';
import { Typography, Carousel, LogoLoader } from '../../../ui';
import { Icon } from '../../../ui';
import styles from './RecentlyAddedCarousel.module.css';
import type { Product } from '../../../../types/Product';
import { ApiError } from '../../../../utils/ApiError';
import { ProductService } from '../../../../services/productService';
import { useAppDispatch } from '../../../../hooks/reduxHooks';
import { addItemToCart } from '../../../../store/slices/cartSlice';

const RecentlyAddedCarousel: React.FC = () => {
  const dispatch = useAppDispatch();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  const handleAddToCart = (product: Product, sku?: string, quantity: number = 1) => {
    if (!sku && product.skus && product.skus.length > 0) {
      // אם לא נשלח SKU אבל יש SKUs, קח את הראשון
      sku = product.skus[0].sku;
    }
    dispatch(addItemToCart({
      productId: product._id,
      quantity,
      sku: sku || '' // SKU חובה
    }));
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        // שליחת בקשה עם טוקן אימות (אם קיים) לקבלת מחירים מותאמים
        // השתמש ב-ProductService כדי לשמור על טיפול אחיד בשגיאות
        const data = await ProductService.getRecentlyAddedProducts();
        console.log('RecentlyAdded - received products with pricing:', data.slice(0, 1)); // דיבג - הצגת מוצר ראשון
        setProducts(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if ((err as any)?.status || (err as any)?.name === 'ApiError' || err instanceof ApiError) {
          setError({ message, status: (err as any).status });
        } else {
          setError({ message: message || 'שגיאה לא ידועה' });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <LogoLoader size={80} />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.errorState}>
        <Icon name="AlertCircle" size={32} />
        <Typography variant="body1">{error.message}</Typography>
      </div>
    );
  }
  
  if (!products.length) {
    return (
      <div className={styles.emptyState}>
        <Icon name="Package" size={32} />
        <Typography variant="body1">לא נמצאו מוצרים חדשים</Typography>
      </div>
    );
  }

  return (
    <section className={styles.carouselSection}>
      <Typography variant="h5" align="center" className={styles.carouselTitle}>
        נוספו לאחרונה
      </Typography>
      <Carousel
        itemsToShow={3}
        itemsToScroll={1}
        showArrows={false}
        showDots={false}
        infinite={false}
        swipeEnabled={true}
        responsive={true}
        rows={2}
      >
        {products.map((product) => (
          <ProductCard
            key={product._id}
            variant="carousel"
            product={product}
            onAddToCart={handleAddToCart}
          />
        ))}
      </Carousel>
    </section>
  );
};

export default RecentlyAddedCarousel;
