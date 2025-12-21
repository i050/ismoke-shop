import React from 'react';
import { Icon } from '../Icon/Icon';
import styles from './Toolbar.module.css';

export type ViewMode = 'grid' | 'list';
export type SortOption = 'recent' | 'priceAsc' | 'priceDesc' | 'popular';

export interface ToolbarProps {
  /** Current search query */
  searchQuery?: string;
  /** Callback when search changes */
  onSearchChange?: (query: string) => void;
  /** Current sort option */
  sortBy?: SortOption;
  /** Callback when sort changes */
  onSortChange?: (sort: SortOption) => void;
  /** Current view mode */
  viewMode?: ViewMode;
  /** Callback when view mode changes */
  onViewModeChange?: (mode: ViewMode) => void;
  /** Total results count */
  resultsCount?: number;
  /** Optional CSS class */
  className?: string;
}

/**
 * Toolbar component for product listing pages
 * Provides search, sort, view mode controls and results count
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  searchQuery = '',
  onSearchChange,
  sortBy = 'recent',
  onSortChange,
  viewMode = 'grid',
  onViewModeChange,
  resultsCount,
  className
}) => {
  return (
    <div className={`${styles.toolbar} ${className || ''}`}>
      {/* Search */}
      <div className={styles.search}>
        <Icon name="Search" size={18} className={styles.searchIcon} />
        <input
          type="search"
          placeholder="חיפוש מוצרים..."
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Sort */}
      <div className={styles.sort}>
        <label htmlFor="toolbarSort" className={styles.sortLabel}>
          מיון:
        </label>
        <select
          id="toolbarSort"
          value={sortBy}
          onChange={(e) => onSortChange?.(e.target.value as SortOption)}
          className={styles.sortSelect}
        >
          <option value="recent">חדש ביותר</option>
          <option value="priceAsc">מחיר: נמוך→גבוה</option>
          <option value="priceDesc">מחיר: גבוה→נמוך</option>
          <option value="popular">פופולרי ביותר</option>
        </select>
      </div>

      {/* View Mode Toggle */}
      <div className={styles.viewToggle}>
        <button
          type="button"
          onClick={() => onViewModeChange?.('grid')}
          className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
          aria-label="תצוגת רשת"
          title="תצוגת רשת"
        >
          <Icon name="Grid3x3" size={20} />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange?.('list')}
          className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
          aria-label="תצוגת רשימה"
          title="תצוגת רשימה"
        >
          <Icon name="List" size={20} />
        </button>
      </div>

      {/* Results Count */}
      {resultsCount !== undefined && (
        <div className={styles.resultsCount}>
          <span className={styles.count}>{resultsCount}</span>
          <span className={styles.label}>מוצרים</span>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
