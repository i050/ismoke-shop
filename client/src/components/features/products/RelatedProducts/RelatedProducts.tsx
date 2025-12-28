import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Typography, Button, LogoLoader } from '@ui';
import ProductPrice from '../ProductPrice';
import type { Product } from '../../../../types';
import { ProductService } from '../../../../services/productService';
import { getImageUrl } from '../../../../utils/imageUtils'; // Phase 1.4: ייבוא פונקציית עזר לטיפול בתמונות
import styles from './RelatedProducts.module.css';

interface RelatedProductsProps {
  currentProductId: string;
  categoryId?: string;
}

/**
 * מוצרים קשורים - מחקה בדיוק את ה-HTML המצורף
 * מציג רשת של מוצרים דומים או מאותה קטגוריה
 */
const RelatedProducts: React.FC<RelatedProductsProps> = ({
  currentProductId,
  categoryId,
}) => {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // טעינת מוצרים קשורים
  useEffect(() => {
    const loadRelatedProducts = async () => {
      try {
        setLoading(true);
        
        // קבלת כל המוצרים וסינון המוצרים הרלוונטיים
        const allProducts = await ProductService.getAllProducts();
        
        // סינון המוצר הנוכחי
        const filteredProducts = allProducts.filter(
          product => product._id !== currentProductId && product.isActive
        );
        
        // העדפה למוצרים מאותה קטגוריה
        const categoryProducts = categoryId 
          ? filteredProducts.filter(product => product.categoryId === categoryId)
          : [];
        
        // אם יש מוצרים מאותה קטגוריה, נעדיף אותם
        const productsToShow = categoryProducts.length >= 4 
          ? categoryProducts 
          : filteredProducts;
        
        // לקחת עד 4 מוצרים רנדומליים
        const shuffled = [...productsToShow].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 4);
        
        setRelatedProducts(selected);
        setError(null);
      } catch (err) {
        setError('שגיאה בטעינת מוצרים קשורים');
        console.error('Error loading related products:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRelatedProducts();
  }, [currentProductId, categoryId]);

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

      {/* רשת המוצרים */}
      <div className={styles.productsGrid}>
        {relatedProducts.map((product) => (
          <div key={product._id} className={styles.productCard}>
            
            {/* תמונת המוצר */}
            <div className={styles.productImageContainer}>
              <Link to={`/product/${product._id}`} className={styles.productLink}>
                <img
                  src={getImageUrl(product.images?.[0])} 
                  alt={product.name}
                  className={styles.productImage}
                  onError={(e) => {
                    e.currentTarget.src = '/ismoke-placeholder.png';
                  }}
                />
              </Link>
              
              {/* תגית "חדש" אם המוצר חדש */}
              {product.createdAt && 
               new Date(product.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                <span className={styles.newBadge}>חדש</span>
              )}
              
              {/* תגית "אזל" אם המוצר אזל */}
              {product.quantityInStock === 0 && (
                <span className={styles.outOfStockBadge}>אזל</span>
              )}
            </div>

            {/* פרטי המוצר */}
            <div className={styles.productInfo}>
              
              {/* שם המוצר */}
              <Link to={`/product/${product._id}`} className={styles.productLink}>
                <Typography variant="h5" className={styles.productName}>
                  {product.name}
                </Typography>
              </Link>

              {/* תיאור קצר */}
              {product.description && (
                <Typography variant="body2" className={styles.productDescription}>
                  {product.description.length > 80 
                    ? `${product.description.substring(0, 80)}...` 
                    : product.description}
                </Typography>
              )}

              {/* מחיר */}
              <div className={styles.priceContainer}>
                <ProductPrice 
                  pricing={product.pricing}
                  size="medium"
                />
              </div>

              {/* דירוג מהיר */}
              <div className={styles.quickRating}>
                <div className={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`${styles.star} ${
                      star <= (Math.floor(Math.random() * 2) + 3) ? styles.filled : ''
                    }`}>
                      ★
                    </span>
                  ))}
                </div>
                <span className={styles.reviewCount}>
                  ({Math.floor(Math.random() * 50) + 5})
                </span>
              </div>

              {/* כפתור הוספה מהירה */}
              <div className={styles.quickActions}>
                <Button
                  variant={product.quantityInStock > 0 ? 'primary' : 'ghost'}
                  className={`${styles.quickAddButton} ${
                    product.quantityInStock === 0 ? styles.disabled : ''
                  }`}
                  disabled={product.quantityInStock === 0}
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('הוספה מהירה לעגלה:', product._id);
                  }}
                >
                  {product.quantityInStock > 0 ? 'הוסף לעגלה' : 'אזל מהמלאי'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* קישור לכל המוצרים */}
      <div className={styles.viewAll}>
        <Link to="/products" className={styles.viewAllLink}>
          <Button variant="ghost" className={styles.viewAllButton}>
            צפה בכל המוצרים →
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default RelatedProducts;
