/**
 * VariantAttributesInline Component
 * קומפוננטה Inline לבחירת מאפייני וריאנט בתוך העמוד
 * 
 * Flow (לפי הדרישה):
 * 1. רשימה גדולה של כל מאפייני הסינון (FilterAttributes) עם חיפוש
 * 2. המנהל בוחר בדיוק 2 מאפיינים (checkbox)
 * 3. לכל מאפיין שנבחר - פותחים בחירת ערכים
 * 4. תיבת סיכום עם מספר מאפיינים, ערכים, שילובים אפשריים
 * 5. כפתור "המשך לבחירת שילובים"
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FilterAttributeService, type FilterAttribute } from '../../../../../../../services/filterAttributeService';
import FilterAttributeValueSelector, { type SelectedValue } from '../FilterAttributeValueSelector';
import { Icon } from '../../../../../../ui/Icon';
import styles from './VariantAttributesInline.module.css';

/**
 * מאפיין נבחר עם הערכים שלו
 */
export interface SelectedAttribute {
  /** המאפיין עצמו */
  attribute: FilterAttribute;
  /** הערכים שנבחרו */
  selectedValues: SelectedValue[];
}

/**
 * Props של הקומפוננטה
 */
export interface VariantAttributesInlineProps {
  /** מאפיינים נבחרים (עד 2) */
  selectedAttributes: SelectedAttribute[];
  /** callback לשינוי מאפיינים נבחרים */
  onChange: (attributes: SelectedAttribute[]) => void;
  /** האם הקומפוננטה מושבתת */
  disabled?: boolean;
  /** callback כשמוכנים להמשיך לשלב הבא (שילובים) */
  onContinue?: () => void;
  /** האם להציג כפתור המשך - ברירת מחדל true */
  showContinueButton?: boolean;
  /** 🆕 callback כאשר המשתמש מבקש להסיר ערך נעול (קיים במוצר) */
  onDisabledValueRemoveRequest?: (value: SelectedValue, attributeKey: string) => void;
}

/**
 * קומפוננטת VariantAttributesInline
 * בחירת מאפייני וריאנט Inline בעמוד
 */
const VariantAttributesInline: React.FC<VariantAttributesInlineProps> = ({
  selectedAttributes,
  onChange,
  disabled = false,
  onContinue,
  showContinueButton = true,
  onDisabledValueRemoveRequest, // 🆕 callback להסרת ערך נעול
}) => {
  // ===== State לטעינת מאפיינים =====
  const [allAttributes, setAllAttributes] = useState<FilterAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===== State לחיפוש =====
  const [searchQuery, setSearchQuery] = useState('');

  // ===== State למאפיינים מורחבים (פתוחים לבחירת ערכים) =====
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());

  // ===== פתיחה אוטומטית של מאפיינים שכבר נבחרו (למשל בעת הוספת וריאנטים למוצר קיים) =====
  useEffect(() => {
    if (selectedAttributes.length > 0) {
      const keysToExpand = selectedAttributes.map(sa => sa.attribute.key);
      setExpandedAttributes(new Set(keysToExpand));
    }
  }, [selectedAttributes.length]); // רק כשמספר המאפיינים משתנה

  // ===== טעינת כל המאפיינים מהשרת =====
  useEffect(() => {
    const loadAttributes = async () => {
      try {
        setLoading(true);
        setError(null);
        const attrs = await FilterAttributeService.getAllAttributes();
        setAllAttributes(attrs);
        console.log('✅ נטענו', attrs.length, 'מאפיינים');
      } catch (err) {
        console.error('❌ שגיאה בטעינת מאפיינים:', err);
        setError('שגיאה בטעינת מאפיינים');
      } finally {
        setLoading(false);
      }
    };

    loadAttributes();
  }, []);

  // ===== סינון מאפיינים לפי חיפוש ומאפיינים קיימים במוצר =====
  const filteredAttributes = useMemo(() => {
    // 🆕 בדיקה: האם יש מאפיינים עם ערכים נעולים (קיימים במוצר)?
    const lockedAttributeKeys = selectedAttributes
      .filter(sa => sa.selectedValues.some(sv => sv.disabled))
      .map(sa => sa.attribute.key);
    
    const hasLockedAttributes = lockedAttributeKeys.length > 0;
    
    // אם יש מאפיינים נעולים - הצג רק אותם! (לא את כל המאפיינים)
    let attributesToShow = hasLockedAttributes
      ? allAttributes.filter(attr => lockedAttributeKeys.includes(attr.key))
      : allAttributes;
    
    // סינון נוסף לפי חיפוש
    if (!searchQuery.trim()) return attributesToShow;
    
    const query = searchQuery.toLowerCase();
    return attributesToShow.filter(attr =>
      attr.name.toLowerCase().includes(query) ||
      attr.key.toLowerCase().includes(query)
    );
  }, [allAttributes, searchQuery, selectedAttributes]);

  // ===== בדיקה האם מאפיין נבחר =====
  const isAttributeSelected = useCallback((attrKey: string): boolean => {
    return selectedAttributes.some(sa => sa.attribute.key === attrKey);
  }, [selectedAttributes]);

  // ===== מציאת מאפיין נבחר =====
  const getSelectedAttribute = useCallback((attrKey: string): SelectedAttribute | undefined => {
    return selectedAttributes.find(sa => sa.attribute.key === attrKey);
  }, [selectedAttributes]);

  // ===== טיפול בבחירת/ביטול מאפיין =====
  const handleAttributeToggle = useCallback((attribute: FilterAttribute) => {
    if (disabled) return;

    const isSelected = isAttributeSelected(attribute.key);

    if (isSelected) {
      // בדיקה: האם למאפיין הזה יש ערכים מושבתים (קיימים במוצר)?
      const selectedAttr = getSelectedAttribute(attribute.key);
      const hasDisabledValues = selectedAttr?.selectedValues.some(sv => sv.disabled);
      
      if (hasDisabledValues) {
        // אם יש ערכים מושבתים - אי אפשר להסיר את המאפיין
        console.log('⚠️ לא ניתן להסיר מאפיין עם ערכים קיימים במוצר');
        return;
      }
      
      // הסר את המאפיין
      const updated = selectedAttributes.filter(sa => sa.attribute.key !== attribute.key);
      onChange(updated);
      // סגור את ה-expand
      setExpandedAttributes(prev => {
        const newSet = new Set(prev);
        newSet.delete(attribute.key);
        return newSet;
      });
    } else {
      // 🆕 בדיקה: האם יש מאפיינים עם ערכים נעולים (קיימים במוצר)?
      // אם כן - אי אפשר להוסיף מאפיינים אחרים!
      const hasLockedAttributes = selectedAttributes.some(sa => 
        sa.selectedValues.some(sv => sv.disabled)
      );
      
      if (hasLockedAttributes) {
        // יש מאפיינים נעולים - אי אפשר להוסיף מאפיינים חדשים
        console.log('⚠️ לא ניתן להוסיף מאפיינים חדשים כאשר יש מאפיינים קיימים במוצר');
        return;
      }
      
      // בדיקה: מותר רק עד 2 מאפיינים
      if (selectedAttributes.length >= 2) {
        // כבר יש 2 מאפיינים - אי אפשר להוסיף
        return;
      }
      // הוסף את המאפיין
      const newSelected: SelectedAttribute = {
        attribute,
        selectedValues: [],
      };
      onChange([...selectedAttributes, newSelected]);
      // פתח את ה-expand
      setExpandedAttributes(prev => new Set([...prev, attribute.key]));
    }
  }, [disabled, isAttributeSelected, getSelectedAttribute, selectedAttributes, onChange]);

  // ===== טיפול בשינוי ערכים נבחרים של מאפיין =====
  const handleValuesChange = useCallback((attrKey: string, values: SelectedValue[]) => {
    const updated = selectedAttributes.map(sa => {
      if (sa.attribute.key === attrKey) {
        return { ...sa, selectedValues: values };
      }
      return sa;
    });
    onChange(updated);
  }, [selectedAttributes, onChange]);

  // ===== פתיחה/סגירה של מאפיין =====
  const toggleExpand = useCallback((attrKey: string) => {
    setExpandedAttributes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(attrKey)) {
        newSet.delete(attrKey);
      } else {
        newSet.add(attrKey);
      }
      return newSet;
    });
  }, []);

  // ===== חישוב סטטיסטיקות =====
  const stats = useMemo(() => {
    const numAttributes = selectedAttributes.length;
    const numValues = selectedAttributes.reduce((acc, sa) => acc + sa.selectedValues.length, 0);
    
    // חישוב שילובים אפשריים: מכפלת מספר הערכים (או סכום אם מאפיין אחד)
    let numCombinations = 0;
    if (selectedAttributes.length === 2) {
      const vals1 = selectedAttributes[0]?.selectedValues.length || 0;
      const vals2 = selectedAttributes[1]?.selectedValues.length || 0;
      numCombinations = vals1 * vals2;
    } else if (selectedAttributes.length === 1) {
      numCombinations = selectedAttributes[0]?.selectedValues.length || 0;
    }

    // האם אפשר להמשיך? צריך לפחות מאפיין אחד עם ערכים
    const canContinue = 
      selectedAttributes.length >= 1 &&
      selectedAttributes.every(sa => sa.selectedValues.length > 0);

    return { numAttributes, numValues, numCombinations, canContinue };
  }, [selectedAttributes]);

  // ===== רינדור מצב טעינה =====
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Icon name="Loader2" className={styles.spinner} />
          <span>טוען מאפיינים...</span>
        </div>
      </div>
    );
  }

  // ===== רינדור שגיאה =====
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <Icon name="AlertCircle" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      {/* כותרת והסבר */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Icon name="Layers" size={24} />
        </div>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>מאפייני המוצר</h3>
          <p className={styles.description}>
            בחר מאפיין אחד או שניים (לדוגמה: צבע, מידה, או שניהם) ואז בחר את הערכים הזמינים לכל מאפיין
          </p>
        </div>
      </div>

      {/* תיבת סיכום */}
      {selectedAttributes.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <Icon name="Layers" size={16} />
            <span>{stats.numAttributes}/2 מאפיינים</span>
          </div>
          <div className={styles.summaryItem}>
            <Icon name="List" size={16} />
            <span>{stats.numValues} ערכים נבחרו</span>
          </div>
          <div className={styles.summaryItem}>
            <Icon name="Grid3x3" size={16} />
            <span>{stats.numCombinations} שילובים אפשריים</span>
          </div>

          {/* תגיות המאפיינים הנבחרים */}
          <div className={styles.selectedTags}>
            {selectedAttributes.map((sa, index) => {
              const hasDisabledValues = sa.selectedValues.some(sv => sv.disabled);
              // 🆕 key ייחודי: משלב index כדי להימנע מכפילויות
              const uniqueKey = `${sa.attribute.key}-${index}`;
              return (
                <span key={uniqueKey} className={`${styles.selectedTag} ${hasDisabledValues ? styles.lockedTag : ''}`}>
                  <Icon name={sa.attribute.valueType === 'color' ? 'Palette' : 'Tag'} size={14} />
                  {sa.attribute.name}: {sa.selectedValues.length} ערכים
                  {!hasDisabledValues ? (
                    <button
                      type="button"
                      className={styles.removeTag}
                      onClick={() => handleAttributeToggle(sa.attribute)}
                      disabled={disabled}
                    >
                      <Icon name="X" size={12} />
                    </button>
                  ) : (
                    <Icon name="Lock" size={12} className={styles.lockIcon} />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* שדה חיפוש */}
      <div className={styles.searchContainer}>
        <Icon name="Search" className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="חפש מאפיינים: מידה, צבע, חומר..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
        />
        {searchQuery && (
          <button
            type="button"
            className={styles.clearSearch}
            onClick={() => setSearchQuery('')}
            disabled={disabled}
          >
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      {/* רשימת מאפיינים */}
      <div className={styles.attributesList}>
        {filteredAttributes.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="Search" />
            <span>לא נמצאו מאפיינים</span>
          </div>
        ) : (
          filteredAttributes.map(attr => {
            const isSelected = isAttributeSelected(attr.key);
            const isExpanded = expandedAttributes.has(attr.key);
            const selectedAttr = getSelectedAttribute(attr.key);
            
            // 🆕 בדיקה האם יש מאפיינים נעולים (עם ערכים קיימים במוצר)
            const hasLockedAttributes = selectedAttributes.some(sa => 
              sa.selectedValues.some(sv => sv.disabled)
            );
            
            // מושבת לבחירה: כבר 2 מאפיינים, או שיש מאפיינים נעולים (ולא נבחר)
            const isDisabledForSelection = !isSelected && (
              selectedAttributes.length >= 2 || 
              hasLockedAttributes // 🆕 אם יש מאפיינים נעולים - אי אפשר להוסיף אחרים
            );
            
            const hasDisabledValues = selectedAttr?.selectedValues.some(sv => sv.disabled);
            const isLockedAttribute = isSelected && hasDisabledValues; // נעול - לא ניתן להסרה

            return (
              <div
                key={attr.key}
                className={`${styles.attributeItem} ${isSelected ? styles.selected : ''} ${isDisabledForSelection ? styles.disabledItem : ''} ${isLockedAttribute ? styles.lockedItem : ''}`}
              >
                {/* כותרת המאפיין */}
                <div className={styles.attributeHeader}>
                  <label className={styles.attributeLabel}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleAttributeToggle(attr)}
                      disabled={disabled || isDisabledForSelection || isLockedAttribute}
                      className={styles.checkbox}
                    />
                    <span className={styles.attributeIcon}>
                      {attr.valueType === 'color' ? (
                        <Icon name="Palette" size={18} />
                      ) : attr.valueType === 'number' ? (
                        <Icon name="DollarSign" size={18} />
                      ) : (
                        <Icon name="Tag" size={18} />
                      )}
                    </span>
                    <span className={styles.attributeName}>{attr.name}</span>
                    <span className={styles.attributeKey}>({attr.key})</span>
                    {isLockedAttribute && (
                      <span className={styles.lockBadge}>
                        <Icon name="Lock" size={12} />
                        <span>קיים במוצר</span>
                      </span>
                    )}
                  </label>

                  {/* כפתור פתיחה/סגירה */}
                  {isSelected && (
                    <button
                      type="button"
                      className={styles.expandButton}
                      onClick={() => toggleExpand(attr.key)}
                      disabled={disabled}
                    >
                      <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={18} />
                    </button>
                  )}
                </div>

                {/* תיאור המאפיין */}
                {!isSelected && (
                  <p className={styles.attributeDescription}>
                    {attr.valueType === 'color' && attr.colorFamilies && (
                      <>משפחות צבע: {attr.colorFamilies.length}</>
                    )}
                    {attr.valueType !== 'color' && attr.values && (
                      <>ערכים: {attr.values.map(v => v.displayName).slice(0, 5).join(', ')}{attr.values.length > 5 ? '...' : ''}</>
                    )}
                  </p>
                )}

                {/* בחירת ערכים (כשפתוח) */}
                {isSelected && isExpanded && (
                  <div className={styles.valuesSection}>
                    <FilterAttributeValueSelector
                      attributeKey={attr.key}
                      selectedValues={selectedAttr?.selectedValues || []}
                      onChange={(values) => handleValuesChange(attr.key, values)}
                      showColorSwatches={attr.valueType === 'color'}
                      showSearch={true}
                      disabled={disabled}
                      onDisabledValueRemoveRequest={
                        onDisabledValueRemoveRequest 
                          ? (value) => onDisabledValueRemoveRequest(value, attr.key)
                          : undefined
                      }
                    />
                  </div>
                )}

                {/* סיכום ערכים נבחרים (כשסגור) */}
                {isSelected && !isExpanded && selectedAttr && selectedAttr.selectedValues.length > 0 && (
                  <div className={styles.collapsedSummary}>
                    <span>נבחרו {selectedAttr.selectedValues.length} ערכים:</span>
                    <span className={styles.valuesList}>
                      {selectedAttr.selectedValues.slice(0, 5).map(v => v.displayName).join(', ')}
                      {selectedAttr.selectedValues.length > 5 && '...'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* כפתור המשך */}
      {showContinueButton && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.continueButton}
            onClick={onContinue}
            disabled={disabled || !stats.canContinue}
          >
            <span>המשך לבחירת שילובים</span>
            <Icon name="ChevronLeft" size={18} />
          </button>
          {!stats.canContinue && selectedAttributes.length > 0 && (
            <p className={styles.hint}>
              בחר ערכים לכל מאפיין
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VariantAttributesInline;
