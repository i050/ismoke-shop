/**
 * כרטיס דוח מכירות - מציג סטטיסטיקות מכירות יומי/שבועי/חודשי
 * משתמש ב-API הקיים של getOrdersStats עם טווחי תאריכים שונים
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '@ui';
import { getOrdersStats } from '@/services/orderService';
import ReportCard from '../ReportCard';
import styles from './SalesReportCard.module.css';

// ============================================================================
// Types
// ============================================================================

interface SalesData {
  today: number;
  week: number;
  month: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
}

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

/** חישוב תאריך התחלה של היום */
const getTodayStart = (): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
};

/** חישוב תאריך התחלה של השבוע (7 ימים אחורה) */
const getWeekStart = (): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
};

/** חישוב תאריך התחלה של החודש */
const getMonthStart = (): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};

// ============================================================================
// Component
// ============================================================================

const SalesReportCard: React.FC = () => {
  // סטייט לנתוני מכירות
  const [salesData, setSalesData] = useState<SalesData>({
    today: 0,
    week: 0,
    month: 0,
    todayOrders: 0,
    weekOrders: 0,
    monthOrders: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // טעינת נתונים
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchSalesData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // שליפת נתונים במקביל לשלוש תקופות
        const [todayRes, weekRes, monthRes] = await Promise.all([
          getOrdersStats({ startDate: getTodayStart() }),
          getOrdersStats({ startDate: getWeekStart() }),
          getOrdersStats({ startDate: getMonthStart() })
        ]);

        setSalesData({
          today: todayRes.success ? todayRes.data.totalRevenue : 0,
          week: weekRes.success ? weekRes.data.totalRevenue : 0,
          month: monthRes.success ? monthRes.data.totalRevenue : 0,
          todayOrders: todayRes.success ? todayRes.data.totalOrders : 0,
          weekOrders: weekRes.success ? weekRes.data.totalOrders : 0,
          monthOrders: monthRes.success ? monthRes.data.totalOrders : 0
        });

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching sales data:', err);
          setError('שגיאה בטעינת נתוני מכירות');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();

    return () => controller.abort();
  }, []);

  return (
    <ReportCard
      icon="Receipt"
      title="דוח מכירות"
      description="יומי, שבועי, חודשי ושנתי"
      accentColor="blue"
      isLoading={isLoading}
      isComingSoon={false}
      minHeight={280}
    >
      {error ? (
        <div className={styles.errorState}>
          <Icon name="AlertCircle" size={24} />
          <span>{error}</span>
        </div>
      ) : (
        <div className={styles.salesContent}>
          {/* שורת סטטיסטיקות ראשית */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <Icon name="Calendar" size={16} className={styles.statIcon} />
                <span className={styles.statLabel}>היום</span>
              </div>
              <div className={styles.statValue}>{formatCurrency(salesData.today)}</div>
              <div className={styles.statMeta}>
                <Icon name="Receipt" size={12} />
                <span>{salesData.todayOrders} הזמנות</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <Icon name="Calendar" size={16} className={styles.statIcon} />
                <span className={styles.statLabel}>השבוע</span>
              </div>
              <div className={styles.statValue}>{formatCurrency(salesData.week)}</div>
              <div className={styles.statMeta}>
                <Icon name="Receipt" size={12} />
                <span>{salesData.weekOrders} הזמנות</span>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.highlighted}`}>
              <div className={styles.statHeader}>
                <Icon name="TrendingUp" size={16} className={styles.statIcon} />
                <span className={styles.statLabel}>החודש</span>
              </div>
              <div className={styles.statValue}>{formatCurrency(salesData.month)}</div>
              <div className={styles.statMeta}>
                <Icon name="Receipt" size={12} />
                <span>{salesData.monthOrders} הזמנות</span>
              </div>
            </div>
          </div>

          {/* סיכום ממוצע יומי */}
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>ממוצע יומי (חודש)</span>
              <span className={styles.summaryValue}>
                {formatCurrency(salesData.month / Math.max(new Date().getDate(), 1))}
              </span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>ממוצע להזמנה</span>
              <span className={styles.summaryValue}>
                {formatCurrency(salesData.monthOrders > 0 ? salesData.month / salesData.monthOrders : 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </ReportCard>
  );
};

export default SalesReportCard;
