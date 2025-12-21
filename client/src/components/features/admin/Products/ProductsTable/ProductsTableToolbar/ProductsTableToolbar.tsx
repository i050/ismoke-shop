// ProductsTableToolbar - סרגל כלים לטבלת המוצרים
// מטרת הקומפוננטה: חיפוש, מיון ומונה תוצאות

import React, { useState, useEffect } from 'react';
import { Button, Icon, Input, NativeSelect } from '../../../../../ui';
import type { ProductSortOption, SortDirection } from '../../../../../../store/slices/productsManagementSlice';
import styles from './ProductsTableToolbar.module.css';

// אפשרויות מיון
const sortOptions = [
  { value: 'name', label: 'שם המוצר' },
  { value: 'price', label: 'מחיר' },
  { value: 'createdAt', label: 'תאריך יצירה' },
  { value: 'salesCount', label: 'מספר מכירות' },
  { value: 'stockQuantity', label: 'כמות במלאי' },
];

// ==========================================
// טיפוסים
// ==========================================

interface ProductsTableToolbarProps {
  /** מחרוזת חיפוש נוכחית */
  searchQuery: string;
  /** פונקציה לשינוי חיפוש */
  onSearchChange: (query: string) => void;
  /** שדה מיון נוכחי */
  sortBy: ProductSortOption;
  /** כיוון מיון נוכחי */
  sortDirection: SortDirection;
  /** פונקציה לשינוי מיון */
  onSortChange: (sortBy: ProductSortOption, sortDirection: SortDirection) => void;
  /** מספר תוצאות */
  resultsCount: number;
  /** האם בטעינה */
  loading?: boolean;
}

// ==========================================
// קומפוננטה ראשית
// ==========================================

const ProductsTableToolbar: React.FC<ProductsTableToolbarProps> = ({
  searchQuery,
  onSearchChange,
  sortBy,
  sortDirection,
  onSortChange,
  resultsCount,
  loading = false,
}) => {
  // State מקומי לחיפוש (לפני debounce)
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce - עדכון חיפוש רק אחרי 300ms של חוסר פעילות
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        console.log('🔍 מבצע חיפוש:', localSearch);
        onSearchChange(localSearch);
      }
    }, 300);

    // ניקוי הטיימר בעת שינוי
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearchChange]);

  // סנכרון localSearch עם searchQuery כשמתאפס מבחוץ
  useEffect(() => {
    if (searchQuery === '' && localSearch !== '') {
      setLocalSearch('');
    }
  }, [searchQuery, localSearch]);

  // טיפול בשינוי שדה מיון
  const handleSortByChange = (value: string) => {
    console.log('📊 שינוי שדה מיון:', value);
    onSortChange(value as ProductSortOption, sortDirection);
  };

  // טיפול בשינוי כיוון מיון
  const handleSortDirectionToggle = () => {
    const newDirection: SortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    console.log('🔄 שינוי כיוון מיון:', newDirection);
    onSortChange(sortBy, newDirection);
  };

  return (
    <div className={styles.toolbar}>
      {/* חיפוש */}
      <div className={styles.searchSection}>
        <div className={styles.searchInput}>
          <Icon name="Search" size={18} className={styles.searchIcon} />
          <Input
            type="text"
            placeholder="חפש מוצרים..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            disabled={loading}
            className={styles.input}
          />
          {localSearch && (
            <button
              className={styles.clearButton}
              onClick={() => setLocalSearch('')}
              aria-label="נקה חיפוש"
            >
              <Icon name="X" size={16} />
            </button>
          )}
        </div>
      </div>

      {/* מיון */}
      <div className={styles.sortSection}>
        <label className={styles.sortLabel}>
          <Icon name="Filter" size={16} />
          מיון לפי:
        </label>

        {/* בחירת שדה מיון */}
        <NativeSelect
          options={sortOptions}
          value={sortBy}
          onChange={handleSortByChange}
          disabled={loading}
          standalone
          className={styles.select}
        />

        {/* כפתור כיוון מיון */}
        <Button
          variant="outline"
          size="md"
          onClick={handleSortDirectionToggle}
          disabled={loading}
          className={styles.sortDirectionButton}
          aria-label={`מיון ${sortDirection === 'asc' ? 'עולה' : 'יורד'}`}
        >
          <Icon
            name={sortDirection === 'asc' ? 'ChevronUp' : 'ChevronDown'}
            size={18}
          />
        </Button>
      </div>

      {/* מונה תוצאות */}
      <div className={styles.resultsCounter}>
        {loading ? (
          <>
            <Icon name="Clock" size={16} className={styles.spinner} />
            טוען...
          </>
        ) : (
          <>
            <Icon name="Package" size={16} />
            {resultsCount} תוצאות
            {localSearch && ` עבור "${localSearch}"`}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsTableToolbar;
