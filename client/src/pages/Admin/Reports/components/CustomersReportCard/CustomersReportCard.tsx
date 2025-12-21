/**
 * כרטיס דוח לקוחות עם ניתוח מגמות
 * 
 * מציג סטטיסטיקות לקוחות:
 * - לקוחות חדשים (החודש) + מגמה
 * - לקוחות פעילים
 * - סל ממוצע + מגמה
 * - סה"כ לקוחות + מגמת גדילה
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Icon, type IconName } from '@ui';
import ReportCard from '../ReportCard';
import userManagementService from '../../../../../services/userManagementService';
import { getOrdersStats } from '../../../../../services/orderService';
import styles from './CustomersReportCard.module.css';

// ============================================================================
// Types
// ============================================================================

interface TrendInfo {
  percentChange: number;
  direction: 'up' | 'down' | 'stable';
}

interface CustomerStats {
  totalUsers: number;
  activeUsers: number;
  newCustomersThisMonth: number;
  averageOrderValue: number;
  trends: {
    newCustomers: TrendInfo;
    totalUsers: TrendInfo & { growthThisMonth: number };
  };
}

// ============================================================================
// Utils
// ============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// ============================================================================
// Sub-Components
// ============================================================================

interface TrendBadgeProps {
  percentChange: number;
  direction: 'up' | 'down' | 'stable';
  label?: string;
}

const TrendBadge: React.FC<TrendBadgeProps> = ({ percentChange, direction, label }) => {
  if (direction === 'stable' && percentChange === 0) {
    return (
      <span className={styles.trendBadge} data-direction="stable">
        <Icon name="Minus" size={12} />
        <span>ללא שינוי</span>
      </span>
    );
  }

  const iconName: IconName = direction === 'up' ? 'TrendingUp' : 'TrendingDown';
  const sign = direction === 'up' ? '+' : '';

  return (
    <span className={styles.trendBadge} data-direction={direction}>
      <Icon name={iconName} size={12} />
      <span>{sign}{percentChange}%</span>
      {label && <span className={styles.trendLabel}>{label}</span>}
    </span>
  );
};

// ============================================================================
// Component
// ============================================================================

const CustomersReportCard: React.FC = () => {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // שליפת נתונים במקביל
      const [userStatsResponse, orderStatsResponse] = await Promise.all([
        userManagementService.getUserStatistics(),
        getOrdersStats()
      ]);

      setStats({
        totalUsers: userStatsResponse.totalUsers,
        activeUsers: userStatsResponse.activeUsers,
        newCustomersThisMonth: userStatsResponse.newCustomersThisMonth,
        averageOrderValue: orderStatsResponse.data.averageOrderValue || 0,
        trends: {
          newCustomers: userStatsResponse.trends.newCustomers,
          totalUsers: userStatsResponse.trends.totalUsers
        }
      });
    } catch (err) {
      console.error('Error fetching customer stats:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ==================== מצבים מיוחדים ====================
  if (error) {
    return (
      <ReportCard
        icon="Users"
        title="דוח לקוחות"
        description="ניתוח התנהגות ופילוח"
        accentColor="purple"
        minHeight={280}
      >
        <div className={styles.errorState}>
          <Icon name="AlertCircle" size={32} />
          <p>{error}</p>
        </div>
      </ReportCard>
    );
  }

  // ==================== תוכן ראשי ====================
  return (
    <ReportCard
      icon="Users"
      title="דוח לקוחות"
      description="ניתוח התנהגות ופילוח"
      accentColor="purple"
      minHeight={280}
      isLoading={isLoading}
    >
      <div className={styles.customersContent}>
        {/* ===== סטטיסטיקות לקוחות ===== */}
        <div className={styles.statsGrid}>
          {/* לקוחות חדשים */}
          <div className={styles.statCard}>
            <div className={styles.statIcon} data-color="green">
              <Icon name="UserPlus" size={20} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>לקוחות חדשים</span>
              <span className={styles.statSubLabel}>החודש</span>
              <strong className={styles.statValue}>
                {stats?.newCustomersThisMonth ?? 0}
              </strong>
              {stats?.trends?.newCustomers && (
                <TrendBadge 
                  percentChange={stats.trends.newCustomers.percentChange}
                  direction={stats.trends.newCustomers.direction}
                  label="מחודש קודם"
                />
              )}
            </div>
          </div>

          {/* לקוחות פעילים */}
          <div className={styles.statCard}>
            <div className={styles.statIcon} data-color="blue">
              <Icon name="UserCheck" size={20} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>לקוחות פעילים</span>
              <span className={styles.statSubLabel}>סה"כ</span>
              <strong className={styles.statValue}>
                {stats?.activeUsers ?? 0}
              </strong>
            </div>
          </div>

          {/* סל ממוצע */}
          <div className={styles.statCard}>
            <div className={styles.statIcon} data-color="orange">
              <Icon name="ShoppingCart" size={20} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>סל ממוצע</span>
              <span className={styles.statSubLabel}>להזמנה</span>
              <strong className={styles.statValue}>
                {formatCurrency(stats?.averageOrderValue ?? 0)}
              </strong>
            </div>
          </div>

          {/* סה"כ לקוחות */}
          <div className={styles.statCard}>
            <div className={styles.statIcon} data-color="purple">
              <Icon name="Users" size={20} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>סה"כ לקוחות</span>
              <span className={styles.statSubLabel}>במערכת</span>
              <strong className={styles.statValue}>
                {stats?.totalUsers ?? 0}
              </strong>
              {stats?.trends?.totalUsers && stats.trends.totalUsers.growthThisMonth > 0 && (
                <TrendBadge 
                  percentChange={stats.trends.totalUsers.percentChange}
                  direction={stats.trends.totalUsers.direction}
                  label="גדילה החודש"
                />
              )}
            </div>
          </div>
        </div>

        {/* ===== סיכום מגמות ===== */}
        <div className={styles.footer}>
          <div className={styles.trendsSummary}>
            <Icon name="TrendingUp" size={14} />
            <span>
              {stats?.trends?.newCustomers?.direction === 'up' 
                ? `מגמת עלייה של ${stats.trends.newCustomers.percentChange}% בלקוחות חדשים`
                : stats?.trends?.newCustomers?.direction === 'down'
                ? `ירידה של ${Math.abs(stats.trends.newCustomers.percentChange)}% בלקוחות חדשים`
                : 'מגמה יציבה בהרשמות'
              }
            </span>
          </div>
        </div>
      </div>
    </ReportCard>
  );
};

export default CustomersReportCard;
