/**
 * FilterAttributeValueSelector Component
 * קומפוננטה לבחירת ערכים ממאפיין סינון (FilterAttribute) קיים
 * 
 * שימושים:
 * - בחירת צבעים זמינים למוצר (עם swatches)
 * - בחירת מידות/סוגים/טעמים (עם checkboxes)
 * 
 * הקומפוננטה טוענת את הערכים מהשרת לפי attributeKey ומציגה אותם
 * בפורמט המתאים לסוג המאפיין (color/text/number)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FilterAttributeService, type FilterAttribute, type ColorFamily } from '../../../../../../../services/filterAttributeService';
import { Icon } from '../../../../../../ui/Icon';
import {
  appendShadeToFamily,
  findShadeNameCollision,
  normalizeShadeHex,
} from './colorVariantCreation';
import {
  mergeAttributeValue,
  mergeSelectedValue,
  normalizeAttributeValues,
  validateNewAttributeValue,
} from './attributeValueCreation';
import styles from './FilterAttributeValueSelector.module.css';

/**
 * ערך נבחר - יכול להיות צבע או ערך טקסט
 */
export interface SelectedValue {
  value: string;           // ערך הזיהוי (למשל: 'black', 'S')
  displayName: string;     // שם תצוגה (למשל: 'שחור', 'S')
  hex?: string;            // קוד HEX לצבעים
  family?: string;         // משפחת צבע (לצבעים)
  disabled?: boolean;      // האם הערך נעול ולא ניתן להסרה (ערכים קיימים במוצר)
}

/**
 * Props של הקומפוננטה
 */
export interface FilterAttributeValueSelectorProps {
  /** מפתח המאפיין לטעינה (למשל: 'color', 'size') */
  attributeKey: string;
  
  /** ערכים נבחרים */
  selectedValues: SelectedValue[];
  
  /** callback לשינוי הערכים הנבחרים */
  onChange: (values: SelectedValue[]) => void;
  
  /** האם להציג כפתורי צבע (swatches) - רלוונטי לסוג color */
  showColorSwatches?: boolean;
  
  /** כותרת מותאמת אישית */
  title?: string;
  
  /** האם השדה חובה */
  isRequired?: boolean;
  
  /** האם להציג שדה חיפוש */
  showSearch?: boolean;
  
  /** האם disabled */
  disabled?: boolean;

  /** מאפשר למנהל להוסיף גוון חדש מתוך זרימת יצירה/עריכת מוצר */
  allowColorVariantCreation?: boolean;

  /** מאפשר למנהל להוסיף ערך טקסט/מספר מתוך זרימת יצירה/עריכת מוצר */
  allowAttributeValueCreation?: boolean;

  /** מעדכן את מעטפת בחירת המאפיינים בזמן שינוי בספרייה הגלובלית */
  onAttributeLibraryMutationBusyChange?: (isBusy: boolean) => void;

  /** 🆕 callback כאשר המשתמש מבקש להסיר ערך נעול (קיים במוצר) */
  onDisabledValueRemoveRequest?: (value: SelectedValue) => void;
}

/**
 * קומפוננטת FilterAttributeValueSelector
 * בוחרת ערכים ממאפיין סינון קיים
 */
const FilterAttributeValueSelector: React.FC<FilterAttributeValueSelectorProps> = ({
  attributeKey,
  selectedValues,
  onChange,
  showColorSwatches = true,
  title,
  isRequired = false,
  showSearch = true,
  disabled = false,
  allowColorVariantCreation = false,
  allowAttributeValueCreation = false,
  onAttributeLibraryMutationBusyChange,
  onDisabledValueRemoveRequest, // 🆕 callback להסרת ערך נעול
}) => {
  // State לנתוני המאפיין
  const [attribute, setAttribute] = useState<FilterAttribute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State לחיפוש
  const [searchQuery, setSearchQuery] = useState('');
  
  // State למשפחות צבע מורחבות (פתוחות)
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  // State להוספת גוון חדש מתוך משפחה פתוחה
  const [newShadeFamily, setNewShadeFamily] = useState<string | null>(null);
  const [newShadeName, setNewShadeName] = useState('');
  const [newShadeHex, setNewShadeHex] = useState('#000000');
  const [isMutatingAttributeLibrary, setIsMutatingAttributeLibrary] = useState(false);
  const [shadeError, setShadeError] = useState<string | null>(null);
  const [shadeSuccess, setShadeSuccess] = useState<{ family: string; message: string } | null>(null);
  const [shadeFocusTargetFamily, setShadeFocusTargetFamily] = useState<string | null>(null);
  const addShadeInFlightRef = useRef(false);
  const refocusShadeNameAfterErrorRef = useRef(false);
  const newShadeNameInputRef = useRef<HTMLInputElement>(null);
  const addShadeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // State להוספת ערך טקסט/מספר חדש מתוך המאפיין הפתוח
  const [isNewAttributeValueFormOpen, setIsNewAttributeValueFormOpen] = useState(false);
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [attributeValueError, setAttributeValueError] = useState<string | null>(null);
  const [attributeValueSuccess, setAttributeValueSuccess] = useState<string | null>(null);
  const [shouldRestoreAttributeValueTriggerFocus, setShouldRestoreAttributeValueTriggerFocus] = useState(false);
  const addAttributeValueInFlightRef = useRef(false);
  const refocusAttributeValueAfterErrorRef = useRef(false);
  const newAttributeValueInputRef = useRef<HTMLInputElement>(null);
  const addAttributeValueButtonRef = useRef<HTMLButtonElement>(null);
  const selectedValuesRef = useRef(selectedValues);
  const onChangeRef = useRef(onChange);

  // Keep the completion handler current while the API request is in flight.
  selectedValuesRef.current = selectedValues;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (newShadeFamily) {
      newShadeNameInputRef.current?.focus();
    }
  }, [newShadeFamily]);

  useEffect(() => {
    if (
      !newShadeFamily &&
      shadeFocusTargetFamily &&
      !isMutatingAttributeLibrary &&
      !disabled
    ) {
      const trigger = addShadeButtonRefs.current.get(shadeFocusTargetFamily);
      if (trigger) {
        trigger.focus();
        setShadeFocusTargetFamily(null);
      }
    }
  }, [disabled, isMutatingAttributeLibrary, newShadeFamily, shadeFocusTargetFamily]);

  useEffect(() => {
    if (
      refocusShadeNameAfterErrorRef.current &&
      newShadeFamily &&
      !isMutatingAttributeLibrary &&
      !disabled
    ) {
      newShadeNameInputRef.current?.focus();
      refocusShadeNameAfterErrorRef.current = false;
    }
  }, [disabled, isMutatingAttributeLibrary, newShadeFamily, shadeError]);

  useEffect(() => {
    if (isNewAttributeValueFormOpen) {
      newAttributeValueInputRef.current?.focus();
    }
  }, [isNewAttributeValueFormOpen]);

  useEffect(() => {
    if (
      !isNewAttributeValueFormOpen &&
      shouldRestoreAttributeValueTriggerFocus &&
      !isMutatingAttributeLibrary &&
      !disabled
    ) {
      addAttributeValueButtonRef.current?.focus();
      setShouldRestoreAttributeValueTriggerFocus(false);
    }
  }, [
    disabled,
    isMutatingAttributeLibrary,
    isNewAttributeValueFormOpen,
    shouldRestoreAttributeValueTriggerFocus,
  ]);

  useEffect(() => {
    if (
      refocusAttributeValueAfterErrorRef.current &&
      isNewAttributeValueFormOpen &&
      !isMutatingAttributeLibrary &&
      !disabled
    ) {
      newAttributeValueInputRef.current?.focus();
      refocusAttributeValueAfterErrorRef.current = false;
    }
  }, [attributeValueError, disabled, isMutatingAttributeLibrary, isNewAttributeValueFormOpen]);

  /**
   * טעינת מאפיין הסינון מהשרת
   */
  useEffect(() => {
    const loadAttribute = async () => {
      if (!attributeKey) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // טוען את כל המאפיינים ומחפש את המבוקש
        const allAttributes = await FilterAttributeService.getAllAttributes();
        const found = allAttributes.find(attr => attr.key === attributeKey);
        
        if (found) {
          setAttribute({
            ...found,
            values: normalizeAttributeValues(found.values),
          });
          console.log(`✅ נטען מאפיין: ${found.name} (${found.valueType})`);
        } else {
          setError(`לא נמצא מאפיין עם מפתח: ${attributeKey}`);
        }
      } catch (err) {
        console.error('❌ שגיאה בטעינת מאפיין:', err);
        setError('שגיאה בטעינת המאפיין');
      } finally {
        setLoading(false);
      }
    };
    
    loadAttribute();
  }, [attributeKey]);

  /**
   * בדיקה האם ערך נבחר
   */
  const isValueSelected = useCallback((value: string): boolean => {
    return selectedValues.some(sv => sv.value === value);
  }, [selectedValues]);

  /**
   * טיפול בבחירת/ביטול ערך טקסט או מספר
   */
  const handleTextValueToggle = useCallback((value: string, displayName: string) => {
    if (disabled || isMutatingAttributeLibrary) return;
    
    const isSelected = isValueSelected(value);
    const existingValue = selectedValues.find(sv => sv.value === value);
    
    if (isSelected) {
      // 🆕 אם הערך מושבת (קיים במוצר), בקש אישור דרך callback
      if (existingValue?.disabled) {
        if (onDisabledValueRemoveRequest) {
          onDisabledValueRemoveRequest(existingValue);
        }
        return;
      }
      // הסר את הערך
      onChange(selectedValues.filter(sv => sv.value !== value));
    } else {
      // הוסף את הערך
      onChange([...selectedValues, { value, displayName }]);
    }
  }, [selectedValues, onChange, isValueSelected, disabled, isMutatingAttributeLibrary, onDisabledValueRemoveRequest]);

  /**
   * טיפול בבחירת/ביטול ערך צבע
   */
  const handleColorToggle = useCallback((
    colorName: string,
    hex: string,
    family: string,
    displayName?: string
  ) => {
    if (disabled || isMutatingAttributeLibrary) return;
    
    const isSelected = isValueSelected(colorName);
    const existingValue = selectedValues.find(sv => sv.value === colorName);
    
    if (isSelected) {
      // 🆕 אם הצבע מושבת (קיים במוצר), בקש אישור דרך callback
      if (existingValue?.disabled) {
        if (onDisabledValueRemoveRequest) {
          onDisabledValueRemoveRequest(existingValue);
        }
        return;
      }
      // הסר את הצבע
      onChange(selectedValues.filter(sv => sv.value !== colorName));
    } else {
      // הוסף את הצבע
      onChange([...selectedValues, {
        value: colorName,
        displayName: displayName || colorName,
        hex,
        family,
      }]);
    }
  }, [selectedValues, onChange, isValueSelected, disabled, isMutatingAttributeLibrary, onDisabledValueRemoveRequest]);

  /**
   * החלפת מצב פתיחה/סגירה של משפחת צבע
   */
  const toggleFamilyExpansion = useCallback((family: string) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(family)) {
        newSet.delete(family);
      } else {
        newSet.add(family);
      }
      return newSet;
    });
  }, []);

  const openNewShadeForm = useCallback((family: ColorFamily) => {
    if (disabled || isMutatingAttributeLibrary) return;

    setNewShadeFamily(family.family);
    refocusShadeNameAfterErrorRef.current = false;
    setNewShadeName('');
    setNewShadeHex(normalizeShadeHex(family.variants[0]?.hex || '') || '#000000');
    setShadeError(null);
    setShadeSuccess(null);
  }, [disabled, isMutatingAttributeLibrary]);

  const closeNewShadeForm = useCallback(() => {
    if (isMutatingAttributeLibrary) return;

    setShadeFocusTargetFamily(newShadeFamily);
    refocusShadeNameAfterErrorRef.current = false;
    setNewShadeFamily(null);
    setNewShadeName('');
    setNewShadeHex('#000000');
    setShadeError(null);
  }, [isMutatingAttributeLibrary, newShadeFamily]);

  const handleAddShade = useCallback(async (family: ColorFamily) => {
    if (
      disabled ||
      isMutatingAttributeLibrary ||
      addShadeInFlightRef.current ||
      newShadeFamily !== family.family ||
      !attribute
    ) {
      return;
    }

    const trimmedName = newShadeName.trim();
    if (!trimmedName) {
      setShadeError('יש להזין שם לגוון החדש');
      return;
    }

    const normalizedHex = normalizeShadeHex(newShadeHex);
    if (!normalizedHex) {
      setShadeError('יש להזין קוד HEX מלא ותקין, לדוגמה #1A2B3C');
      return;
    }

    const collision = findShadeNameCollision(attribute.colorFamilies, trimmedName);
    if (collision) {
      setShadeError(
        `גוון בשם „${trimmedName}” כבר קיים במשפחת ${collision.displayName}. יש לבחור שם ייחודי.`
      );
      return;
    }

    addShadeInFlightRef.current = true;
    setIsMutatingAttributeLibrary(true);
    onAttributeLibraryMutationBusyChange?.(true);
    setShadeError(null);
    setShadeSuccess(null);

    try {
      await FilterAttributeService.addColorVariant(
        family.family,
        trimmedName,
        normalizedHex
      );

      setAttribute((currentAttribute) => currentAttribute
        ? {
            ...currentAttribute,
            colorFamilies: appendShadeToFamily(
              currentAttribute.colorFamilies,
              family.family,
              trimmedName,
              normalizedHex
            ),
          }
        : currentAttribute
      );

      const currentSelectedValues = selectedValuesRef.current;
      if (!currentSelectedValues.some(
        (value) => value.value.toLocaleLowerCase() === trimmedName.toLocaleLowerCase()
      )) {
        const updatedSelectedValues: SelectedValue[] = [
          ...currentSelectedValues,
          {
            value: trimmedName,
            displayName: trimmedName,
            hex: normalizedHex,
            family: family.family,
          },
        ];
        selectedValuesRef.current = updatedSelectedValues;
        onChangeRef.current(updatedSelectedValues);
      }

      setNewShadeFamily(null);
      setShadeFocusTargetFamily(family.family);
      setNewShadeName('');
      setNewShadeHex('#000000');
      setShadeSuccess({
        family: family.family,
        message: `הגוון „${trimmedName}” נוסף לספריית הצבעים ונבחר למוצר`,
      });
    } catch (addError) {
      refocusShadeNameAfterErrorRef.current = true;
      setShadeError(
        addError instanceof Error && addError.message
          ? addError.message
          : 'שגיאה בהוספת הגוון. לא בוצע שינוי במוצר.'
      );
    } finally {
      addShadeInFlightRef.current = false;
      setIsMutatingAttributeLibrary(false);
      onAttributeLibraryMutationBusyChange?.(false);
    }
  }, [
    attribute,
    disabled,
    isMutatingAttributeLibrary,
    newShadeFamily,
    newShadeHex,
    newShadeName,
    onAttributeLibraryMutationBusyChange,
  ]);

  const openNewAttributeValueForm = useCallback(() => {
    if (disabled || isMutatingAttributeLibrary) return;

    setShouldRestoreAttributeValueTriggerFocus(false);
    refocusAttributeValueAfterErrorRef.current = false;
    setIsNewAttributeValueFormOpen(true);
    setNewAttributeValue('');
    setAttributeValueError(null);
    setAttributeValueSuccess(null);
  }, [disabled, isMutatingAttributeLibrary]);

  const closeNewAttributeValueForm = useCallback(() => {
    if (isMutatingAttributeLibrary) return;

    setShouldRestoreAttributeValueTriggerFocus(true);
    refocusAttributeValueAfterErrorRef.current = false;
    setIsNewAttributeValueFormOpen(false);
    setNewAttributeValue('');
    setAttributeValueError(null);
  }, [isMutatingAttributeLibrary]);

  const handleAddAttributeValue = useCallback(async () => {
    if (
      disabled ||
      isMutatingAttributeLibrary ||
      addAttributeValueInFlightRef.current ||
      !isNewAttributeValueFormOpen ||
      !attribute ||
      attribute.valueType === 'color'
    ) {
      return;
    }

    const validation = validateNewAttributeValue(
      newAttributeValue,
      attribute.valueType
    );
    if (validation.error) {
      setAttributeValueError(validation.error);
      newAttributeValueInputRef.current?.focus();
      return;
    }

    addAttributeValueInFlightRef.current = true;
    setIsMutatingAttributeLibrary(true);
    onAttributeLibraryMutationBusyChange?.(true);
    setAttributeValueError(null);
    setAttributeValueSuccess(null);

    try {
      const result = await FilterAttributeService.addAttributeValue(
        attribute._id,
        validation.value
      );
      const authoritativeValue: SelectedValue = {
        value: result.value,
        displayName: result.displayName,
      };

      setAttribute((currentAttribute) => currentAttribute
        ? {
            ...currentAttribute,
            values: mergeAttributeValue(
              currentAttribute.values,
              authoritativeValue
            ),
          }
        : currentAttribute
      );

      const currentSelectedValues = selectedValuesRef.current;
      const updatedSelectedValues = mergeSelectedValue(
        currentSelectedValues,
        authoritativeValue
      );
      if (updatedSelectedValues !== currentSelectedValues) {
        selectedValuesRef.current = updatedSelectedValues;
        onChangeRef.current(updatedSelectedValues);
      }

      setIsNewAttributeValueFormOpen(false);
      setShouldRestoreAttributeValueTriggerFocus(true);
      setNewAttributeValue('');
      setSearchQuery('');
      setAttributeValueSuccess(
        result.created
          ? `הערך „${result.displayName}” נוסף לספרייה ונבחר למוצר`
          : `הערך „${result.displayName}” כבר קיים בספרייה ונבחר למוצר`
      );
    } catch (addError) {
      refocusAttributeValueAfterErrorRef.current = true;
      setAttributeValueError(
        addError instanceof Error && addError.message
          ? addError.message
          : 'שגיאה בהוספת הערך. לא בוצע שינוי במוצר.'
      );
    } finally {
      addAttributeValueInFlightRef.current = false;
      setIsMutatingAttributeLibrary(false);
      onAttributeLibraryMutationBusyChange?.(false);
    }
  }, [
    attribute,
    disabled,
    isMutatingAttributeLibrary,
    isNewAttributeValueFormOpen,
    newAttributeValue,
    onAttributeLibraryMutationBusyChange,
  ]);

  /**
   * בחירת כל הערכים
   */
  const handleSelectAll = useCallback(() => {
    if (disabled || isMutatingAttributeLibrary || !attribute) return;
    
    if (attribute.valueType === 'color' && attribute.colorFamilies) {
      // צבעים - בחר את כל הוריאנטים מכל המשפחות
      const allColors: SelectedValue[] = [];
      attribute.colorFamilies.forEach(family => {
        family.variants.forEach(variant => {
          allColors.push({
            value: variant.name,
            displayName: variant.displayName || variant.name,
            hex: variant.hex,
            family: family.family,
          });
        });
      });
      onChange(allColors);
    } else if (attribute.values) {
      // טקסט/מספר - בחר את כל הערכים
      const allValues: SelectedValue[] = attribute.values.map(v => ({
        value: v.value,
        displayName: v.displayName,
      }));
      onChange(allValues);
    }
  }, [attribute, onChange, disabled, isMutatingAttributeLibrary]);

  /**
   * ביטול כל הבחירות (מחיקה רק של ערכים לא מושבתים)
   */
  const handleClearAll = useCallback(() => {
    if (disabled || isMutatingAttributeLibrary) return;
    // השאר רק ערכים מושבתים (קיימים במוצר)
    onChange(selectedValues.filter(sv => sv.disabled));
  }, [selectedValues, onChange, disabled, isMutatingAttributeLibrary]);

  /**
   * סינון ערכים לפי חיפוש
   */
  const filterBySearch = useCallback((text: string): boolean => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  }, [searchQuery]);

  /**
   * רינדור מצב טעינה
   */
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Icon name="Loader2" className={styles.spinner} />
          <span>טוען ערכים...</span>
        </div>
      </div>
    );
  }

  /**
   * רינדור שגיאה
   */
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

  /**
   * רינדור אם אין מאפיין
   */
  if (!attribute) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <span>בחר מאפיין</span>
        </div>
      </div>
    );
  }

  const hasAvailableValues = attribute.valueType === 'color'
    ? Boolean(attribute.colorFamilies?.some((family) => family.variants.length > 0))
    : Boolean(attribute.values?.length);
  const newAttributeValueNoteId = `new-attribute-value-note-${attribute._id}`;
  const newAttributeValueErrorId = `new-attribute-value-error-${attribute._id}`;

  /**
   * רינדור ערכי צבע
   */
  const renderColorValues = () => {
    if (!attribute.colorFamilies || attribute.colorFamilies.length === 0) {
      return (
        <div className={styles.empty}>
          <span>אין צבעים זמינים</span>
        </div>
      );
    }

    // סינון משפחות לפי חיפוש
    const filteredFamilies = attribute.colorFamilies.filter(family => {
      if (!searchQuery.trim()) return true;
      // בדוק אם שם המשפחה או אחד הוריאנטים מכיל את החיפוש
      if (filterBySearch(family.displayName)) return true;
      return family.variants.some(v => filterBySearch(v.displayName || v.name) || filterBySearch(v.name));
    });

    return (
      <div className={styles.colorFamiliesContainer}>
        {filteredFamilies.map((family: ColorFamily) => {
          const isExpanded = expandedFamilies.has(family.family);
          
          // סינון וריאנטים לפי חיפוש
          const filteredVariants = family.variants.filter(v => 
            filterBySearch(v.displayName || v.name) || filterBySearch(v.name)
          );
          
          // ספירת וריאנטים נבחרים במשפחה
          const selectedInFamily = family.variants.filter(v => isValueSelected(v.name)).length;
          
          // קבלת צבע ייצוגי למשפחה
          const representativeHex = family.variants[0]?.hex || '#ccc';
          
          return (
            <div key={family.family} className={styles.colorFamily}>
              {/* כותרת משפחה */}
              <button
                type="button"
                className={styles.familyHeader}
                onClick={() => toggleFamilyExpansion(family.family)}
                disabled={disabled || isMutatingAttributeLibrary}
                aria-expanded={isExpanded}
              >
                {/* נקודת צבע ייצוגית */}
                <span 
                  className={styles.familyColorDot}
                  style={{ backgroundColor: representativeHex }}
                />
                
                {/* שם המשפחה */}
                <span className={styles.familyName}>{family.displayName}</span>
                
                {/* ספירת נבחרים */}
                {selectedInFamily > 0 && (
                  <span className={styles.selectedCount}>
                    ({selectedInFamily})
                  </span>
                )}
                
                {/* חץ פתיחה/סגירה */}
                <Icon 
                  name={isExpanded ? 'ChevronDown' : 'ChevronLeft'} 
                  className={styles.expandIcon}
                />
              </button>
              
              {/* וריאנטי צבע */}
              {isExpanded && (
                <div className={styles.colorVariants}>
                  {allowColorVariantCreation && (
                    <div className={styles.shadeCreationArea}>
                      {shadeSuccess?.family === family.family && (
                        <div className={styles.shadeSuccess} role="status">
                          <Icon name="CheckCircle2" size={16} />
                          <span>{shadeSuccess.message}</span>
                        </div>
                      )}

                      {newShadeFamily === family.family ? (
                        <div className={styles.newShadeForm}>
                          <div className={styles.newShadeFormHeader}>
                            <Icon name="Palette" size={18} />
                            <strong>הוספת גוון למשפחת {family.displayName}</strong>
                          </div>

                          <label className={styles.shadeField}>
                            <span>שם הגוון</span>
                            <input
                              ref={newShadeNameInputRef}
                              type="text"
                              className={styles.shadeInput}
                              value={newShadeName}
                              onChange={(event) => {
                                setNewShadeName(event.target.value);
                                setShadeError(null);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void handleAddShade(family);
                                }
                              }}
                              placeholder="לדוגמה: כחול מעושן"
                              maxLength={80}
                              disabled={isMutatingAttributeLibrary}
                              autoComplete="off"
                            />
                          </label>

                          <label className={styles.shadeField}>
                            <span>צבע וקוד HEX</span>
                            <span className={styles.shadeHexControls}>
                              <input
                                type="color"
                                className={styles.shadeColorInput}
                                value={normalizeShadeHex(newShadeHex) || '#000000'}
                                onChange={(event) => {
                                  setNewShadeHex(event.target.value.toUpperCase());
                                  setShadeError(null);
                                }}
                                disabled={isMutatingAttributeLibrary}
                                aria-label={`בחירת צבע לגוון החדש במשפחת ${family.displayName}`}
                              />
                              <input
                                type="text"
                                className={`${styles.shadeInput} ${styles.shadeHexInput}`}
                                value={newShadeHex}
                                onChange={(event) => {
                                  setNewShadeHex(event.target.value.toUpperCase());
                                  setShadeError(null);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void handleAddShade(family);
                                  }
                                }}
                                placeholder="#1A2B3C"
                                maxLength={7}
                                dir="ltr"
                                disabled={isMutatingAttributeLibrary}
                                aria-label="קוד HEX לגוון החדש"
                              />
                            </span>
                          </label>

                          <p className={styles.shadePersistenceNote}>
                            הגוון נשמר מיד בספריית הצבעים הכללית ויישאר בה גם אם עריכת המוצר תבוטל.
                          </p>

                          {shadeError && (
                            <div className={styles.shadeError} role="alert">
                              <Icon name="AlertCircle" size={16} />
                              <span>{shadeError}</span>
                            </div>
                          )}

                          <div className={styles.shadeFormActions}>
                            <button
                              type="button"
                              className={styles.saveShadeButton}
                              onClick={() => void handleAddShade(family)}
                              disabled={isMutatingAttributeLibrary}
                            >
                              <Icon name={isMutatingAttributeLibrary ? 'Loader2' : 'Plus'} size={16} className={isMutatingAttributeLibrary ? styles.spinner : undefined} />
                              <span>{isMutatingAttributeLibrary ? 'שומר גוון…' : 'הוסף ובחר למוצר'}</span>
                            </button>
                            <button
                              type="button"
                              className={styles.cancelShadeButton}
                              onClick={closeNewShadeForm}
                              disabled={isMutatingAttributeLibrary}
                            >
                              ביטול
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          ref={(node) => {
                            if (node) {
                              addShadeButtonRefs.current.set(family.family, node);
                            } else {
                              addShadeButtonRefs.current.delete(family.family);
                            }
                          }}
                          type="button"
                          className={styles.addShadeButton}
                          onClick={() => openNewShadeForm(family)}
                          disabled={disabled || isMutatingAttributeLibrary}
                        >
                          <Icon name="Plus" size={17} />
                          <span>הוסף גוון חדש למשפחת {family.displayName}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {filteredVariants.map(variant => {
                    const isSelected = isValueSelected(variant.name);
                    
                    return showColorSwatches ? (
                      // תצוגת Swatch
                      <button
                        key={variant.name}
                        type="button"
                        className={`${styles.colorSwatch} ${isSelected ? styles.selected : ''} ${selectedValues.find(sv => sv.value === variant.name)?.disabled ? styles.disabled : ''}`}
                        onClick={() => handleColorToggle(variant.name, variant.hex, family.family, variant.displayName || variant.name)}
                        disabled={disabled || isMutatingAttributeLibrary}
                        title={`${variant.displayName || variant.name}${selectedValues.find(sv => sv.value === variant.name)?.disabled ? ' (לחץ להסרה)' : ''}`}
                      >
                        <span 
                          className={styles.swatchColor}
                          style={{ backgroundColor: variant.hex }}
                        />
                        <span className={styles.swatchName}>{variant.displayName || variant.name}</span>
                        {isSelected && (
                          <Icon name={selectedValues.find(sv => sv.value === variant.name)?.disabled ? "Lock" : "Check"} className={styles.checkIcon} />
                        )}
                      </button>
                    ) : (
                      // תצוגת Checkbox
                      <label 
                        key={variant.name}
                        className={`${styles.checkboxItem} ${isSelected ? styles.selected : ''} ${selectedValues.find(sv => sv.value === variant.name)?.disabled ? styles.disabledItem : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleColorToggle(variant.name, variant.hex, family.family, variant.displayName || variant.name)}
                          disabled={disabled || isMutatingAttributeLibrary}
                        />
                        <span 
                          className={styles.colorDot}
                          style={{ backgroundColor: variant.hex }}
                        />
                        <span>{variant.displayName || variant.name}</span>
                        {selectedValues.find(sv => sv.value === variant.name)?.disabled && (
                          <Icon name="Lock" className={styles.lockIcon} />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * רינדור ערכי טקסט/מספר
   */
  const renderTextValues = () => {
    if (!attribute.values || attribute.values.length === 0) {
      return (
        <div className={styles.empty}>
          <span>אין ערכים זמינים</span>
        </div>
      );
    }

    // סינון לפי חיפוש
    const filteredValues = attribute.values.filter(v => 
      filterBySearch(v.displayName) || filterBySearch(v.value)
    );

    return (
      <div className={styles.textValuesContainer}>
        {filteredValues.map(item => {
          const isSelected = isValueSelected(item.value);
          const selectedValue = selectedValues.find(sv => sv.value === item.value);
          const isDisabled = selectedValue?.disabled || false;
          
          return (
            <label 
              key={item.value}
              className={`${styles.checkboxItem} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabledItem : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleTextValueToggle(item.value, item.displayName)}
                disabled={disabled || isMutatingAttributeLibrary}
              />
              <span>{item.displayName}</span>
              {isDisabled && (
                <Icon name="Lock" className={styles.lockIcon} />
              )}
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      {/* כותרת */}
      <div className={styles.header}>
        <h4 className={styles.title}>
          {title || attribute.name}
          {isRequired && <span className={styles.required}>*</span>}
        </h4>
        
        {/* ספירת נבחרים */}
        <span className={styles.selectionInfo}>
          {selectedValues.length > 0 
            ? `${selectedValues.length} נבחרו`
            : 'לא נבחרו ערכים'
          }
        </span>
      </div>
      
      {/* שדה חיפוש */}
      {showSearch && (
        <div className={styles.searchContainer}>
          <Icon name="Search" className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="חיפוש..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled || isMutatingAttributeLibrary}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setSearchQuery('')}
              disabled={disabled || isMutatingAttributeLibrary}
            >
              <Icon name="X" />
            </button>
          )}
        </div>
      )}
      
      {/* כפתורי בחר/בטל הכל */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleSelectAll}
          disabled={disabled || isMutatingAttributeLibrary || !hasAvailableValues}
        >
          <Icon name="CheckCircle" />
          <span>בחר הכל</span>
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleClearAll}
          disabled={disabled || isMutatingAttributeLibrary || selectedValues.length === 0 || selectedValues.every(sv => sv.disabled)}
        >
          <Icon name="XCircle" />
          <span>בטל הכל</span>
        </button>
      </div>

      {attribute.valueType !== 'color' && allowAttributeValueCreation && (
        <div className={styles.attributeValueCreationArea}>
          {attributeValueSuccess && (
            <div className={styles.shadeSuccess} role="status">
              <Icon name="CheckCircle2" size={16} />
              <span>{attributeValueSuccess}</span>
            </div>
          )}

          {isNewAttributeValueFormOpen ? (
            <div className={`${styles.newShadeForm} ${styles.newAttributeValueForm}`}>
              <div className={styles.newShadeFormHeader}>
                <Icon name="Tag" size={18} />
                <strong>הוספת ערך ל{attribute.name}</strong>
              </div>

              <label className={styles.shadeField}>
                <span>{attribute.valueType === 'number' ? 'ערך מספרי' : 'שם הערך'}</span>
                <input
                  ref={newAttributeValueInputRef}
                  type={attribute.valueType === 'number' ? 'number' : 'text'}
                  inputMode={attribute.valueType === 'number' ? 'decimal' : undefined}
                  min={attribute.valueType === 'number' ? 0 : undefined}
                  step={attribute.valueType === 'number' ? 'any' : undefined}
                  maxLength={attribute.valueType === 'text' ? 50 : undefined}
                  className={styles.shadeInput}
                  value={newAttributeValue}
                  onChange={(event) => {
                    setNewAttributeValue(event.target.value);
                    setAttributeValueError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleAddAttributeValue();
                    }
                  }}
                  placeholder={attribute.valueType === 'number' ? 'לדוגמה: 12.5' : 'לדוגמה: כותנה אורגנית'}
                  disabled={isMutatingAttributeLibrary}
                  autoComplete="off"
                  aria-invalid={Boolean(attributeValueError)}
                  aria-describedby={`${newAttributeValueNoteId}${
                    attributeValueError ? ` ${newAttributeValueErrorId}` : ''
                  }`}
                />
              </label>

              <p id={newAttributeValueNoteId} className={styles.shadePersistenceNote}>
                הערך נשמר מיד בספריית המאפיינים הכללית ויישאר בה גם אם עריכת המוצר תבוטל.
              </p>

              {attributeValueError && (
                <div id={newAttributeValueErrorId} className={styles.shadeError} role="alert">
                  <Icon name="AlertCircle" size={16} />
                  <span>{attributeValueError}</span>
                </div>
              )}

              <div className={styles.shadeFormActions}>
                <button
                  type="button"
                  className={styles.saveShadeButton}
                  onClick={() => void handleAddAttributeValue()}
                  disabled={isMutatingAttributeLibrary}
                >
                  <Icon
                    name={isMutatingAttributeLibrary ? 'Loader2' : 'Plus'}
                    size={16}
                    className={isMutatingAttributeLibrary ? styles.spinner : undefined}
                  />
                  <span>{isMutatingAttributeLibrary ? 'שומר ערך…' : 'הוסף ובחר למוצר'}</span>
                </button>
                <button
                  type="button"
                  className={styles.cancelShadeButton}
                  onClick={closeNewAttributeValueForm}
                  disabled={isMutatingAttributeLibrary}
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <button
              ref={addAttributeValueButtonRef}
              type="button"
              className={styles.addAttributeValueButton}
              onClick={openNewAttributeValueForm}
              disabled={disabled || isMutatingAttributeLibrary}
            >
              <Icon name="Plus" size={17} />
              <span>הוסף ערך חדש ל{attribute.name}</span>
            </button>
          )}
        </div>
      )}
      
      {/* רשימת ערכים */}
      <div className={styles.valuesContainer}>
        {attribute.valueType === 'color' 
          ? renderColorValues() 
          : renderTextValues()
        }
      </div>
      
      {/* סיכום נבחרים */}
      {selectedValues.length > 0 && (
        <div className={styles.summary}>
          <span className={styles.summaryLabel}>נבחרו:</span>
          <div className={styles.selectedTags}>
            {selectedValues.map(sv => (
              <span key={sv.value} className={`${styles.selectedTag} ${sv.disabled ? styles.disabledTag : ''}`}>
                {sv.hex && (
                  <span 
                    className={styles.tagColorDot}
                    style={{ backgroundColor: sv.hex }}
                  />
                )}
                {sv.displayName}
                {!sv.disabled ? (
                  <button
                    type="button"
                    className={styles.removeTag}
                    onClick={() => {
                      if (!disabled && !isMutatingAttributeLibrary) {
                        onChange(selectedValues.filter(v => v.value !== sv.value));
                      }
                    }}
                    disabled={disabled || isMutatingAttributeLibrary}
                  >
                    <Icon name="X" />
                  </button>
                ) : (
                  <Icon name="Lock" className={styles.lockTagIcon} />
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterAttributeValueSelector;
