/**
 * MobileFiltersToolbar
 * 
 * סרגל כלים רספונסיבי למובייל המציג כפתורי "סינון" ו"מיון"
 * מוצג רק במסכים קטנים (מתחת ל-992px)
 */
import React from 'react';
import { Icon } from '@/components/ui';
import type { SortKey } from '../../types/filters';
import styles from './MobileFiltersToolbar.module.css';

// תוויות למיון בעברית
const SORT_LABELS: Record<SortKey, string> = {
  priceAsc: 'מחיר: מהנמוך',
  priceDesc: 'מחיר: מהגבוה',
  recent: 'חדש ביותר',
  popular: 'פופולריים'
};

interface MobileFiltersToolbarProps {
  /** מספר הסינונים הפעילים (לתצוגה על badge) */
  activeFiltersCount: number;
  /** סוג המיון הנוכחי */
  currentSort: SortKey;
  /** callback לפתיחת דרור הסינון */
  onOpenFilters: () => void;
  /** callback לפתיחת תפריט המיון */
  onOpenSort: () => void;
}

export const MobileFiltersToolbar: React.FC<MobileFiltersToolbarProps> = ({
  activeFiltersCount,
  currentSort,
  onOpenFilters,
  onOpenSort
}) => {
  return (
    <div className={styles.toolbar}>
      {/* כפתור סינון */}
      <button 
        className={styles.toolbarButton} 
        onClick={onOpenFilters}
        type="button"
        aria-label="פתח סינון"
      >
        <Icon name="SlidersHorizontal" size={18} />
        <span className={styles.buttonLabel}>סינון</span>
        {activeFiltersCount > 0 && (
          <span className={styles.badge}>{activeFiltersCount}</span>
        )}
      </button>

      {/* מפריד */}
      <div className={styles.divider} />

      {/* כפתור מיון */}
      <button 
        className={styles.toolbarButton} 
        onClick={onOpenSort}
        type="button"
        aria-label="פתח מיון"
      >
        <Icon name="ArrowUpDown" size={18} />
        <span className={styles.buttonLabel}>{SORT_LABELS[currentSort]}</span>
        <Icon name="ChevronDown" size={14} className={styles.chevron} />
      </button>
    </div>
  );
};

export default MobileFiltersToolbar;
