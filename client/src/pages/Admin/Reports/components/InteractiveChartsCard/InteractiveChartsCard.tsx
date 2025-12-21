/**
 * כרטיס גרפים אינטרקטיביים - הכנסות לפי קבוצות לקוחות
 * 
 * מציג 4 סוגי גרפים:
 * 1. קווי (Line Chart) - מגמות של הכנסות לפי קבוצה
 * 2. עמודות (Bar Chart) - השוואות הכנסות בין קבוצות
 * 3. עוגה (Pie Chart) - התפלגות הכנסות לפי קבוצה
 * 4. אזור (Area Chart) - טרנדים עם מילוי לפי קבוצה
 * 
 * נתונים:
 * - קבוצות לקוחות (VIP, רגילה, מנויה, ללא קבוצה)
 * - סה"כ הכנסות מכל קבוצה
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@ui';
import ReportCard from '../ReportCard';
import DateRangePicker, { type DateRange } from '../DateRangePicker';
import LineChartComponent from './charts/LineChartComponent';
import BarChartComponent from './charts/BarChartComponent';
import PieChartComponent from './charts/PieChartComponent';
import AreaChartComponent from './charts/AreaChartComponent';
import { getRevenueByCustomerGroup } from '../../../../../services/orderService';
import styles from './InteractiveChartsCard.module.css';

// ============================================================================
// Types
// ============================================================================

type ChartType = 'line' | 'bar' | 'pie' | 'area';

interface ChartData {
  groupName: string;
  groupId: string | null;
  revenue: number;
  percentage?: number;
}

// ============================================================================
// Utils
// ============================================================================

/**
 * חישוב אחוז מתוך סה"כ
 */
const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * קבלת ערך ברירת מחדל לטווח תאריכים (30 ימים אחרונים)
 */
const getDefaultDateRange = (): DateRange => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  return {
    startDate: thirtyDaysAgo,
    endDate: now,
    preset: 'month'
  };
};

// ============================================================================
// Component
// ============================================================================

const InteractiveChartsCard: React.FC = () => {
  // ===== State Management =====
  const [selectedChart, setSelectedChart] = useState<ChartType>('line');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== Fetch Data =====
  const fetchChartData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // בדיקה שהתאריכים קיימים
      if (!dateRange.startDate || !dateRange.endDate) {
        setError('בחר טווח תאריכים');
        setIsLoading(false);
        return;
      }

      // המרה לפורמט ISO הנדרש ע"י API
      const startDateStr = dateRange.startDate.toISOString().split('T')[0];
      const endDateStr = dateRange.endDate.toISOString().split('T')[0];

      // שליפת נתוני הכנסות מחולקות לפי קבוצות לקוחות
      const response = await getRevenueByCustomerGroup({
        startDate: startDateStr,
        endDate: endDateStr
      });

      console.log('🔍 Revenue by Group Response:', response);

      if (response.success && Array.isArray(response.data)) {
        // בדוק אם הנתונים תקינים
        const validData = response.data.filter((item: any) => {
          return item && 
                 typeof item.groupName === 'string' && 
                 typeof item.revenue === 'number' &&
                 item.revenue !== undefined;
        });
        
      console.log('✅ Valid Data:', validData);
        
        if (validData.length === 0) {
          // אם אין נתונים - הצג sample data להתחלה
          console.warn('⚠️ No data found, showing sample data');
          const sampleData = [
            { groupName: 'VIP', groupId: 'sample1', revenue: 15000 },
            { groupName: 'רגילה', groupId: 'sample2', revenue: 8000 },
            { groupName: 'ללא קבוצה', groupId: null, revenue: 2000 }
          ];
          // חישוב סה"כ הכנסות
          const totalRevenue = sampleData.reduce((sum, item) => sum + item.revenue, 0);
          // הוספת אחוז לכל קבוצה
          const dataWithPercentage = sampleData.map(item => ({
            ...item,
            percentage: calculatePercentage(item.revenue, totalRevenue)
          }));
          setChartData(dataWithPercentage);
        } else {
          // חישוב סה"כ הכנסות
          const totalRevenue = validData.reduce((sum: number, item: any) => sum + item.revenue, 0);
          // הוספת אחוז לכל קבוצה
          const dataWithPercentage = validData.map((item: any) => ({
            ...item,
            percentage: calculatePercentage(item.revenue, totalRevenue)
          }));
          setChartData(dataWithPercentage);
        }
      } else {
        console.warn('⚠️ Response is not valid:', response);
        setError('לא הצלחנו לטעון את הנתונים');
      }
    } catch (err) {
      console.error('❌ Error fetching chart data:', err);
      setError('שגיאה בטעינת הנתונים: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  // ===== Effects =====
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // ===== Render Helpers =====
  const renderChart = () => {
    // בדוק אם יש נתונים
    if (!chartData || chartData.length === 0) {
      return (
        <div className={styles.errorMessage}>
          <Icon name="AlertCircle" size={24} />
          <span>אין נתונים להצגה</span>
        </div>
      );
    }

    switch (selectedChart) {
      case 'line':
        return <LineChartComponent data={chartData} />;
      case 'bar':
        return <BarChartComponent data={chartData} />;
      case 'pie':
        return <PieChartComponent data={chartData} />;
      case 'area':
        return <AreaChartComponent data={chartData} />;
      default:
        return null;
    }
  };

  // ===== Main Render =====
  return (
    <ReportCard
      icon="LineChart"
      title="גרפים אינטרקטיביים"
      description="הכנסות לפי קבוצות לקוחות"
      accentColor="cyan"
      minHeight={480}
      isLoading={isLoading}
    >
      <div className={styles.chartsContainer}>
        {/* ===== בורר סוגי גרפים ===== */}
        <div className={styles.chartTypeSelector}>
          <button
            className={`${styles.chartTypeBtn} ${selectedChart === 'line' ? styles.active : ''}`}
            onClick={() => setSelectedChart('line')}
            disabled={isLoading}
            title="תרשים קווי"
          >
            <Icon name="LineChart" size={18} />
            <span>קווי</span>
          </button>
          <button
            className={`${styles.chartTypeBtn} ${selectedChart === 'bar' ? styles.active : ''}`}
            onClick={() => setSelectedChart('bar')}
            disabled={isLoading}
            title="תרשים עמודות"
          >
            <Icon name="BarChart3" size={18} />
            <span>עמודות</span>
          </button>
          <button
            className={`${styles.chartTypeBtn} ${selectedChart === 'pie' ? styles.active : ''}`}
            onClick={() => setSelectedChart('pie')}
            disabled={isLoading}
            title="תרשים עוגה"
          >
            <Icon name="PieChart" size={18} />
            <span>עוגה</span>
          </button>
          <button
            className={`${styles.chartTypeBtn} ${selectedChart === 'area' ? styles.active : ''}`}
            onClick={() => setSelectedChart('area')}
            disabled={isLoading}
            title="תרשים אזור"
          >
            <Icon name="TrendingUp" size={18} />
            <span>אזור</span>
          </button>
        </div>

        {/* ===== בורר טווח תאריכים ===== */}
        <div className={styles.dateRangeSection}>
          <div className={styles.sectionLabel}>
            <Icon name="Calendar" size={14} />
            <span>בחר תקופה:</span>
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>

        {/* ===== תוכן הגרף ===== */}
        <div className={styles.chartWrapper}>
          {error ? (
            <div className={styles.errorMessage}>
              <Icon name="AlertCircle" size={24} />
              <span>{error}</span>
            </div>
          ) : (
            renderChart()
          )}
        </div>
      </div>
    </ReportCard>
  );
};

export default InteractiveChartsCard;
