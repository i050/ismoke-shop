import React from 'react';
import HeroSection from './components/HeroSection';
import TasksSection from './components/TasksSection';
import InsightsSection from './components/InsightsSection';
import InconsistencyAlertWidget from './components/InconsistencyAlertWidget';
import styles from './AdminDashboard.module.css';

/**
 * דשבורד ראשי לאזור הניהול
 * מציג סטטיסטיקות, משימות ותובנות עסקיות
 */
const AdminDashboard: React.FC = () => {
  return (
    <div className={styles.dashboard}>
      {/* כותרת ראשית */}
      <header className={styles.dashboardHeader}>
        <h1 className={styles.title}>לוח הבקרה</h1>
        <p className={styles.subtitle}>סקירה כללית של המערכת</p>
      </header>

      {/* מקטע Hero - הכנסות ופעולות דחופות */}
      <HeroSection />

      {/* התראות אי-עקביות במוצרים */}
      <InconsistencyAlertWidget />

      {/* מקטע משימות */}
      {/* <TasksSection /> */}

      {/* מקטע תובנות */}
      <InsightsSection />
    </div>
  );
};

export default AdminDashboard;
