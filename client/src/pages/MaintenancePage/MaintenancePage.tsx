/**
 * PrivateModePage - עמוד מצב פרטי
 * 
 * עמוד זה מוצג למבקרים כאשר האתר במצב פרטי.
 * עיצוב נקי ומינימליסטי ללא סמלי חנות או מותג.
 * מספק אפשרות להתחברות/הרשמה למשתמשים.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useSiteStatus } from '../../contexts/SiteStatusContext';
import { Icon } from '../../components/ui';
import styles from './MaintenancePage.module.css';

const MaintenancePage: React.FC = () => {
  const { status } = useSiteStatus();

  return (
    <div className={styles.container}>
      {/* אייקון נעילה - מצב פרטי */}
      <div className={styles.iconWrapper}>
        <Icon name="Lock" size={64} className={styles.icon} />
      </div>

      {/* כותרת */}
      <h1 className={styles.title}>מצב פרטי</h1>

      {/* הודעה מותאמת אישית מהשרת */}
      <p className={styles.message}>
        {status.message || 'האתר זמין כרגע רק למשתמשים רשומים'}
      </p>

      {/* תיאור נוסף */}
      <p className={styles.description}>
        כדי לגשת לאתר, עליך להתחבר לחשבון קיים
        <br />
        או ליצור חשבון חדש.
      </p>

      {/* כפתורי פעולה */}
      <div className={styles.actions}>
        <Link to="/login" className={styles.primaryButton}>
          <Icon name="LogIn" size={20} />
          <span>התחברות</span>
        </Link>
        
        <Link to="/register" className={styles.secondaryButton}>
          <Icon name="UserPlus" size={20} />
          <span>יצירת חשבון</span>
        </Link>
      </div>

      {/* פוטר מינימליסטי */}
      {/* <div className={styles.footer}>
        <p>לשאלות ובירורים:</p>
        <a href="mailto:support@example.com" className={styles.contactLink}>
          <Icon name="Mail" size={16} />
          <span>support@example.com</span>
        </a>
      </div> */}
    </div>
  );
};

export default MaintenancePage;
