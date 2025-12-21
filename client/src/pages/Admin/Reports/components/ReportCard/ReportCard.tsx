/**
 * כרטיס דוח בסיסי - קומפוננטה משותפת לכל הכרטיסים בעמוד הדוחות
 * משמש כשלד לכל סוגי הדוחות עם אפשרות להתאמה אישית
 */

import React from 'react';
import { Icon, type IconName } from '@ui';
import styles from './ReportCard.module.css';

// ============================================================================
// Types
// ============================================================================

export interface ReportCardProps {
  /** שם האייקון מספריית Lucide */
  icon: IconName;
  /** כותרת הכרטיס */
  title: string;
  /** תיאור קצר */
  description: string;
  /** צבע הדגשה - לאייקון ולבורדר */
  accentColor?: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'pink' | 'amber';
  /** תוכן מותאם אישית */
  children?: React.ReactNode;
  /** האם הכרטיס בטעינה */
  isLoading?: boolean;
  /** האם הכרטיס בפיתוח (Coming Soon) */
  isComingSoon?: boolean;
  /** פעולות נוספות בכותרת */
  actions?: React.ReactNode;
  /** גובה מינימלי */
  minHeight?: number;
}

// ============================================================================
// Component
// ============================================================================

const ReportCard: React.FC<ReportCardProps> = ({
  icon,
  title,
  description,
  accentColor = 'blue',
  children,
  isLoading = false,
  isComingSoon = true,
  actions,
  minHeight = 200
}) => {
  return (
    <div 
      className={`${styles.card} ${styles[accentColor]}`}
      style={{ minHeight }}
    >
      {/* כותרת הכרטיס */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={`${styles.iconWrapper} ${styles[`icon${accentColor.charAt(0).toUpperCase() + accentColor.slice(1)}`]}`}>
            <Icon name={icon} size={22} />
          </div>
          <div className={styles.headerText}>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
          </div>
        </div>
        
        {/* פעולות או תגית Coming Soon */}
        <div className={styles.headerRight}>
          {actions}
          {isComingSoon && !actions && (
            <span className={styles.comingSoonBadge}>בקרוב</span>
          )}
        </div>
      </div>

      {/* תוכן הכרטיס */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>טוען נתונים...</span>
          </div>
        ) : children ? (
          children
        ) : (
          <div className={styles.placeholder}>
            <Icon name="BarChart3" size={48} className={styles.placeholderIcon} />
            <p>התוכן יתווסף בהמשך</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportCard;
