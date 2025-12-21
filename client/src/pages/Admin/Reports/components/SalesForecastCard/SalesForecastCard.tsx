/**
 * כרטיס תחזיות מכירות
 * 
 * מציג תחזית מכירות לחודש הבא על בסיס:
 * - ממוצע נע של 3 חודשים אחרונים
 * - מגמת עלייה/ירידה
 * - אחוז צפי שינוי
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@ui';
import ReportCard from '../ReportCard';
import { getOrdersStats } from '../../../../../services/orderService';
import styles from './SalesForecastCard.module.css';

// ============================================================================
// Types
// ============================================================================

interface MonthlyData {
  month: string;
  revenue: number;
  orders: number;
}

interface ForecastData {
  predictedRevenue: number;
  predictedOrders: number;
  revenueChange: number;
  ordersChange: number;
  confidence: 'high' | 'medium' | 'low';
  basedOnMonths: number;
  monthlyTrend: MonthlyData[];
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

const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('he-IL', { month: 'short' });
};

// ============================================================================
// Component
// ============================================================================

const SalesForecastCard: React.FC = () => {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const monthlyData: MonthlyData[] = [];
      
      // שליפת נתונים ל-3 חודשים אחרונים
      const promises = [];
      for (let i = 0; i < 3; i++) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endOfMonth = i === 0 
          ? now // החודש הנוכחי - עד היום
          : new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        promises.push(
          getOrdersStats({
            startDate: startOfMonth.toISOString().split('T')[0],
            endDate: endOfMonth.toISOString().split('T')[0]
          }).then(response => ({
            month: getMonthName(startOfMonth),
            revenue: response.data.totalRevenue,
            orders: response.data.totalOrders,
            monthIndex: i
          }))
        );
      }

      const results = await Promise.all(promises);
      
      // מיון לפי סדר כרונולוגי (ישן לחדש)
      results.sort((a, b) => b.monthIndex - a.monthIndex);
      
      results.forEach(r => {
        monthlyData.push({
          month: r.month,
          revenue: r.revenue,
          orders: r.orders
        });
      });

      // ===== אלגוריתם תחזית חכם =====
      
      // שלב 1: סינון חודשים עם נתונים משמעותיים (לא 0 או קרובים ל-0)
      const significantMonths = monthlyData.filter(m => m.revenue > 100 && m.orders > 0);
      
      // שלב 2: חישוב תחזית
      let predictedRevenue = 0;
      let predictedOrders = 0;
      
      if (significantMonths.length >= 2) {
        // אם יש לפחות 2 חודשים משמעותיים - משתמשים ב-Weighted Moving Average
        // חודשים קרובים יותר מקבלים משקל גבוה יותר
        const weights = [0.5, 0.3, 0.2]; // החודש האחרון 50%, הקודם 30%, הישן ביותר 20%
        let totalRevenueWeighted = 0;
        let totalOrdersWeighted = 0;
        let totalWeight = 0;
        
        significantMonths.forEach((month, index) => {
          const weight = weights[Math.min(index, weights.length - 1)];
          totalRevenueWeighted += month.revenue * weight;
          totalOrdersWeighted += month.orders * weight;
          totalWeight += weight;
        });
        
        const weightedAvgRevenue = totalRevenueWeighted / totalWeight;
        const weightedAvgOrders = totalOrdersWeighted / totalWeight;
        
        // חישוב מגמת צמיחה (Trend Factor)
        const lastMonth = significantMonths[significantMonths.length - 1];
        const prevMonth = significantMonths[significantMonths.length - 2];
        
        if (prevMonth && prevMonth.revenue > 0) {
          // חישוב קצב צמיחה חודשי
          const growthRate = (lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue;
          
          // הגבלת קצב הצמיחה למנעת תחזיות לא ריאליות
          const cappedGrowthRate = Math.max(-0.5, Math.min(0.5, growthRate)); // מקסימום ±50%
          
          // תחזית = ממוצע משוקלל * (1 + קצב צמיחה * 70%)
          // 70% משקלול - לא רוצים להיות אופטימיים או פסימיים מדי
          predictedRevenue = Math.round(weightedAvgRevenue * (1 + cappedGrowthRate * 0.7));
          predictedOrders = Math.round(weightedAvgOrders * (1 + cappedGrowthRate * 0.7));
        } else {
          // אם אין מספיק נתונים למגמה, משתמשים בממוצע משוקלל
          predictedRevenue = Math.round(weightedAvgRevenue);
          predictedOrders = Math.round(weightedAvgOrders);
        }
        
      } else if (significantMonths.length === 1) {
        // רק חודש אחד משמעותי - משתמשים בו כבסיס + 10% צמיחה שמרנית
        predictedRevenue = Math.round(significantMonths[0].revenue * 1.1);
        predictedOrders = Math.round(significantMonths[0].orders * 1.1);
        
      } else {
        // אין חודשים משמעותיים - תחזית שמרנית מאוד
        const avgRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0) / monthlyData.length;
        const avgOrders = monthlyData.reduce((sum, m) => sum + m.orders, 0) / monthlyData.length;
        predictedRevenue = Math.round(avgRevenue * 1.2);
        predictedOrders = Math.round(avgOrders * 1.2);
      }
      
      const lastMonth = monthlyData[monthlyData.length - 1];

      // חישוב אחוז שינוי צפוי
      const revenueChange = lastMonth.revenue > 0 
        ? Math.round(((predictedRevenue - lastMonth.revenue) / lastMonth.revenue) * 100)
        : 0;
      const ordersChange = lastMonth.orders > 0
        ? Math.round(((predictedOrders - lastMonth.orders) / lastMonth.orders) * 100)
        : 0;

      // קביעת רמת ביטחון לפי כמות נתונים משמעותיים
      const confidence: 'high' | 'medium' | 'low' = 
        significantMonths.length >= 3 && significantMonths.every(m => m.orders >= 8) ? 'high' :
        significantMonths.length >= 2 && significantMonths.every(m => m.revenue > 1000) ? 'high' :
        significantMonths.length >= 2 ? 'medium' : 'low';

      setForecast({
        predictedRevenue,
        predictedOrders,
        revenueChange,
        ordersChange,
        confidence,
        basedOnMonths: monthlyData.length,
        monthlyTrend: monthlyData
      });

    } catch (err) {
      console.error('Error fetching forecast:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  // ===== מצב שגיאה =====
  if (error) {
    return (
      <ReportCard
        icon="Target"
        title="תחזיות מכירות"
        description="חיזוי מבוסס נתונים"
        accentColor="amber"
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
      icon="Target"
      title="תחזיות מכירות"
      description="חיזוי מבוסס נתונים"
      accentColor="amber"
      minHeight={280}
      isLoading={isLoading}
    >
      <div className={styles.forecastContent}>
        {/* ===== תחזית ראשית ===== */}
        <div className={styles.mainForecast}>
          <div className={styles.forecastIcon}>
            <Icon name="TrendingUp" size={24} />
          </div>
          <div className={styles.forecastData}>
            <span className={styles.forecastLabel}>תחזית החודש הבא</span>
            <span className={styles.forecastValue}>
              {formatCurrency(forecast?.predictedRevenue ?? 0)}
            </span>
            {forecast && (
              <span 
                className={styles.forecastChange} 
                data-direction={forecast.revenueChange >= 0 ? 'up' : 'down'}
              >
                <Icon 
                  name={forecast.revenueChange >= 0 ? 'ArrowUp' : 'ArrowDown'} 
                  size={14} 
                />
                {forecast.revenueChange >= 0 ? '+' : ''}{forecast.revenueChange}% צפי 
                {forecast.revenueChange >= 0 ? 'עלייה' : 'ירידה'}
              </span>
            )}
          </div>
        </div>

        {/* ===== מגמת חודשים ===== */}
        {forecast && forecast.monthlyTrend.length > 0 && (
          <div className={styles.trendSection}>
            <div className={styles.trendHeader}>
              <Icon name="BarChart3" size={14} />
              <span>מגמת 3 חודשים אחרונים</span>
            </div>
            <div className={styles.trendBars}>
              {forecast.monthlyTrend.map((month, index) => {
                const maxRevenue = Math.max(...forecast.monthlyTrend.map(m => m.revenue));
                const heightPercent = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={index} className={styles.trendBar}>
                    <div 
                      className={styles.barFill} 
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className={styles.barLabel}>{month.month}</span>
                    <span className={styles.barValue}>
                      {formatCurrency(month.revenue)}
                    </span>
                  </div>
                );
              })}
              {/* עמודה לתחזית */}
              <div className={styles.trendBar} data-forecast>
                <div 
                  className={styles.barFill} 
                  style={{ 
                    height: `${Math.max(...forecast.monthlyTrend.map(m => m.revenue)) > 0 
                      ? (forecast.predictedRevenue / Math.max(...forecast.monthlyTrend.map(m => m.revenue))) * 100 
                      : 0}%` 
                  }}
                />
                <span className={styles.barLabel}>תחזית</span>
                <span className={styles.barValue}>
                  {formatCurrency(forecast.predictedRevenue)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===== הסבר חישוב ===== */}
        <div className={styles.calculationExplanation}>
          <div className={styles.explanationHeader}>
            <Icon name="TrendingUp" size={14} />
            <span>איך מחושבת התחזית?</span>
          </div>
          <div className={styles.explanationContent}>
            <div className={styles.explanationStep}>
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepText}>סינון חודשים משמעותיים (מעל ₪100)</span>
            </div>
            <div className={styles.explanationStep}>
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepText}>חישוב ממוצע משוקלל - חודשים קרובים משפיעים יותר</span>
            </div>
            <div className={styles.explanationStep}>
              <span className={styles.stepNumber}>3</span>
              <span className={styles.stepText}>ניתוח מגמת צמיחה בין החודשים</span>
            </div>
            <div className={styles.explanationStep}>
              <span className={styles.stepNumber}>4</span>
              <span className={styles.stepText}>תחזית = ממוצע × (1 + מגמה × 70%)</span>
            </div>
          </div>
        </div>

        {/* ===== הערת ביטחון ===== */}
        <div className={styles.forecastNote}>
          <Icon name="Info" size={14} />
          <span>
            {forecast?.confidence === 'high' 
              ? 'תחזית מדויקת על בסיס נתונים עשירים'
              : forecast?.confidence === 'medium'
              ? 'תחזית משוערת - מומלץ יותר נתונים'
              : 'תחזית ראשונית - נדרשים יותר נתונים'}
          </span>
        </div>
      </div>
    </ReportCard>
  );
};

export default SalesForecastCard;
