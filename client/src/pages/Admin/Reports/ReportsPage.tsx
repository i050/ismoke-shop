/**
 * דף דוחות ואנליטיקה - שלד UI מקצועי
 * 
 * כולל 7 סקציות:
 * 1. דוח מכירות (יומי, שבועי, חודשי)
 * 2. ניתוח מוצרים נמכרים
 * 3. דוח לקוחות
 * 4. גרפים אינטראקטיביים
 * 5. יצוא ל-Excel/PDF
 * 6. השוואת תקופות
 * 7. תחזיות מכירות
 */

import React, { useState } from 'react';
import { Icon } from '@ui';
import { 
  DateRangePicker, 
  SalesReportCard, 
  ProductsAnalysisCard, 
  CustomersReportCard,
  PeriodComparisonCard,
  SalesForecastCard,
  DataExportCard,
  InteractiveChartsCard,
  type DateRange 
} from './components';
import styles from './ReportsPage.module.css';

// ============================================================================
// Component
// ============================================================================

const ReportsPage: React.FC = () => {
  // סטייט לטווח תאריכים גלובלי
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
    preset: 'month'
  });

  return (
    <div className={styles.reportsPage}>
      {/* ===== כותרת הדף ===== */}
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <div className={styles.titleIcon}>
              <Icon name="BarChart3" size={28} />
            </div>
            <div>
              <h1 className={styles.pageTitle}>דוחות ואנליטיקה</h1>
              <p className={styles.pageSubtitle}>
                ניתוח ביצועים, מגמות ותחזיות עסקיות
              </p>
            </div>
          </div>
          
          {/* בורר תאריכים גלובלי */}
          {/* <div className={styles.dateRangeSection}>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              showCustomPicker
            />
          </div> */}
        </div>
      </header>

      {/* ===== גריד הכרטיסים ===== */}
      <div className={styles.cardsGrid}>
        
        {/* כרטיס 1: דוח מכירות - עם נתונים אמיתיים */}
        <SalesReportCard />

        {/* כרטיס 2: ניתוח מוצרים נמכרים - נתונים אמיתיים */}
        <ProductsAnalysisCard />

        {/* כרטיס 3: דוח לקוחות - נתונים אמיתיים */}
        <CustomersReportCard />

        {/* כרטיס 4: השוואת תקופות - נתונים אמיתיים */}
        <PeriodComparisonCard />

        {/* כרטיס 5: תחזיות מכירות - נתונים אמיתיים */}
        <SalesForecastCard />

        {/* כרטיס 6: יצוא נתונים - פונקציונלי */}
        <DataExportCard />

        {/* כרטיס 7: גרפים אינטראקטיביים - פעיל ופונקציונלי */}
        <InteractiveChartsCard />

      </div>
    </div>
  );
};

export default ReportsPage;
