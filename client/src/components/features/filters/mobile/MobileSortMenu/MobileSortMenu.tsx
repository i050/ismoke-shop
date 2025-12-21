/**
 * MobileSortMenu
 * 
 * תפריט מיון נפתח למובייל - מופיע כ-bottom sheet או dropdown
 * עם אפשרויות מיון וסגירה בלחיצה על הרקע
 */
import React, { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui';
import type { IconName } from '@/components/ui/Icon/Icon';
import type { SortKey } from '../../types/filters';
import styles from './MobileSortMenu.module.css';

interface SortOption {
  key: SortKey;
  label: string;
  icon: IconName;
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'recent', label: 'חדש ביותר', icon: 'Clock' },
  { key: 'popular', label: 'פופולריים', icon: 'TrendingUp' },
  { key: 'priceAsc', label: 'מחיר: מהנמוך לגבוה', icon: 'ArrowUp' },
  { key: 'priceDesc', label: 'מחיר: מהגבוה לנמוך', icon: 'ArrowDown' }
];

interface MobileSortMenuProps {
  /** האם התפריט פתוח */
  isOpen: boolean;
  /** המיון הנוכחי */
  currentSort: SortKey;
  /** callback לבחירת מיון */
  onSelectSort: (sort: SortKey) => void;
  /** callback לסגירת התפריט */
  onClose: () => void;
}

export const MobileSortMenu: React.FC<MobileSortMenuProps> = ({
  isOpen,
  currentSort,
  onSelectSort,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // סגירה בלחיצה על Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // מניעת גלילה ברקע כשפתוח
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSortSelect = (sort: SortKey) => {
    onSelectSort(sort);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className={styles.overlay} 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Menu */}
      <div 
        ref={menuRef}
        className={styles.menu}
        role="dialog"
        aria-label="בחירת מיון"
      >
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>מיון לפי</h3>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            type="button"
            aria-label="סגור"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Options */}
        <div className={styles.options}>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              className={`${styles.option} ${currentSort === option.key ? styles.selected : ''}`}
              onClick={() => handleSortSelect(option.key)}
              type="button"
            >
              <Icon name={option.icon} size={18} className={styles.optionIcon} />
              <span className={styles.optionLabel}>{option.label}</span>
              {currentSort === option.key && (
                <Icon name="Check" size={18} className={styles.checkIcon} />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default MobileSortMenu;
