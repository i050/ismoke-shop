/**
 * ColorPanel Component
 * ====================
 * פאנל אקורדיון לצבע בודד
 * מציג: כותרת עם שם צבע ומלאי, תמונות משותפות, טבלת מידות
 */

import React, { useState, useCallback } from 'react';
import type { ColorGroup, ColorSizeEntry } from '../utils/skuGrouping';
import { updateSizeInColorGroup, removeSizeFromColorGroup, fillAllSizesInColorGroup } from '../utils/skuGrouping';
import SizeRow from './SizeRow';
import ImageGalleryManager, { type ImageObject } from '../../../../../../ui/ImageGalleryManager';
import { Icon } from '../../../../../../ui/Icon';
import ConfirmDialog from '../../../../../../ui/ConfirmDialog';
import type { SecondaryVariantConfig } from './types';
import styles from './ColorPanel.module.css';

// ============================================================================
// Props Interface
// ============================================================================

interface ColorPanelProps {
  /** נתוני קבוצת הצבע */
  colorGroup: ColorGroup;
  /** האם הפאנל פתוח */
  isExpanded: boolean;
  /** callback לפתיחה/סגירה */
  onToggleExpand: () => void;
  /** callback לעדכון הקבוצה */
  onUpdate: (updatedGroup: ColorGroup) => void;
  /** callback למחיקת הצבע כולו */
  onDeleteColor: () => void;
  /** callback להוספת מידה חדשה */
  onAddSize: () => void;
  /** callback להעלאת תמונות */
  onUploadImages?: (files: File[], sku: string) => Promise<any[]>;
  /** מחיר בסיס (להצגה) */
  basePrice: number;
  /** האם מושבת */
  disabled?: boolean;
  /** הגדרות הוריאנט המשני (null = ללא תת-וריאנט) */
  secondaryConfig?: SecondaryVariantConfig | null;
}

// ============================================================================
// Component
// ============================================================================

const ColorPanel: React.FC<ColorPanelProps> = ({
  colorGroup,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDeleteColor,
  onAddSize,
  onUploadImages,
  basePrice,
  disabled = false,
  secondaryConfig,
}) => {
  // 🆕 האם יש ציר משני
  const hasSecondaryVariant = secondaryConfig !== null;
  
  // ברירת מחדל ל-secondaryConfig
  const variantConfig = secondaryConfig || {
    attributeKey: 'size',
    attributeName: 'מידה',
    values: []
  };
  // State לדיאלוגים
  const [deletingSizeIndex, setDeletingSizeIndex] = useState<number | null>(null);
  const [showFillAllDialog, setShowFillAllDialog] = useState(false);
  const [fillAllQuantity] = useState<number>(10);

  // Handler לעדכון שדה במידה
  const handleUpdateSize = useCallback((sizeIndex: number, field: keyof ColorSizeEntry, value: any) => {
    const updated = updateSizeInColorGroup(colorGroup, sizeIndex, field, value);
    onUpdate(updated);
  }, [colorGroup, onUpdate]);

  // Handler למחיקת מידה
  const handleDeleteSize = useCallback((sizeIndex: number) => {
    setDeletingSizeIndex(sizeIndex);
  }, []);

  // אישור מחיקת מידה
  const handleConfirmDeleteSize = useCallback(() => {
    if (deletingSizeIndex !== null) {
      const updated = removeSizeFromColorGroup(colorGroup, deletingSizeIndex);
      onUpdate(updated);
      setDeletingSizeIndex(null);
    }
  }, [deletingSizeIndex, colorGroup, onUpdate]);

  // Handler לעדכון תמונות - מקבל ImageObject[] ומעדכן
  const handleImagesChange = useCallback((newImages: ImageObject[]) => {
    onUpdate({
      ...colorGroup,
      // Cast נדרש כי ה-SKUFormData images type שונה
      images: newImages as unknown as ColorGroup['images'],
    });
  }, [colorGroup, onUpdate]);

  // Handler ל"מלא הכל"
  const handleFillAll = useCallback(() => {
    const updated = fillAllSizesInColorGroup(colorGroup, fillAllQuantity);
    onUpdate(updated);
    setShowFillAllDialog(false);
  }, [colorGroup, fillAllQuantity, onUpdate]);

  // צבע להצגה בתג
  const colorStyle = colorGroup.colorHex 
    ? { backgroundColor: colorGroup.colorHex } 
    : undefined;

  return (
    <div className={`${styles.panel} ${isExpanded ? styles.expanded : ''}`}>
      {/* כותרת הפאנל */}
      <button
        type="button"
        className={styles.header}
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        disabled={disabled}
      >
        {/* אינדיקטור צבע */}
        <div className={styles.colorIndicator}>
          {colorGroup.colorHex ? (
            <span className={styles.colorSwatch} style={colorStyle} />
          ) : (
            <span className={styles.colorIcon}>🎨</span>
          )}
          <span className={styles.colorName}>{colorGroup.colorName}</span>
        </div>

        {/* סטטיסטיקות */}
        <div className={styles.stats}>
          {hasSecondaryVariant && (
            <span className={styles.statItem}>
              <Icon name="Grid3x3" size={14} />
              {colorGroup.sizes.length} {variantConfig.attributeName}ים
            </span>
          )}
          <span className={styles.statItem}>
            <Icon name="Package" size={14} />
            {colorGroup.totalStock} יח׳
          </span>
        </div>

        {/* חץ פתיחה/סגירה */}
        <span className={`${styles.arrow} ${isExpanded ? styles.arrowUp : ''}`}>
          <Icon name="ChevronDown" size={20} />
        </span>
      </button>

      {/* תוכן הפאנל */}
      {isExpanded && (
        <div className={styles.content}>
          {/* אזור תמונות */}
          <div className={styles.imagesSection}>
            <h4 className={styles.sectionTitle}>
              <Icon name="Image" size={16} />
              תמונות לצבע זה
            </h4>
            <p className={styles.sectionHint}>
              תמונות אלו יוצגו לכל המידות של הצבע
            </p>
            <ImageGalleryManager
              mode="inline"
              images={(colorGroup.images || []) as unknown as ImageObject[]}
              onChange={handleImagesChange}
              onUpload={onUploadImages ? (files: File[]) => onUploadImages(files, colorGroup.sizes[0]?.sku || 'temp') : undefined}
              maxImages={10}
              deleteMode="immediate"
              allowReorder={true}
              showPrimaryBadge={true}
            />
          </div>

          {/* טבלת מידות/וריאנטים - או SKU יחיד אם אין ציר משני */}
          <div className={styles.sizesSection}>
            {hasSecondaryVariant ? (
              <>
                {/* כותרת סקשן - רק אם יש ציר משני */}
                <div className={styles.sizesSectionHeader}>
                  <h4 className={styles.sectionTitle}>
                    <Icon name="List" size={16} />
                    {variantConfig.attributeName}ים ומלאי
                  </h4>
                  <div className={styles.sizeActions}>
                    <button
                      type="button"
                      className={styles.fillAllButton}
                      onClick={() => setShowFillAllDialog(true)}
                      disabled={disabled || colorGroup.sizes.length === 0}
                      title={`מלא כמות אחידה לכל ה${variantConfig.attributeName}ים`}
                    >
                      <Icon name="Edit" size={14} />
                      מלא הכל
                    </button>
                    <button
                      type="button"
                      className={styles.addSizeButton}
                      onClick={onAddSize}
                      disabled={disabled}
                    >
                      <Icon name="Plus" size={14} />
                      הוסף {variantConfig.attributeName}
                    </button>
                    <button
                      type="button"
                      className={styles.addSizeButton}
                      onClick={onAddSize}
                      disabled={disabled}
                    >
                      <Icon name="Plus" size={14} />
                      הוסף {variantConfig.attributeName}
                    </button>
                  </div>
                </div>

                {colorGroup.sizes.length > 0 ? (
                  <div className={styles.tableWrapper}>
                    <table className={styles.sizesTable}>
                      <thead>
                        <tr>
                          <th>{variantConfig.attributeName}</th>
                          <th>קוד SKU</th>
                          <th>מלאי</th>
                          <th>מחיר</th>
                          <th>סטטוס</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {colorGroup.sizes.map((size, index) => (
                          <SizeRow
                            key={`${size.sku}-${index}`}
                            size={size}
                            index={index}
                            onUpdate={(field, value) => handleUpdateSize(index, field, value)}
                            onDelete={() => handleDeleteSize(index)}
                            disabled={disabled}
                            basePrice={basePrice}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.noSizes}>
                    <Icon name="AlertCircle" size={24} />
                    <p>אין {variantConfig.attributeName}ים עדיין. לחץ "הוסף {variantConfig.attributeName}" להתחלה.</p>
                  </div>
                )}
              </>
            ) : (
              /* 🆕 מקרה ללא ציר משני - SKU יחיד לצבע */
              colorGroup.sizes.length > 0 && (
                <div className={styles.singleSkuSection}>
                  <h4 className={styles.sectionTitle}>
                    <Icon name="Package" size={16} />
                    פרטי מלאי
                  </h4>
                  <div className={styles.tableWrapper}>
                    <table className={styles.sizesTable}>
                      <thead>
                        <tr>
                          <th>קוד SKU</th>
                          <th>מלאי</th>
                          <th>מחיר</th>
                          <th>סטטוס</th>
                        </tr>
                      </thead>
                      <tbody>
                        <SizeRow
                          key={colorGroup.sizes[0].sku}
                          size={colorGroup.sizes[0]}
                          index={0}
                          onUpdate={(field, value) => handleUpdateSize(0, field, value)}
                          onDelete={() => handleDeleteSize(0)}
                          disabled={disabled}
                          basePrice={basePrice}
                          hideSize={true}
                        />
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}
          </div>

          {/* כפתור מחיקת צבע */}
          <div className={styles.dangerZone}>
            <button
              type="button"
              className={styles.deleteColorButton}
              onClick={onDeleteColor}
              disabled={disabled}
            >
              <Icon name="Trash2" size={16} />
              מחק צבע זה
            </button>
          </div>
        </div>
      )}

      {/* דיאלוג מחיקת מידה */}
      <ConfirmDialog
        isOpen={deletingSizeIndex !== null}
        title={`מחיקת ${variantConfig.attributeName}`}
        message={`האם למחוק את ה${variantConfig.attributeName} "${
          deletingSizeIndex !== null ? colorGroup.sizes[deletingSizeIndex]?.size : ''
        }" מהצבע ${colorGroup.colorName}?`}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
        onConfirm={handleConfirmDeleteSize}
        onCancel={() => setDeletingSizeIndex(null)}
      />

      {/* דיאלוג "מלא הכל" - שימוש ב-info variant */}
      <ConfirmDialog
        isOpen={showFillAllDialog}
        title="מילוי מלאי אחיד"
        message={`הזן כמות למילוי בכל ${colorGroup.sizes.length} ה${variantConfig.attributeName}ים של צבע ${colorGroup.colorName}. כמות נוכחית: ${fillAllQuantity}`}
        confirmText="מלא הכל"
        cancelText="ביטול"
        variant="info"
        onConfirm={handleFillAll}
        onCancel={() => setShowFillAllDialog(false)}
      />
    </div>
  );
};

export default ColorPanel;
