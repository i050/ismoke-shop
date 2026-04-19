/**
 * AutoFillPanel Component
 * פאנל inline למילוי אוטומטי של פרטי SKUs
 * 
 * הבדל מ-AutoFillModal: זה לא מודאל, אלא אזור קבוע בעמוד (Accordion)
 * שנפתח אוטומטית כשיש וריאנטים נבחרים.
 * 
 * שימושים:
 * - יצירת SKUs מהירה מרשימת וריאנטים
 * - הגדרת תבנית SKU עם placeholders
 * - הגדרת מחיר (basePrice או ספציפי או תוספות)
 * - הגדרת מלאי וסטטוס התחלתי
 * - תצוגה מקדימה לפני יצירה
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Input } from '../../../../../../ui/Input';
import { Icon } from '../../../../../../ui/Icon';
import type { SKUFormData } from '../../../../../../../schemas/productFormSchema';
import type { Combination } from '../CombinationsGrid';
import { API_BASE_URL } from '../../../../../../../config/api';
import { getToken } from '../../../../../../../utils/tokenUtils';
import styles from './AutoFillPanel.module.css';

/**
 * פונקציה לבקשת מספרים סידוריים מהשרת
 */
async function reserveSkuSequences(count: number): Promise<number[]> {
  try {
    const token = getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/products/reserve-sequences`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      throw new Error('Failed to reserve sequences');
    }

    const data = await response.json();
    return data.sequences;
  } catch (error) {
    console.error('Error reserving sequences:', error);
    // fallback - נחזיר מערך ריק ונשתמש בלוגיקה הקיימת
    return [];
  }
}

/**
 * סוג מחיר
 */
type PricingMode = 'inherit' | 'custom' | 'surcharge';

/**
 * תוספת מחיר לציר
 */
interface AxisSurcharge {
  value: string;
  surcharge: number;
}

/**
 * מצב פעולה של הפאנל
 */
export type AutoFillMode = 'create' | 'edit';

/**
 * Props של הקומפוננטה
 */
export interface AutoFillPanelProps {
  /** האם הפאנל פתוח */
  isOpen: boolean;
  
  /** callback לשינוי מצב פתיחה/סגירה */
  onToggle: () => void;
  
  /** וריאנטים נבחרים */
  combinations: Combination[];
  
  /** תווית ציר ראשי */
  primaryLabel: string;
  
  /** 🆕 מצב פעולה: יצירה או עריכה מרובה */
  mode?: AutoFillMode;
  
  /** 🆕 SKUs קיימים לעריכה (רק במצב edit) */
  existingSkus?: SKUFormData[];
  
  /** 🆕 callback לעדכון SKUs קיימים (רק במצב edit) */
  onApplyChanges?: (updatedSkus: SKUFormData[]) => void;
  
  /** תווית ציר משני */
  secondaryLabel: string;
  
  /** מחיר בסיס של המוצר */
  basePrice: number;
  
  /** שם המוצר */
  productName: string;
  
  /** callback ליצירת SKUs */
  onGenerate: (skus: SKUFormData[]) => void;
  
  /** מפה של ערכי ציר ראשי עם HEX (לצבעים) */
  primaryValuesMap?: Map<string, { displayName: string; hex?: string; family?: string }>;
  
  /** מפה של ערכי ציר משני (כולל hex ו-family לצבעים) */
  secondaryValuesMap?: Map<string, { displayName: string; hex?: string; family?: string }>;
  
  /** סוג הוריאנט */
  variantType?: 'color' | 'custom' | null;
}

/**
 * פונקציה ליצירת קוד SKU מתבנית
 */
const generateSkuCode = (
  template: string,
  productName: string,
  primary: string,
  secondary: string
): string => {
  // המרת שם המוצר לפורמט SKU
  const productCode = productName
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .substring(0, 20);
  
  // המרת ערכי וריאנט לפורמט SKU
  const primaryCode = primary
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .substring(0, 15);
  
  const secondaryCode = secondary
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .substring(0, 10);
  
  // החלפת placeholders בתבנית
  return template
    .replace('{product}', productCode)
    .replace('{primary}', primaryCode)
    .replace('{secondary}', secondaryCode)
    .replace('{color}', primaryCode)     // alias
    .replace('{size}', secondaryCode)    // alias
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * קומפוננטת AutoFillPanel
 * פאנל inline (Accordion) למילוי אוטומטי של וריאנטים
 * 🆕 תומך גם ביצירה וגם בעריכה מרובה
 */
const AutoFillPanel: React.FC<AutoFillPanelProps> = ({
  isOpen,
  onToggle,
  combinations,
  primaryLabel,
  secondaryLabel,
  basePrice,
  productName,
  onGenerate,
  primaryValuesMap,
  secondaryValuesMap,
  variantType = 'color',
  // 🆕 Props חדשים לעריכה מרובה
  mode = 'create',
  existingSkus = [],
  onApplyChanges,
}) => {
  // 🆕 האם במצב עריכה
  const isEditMode = mode === 'edit';
  
  // זיהוי מצב 1D (רק מאפיין אחד - אין ציר משני)
  const is1DMode = useMemo(() => {
    return combinations.every(c => c.secondary === '');
  }, [combinations]);
  
  // תבנית SKU - שונה במצב 1D
  const [skuTemplate, setSkuTemplate] = useState('{product}-{primary}-{secondary}');
  
  // סוג מחיר
  const [pricingMode, setPricingMode] = useState<PricingMode>('inherit');
  
  // מחיר מותאם אישית
  const [customPrice, setCustomPrice] = useState<number>(basePrice);
  
  // מלאי התחלתי
  const [initialStock, setInitialStock] = useState<number>(10);
  
  // סטטוס התחלתי
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // תוספות מחיר לפי ציר
  const [axisSurcharges, setAxisSurcharges] = useState<AxisSurcharge[]>([]);
  
  // בחירת ציר למחיר (ראשי או משני) - רלוונטי רק במצב 2D
  const [surchargeAxis, setSurchargeAxis] = useState<'primary' | 'secondary'>('secondary');
  
  // ============================================================================
  // 🆕 State לעריכה מרובה - אילו שדות לעדכן
  // ============================================================================
  const [updatePrice, setUpdatePrice] = useState<boolean>(false);
  const [updateStock, setUpdateStock] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<boolean>(false);
  
  // ============================================================================
  // 🎯 State לעריכות פרטניות של SKUs בטבלה
  // ============================================================================
  const [skuOverrides, setSkuOverrides] = useState<Map<string, { price?: number | null; stock?: number; status?: boolean }>>(new Map());

  // ============================================================================
  // � State למספרים סידוריים גלובליים
  // ============================================================================
  const [sequenceNumbers, setSequenceNumbers] = useState<number[]>([]);
  
  // בקשת מספרים סידוריים כשכמות הקומבינציות משתנה
  useEffect(() => {
    if (combinations.length > 0) {
      reserveSkuSequences(combinations.length).then(sequences => {
        if (sequences.length > 0) {
          setSequenceNumbers(sequences);
        }
      });
    }
  }, [combinations.length]);

  // ============================================================================
  // �🎯 State לעריכות פרטניות של SKUs קיימים (במצב עריכה)
  // ============================================================================
  const [existingSkuOverrides, setExistingSkuOverrides] = useState<
    Map<string, { price?: number | null; stock?: number; status?: boolean }>
  >(new Map());
  
  // עדכון מחיר בסיס כשהוא משתנה מבחוץ
  useEffect(() => {
    setCustomPrice(basePrice);
  }, [basePrice]);
  
  // הוספת תוספת מחיר
  const handleAddSurcharge = useCallback(() => {
    setAxisSurcharges(prev => [...prev, { value: '', surcharge: 0 }]);
  }, []);
  
  // עדכון תוספת מחיר
  const handleUpdateSurcharge = useCallback((index: number, field: 'value' | 'surcharge', newValue: string | number) => {
    setAxisSurcharges(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: newValue } : item
    ));
  }, []);
  
  // מחיקת תוספת מחיר
  const handleRemoveSurcharge = useCallback((index: number) => {
    setAxisSurcharges(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  // קבלת ערכים ייחודיים של ציר לפי הבחירה
  const surchargeValues = useMemo(() => {
    if (is1DMode) {
      return [...new Set(combinations.map(c => c.primary))];
    }
    // במצב 2D - לפי הציר שנבחר
    return surchargeAxis === 'primary'
      ? [...new Set(combinations.map(c => c.primary))]
      : [...new Set(combinations.map(c => c.secondary))];
  }, [combinations, is1DMode, surchargeAxis]);
  
  // התווית לאזור התוספות - לפי הציר שנבחר
  const surchargeAxisLabel = is1DMode 
    ? primaryLabel 
    : (surchargeAxis === 'primary' ? primaryLabel : secondaryLabel);

  /**
   * יצירת SKUs מהוריאנטים
   */
  const generatedSkus = useMemo((): SKUFormData[] => {
    return combinations.map((combo, index) => {
      // קבלת פרטי הערכים
      const primaryInfo = primaryValuesMap?.get(combo.primary);
      const secondaryInfo = secondaryValuesMap?.get(combo.secondary);
      
      // יצירת קוד SKU - במצב 1D נסיר את {secondary}
      const effectiveTemplate = is1DMode 
        ? skuTemplate.replace(/-?\{secondary\}/g, '').replace(/-?\{size\}/g, '')
        : skuTemplate;
        
      let baseSkuCode = generateSkuCode(
        effectiveTemplate,
        productName,
        combo.primary,
        combo.secondary
      ) || `SKU-${index + 1}`;
      
      // 🆕 הוספת מספר סידורי גלובלי אם קיים
      if (sequenceNumbers.length > index) {
        const formattedSequence = String(sequenceNumbers[index]).padStart(3, '0');
        baseSkuCode = `${baseSkuCode}-${formattedSequence}`;
      }
      
      const skuCode = baseSkuCode;
      
      // 🎯 בדיקה אם יש override לSKU הזה
      const overrideKey = `${combo.primary}-${combo.secondary}`;
      const override = skuOverrides.get(overrideKey);
      
      // יצירת שם תצוגה - במצב 1D רק ערך אחד
      const displayName = is1DMode
        ? primaryInfo?.displayName || combo.primary
        : `${primaryInfo?.displayName || combo.primary} - ${secondaryInfo?.displayName || combo.secondary}`;
      
      // חישוב מחיר עם תוספות
      let calculatedPrice: number | null = null;
      if (pricingMode === 'inherit') {
        calculatedPrice = null;
      } else if (pricingMode === 'custom') {
        calculatedPrice = customPrice;
      } else if (pricingMode === 'surcharge') {
        const surchargeKey = is1DMode 
          ? combo.primary 
          : (surchargeAxis === 'primary' ? combo.primary : combo.secondary);
        const surcharge = axisSurcharges.find(s => s.value === surchargeKey);
        if (surcharge && surcharge.surcharge !== 0) {
          calculatedPrice = surcharge.surcharge;
        } else {
          calculatedPrice = null;
        }
      }
      
      // 🎯 שימוש ב-override אם קיים
      const finalPrice = override?.price !== undefined ? override.price : calculatedPrice;
      const finalStock = override?.stock !== undefined ? override.stock : initialStock;
      const finalStatus = override?.status !== undefined ? override.status : isActive;
      
      // 🎯 בדיקה: האם הציר הראשי הוא צבע?
      const isPrimaryColor = variantType === 'color';
      
      // 🆕 בדיקה: האם הציר המשני הוא צבע?
      const isSecondaryColor = !is1DMode && secondaryInfo?.hex; // אם יש hex בציר משני = זה צבע

      // במוצר חד-צירי צבעוני לא שומרים את הצבע גם ב-attributes,
      // כדי לא ליצור מבנה שנראה בטעות כמו צבע כציר משני.
      const skuAttributes = is1DMode
        ? (isPrimaryColor ? {} : { [primaryLabel.toLowerCase()]: combo.primary })
        : { [secondaryLabel.toLowerCase()]: combo.secondary };

      // בניית אובייקט SKU
      const sku: SKUFormData = {
        sku: skuCode,
        name: displayName,
        price: finalPrice,
        stockQuantity: finalStock,
        isActive: finalStatus,
        images: [],
        attributes: skuAttributes,
        colorFamilySource: 'auto',
      };
      
      // מקרה 1: צבע בציר ראשי
      if (isPrimaryColor) {
        sku.color = primaryInfo?.displayName || combo.primary;
        sku.colorHex = primaryInfo?.hex || '#cccccc';
        sku.colorFamily = primaryInfo?.family || 'other';
        sku.variantName = combo.primary;
        sku.subVariantName = is1DMode ? '' : combo.secondary;
      } 
      // 🆕 מקרה 2: צבע בציר משני
      else if (isSecondaryColor) {
        sku.variantName = combo.primary;
        sku.subVariantName = combo.secondary;
        // שמירת מידע הצבע (מהציר המשני)
        sku.color = secondaryInfo?.displayName || combo.secondary;
        sku.colorHex = secondaryInfo?.hex || '#888888';
        sku.colorFamily = secondaryInfo?.family || 'other';
        // גם ב-attributes כדי שה-UI ידע למצוא
        sku.attributes = {
          ...sku.attributes,
          'צבע': secondaryInfo?.displayName || combo.secondary,
          'צבעHex': secondaryInfo?.hex,
          'צבעFamily': secondaryInfo?.family,
        };
      } 
      // מקרה 3: אין צבע (custom variants רגיל)
      else {
        sku.variantName = combo.primary;
        sku.subVariantName = is1DMode ? '' : combo.secondary;
      }
      
      return sku;
    });
  }, [
    combinations,
    skuTemplate,
    productName,
    pricingMode,
    customPrice,
    initialStock,
    isActive,
    skuOverrides,
    primaryValuesMap,
    secondaryValuesMap,
    primaryLabel,
    secondaryLabel,
    variantType,
    axisSurcharges,
    basePrice,
    is1DMode,
    sequenceNumbers,
  ]);

  /**
   * 🎯 פונקציה לעדכון override של SKU בודד
   */
  const handleSkuOverride = useCallback((comboKey: string, field: 'price' | 'stock' | 'status', value: number | null | boolean) => {
    setSkuOverrides(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(comboKey) || {};
      newMap.set(comboKey, { ...existing, [field]: value });
      return newMap;
    });
  }, []);

  /**
   * 🎯 פונקציה לעדכון override של SKU קיים בודד (במצב עריכה)
   */
  const handleExistingSkuOverride = useCallback(
    (skuCode: string, field: 'price' | 'stock' | 'status', value: number | null | boolean) => {
      setExistingSkuOverrides(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(skuCode) || {};
        newMap.set(skuCode, { ...existing, [field]: value });
        return newMap;
      });
    },
    []
  );

  /**
   * טיפול בלחיצה על "צור וריאנטים"
   * המספרים הסידוריים כבר נוספו ל-generatedSkus דרך reserveSkuSequences
   */
  const handleGenerate = useCallback(() => {
    onGenerate(generatedSkus);
  }, [generatedSkus, onGenerate]);

  /**
   * 🆕 מציאת SKUs קיימים שתואמים לקומבינציות הנבחרות
   * משמש במצב עריכה מרובה
   */
  const matchedExistingSkus = useMemo(() => {
    if (!isEditMode || existingSkus.length === 0) return [];
    
    return existingSkus.filter(sku => {
      // בדיקה לכל קומבינציה נבחרת
      return combinations.some(combo => {
        if (variantType === 'color') {
          // התאמה לפי צבע (displayName או primary value)
          const primaryInfo = primaryValuesMap?.get(combo.primary);
          const colorMatch = sku.color === (primaryInfo?.displayName || combo.primary) ||
                            sku.colorHex === primaryInfo?.hex;
          
          if (is1DMode) return colorMatch;
          
          // התאמה גם לציר משני
          const secondaryMatch = sku.attributes?.[secondaryLabel.toLowerCase()] === combo.secondary;
          return colorMatch && secondaryMatch;
        } else {
          // התאמה לפי variantName
          const primaryMatch = sku.variantName === combo.primary;
          if (is1DMode) return primaryMatch;
          const secondaryMatch = sku.subVariantName === combo.secondary;
          return primaryMatch && secondaryMatch;
        }
      });
    });
  }, [isEditMode, existingSkus, combinations, variantType, primaryValuesMap, secondaryLabel, is1DMode]);

  /**
   * 🆕 טיפול בעדכון SKUs קיימים (מצב עריכה)
   */
  const handleApplyChanges = useCallback(() => {
    if (!onApplyChanges || matchedExistingSkus.length === 0) return;

    const getCalculatedPriceForSku = (sku: SKUFormData): number | null => {
      if (pricingMode === 'inherit') return null;
      if (pricingMode === 'custom') return customPrice;
      if (pricingMode === 'surcharge') {
        const axisValue = is1DMode
          ? (variantType === 'color' ? sku.color : sku.variantName)
          : surchargeAxis === 'primary'
            ? (variantType === 'color' ? sku.color : sku.variantName)
            : (variantType === 'color'
                ? sku.attributes?.[secondaryLabel.toLowerCase()]
                : sku.subVariantName);
        const surcharge = axisSurcharges.find(s => s.value === axisValue);
        if (surcharge && surcharge.surcharge !== 0) {
          return surcharge.surcharge;
        }
        return null;
      }
      return null;
    };
    
    // עדכון ה-SKUs המתאימים
    const updatedSkus = existingSkus.map(sku => {
      // בדיקה אם ה-SKU הזה נמצא ברשימה שנבחרה
      const isMatched = matchedExistingSkus.some(m => m.sku === sku.sku);
      if (!isMatched) return sku;
      
      // בניית אובייקט עדכון
      const updated = { ...sku };
      
      // עדכון מחיר אם נבחר
      if (updatePrice) {
        const override = existingSkuOverrides.get(sku.sku);
        if (override?.price !== undefined) {
          updated.price = override.price;
        } else {
          updated.price = getCalculatedPriceForSku(sku);
        }
      }
      
      // עדכון מלאי אם נבחר
      if (updateStock) {
        const override = existingSkuOverrides.get(sku.sku);
        updated.stockQuantity = override?.stock !== undefined ? override.stock : initialStock;
      }
      
      // עדכון סטטוס אם נבחר
      if (updateStatus) {
        const override = existingSkuOverrides.get(sku.sku);
        updated.isActive = override?.status !== undefined ? override.status : isActive;
      }
      
      return updated;
    });
    
    onApplyChanges(updatedSkus);
  }, [
    onApplyChanges, 
    matchedExistingSkus, 
    existingSkus, 
    updatePrice, 
    updateStock, 
    updateStatus,
    pricingMode, 
    customPrice, 
    initialStock, 
    isActive,
    axisSurcharges,
    basePrice,
    is1DMode,
    variantType,
    secondaryLabel,
    existingSkuOverrides,
  ]);

  /**
   * בדיקה שהקלט תקין
   */
  const isValid = useMemo(() => {
    if (combinations.length === 0) return false;
    
    // במצב יצירה - צריך תבנית SKU תקינה
    if (!isEditMode) {
      if (!skuTemplate.trim()) return false;
    }
    
    // במצב עריכה - צריך לבחור לפחות שדה אחד לעדכון
    if (isEditMode) {
      if (!updatePrice && !updateStock && !updateStatus) return false;
      if (matchedExistingSkus.length === 0) return false;
    }
    
    if (pricingMode === 'custom' && (!customPrice || customPrice <= 0)) return false;
    if (initialStock < 0) return false;
    return true;
  }, [
    combinations.length, 
    skuTemplate, 
    pricingMode, 
    customPrice, 
    initialStock,
    isEditMode,
    updatePrice,
    updateStock,
    updateStatus,
    matchedExistingSkus.length,
  ]);

  // אם אין וריאנטים נבחרים - לא להציג כלום
  if (combinations.length === 0) {
    return null;
  }

  return (
    <div className={styles.panel}>
      {/* כותרת Accordion */}
      <button
        type="button"
        className={styles.header}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className={styles.headerContent}>
          <Icon name={isEditMode ? 'Edit' : 'Settings'} size={20} />
          <span className={styles.headerTitle}>
            {isEditMode 
              ? `עריכה מרובה (${matchedExistingSkus.length} גירסאות מתאימות)`
              : `הגדרות מחיר ומלאי (${combinations.length} גירסאות נבחרו)`
            }
          </span>
        </div>
        <Icon 
          name={isOpen ? 'ChevronUp' : 'ChevronDown'} 
          size={20}
          className={styles.headerChevron}
        />
      </button>

      {/* תוכן הפאנל */}
      {isOpen && (
        <div className={styles.content}>
          {/* הסבר קצר - רק במצב עריכה */}
          {isEditMode && (
            <div className={styles.intro}>
              <Icon name="Info" size={18} />
              <span>
                בחר אילו שדות לעדכן ב-{matchedExistingSkus.length} הוריאנטים שנבחרו.
              </span>
            </div>
          )}

          {/* 🆕 במצב עריכה: בחירת שדות לעדכון */}
          {isEditMode && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                <Icon name="CheckSquare" size={16} />
                בחר שדות לעדכון
              </h4>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={updatePrice}
                    onChange={(e) => setUpdatePrice(e.target.checked)}
                  />
                  <span>מחיר</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={updateStock}
                    onChange={(e) => setUpdateStock(e.target.checked)}
                  />
                  <span>מלאי</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.checked)}
                  />
                  <span>סטטוס (פעיל/לא פעיל)</span>
                </label>
              </div>
            </div>
          )}

          {/* תבנית SKU - רק במצב יצירה */}
          {/* 🔒 מוסתר זמנית - תבנית אוטומטית */}
          {false && !isEditMode && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                <Icon name="Code" size={16} />
                תבנית קוד SKU
              </h4>
              <Input
                value={skuTemplate}
                onChange={(e) => setSkuTemplate(e.target.value)}
                placeholder={is1DMode ? "{product}-{primary}" : "{product}-{primary}-{secondary}"}
              />
              <p className={styles.hint}>
                {is1DMode 
                  ? <>השתמש ב-{'{product}'}, {'{primary}'} או {'{color}'}</>
                  : <>השתמש ב-{'{product}'}, {'{primary}'}, {'{secondary}'} או {'{color}'}, {'{size}'}</>
                }
              </p>
              {combinations[0] && (
                <p className={styles.example}>
                  דוגמה: <strong>{generateSkuCode(
                    is1DMode ? skuTemplate.replace(/-?\{secondary\}/g, '').replace(/-?\{size\}/g, '') : skuTemplate, 
                    productName, 
                    combinations[0].primary, 
                    combinations[0].secondary
                  )}</strong>
                </p>
              )}
            </div>
          )}

          {/* מחיר - מוצג רק אם נבחר לעדכון (במצב עריכה) או תמיד (במצב יצירה) */}
          {(!isEditMode || updatePrice) && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>
                <Icon name="DollarSign" size={16} />
                מחיר
              </h4>
            
            <div className={styles.radioGroup}>
              <label className={styles.radioItem}>
                <input
                  type="radio"
                  name="pricingMode"
                  checked={pricingMode === 'inherit'}
                  onChange={() => setPricingMode('inherit')}
                />
                <span>
                  מחיר בסיס לכולם (₪{basePrice.toFixed(2)})
                </span>
              </label>
              
              <label className={styles.radioItem}>
                <input
                  type="radio"
                  name="pricingMode"
                  checked={pricingMode === 'custom'}
                  onChange={() => setPricingMode('custom')}
                />
                <span>מחיר אחיד מותאם</span>
              </label>
              
              <label className={styles.radioItem}>
                <input
                  type="radio"
                  name="pricingMode"
                  checked={pricingMode === 'surcharge'}
                  onChange={() => setPricingMode('surcharge')}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  מחיר לפי:
                  {!is1DMode && (
                    <select
                      value={surchargeAxis}
                      onChange={(e) => setSurchargeAxis(e.target.value as 'primary' | 'secondary')}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="primary">{primaryLabel}</option>
                      <option value="secondary">{secondaryLabel}</option>
                    </select>
                  )}
                  {is1DMode && <span>{primaryLabel}</span>}
                </span>
              </label>
            </div>
            
            {pricingMode === 'custom' && (
              <div className={styles.customPriceInput}>
                <Input
                  type="number"
                  value={String(customPrice)}
                  onChange={(e) => setCustomPrice(Math.max(0, Number(e.target.value)))}
                />
                <span className={styles.currencySymbol}>₪</span>
              </div>
            )}
            
            {pricingMode === 'surcharge' && (
              <div className={styles.surchargeSection}>
                <p className={styles.surchargeInfo}>
                  הגדר מחיר ספציפי לכל ערך של {surchargeAxisLabel}:
                </p>
                
                <div className={styles.surchargeList}>
                  {axisSurcharges.map((item, index) => (
                    <div key={index} className={styles.surchargeItem}>
                      <select
                        className={styles.surchargeSelect}
                        value={item.value}
                        onChange={(e) => handleUpdateSurcharge(index, 'value', e.target.value)}
                      >
                        <option value="">בחר ערך...</option>
                        {surchargeValues.map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                      
                      <span className={styles.surchargeOperator}>=</span>
                      
                      <div className={styles.surchargeInputWrapper}>
                        <Input
                          type="number"
                          value={String(item.surcharge)}
                          onChange={(e) => handleUpdateSurcharge(index, 'surcharge', Number(e.target.value))}
                          placeholder="0"
                        />
                        <span className={styles.currencySymbol}>₪</span>
                      </div>
                      
                      <button
                        type="button"
                        className={styles.removeSurchargeButton}
                        onClick={() => handleRemoveSurcharge(index)}
                        title="הסר תוספת"
                      >
                        <Icon name="X" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  className={styles.addSurchargeButton}
                  onClick={handleAddSurcharge}
                >
                  <Icon name="Plus" size={14} />
                  הוסף מחיר
                </button>
              </div>
            )}
          </div>
          )}

          {/* מלאי וסטטוס */}
          <div className={styles.sectionRow}>
            {/* מלאי - מוצג רק אם נבחר לעדכון או במצב יצירה */}
            {(!isEditMode || updateStock) && (
              <div className={styles.sectionHalf}>
                <h4 className={styles.sectionTitle}>
                  <Icon name="Boxes" size={16} />
                  {isEditMode ? 'מלאי חדש' : 'מלאי התחלתי'}
                </h4>
                <div className={styles.stockInput}>
                  <Input
                    type="number"
                    value={String(initialStock)}
                    onChange={(e) => setInitialStock(Math.max(0, Number(e.target.value)))}
                  />
                  <span>יחידות</span>
                </div>
              </div>
            )}

            {/* סטטוס - מוצג רק אם נבחר לעדכון או במצב יצירה */}
            {(!isEditMode || updateStatus) && (
              <div className={styles.sectionHalf}>
                <h4 className={styles.sectionTitle}>
                  <Icon name="CheckCircle" size={16} />
                  סטטוס
                </h4>
                <div className={styles.radioGroupHorizontal}>
                  <label className={styles.radioItemSmall}>
                    <input
                      type="radio"
                      name="status"
                      checked={isActive}
                      onChange={() => setIsActive(true)}
                    />
                    <span>פעיל</span>
                  </label>
                  <label className={styles.radioItemSmall}>
                    <input
                      type="radio"
                    name="status"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                  />
                  <span>לא פעיל</span>
                </label>
              </div>
              </div>
            )}
          </div>

          {/* תצוגת וריאנטים - תמיד גלויה במצב יצירה */}
          {!isEditMode && (
            <div className={styles.previewSection}>
              <h4 className={styles.sectionTitle}>
                <Icon name="ClipboardList" size={16} />
                וריאנטים ({generatedSkus.length})
              </h4>
              <div className={styles.preview}>
                <div className={styles.previewTableWrapper}>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>{primaryLabel}</th>
                        {!is1DMode && <th>{secondaryLabel}</th>}
                        <th>מחיר</th>
                        <th>מלאי</th>
                        <th>סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedSkus.map((sku, index) => {
                        const combo = combinations[index];
                        const comboKey = `${combo.primary}-${combo.secondary}`;
                        
                        return (
                          <tr key={index}>
                            <td className={styles.skuCode}>{sku.sku}</td>
                            <td>
                              {variantType === 'color' ? (
                                <span className={styles.colorCell}>
                                  <span 
                                    className={styles.colorDot}
                                    style={{ backgroundColor: sku.colorHex || '#ccc' }}
                                  />
                                  {sku.color}
                                </span>
                              ) : (
                                sku.variantName
                              )}
                            </td>
                            {!is1DMode && (
                              <td>{variantType === 'color' ? sku.attributes?.[secondaryLabel.toLowerCase()] : sku.subVariantName}</td>
                            )}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Input
                                  className={styles.compactPriceInput}
                                  type="number"
                                  value={sku.price === null ? '' : String(sku.price)}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                    handleSkuOverride(comboKey, 'price', val);
                                  }}
                                  placeholder={`₪${basePrice.toFixed(2)}`}
                                />
                                {sku.price === null && (
                                  <span className={styles.inheritPrice} style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                                    (בסיס)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <Input
                                className={styles.compactStockInput}
                                type="number"
                                value={String(sku.stockQuantity)}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value));
                                  handleSkuOverride(comboKey, 'stock', val);
                                }}
                              />
                            </td>
                            <td>
                              <select
                                className={styles.compactStatusSelect}
                                value={sku.isActive ? 'active' : 'inactive'}
                                onChange={(e) => {
                                  handleSkuOverride(comboKey, 'status', e.target.value === 'active');
                                }}
                              >
                                <option value="active">פעיל</option>
                                <option value="inactive">לא פעיל</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 🆕 במצב עריכה: תצוגה מקדימה של SKUs שייפגעו */}
          {isEditMode && matchedExistingSkus.length > 0 && (
            <div className={styles.previewSection}>
              <h4 className={styles.sectionTitle}>
                <Icon name="Eye" size={16} />
                גירסאות שייפגעו מהעדכון ({matchedExistingSkus.length})
              </h4>
              <div className={styles.previewTableWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>קוד SKU</th>
                      <th>{primaryLabel}</th>
                      {!is1DMode && <th>{secondaryLabel}</th>}
                      <th>מחיר</th>
                      <th>מלאי</th>
                      <th>סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedExistingSkus.map((sku, index) => {
                      const override = existingSkuOverrides.get(sku.sku);

                      const calculatedPrice = (() => {
                        if (!updatePrice) return sku.price ?? null;
                        if (pricingMode === 'inherit') return null;
                        if (pricingMode === 'custom') return customPrice;
                        if (pricingMode === 'surcharge') {
                          const axisValue = is1DMode
                            ? (variantType === 'color' ? sku.color : sku.variantName)
                            : surchargeAxis === 'primary'
                              ? (variantType === 'color' ? sku.color : sku.variantName)
                              : (variantType === 'color'
                                  ? sku.attributes?.[secondaryLabel.toLowerCase()]
                                  : sku.subVariantName);
                          const surcharge = axisSurcharges.find(s => s.value === axisValue);
                          if (surcharge && surcharge.surcharge !== 0) return surcharge.surcharge;
                          return null;
                        }
                        return null;
                      })();

                      const finalPrice = override?.price !== undefined ? override.price : calculatedPrice;
                      const finalStock =
                        override?.stock !== undefined
                          ? override.stock
                          : updateStock
                              ? initialStock
                              : sku.stockQuantity;

                      const effectiveIsActive = override?.status !== undefined 
                        ? override.status 
                        : (updateStatus ? isActive : !!sku.isActive);

                      return (
                        <tr key={index}>
                          <td className={styles.skuCode}>{sku.sku}</td>
                          <td>
                            {variantType === 'color' ? (
                              <span className={styles.colorCell}>
                                <span
                                  className={styles.colorDot}
                                  style={{ backgroundColor: sku.colorHex || '#ccc' }}
                                />
                                {sku.color}
                              </span>
                            ) : (
                              sku.variantName
                            )}
                          </td>
                          {!is1DMode && (
                            <td>
                              {variantType === 'color'
                                ? sku.attributes?.[secondaryLabel.toLowerCase()]
                                : sku.subVariantName}
                            </td>
                          )}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Input
                                className={styles.compactPriceInput}
                                type="number"
                                disabled={!updatePrice}
                                value={finalPrice === null || finalPrice === undefined ? '' : String(finalPrice)}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? null : Number(e.target.value);
                                  handleExistingSkuOverride(sku.sku, 'price', val);
                                }}
                                placeholder={`₪${basePrice.toFixed(2)}`}
                              />
                              {finalPrice === null && (
                                <span className={styles.inheritPrice} style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                                  (בסיס)
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <Input
                              className={styles.compactStockInput}
                              type="number"
                              disabled={!updateStock}
                              value={String(finalStock)}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value));
                                handleExistingSkuOverride(sku.sku, 'stock', val);
                              }}
                            />
                          </td>
                          <td>
                            <select
                              className={styles.compactStatusSelect}
                              disabled={!updateStatus}
                              value={effectiveIsActive ? 'active' : 'inactive'}
                              onChange={(e) => {
                                handleExistingSkuOverride(sku.sku, 'status', e.target.value === 'active');
                              }}
                            >
                              <option value="active">פעיל</option>
                              <option value="inactive">לא פעיל</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* כפתור פעולה ראשי */}
          <div className={styles.actions}>
            {isEditMode ? (
              <button
                type="button"
                className={styles.generateButton}
                onClick={handleApplyChanges}
                disabled={!isValid}
              >
                <Icon name="Check" size={18} />
                עדכן {matchedExistingSkus.length} גירסאות
              </button>
            ) : (
              <button
                type="button"
                className={styles.generateButton}
                onClick={handleGenerate}
                disabled={!isValid}
              >
                <Icon name="Plus" size={18} />
                צור {combinations.length} גירסאות
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoFillPanel;
export { AutoFillPanel };
