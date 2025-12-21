// ProductsTableFilters - פילטרים לטבלת המוצרים
// מטרת הקומפוננטה: סינון מוצרים לפי קטגוריה ומלאי
// הערה: פילטר סטטוס הוסר כי יש עכשיו טאבים (פעילים/פח אשפה)

import React, { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../../../hooks/reduxHooks';
import { fetchCategoriesTree } from '../../../../../../store/slices/categoriesSlice';
import type { CategoryTreeNodeClient } from '../../../../../../services/categoryService';
import type { ProductFilters } from '../../../../../../store/slices/productsManagementSlice';
import { Button, Icon, NativeSelect } from '../../../../../ui';
import styles from './ProductsTableFilters.module.css';

// ==========================================
// טיפוסים
// ==========================================

interface ProductsTableFiltersProps {
  /** פילטרים נוכחיים */
  filters: ProductFilters;
  /** פונקציה לשינוי פילטרים */
  onFilterChange: (filters: Partial<ProductFilters>) => void;
  /** פונקציה לאיפוס פילטרים */
  onReset: () => void;
}

// ==========================================
// פונקציות עזר
// ==========================================

/**
 * שיטוח עץ קטגוריות לרשימה שטוחה עם אינדנטציה
 * מאפשר הצגה היררכית בתוך select נייטיבי
 */
const flattenCategoryTree = (
  nodes: CategoryTreeNodeClient[],
  depth = 0
): Array<{ value: string; label: string; depth: number }> => {
  const result: Array<{ value: string; label: string; depth: number }> = [];
  
  for (const node of nodes) {
    // הוספת הקטגוריה עם אינדנטציה ויזואלית
    const indent = depth > 0 ? '—'.repeat(depth) + ' ' : '';
    result.push({
      value: node._id,
      label: `${indent}${node.name}`,
      depth,
    });
    
    // רקורסיה לילדים
    if (node.children && node.children.length > 0) {
      result.push(...flattenCategoryTree(node.children, depth + 1));
    }
  }
  
  return result;
};

/**
 * מציאת קטגוריה בעץ לפי ID (רקורסיבי)
 */
const findCategoryInTree = (
  nodes: CategoryTreeNodeClient[],
  id: string
): CategoryTreeNodeClient | null => {
  for (const node of nodes) {
    if (node._id === id) return node;
    if (node.children && node.children.length > 0) {
      const found = findCategoryInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * ספירת כל הצאצאים של קטגוריה (רקורסיבי)
 */
const countDescendants = (node: CategoryTreeNodeClient): number => {
  if (!node.children || node.children.length === 0) return 0;
  
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
};

/**
 * איסוף שמות כל הצאצאים של קטגוריה (רקורסיבי)
 */
const collectDescendantNames = (node: CategoryTreeNodeClient): string[] => {
  if (!node.children || node.children.length === 0) return [];
  
  const names: string[] = [];
  for (const child of node.children) {
    names.push(child.name);
    names.push(...collectDescendantNames(child));
  }
  return names;
};

// ==========================================
// קומפוננטה ראשית
// ==========================================

const ProductsTableFilters: React.FC<ProductsTableFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const dispatch = useAppDispatch();

  // קבלת קטגוריות מ-Redux
  const { tree: categories, loading: categoriesLoading } = useAppSelector(
    (state) => state.categories
  );

  // טעינת קטגוריות בעת טעינת הקומפוננטה
  useEffect(() => {
    if (categories.length === 0) {
      dispatch(fetchCategoriesTree());
    } else {
      console.log('📁 [ProductsTableFilters] Categories loaded:', categories.length);
      console.log('📁 [ProductsTableFilters] First category:', categories[0]);
    }
  }, [dispatch, categories.length, categories]);

  // שיטוח עץ הקטגוריות לרשימה היררכית עם אינדנטציה
  const categoryOptions = useMemo(() => {
    const flatCategories = flattenCategoryTree(categories);
    return [
      { value: 'all', label: 'כל הקטגוריות' },
      ...flatCategories.map((cat) => ({
        value: cat.value,
        label: cat.label,
      })),
    ];
  }, [categories]);

  // Phase 7: פילטר סטטוס הוסר - הטאבים מפרידים בין פעילים לנמחקים
  // const statusOptions = [
  //   { value: 'all', label: 'כל הסטטוסים' },
  //   { value: 'active', label: 'פעיל' },
  //   { value: 'inactive', label: 'לא פעיל' },
  // ];

  // Phase 7.1: אפשרויות פילטר מלאי - הוספת 'lowOrOut' לניווט מהדשבורד
  const stockOptions = [
    { value: 'all', label: 'כל המוצרים' },
    { value: 'low', label: 'מלאי נמוך' },
    { value: 'out', label: 'אזל מלאי' },
    { value: 'lowOrOut', label: 'מלאי נמוך + אזל' },
  ];

  // בדיקה האם יש פילטרים פעילים
  // Phase 7: הוסר isActive מהבדיקה כי הטאבים מטפלים בזה
  const hasActiveFilters =
    filters.categoryId !== undefined ||
    // filters.isActive !== undefined || // הוסר - הטאבים מטפלים בזה
    (filters.stockStatus !== undefined && filters.stockStatus !== 'all');

  // ספירת פילטרים פעילים
  // Phase 7: הוסר isActive מהספירה
  const activeFiltersCount = [
    filters.categoryId,
    // filters.isActive !== undefined ? filters.isActive : null, // הוסר - הטאבים מטפלים בזה
    filters.stockStatus !== 'all' ? filters.stockStatus : null,
  ].filter((f) => f !== undefined && f !== null).length;

  return (
    <div className={styles.filters}>
      {/* אזור פילטרים */}
      <div className={styles.filtersRow}>
        {/* פילטר קטגוריה */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>
            <Icon name="FolderTree" size={16} />
            קטגוריה
          </label>
          <NativeSelect
            options={categoryOptions}
            value={filters.categoryId || 'all'}
            onChange={(value) => {
              console.log('🎯 [Select] Value changed:', value);
              onFilterChange({
                categoryId: value === 'all' ? undefined : value,
              });
            }}
            disabled={categoriesLoading}
            standalone
            className={styles.select}
          />
        </div>

        {/* Phase 7: פילטר סטטוס הוסר - הטאבים מפרידים בין פעילים לנמחקים */}
        {/* <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>
            <Icon name="CheckCircle2" size={16} />
            סטטוס
          </label>
          <NativeSelect
            options={statusOptions}
            value={
              filters.isActive === undefined
                ? 'all'
                : filters.isActive
                ? 'active'
                : 'inactive'
            }
            onChange={(value) => {
              const isActive =
                value === 'all'
                  ? undefined
                  : value === 'active'
                  ? true
                  : false;
              onFilterChange({ isActive });
            }}
            standalone
            className={styles.select}
          />
        </div> */}

        {/* פילטר מלאי */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>
            <Icon name="Package" size={16} />
            מצב מלאי
          </label>
          <NativeSelect
            options={stockOptions}
            value={filters.stockStatus || 'all'}
            onChange={(value) => {
              onFilterChange({ 
                stockStatus: value as 'all' | 'low' | 'out' | 'lowOrOut'
              });
            }}
            standalone
            className={styles.select}
          />
        </div>

        {/* כפתור איפוס */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="md"
            onClick={onReset}
            className={styles.resetButton}
          >
            <Icon name="X" size={16} />
            נקה פילטרים ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* תצוגת פילטרים פעילים כ-chips */}
      {hasActiveFilters && (
        <div className={styles.activeFilters}>
          <span className={styles.activeFiltersLabel}>פילטרים פעילים:</span>
          <div className={styles.chips}>
            {/* Chip קטגוריה */}
            {filters.categoryId && (() => {
              const selectedCategory = findCategoryInTree(categories, filters.categoryId);
              const descendantNames = selectedCategory ? collectDescendantNames(selectedCategory) : [];
              const categoryName = selectedCategory?.name || 'לא ידוע';
              
              return (
                <div className={styles.chip}>
                  <span className={styles.chipLabel}>
                    קטגוריה: {categoryName}
                    {descendantNames.length > 0 && (
                      <span className={styles.chipExtra}>
                        {' '}(כולל: {descendantNames.join(', ')})
                      </span>
                    )}
                  </span>
                  <button
                    className={styles.chipRemove}
                    onClick={() => onFilterChange({ categoryId: undefined })}
                    aria-label="הסר פילטר קטגוריה"
                  >
                    <Icon name="X" size={12} />
                  </button>
                </div>
              );
            })()}

            {/* Phase 7: Chip סטטוס הוסר - הטאבים מפרידים בין פעילים לנמחקים */}
            {/* {filters.isActive !== undefined && (
              <div className={styles.chip}>
                <span className={styles.chipLabel}>
                  סטטוס: {filters.isActive ? 'פעיל' : 'לא פעיל'}
                </span>
                <button
                  className={styles.chipRemove}
                  onClick={() => onFilterChange({ isActive: undefined })}
                  aria-label="הסר פילטר סטטוס"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            )} */}

            {/* Chip מלאי */}
            {filters.stockStatus && filters.stockStatus !== 'all' && (
              <div className={styles.chip}>
                <span className={styles.chipLabel}>
                  מלאי: {filters.stockStatus === 'low' 
                    ? 'מלאי נמוך' 
                    : filters.stockStatus === 'out' 
                    ? 'אזל מלאי'
                    : 'מלאי נמוך + אזל'}
                </span>
                <button
                  className={styles.chipRemove}
                  onClick={() => onFilterChange({ stockStatus: 'all' })}
                  aria-label="הסר פילטר מלאי"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsTableFilters;
