// Product Categories Component
// מטרת הקומפוננטה: ניהול קטגוריה ותגיות של המוצר

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../../../../../../hooks/reduxHooks';
import { useToast } from '../../../../../../hooks/useToast';
import {
  fetchCategoriesTree,
  selectCategoriesTree,
  selectCategoriesLoading,
} from '../../../../../../store/slices/categoriesSlice';
import type { CategoryTreeNodeClient } from '../../../../../../services/categoryService';
import styles from './ProductCategories.module.css';

/**
 * Props של קומפוננטת ProductCategories
 */
interface ProductCategoriesProps {
  values: {
    categoryId: string | null;
    additionalCategoryIds: string[];
    tags: string[];
  };
  errors?: {
    categoryId?: string;
    additionalCategoryIds?: string;
    tags?: string;
  };
  onChange: (field: 'categoryId' | 'additionalCategoryIds' | 'tags', value: string | null | string[]) => void;
  maxTags?: number;
}

/**
 * קומפוננטת ProductCategories
 * מאפשרת בחירת קטגוריה היררכית והוספת תגיות
 */
const ProductCategories: React.FC<ProductCategoriesProps> = ({
  values,
  errors,
  onChange,
  maxTags = 20,
}) => {
  const dispatch = useAppDispatch();
  const categoriesTree = useAppSelector(selectCategoriesTree);
  const categoriesLoading = useAppSelector(selectCategoriesLoading);
  const { showToast } = useToast();

  // State מקומי
  const [tagInput, setTagInput] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showAdditionalCategoriesDropdown, setShowAdditionalCategoriesDropdown] = useState(false);
  const [additionalCategorySearch, setAdditionalCategorySearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // טעינת קטגוריות בהתחלה
  useEffect(() => {
    if (categoriesTree.length === 0 && !categoriesLoading) {
      dispatch(fetchCategoriesTree());
    }
  }, [dispatch, categoriesTree.length, categoriesLoading]);

  // סגירת dropdown בלחיצה מחוץ לו
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
        setShowAdditionalCategoriesDropdown(false);
      }
    };

    if (showCategoryDropdown || showAdditionalCategoriesDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCategoryDropdown, showAdditionalCategoriesDropdown]);

  /**
   * המרת עץ קטגוריות למבנה שטוח עם breadcrumb
   */
  const flattenCategories = useCallback(
    (nodes: CategoryTreeNodeClient[], parentPath: string[] = []): Array<{
      id: string;
      name: string;
      path: string[];
      level: number;
    }> => {
      const result: Array<{
        id: string;
        name: string;
        path: string[];
        level: number;
      }> = [];

      nodes.forEach((node) => {
        const currentPath = [...parentPath, node.name];
        result.push({
          id: node._id,
          name: node.name,
          path: currentPath,
          level: parentPath.length,
        });

        if (node.children && node.children.length > 0) {
          result.push(...flattenCategories(node.children, currentPath));
        }
      });

      return result;
    },
    []
  );

  // רשימה שטוחה של קטגוריות
  const flatCategories = flattenCategories(categoriesTree);

  // סינון קטגוריות לפי חיפוש
  const filteredCategories = flatCategories.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const additionalCategoryIds = values.additionalCategoryIds || [];
  const filteredAdditionalCategories = flatCategories.filter((cat) =>
    cat.id !== values.categoryId &&
    cat.name.toLowerCase().includes(additionalCategorySearch.toLowerCase())
  );

  // מציאת הקטגוריה הנבחרת
  const selectedCategory = flatCategories.find((cat) => cat.id === values.categoryId);
  const selectedAdditionalCategories = flatCategories.filter((cat) =>
    additionalCategoryIds.includes(cat.id)
  );

  // חילוץ טקסטי שגיאה
  const categoryError = errors?.categoryId 
    ? (typeof errors.categoryId === 'string' ? errors.categoryId : (errors.categoryId as any)?.message || 'שגיאה בקטגוריה')
    : null;
  const tagsError = errors?.tags 
    ? (typeof errors.tags === 'string' ? errors.tags : (errors.tags as any)?.message || 'שגיאה בתגיות')
    : null;

  /**
   * בחירת קטגוריה
   */
  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      onChange('categoryId', categoryId);
      if (additionalCategoryIds.includes(categoryId)) {
        onChange(
          'additionalCategoryIds',
          additionalCategoryIds.filter((id) => id !== categoryId)
        );
      }
      setShowCategoryDropdown(false);
      setCategorySearch('');
    },
    [additionalCategoryIds, onChange]
  );

  /**
   * ניקוי קטגוריה
   */
  const handleCategoryClear = useCallback(() => {
    onChange('categoryId', null);
  }, [onChange]);

  const handleAdditionalCategoryToggle = useCallback(
    (categoryId: string) => {
      const nextCategoryIds = additionalCategoryIds.includes(categoryId)
        ? additionalCategoryIds.filter((id) => id !== categoryId)
        : [...additionalCategoryIds, categoryId];

      onChange('additionalCategoryIds', nextCategoryIds);
    },
    [additionalCategoryIds, onChange]
  );

  /**
   * הוספת תגית
   */
  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim();

    // בדיקות validation
    if (!trimmedTag) {
      return;
    }

    if (trimmedTag.length < 2) {
      showToast('warning', 'תגית חייבת להכיל לפחות 2 תווים');
      return;
    }

    if (trimmedTag.length > 50) {
      showToast('warning', 'תגית לא יכולה להכיל יותר מ-50 תווים');
      return;
    }

    if (values.tags.includes(trimmedTag)) {
      showToast('warning', 'תגית זו כבר קיימת');
      return;
    }

    if (values.tags.length >= maxTags) {
      showToast('warning', `ניתן להוסיף עד ${maxTags} תגיות בלבד`);
      return;
    }

    onChange('tags', [...values.tags, trimmedTag]);
    setTagInput('');
  }, [tagInput, values.tags, maxTags, onChange, showToast]);

  /**
   * מחיקת תגית
   */
  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      onChange(
        'tags',
        values.tags.filter((tag) => tag !== tagToRemove)
      );
    },
    [values.tags, onChange]
  );

  /**
   * טיפול ב-Enter key בשדה תגיות
   */
  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  return (
    <div className={styles.container} ref={dropdownRef}>
      {/* כותרת */}
      <div className={styles.header}>
        <h3 className={styles.title}>קטגוריה ותגיות</h3>
        <p className={styles.subtitle}>
          בחר קטגוריה עבור המוצר והוסף תגיות לשיפור החיפוש
        </p>
      </div>

      {/* בחירת קטגוריה */}
      <div className={styles.section}>
        <label className={styles.label}>קטגוריה</label>
        <div className={styles.categorySelector}>
          <button
            type="button"
            className={`${styles.categoryButton} ${
              errors?.categoryId ? styles.categoryButtonError : ''
            }`}
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            {selectedCategory ? (
              <span className={styles.categorySelected}>
                {selectedCategory.path.join(' > ')}
              </span>
            ) : (
              <span className={styles.categoryPlaceholder}>בחר קטגוריה...</span>
            )}
            <svg
              className={`${styles.categoryArrow} ${
                showCategoryDropdown ? styles.categoryArrowOpen : ''
              }`}
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {selectedCategory && (
            <button
              type="button"
              className={styles.categoryClearButton}
              onClick={handleCategoryClear}
              title="נקה בחירה"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}

          {/* Dropdown */}
          {showCategoryDropdown && (
            <div className={styles.categoryDropdown}>
              {/* שדה חיפוש */}
              <div className={styles.categorySearchWrapper}>
                <input
                  type="text"
                  className={styles.categorySearch}
                  placeholder="חפש קטגוריה..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* רשימת קטגוריות */}
              <div className={styles.categoryList}>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`${styles.categoryItem} ${
                        values.categoryId === cat.id ? styles.categoryItemSelected : ''
                      }`}
                      onClick={() => handleCategorySelect(cat.id)}
                      style={{ paddingRight: `${cat.level * 1.5 + 1}rem` }}
                    >
                      <span className={styles.categoryItemText}>
                        {cat.name}
                      </span>
                      {cat.level > 0 && (
                        <span className={styles.categoryItemPath}>
                          {cat.path.slice(0, -1).join(' > ')}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className={styles.categoryEmpty}>
                    {categorySearch
                      ? 'לא נמצאו קטגוריות התואמות לחיפוש'
                      : 'אין קטגוריות זמינות'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {categoryError && (
          <div className={styles.error}>
            {categoryError}
          </div>
        )}
      </div>

      {/* קטגוריות נוספות */}
      <div className={styles.section}>
        <label className={styles.label}>שייך את המוצר לקטגוריות נוספות</label>
        <p className={styles.helperText}>
          המוצר יוצג גם בעמודי הקטגוריות שתבחר. הקטגוריה הראשית נשארת נפרדת.
        </p>

        <div className={styles.categorySelector}>
          <button
            type="button"
            className={styles.categoryButton}
            onClick={() => setShowAdditionalCategoriesDropdown(!showAdditionalCategoriesDropdown)}
            aria-expanded={showAdditionalCategoriesDropdown}
          >
            <span className={additionalCategoryIds.length > 0 ? styles.categorySelected : styles.categoryPlaceholder}>
              {additionalCategoryIds.length > 0
                ? `${additionalCategoryIds.length} קטגוריות נוספות נבחרו`
                : 'בחר קטגוריות נוספות...'}
            </span>
            <svg
              className={`${styles.categoryArrow} ${
                showAdditionalCategoriesDropdown ? styles.categoryArrowOpen : ''
              }`}
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showAdditionalCategoriesDropdown && (
            <div className={styles.categoryDropdown}>
              <div className={styles.categorySearchWrapper}>
                <input
                  type="text"
                  className={styles.categorySearch}
                  placeholder="חפש קטגוריה..."
                  value={additionalCategorySearch}
                  onChange={(e) => setAdditionalCategorySearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.categoryList}>
                {filteredAdditionalCategories.length > 0 ? (
                  filteredAdditionalCategories.map((cat) => {
                    const isSelected = additionalCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`${styles.categoryItem} ${
                          isSelected ? styles.categoryItemSelected : ''
                        }`}
                        onClick={() => handleAdditionalCategoryToggle(cat.id)}
                        style={{ paddingRight: `${cat.level * 1.5 + 1}rem` }}
                        aria-pressed={isSelected}
                      >
                        <span className={styles.categoryItemText}>{cat.name}</span>
                        {cat.level > 0 && (
                          <span className={styles.categoryItemPath}>
                            {cat.path.slice(0, -1).join(' > ')}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className={styles.categoryEmpty}>
                    {additionalCategorySearch
                      ? 'לא נמצאו קטגוריות התואמות לחיפוש'
                      : 'אין קטגוריות נוספות זמינות'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedAdditionalCategories.length > 0 && (
          <div className={styles.tagsList}>
            {selectedAdditionalCategories.map((category) => (
              <div key={category.id} className={styles.tagChip}>
                <span className={styles.tagChipText}>{category.path.join(' > ')}</span>
                <button
                  type="button"
                  className={styles.tagChipRemove}
                  onClick={() => handleAdditionalCategoryToggle(category.id)}
                  title={`הסר את הקטגוריה "${category.name}"`}
                  aria-label={`הסר את הקטגוריה ${category.name}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {errors?.additionalCategoryIds && (
          <div className={styles.error}>
            {typeof errors.additionalCategoryIds === 'string'
              ? errors.additionalCategoryIds
              : (errors.additionalCategoryIds as any)?.message}
          </div>
        )}
      </div>

      {/* תגיות */}
      {false && (
      <div className={styles.section}>
        <label className={styles.label}>
          תגיות ({values.tags.length}/{maxTags})
        </label>

        {/* רשימת תגיות קיימות */}
        {values.tags.length > 0 && (
          <div className={styles.tagsList}>
            {values.tags.map((tag) => (
              <div key={tag} className={styles.tagChip}>
                <span className={styles.tagChipText}>{tag}</span>
                <button
                  type="button"
                  className={styles.tagChipRemove}
                  onClick={() => handleRemoveTag(tag)}
                  title={`הסר תגית "${tag}"`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* הוספת תגית חדשה */}
        <div className={styles.tagInputWrapper}>
          <input
            type="text"
            className={`${styles.tagInput} ${errors?.tags ? styles.tagInputError : ''}`}
            placeholder="הוסף תגית..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            disabled={values.tags.length >= maxTags}
          />
          <button
            type="button"
            className={styles.tagAddButton}
            onClick={handleAddTag}
            disabled={!tagInput.trim() || values.tags.length >= maxTags}
          >
            הוסף
          </button>
        </div>

        {tagsError && (
          <div className={styles.error}>
            {tagsError}
          </div>
        )}

        <p className={styles.helperText}>
          הקש Enter או לחץ "הוסף" להוספת תגית. תגיות עוזרות ללקוחות למצוא את
          המוצר בחיפוש.
        </p>
      </div>
      )}

      {/* טיפים */}
      {/* <div className={styles.tips}>
        <div className={styles.tipsHeader}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
          <span>טיפים לקטגוריות ותגיות</span>
        </div>
        <ul className={styles.tipsList}>
          <li>
            <strong>קטגוריה:</strong> בחר את הקטגוריה המתאימה ביותר למוצר
          </li>
          <li>
            <strong>תגיות:</strong> הוסף מילות מפתח שלקוחות עשויים לחפש
          </li>
          <li>
            <strong>מספר תגיות:</strong> ניתן להוסיף עד {maxTags} תגיות למוצר
          </li>
          <li>
            <strong>אורך תגית:</strong> בין 2-50 תווים לכל תגית
          </li>
          <li>
            <strong>דוגמאות:</strong> "חדש", "מבצע", "מומלץ", "פופולרי"
          </li>
        </ul>
      </div> */}
    </div>
  );
};

export default ProductCategories;
