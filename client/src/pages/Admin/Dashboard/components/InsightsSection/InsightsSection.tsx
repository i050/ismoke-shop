import React, { useEffect, useState } from 'react';
import { Icon } from '../../../../../components/ui';
import skuReportService from '../../../../../services/skuReportService';
import { getTopSellingProducts, type TopSellingProduct } from '../../../../../services/orderService';
import type { MissedOpportunity } from '../../../../../services/skuReportService';
import styles from './InsightsSection.module.css';

/**
 * מקטע תובנות - 3 כרטיסים עם מידע עסקי חשוב
 * משתמש בקומפוננטת Card מ-UI
 */
const InsightsSection: React.FC = () => {
  // מוצרים חמים - נתונים אמיתיים מההזמנות (ממוינים לפי כמות)
  const [hotProducts, setHotProducts] = useState<TopSellingProduct[]>([]);
  const [isLoadingHot, setIsLoadingHot] = useState(true);

  // מוצרים מניבים - אותם נתונים ממוינים לפי הכנסות
  const topRevenueProducts = [...hotProducts].sort((a, b) => b.totalRevenue - a.totalRevenue);

  // הזדמנויות שהוחמצו - נתונים מהשרת
  const [missedOpportunities, setMissedOpportunities] = useState<MissedOpportunity[]>([]);
  const [isLoadingMissed, setIsLoadingMissed] = useState(true);

  // טעינת מוצרים חמים מהשרת
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchHotProducts = async () => {
      try {
        setIsLoadingHot(true);
        const response = await getTopSellingProducts(10, controller.signal);
        if (response.success) {
          setHotProducts(response.data);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching hot products:', error);
        }
      } finally {
        setIsLoadingHot(false);
      }
    };

    fetchHotProducts();

    return () => controller.abort();
  }, []);

  // טעינת הזדמנויות שהוחמצו מהשרת
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchMissedOpportunities = async () => {
      try {
        setIsLoadingMissed(true);
        const data = await skuReportService.getMissedOpportunities(controller.signal);
        setMissedOpportunities(data);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching missed opportunities:', error);
        }
      } finally {
        setIsLoadingMissed(false);
      }
    };

    fetchMissedOpportunities();

    return () => controller.abort();
  }, []);

  return (
    <section className={styles.insightsSection}>
      {/* כרטיס 1: מוצרים חמים - נתונים אמיתיים מההזמנות */}
      <div className={styles.insightCard}>
        <div className={`${styles.cardHeader} ${styles.hot}`}>
          <span className={styles.headerIcon}>
            <Icon name="Flame" size={20} />
          </span>
          <h3 className={styles.headerTitle}>מוצרים חמים</h3>
        </div>
        <div className={styles.cardContent}>
          {isLoadingHot ? (
            <div className={styles.loadingState}>טוען...</div>
          ) : hotProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <Icon name="Package" size={24} />
              <span>אין עדיין נתוני מכירות</span>
            </div>
          ) : (
            hotProducts.map((product, index) => {
              // חישוב אחוז התקדמות יחסית לראשון ברשימה
              const maxQuantity = hotProducts[0]?.totalQuantity || 1;
              const progress = Math.round((product.totalQuantity / maxQuantity) * 100);
              
              return (
                <div key={product.productId || index} className={styles.insightItem}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{product.productName}</span>
                    <span className={styles.itemValue}>{product.totalQuantity} מכירות</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* כרטיס 2: מוצרים מניבים - לפי הכנסות */}
      <div className={styles.insightCard}>
        <div className={`${styles.cardHeader} ${styles.potential}`}>
          <span className={styles.headerIcon}>
            <Icon name="TrendingUp" size={20} />
          </span>
          <h3 className={styles.headerTitle}>המוצרים המניבים ביותר</h3>
        </div>
        <div className={styles.cardContent}>
          {isLoadingHot ? (
            <div className={styles.loadingState}>טוען...</div>
          ) : topRevenueProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <Icon name="Package" size={24} />
              <span>אין עדיין נתוני מכירות</span>
            </div>
          ) : (
            topRevenueProducts.map((product, index) => {
              // חישוב אחוז התקדמות יחסית לראשון ברשימה
              const maxRevenue = topRevenueProducts[0]?.totalRevenue || 1;
              const progress = Math.round((product.totalRevenue / maxRevenue) * 100);
              
              return (
                <div key={product.productId || index} className={styles.insightItem}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{product.productName}</span>
                    <span className={styles.itemValue}>₪{product.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={`${styles.progressFill} ${styles.potentialFill}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* כרטיס 3: הזדמנויות שהוחמצו */}
      <div className={styles.insightCard}>
        <div className={`${styles.cardHeader} ${styles.missed}`}>
          <span className={styles.headerIcon}>
            <Icon name="AlertTriangle" size={20} />
          </span>
          <h3 className={styles.headerTitle}>הזדמנויות שהוחמצו</h3>
        </div>
        <div className={styles.cardContent}>
          {isLoadingMissed ? (
            <div className={styles.loadingState}>טוען...</div>
          ) : missedOpportunities.length === 0 ? (
            <div className={styles.emptyState}>
              <Icon name="CheckCircle" size={24} />
              <span>אין הזדמנויות שהוחמצו כרגע</span>
            </div>
          ) : (
            missedOpportunities.map((opportunity) => (
              <div key={opportunity.sku} className={styles.insightItem}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{opportunity.productName}</span>
                  <span className={styles.itemValue}>₪{opportunity.potentialValue.toLocaleString()}</span>
                </div>
                <div className={styles.missedReason}>
                  {opportunity.reason} • נמצא בסל של {opportunity.customersCount} לקוחות
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default InsightsSection;
