// ==========================================
// דף ניהול שיוך לקוחות לקבוצות - משימה 2: שיוך לקוחות לקבוצות
// ==========================================
// מטרת הדף: מסך ראשי לניהול שיוך לקוחות לקבוצות
// למה זה חשוב: מאפשר למנהל לראות את כל הלקוחות ולשייך אותם לקבוצות
//
// מה הדף יכלול:
// 1. כותרת ותיאור של הפונקציונליות
// 2. רשימת כל הלקוחות עם אפשרות שיוך
// 3. סטטיסטיקות על שיוכים
// 4. חיבור לכל הקומפוננטות הקיימות
//
// הטכנולוגיות שבהן נשתמש:
// - React עם TypeScript
// - Redux Toolkit לניהול מצב
// - קומפוננטות קיימות מתיקיית features

import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import UserManagementList from '../../../components/features/admin/UserManagement/UserManagementList';
import PendingApprovalList from '../../../components/features/admin/UserManagement/PendingApprovalList';
import { getAllSettings } from '../../../services/settingsService';
import styles from './UserManagementPage.module.css';

const UserManagementPage: React.FC = () => {
  // בדיקה האם התכונה של אישור הרשמות מופעלת
  const [showPendingApproval, setShowPendingApproval] = useState(false);

  useEffect(() => {
    const checkSettings = async () => {
      try {
        const response = await getAllSettings();
        if (response.success && response.data.users?.requireRegistrationApproval) {
          setShowPendingApproval(true);
        }
      } catch (error) {
        console.error('Error checking settings:', error);
      }
    };
    checkSettings();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <div className={styles.titleIcon}>
            <Shield size={28} strokeWidth={2} />
          </div>
          <div>
            <h1 className={styles.title}>ניהול משתמשים</h1>
            <p className={styles.description}>
              כאן תוכל לראות את כל הלקוחות במערכת, לשייך אותם לקבוצות,
              לבטל שיוכים קיימים ולצפות בחברי כל קבוצה.
            </p>
          </div>
        </div>
      </div>

      {/* רשימת משתמשים ממתינים לאישור - מוצג רק אם התכונה מופעלת */}
      {showPendingApproval && (
        <div className={styles.content}>
          <PendingApprovalList />
        </div>
      )}

      {/* תוכן הדף - רשימת ניהול המשתמשים */}
      <div className={`${styles.content} ${styles.fill}`}>
        <UserManagementList />
      </div>
    </div>
  );
};

export default UserManagementPage;
