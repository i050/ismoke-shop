/**
 * AddVariantModal Component
 * =========================
 * מודאל להוספת וריאנט מותאם אישית (לא צבע)
 * תומך בשתי אפשרויות:
 * 1. בחירה חופשית (Free Text) - המנהל כותב את הערכים
 * 2. קישור למאפיין סינון (Linked Attribute) - בחירה מרשימה קיימת
 * 
 * 🆕 Phase 7: Custom Variants - Full Implementation
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Modal from '../../../../../../ui/Modal';
import { Icon } from '../../../../../../ui/Icon';
import type { NewVariantData } from './types';
import { FilterAttributeService } from '../../../../../../../services/filterAttributeService';
import styles from './AddVariantModal.module.css';

// ============================================================================
// Props Interface
// ============================================================================

interface AddVariantModalProps {
  /** האם המודאל פתוח */
  isOpen: boolean;
  /** callback לסגירת המודאל */
  onClose: () => void;
  /** callback להוספת וריאנט */
  onSubmit: (data: NewVariantData) => void;
  /** מחיר בסיס מהמוצר */
  basePrice: number;
  /** תווית הוריאנט הראשי (לדוגמה: "טעם") */
  primaryVariantLabel?: string;
  /** תווית הוריאנט המשני (לדוגמה: "ניקוטין") */
  secondaryVariantLabel?: string;
  /** 🆕 מצב הגדרת שם הוריאנט (מ-CustomVariantsView) */
  labelDefinitionMode: 'free' | 'linked';
  /** 🆕 מאפיין הסינון שנבחר (במצב linked) */
  selectedFilterAttribute?: string;
  /** מאפיין סינון ראשי (אם מקושר) */
  primaryFilterAttribute?: string;
  /** מאפיין סינון משני (אם מקושר) */
  secondaryFilterAttribute?: string;
  /** וריאנטים קיימים (למניעת כפילויות) */
  existingVariants: string[];
  /** האם בטעינה */
  isLoading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const AddVariantModal: React.FC<AddVariantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  basePrice,
  primaryVariantLabel = 'וריאנט',
  labelDefinitionMode,
  selectedFilterAttribute,
  existingVariants,
  isLoading = false,
}) => {
  // ============================================================================
  // State
  // ============================================================================
  
  // טעינה
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  
  // 🆕 ערכים זמינים מהמאפיין סינון (במצב linked)
  const [availableAttributeValues, setAvailableAttributeValues] = useState<string[]>([]);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<string[]>([]);
  
  // 🆕 מלאי ומחיר לכל וריאנט - במקום ערכים כלליים
  const [variantDetails, setVariantDetails] = useState<Record<string, { stock: number; price: number }>>({});
  
  // בחירה חופשית - רשימת ערכי וריאנטים
  const [freeVariantsList, setFreeVariantsList] = useState<string[]>([]);
  const [freeCurrentInput, setFreeCurrentInput] = useState('');
  
  // ברירות מחדל למלאי ומחיר חדשים
  const [defaultStock, setDefaultStock] = useState(10);
  const [defaultPrice, setDefaultPrice] = useState(basePrice);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * איפוס הטופס בפתיחת המודאל
   */
  useEffect(() => {
    if (isOpen) {
      setFreeVariantsList([]);
      setFreeCurrentInput('');
      setDefaultStock(10);
      setDefaultPrice(basePrice);
      setVariantDetails({});
      setAvailableAttributeValues([]);
      setSelectedAttributeValues([]);
    }
  }, [isOpen, basePrice]);

  /**
   * 🆕 טעינת ערכים מהמאפיין הנבחר (במצב linked)
   */
  useEffect(() => {
    const loadAttributeValues = async () => {
      if (labelDefinitionMode !== 'linked' || !selectedFilterAttribute) {
        setAvailableAttributeValues([]);
        return;
      }
      
      setLoadingAttributes(true);
      try {
        const attrs = await FilterAttributeService.getAllAttributes();
        const selectedAttr = attrs.find(attr => attr.key === selectedFilterAttribute);
        
        if (selectedAttr?.values) {
          // מיצוי ערכי הטקסט מהמאפיין
          const allValues = selectedAttr.values.map(v => 
            typeof v === 'string' ? v : v.value
          );
          // סינון ערכים שכבר קיימים
          const available = allValues.filter(
            val => !existingVariants.includes(val)
          );
          setAvailableAttributeValues(available);
          console.log(`✅ טעינת ${available.length} ערכים זמינים מ-${selectedFilterAttribute}`);
        } else {
          setAvailableAttributeValues([]);
        }
      } catch (error) {
        console.error('⚠️ שגיאה בטעינת ערכי מאפיין:', error);
        setAvailableAttributeValues([]);
      } finally {
        setLoadingAttributes(false);
      }
    };

    if (isOpen) {
      loadAttributeValues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, labelDefinitionMode, selectedFilterAttribute]);
  // Note: existingVariants מושמט במכוון - נטען רק בפתיחת המודל, לא משתנה בזמן שהמודל פתוח

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * בדיקה אם הוריאנט כבר קיים (רק במצב חופשי) - עבור הקלט הנוכחי
   */
  const variantExists = useMemo(() => {
    if (labelDefinitionMode !== 'free') return false;
    const trimmed = freeCurrentInput.trim().toLowerCase();
    if (!trimmed) return false;
    // בדיקה בוריאנטים קיימים וברשימה הנוכחית
    return existingVariants.some(v => v.toLowerCase() === trimmed) ||
           freeVariantsList.some(v => v.toLowerCase() === trimmed);
  }, [labelDefinitionMode, freeCurrentInput, existingVariants, freeVariantsList]);

  /**
   * ולידציה - האם הטופס תקין
   */
  const isValid = useMemo(() => {
    if (labelDefinitionMode === 'free') {
      // צריך לפחות ערך אחד ברשימה
      return freeVariantsList.length > 0;
    } else {
      // מצב linked - צריך לבחור לפחות ערך אחד
      return selectedAttributeValues.length > 0;
    }
  }, [
    labelDefinitionMode,
    freeVariantsList.length,
    selectedAttributeValues.length,
  ]);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * 🆕 הוספת וריאנט לרשימה החופשית
   */
  const handleAddFreeVariant = useCallback(() => {
    const trimmed = freeCurrentInput.trim();
    if (!trimmed) return;
    
    if (freeVariantsList.includes(trimmed)) {
      alert(`${primaryVariantLabel} "${trimmed}" כבר קיים ברשימה`);
      return;
    }
    
    if (existingVariants.includes(trimmed)) {
      alert(`${primaryVariantLabel} "${trimmed}" כבר קיים במוצר`);
      return;
    }
    
    setFreeVariantsList(prev => [...prev, trimmed]);
    // הוספת ברירת מחדל למלאי ומחיר
    setVariantDetails(prev => ({
      ...prev,
      [trimmed]: { stock: defaultStock, price: defaultPrice }
    }));
    setFreeCurrentInput('');
  }, [freeCurrentInput, freeVariantsList, primaryVariantLabel, existingVariants, defaultStock, defaultPrice]);

  /**
   * 🆕 מחיקת וריאנט מהרשימה החופשית
   */
  const handleRemoveFreeVariant = useCallback((variantToRemove: string) => {
    setFreeVariantsList(prev => prev.filter(v => v !== variantToRemove));
    setVariantDetails(prev => {
      const newDetails = { ...prev };
      delete newDetails[variantToRemove];
      return newDetails;
    });
  }, []);

  /**
   * 🆕 טיפול ב-Enter בשדה הקלט
   */
  const handleFreeInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFreeVariant();
    }
  }, [handleAddFreeVariant]);

  /**
   * שליחת הטופס
   */
  const handleSubmit = useCallback(() => {
    if (!isValid) return;

    const data: NewVariantData = {
      mode: labelDefinitionMode,
      basePrice: defaultPrice, // deprecated but kept for compatibility
      initialQuantity: defaultStock, // deprecated but kept for compatibility
      variantDetails, // 🆕 פרטי מלאי ומחיר לכל וריאנט
    };

    if (labelDefinitionMode === 'free') {
      data.variants = freeVariantsList;
    } else {
      data.linkedAttribute = selectedFilterAttribute;
      data.variants = selectedAttributeValues;
    }

    onSubmit(data);
    onClose();
  }, [
    isValid,
    labelDefinitionMode,
    variantDetails,
    freeVariantsList,
    selectedFilterAttribute,
    selectedAttributeValues,
    defaultPrice,
    defaultStock,
    onSubmit,
    onClose,
  ]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Icon name="Plus" size={24} />
            <h2 className={styles.title}>
              הוספת ערכי {primaryVariantLabel || 'וריאנט'}
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="סגור"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* מצב חופשי */}
          {labelDefinitionMode === 'free' && (
            <div className={styles.freeMode}>
              {/* שדה הוספה */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  הוסף ערכים ל{primaryVariantLabel || 'וריאנט'}
                  <span className={styles.optional}>(ניתן להוסיף מספר ערכים)</span>
                </label>
                <div className={styles.addInputGroup}>
                  <input
                    type="text"
                    className={`${styles.input} ${variantExists ? styles.inputError : ''}`}
                    value={freeCurrentInput}
                    onChange={(e) => setFreeCurrentInput(e.target.value)}
                    onKeyDown={handleFreeInputKeyDown}
                    placeholder={primaryVariantLabel ? `לדוגמה: תפוח` : 'הגדר שם וריאנט ראשי'}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className={styles.addButton}
                    onClick={handleAddFreeVariant}
                    disabled={!freeCurrentInput.trim() || variantExists || isLoading}
                  >
                    <Icon name="Plus" size={16} />
                    הוסף
                  </button>
                </div>
                {variantExists && (
                  <p className={styles.errorText}>
                    <Icon name="AlertTriangle" size={14} />
                    {primaryVariantLabel || 'וריאנט'} זה כבר קיים
                  </p>
                )}
              </div>

              {/* רשימת הוריאנטים שנוספו */}
              {freeVariantsList.length > 0 && (
                <div className={styles.variantsList}>
                  <div className={styles.variantsListHeader}>
                    <Icon name="List" size={16} />
                    <span>ערכי {primaryVariantLabel} שנבחרו ({freeVariantsList.length})</span>
                  </div>

                  {/* ברירות מחדל */}
                  <div className={styles.defaultValuesRow}>
                    <label>ברירות מחדל לערכים חדשים:</label>
                    <div className={styles.defaultInputs}>
                      <div className={styles.defaultInputGroup}>
                        <label>מלאי</label>
                        <input
                          type="number"
                          placeholder="מלאי"
                          value={defaultStock}
                          onChange={(e) => setDefaultStock(parseInt(e.target.value) || 0)}
                          min={0}
                          disabled={isLoading}
                        />
                      </div>
                      <div className={styles.defaultInputGroup}>
                        <label>מחיר</label>
                        <input
                          type="number"
                          placeholder="מחיר (₪)"
                          value={defaultPrice}
                          onChange={(e) => setDefaultPrice(parseFloat(e.target.value) || 0)}
                          min={0}
                          step="0.01"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.variantsItems}>
                    {freeVariantsList.map((variant) => (
                      <div key={variant} className={styles.variantItemGrid}>
                        <span className={styles.variantItemText}>{variant}</span>
                        <input
                          type="number"
                          className={styles.variantInput}
                          placeholder="מלאי"
                          value={variantDetails[variant]?.stock ?? defaultStock}
                          onChange={(e) => {
                            const newStock = parseInt(e.target.value) || 0;
                            setVariantDetails(prev => ({
                              ...prev,
                              [variant]: { ...prev[variant], stock: newStock, price: prev[variant]?.price ?? defaultPrice }
                            }));
                          }}
                          min={0}
                          disabled={isLoading}
                        />
                        <input
                          type="number"
                          className={styles.variantInput}
                          placeholder="מחיר"
                          value={variantDetails[variant]?.price ?? defaultPrice}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            setVariantDetails(prev => ({
                              ...prev,
                              [variant]: { stock: prev[variant]?.stock ?? defaultStock, price: newPrice }
                            }));
                          }}
                          min={0}
                          step="0.01"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => handleRemoveFreeVariant(variant)}
                          disabled={isLoading}
                          title="הסר"
                        >
                          <Icon name="X" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* מצב מקושר - בחירת ערכים מהמאפיין */}
          {labelDefinitionMode === 'linked' && (
            <div className={styles.linkedMode}>
              {loadingAttributes ? (
                <div className={styles.loading}>
                  <Icon name="Loader2" size={24} className={styles.spinner} />
                  <p>טוען ערכים מהמאפיין...</p>
                </div>
              ) : availableAttributeValues.length === 0 ? (
                <div className={styles.emptyValues}>
                  <Icon name="AlertCircle" size={24} />
                  <p>אין ערכים זמינים במאפיין <strong>{selectedFilterAttribute}</strong></p>
                  <p className={styles.emptyValuesHint}>
                    {existingVariants.length > 0 
                      ? 'כל הערכים כבר נוספו כגירסאות' 
                      : 'הוסף ערכים למאפיין הסינון בהגדרות'}
                  </p>
                </div>
              ) : (
                <>
                  {/* בחירת ערכים מהמאפיין */}
                  <div className={styles.valuesSection}>
                    <div className={styles.valuesSectionHeader}>
                      <label className={styles.label}>
                        בחר ערכי {primaryVariantLabel}
                        <span className={styles.required}>*</span>
                        <span className={styles.selectedCount}>
                          ({selectedAttributeValues.length} נבחרו מתוך {availableAttributeValues.length})
                        </span>
                      </label>
                      <div className={styles.valuesActions}>
                        <button
                          type="button"
                          className={styles.linkButton}
                          onClick={() => setSelectedAttributeValues([...availableAttributeValues])}
                        >
                          בחר הכל
                        </button>
                        <button
                          type="button"
                          className={styles.linkButton}
                          onClick={() => setSelectedAttributeValues([])}
                        >
                          נקה
                        </button>
                      </div>
                    </div>
                    <div className={styles.valuesGrid}>
                      {availableAttributeValues.map(value => (
                        <label key={value} className={styles.valueCheckbox}>
                          <input
                            type="checkbox"
                            checked={selectedAttributeValues.includes(value)}
                            onChange={() => {
                              setSelectedAttributeValues(prev => {
                                const isCurrentlySelected = prev.includes(value);
                                if (isCurrentlySelected) {
                                  // Remove value and its details
                                  setVariantDetails(current => {
                                    const newDetails = { ...current };
                                    delete newDetails[value];
                                    return newDetails;
                                  });
                                  return prev.filter(v => v !== value);
                                } else {
                                  // Add value and initialize its details
                                  setVariantDetails(current => ({
                                    ...current,
                                    [value]: { stock: defaultStock, price: defaultPrice }
                                  }));
                                  return [...prev, value];
                                }
                              });
                            }}
                            disabled={isLoading}
                          />
                          <span>{value}</span>
                          {selectedAttributeValues.includes(value) && (
                            <div className={styles.valueInputsWrapper}>
                              <div className={styles.inputWithLabel}>
                                <label>מלאי</label>
                                <input
                                  type="number"
                                  className={styles.variantInput}
                                  placeholder="מלאי"
                                  value={variantDetails[value]?.stock ?? defaultStock}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const newStock = parseInt(e.target.value) || 0;
                                    setVariantDetails(prev => ({
                                      ...prev,
                                      [value]: { ...prev[value], stock: newStock, price: prev[value]?.price ?? defaultPrice }
                                    }));
                                  }}
                                  min={0}
                                  disabled={isLoading}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className={styles.inputWithLabel}>
                                <label>מחיר</label>
                                <input
                                  type="number"
                                  className={styles.variantInput}
                                  placeholder="מחיר"
                                  value={variantDetails[value]?.price ?? defaultPrice}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const newPrice = parseFloat(e.target.value) || 0;
                                    setVariantDetails(prev => ({
                                      ...prev,
                                      [value]: { stock: prev[value]?.stock ?? defaultStock, price: newPrice }
                                    }));
                                  }}
                                  min={0}
                                  step="0.01"
                                  disabled={isLoading}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* ברירות מחדל */}
                  <div className={styles.defaultValuesSection}>
                    <label className={styles.defaultLabel}>ברירות מחדל לערכים חדשים:</label>
                    <div className={styles.defaultInputs}>
                      <div className={styles.defaultInputGroup}>
                        <label>מלאי:</label>
                        <input
                          type="number"
                          value={defaultStock}
                          onChange={(e) => setDefaultStock(parseInt(e.target.value) || 0)}
                          min={0}
                          disabled={isLoading}
                        />
                      </div>
                      <div className={styles.defaultInputGroup}>
                        <label>מחיר (₪):</label>
                        <input
                          type="number"
                          value={defaultPrice}
                          onChange={(e) => setDefaultPrice(parseFloat(e.target.value) || 0)}
                          min={0}
                          step="0.01"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* תצוגה מקדימה */}
                  {selectedAttributeValues.length > 0 && (
                    <div className={styles.preview}>
                      <h4 className={styles.previewTitle}>
                        <Icon name="Eye" size={16} />
                        תצוגה מקדימה
                      </h4>
                      <p className={styles.previewText}>
                        ייווצרו {selectedAttributeValues.length} SKUs
                      </p>
                      <div className={styles.previewList}>
                        {selectedAttributeValues.slice(0, 5).map(value => (
                          <div key={value} className={styles.previewItem}>
                            {value}
                          </div>
                        ))}
                        {selectedAttributeValues.length > 5 && (
                          <div className={styles.previewMore}>
                            +{selectedAttributeValues.length - 5} נוספים...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isLoading}
          >
            ביטול
          </button>
          <button
            type="button"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <>
                <Icon name="Loader2" size={18} className={styles.spinner} />
                שומר...
              </>
            ) : (
              <>
                <Icon name="Plus" size={18} />
                הוסף {primaryVariantLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddVariantModal;
