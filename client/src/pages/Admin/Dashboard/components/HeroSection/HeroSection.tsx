import React from 'react';
import { useSelector } from 'react-redux';
import { Icon } from '@ui';
import skuReportService from '@/services/skuReportService';
import { getOrdersStats, getAllOrders, type Order } from '@/services/orderService';
import type { RootState } from '@/store';
import type { LowStockSku } from '@/services/skuReportService';
import LowStockModal from '../LowStockModal';
import PendingOrdersModal from '../PendingOrdersModal';
import styles from './HeroSection.module.css';

// פורמט מטבע
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// חישוב תאריך תחילת החודש הנוכחי (לסינון הכנסות חודשיות)
const getMonthStartDate = (): string => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return monthStart.toISOString();
};

// קבלת שם החודש הנוכחי בעברית
const getCurrentMonthName = (): string => {
  return new Intl.DateTimeFormat('he-IL', { month: 'long' }).format(new Date());
};

const HeroSection: React.FC = () => {
  // שליפת פרטי המשתמש המחובר מ-Redux כדי לוודא שהוא מנהל
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  // ניהול מצב עבור סטטיסטיקות הזמנות
  const [orderStats, setOrderStats] = React.useState<{
    totalRevenue: number;
    pendingOrders: number;
    failedPayments: number;
  }>({ totalRevenue: 0, pendingOrders: 0, failedPayments: 0 });
  const [isStatsLoading, setIsStatsLoading] = React.useState<boolean>(true);
  
  // ניהול מצב עבור הזמנות ממתינות (למודאל)
  const [pendingOrdersList, setPendingOrdersList] = React.useState<Order[]>([]);
  const [isPendingOrdersLoading, setIsPendingOrdersLoading] = React.useState<boolean>(false);
  const [isPendingOrdersModalOpen, setIsPendingOrdersModalOpen] = React.useState<boolean>(false);
  
  // ניהול מצב עבור כרטיס "מלאי נמוך" כדי להציג נתונים חיים מהשרת
  const [lowStockCount, setLowStockCount] = React.useState<number>(0);
  const [lowStockSkus, setLowStockSkus] = React.useState<LowStockSku[]>([]);
  const [isLowStockLoading, setIsLowStockLoading] = React.useState<boolean>(true);
  const [lowStockError, setLowStockError] = React.useState<string | null>(null);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = React.useState<boolean>(false);

  // שליפת סטטיסטיקות הזמנות
  React.useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (user.role !== 'admin' && user.role !== 'super_admin') return;

    let isMounted = true;

    const fetchOrderStats = async () => {
      setIsStatsLoading(true);
      try {
        // שליפת נתונים מתחילת החודש הנוכחי בלבד
        const response = await getOrdersStats({ startDate: getMonthStartDate() });
        if (!isMounted) return;
        
        if (response.success) {
          setOrderStats({
            totalRevenue: response.data.totalRevenue || 0,
            pendingOrders: response.data.ordersByStatus?.pending || 0,
            failedPayments: 0 // TODO: להוסיף API לבעיות תשלום
          });
        }
      } catch (error) {
        console.error('Error fetching order stats:', error);
      } finally {
        if (isMounted) setIsStatsLoading(false);
      }
    };

    fetchOrderStats();
    return () => { isMounted = false; };
  }, [isAuthenticated, user]);

  // שליפת נתוני מלאי נמוך בעת טעינת הדף ושמירה על ביטול מסודר במקרה של unmount
  React.useEffect(() => {
    // בדיקה ראשונית: האם המשתמש מחובר ויש לו הרשאות מנהל?
    if (!isAuthenticated || !user) {
      setLowStockError('נדרש משתמש מחובר');
      setIsLowStockLoading(false);
      return;
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      setLowStockError('נדרשות הרשאות מנהל');
      setIsLowStockLoading(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchLowStock = async () => {
      setIsLowStockLoading(true);
      setLowStockError(null);

      try {
        // מבקש מהשרת את רשימת ה-SKU עם סף המלאי כפי שנקבע לכל מוצר
        const skus = await skuReportService.getLowStockSkus(undefined, controller.signal);
        if (!isMounted) {
          return;
        }
        setLowStockCount(skus.length);
        setLowStockSkus(skus); // שמירת המידע המלא למודאל
      } catch (error) {
        if (!isMounted) {
          return;
        }
        if ((error as Error)?.name === 'AbortError') {
          return;
        }
        const message = error instanceof Error ? error.message : 'שגיאה בטעינת נתוני המלאי';
        setLowStockError(message);
        setLowStockCount(0);
      } finally {
        if (isMounted) {
          setIsLowStockLoading(false);
        }
      }
    };

    fetchLowStock();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isAuthenticated, user]);

  const lowStockTitle = lowStockError ?? undefined;
  const lowStockValue = isLowStockLoading ? '...' : lowStockError ? '--' : String(lowStockCount);

  // פונקציה לפתיחת המודאל של מלאי נמוך
  const handleLowStockClick = () => {
    if (!isLowStockLoading && !lowStockError && lowStockCount > 0) {
      setIsLowStockModalOpen(true);
    }
  };

  // פונקציה לפתיחת המודאל של הזמנות ממתינות
  const handlePendingOrdersClick = async () => {
    if (isStatsLoading || orderStats.pendingOrders === 0) return;
    
    setIsPendingOrdersModalOpen(true);
    setIsPendingOrdersLoading(true);
    
    try {
      const response = await getAllOrders({ status: 'pending', limit: 50 });
      if (response.success) {
        setPendingOrdersList(response.data);
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
    } finally {
      setIsPendingOrdersLoading(false);
    }
  };

  return (
    <section className={styles.heroSection}>
      <div className={styles.heroCard}>
        <div className={styles.cardHeader}>
          <span className={styles.icon}>
            <Icon name="DollarSign" size={24} />
          </span>
          <h3 className={styles.cardTitle}>הכנסות</h3>
        </div>

        <div className={styles.mainValue}>
          {isStatsLoading ? '...' : formatCurrency(orderStats.totalRevenue)}
        </div>

        <div className={styles.trend}>
          <span className={styles.trendText}>הכנסות {getCurrentMonthName()}</span>
        </div>

        <div className={styles.chartContainer}>
          <div className={styles.chartLine}></div>
        </div>

        <div className={styles.prediction}>
          <div className={styles.predictionLabel}>
            <span className={styles.predictionIcon}>
              <Icon name="TrendingUp" size={16} />
            </span>
            <span>נתונים מעודכנים</span>
          </div>
          <div className={styles.predictionValue}>בזמן אמת</div>
        </div>
      </div>

      <div className={styles.actionCards}>
        <div 
          className={`${styles.actionCard} ${styles.critical}`}
          onClick={handlePendingOrdersClick}
          style={{ cursor: orderStats.pendingOrders > 0 && !isStatsLoading ? 'pointer' : 'default' }}
          role="button"
          tabIndex={orderStats.pendingOrders > 0 ? 0 : -1}
          aria-label={`הזמנות ממתינות - ${orderStats.pendingOrders} הזמנות`}
        >
          <div className={styles.actionIcon}>
            <Icon name="AlertCircle" size={24} />
          </div>
          <div className={styles.actionContent}>
            <h4 className={styles.actionTitle}>הזמנות ממתינות</h4>
            <p className={styles.actionDescription}>דורש טיפול מיידי</p>
          </div>
          <div className={`${styles.actionValue} ${styles.criticalValue}`}>
            {isStatsLoading ? '...' : orderStats.pendingOrders}
          </div>
        </div>

        <div 
          className={`${styles.actionCard} ${styles.warning}`}
          onClick={handleLowStockClick}
          style={{ cursor: lowStockCount > 0 && !isLowStockLoading ? 'pointer' : 'default' }}
          role="button"
          tabIndex={lowStockCount > 0 ? 0 : -1}
          aria-label={`מלאי נמוך - ${lowStockCount} מוצרים`}
        >
          <div className={styles.actionIcon}>
            <Icon name="Package" size={24} />
          </div>
          <div className={styles.actionContent}>
            <h4 className={styles.actionTitle}>מלאי נמוך</h4>
            <p className={styles.actionDescription}>מוצרים שצריך להזמין</p>
          </div>
            <div
              className={`${styles.actionValue} ${styles.warningValue}`}
              aria-live="polite"
              title={lowStockTitle}
            >
              {lowStockValue}
            </div>
        </div>

        <div className={`${styles.actionCard} ${styles.info}`}>
          <div className={styles.actionIcon}>
            <Icon name="CreditCard" size={24} />
          </div>
          <div className={styles.actionContent}>
            <h4 className={styles.actionTitle}>בעיות תשלום</h4>
            <p className={styles.actionDescription}>תשלומים כושלים</p>
          </div>
          <div className={`${styles.actionValue} ${styles.infoValue}`}>
            {isStatsLoading ? '...' : orderStats.failedPayments}
          </div>
        </div>
      </div>

      {/* מודאל מלאי נמוך */}
      <LowStockModal
        isOpen={isLowStockModalOpen}
        onClose={() => setIsLowStockModalOpen(false)}
        skus={lowStockSkus}
        isLoading={isLowStockLoading}
      />

      {/* מודאל הזמנות ממתינות */}
      <PendingOrdersModal
        isOpen={isPendingOrdersModalOpen}
        onClose={() => setIsPendingOrdersModalOpen(false)}
        orders={pendingOrdersList}
        isLoading={isPendingOrdersLoading}
      />
    </section>
  );
};

export default HeroSection;
