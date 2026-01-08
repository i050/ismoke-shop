/**
 * ColorGroupedView Component
 * ==========================
 * התצוגה הראשית המקובצת לפי צבע
 * מנהלת את כל הפאנלים של הצבעים ומתרגמת בין המודל השטוח לקבוצות
 * 
 * 🆕 תמיכה בבחירת סוג וריאנט משני (מידה/התנגדות/ניקוטין וכו')
 *    הציר הראשי תמיד צבע, הציר המשני נבחר מתוך מאפייני הסינון
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { SKUFormData } from '../../../../../../../schemas/productFormSchema';
import { 
  groupSkusByColor, 
  flattenColorGroups, 
  createNewColorGroup,
  addSizeToColorGroup,
  type ColorGroup 
} from '../utils/skuGrouping';
import ColorPanel from './ColorPanel';
import AddColorModal from './AddColorModal';
import AddVariantDialog from './AddVariantDialog';
import { Icon } from '../../../../../../ui/Icon';
import ConfirmDialog from '../../../../../../ui/ConfirmDialog';
import { FilterAttributeService, type FilterAttribute } from '../../../../../../../services/filterAttributeService';
import type { SecondaryVariantConfig, NewColorData } from './types';
import styles from './ColorGroupedView.module.css';

// Re-export types for external use
export type { SecondaryVariantConfig, NewColorData } from './types';

interface ColorGroupedViewProps {
  /** רשימת SKUs שטוחה (מ-form state) */
  value: SKUFormData[];
  /** callback לעדכון הרשימה השטוחה */
  onChange: (skus: SKUFormData[]) => void;
  /** מחיר בסיס מהמוצר */
  basePrice: number;
  /** שם המוצר (ל-SKU generation) */
  productName?: string;
  /** מאפיין ציר משני נבחר - null = ללא תת-וריאנט (רק צבעים) */
  secondaryAttribute?: string | null;
  /** callback לשינוי הציר המשני */
  onSecondaryAttributeChange?: (attributeKey: string | null) => void;
  /** האם מושבת */
  disabled?: boolean;
  /** callback להעלאת תמונות */
  onUploadImages?: (files: File[], sku: string) => Promise<any[]>;
}

// ============================================================================
// Constants
// ============================================================================

/** מידות ברירת מחדל (fallback אם אין מאפיין מוגדר) */
const DEFAULT_SIZE_VALUES = [
  { value: 'XS', displayName: 'XS' },
  { value: 'S', displayName: 'S' },
  { value: 'M', displayName: 'M' },
  { value: 'L', displayName: 'L' },
  { value: 'XL', displayName: 'XL' },
  { value: 'XXL', displayName: 'XXL' },
];

// ============================================================================
// Component
// ============================================================================

const ColorGroupedView: React.FC<ColorGroupedViewProps> = ({
  value,
  onChange,
  basePrice,
  productName = '',
  secondaryAttribute = null, // ברירת מחדל: ללא תת-וריאנט
  onSecondaryAttributeChange,
  disabled = false,
  onUploadImages,
}) => {
  // 🆕 State למאפייני סינון
  const [filterAttributes, setFilterAttributes] = useState<FilterAttribute[]>([]);
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(true);
  
  // 🆕 State לאזהרת שינוי ציר משני
  const [showChangeWarning, setShowChangeWarning] = useState(false);
  const [pendingAttributeChange, setPendingAttributeChange] = useState<string | null>(null);
  
  // State קיים
  const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [deletingColorIndex, setDeletingColorIndex] = useState<number | null>(null);
  const [addingSizeToColorIndex, setAddingSizeToColorIndex] = useState<number | null>(null);
  const [newSizeValue, setNewSizeValue] = useState('');

  // 🆕 טעינת מאפייני סינון (חד-פעמית)
  useEffect(() => {
    const loadAttributes = async () => {
      try {
        setIsLoadingAttributes(true);
        const attrs = await FilterAttributeService.getAllAttributes();
        // סינון - לא להציג את מאפיין "צבע" כי הוא הציר הראשי
        const filteredAttrs = attrs.filter(a => a.key !== 'color');
        setFilterAttributes(filteredAttrs);
      } catch (error) {
        console.error('Failed to load filter attributes:', error);
        // Fallback - שימוש בברירת מחדל
        setFilterAttributes([]);
      } finally {
        setIsLoadingAttributes(false);
      }
    };
    loadAttributes();
  }, []);

  // 🆕 קבלת הגדרות הציר המשני הנבחר
  const secondaryConfig = useMemo((): SecondaryVariantConfig | null => {
    // אם אין ציר משני - null (רק צבעים)
    if (!secondaryAttribute) {
      return null;
    }
    
    const selectedAttr = filterAttributes.find(a => a.key === secondaryAttribute);
    
    if (selectedAttr && selectedAttr.values && selectedAttr.values.length > 0) {
      return {
        attributeKey: selectedAttr.key,
        attributeName: selectedAttr.name,
        values: selectedAttr.values,
      };
    }
    
    // Fallback לברירת מחדל - מידה
    return {
      attributeKey: 'size',
      attributeName: 'מידה',
      values: DEFAULT_SIZE_VALUES,
    };
  }, [filterAttributes, secondaryAttribute]);

  // 🆕 רשימת מאפיינים זמינים לבחירה (לא כולל צבע)
  const availableAttributes = useMemo(() => {
    return filterAttributes.filter(a => 
      a.key !== 'color' && // לא צבע - הוא הציר הראשי
      a.values && a.values.length > 0 // רק מאפיינים עם ערכים
    );
  }, [filterAttributes]);

  // Transform flat SKUs to color groups
  const colorGroups = useMemo(() => groupSkusByColor(value), [value]);

  // Get existing color names
  const existingColors = useMemo(() => 
    colorGroups.map(g => g.colorName),
    [colorGroups]
  );

  // Toggle panel expansion
  const toggleExpand = useCallback((colorName: string) => {
    setExpandedColors(prev => {
      const next = new Set(prev);
      if (next.has(colorName)) {
        next.delete(colorName);
      } else {
        next.add(colorName);
      }
      return next;
    });
  }, []);

  // Expand all
  const expandAll = useCallback(() => {
    setExpandedColors(new Set(colorGroups.map(g => g.colorName)));
  }, [colorGroups]);

  // Collapse all
  const collapseAll = useCallback(() => {
    setExpandedColors(new Set());
  }, []);

  // Update a specific color group and sync back to flat SKUs
  const handleUpdateColorGroup = useCallback((index: number, updatedGroup: ColorGroup) => {
    const newGroups = [...colorGroups];
    newGroups[index] = updatedGroup;
    
    // Flatten back to SKUs and update form
    const flatSkus = flattenColorGroups(newGroups);
    onChange(flatSkus);
  }, [colorGroups, onChange]);

  // Delete a color (all its sizes)
  const handleDeleteColor = useCallback((index: number) => {
    setDeletingColorIndex(index);
  }, []);

  // Confirm color deletion
  const confirmDeleteColor = useCallback(() => {
    if (deletingColorIndex !== null) {
      const newGroups = colorGroups.filter((_, i) => i !== deletingColorIndex);
      const flatSkus = flattenColorGroups(newGroups);
      onChange(flatSkus);
      setDeletingColorIndex(null);
    }
  }, [deletingColorIndex, colorGroups, onChange]);

  // Add new color
  const handleAddColor = useCallback((data: NewColorData) => {
    // יצירת prefix עבור SKU מהשם (transliteration פשוטה)
    const skuPrefix = productName
      .toUpperCase()
      .replace(/\s+/g, '-')
      .replace(/[^A-Z0-9-]/g, '')
      .substring(0, 20) || 'SKU';
    
    // איסוף כל ה-SKUs הקיימים לחישוב מספר שוטף
    const existingSkus = flattenColorGroups(colorGroups);
    
    const newGroup = createNewColorGroup(
      data.colorName,
      data.selectedSizes,
      skuPrefix,
      existingSkus,
      {
        colorHex: data.colorHex,
        basePrice: data.basePrice,
        initialQuantity: data.initialQuantity,
        colorFamily: data.colorFamily,
      }
    );

    const newGroups = [...colorGroups, newGroup];
    const flatSkus = flattenColorGroups(newGroups);
    onChange(flatSkus);

    // Expand the new color panel
    setExpandedColors(prev => new Set([...prev, data.colorName]));
    setShowAddColorModal(false);
  }, [colorGroups, productName, onChange]);

  // Start adding size to color
  const handleStartAddSize = useCallback((colorIndex: number) => {
    setAddingSizeToColorIndex(colorIndex);
    setNewSizeValue('');
  }, []);

  // Confirm add size
  const handleConfirmAddSize = useCallback((valueToAdd?: string) => {
    // אם הערך הועבר כפרמטר (מהדיאלוג החדש) - נשתמש בו
    // אחרת נשתמש ב-state הישן
    const sizeValue = valueToAdd || newSizeValue.trim();
    
    if (addingSizeToColorIndex !== null && sizeValue) {
      const group = colorGroups[addingSizeToColorIndex];
      
      // יצירת קוד SKU ייחודי
      const existingSkus = flattenColorGroups(colorGroups);
      const existingNumbers = existingSkus
        .map(s => {
          const match = s.sku.match(/-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n) && n > 0);
      const nextNumber = existingNumbers.length > 0 
        ? Math.max(...existingNumbers) + 1 
        : 1;
      const skuPrefix = productName
        .toUpperCase()
        .replace(/\s+/g, '-')
        .replace(/[^A-Z0-9-]/g, '')
        .substring(0, 20) || 'SKU';
      const skuCode = `${skuPrefix}-${String(nextNumber).padStart(3, '0')}`;
      
      const updatedGroup = addSizeToColorGroup(
        group,
        sizeValue,
        skuCode,
        { basePrice, initialQuantity: 0 }
      );
      handleUpdateColorGroup(addingSizeToColorIndex, updatedGroup);
      setAddingSizeToColorIndex(null);
      setNewSizeValue('');
    }
  }, [addingSizeToColorIndex, newSizeValue, colorGroups, productName, basePrice, handleUpdateColorGroup]);

  // Calculate totals
  const totalStock = useMemo(() => 
    colorGroups.reduce((sum, g) => sum + g.totalStock, 0),
    [colorGroups]
  );

  const totalVariants = useMemo(() => 
    colorGroups.reduce((sum, g) => sum + g.sizes.length, 0),
    [colorGroups]
  );

  // 🆕 קבלת ערכים זמינים עבור צבע מסוים (לפי הציר המשני)
  const getAvailableValuesForColor = useCallback((colorIndex: number) => {
    // אם אין ציר משני - לא רלוונטי
    if (!secondaryConfig) return [];
    
    const group = colorGroups[colorIndex];
    const existingValues = group.sizes.map(s => s.size);
    
    // מיפוי הערכים מהקונפיג - כל ערך הוא אובייקט עם value ו-displayName
    // הסרת כפילויות באמצעות Set
    const allValueStrings = [...new Set(secondaryConfig.values.map(v => v.value))];
    
    // סינון ערכים שכבר קיימים בצבע זה
    const available = allValueStrings.filter(v => !existingValues.includes(v));
    
    return available;
  }, [colorGroups, secondaryConfig]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h3 className={styles.title}>
            <Icon name="Palette" size={20} />
            ניהול לפי צבעים
          </h3>
          <div className={styles.stats}>
            <span className={styles.statBadge}>
              {colorGroups.length} צבעים
            </span>
            <span className={styles.statBadge}>
              {totalVariants} וריאציות
            </span>
            <span className={styles.statBadge}>
              {totalStock} יח׳ במלאי
            </span>
          </div>
        </div>

        {/* 🆕 בורר סוג וריאנט משני */}
        <div className={styles.attributeSelector}>
          <label className={styles.attributeLabel}>
            סוג וריאנט:
          </label>
          {isLoadingAttributes ? (
            <span className={styles.loadingText}>טוען...</span>
          ) : (
            <select
              className={styles.attributeSelect}
              value={secondaryAttribute || ''}
              onChange={(e) => {
                const newValue = e.target.value || null;
                // אם יש SKUs קיימים - הצג אזהרה
                if (value.length > 0 && newValue !== secondaryAttribute) {
                  setPendingAttributeChange(newValue);
                  setShowChangeWarning(true);
                } else {
                  onSecondaryAttributeChange?.(newValue);
                }
              }}
              disabled={disabled || availableAttributes.length === 0}
              title="בחר את סוג הווריאנט המשני (מידה, התנגדות, ניקוטין וכו') או ללא"
            >
              {/* 🆕 אופציית ללא תת-וריאנט */}
              <option value="">ללא תת-וריאנט (רק צבעים)</option>
              {/* אופציית ברירת מחדל - מידה */}
              <option value="size">מידה</option>
              {/* מאפיינים מהמערכת (לא כולל צבע ומידה כבר יש) */}
              {availableAttributes
                .filter(attr => attr.key !== 'size') // מידה כבר יש
                .map(attr => (
                  <option key={attr._id} value={attr.key}>
                    {attr.icon && `${attr.icon} `}{attr.name}
                  </option>
                ))
              }
            </select>
          )}
        </div>

        <div className={styles.headerActions}>
          {colorGroups.length > 0 && (
            <>
              <button
                type="button"
                className={styles.expandButton}
                onClick={expandAll}
                disabled={disabled}
                title="פתח הכל"
              >
                <Icon name="ChevronsDown" size={16} />
              </button>
              <button
                type="button"
                className={styles.expandButton}
                onClick={collapseAll}
                disabled={disabled}
                title="סגור הכל"
              >
                <Icon name="ChevronsUp" size={16} />
              </button>
            </>
          )}
          <button
            type="button"
            className={styles.addColorButton}
            onClick={() => setShowAddColorModal(true)}
            disabled={disabled}
          >
            <Icon name="Plus" size={16} />
            הוסף צבע
          </button>
        </div>
      </div>

      {/* Color Panels */}
      {colorGroups.length > 0 ? (
        <div className={styles.panelsList}>
          {colorGroups.map((group, index) => (
            <ColorPanel
              key={`${group.colorName}-${index}`}
              colorGroup={group}
              isExpanded={expandedColors.has(group.colorName)}
              onToggleExpand={() => toggleExpand(group.colorName)}
              onUpdate={(updated) => handleUpdateColorGroup(index, updated)}
              onDeleteColor={() => handleDeleteColor(index)}
              onAddSize={() => handleStartAddSize(index)}
              onUploadImages={onUploadImages}
              basePrice={basePrice}
              disabled={disabled}              secondaryConfig={secondaryConfig}            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Icon name="Palette" size={48} />
          <h4>אין צבעים עדיין</h4>
          <p>התחל בהוספת צבע ראשון למוצר</p>
          <button
            type="button"
            className={styles.emptyAddButton}
            onClick={() => setShowAddColorModal(true)}
            disabled={disabled}
          >
            <Icon name="Plus" size={18} />
            הוסף צבע ראשון
          </button>
        </div>
      )}

      {/* Add Color Modal */}
      <AddColorModal
        isOpen={showAddColorModal}
        onClose={() => setShowAddColorModal(false)}
        onSubmit={handleAddColor}
        secondaryConfig={secondaryConfig}
        basePrice={basePrice}
        existingColors={existingColors}
      />

      {/* Delete Color Confirmation */}
      <ConfirmDialog
        isOpen={deletingColorIndex !== null}
        title="מחיקת צבע"
        message={`האם למחוק את הצבע "${
          deletingColorIndex !== null ? colorGroups[deletingColorIndex]?.colorName : ''
        }"${secondaryConfig ? ` וכל ${
          deletingColorIndex !== null ? colorGroups[deletingColorIndex]?.sizes.length : 0
        } ה${secondaryConfig.attributeName}ות שלו` : ''}?`}
        confirmText="מחק הכל"
        cancelText="ביטול"
        variant="danger"
        onConfirm={confirmDeleteColor}
        onCancel={() => setDeletingColorIndex(null)}
      />

      {/* Add Size Dialog - רק אם יש ציר משני */}
      {secondaryConfig && (
        <AddVariantDialog
          isOpen={addingSizeToColorIndex !== null}
          variantName={secondaryConfig.attributeName}
          colorName={
            addingSizeToColorIndex !== null
              ? colorGroups[addingSizeToColorIndex]?.colorName
              : ''
          }
          availableValues={
            addingSizeToColorIndex !== null
              ? getAvailableValuesForColor(addingSizeToColorIndex)
              : []
          }
          onConfirm={(value) => {
            handleConfirmAddSize(value);
          }}
          onCancel={() => {
            setAddingSizeToColorIndex(null);
            setNewSizeValue('');
          }}
        />
      )}

      {/* 🆕 אזהרת שינוי ציר משני */}
      <ConfirmDialog
        isOpen={showChangeWarning}
        title="שינוי סוג וריאנט"
        message={`⚠️ שים לב! יש לך ${value.length} SKUs קיימים.
        
שינוי סוג הוריאנט ימחק את כל ה-SKUs הקיימים ויאפשר לך להתחיל מחדש עם המבנה החדש.

האם אתה בטוח שברצונך להמשיך?`}
        confirmText="כן, מחק והמשך"
        cancelText="ביטול"
        variant="danger"
        onConfirm={() => {
          // מחיקת כל ה-SKUs
          onChange([]);
          // עדכון הציר המשני
          onSecondaryAttributeChange?.(pendingAttributeChange);
          // סגירת הדיאלוג
          setShowChangeWarning(false);
          setPendingAttributeChange(null);
        }}
        onCancel={() => {
          setShowChangeWarning(false);
          setPendingAttributeChange(null);
        }}
      />
    </div>
  );
};

export default ColorGroupedView;
