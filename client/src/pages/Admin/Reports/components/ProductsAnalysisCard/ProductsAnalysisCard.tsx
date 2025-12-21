/**
 * כרטיס ניתוח מוצרים נמכרים - מציג את המוצרים המובילים
 * משתמש ב-API הקיים של getTopSellingProducts
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '@ui';
import { getTopSellingProducts, type TopSellingProduct } from '@/services/orderService';
import ReportCard from '../ReportCard';
import styles from './ProductsAnalysisCard.module.css';

// ============================================================================
// Helpers
// ============================================================================

/** פורמט מטבע */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// ============================================================================
// Component
// ============================================================================

const ProductsAnalysisCard: React.FC = () => {
  // סטייט למוצרים
  const [products, setProducts] = useState<TopSellingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // טעינת נתונים
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await getTopSellingProducts(10, controller.signal);

        if (response.success) {
          setProducts(response.data);
        } else {
          setError('שגיאה בטעינת נתונים');
        }

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching products:', err);
          setError('שגיאה בטעינת נתוני מוצרים');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();

    return () => controller.abort();
  }, []);

  // חישוב סטטיסטיקות סיכום
  const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalQuantity = products.reduce((sum, p) => sum + p.totalQuantity, 0);

  return (
    <ReportCard
      icon="PieChart"
      title="ניתוח מוצרים נמכרים"
      description="מוצרים מובילים וקטגוריות"
      accentColor="green"
      isLoading={isLoading}
      isComingSoon={false}
      minHeight={320}
    >
      {error ? (
        <div className={styles.errorState}>
          <Icon name="AlertCircle" size={24} />
          <span>{error}</span>
        </div>
      ) : products.length === 0 ? (
        <div className={styles.emptyState}>
          <Icon name="Package" size={32} />
          <span>אין עדיין נתוני מכירות</span>
        </div>
      ) : (
        <div className={styles.productsContent}>
          {/* רשימת מוצרים */}
          <div className={styles.productsList}>
            {products.slice(0, 5).map((product, index) => {
              // חישוב אחוז יחסי לראשון
              const maxQuantity = products[0]?.totalQuantity || 1;
              const progress = Math.round((product.totalQuantity / maxQuantity) * 100);
              
              return (
                <div key={product.productId || index} className={styles.productItem}>
                  <div className={styles.productRank}>
                    {index + 1}
                  </div>
                  <div className={styles.productInfo}>
                    <div className={styles.productHeader}>
                      <span className={styles.productName}>{product.productName}</span>
                      <span className={styles.productRevenue}>
                        {formatCurrency(product.totalRevenue)}
                      </span>
                    </div>
                    <div className={styles.productMeta}>
                      <span>{product.totalQuantity} יחידות</span>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill} 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* סיכום */}
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <Icon name="Package" size={16} />
              <span className={styles.summaryLabel}>סה"כ יחידות</span>
              <span className={styles.summaryValue}>{totalQuantity.toLocaleString()}</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <Icon name="DollarSign" size={16} />
              <span className={styles.summaryLabel}>סה"כ הכנסות</span>
              <span className={styles.summaryValue}>{formatCurrency(totalRevenue)}</span>
            </div>
          </div>
        </div>
      )}
    </ReportCard>
  );
};

export default ProductsAnalysisCard;
