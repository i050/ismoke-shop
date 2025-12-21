import React from 'react';
import { TitleWithIcon, PlaceholderPage } from '../../../components/ui';
import styles from './CustomersPage.module.css';

/**
 * דף ניהול לקוחות
 * כרגע placeholder - בעתיד יכיל ניהול מלא של לקוחות
 */
const CustomersPage: React.FC = () => {
  return (
    <div className={styles.customersPage}>
      <TitleWithIcon
        icon="Users"
        title="ניהול לקוחות"
        subtitle="דף זה נמצא כעת בפיתוח - בקרוב יהיה זמין"
        isDev
      />
      
      <PlaceholderPage
        icon="Users"
        title="מה יכלול הדף:"
        description="כאן יוצג מערכת ניהול לקוחות מתקדמת עם:"
        features={[
          { text: 'רשימת לקוחות עם פרטי קשר', icon: 'User' },
          { text: 'היסטוריית רכישות', icon: 'ShoppingCart' },
          { text: 'פרטי לקוח מלאים', icon: 'User' },
          { text: 'סטטיסטיקות לקוח', icon: 'BarChart3' },
          { text: 'שיוך לקבוצות לקוח', icon: 'UsersRound' },
          { text: 'ניהול הרשאות', icon: 'Shield' },
          { text: 'תקשורת עם לקוחות', icon: 'MessageCircle' },
        ]}
      />
    </div>
  );
};

export default CustomersPage;
