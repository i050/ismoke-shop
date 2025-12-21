/**
 * FilterAccordion
 * 
 * קומפוננטת אקורדיון לשימוש חוזר בתוך ה-Filter Drawer
 * עם אנימציה חלקה של פתיחה/סגירה
 */
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui';
import type { IconName } from '@/components/ui/Icon/Icon';
import styles from './FilterAccordion.module.css';

interface FilterAccordionProps {
  /** כותרת הסקשן */
  title: string;
  /** אייקון (אופציונלי) */
  icon?: IconName;
  /** האם פתוח בהתחלה */
  defaultOpen?: boolean;
  /** מספר פילטרים פעילים בסקשן */
  activeCount?: number;
  /** callback לניקוי הסקשן */
  onClear?: () => void;
  /** תוכן הסקשן */
  children: React.ReactNode;
}

export const FilterAccordion: React.FC<FilterAccordionProps> = ({
  title,
  icon,
  defaultOpen = false,
  activeCount = 0,
  onClear,
  children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  // חישוב גובה התוכן לאנימציה חלקה
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      });
      resizeObserver.observe(contentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear?.();
  };

  return (
    <div className={styles.accordion}>
      <button
        className={styles.header}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-expanded={isOpen}
      >
        <div className={styles.titleWrapper}>
          {icon && <Icon name={icon} size={18} className={styles.icon} />}
          <span className={styles.title}>{title}</span>
          {activeCount > 0 && (
            <span className={styles.count}>{activeCount}</span>
          )}
        </div>
        
        <div className={styles.actions}>
          {activeCount > 0 && onClear && (
            <button
              className={styles.clearButton}
              onClick={handleClear}
              type="button"
              aria-label={`נקה ${title}`}
            >
              <Icon name="X" size={14} />
            </button>
          )}
          <Icon 
            name={isOpen ? "ChevronUp" : "ChevronDown"} 
            size={18} 
            className={styles.chevron}
          />
        </div>
      </button>

      <div 
        className={`${styles.content} ${isOpen ? styles.open : ''}`}
        style={{ maxHeight: isOpen ? contentHeight : 0 }}
      >
        <div ref={contentRef} className={styles.contentInner}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default FilterAccordion;
