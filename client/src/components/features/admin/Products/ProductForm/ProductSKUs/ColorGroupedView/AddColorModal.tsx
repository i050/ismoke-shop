/**
 * AddColorModal Component
 * =======================
 * מודאל להוספת צבע חדש עם בחירת מידות וכמות התחלתית
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Modal from '../../../../../../ui/Modal';
import { Icon } from '../../../../../../ui/Icon';
import type { SecondaryVariantConfig, NewColorData } from './types';
import { FilterAttributeService } from '../../../../../../../services/filterAttributeService';
import styles from './AddColorModal.module.css';

// Re-export types for backwards compatibility
export type { NewColorData } from './types';

interface AddColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewColorData) => void;
  /** הגדרות הוריאנט המשני (null = ללא תת-וריאנט) */
  secondaryConfig?: SecondaryVariantConfig | null;
  /** מחיר בסיס מהמוצר */
  basePrice: number;
  /** צבעים קיימים (למניעת כפילות) */
  existingColors: string[];
  /** האם בטעינה */
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// 🔄 Fallback - רשימת צבעים בסיסית במקרה שהשרת לא זמין
// בפועל, הצבעים נטענים דינמית מהשרת
const FALLBACK_COLORS = [
  { name: 'שחור', hex: '#000000', family: 'black' },
  { name: 'לבן', hex: '#FFFFFF', family: 'white' },
  { name: 'אדום', hex: '#EF4444', family: 'red' },
  { name: 'כחול', hex: '#3B82F6', family: 'blue' },
  { name: 'ירוק', hex: '#22C55E', family: 'green' },
  { name: 'צהוב', hex: '#EAB308', family: 'yellow' },
  { name: 'כתום', hex: '#F97316', family: 'orange' },
  { name: 'סגול', hex: '#A855F7', family: 'purple' },
  { name: 'ורוד', hex: '#EC4899', family: 'pink' },
  { name: 'אפור', hex: '#6B7280', family: 'gray' },
  { name: 'בז\'', hex: '#D4A373', family: 'brown' },
  { name: 'חום', hex: '#78350F', family: 'brown' },
];

// ============================================================================
// Component
// ============================================================================

const AddColorModal: React.FC<AddColorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  secondaryConfig,
  basePrice,
  existingColors,
  isLoading = false,
}) => {
  // 🆕 טעינת משפחות צבעים מהשרת (רק משפחות - לא variants)
  const [colorFamilies, setColorFamilies] = useState<Array<{
    family: string;
    displayName: string;
    representativeHex: string;
  }>>([]);
  const [loadingColors, setLoadingColors] = useState(false);
  
  // 🆕 האם יש ציר משני (אם לא - רק צבעים)
  const hasSecondaryVariant = secondaryConfig !== null;
  
  // variantConfig - רק אם יש ציר משני
  const variantConfig = secondaryConfig || {
    attributeKey: 'size',
    attributeName: 'מידה',
    values: DEFAULT_SIZES.map(s => ({ value: s }))
  };
  
  // Form state
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#000000');
  const [selectedColorFamily, setSelectedColorFamily] = useState<string | undefined>(undefined); // 🆕 משפחת הצבע שנבחרה
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [initialQuantity, setInitialQuantity] = useState(10);
  const [price, setPrice] = useState<number | null>(null);

  // Reset form when modal opens
  const handleOpen = useCallback(() => {
    setColorName('');
    setColorHex('#000000');
    setSelectedColorFamily(undefined);
    setSelectedSizes([]);
    setInitialQuantity(10);
    setPrice(null);
  }, []);

  // Call handleOpen when modal opens
  useEffect(() => {
    if (isOpen) {
      handleOpen();
    }
  }, [isOpen, handleOpen]);

  // 🆕 טעינת משפחות צבעים מהשרת בפתיחה ראשונה
  useEffect(() => {
    const loadColorFamilies = async () => {
      // טעינה רק פעם אחת (אם עדיין לא נטענו)
      if (colorFamilies.length > 0) return;
      
      setLoadingColors(true);
      try {
        const families = await FilterAttributeService.getColorFamiliesForAdmin();
        setColorFamilies(families);
        console.log(`✅ Loaded ${families.length} color families from server`);
      } catch (error) {
        console.error('⚠️ Failed to load color families, using fallback:', error);
        // במקרה של כשל - נשתמש ב-fallback
        setColorFamilies([]);
      } finally {
        setLoadingColors(false);
      }
    };

    loadColorFamilies();
  }, []); // טעינה פעם אחת בלבד

  // Available values (from config or fallback to default sizes)
  const valuesToShow = useMemo(() => 
    variantConfig.values.length > 0 
      ? variantConfig.values.map(v => v.value) 
      : DEFAULT_SIZES,
    [variantConfig.values]
  );

  // Check if color already exists
  const colorExists = useMemo(() => 
    existingColors.some(c => c.toLowerCase() === colorName.toLowerCase().trim()),
    [existingColors, colorName]
  );

  // Toggle size selection
  const toggleSize = useCallback((size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  }, []);

  // Select all sizes/values
  const selectAllSizes = useCallback(() => {
    setSelectedSizes([...valuesToShow]);
  }, [valuesToShow]);

  // Clear size selection
  const clearSizes = useCallback(() => {
    setSelectedSizes([]);
  }, []);

  // Quick color selection - הוסר! עכשיו רק בחירה ידנית

  // Form validation - 🆕 גם color וגם colorHex הפכו לאופציונליים!
  // אם המנהל לא בחר - המערכת תיצור אוטומטית על בסיס colorFamily
  const isValid = useMemo(() => 
    selectedColorFamily && // משפחת צבע חובה (לסינון)
    selectedColorFamily.trim().length > 0 &&
    // colorName אופציונלי! אם ריק - ייווצר אוטומטית מ-colorFamily
    // colorHex אופציונלי! אם ריק או לא תקין - ייווצר אוטומטית
    (!colorHex || colorHex === '#000000' || /^#[0-9A-Fa-f]{6}$/.test(colorHex)) &&
    (hasSecondaryVariant ? selectedSizes.length > 0 : true) &&
    (!colorName.trim() || !colorExists), // אם יש שם - בדוק שלא קיים
    [selectedColorFamily, colorName, colorHex, selectedSizes, colorExists, hasSecondaryVariant]
  );

  // Handle submit - 🆕 אם colorName ריק או colorHex ריק - שולח undefined
  const handleSubmit = useCallback(() => {
    if (!isValid) return;

    // אם המנהל לא הזין שם צבע - שולח undefined כדי שהמערכת תיצור אוטומטית
    const finalColorName = colorName.trim() || undefined;
    
    // אם המנהל לא בחר colorHex (נשאר על ברירת המחדל #000000) - שולח undefined
    // כדי שהמערכת תיצור אוטומטית על בסיס colorFamily
    const finalColorHex = (colorHex && colorHex !== '#000000') ? colorHex : undefined;

    onSubmit({
      colorName: finalColorName, // 🆕 יכול להיות undefined
      colorHex: finalColorHex,
      colorFamily: selectedColorFamily, // 🆕 העברת משפחת הצבע שנבחרה
      selectedSizes,
      initialQuantity,
      basePrice: price,
    });

    onClose();
  }, [isValid, colorName, colorHex, selectedColorFamily, selectedSizes, initialQuantity, price, onSubmit, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="הוספת צבע חדש"
      size="medium"
    >
      <div className={styles.content}>
        {/* משפחת צבע (לסינון) - חובה */}
        <div className={styles.section}>
          <label className={styles.label}>
            <Icon name="Filter" size={16} />
            משפחת צבע (לסינון)
            <span className={styles.required}>*</span>
          </label>
          <p className={styles.hint}>
            קובע איך הלקוחות יסננו מוצר זה (לדוגמה: כל הגוונים של כחול יסוננו תחת "כחול")
          </p>
          
          {/* טעינת משפחות צבעים */}
          {loadingColors && (
            <div className={styles.loadingHint}>
              <Icon name="Loader2" size={14} className={styles.spinner} />
              טוען משפחות צבעים...
            </div>
          )}
          
          {/* כפתורי בחירת משפחת צבע */}
          <div className={styles.colorFamilyButtons}>
            {(() => {
              // נורמליזציה של מבנה הנתונים לפורמט אחיד
              const normalizedFamilies = colorFamilies.length > 0 
                ? colorFamilies.map(fam => ({
                    family: fam.family,
                    displayName: fam.displayName,
                    hex: fam.representativeHex
                  }))
                : FALLBACK_COLORS.map(fam => ({
                    family: fam.family,
                    displayName: fam.name,
                    hex: fam.hex
                  }));
              
              return normalizedFamilies.map((family) => (
                <button
                  key={family.family}
                  type="button"
                  className={`${styles.familyButton} ${
                    selectedColorFamily === family.family ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedColorFamily(family.family)}
                  title={family.displayName}
                >
                  <span 
                    className={styles.familyColorDot} 
                    style={{ backgroundColor: family.hex }}
                  />
                  <span className={styles.familyName}>{family.displayName}</span>
                  {selectedColorFamily === family.family && (
                    <Icon name="Check" size={14} className={styles.checkIcon} />
                  )}
                </button>
              ));
            })()}
          </div>
        </div>

        {/* צבע תצוגה (חופשי) - אופציונלי */}
        <div className={styles.section}>
          <label className={styles.label}>
            <Icon name="Palette" size={16} />
            צבע תצוגה
            <span className={styles.optional}> (אופציונלי)</span>
          </label>
          <p className={styles.hint}>
            שם ייחודי לגוון (לדוגמה: "תכלת עננים"). אם תשאיר ריק, ישתמש בשם ברירת המחדל של משפחת הצבע.
          </p>
          
          <div className={styles.displayColorInputs}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>שם הצבע</label>
              <input
                type="text"
                className={styles.input}
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="השאר ריק לשם ברירת מחדל..."
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>קוד צבע (HEX) - אופציונלי</label>
              <div className={styles.colorPickerWrapper}>
                <input
                  type="color"
                  className={styles.colorPicker}
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  title="בחר גוון מדויק"
                />
                <input
                  type="text"
                  className={styles.hexInput}
                  value={colorHex}
                  onChange={(e) => {
                    const hex = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
                      setColorHex(hex);
                    }
                  }}
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
            </div>
          </div>

          {/* תצוגה מקדימה של הצבע */}
          {colorName && (
            <div className={styles.colorPreviewBox}>
              <span 
                className={styles.colorPreview} 
                style={{ backgroundColor: colorHex }}
              />
              <div className={styles.previewInfo}>
                <span className={styles.colorLabel}>{colorName}</span>
                <span className={styles.colorCode}>{colorHex}</span>
              </div>
              {colorExists && (
                <span className={styles.errorTag}>
                  <Icon name="AlertCircle" size={12} />
                  צבע זה כבר קיים
                </span>
              )}
            </div>
          )}
        </div>

        {/* Size/Variant Selection - 🆕 רק אם יש ציר משני */}
        {hasSecondaryVariant && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <label className={styles.label}>בחר {variantConfig.attributeName}ים</label>
            <div className={styles.sizeActions}>
              <button 
                type="button" 
                className={styles.textButton}
                onClick={selectAllSizes}
              >
                בחר הכל
              </button>
              <button 
                type="button" 
                className={styles.textButton}
                onClick={clearSizes}
              >
                נקה
              </button>
            </div>
          </div>

          <div className={styles.sizesGrid}>
            {valuesToShow.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.sizeButton} ${
                  selectedSizes.includes(value) ? styles.sizeSelected : ''
                }`}
                onClick={() => toggleSize(value)}
              >
                {value}
              </button>
            ))}
          </div>

          {selectedSizes.length === 0 && (
            <p className={styles.hint}>בחר לפחות {variantConfig.attributeName} אחד</p>
          )}
        </div>
        )}

        {/* Quantity & Price */}
        <div className={styles.section}>
          <div className={styles.twoColumns}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                {hasSecondaryVariant 
                  ? `כמות התחלתית לכל ${variantConfig.attributeName}`
                  : 'כמות התחלתית'
                }
              </label>
              <input
                type="number"
                className={styles.input}
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                min={0}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>מחיר</label>
              <div className={styles.priceInputWrapper}>
                <input
                  type="number"
                  className={styles.input}
                  value={price ?? ''}
                  onChange={(e) => setPrice(e.target.value === '' ? null : Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder={`₪${basePrice}`}
                  min={0}
                  step="0.01"
                />
                <span className={styles.currency}>₪</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        {isValid && (
          <div className={styles.summary}>
            <Icon name="Info" size={16} />
            <span>
              ייווצרו <strong>{selectedSizes.length}</strong> וריאציות חדשות
              בצבע <strong>{colorName}</strong>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
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
                <span className={styles.spinner} />
                יוצר...
              </>
            ) : (
              <>
                <Icon name="Plus" size={16} />
                הוסף צבע
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddColorModal;
