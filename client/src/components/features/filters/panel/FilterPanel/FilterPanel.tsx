import React, { useCallback, useState, useEffect, useMemo } from 'react';
import styles from './FilterPanel.module.css';
import type { FiltersState, SortKey } from '../../types/filters';
import { findNodeById } from '@/services/categoryService';
import { useAppSelector, useAppDispatch } from '@/hooks/reduxHooks';
import { selectCategoriesTree, fetchCategoriesTree, selectTreeResetKey } from '@/store/slices/categoriesSlice';
import { Icon } from '@/components/ui';
import { Button } from '@ui';
import { FilterAttributeService } from '@/services/filterAttributeService';
import type { FilterAttribute } from '@/services/filterAttributeService';
import { BrandService, type BrandForSelect } from '@/services/brandService';
import CategoriesTree from '../CategoriesTree/CategoriesTree';

interface FilterPanelProps {
  state: FiltersState;
  setSort: (s: SortKey) => void;
  setPriceMin: (v: number | null) => void;
  setPriceMax: (v: number | null) => void;
  toggleCategory: (categoryId: string) => void;
  toggleAttribute: (attributeKey: string, value: string) => void;
  clearAttribute: (attributeKey: string) => void;
  toggleBrand: (brand: string) => void;
  clearBrands: () => void;
  reset: () => void;
  onClearPriceFilter: () => void;
}

// פאנל סינון נשלט (Controlled) – מציג רק פקדי קלט + מאפיינים דינמיים + מותגים
const FilterPanel: React.FC<FilterPanelProps> = ({ 
  state, 
  setSort, 
  setPriceMin, 
  setPriceMax, 
  toggleCategory, 
  toggleAttribute,
  clearAttribute,
  toggleBrand,
  clearBrands,
  reset, 
  onClearPriceFilter 
}) => {
  const [priceMinInput, setPriceMinInput] = useState('');
  const [priceMaxInput, setPriceMaxInput] = useState('');
  const [dynamicAttributes, setDynamicAttributes] = useState<Array<{ attribute: FilterAttribute; usageCount: number }>>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [brands, setBrands] = useState<BrandForSelect[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  
  // ניהול מצב פתוח/סגור לכל סקשן (כברירת מחדל: כל הסקשנים סגורים)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: false,
    sort: false,
    price: false,
    brands: false,
    // מאפיינים דינמיים יתווספו כאן
  });
  
  const resetTreeKey = useAppSelector(selectTreeResetKey);
  
  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };
  const categoriesTree = useAppSelector(selectCategoriesTree);
  const dispatch = useAppDispatch();

  const parseNumberOrNull = useCallback((value: string): number | null => {
    if (value.trim() === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }, []);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value as SortKey);
  };

  // עדכון סינון מחיר בזמן אמת
  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceMinInput(e.target.value);
    setPriceMin(parseNumberOrNull(e.target.value));
  };
  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPriceMaxInput(e.target.value);
    setPriceMax(parseNumberOrNull(e.target.value));
  };

  // מילוי קלטים אם מגיעים ערכי פתיחה (למשל מסנכרון URL עתידי)
  useEffect(() => {
    if (state.price.min != null) setPriceMinInput(String(state.price.min));
    if (state.price.max != null) setPriceMaxInput(String(state.price.max));
  }, [state.price.min, state.price.max]);

  // טעינת עץ הקטגוריות לשם הצגת השמות ב-chips (קוראים ל-store אם ריק)
  useEffect(() => {
    if ((!categoriesTree || categoriesTree.length === 0)) {
      dispatch(fetchCategoriesTree());
    }
  }, [categoriesTree, dispatch]);

  // טעינת מותגים מהשרת
  useEffect(() => {
    const loadBrands = async () => {
      setBrandsLoading(true);
      try {
        const data = await BrandService.getBrandsForSelect();
        setBrands(data);
      } catch (error) {
        console.error('שגיאה בטעינת מותגים:', error);
        setBrands([]);
      } finally {
        setBrandsLoading(false);
      }
    };

    loadBrands();
  }, []);

  // טעינת מאפייני סינון דינמיים מהשרת
  useEffect(() => {
    const loadAttributes = async () => {
      setAttributesLoading(true);
      try {
        const data = await FilterAttributeService.getAttributesForFilter();
        setDynamicAttributes(data);
        
        // אתחול כל המאפיינים הדינמיים כסגורים (כברירת מחדל)
        const newSections: Record<string, boolean> = {};
        data.forEach(({ attribute }) => {
          newSections[attribute.key] = false;
        });
        setOpenSections(prev => ({ ...prev, ...newSections }));
      } catch (error) {
        console.error('שגיאה בטעינת מאפייני סינון:', error);
        setDynamicAttributes([]);
      } finally {
        setAttributesLoading(false);
      }
    };

    loadAttributes();
  }, []); // טעינה פעם אחת בלבד

  // אופטימיזציה - מחשב מראש אילו מאפיינים נבחרו
  const selectedAttributesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    Object.keys(state.attributes).forEach(key => {
      map[key] = new Set(state.attributes[key] || []);
    });
    return map;
  }, [state.attributes]);

  // פונקציה למציאת שם קטגוריה לפי ID
  const getCategoryName = (categoryId: string): string => {
    if (!categoriesTree || categoriesTree.length === 0) return 'קטגוריה';
    const node = findNodeById(categoriesTree, categoryId);
    return node ? node.name : 'קטגוריה';
  };

  // איפוס גם של השדות וגם של הסינון בלחיצה על איקס טווח מחיר
  const handleClearPriceFilter = () => {
    setPriceMinInput('');
    setPriceMaxInput('');
    onClearPriceFilter();
  };

  // איפוס כללי כולל השדות
  const handleResetAll = () => {
    setPriceMinInput('');
    setPriceMaxInput('');
    reset();
  };

  return (
    <aside className={styles.panel}>

      {/* סקשן קטגוריות */}
      <div className={styles.section}>
        <button 
          className={styles.sectionHeader}
          onClick={() => toggleSection('categories')}
          type="button"
        >
          <span className={styles.label}>קטגוריות</span>
          <Icon name={openSections.categories ? "ChevronUp" : "ChevronDown"} size={16} />
        </button>
        <div className={`${styles.sectionContent} ${openSections.categories ? styles.open : ''}`}>
          <CategoriesTree
            selectedCategoryIds={state.categoryIds}
            onToggle={toggleCategory}
            resetTreeKey={resetTreeKey}
          />
        </div>
      </div>

      <div className={styles.section}>
        <button 
          className={styles.sectionHeader}
          onClick={() => toggleSection('sort')}
          type="button"
        >
          <span className={styles.label}>מיון</span>
          <Icon name={openSections.sort ? "ChevronUp" : "ChevronDown"} size={16} />
        </button>
        <div className={`${styles.sectionContent} ${openSections.sort ? styles.open : ''}`}>
          <select
            id="sortSelect"
            className={styles.select}
            value={state.sort}
            onChange={handleSortChange}
          >
            <option value="recent">חדש</option>
            <option value="priceAsc">מחיר: נמוך→גבוה</option>
            <option value="priceDesc">מחיר: גבוה→נמוך</option>
            <option value="popular">פופולרי</option>
          </select>
        </div>
      </div>

      <div className={styles.section}>
        <button 
          className={styles.sectionHeader}
          onClick={() => toggleSection('price')}
          type="button"
        >
          <span className={styles.label}>מחיר (₪)</span>
          <Icon name={openSections.price ? "ChevronUp" : "ChevronDown"} size={16} />
        </button>
        <div className={`${styles.sectionContent} ${openSections.price ? styles.open : ''}`}>
          <div className={styles.inlineRow}>
            <input
              type="number"
              inputMode="numeric"
              placeholder="מינימום"
              className={styles.numberInput}
              value={priceMinInput}
              onChange={handlePriceMinChange}
              min={0}
            />
            <span className={styles.to}>–</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="מקסימום"
              className={styles.numberInput}
              value={priceMaxInput}
              onChange={handlePriceMaxChange}
              min={0}
            />
          </div>
        </div>
      </div>

      {/* מותגים */}
      {!brandsLoading && brands.length > 0 && (
        <div className={styles.section}>
          <div className={styles.attributeHeader}>
            <button 
              className={styles.sectionHeader}
              onClick={() => toggleSection('brands')}
              type="button"
            >
              <span className={styles.labelWithIcon}>
                <span className={styles.attributeIcon}></span>
                <span className={styles.label}>מותגים</span>
              </span>
              <div className={styles.headerActions}>
                {state.brands && state.brands.length > 0 && (
                  <button
                    className={styles.clearAttributeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearBrands();
                    }}
                    title="נקה מותגים"
                    type="button"
                  >
                    <Icon name="X" size={12} />
                  </button>
                )}
                <Icon name={openSections.brands ? "ChevronUp" : "ChevronDown"} size={16} />
              </div>
            </button>
          </div>

          <div className={`${styles.sectionContent} ${openSections.brands ? styles.open : ''}`}>
            <div className={styles.valuesList}>
              {brands.map((brand) => {
                const isSelected = state.brands && state.brands.includes(brand.name);
                
                return (
                  <label
                    key={brand._id}
                    className={`${styles.valueOption} ${isSelected ? styles.selected : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleBrand(brand.name)}
                      className={styles.hiddenCheckbox}
                    />
                    <span className={styles.checkmark}></span>
                    <span className={styles.valueName}>{brand.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* מאפיינים דינמיים (צבע, גודל, חומר וכו') */}
      {!attributesLoading && dynamicAttributes.length > 0 && dynamicAttributes.map(({ attribute }) => (
        <div key={attribute.key} className={styles.section}>
          <div className={styles.attributeHeader}>
            <button 
              className={styles.sectionHeader}
              onClick={() => toggleSection(attribute.key)}
              type="button"
            >
              <span className={styles.labelWithIcon}>
                {attribute.icon && <span className={styles.attributeIcon}>{attribute.icon}</span>}
                <span className={styles.label}>{attribute.name}</span>
              </span>
              <div className={styles.headerActions}>
                {selectedAttributesMap[attribute.key] && selectedAttributesMap[attribute.key].size > 0 && (
                  <button
                    className={styles.clearAttributeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAttribute(attribute.key);
                    }}
                    title={`נקה ${attribute.name}`}
                    type="button"
                  >
                    <Icon name="X" size={12} />
                  </button>
                )}
                <Icon name={openSections[attribute.key] ? "ChevronUp" : "ChevronDown"} size={16} />
              </div>
            </button>
          </div>

          <div className={`${styles.sectionContent} ${openSections[attribute.key] ? styles.open : ''}`}>
            {/* תצוגה לפי סוג המאפיין */}
            {attribute.valueType === 'color' && attribute.colorFamilies ? (
            // מאפיין צבע - הצגת משפחות צבעים עם נקודות צבע
            <div className={styles.colorFamiliesGrid}>
              {attribute.colorFamilies.map((family) => {
                const isSelected = selectedAttributesMap[attribute.key]?.has(family.family) || false;
                return (
                  <label
                    key={family.family}
                    className={`${styles.colorFamilyOption} ${isSelected ? styles.selected : ''}`}
                    title={family.displayName}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAttribute(attribute.key, family.family)}
                      className={styles.hiddenCheckbox}
                    />
                    <div 
                      className={styles.colorSwatches}
                      style={{
                        background: `linear-gradient(to left, ${family.variants.map(v => v.hex).join(', ')})`
                      }}
                      title={family.variants.map(v => v.name).join(', ')}
                    />
                    <span className={styles.colorFamilyLabel}>{family.displayName}</span>
                  </label>
                );
              })}
            </div>
          ) : attribute.values && attribute.values.length > 0 ? (
            // מאפיין טקסט - רשימת checkboxes
            <div className={styles.valuesList}>
              {attribute.values.map((valueObj) => {
                const value = typeof valueObj === 'string' ? valueObj : valueObj.value;
                const displayName = typeof valueObj === 'string' ? valueObj : valueObj.displayName;
                const isSelected = selectedAttributesMap[attribute.key]?.has(value) || false;
                
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
          </div>
        </div>
      ))}

      {/* סינונים פעילים + נקה הכל */}
      <div className={styles.section}>
        <div className={styles.activeChips}>
          {state.categoryIds.map(categoryId => (
            <span
              key={categoryId}
              className={`${styles.chip} ${styles.clickableChip}`}
              onClick={() => toggleCategory(categoryId)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{getCategoryName(categoryId)}</span>
                <Icon name="X" size={14} />
              </span>
            </span>
          ))}
          {state.price.min != null && state.price.max != null && (
            <span className={`${styles.chip} ${styles.clickableChip}`} onClick={handleClearPriceFilter} title="נקה סינון מחיר">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>מחיר: ₪{state.price.min}–₪{state.price.max}</span>
                <Icon name="X" size={14} />
              </span>
            </span>
          )}
          {state.price.min != null && state.price.max == null && (
            <span className={`${styles.chip} ${styles.clickableChip}`} onClick={handleClearPriceFilter} title="נקה סינון מחיר">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>מחיר מינ׳: ₪{state.price.min}</span>
                <Icon name="X" size={14} />
              </span>
            </span>
          )}
          {state.price.max != null && state.price.min == null && (
            <span className={`${styles.chip} ${styles.clickableChip}`} onClick={handleClearPriceFilter} title="נקה סינון מחיר">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>מחיר מק׳: ₪{state.price.max}</span>
                <Icon name="X" size={14} />
              </span>
            </span>
          )}
          
          {/* Chips של מאפיינים דינמיים (צבע, גודל וכו') */}
          {Object.entries(state.attributes).map(([attributeKey, values]) => 
            values.map(value => {
              // חיפוש display name של המאפיין
              const attribute = dynamicAttributes.find(a => a.attribute.key === attributeKey);
              if (!attribute) return null;
              
              let displayValue = value;
              // אם זה מאפיין צבע, חפש את display name מה-colorFamilies
              if (attribute.attribute.valueType === 'color' && attribute.attribute.colorFamilies) {
                const family = attribute.attribute.colorFamilies.find(f => f.family === value);
                if (family) displayValue = family.displayName;
              }
              // אם זה ערך רגיל, חפש את display name מה-values
              else if (attribute.attribute.values) {
                const valueObj = attribute.attribute.values.find(v => 
                  (typeof v === 'string' ? v : v.value) === value
                );
                if (valueObj && typeof valueObj !== 'string') {
                  displayValue = valueObj.displayName;
                }
              }
              
              return (
                <span
                  key={`${attributeKey}-${value}`}
                  className={`${styles.chip} ${styles.clickableChip}`}
                  onClick={() => toggleAttribute(attributeKey, value)}
                  title={`נקה ${attribute.attribute.name}`}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{displayValue}</span>
                    <Icon name="X" size={14} />
                  </span>
                </span>
              );
            })
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className={styles.resetBtn}
          onClick={handleResetAll}
          icon={<Icon name="X" size={14} />}
        >
          נקה הכל
        </Button>
      </div>

      <div className={styles.section}>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          className={styles.resetBtn}
          onClick={handleResetAll}
          icon={<Icon name="Filter" size={14} />}
        >
          איפוס
        </Button>
      </div>
    </aside>
  );
};

export default FilterPanel;
