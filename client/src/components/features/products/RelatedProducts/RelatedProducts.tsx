import React, { useState, useEffect } from 'react';
import { Typography, LogoLoader } from '@ui';
import { ProductCard } from '../ProductCard';
import type { Product } from '../../../../types';
import { ProductService } from '../../../../services/productService';
import styles from './RelatedProducts.module.css';

interface RelatedProductsProps {
  currentProductId: string;
  categoryId?: string; // לא בשימוש יותר - השרת מטפל בזה
}

/**
 * מוצרים קשורים - גרסה משופרת
 * משתמש ב-endpoint ייעודי בשרת לקבלת מוצרים רלוונטיים
 * השרת מחזיר מוצרים מאותה קטגוריה, ממוינים לפי פופולריות
 */
const RelatedProducts: React.FC<RelatedProductsProps> = ({
  currentProductId,
}) => {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // טעינת מוצרים קשורים מה-endpoint הייעודי
  useEffect(() => {
    const loadRelatedProducts = async () => {
      try {
        setLoading(true);
        
        // קבלת מוצרים קשורים מהשרת (ממוינים לפי פופולריות)
        const products = await ProductService.getRelatedProducts(currentProductId, 4);
        
        setRelatedProducts(products);
        setError(null);
      } catch (err) {
        setError('שגיאה בטעינת מוצרים קשורים');
        console.error('Error loading related products:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentProductId) {
      loadRelatedProducts();
    }
  }, [currentProductId]);

  // אם אין מוצרים קשורים
  if (loading) {
    return (
      <div className={styles.container}>
        <Typography variant="h3" className={styles.title}>
          מוצרים קשורים
        </Typography>
        <div className={styles.loading}>
          <LogoLoader size={80} />
        </div>
      </div>
    );
  }

  if (error || relatedProducts.length === 0) {
    return null; // לא מציג כלום אם אין מוצרים
  }

  return (
    <div className={styles.container}>
      
      {/* כותרת הסקציה */}
      <div className={styles.header}>
        <Typography variant="h3" className={styles.title}>
          מוצרים קשורים
        </Typography>
        <Typography variant="body2" className={styles.subtitle}>
          מוצרים שעשויים לעניין אותך
        </Typography>
      </div>

      {/* רשת המוצרים - משתמשת באותה קומפוננטת ProductCard כמו בדף המוצרים */}
      <div className={styles.productsGrid}>
        {relatedProducts.map((product) => (
          <div key={product._id} className={styles.gridItem}>
            <ProductCard
              product={product}
              variant="grid"
            />
          </div>
        ))}
      </div>

      {/* קישור לכל המוצרים */}
      <div className={styles.viewAll}>
        <a href="/products" className={styles.viewAllLink}>
          <button className={styles.viewAllButton}>
            צפה בכל המוצרים →
          </button>
        </a>
      </div>
    </div>
  );
};

export default RelatedProducts;
