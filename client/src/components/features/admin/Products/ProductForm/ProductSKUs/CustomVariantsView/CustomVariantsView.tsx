/**
 * CustomVariantsView Component
 * ============================
 * התצוגה הראשית לוריאנטים מותאמים אישית (לא צבעים)
 * מאפשרת למנהל להגדיר וריאנטים כמו טעמים, סוגים וכו'
 * 
 * 🆕 Phase 3: מערכת וריאנטים כפולה
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { SKUFormData } from '../../../../../../../schemas/productFormSchema';
import { Icon } from '../../../../../../ui/Icon';
import ConfirmDialog from '../../../../../../ui/ConfirmDialog';
import { generateSkuFromName } from '../ProductSKUs';
import type { VariantGroup, NewVariantData } from './types';
import AddVariantModal from './AddVariantModal';
import { FilterAttributeService } from '../../../../../../../services/filterAttributeService';
import type { FilterAttribute } from '../../../../../../../services/filterAttributeService';
import styles from './CustomVariantsView.module.css';

// ============================================================================
// Props Interface
// ============================================================================

interface CustomVariantsViewProps {
  /** רשימת SKUs שטוחה (מ-form state) */
  value: SKUFormData[];
  /** callback לעדכון הרשימה השטוחה */
  onChange: (skus: SKUFormData[]) => void;
  /** מחיר בסיס מהמוצר */
  basePrice: number;
  /** מחיר לפני הנחה מהמוצר, להצגת ירושה בגרסאות */
  productCompareAtPrice?: number | null;
  /** שם המוצר (ל-SKU generation) */
  productName?: string;
  /** תווית הוריאנט הראשי */
  primaryVariantLabel?: string;
  /** callback לשינוי תווית ראשית */
  onPrimaryVariantLabelChange?: (label: string) => void;
  /** תווית הוריאנט המשני */
  secondaryVariantLabel?: string;
  /** callback לשינוי תווית משנית */
  onSecondaryVariantLabelChange?: (label: string) => void;
  /** מאפיין סינון ראשי */
  primaryFilterAttribute?: string;
  /** callback לשינוי מאפיין סינון ראשי */
  onPrimaryFilterAttributeChange?: (attr: string) => void;
  /** מאפיין סינון משני */
  secondaryFilterAttribute?: string;
  /** callback לשינוי מאפיין סינון משני */
  onSecondaryFilterAttributeChange?: (attr: string) => void;
  /** האם מושבת */
  disabled?: boolean;
  /** callback להעלאת תמונות */
  onUploadImages?: (files: File[], sku: string) => Promise<any[]>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * קיבוץ SKUs לפי variantName
 * @param skus - רשימת SKUs שטוחה
 * @returns מערך קבוצות וריאנטים
 */
const groupSkusByVariant = (skus: SKUFormData[]): VariantGroup[] => {
  const groups: Map<string, VariantGroup> = new Map();

  skus.forEach((sku) => {
    const variantName = (sku as any).variantName || sku.name || 'ללא שם';
    
    if (!groups.has(variantName)) {
      groups.set(variantName, {
        variantName,
        skus: [],
        isExpanded: false,
      });
    }

    groups.get(variantName)!.skus.push({
      sku: sku.sku,
      name: sku.name || sku.sku,
      variantName,
      subVariantName: (sku as any).subVariantName,
      price: sku.price ?? null,
      compareAtPrice: sku.compareAtPrice ?? null,
      stockQuantity: sku.stockQuantity,
      images: sku.images || [],
      isActive: sku.isActive ?? true,
      attributes: sku.attributes,
    });
  });

  return Array.from(groups.values());
};

/**
 * המרת קבוצות וריאנטים חזרה לרשימת SKUs שטוחה
 * @param groups - קבוצות וריאנטים
 * @returns רשימת SKUs שטוחה
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const flattenVariantGroups = (groups: VariantGroup[]): SKUFormData[] => {
  const skus: SKUFormData[] = [];

  groups.forEach((group) => {
    group.skus.forEach((sku) => {
      skus.push({
        sku: sku.sku,
        name: sku.name,
        price: sku.price,
        compareAtPrice: sku.price == null ? null : sku.compareAtPrice ?? null,
        stockQuantity: sku.stockQuantity,
        images: sku.images,
        isActive: sku.isActive,
        attributes: sku.attributes || {},
        // 🆕 שדות וריאנט מותאם
        variantName: sku.variantName,
        subVariantName: sku.subVariantName,
      } as any);
    });
  });

  return skus;
};

// ============================================================================
// Component
// ============================================================================

const CustomVariantsView: React.FC<CustomVariantsViewProps> = ({
  value,
  onChange,
  basePrice,
  productCompareAtPrice = null,
  productName = '',
  primaryVariantLabel = '',
  onPrimaryVariantLabelChange,
  secondaryVariantLabel = '',
  onSecondaryVariantLabelChange,
  primaryFilterAttribute = '',
  onPrimaryFilterAttributeChange,
  secondaryFilterAttribute = '',
  onSecondaryFilterAttributeChange,
  disabled = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUploadImages, // TODO: Phase 4 - יהיה בשימוש להעלאת תמונות לוריאנט
}) => {
  const getCompareAtPlaceholder = (sku: Pick<SKUFormData, 'price' | 'compareAtPrice'>): string => {
    if (sku.price == null) {
      return sku.compareAtPrice == null && productCompareAtPrice != null
        ? `בירושה: ₪${productCompareAtPrice.toFixed(2)}`
        : 'לא מוצג';
    }

    return 'מחיר מחוק';
  };

  const getCompareAtTitle = (sku: Pick<SKUFormData, 'price' | 'compareAtPrice'>): string => {
    if (sku.price != null) {
      return 'מחיר לפני הנחה לגרסה';
    }

    if (sku.compareAtPrice != null) {
      return 'מחיר לפני הנחה של גרסה לא מוצג בלי מחיר ספציפי לגרסה';
    }

    return productCompareAtPrice != null
      ? 'הגרסה יורשת את המחיר לפני הנחה מהמוצר כי אין לה מחיר ספציפי'
      : 'פעיל רק כאשר לגרסה יש מחיר ספציפי';
  };

  // ============================================================================
  // State
  // ============================================================================

  // קבוצות מורחבות
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // 🆕 State למודאל הוספת וריאנט
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  
  // 🆕 State לאישור מחיקת כל הוריאנטים
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  
  // 🆕 מצב הגדרת שם הוריאנט: טקסט חופשי או קישור למאפיין סינון
  const [labelDefinitionMode, setLabelDefinitionMode] = useState<'free' | 'linked'>('free');
  
  // 🆕 רשימת מאפייני סינון זמינים
  const [filterAttributes, setFilterAttributes] = useState<FilterAttribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  
  // 🆕 מאפיין סינון נבחר (במצב linked)
  const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<string>('');
  
  // 🔒 האם יש SKUs קיימים (הגנה על שינוי שם וריאנט)
  // 🔧 לא סופרים SKU דיפולטיבי (ללא variantName וללא color) כ-existing variant
  const hasExistingVariants = value.some(sku => 
    (sku as any).variantName || sku.color
  );

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * טעינת מאפייני סינון זמינים
   */
  useEffect(() => {
    const loadFilterAttributes = async () => {
      setLoadingAttributes(true);
      try {
        const attributes = await FilterAttributeService.getAllAttributes();
        setFilterAttributes(attributes);
      } catch (error) {
        console.error('Error loading filter attributes:', error);
      } finally {
        setLoadingAttributes(false);
      }
    };

    loadFilterAttributes();
  }, []);

  /**
   * עדכון אוטומטי של label ו-filterAttribute כשבוחרים attribute במצב linked
   */
  useEffect(() => {
    if (labelDefinitionMode === 'linked' && selectedFilterAttribute) {
      const attribute = filterAttributes.find(a => a.key === selectedFilterAttribute);
      if (attribute) {
        onPrimaryVariantLabelChange?.(attribute.name);
        onPrimaryFilterAttributeChange?.(attribute.key);
      }
    }
  }, [labelDefinitionMode, selectedFilterAttribute, filterAttributes, onPrimaryVariantLabelChange, onPrimaryFilterAttributeChange]);

  // ============================================================================
  // Memoized Values
  // ============================================================================

  // קיבוץ SKUs לפי וריאנט
  const variantGroups = useMemo(() => groupSkusByVariant(value), [value]);

  // סטטיסטיקות
  const stats = useMemo(() => {
    const totalSkus = value.length;
    const totalStock = value.reduce((sum, sku) => sum + (sku.stockQuantity || 0), 0);
    const totalVariants = variantGroups.length;
    return { totalSkus, totalStock, totalVariants };
  }, [value, variantGroups]);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * הרחבה/כיווץ של קבוצה
   */
  const toggleGroup = useCallback((variantName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(variantName)) {
        next.delete(variantName);
      } else {
        next.add(variantName);
      }
      return next;
    });
  }, []);

  /**
   * עדכון מלאי של SKU
   */
  const handleStockChange = useCallback(
    (skuCode: string, newStock: number) => {
      const updated = value.map((sku) =>
        sku.sku === skuCode ? { ...sku, stockQuantity: newStock } : sku
      );
      onChange(updated);
    },
    [value, onChange]
  );

  /**
   * עדכון מחיר של SKU
   */
  const handlePriceChange = useCallback(
    (skuCode: string, newPrice: number | null) => {
      const updated = value.map((sku) =>
        sku.sku === skuCode
          ? {
              ...sku,
              price: newPrice,
              // בזמן הקלדה שומרים ערך זמני; מחיקת המחיר מבטלת compareAt.
              compareAtPrice: newPrice == null ? null : sku.compareAtPrice ?? null,
            }
          : sku
      );
      onChange(updated);
    },
    [value, onChange]
  );

  /**
   * עדכון מחיר לפני הנחה של SKU
   */
  const handleCompareAtPriceChange = useCallback(
    (skuCode: string, newCompareAtPrice: number | null) => {
      const updated = value.map((sku) =>
        sku.sku === skuCode
          ? {
              ...sku,
              compareAtPrice: sku.price == null ? null : newCompareAtPrice,
            }
          : sku
      );
      onChange(updated);
    },
    [value, onChange]
  );

  /**
   * מחיקת קבוצת וריאנט
   */
  const handleDeleteVariant = useCallback(
    (variantName: string) => {
      const updated = value.filter((sku) => (sku as any).variantName !== variantName);
      onChange(updated);
    },
    [value, onChange]
  );

  /**
   * 🆕 מחיקת כל הוריאנטים
   */
  const handleDeleteAllVariants = useCallback(() => {
    setShowDeleteAllConfirm(true);
  }, []);

  /**
   * 🆕 אישור מחיקת כל הוריאנטים
   */
  const confirmDeleteAllVariants = useCallback(() => {
    // מחיקת כל ה-SKUs - המערכת תיצור SKU דיפולטיבי אוטומטית
    onChange([]);
    setShowDeleteAllConfirm(false);
    setExpandedGroups(new Set());
    // איפוס שם הוריאנט לאפשר הגדרה מחדש
    onPrimaryVariantLabelChange?.('');
    onSecondaryVariantLabelChange?.('');
  }, [onChange, onPrimaryVariantLabelChange, onSecondaryVariantLabelChange]);

  /**
   * 🆕 פתיחת מודאל הוספת וריאנט
   */
  const handleAddVariantClick = useCallback(() => {
    if (!primaryVariantLabel.trim()) {
      alert('יש להגדיר שם וריאנט ראשי תחילה');
      return;
    }
    setShowAddVariantModal(true);
  }, [primaryVariantLabel]);

  /**
   * 🆕 סגירת מודאל הוספת וריאנט
   */
  const handleCloseModal = useCallback(() => {
    setShowAddVariantModal(false);
  }, []);

  /**
   * 🆕 טיפול בשליחת נתונים מהמודאל - יצירת SKUs חדשים
   */
  const handleAddVariantSubmit = useCallback(
    (data: NewVariantData) => {
      // 🆕 עדכון מאפייני סינון אם במצב linked
      if (data.mode === 'linked') {
        if (data.linkedAttribute) {
          onPrimaryFilterAttributeChange?.(data.linkedAttribute);
        }
        if (data.linkedSecondaryAttribute) {
          onSecondaryFilterAttributeChange?.(data.linkedSecondaryAttribute);
        }
      }
      
      // 🔧 בדיקה: אם יש SKU דיפולטיבי אחד בלבד, נמחק אותו אוטומטית
      // כדי לאפשר יצירת וריאנטים מותאמים אישית
      const shouldClearDefaultSku = 
        value.length === 1 && // יש SKU אחד בלבד
        !value[0].variantName && // אין לו variantName (= לא custom variant)
        !value[0].color; // אין לו צבע (= לא color variant)
      
      if (shouldClearDefaultSku) {
        console.log('🗑️ [CustomVariants] מוחק SKU דיפולטיבי לפני יצירת וריאנטים מותאמים');
      }
      
      const newSkus: SKUFormData[] = [];
      
      // חישוב מספר SKU התחלתי - אם מחקנו את הדיפולטיבי, נתחיל מ-0
      const skuCounter = shouldClearDefaultSku ? 0 : value.length;
      
      // אם יש תת-וריאנטים, ניצור SKU לכל צירוף
      if (data.secondaryVariants && data.secondaryVariants.length > 0) {
        // לכל וריאנט ראשי
        data.variants?.forEach((variantName) => {
          // לכל תת-וריאנט
          data.secondaryVariants!.forEach((subVariantName) => {
            const skuCode = generateSkuFromName(productName || 'VARIANT') + `-${skuCounter + newSkus.length + 1}`.padStart(3, '0');
            
            // בניית attributes אם יש קישור לסינון
            const attributes: Record<string, any> = {};
            if (data.mode === 'linked') {
              // במצב linked, השמות הם values מהמאפיין
              if (data.linkedAttribute && primaryFilterAttribute) {
                attributes[primaryFilterAttribute] = variantName;
              }
              if (data.linkedSecondaryAttribute && secondaryFilterAttribute) {
                attributes[secondaryFilterAttribute] = subVariantName;
              }
            }
            
            // 🆕 קבלת מחיר ומלאי מ-variantDetails אם קיים
            const variantPrice = data.variantDetails?.[variantName]?.price ?? data.basePrice ?? null;
            const variantCompareAtPrice = data.variantDetails?.[variantName]?.compareAtPrice ?? null;
            const variantStock = data.variantDetails?.[variantName]?.stock ?? data.initialQuantity ?? 0;
            
            newSkus.push({
              sku: skuCode,
              name: `${variantName} - ${subVariantName}`,
              price: variantPrice,
              compareAtPrice:
                variantPrice == null || variantCompareAtPrice == null || variantCompareAtPrice <= variantPrice
                  ? null
                  : variantCompareAtPrice,
              stockQuantity: variantStock,
              images: [],
              isActive: true,
              attributes,
              variantName,
              subVariantName,
            } as any);
          });
        });
      } else {
        // אין תת-וריאנטים - SKU בודד לכל וריאנט ראשי
        data.variants?.forEach((variantName) => {
          const skuCode = generateSkuFromName(productName || 'VARIANT') + `-${skuCounter + newSkus.length + 1}`.padStart(3, '0');
          
          // בניית attributes
          const attributes: Record<string, any> = {};
          if (data.mode === 'linked' && data.linkedAttribute && primaryFilterAttribute) {
            attributes[primaryFilterAttribute] = variantName;
          }
          
          // 🆕 קבלת מחיר ומלאי מ-variantDetails אם קיים
          const variantPrice = data.variantDetails?.[variantName]?.price ?? data.basePrice ?? null;
          const variantCompareAtPrice = data.variantDetails?.[variantName]?.compareAtPrice ?? null;
          const variantStock = data.variantDetails?.[variantName]?.stock ?? data.initialQuantity ?? 0;
          
          newSkus.push({
            sku: skuCode,
            name: variantName,
            price: variantPrice,
            compareAtPrice:
              variantPrice == null || variantCompareAtPrice == null || variantCompareAtPrice <= variantPrice
                ? null
                : variantCompareAtPrice,
            stockQuantity: variantStock,
            images: [],
            isActive: true,
            attributes,
            variantName,
            subVariantName: undefined,
          } as any);
        });
      }
      
      // הוספת ה-SKUs החדשים לרשימה
      // 🔧 אם צריך למחוק את הדיפולטיבי, נחליף את כל המערך
      // אחרת, נוסיף בסוף
      const finalSkus = shouldClearDefaultSku 
        ? newSkus  // רק ה-SKUs החדשים (ללא הדיפולטיבי)
        : [...value, ...newSkus];  // המערך הקיים + החדשים
      
      onChange(finalSkus);
      
      // פתיחת הקבוצות החדשות
      const newVariantNames = new Set(newSkus.map(sku => (sku as any).variantName));
      setExpandedGroups((prev) => new Set([...prev, ...newVariantNames]));
      
      // סגירת המודאל
      setShowAddVariantModal(false);
    },
    [
      value,
      onChange,
      productName,
      primaryVariantLabel,
      primaryFilterAttribute,
      secondaryFilterAttribute,
      onPrimaryVariantLabelChange,
      onSecondaryVariantLabelChange,
      onPrimaryFilterAttributeChange,
      onSecondaryFilterAttributeChange,
    ]
  );

  /**
   * הוספת וריאנט חדש (פשוט - SKU בודד) - DEPRECATED
   * 🔄 הוחלף בפונקציה handleAddVariantClick שפותחת מודאל
   */
  const handleAddVariant = useCallback(() => {
    // פתיחת המודאל במקום יצירת וריאנט גנרי
    handleAddVariantClick();
  }, [handleAddVariantClick]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={styles.container}>
      {/* ============================================
          קטע הגדרת תוויות
          ============================================ */}
      <section className={styles.labelsSection}>
        <div className={styles.labelsSectionHeader}>
          <Icon name="Tag" size={18} />
          <h4 className={styles.labelsSectionTitle}>הגדרת תוויות</h4>
        </div>
        <p className={styles.labelsSectionDescription}>
          הגדר את שמות הוריאנטים שיוצגו ללקוחות (לדוגמה: "טעם", "ניקוטין")
        </p>

        {/* 🆕 בחירת אופן הגדרת השם */}
        <div className={styles.labelModeSection}>
          <label className={styles.labelModeSectionLabel}>
            <Icon name="Settings" size={16} />
            אופן הגדרת שם הוריאנט
          </label>
          <div className={styles.labelModeButtons}>
            <button
              type="button"
              className={`${styles.labelModeButton} ${labelDefinitionMode === 'free' ? styles.labelModeButtonActive : ''}`}
              onClick={() => {
                if (!hasExistingVariants) {
                  setLabelDefinitionMode('free');
                  setSelectedFilterAttribute('');
                }
              }}
              disabled={disabled || hasExistingVariants}
            >
              <Icon name="Edit" size={18} />
              <span>טקסט חופשי</span>
            </button>
            <button
              type="button"
              className={`${styles.labelModeButton} ${labelDefinitionMode === 'linked' ? styles.labelModeButtonActive : ''}`}
              onClick={() => {
                if (!hasExistingVariants) {
                  setLabelDefinitionMode('linked');
                }
              }}
              disabled={disabled || hasExistingVariants}
            >
              <Icon name="Link2" size={18} />
              <span>קישור למאפיין סינון</span>
            </button>
          </div>
          {hasExistingVariants && (
            <p className={styles.lockedModeHint}>
              <Icon name="Lock" size={14} />
              המצב נעול - קיימים SKUs
            </p>
          )}
        </div>

        {/* שדה שם הוריאנט */}
        <div className={styles.labelField}>
          <label className={styles.labelFieldLabel}>
            שם הוריאנט
            <span className={styles.required}>*</span>
          </label>
          
          {labelDefinitionMode === 'free' ? (
            <>
              <input
                type="text"
                className={styles.labelFieldInput}
                value={primaryVariantLabel}
                onChange={(e) => onPrimaryVariantLabelChange?.(e.target.value)}
                placeholder="לדוגמה: טעם"
                disabled={disabled || hasExistingVariants}
              />
              {hasExistingVariants && (
                <p className={styles.lockedFieldHint}>
                  <Icon name="Lock" size={14} />
                  השם נעול - קיימים SKUs. למחיקת הכל ושינוי, לחץ "מחק הכל"
                </p>
              )}
            </>
          ) : (
            <>
              {loadingAttributes ? (
                <div className={styles.loadingSelect}>
                  <Icon name="Loader2" size={16} className={styles.spinner} />
                  <span>טוען מאפיינים...</span>
                </div>
              ) : (
                <select
                  className={styles.labelFieldInput}
                  value={selectedFilterAttribute}
                  onChange={(e) => setSelectedFilterAttribute(e.target.value)}
                  disabled={disabled || hasExistingVariants}
                >
                  <option value="">בחר מאפיין סינון</option>
                  {filterAttributes.map((attr) => (
                    <option key={attr.key} value={attr.key}>
                      {attr.name} ({attr.key})
                    </option>
                  ))}
                </select>
              )}
              {hasExistingVariants && (
                <p className={styles.lockedFieldHint}>
                  <Icon name="Lock" size={14} />
                  השם נעול - קיימים SKUs
                </p>
              )}
              {!hasExistingVariants && selectedFilterAttribute && (
                <p className={styles.linkedHint}>
                  <Icon name="Info" size={14} />
                  שם הוריאנט מוגדר אוטומטית מהמאפיין: <strong>{primaryVariantLabel}</strong>
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* ============================================
          כותרת הוריאנטים
          ============================================ */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>
            <Icon name="Layers" size={20} />
            {primaryVariantLabel || 'גירסאות'} ({stats.totalVariants})
          </h3>
          <p className={styles.subtitle}>
            {stats.totalSkus} SKUs | סה״כ {stats.totalStock} יחידות במלאי
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* 🆕 כפתור מחיקת כל הוריאנטים - מוצג רק כשיש וריאנטים */}
          {variantGroups.length > 0 && (
            <button
              type="button"
              className={styles.deleteAllButton}
              onClick={handleDeleteAllVariants}
              disabled={disabled}
              title="מחק את כל הוריאנטים"
            >
              <Icon name="Trash2" size={16} />
              מחק הכל
            </button>
          )}
          
          <button
            type="button"
            className={styles.addButton}
            onClick={handleAddVariant}
            disabled={disabled || !primaryVariantLabel.trim()}
            title={!primaryVariantLabel.trim() ? 'יש להגדיר שם וריאנט ראשי תחילה' : undefined}
          >
            <Icon name="Plus" size={18} />
            <span>הוסף {primaryVariantLabel || 'וריאנט'}</span>
          </button>
        </div>
      </div>

      {/* ============================================
          רשימת וריאנטים או Empty State
          ============================================ */}
      {variantGroups.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <Icon name="Layers" size={48} />
          </div>
          <h4 className={styles.emptyStateTitle}>אין גירסאות עדיין</h4>
          <p className={styles.emptyStateText}>
            לחץ על "הוסף {primaryVariantLabel || 'גירסא'}" כדי להתחיל להוסיף גירסאות למוצר
          </p>
          <button
            type="button"
            className={styles.addButton}
            onClick={handleAddVariant}
            disabled={disabled}
          >
            <Icon name="Plus" size={18} />
            <span>הוסף {primaryVariantLabel || 'וריאנט'} ראשון</span>
          </button>
        </div>
      ) : (
        <div className={styles.variantsGrid}>
          {variantGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.variantName);
            const groupStock = group.skus.reduce((sum, s) => sum + s.stockQuantity, 0);

            return (
              <div key={group.variantName} className={styles.variantPanel}>
                {/* כותרת הפאנל */}
                <div
                  className={styles.variantPanelHeader}
                  onClick={() => toggleGroup(group.variantName)}
                >
                  <div className={styles.variantPanelHeaderLeft}>
                    <Icon
                      name="ChevronDown"
                      size={18}
                      className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
                    />
                    <h4 className={styles.variantName}>{group.variantName}</h4>
                    <div className={styles.variantMeta}>
                      <span className={styles.variantMetaItem}>
                        <Icon name="Package" size={14} />
                        {group.skus.length} SKUs
                      </span>
                      <span className={styles.variantMetaItem}>
                        <Icon name="Boxes" size={14} />
                        {groupStock} במלאי
                      </span>
                    </div>
                  </div>

                  <div className={styles.variantPanelHeaderRight}>
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVariant(group.variantName);
                      }}
                      disabled={disabled}
                      title="מחק גירסא"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  </div>
                </div>

                {/* תוכן הפאנל */}
                {isExpanded && (
                  <div className={styles.variantContent}>
                    {group.skus.length === 1 && !group.skus[0].subVariantName ? (
                      // SKU בודד - תצוגה פשוטה
                      <div className={styles.infoBox}> 
                      </div>
                    ) : null}

                    <table className={styles.subVariantsTable}>
                      <thead>
                        <tr>
                          <th>קוד SKU</th>
                          {secondaryVariantLabel && <th>{secondaryVariantLabel}</th>}
                          <th>מחיר</th>
                          <th>לפני הנחה</th>
                          <th>מלאי</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.skus.map((sku) => (
                          <tr key={sku.sku}>
                            <td>{sku.sku}</td>
                            {secondaryVariantLabel && <td>{sku.subVariantName || '-'}</td>}
                            <td>
                              <input
                                type="number"
                                className={styles.priceInput}
                                value={sku.price ?? ''}
                                onChange={(e) =>
                                  handlePriceChange(
                                    sku.sku,
                                    e.target.value ? parseFloat(e.target.value) : null
                                  )
                                }
                                placeholder={basePrice.toString()}
                                disabled={disabled}
                                min={0}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className={styles.priceInput}
                                value={sku.compareAtPrice ?? ''}
                                onChange={(e) =>
                                  handleCompareAtPriceChange(
                                    sku.sku,
                                    e.target.value ? parseFloat(e.target.value) : null
                                  )
                                }
                                placeholder={getCompareAtPlaceholder(sku)}
                                disabled={disabled || sku.price == null}
                                min={0}
                                title={getCompareAtTitle(sku)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className={styles.stockInput}
                                value={sku.stockQuantity}
                                onChange={(e) =>
                                  handleStockChange(sku.sku, parseInt(e.target.value) || 0)
                                }
                                disabled={disabled}
                                min={0}
                                placeholder="0"
                                title="כמות במלאי"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================
          🆕 מודאל הוספת וריאנט
          ============================================ */}
      <AddVariantModal
        isOpen={showAddVariantModal}
        onClose={handleCloseModal}
       onSubmit={handleAddVariantSubmit}
       basePrice={basePrice}
       productCompareAtPrice={productCompareAtPrice}
       primaryVariantLabel={primaryVariantLabel}
        secondaryVariantLabel={secondaryVariantLabel}
        labelDefinitionMode={labelDefinitionMode}
        selectedFilterAttribute={selectedFilterAttribute}
        primaryFilterAttribute={primaryFilterAttribute}
        secondaryFilterAttribute={secondaryFilterAttribute}
        existingVariants={variantGroups.map(g => g.variantName)}
      />

      {/* ============================================
          🆕 דיאלוג אישור מחיקת כל הוריאנטים
          ============================================ */}
      <ConfirmDialog
        isOpen={showDeleteAllConfirm}
        title="מחיקת כל הגירסאות"
        message={`⚠️ האם אתה בטוח שברצונך למחוק את כל ${variantGroups.length} הגירסאות וכל ה-${value.length} SKUs?
        
פעולה זו תחזיר את המוצר למצב ללא וריאנטים ותאפשר לך להגדיר מחדש את שם הוריאנט.`}
        confirmText="כן, מחק הכל"
        cancelText="ביטול"
        variant="danger"
        onConfirm={confirmDeleteAllVariants}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />
    </div>
  );
};

export default CustomVariantsView;
