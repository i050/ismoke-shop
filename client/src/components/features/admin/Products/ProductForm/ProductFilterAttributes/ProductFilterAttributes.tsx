// Product Filter Attributes Component
// מטרת הקומפוננטה: ניהול מאפייני סינון עבור כל הוריאנטים של המוצר
// מאפשר עריכה מהירה של מאפיינים (צבע, מידה וכו') בלי ללכת לטאב וריאנטים

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Icon } from '../../../../../ui/Icon';
import { ColorSelect } from '../../../../../ui/ColorSelect';
import { FilterAttributeService } from '../../../../../../services/filterAttributeService';
import type { FilterAttribute } from '../../../../../../services/filterAttributeService';
import type { SKUFormData } from '../../../../../../schemas/productFormSchema';
import { getColorNameHebrew } from '../../../../../../utils/colorUtils';
import styles from './ProductFilterAttributes.module.css';

/**
 * Props של קומפוננטת ProductFilterAttributes
 */
interface ProductFilterAttributesProps {
  /** רשימת הוריאנטים (SKUs) */
  skus: SKUFormData[];
  /** callback לעדכון הוריאנטים */
  onSkusChange: (skus: SKUFormData[]) => void;
  /** האם הטופס מושבת */
  disabled?: boolean;
}

/**
 * טיפוס לסטטיסטיקות מאפיינים חסרים
 */
interface AttributeStats {
  totalSkus: number;
  missingCount: number;
  filledCount: number;
  percentage: number;
}

/**
 * קומפוננטת ProductFilterAttributes
 * מציגה רשימת וריאנטים עם אפשרות עריכת מאפייני סינון inline
 */
const ProductFilterAttributes: React.FC<ProductFilterAttributesProps> = ({
  skus = [],
  onSkusChange,
  disabled = false,
}) => {
  // State למאפייני סינון מהשרת
  const [filterAttributes, setFilterAttributes] = useState<FilterAttribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  /**
   * טעינת מאפייני הסינון מהשרת
   */
  useEffect(() => {
    const loadAttributes = async () => {
      if (filterAttributes.length > 0 || loadingAttributes) return;

      try {
        setLoadingAttributes(true);
        const attrs = await FilterAttributeService.getAllAttributes();
        setFilterAttributes(attrs);
        console.log('✅ [ProductFilterAttributes] נטענו מאפיינים:', attrs.length);
      } catch (error) {
        console.error('❌ [ProductFilterAttributes] שגיאה בטעינת מאפיינים:', error);
      } finally {
        setLoadingAttributes(false);
      }
    };

    void loadAttributes();
  }, [filterAttributes.length, loadingAttributes]);

  /**
   * עדכון סטיילים דינמיים (progress bars וצבעים)
   * משתמש ב-data attributes כדי להימנע מ-inline styles
   */
  useEffect(() => {
    // עדכון רוחב progress bars
    document.querySelectorAll(`.${styles.statBarFill}[data-width]`).forEach((el) => {
      const width = el.getAttribute('data-width');
      if (width) {
        (el as HTMLElement).style.width = `${width}%`;
      }
    });

    // עדכון צבעי רקע של color swatches
    document.querySelectorAll(`.${styles.colorSwatch}[data-color]`).forEach((el) => {
      const color = el.getAttribute('data-color');
      if (color) {
        (el as HTMLElement).style.backgroundColor = color;
      }
    });
  }, [skus, filterAttributes]);

  /**
   * חישוב סטטיסטיקות לכל מאפיין
   */
  const getAttributeStats = useCallback(
    (attributeKey: string): AttributeStats => {
      const totalSkus = skus.length;
      let filledCount = 0;

      skus.forEach((sku) => {
        // צבע מאוחסן בשדה שטוח
        if (attributeKey === 'color') {
          if (sku.color && sku.color.trim() !== '') {
            filledCount++;
          }
        } else {
          // מאפיינים אחרים ב-attributes object
          const value = (sku.attributes as Record<string, any>)?.[attributeKey];
          if (value && String(value).trim() !== '') {
            filledCount++;
          }
        }
      });

      return {
        totalSkus,
        filledCount,
        missingCount: totalSkus - filledCount,
        percentage: totalSkus > 0 ? Math.round((filledCount / totalSkus) * 100) : 0,
      };
    },
    [skus]
  );

  /**
   * בדיקה אם מאפיין חסר בוריאנט מסוים אבל קיים באחרים
   */
  const isAttributeMissingInSku = useCallback(
    (skuIndex: number, attributeKey: string): boolean => {
      const currentSku = skus[skuIndex];
      if (!currentSku) return false;

      // בדוק אם יש ערך בוריאנט הנוכחי
      let currentValue: string | undefined;
      if (attributeKey === 'color') {
        currentValue = currentSku.color || undefined;
      } else {
        currentValue = (currentSku.attributes as Record<string, any>)?.[attributeKey];
      }

      // אם יש ערך - לא חסר
      if (currentValue && currentValue.trim() !== '') return false;

      // בדוק אם יש ערך בוריאנטים אחרים
      return skus.some((otherSku, idx) => {
        if (idx === skuIndex) return false;
        let otherValue: string | undefined;
        if (attributeKey === 'color') {
          otherValue = otherSku.color || undefined;
        } else {
          otherValue = (otherSku.attributes as Record<string, any>)?.[attributeKey];
        }
        return otherValue && otherValue.trim() !== '';
      });
    },
    [skus]
  );

  /**
   * עדכון מאפיין של וריאנט מסוים
   */
  const handleAttributeChange = useCallback(
    (skuIndex: number, attributeKey: string, value: string) => {
      const updatedSkus = skus.map((sku, idx) => {
        if (idx !== skuIndex) return sku;

        // צבע מאוחסן בשדה שטוח
        if (attributeKey === 'color') {
          return { ...sku, color: value };
        }

        // מאפיינים אחרים ב-attributes object
        const newAttributes = { ...(sku.attributes as Record<string, any>) || {} };
        if (value && value.trim() !== '') {
          newAttributes[attributeKey] = value;
        } else {
          delete newAttributes[attributeKey];
        }

        return { ...sku, attributes: newAttributes };
      });

      onSkusChange(updatedSkus);
    },
    [skus, onSkusChange]
  );

  /**
   * קבלת ערך מאפיין של וריאנט
   */
  const getAttributeValue = useCallback(
    (sku: SKUFormData, attributeKey: string): string => {
      if (attributeKey === 'color') {
        return sku.color || '';
      }
      return (sku.attributes as Record<string, any>)?.[attributeKey] || '';
    },
    []
  );

  /**
   * חישוב סיכום אזהרות
   */
  const warningsSummary = useMemo(() => {
    const warnings: { attribute: string; missingInSkus: string[] }[] = [];

    filterAttributes.forEach((attr) => {
      const missingSkus: string[] = [];
      skus.forEach((sku, idx) => {
        if (isAttributeMissingInSku(idx, attr.key)) {
          missingSkus.push(sku.name || sku.sku);
        }
      });
      if (missingSkus.length > 0) {
        warnings.push({ attribute: attr.name, missingInSkus: missingSkus });
      }
    });

    return warnings;
  }, [filterAttributes, skus, isAttributeMissingInSku]);

  /**
   * ספירת וריאנטים עם מאפיינים חסרים
   */
  const skusWithMissingAttributes = useMemo(() => {
    return skus.filter((_, idx) => {
      return filterAttributes.some((attr) => isAttributeMissingInSku(idx, attr.key));
    }).length;
  }, [skus, filterAttributes, isAttributeMissingInSku]);

  // אם אין וריאנטים
  if (skus.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>מאפייני סינון</h3>
          <p className={styles.subtitle}>
            ניהול מאפייני סינון עבור וריאנטים - צבע, מידה ומאפיינים נוספים
          </p>
        </div>

        <div className={styles.emptyState}>
          <Icon name="Filter" size={48} />
          <p className={styles.emptyText}>אין וריאנטים להצגה</p>
          <p className={styles.emptySubtext}>
            הוסף וריאנטים בטאב "וריאנטים" כדי לערוך מאפיינים
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* כותרת */}
      <div className={styles.header}>
        <h3 className={styles.title}>מאפייני סינון</h3>
        <p className={styles.subtitle}>
          ערוך מאפייני סינון (צבע, מידה וכו') עבור כל הוריאנטים במקום אחד.
          מאפיינים אלו מאפשרים ללקוחות לסנן ולמצוא את המוצר בקלות.
        </p>
      </div>

      {/* אזהרה כללית על מאפיינים חסרים */}
      {skusWithMissingAttributes > 0 && (
        <div className={styles.warningBanner}>
          <div className={styles.warningIcon}>
            <Icon name="AlertTriangle" size={20} />
          </div>
          <div className={styles.warningContent}>
            <strong>שים לב:</strong> {skusWithMissingAttributes} מתוך {skus.length} וריאנטים
            עם מאפיינים חסרים שקיימים בוריאנטים אחרים.
            <br />
            מומלץ למלא את כל המאפיינים לשיפור חוויית הסינון ללקוחות.
          </div>
        </div>
      )}

      {/* סטטיסטיקות מאפיינים */}
      {filterAttributes.length > 0 && (
        <div className={styles.statsSection}>
          <h4 className={styles.statsTitle}>
            <Icon name="BarChart3" size={18} />
            סטטיסטיקות מילוי
          </h4>
          <div className={styles.statsGrid}>
            {filterAttributes.map((attr) => {
              const stats = getAttributeStats(attr.key);
              return (
                <div
                  key={attr.key}
                  className={`${styles.statCard} ${
                    stats.percentage === 100
                      ? styles.statCardComplete
                      : stats.percentage > 0
                      ? styles.statCardPartial
                      : styles.statCardEmpty
                  }`}
                >
                  <div className={styles.statHeader}>
                    <span className={styles.statName}>{attr.name}</span>
                    <span className={styles.statPercentage}>{stats.percentage}%</span>
                  </div>
                  <div className={styles.statBar}>
                    <div
                      className={styles.statBarFill}
                      data-width={stats.percentage}
                    />
                  </div>
                  <div className={styles.statDetails}>
                    {stats.filledCount}/{stats.totalSkus} וריאנטים
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* רשימת וריאנטים עם מאפיינים */}
      <div className={styles.skusSection}>
        <h4 className={styles.sectionTitle}>
          <Icon name="Package" size={18} />
          עריכת מאפיינים לפי וריאנט ({skus.length})
        </h4>

        {loadingAttributes ? (
          <div className={styles.loadingState}>
            <Icon name="Loader2" size={24} />
            <span>טוען מאפיינים...</span>
          </div>
        ) : (
          <div className={styles.skusList}>
            {skus.map((sku, index) => {
              // בדיקה אם יש מאפיינים חסרים בוריאנט זה
              const hasMissingAttrs = filterAttributes.some((attr) =>
                isAttributeMissingInSku(index, attr.key)
              );

              return (
                <div
                  key={`${sku.sku}-${index}`}
                  className={`${styles.skuCard} ${
                    hasMissingAttrs ? styles.skuCardWarning : ''
                  }`}
                >
                  {/* Header של הוריאנט */}
                  <div className={styles.skuHeader}>
                    <div className={styles.skuInfo}>
                      <span className={styles.skuName}>{sku.name}</span>
                      <span className={styles.skuCode}>{sku.sku}</span>
                    </div>
                    {hasMissingAttrs && (
                      <span className={styles.skuWarningBadge}>
                        <Icon name="AlertCircle" size={14} />
                        חסרים מאפיינים
                      </span>
                    )}
                  </div>

                  {/* שדות מאפיינים */}
                  <div className={styles.attributesGrid}>
                    {filterAttributes.map((attr) => {
                      const value = getAttributeValue(sku, attr.key);
                      const isMissing = isAttributeMissingInSku(index, attr.key);

                      return (
                        <div
                          key={attr.key}
                          className={`${styles.attributeField} ${
                            isMissing ? styles.attributeFieldMissing : ''
                          }`}
                        >
                          <label className={styles.attributeLabel}>
                            {attr.icon && <span>{attr.icon}</span>}
                            {attr.name}
                            {attr.isRequired && (
                              <span className={styles.required}>*</span>
                            )}
                            {isMissing && (
                              <span
                                className={styles.missingTag}
                                title="מאפיין זה מולא בוריאנטים אחרים"
                              >
                                ⚠️ חסר
                              </span>
                            )}
                          </label>

                          {/* צבע - ColorSelect מיוחד */}
                          {attr.valueType === 'color' || attr.key === 'color' ? (
                            <div className={styles.colorFieldWrapper}>
                              <ColorSelect
                                value={value}
                                onChange={(color) =>
                                  handleAttributeChange(index, attr.key, color)
                                }
                                placeholder="בחר צבע"
                                showCustomPicker
                                allowCustomHex
                                disabled={disabled}
                                className={styles.colorSelect}
                              />
                              {value && (
                                <div className={styles.colorPreview}>
                                  <div
                                    className={styles.colorSwatch}
                                    data-color={value}
                                  />
                                  <span className={styles.colorName}>
                                    {getColorNameHebrew(value)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : attr.values && attr.values.length > 0 ? (
                            /* Select עם ערכים מוגדרים */
                            <select
                              className={styles.attributeSelect}
                              value={value}
                              onChange={(e) =>
                                handleAttributeChange(index, attr.key, e.target.value)
                              }
                              disabled={disabled}
                              title={`בחר ${attr.name}`}
                              aria-label={`בחר ${attr.name}`}
                            >
                              <option value="">בחר {attr.name}</option>
                              {attr.values.map((val) => (
                                <option key={val.value} value={val.value}>
                                  {val.displayName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            /* Input חופשי */
                            <input
                              type={attr.valueType === 'number' ? 'number' : 'text'}
                              className={styles.attributeInput}
                              value={value}
                              onChange={(e) =>
                                handleAttributeChange(index, attr.key, e.target.value)
                              }
                              placeholder={`הזן ${attr.name}`}
                              disabled={disabled}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* סיכום אזהרות */}
      {warningsSummary.length > 0 && (
        <div className={styles.warningsSummary}>
          <div className={styles.summaryHeader}>
            <Icon name="AlertTriangle" size={18} />
            <h4 className={styles.summaryTitle}>סיכום מאפיינים חסרים</h4>
          </div>
          <ul className={styles.summaryList}>
            {warningsSummary.map((warning) => (
              <li key={warning.attribute} className={styles.summaryItem}>
                <strong>{warning.attribute}:</strong> חסר ב-
                {warning.missingInSkus.slice(0, 3).join(', ')}
                {warning.missingInSkus.length > 3 && (
                  <span> ועוד {warning.missingInSkus.length - 3}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* טיפים */}
      <div className={styles.tips}>
        <div className={styles.tipsHeader}>
          <Icon name="HelpCircle" size={16} />
          <span>טיפים למאפייני סינון</span>
        </div>
        <ul className={styles.tipsList}>
          <li>מאפיינים מאפשרים ללקוחות לסנן מוצרים לפי צבע, מידה ועוד</li>
          <li>ודא שכל הוריאנטים מכילים את אותם מאפיינים לעקביות</li>
          <li>צבע לסינון משפיע על הסינון בקטלוג - בחר צבע מדויק</li>
          <li>מאפיינים חסרים מסומנים באזהרה - מומלץ למלא אותם</li>
          <li>ניתן להוסיף מאפיינים חדשים בדף "מאפייני סינון" בניהול</li>
        </ul>
      </div>
    </div>
  );
};

export default ProductFilterAttributes;
