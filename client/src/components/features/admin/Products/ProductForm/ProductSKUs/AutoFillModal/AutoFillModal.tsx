/**
 * AutoFillModal Component
 * מודאל למילוי אוטומטי של פרטי SKUs מרשימת שילובים
 * 
 * שימושים:
 * - יצירת SKUs מהירה מרשימת שילובים (צבע × מידה)
 * - הגדרת תבנית SKU עם placeholders
 * - הגדרת מחיר (basePrice או ספציפי)
 * - הגדרת מלאי וסטטוס התחלתי
 * - תצוגה מקדימה לפני יצירה
 * 
 * Base Price Override Pattern:
 * - אם המשתמש בוחר "מחיר בסיס" → SKU.price = null
 * - אם המשתמש מגדיר מחיר ספציפי → SKU.price = המחיר
 */

import React, { useState, useCallback, useMemo } from 'react';
import Modal from '../../../../../../ui/Modal';
import { Input } from '../../../../../../ui/Input';
import { Icon } from '../../../../../../ui/Icon';
import type { SKUFormData } from '../../../../../../../schemas/productFormSchema';
import type { Combination } from '../CombinationsGrid';
import styles from './AutoFillModal.module.css';

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
 * Props של הקומפוננטה
 */
export interface AutoFillModalProps {
  /** האם המודאל פתוח */
  isOpen: boolean;
  
  /** callback לסגירה */
  onClose: () => void;
  
  /** שילובים נבחרים */
  combinations: Combination[];
  
  /** תווית ציר ראשי */
  primaryLabel: string;
  
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
  
  /** מפה של ערכי ציר משני */
  secondaryValuesMap?: Map<string, { displayName: string }>;
  
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
 * קומפוננטת AutoFillModal
 */
const AutoFillModal: React.FC<AutoFillModalProps> = ({
  isOpen,
  onClose,
  combinations,
  primaryLabel,
  secondaryLabel,
  basePrice,
  productName,
  onGenerate,
  primaryValuesMap,
  secondaryValuesMap,
  variantType = 'color',
}) => {
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
  
  // מצב תצוגה מקדימה
  const [showPreview, setShowPreview] = useState<boolean>(false);
  
  // תוספות מחיר לפי ציר משני (למשל: XL +₪20)
  const [axisSurcharges, setAxisSurcharges] = useState<AxisSurcharge[]>([]);
  
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
  
  // קבלת ערכים ייחודיים של ציר משני (במצב 2D) או ציר ראשי (במצב 1D)
  const secondaryValues = useMemo(() => {
    if (is1DMode) {
      // במצב 1D - נשתמש בערכי הציר הראשי לתוספות
      return [...new Set(combinations.map(c => c.primary))];
    }
    return [...new Set(combinations.map(c => c.secondary))];
  }, [combinations, is1DMode]);
  
  // התווית לאזור התוספות
  const surchargeAxisLabel = is1DMode ? primaryLabel : secondaryLabel;

  /**
   * יצירת SKUs מהשילובים
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
        
      const skuCode = generateSkuCode(
        effectiveTemplate,
        productName,
        combo.primary,
        combo.secondary
      ) || `SKU-${index + 1}`;
      
      // יצירת שם תצוגה - במצב 1D רק ערך אחד
      const displayName = is1DMode
        ? primaryInfo?.displayName || combo.primary
        : `${primaryInfo?.displayName || combo.primary} - ${secondaryInfo?.displayName || combo.secondary}`;
      
      // חישוב מחיר עם תוספות
      let calculatedPrice: number | null = null;
      if (pricingMode === 'inherit') {
        // מחיר בסיס - null
        calculatedPrice = null;
      } else if (pricingMode === 'custom') {
        // מחיר מותאם אישית
        calculatedPrice = customPrice;
      } else if (pricingMode === 'surcharge') {
        // תוספות לפי ציר - במצב 1D זה הציר הראשי, במצב 2D זה הציר המשני
        const surchargeKey = is1DMode ? combo.primary : combo.secondary;
        const surcharge = axisSurcharges.find(s => s.value === surchargeKey);
        if (surcharge && surcharge.surcharge !== 0) {
          calculatedPrice = basePrice + surcharge.surcharge;
        } else {
          calculatedPrice = null; // מחיר בסיס
        }
      }
      
      // בניית אובייקט SKU
      const sku: SKUFormData = {
        sku: skuCode,
        name: displayName,
        price: calculatedPrice,
        stockQuantity: initialStock,
        isActive: isActive,
        images: [],
        attributes: is1DMode 
          ? { [primaryLabel.toLowerCase()]: combo.primary }
          : { [secondaryLabel.toLowerCase()]: combo.secondary },
        colorFamilySource: 'auto', // ברירת מחדל - זיהוי אוטומטי
      };
      
      // אם זה סוג צבע - הוסף שדות צבע
      if (variantType === 'color') {
        sku.color = primaryInfo?.displayName || combo.primary;
        sku.colorHex = primaryInfo?.hex || '#cccccc';
        sku.colorFamily = primaryInfo?.family || 'other';
      } else {
        // וריאנט מותאם אישית
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
    primaryValuesMap,
    secondaryValuesMap,
    primaryLabel,
    secondaryLabel,
    variantType,
    axisSurcharges,
    basePrice,
    is1DMode,
  ]);

  /**
   * טיפול בלחיצה על "צור וריאנטים"
   */
  const handleGenerate = useCallback(() => {
    onGenerate(generatedSkus);
    onClose();
  }, [generatedSkus, onGenerate, onClose]);

  /**
   * טיפול בשינוי תבנית
   */
  const handleTemplateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSkuTemplate(e.target.value);
  }, []);

  /**
   * בדיקה שהקלט תקין
   */
  const isValid = useMemo(() => {
    if (!skuTemplate.trim()) return false;
    if (pricingMode === 'custom' && (!customPrice || customPrice <= 0)) return false;
    if (initialStock < 0) return false;
    return true;
  }, [skuTemplate, pricingMode, customPrice, initialStock]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="מילוי אוטומטי מהיר"
      size="large"
    >
      <div className={styles.container}>
        {/* הסבר */}
        <div className={styles.intro}>
          <Icon name="Info" />
          <span>
            במקום למלא ידנית {combinations.length} שורות, תן לנו למלא בשבילך!
          </span>
        </div>

        {/* תבנית SKU */}
        {/* 🔒 מוסתר זמנית - תבנית אוטומטית */}
        {false && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Icon name="Code" />
            תבנית קוד SKU
          </h4>
          <Input
            value={skuTemplate}
            onChange={handleTemplateChange}
            placeholder={is1DMode ? "{product}-{primary}" : "{product}-{primary}-{secondary}"}
          />
          <p className={styles.hint}>
            {is1DMode 
              ? <>השתמש ב-{'{product}'}, {'{primary}'} או {'{color}'}</>
              : <>השתמש ב-{'{product}'}, {'{primary}'}, {'{secondary}'} או {'{color}'}, {'{size}'}</>
            }
          </p>
          <p className={styles.example}>
            לדוגמה: <strong>{generateSkuCode(
              is1DMode ? skuTemplate.replace(/-?\{secondary\}/g, '').replace(/-?\{size\}/g, '') : skuTemplate, 
              productName, 
              combinations[0]?.primary || 'BLACK', 
              combinations[0]?.secondary || ''
            )}</strong>
          </p>
        </div>
        )}

        {/* מחיר */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Icon name="DollarSign" />
            מחירים
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
                <small className={styles.radioHint}>SKU.price = null → ישתמש ב-basePrice</small>
              </span>
            </label>
            
            <label className={styles.radioItem}>
              <input
                type="radio"
                name="pricingMode"
                checked={pricingMode === 'custom'}
                onChange={() => setPricingMode('custom')}
              />
              <span>
                מחיר מותאם אישית
                <small className={styles.radioHint}>SKU.price דורס את basePrice</small>
              </span>
            </label>
            
            <label className={styles.radioItem}>
              <input
                type="radio"
                name="pricingMode"
                checked={pricingMode === 'surcharge'}
                onChange={() => setPricingMode('surcharge')}
              />
              <span>
                תוספות לפי {surchargeAxisLabel}
                <small className={styles.radioHint}>הגדר תוספת מחיר לכל ערך ב{surchargeAxisLabel}</small>
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
                הוסף תוספת מחיר לערכי {surchargeAxisLabel} ספציפיים. ערכים ללא תוספת ישתמשו במחיר הבסיס.
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
                      {secondaryValues.map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                    
                    <span className={styles.surchargeOperator}>+</span>
                    
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
                הוסף תוספת מחיר
              </button>
            </div>
          )}
        </div>

        {/* מלאי */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Icon name="Boxes" />
            מלאי התחלתי לכולם
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

        {/* סטטוס */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Icon name="CheckCircle" />
            סטטוס
          </h4>
          
          <div className={styles.radioGroup}>
            <label className={styles.radioItem}>
              <input
                type="radio"
                name="status"
                checked={isActive}
                onChange={() => setIsActive(true)}
              />
              <span>פעיל</span>
            </label>
            
            <label className={styles.radioItem}>
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

        {/* כפתור תצוגה מקדימה */}
        <div className={styles.previewToggle}>
          <button
            type="button"
            className={styles.previewButton}
            onClick={() => setShowPreview(!showPreview)}
          >
            <Icon name={showPreview ? 'ChevronUp' : 'ChevronDown'} />
            <span>{showPreview ? 'הסתר תצוגה מקדימה' : 'הצג תצוגה מקדימה'}</span>
          </button>
        </div>

        {/* תצוגה מקדימה */}
        {showPreview && (
          <div className={styles.preview}>
            <h4 className={styles.previewTitle}>
              <Icon name="Eye" />
              תצוגה מקדימה - {generatedSkus.length} וריאנטים
            </h4>
            
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
                  {generatedSkus.map((sku, index) => (
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
                        {sku.price === null ? (
                          <span className={styles.inheritPrice}>₪{basePrice.toFixed(2)}</span>
                        ) : (
                          `₪${sku.price?.toFixed(2)}`
                        )}
                      </td>
                      <td>{sku.stockQuantity}</td>
                      <td>
                        <span className={sku.isActive ? styles.statusActive : styles.statusInactive}>
                          {sku.isActive ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* כפתורי פעולה */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            ביטול
          </button>
          <button
            type="button"
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={!isValid}
          >
            <Icon name="Plus" />
            צור {combinations.length} וריאנטים
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AutoFillModal;
