import React from 'react';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';
import styles from './TitleWithIcon.module.css';

interface TitleWithIconProps {
  /** טקסט הכותרת */
  title: string;
  /** תת-כותרת אופציונלית */
  subtitle?: string;
  /** שם האייקון */
  icon: IconName;
  /** האם זה דף בפיתוח */
  isDev?: boolean;
}

/**
 * TitleWithIcon - כותרת אחידה עם אייקון בריבוע ותג אופציונלי
 * 
 * רכיב זה משמש לכותרות דפים באזור הניהול
 * מציג אייקון בריבוע צבעוני + כותרת + תת-כותרת אופציונלית + תג "בפיתוח" אופציונלי
 * 
 * דוגמה:
 * <TitleWithIcon 
 *   icon="Package" 
 *   title="מוצרים" 
 *   subtitle="ניהול המוצרים בחנות"
 *   isDev={true}
 * />
 */
export const TitleWithIcon: React.FC<TitleWithIconProps> = ({
  title,
  subtitle,
  icon,
  isDev = false,
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.titleWrapper}>
        {/* אייקון בריבוע */}
        <div className={styles.iconSquare}>
          <Icon name={icon} size={28} />
        </div>

        {/* תוכן הכותרת */}
        <div className={styles.content}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{title}</h1>
            {isDev && (
              <span className={styles.devBadge}>בפיתוח</span>
            )}
          </div>
          {subtitle && (
            <p className={styles.subtitle}>{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
};
