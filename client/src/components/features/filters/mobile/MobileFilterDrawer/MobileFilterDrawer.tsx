/**
 * MobileFilterDrawer
 * 
 * דרור סינון למובייל - נפתח מימין עם כל אפשרויות הסינון
 * כולל: קטגוריות, טווח מחיר, ומאפיינים דינמיים (צבע, גודל וכו')
 */
import React, { useEffect, useState } from 'react';
import { Icon, Button } from '@/components/ui';
import { FilterAccordion } from '../FilterAccordion/FilterAccordion';
import type { FiltersState } from '../../types/filters';
import { FilterAttributeService, type FilterAttribute, type ColorFamily, type AttributeValue } from '@/services/filterAttributeService';
import type { IconName } from '@/components/ui/Icon/Icon';
import styles from './MobileFilterDrawer.module.css';

interface MobileFilterDrawerProps {
  /** האם הדרור פתוח */
  isOpen: boolean;
  /** callback לסגירה */
  onClose: () => void;
  /** מצב הפילטרים הנוכחי */
  state: FiltersState;
  /** פונקציות לשינוי פילטרים */
  setPriceMin: (value: number | null) => void;
  setPriceMax: (value: number | null) => void;
  toggleCategory: (categoryId: string) => void;
  toggleAttribute: (attributeKey: string, value: string) => void;
  clearAttribute: (attributeKey: string) => void;
  reset: () => void;
  onClearPriceFilter: () => void;
  /** עץ הקטגוריות */
  categoriesTree: Array<{
    _id: string;
    name: string;
    children?: Array<{ _id: string; name: string; children?: any[] }>;
  }>;
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  state,
  setPriceMin,
  setPriceMax,
  toggleCategory,
  toggleAttribute,
  clearAttribute,
  reset,
  onClearPriceFilter,
  categoriesTree
}) => {
  // טעינת מאפיינים דינמיים מה-API
  const [dynamicAttributes, setDynamicAttributes] = useState<Array<{ attribute: FilterAttribute; usageCount: number }>>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  
  useEffect(() => {
    const loadAttributes = async () => {
      setAttributesLoading(true);
      try {
        const data = await FilterAttributeService.getAttributesForFilter();
        setDynamicAttributes(data);
      } catch (err) {
        console.error('Failed to load filter attributes:', err);
      } finally {
        setAttributesLoading(false);
      }
    };
    loadAttributes();
  }, []);
  
  // מצב מקומי לשדות מחיר
  const [priceMinInput, setPriceMinInput] = useState<string>(state.price.min?.toString() ?? '');
  const [priceMaxInput, setPriceMaxInput] = useState<string>(state.price.max?.toString() ?? '');

  // עדכון inputs כשהמצב החיצוני משתנה
  useEffect(() => {
    setPriceMinInput(state.price.min?.toString() ?? '');
    setPriceMaxInput(state.price.max?.toString() ?? '');
  }, [state.price.min, state.price.max]);

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

  // מניעת גלילה ברקע
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

  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPriceMinInput(val);
    setPriceMin(val === '' ? null : Number(val));
  };

  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPriceMaxInput(val);
    setPriceMax(val === '' ? null : Number(val));
  };

  const handleResetAll = () => {
    reset();
    onClose();
  };

  // חישוב מספר הפילטרים הפעילים
  const getActiveFiltersCount = () => {
    let count = 0;
    count += state.categoryIds.length;
    if (state.price.min != null || state.price.max != null) count += 1;
    Object.values(state.attributes).forEach(values => {
      count += values.length;
    });
    return count;
  };

  // המרת מפת attributes לסט עבור בדיקות
  const selectedAttributesMap = Object.fromEntries(
    Object.entries(state.attributes).map(([key, values]) => [key, new Set(values)])
  );

  // רינדור עץ קטגוריות
  const renderCategoryTree = (categories: typeof categoriesTree, level = 0) => {
    const levelClass = level === 0 ? '' : level === 1 ? styles.categoryLevel1 : styles.categoryLevel2;
    return categories.map((category) => {
      const isSelected = state.categoryIds.includes(category._id);
      return (
        <div key={category._id} className={levelClass}>
          <label className={`${styles.categoryOption} ${isSelected ? styles.selected : ''}`}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleCategory(category._id)}
              className={styles.checkbox}
            />
            <span className={styles.categoryLabel}>{category.name}</span>
          </label>
          {category.children && category.children.length > 0 && (
            <div className={styles.childCategories}>
              {renderCategoryTree(category.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
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
      
      {/* Drawer */}
      <div 
        className={styles.drawer}
        role="dialog"
        aria-label="סינון מוצרים"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Icon name="SlidersHorizontal" size={20} />
            <h3 className={styles.title}>סינון</h3>
            {getActiveFiltersCount() > 0 && (
              <span className={styles.badge}>{getActiveFiltersCount()}</span>
            )}
          </div>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            type="button"
            aria-label="סגור"
          >
            <Icon name="X" size={22} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className={styles.content}>
          {/* קטגוריות */}
          <FilterAccordion
            title="קטגוריות"
            icon="FolderTree"
            defaultOpen={false}
            activeCount={state.categoryIds.length}
            onClear={() => toggleCategory('')}
          >
            <div className={styles.categoriesTree}>
              {renderCategoryTree(categoriesTree)}
            </div>
          </FilterAccordion>

          {/* טווח מחיר */}
          <FilterAccordion
            title="טווח מחיר"
            icon="Wallet"
            defaultOpen={state.price.min != null || state.price.max != null}
            activeCount={state.price.min != null || state.price.max != null ? 1 : 0}
            onClear={onClearPriceFilter}
          >
            <div className={styles.priceRange}>
              <input
                type="number"
                inputMode="numeric"
                placeholder="מינימום"
                className={styles.priceInput}
                value={priceMinInput}
                onChange={handlePriceMinChange}
                min={0}
              />
              <span className={styles.priceSeparator}>–</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="מקסימום"
                className={styles.priceInput}
                value={priceMaxInput}
                onChange={handlePriceMaxChange}
                min={0}
              />
            </div>
          </FilterAccordion>

          {/* מאפיינים דינמיים */}
          {!attributesLoading && dynamicAttributes.map(({ attribute }: { attribute: FilterAttribute }) => {
            const selectedValues = selectedAttributesMap[attribute.key];
            const activeCount = selectedValues?.size || 0;

            return (
              <FilterAccordion
                key={attribute.key}
                title={attribute.name}
                icon={(attribute.icon as IconName) || 'Tag'}
                defaultOpen={activeCount > 0}
                activeCount={activeCount}
                onClear={() => clearAttribute(attribute.key)}
              >
                {/* מאפיין צבע */}
                {attribute.valueType === 'color' && attribute.colorFamilies ? (
                  <div className={styles.colorGrid}>
                    {attribute.colorFamilies.map((family: ColorFamily) => {
                      const isSelected = selectedValues?.has(family.family) || false;
                      return (
                        <label
                          key={family.family}
                          className={`${styles.colorOption} ${isSelected ? styles.selected : ''}`}
                          title={family.displayName}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAttribute(attribute.key, family.family)}
                            className={styles.hiddenCheckbox}
                          />
                          <div 
                            className={styles.colorSwatch}
                            style={{
                              background: `linear-gradient(to left, ${family.variants.map((v: { hex: string }) => v.hex).join(', ')})`
                            }}
                          />
                          <span className={styles.colorLabel}>{family.displayName}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : attribute.values && attribute.values.length > 0 ? (
                  /* מאפיין טקסט */
                  <div className={styles.valuesList}>
                    {attribute.values.map((valueObj: AttributeValue | string) => {
                      const value = typeof valueObj === 'string' ? valueObj : valueObj.value;
                      const displayName = typeof valueObj === 'string' ? valueObj : valueObj.displayName;
                      const isSelected = selectedValues?.has(value) || false;
                      
                      return (
                        <label
                          key={value}
                          className={`${styles.valueOption} ${isSelected ? styles.selected : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAttribute(attribute.key, value)}
                            className={styles.checkbox}
                          />
                          <span className={styles.valueLabel}>{displayName}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </FilterAccordion>
            );
          })}
        </div>

        {/* Footer with Actions */}
        <div className={styles.footer}>
          <Button
            variant="outline"
            size="md"
            onClick={handleResetAll}
            icon={<Icon name="RotateCcw" size={16} />}
            className={styles.resetButton}
          >
            נקה הכל
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onClose}
            icon={<Icon name="Check" size={16} />}
            className={styles.applyButton}
          >
            הצג תוצאות
          </Button>
        </div>
      </div>
    </>
  );
};

export default MobileFilterDrawer;
