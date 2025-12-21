/**
 * קומפוננטת Collapsible - קטע מתקפל/מתרחב
 * 
 * מטרה: אלמנט UI שמאפשר הסתרה והצגה של תוכן בצורה חלקה ואנימטיבית
 * שימוש: שדות אופציונליים, הגדרות מתקדמות, קבוצות מידע משניות
 */

import React, { useState } from 'react';
import type { ReactNode } from 'react';
import styles from './Collapsible.module.css';

interface CollapsibleProps {
  /** כותרת הקטע המתקפל */
  title: string | ReactNode;
  /** תוכן הקטע */
  children: ReactNode;
  /** האם הקטע פתוח כברירת מחדל */
  defaultOpen?: boolean;
  /** קלאס CSS נוסף */
  className?: string;
  /** אייקון בצד השמאלי של הכותרת */
  icon?: ReactNode;
}

/**
 * Collapsible - קומפוננטה מתקפלת
 */
export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  children,
  defaultOpen = false,
  className = '',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  /**
   * טיפול בלחיצה על הכותרת - מחליף מצב פתוח/סגור
   */
  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={`${styles.collapsible} ${className}`}>
      {/* כותרת הקטע - לחיצה עליה פותחת/סוגרת */}
      <div
        className={`${styles.collapsibleHeader} ${isOpen ? styles.active : ''}`}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          // נגישות - תמיכה ב-Enter ו-Space
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-expanded={isOpen}
      >
        <span className={styles.collapsibleTitle}>
          {icon && <span className={styles.collapsibleTitleIcon}>{icon}</span>}
          {title}
        </span>
        {/* אייקון חץ - מסתובב כשהקטע פתוח */}
        <div className={styles.collapsibleIcon}>▼</div>
      </div>

      {/* תוכן הקטע - מתרחב/מתכווץ באנימציה */}
      <div className={`${styles.collapsibleContent} ${isOpen ? styles.active : ''}`}>
        <div className={styles.collapsibleInner}>{children}</div>
      </div>
    </div>
  );
};

export default Collapsible;
