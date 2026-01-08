/**
 * AddColorModal Component
 * =======================
 * מודאל להוספת צבע חדש עם בחירת מידות וכמות התחלתית
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Modal from '../../../../../../ui/Modal';
import { Icon } from '../../../../../../ui/Icon';
import type { SecondaryVariantConfig, NewColorData } from './types';
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
const DEFAULT_COLORS = [
  { name: 'שחור', hex: '#000000' },
  { name: 'לבן', hex: '#FFFFFF' },
  { name: 'אדום', hex: '#EF4444' },
  { name: 'כחול', hex: '#3B82F6' },
  { name: 'ירוק', hex: '#22C55E' },
  { name: 'צהוב', hex: '#EAB308' },
  { name: 'כתום', hex: '#F97316' },
  { name: 'סגול', hex: '#A855F7' },
  { name: 'ורוד', hex: '#EC4899' },
  { name: 'אפור', hex: '#6B7280' },
  { name: 'בז\'', hex: '#D4A373' },
  { name: 'חום', hex: '#78350F' },
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
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [initialQuantity, setInitialQuantity] = useState(10);
  const [price, setPrice] = useState(basePrice);
  const [showCustomColor, setShowCustomColor] = useState(false);

  // Reset form when modal opens
  const handleOpen = useCallback(() => {
    setColorName('');
    setColorHex('#000000');
    setSelectedSizes([]);
    setInitialQuantity(10);
    setPrice(basePrice);
    setShowCustomColor(false);
  }, [basePrice]);

  // Call handleOpen when modal opens
  useEffect(() => {
    if (isOpen) {
      handleOpen();
    }
  }, [isOpen, handleOpen]);

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

  // Quick color selection
  const selectQuickColor = useCallback((color: { name: string; hex: string }) => {
    setColorName(color.name);
    setColorHex(color.hex);
    setShowCustomColor(false);
  }, []);

  // Form validation - 🆕 אם אין ציר משני, לא צריך מידות
  const isValid = useMemo(() => 
    colorName.trim().length > 0 &&
    (hasSecondaryVariant ? selectedSizes.length > 0 : true) &&
    !colorExists,
    [colorName, selectedSizes, colorExists, hasSecondaryVariant]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!isValid) return;

    onSubmit({
      colorName: colorName.trim(),
      colorHex,
      selectedSizes,
      initialQuantity,
      basePrice: price,
    });

    onClose();
  }, [isValid, colorName, colorHex, selectedSizes, initialQuantity, price, onSubmit, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="הוספת צבע חדש"
      size="medium"
    >
      <div className={styles.content}>
        {/* Color Selection */}
        <div className={styles.section}>
          <label className={styles.label}>בחר צבע</label>
          
          {/* Quick Color Buttons */}
          <div className={styles.quickColors}>
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color.hex}
                type="button"
                className={`${styles.quickColorButton} ${
                  colorName === color.name ? styles.selected : ''
                } ${existingColors.includes(color.name) ? styles.disabled : ''}`}
                style={{ backgroundColor: color.hex }}
                onClick={() => !existingColors.includes(color.name) && selectQuickColor(color)}
                disabled={existingColors.includes(color.name)}
                title={existingColors.includes(color.name) ? `${color.name} (קיים)` : color.name}
              >
                {colorName === color.name && (
                  <Icon name="Check" size={14} className={styles.checkIcon} />
                )}
              </button>
            ))}
            <button
              type="button"
              className={`${styles.customColorButton} ${showCustomColor ? styles.selected : ''}`}
              onClick={() => setShowCustomColor(!showCustomColor)}
              title="צבע מותאם"
            >
              <Icon name="Palette" size={16} />
            </button>
          </div>

          {/* Custom Color Input */}
          {showCustomColor && (
            <div className={styles.customColorSection}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>שם הצבע</label>
                <input
                  type="text"
                  className={styles.input}
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="לדוגמה: טורקיז"
                  autoFocus
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>קוד צבע</label>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  title="בחר צבע"
                />
              </div>
            </div>
          )}

          {/* Selected Color Display */}
          {colorName && (
            <div className={styles.selectedColorDisplay}>
              <span 
                className={styles.colorPreview} 
                style={{ backgroundColor: colorHex }}
              />
              <span className={styles.colorLabel}>{colorName}</span>
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
                  value={price}
                  onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
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
