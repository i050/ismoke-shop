// ==========================================
// TopBar - פס עליון לאזור הניהול
// ==========================================
// מטרה: להציג breadcrumbs, כפתורי פעולה מהירים ושדה חיפוש
// מיקום: מוצג בתוך AdminLayout, מעל ה-content של כל דף

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from '../../../../components/ui';
import Breadcrumbs from '../../../../components/ui/Breadcrumbs';
import styles from './TopBar.module.css';

// ממפה את הנתיבים לשמות בעברית
const routeNameMap: Record<string, string> = {
  '/admin': 'דשבורד',
  '/admin/orders': 'הזמנות',
  '/admin/products': 'מוצרים',
  '/admin/customers': 'לקוחות',
  '/admin/customer-groups': 'קבוצות לקוח',
  '/admin/user-management': 'ניהול משתמשים',
  '/admin/reports': 'דוחות',
  '/admin/settings': 'הגדרות',
};

const TopBar: React.FC = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  // יצירת breadcrumbs items מהנתיב הנוכחי
  const createBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items = [];

    // תמיד מתחילים מ"לוח ניהול"
    items.push({
      label: 'לוח ניהול',
      path: '/admin',
    });

    // בניית הנתיב המצטבר
    let currentPath = '';
    for (const segment of pathSegments) {
      if (segment === 'admin') continue; // כבר הוספנו את זה בהתחלה

      currentPath += `/${segment}`;
      const fullPath = `/admin${currentPath}`;
      const label = routeNameMap[fullPath] || segment;

      items.push({
        label,
        path: fullPath,
      });
    }

    return items;
  };

  // טיפול בחיפוש
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('🔍 חיפוש:', searchQuery);
      // כאן נוסיף בעתיד לוגיקת חיפוש אמיתית
    }
  };

  // טיפול בלחיצה על כפתור פעולה מהירה
  const handleQuickAction = (action: string) => {
    console.log('⚡ פעולה מהירה:', action);
    // כאן נוסיף בעתיד לוגיקת פעולות מהירות
  };

  const breadcrumbItems = createBreadcrumbs();

  return (
    <div className={styles.topBar}>
      <div className={styles.container}>
        {/* Breadcrumbs - ניווט */}
        <div className={styles.breadcrumbsWrapper}>
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* אזור פעולות - חיפוש וכפתורים */}
        <div className={styles.actionsWrapper}>
          {/* שדה חיפוש */}
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש מהיר..."
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton} aria-label="חפש">
              <Icon name="Search" size={18} />
            </button>
          </form>

          {/* כפתורי פעולה מהירים */}
          <div className={styles.quickActions}>
            <button
              className={`${styles.quickActionBtn} ${styles.notifications}`}
              onClick={() => handleQuickAction('notifications')}
              aria-label="התראות"
              title="התראות"
            >
              <Icon name="Bell" size={18} />
              <span className={styles.badge}>3</span>
            </button>

            <button
              className={`${styles.quickActionBtn} ${styles.help}`}
              onClick={() => handleQuickAction('help')}
              aria-label="עזרה"
              title="עזרה"
            >
              <Icon name="HelpCircle" size={18} />
            </button>

            <button
              className={`${styles.quickActionBtn} ${styles.settings}`}
              onClick={() => handleQuickAction('settings-quick')}
              aria-label="הגדרות מהירות"
              title="הגדרות מהירות"
            >
              <Icon name="Settings" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
