/**
 * כרטיס השוואת תקופות
 * 
 * מאפשר השוואה בין שתי תקופות:
 * - מכירות
 * - הזמנות
 * - ממוצע הזמנה
 * 
 * מציג את ההפרש באחוזים בין התקופות
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Icon, type IconName } from '@ui';
import ReportCard from '../ReportCard';
import { getOrdersStats } from '../../../../../services/orderService';
import styles from './PeriodComparisonCard.module.css';

// ============================================================================
// Types
// ============================================================================

type PeriodPreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear';

interface PeriodOption {
  id: PeriodPreset;
  label: string;
  getRange: () => { start: Date; end: Date };
}

interface PeriodStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface ComparisonResult {
  metric: string;
  iconName: IconName;
  periodA: number;
  periodB: number;
  percentChange: number;
  direction: 'up' | 'down' | 'stable';
  format: 'currency' | 'number';
}

// ============================================================================
// Constants
// ============================================================================

const PERIOD_OPTIONS: PeriodOption[] = [
  {
    id: 'thisMonth',
    label: 'החודש הנוכחי',
    getRange: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now
      };
    }
  },
  {
    id: 'lastMonth',
    label: 'חודש קודם',
    getRange: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0)
      };
    }
  },
  {
    id: 'thisQuarter',
    label: 'רבעון נוכחי',
    getRange: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), quarter * 3, 1),
        end: now
      };
    }
  },
  {
    id: 'lastQuarter',
    label: 'רבעון קודם',
    getRange: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const prevQuarter = quarter === 0 ? 3 : quarter - 1;
      const year = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return {
        start: new Date(year, prevQuarter * 3, 1),
        end: new Date(year, prevQuarter * 3 + 3, 0)
      };
    }
  },
  {
    id: 'thisYear',
    label: 'שנה נוכחית',
    getRange: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now
      };
    }
  },
  {
    id: 'lastYear',
    label: 'שנה קודמת',
    getRange: () => {
      const now = new Date();
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31)
      };
    }
  }
];

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

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

// ============================================================================
// Component
// ============================================================================

const PeriodComparisonCard: React.FC = () => {
  // ===== סטייטים =====
  const [periodA, setPeriodA] = useState<PeriodPreset>('thisMonth');
  const [periodB, setPeriodB] = useState<PeriodPreset>('lastMonth');
  const [statsA, setStatsA] = useState<PeriodStats | null>(null);
  const [statsB, setStatsB] = useState<PeriodStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== שליפת נתונים =====
  const fetchComparison = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const optionA = PERIOD_OPTIONS.find(p => p.id === periodA)!;
      const optionB = PERIOD_OPTIONS.find(p => p.id === periodB)!;
      
      const rangeA = optionA.getRange();
      const rangeB = optionB.getRange();

      // שליפת נתונים במקביל
      const [responseA, responseB] = await Promise.all([
        getOrdersStats({
          startDate: formatDate(rangeA.start),
          endDate: formatDate(rangeA.end)
        }),
        getOrdersStats({
          startDate: formatDate(rangeB.start),
          endDate: formatDate(rangeB.end)
        })
      ]);

      setStatsA({
        totalOrders: responseA.data.totalOrders,
        totalRevenue: responseA.data.totalRevenue,
        averageOrderValue: responseA.data.averageOrderValue
      });

      setStatsB({
        totalOrders: responseB.data.totalOrders,
        totalRevenue: responseB.data.totalRevenue,
        averageOrderValue: responseB.data.averageOrderValue
      });

    } catch (err) {
      console.error('Error fetching comparison:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  }, [periodA, periodB]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  // ===== חישוב תוצאות השוואה =====
  const getComparisonResults = (): ComparisonResult[] => {
    if (!statsA || !statsB) return [];

    const results: ComparisonResult[] = [
      {
        metric: 'מכירות',
        iconName: 'DollarSign',
        periodA: statsA.totalRevenue,
        periodB: statsB.totalRevenue,
        percentChange: calculatePercentChange(statsA.totalRevenue, statsB.totalRevenue),
        direction: statsA.totalRevenue > statsB.totalRevenue ? 'up' : statsA.totalRevenue < statsB.totalRevenue ? 'down' : 'stable',
        format: 'currency'
      },
      {
        metric: 'הזמנות',
        iconName: 'ShoppingBag',
        periodA: statsA.totalOrders,
        periodB: statsB.totalOrders,
        percentChange: calculatePercentChange(statsA.totalOrders, statsB.totalOrders),
        direction: statsA.totalOrders > statsB.totalOrders ? 'up' : statsA.totalOrders < statsB.totalOrders ? 'down' : 'stable',
        format: 'number'
      },
      {
        metric: 'ממוצע הזמנה',
        iconName: 'TrendingUp',
        periodA: statsA.averageOrderValue,
        periodB: statsB.averageOrderValue,
        percentChange: calculatePercentChange(statsA.averageOrderValue, statsB.averageOrderValue),
        direction: statsA.averageOrderValue > statsB.averageOrderValue ? 'up' : statsA.averageOrderValue < statsB.averageOrderValue ? 'down' : 'stable',
        format: 'currency'
      }
    ];

    return results;
  };

  const comparisonResults = getComparisonResults();

  // ===== מצב שגיאה =====
  if (error) {
    return (
      <ReportCard
        icon="ArrowLeftRight"
        title="השוואת תקופות"
        description="השוואה בין חודשים, רבעונים ושנים"
        accentColor="pink"
        minHeight={280}
      >
        <div className={styles.errorState}>
          <Icon name="AlertCircle" size={32} />
          <p>{error}</p>
        </div>
      </ReportCard>
    );
  }

  // ===== רינדור ראשי =====
  return (
    <ReportCard
      icon="ArrowLeftRight"
      title="השוואת תקופות"
      description="השוואה בין חודשים, רבעונים ושנים"
      accentColor="pink"
      minHeight={280}
      isLoading={isLoading}
    >
      <div className={styles.comparisonContent}>
        {/* ===== בחירת תקופות ===== */}
        <div className={styles.periodSelectors}>
          <div className={styles.periodSelector}>
            <label className={styles.selectorLabel}>תקופה א'</label>
            <select
              value={periodA}
              onChange={(e) => setPeriodA(e.target.value as PeriodPreset)}
              className={styles.periodSelect}
            >
              {PERIOD_OPTIONS.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.vsIcon}>
            <Icon name="ArrowLeftRight" size={18} />
          </div>

          <div className={styles.periodSelector}>
            <label className={styles.selectorLabel}>תקופה ב'</label>
            <select
              value={periodB}
              onChange={(e) => setPeriodB(e.target.value as PeriodPreset)}
              className={styles.periodSelect}
            >
              {PERIOD_OPTIONS.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== תוצאות השוואה ===== */}
        <div className={styles.resultsGrid}>
          {comparisonResults.map((result, index) => (
            <div key={index} className={styles.resultCard}>
              <div className={styles.resultHeader}>
                <Icon name={result.iconName} size={16} />
                <span className={styles.resultMetric}>{result.metric}</span>
              </div>
              
              <div className={styles.resultValues}>
                <div className={styles.periodValue}>
                  <span className={styles.periodLabel}>א'</span>
                  <span className={styles.valueText}>
                    {result.format === 'currency' 
                      ? formatCurrency(result.periodA)
                      : result.periodA.toLocaleString()
                    }
                  </span>
                </div>
                
                <div className={styles.changeIndicator} data-direction={result.direction}>
                  <Icon 
                    name={result.direction === 'up' ? 'TrendingUp' : result.direction === 'down' ? 'TrendingDown' : 'Minus'} 
                    size={14} 
                  />
                  <span>
                    {result.direction === 'up' ? '+' : ''}
                    {result.percentChange}%
                  </span>
                </div>
                
                <div className={styles.periodValue}>
                  <span className={styles.periodLabel}>ב'</span>
                  <span className={styles.valueText}>
                    {result.format === 'currency' 
                      ? formatCurrency(result.periodB)
                      : result.periodB.toLocaleString()
                    }
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ReportCard>
  );
};

export default PeriodComparisonCard;
