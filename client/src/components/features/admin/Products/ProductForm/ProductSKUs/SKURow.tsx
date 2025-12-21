// SKU Row Component
// מטרת הקומפוננטה: שורת SKU בטבלה עם inline editing

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { SKUFormData } from '../../../../../../schemas/productFormSchema';
import styles from './SKURow.module.css';
import { detectColorFamily } from '../../../../../../utils/colorUtils';
import SKUImageManager from './SKUImageManager';
import { getColorNameHebrew } from '../../../../../../utils/colorUtils';
import { ColorSelect } from '@/components/ui/ColorSelect';
import { Collapsible } from '@/components/ui/Collapsible';
import { FilterAttributeService } from '../../../../../../services/filterAttributeService';
import type { FilterAttribute } from '../../../../../../services/filterAttributeService';
import { Image as ImageIcon, Edit2, Trash2, Check, X, CheckCircle, Palette, FileText, DollarSign } from 'lucide-react';

/**
 * Props של קומפוננטת SKURow
 */
interface SKURowProps {
  sku: SKUFormData;
  index: number;
  isEditing: boolean;
  errors?: {
    [key: string]: string;
  };
  onEdit: (index: number) => void;
  onChange: (index: number, field: keyof SKUFormData, value: any) => void;
  onDelete: (index: number) => void;
  onSave: (index: number) => void;
  onCancel: (index: number) => void;
  onCheckAvailability?: (skuCode: string, currentIndex: number) => Promise<boolean>;
  onUploadImages?: (files: File[], sku: string) => Promise<Array<{
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
  }>>;
  allSkus?: SKUFormData[]; // 🆕 כל הוריאנטים - לזיהוי מאפיינים חסרים
}

/**
 * קומפוננטת SKURow
 * מציגה שורת SKU עם אפשרות לעריכה inline
 */
const SKURow: React.FC<SKURowProps> = ({
  sku,
  index,
  isEditing,
  errors,
  onEdit,
  onChange,
  onDelete,
  onSave,
  onCancel,
  onCheckAvailability,
  onUploadImages,
  allSkus = [], // 🆕 כל הוריאנטים
}) => {
  const [checkingSKU, setCheckingSKU] = useState(false);
  const [skuAvailable, setSkuAvailable] = useState<boolean | null>(null);
  const [showImageManager, setShowImageManager] = useState(false);
  const normalizedColorHex = sku.color ? sku.color.toUpperCase() : '';

  // 🆕 State למאפייני סינון
  const [filterAttributes, setFilterAttributes] = useState<FilterAttribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [selectedColorFamily, setSelectedColorFamily] = useState<string | null>(
    sku.colorFamily || null
  );
  const [matchedColorVariant, setMatchedColorVariant] = useState<{ name?: string; hex?: string } | null>(null);
  const [detectionMethod, setDetectionMethod] = useState<'exact' | 'name' | 'fuzzy' | 'none'>('none');
  const [detectionScore, setDetectionScore] = useState<number | null>(null);
  // TODO: הצג detectionMethod ו-detectionScore ב-UI (אינדיקטור אמון)
  void detectionMethod; void detectionScore; // שמורים לעתיד

  /**
   * 🆕 טעינת מאפייני הסינון כשנכנסים למצב עריכה
   */
  useEffect(() => {
    const loadAttributes = async () => {
      if (filterAttributes.length > 0 || loadingAttributes) return; // already loaded

      try {
        setLoadingAttributes(true);
        const attrs = await FilterAttributeService.getAllAttributes();
        setFilterAttributes(attrs);
        console.log('✅ נטענו מאפיינים ל-SKURow (כלליים):', attrs.length);
      } catch (error) {
        console.error('❌ שגיאה בטעינת מאפיינים:', error);
      } finally {
        setLoadingAttributes(false);
      }
    };

    void loadAttributes();
  }, []);

  // שמירת הצבע הקודם למניעת infinite loop
  const previousColorRef = useRef<string | null>(null);

  /**
   * 🆕 בדיקה אם מאפיין מסוים קיים בוריאנטים אחרים אבל חסר בוריאנט הנוכחי
   */
  const isAttributeMissingInCurrentSku = useCallback(
    (attributeKey: string): boolean => {
      // צבע מאוחסן בשדה שטוח על SKU
      const currentValue = attributeKey === 'color' ? (sku as any)?.color : (sku.attributes as any)?.[attributeKey];
      if (currentValue) return false; // יש ערך - לא חסר

      // בדוק אם יש ערך במאפיין הזה בוריאנטים אחרים
      return allSkus.some((otherSku, idx) => {
        if (idx === index) return false; // דלג על הוריאנט הנוכחי
        const otherValue = attributeKey === 'color' ? (otherSku as any)?.color : (otherSku.attributes as any)?.[attributeKey];
        return otherValue && otherValue !== ''; // יש ערך בוריאנט אחר
      });
    },
    [sku, allSkus, index]
  );

  /**
   * בחר באופן אוטומטי משפחת צבע לפי ה-color של ה-SKU
   * 
   * CRITICAL: משתמש ב-useRef כדי לזהות שינוי אמיתי בצבע ולאפשר שינויים חוזרים.
   */
  useEffect(() => {
    const currentColor = sku?.color ? String(sku.color) : null;
    
    // אם המשתמש בחר ידנית מקור - אל נעשה זיהוי אוטומטי
    if ((sku as any)?.colorFamilySource && (sku as any).colorFamilySource === 'manual') {
      return;
    }

    // בדיקה אם הצבע באמת השתנה (לא רק re-render)
    if (currentColor === previousColorRef.current) {
      return; // אין שינוי אמיתי, לא צריך לעדכן
    }
    
    // עדכון הצבע הקודם
    previousColorRef.current = currentColor;

    if (!currentColor || !filterAttributes.length) {
      setSelectedColorFamily(null);
      setMatchedColorVariant(null);
      setDetectionMethod('none');
      setDetectionScore(null);
      return;
    }

    const colorAttr = filterAttributes.find(attr => attr.key === 'color' && Array.isArray(attr.colorFamilies));
    if (!colorAttr) {
      setSelectedColorFamily(null);
      setMatchedColorVariant(null);
      setDetectionMethod('none');
      setDetectionScore(null);
      return;
    }

    const detection = detectColorFamily(currentColor, colorAttr.colorFamilies || [], { distanceThreshold: 90 });
    if (detection.family) {
      setSelectedColorFamily(detection.family);
      setMatchedColorVariant(detection.variant || null);
      setDetectionMethod(detection.method);
      setDetectionScore(detection.score || null);
      onChange(index, 'colorFamily', detection.family);
    } else {
      setSelectedColorFamily(null);
      setMatchedColorVariant(null);
      setDetectionMethod('none');
      setDetectionScore(null);
      onChange(index, 'colorFamily', undefined);
    }
  }, [sku?.color, filterAttributes, index, onChange]);

  /**
   * 🎨 הוספת צבעי רקע דינמית לאלמנטי צבע
   */
  useEffect(() => {
    if (!isEditing) return;

    document.querySelectorAll(`.${styles.colorDot}[data-color]`).forEach((dot) => {
      const colorValue = (dot as HTMLElement).getAttribute('data-color');
      if (colorValue) {
        (dot as HTMLElement).style.backgroundColor = colorValue;
      }
    });

    document.querySelectorAll(`.${styles.variantColor}[data-color]`).forEach((variant) => {
      const colorValue = (variant as HTMLElement).getAttribute('data-color');
      if (colorValue) {
        (variant as HTMLElement).style.backgroundColor = colorValue;
      }
    });
  }, [isEditing, filterAttributes, selectedColorFamily]);

  /**
   * בדיקת זמינות קוד SKU
   */
  const handleCheckSKU = useCallback(async () => {
    if (!onCheckAvailability || !sku.sku) return;

    setCheckingSKU(true);
    setSkuAvailable(null);

    try {
      const available = await onCheckAvailability(sku.sku, index);
      setSkuAvailable(available);
    } catch (error) {
      console.error('שגיאה בבדיקת SKU:', error);
      setSkuAvailable(false);
    } finally {
      setCheckingSKU(false);
    }
  }, [onCheckAvailability, sku.sku, index]);

  /**
   * שינוי צבע - שימוש בשדה שטוח color
   */
  const handleColorChange = useCallback(
    (color: string) => {
      onChange(index, 'color', color);
    },
    [index, onChange]
  );

  // מצב תצוגה (לא עריכה)
  if (!isEditing) {
    return (
      <>
      {/* כרטיס SKU אופקי */}
      <div className={styles.skuCard}>
        {/* אזור גלריית תמונות */}
        <div className={styles.skuImages}>
          {sku.images && sku.images.length > 0 ? (
            <>
              {sku.images.slice(0, 3).map((img, idx) => (
                <img
                  key={idx}
                  src={typeof img === 'string' ? img : (img as any)?.url}
                  alt={`${sku.name} - תמונה ${idx + 1}`}
                  className={styles.imageThumbnail}
                  onClick={() => setShowImageManager(true)}
                />
              ))}
              {sku.images.length > 3 && (
                <div 
                  className={styles.moreImages}
                  onClick={() => setShowImageManager(true)}
                >
                  +{sku.images.length - 3}
                </div>
              )}
            </>
          ) : (
            <div className={styles.noImagesPlaceholder}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>אין תמונות</span>
            </div>
          )}
        </div>

        {/* תוכן הכרטיס */}
        <div className={styles.skuContent}>
          <div className={styles.skuName}>{sku.name}</div>
          <div className={styles.skuCode}>{sku.sku}</div>

          {/* פרטי SKU */}
          <div className={styles.skuDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>מחיר:</span>
              <span className={styles.detailValue}>
                {sku.price !== null && sku.price !== undefined 
                  ? `₪${sku.price.toFixed(2)}` 
                  : 'מחיר בסיס'}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>מלאי:</span>
              <span 
                className={`${styles.stockBadge} ${
                  sku.stockQuantity === 0
                    ? styles.stockOut
                    : sku.stockQuantity < 10
                    ? styles.lowStock
                    : styles.inStock
                }`}
              >
                {sku.stockQuantity === 0 
                  ? '❌ אזל מהמלאי' 
                  : sku.stockQuantity < 10
                  ? `⚠️ מלאי נמוך (${sku.stockQuantity})`
                  : `✓ במלאי (${sku.stockQuantity})`}
              </span>
            </div>
            {/* תצוגת צבע הוריאנט - משבצת צבע + שם בעברית */}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>צבע:</span>
              <div className={styles.colorDisplay}>
                {/* משבצת צבע שמציגה את הצבע הנבחר או placeholder אם אין צבע */}
                <div
                  className={styles.colorSwatch}
                  style={{ 
                    backgroundColor: sku.color || '#ffffff',
                    opacity: sku.color ? 1 : 0.3
                  }}
                  title={sku.color ? `${getColorNameHebrew(sku.color)} (${sku.color})` : 'אין צבע נבחר'}
                />
                {/* שם הצבע בעברית + קוד hex */}
                <span className={styles.colorText}>
                  {sku.color ? (
                    <>
                      <strong>{getColorNameHebrew(sku.color)}</strong>
                      <small style={{ marginRight: '6px', opacity: 0.7 }}>({sku.color})</small>
                    </>
                  ) : (
                    'ללא צבע'
                  )}
                </span>
              </div>
            </div>
            {sku.attributes?.size && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>מידה:</span>
                <span className={styles.detailValue}>{sku.attributes.size}</span>
              </div>
            )}

            {/* אזהרות מאפיינים חסרים (מוצגות גם במצב תצוגה) */}
            {(filterAttributes.length > 0 || isAttributeMissingInCurrentSku('color')) && (
              <div className={styles.missingWarningsList}>
                {filterAttributes
                  .filter(attr => isAttributeMissingInCurrentSku(attr.key))
                  .map((attr) => (
                    <div key={attr.key} className={styles.missingWarningBlock}>
                      חסר {attr.name}
                    </div>
                  ))}
                {/* טיפול במקרה color כמאפיין אם filterAttributes לא מכיל אותו */}
                {filterAttributes.findIndex(a => a.key === 'color') === -1 && isAttributeMissingInCurrentSku('color') && (
                  <div className={styles.missingWarningBlock}>חסר צבע</div>
                )}
              </div>
            )}
          </div>

          {/* כפתורי פעולה */}
          <div className={styles.skuActions}>
            <button
              type="button"
              className={styles.btnAction}
              onClick={() => setShowImageManager(true)}
              title="ערוך תמונות"
            >
              <ImageIcon size={16} />
              <span>תמונות</span>
            </button>
            <button
              type="button"
              className={styles.btnAction}
              onClick={() => onEdit(index)}
              title="ערוך"
            >
              <Edit2 size={16} />
              <span>ערוך</span>
            </button>
            <button
              type="button"
              className={`${styles.btnAction} ${styles.danger}`}
              onClick={() => onDelete(index)}
              title="מחק"
            >
              <Trash2 size={16} />
              <span>מחק</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* מודל ניהול תמונות */}
      {showImageManager && (
        <SKUImageManager
          isOpen={showImageManager}
          onClose={() => setShowImageManager(false)}
          skuName={sku.name}
          sku={sku.sku}
          images={sku.images || []}
          onSave={(updatedImages) => {
            onChange(index, 'images', updatedImages);
            setShowImageManager(false);
          }}
          onUpload={onUploadImages}
          maxImages={10}
          maxFileSize={5 * 1024 * 1024}
        />
      )}
      </>
    );
  }

  // מצב עריכה - גם כן בפורמט כרטיס
  return (
    <>
    <div className={`${styles.skuCard} ${styles.skuCardEditing}`}>
      {/* אזור תמונות - תצוגה בלבד במצב עריכה */}
      <div className={styles.skuImages}>
        {sku.images && sku.images.length > 0 ? (
          <>
            {sku.images.slice(0, 3).map((img, idx) => (
              <img
                key={idx}
                src={typeof img === 'string' ? img : (img as any)?.url}
                alt={`${sku.name} - תמונה ${idx + 1}`}
                className={styles.imageThumbnail}
              />
            ))}
            {sku.images.length > 3 && (
              <div className={styles.moreImages}>+{sku.images.length - 3}</div>
            )}
          </>
        ) : (
          <div className={styles.noImagesPlaceholder}>
            <span>אין תמונות</span>
            <small>לערוך תמונות שמור קודם</small>
          </div>
        )}
      </div>

      {/* תוכן הכרטיס - מצב עריכה */}
      <div className={styles.skuContent}>
        <div className={styles.editingNote}>מצב עריכה</div>

        {/* קוד SKU */}
        <div className={styles.editField}>
          <label className={styles.editLabel}>קוד SKU:</label>
          <input
            type="text"
            className={`${styles.input} ${styles.inputSku} ${
              errors?.sku ? styles.inputError : ''
            }`}
            value={sku.sku}
            onChange={(e) =>
              onChange(index, 'sku', e.target.value.toUpperCase())
            }
            placeholder="SKU-001"
          />
          {skuAvailable !== null && (
            <span className={`${styles.availability} ${
              skuAvailable ? styles.availabilitySuccess : styles.availabilityError
            }`}>
              {skuAvailable ? '✓ זמין' : '✗ תפוס'}
            </span>
          )}
          {errors?.sku && (
            <div className={styles.error}>
              {typeof errors.sku === 'string' ? errors.sku : (errors.sku as any)?.message || 'שגיאה בקוד SKU'}
            </div>
          )}
        </div>

        {/* שם */}
        <div className={styles.editField}>
          <label className={styles.editLabel}>שם:</label>
          <input
            type="text"
            className={`${styles.input} ${errors?.name ? styles.inputError : ''}`}
            value={sku.name}
            onChange={(e) => onChange(index, 'name', e.target.value)}
            placeholder="שם הוריאנט"
          />
          {errors?.name && (
            <div className={styles.error}>
              {typeof errors.name === 'string' ? errors.name : (errors.name as any)?.message || 'שגיאה בשם'}
            </div>
          )}
        </div>

        {/* שדה צבע */}
        <div className={styles.editField}>
          <label className={styles.editLabel}>צבע:</label>
          <div className={styles.colorPickerWrapper}>
            <ColorSelect
              value={sku.color || ''}
              onChange={handleColorChange}
              placeholder="בחר מהרשימה"
              className={styles.colorDropdown}
              showCustomPicker
              allowCustomHex
              helperText={sku.color ? `צבע נוכחי: ${getColorNameHebrew(sku.color)} (${normalizedColorHex})` : 'ניתן לבחור מהרשימה או לבחור צבע חופשי'}
            />

            <div className={styles.colorDisplay}>
              <div
                className={styles.colorSwatch}
                style={{ 
                  backgroundColor: sku.color || '#ffffff',
                  opacity: sku.color ? 1 : 0.3,
                }}
              />
              <span className={styles.colorText}>
                {sku.color ? `${getColorNameHebrew(sku.color)} (${normalizedColorHex})` : 'לא נבחר צבע'}
              </span>
            </div>
          </div>
        </div>

        {/* 🆕 בנק הצבעים - משפחות + גוונים */}
        {filterAttributes.find(attr => attr.key === 'color' && attr.valueType === 'color') && (
          <Collapsible
            title="צבע לסינון"
            icon={<Palette size={18} />}
            defaultOpen={true}
          >
            {loadingAttributes ? (
              <div className={styles.loadingState}>טוען...</div>
            ) : (
              <>
                {/* שורה: מצב זיהוי משפחת צבע - Auto / Manual */}
                <div className={styles.familyControl}>
                  <label className={styles.label}>מקור משפחת צבע:</label>
                  <select
                    value={(sku as any).colorFamilySource || 'auto'}
                    onChange={(e) => {
                      const v = e.target.value as string;
                      if (v === 'auto') {
                        onChange(index, 'colorFamilySource', 'auto');
                      } else {
                        onChange(index, 'colorFamilySource', 'manual');
                        onChange(index, 'colorFamily', v);
                        setSelectedColorFamily(v);
                        const family = filterAttributes.find(attr => attr.key === 'color')?.colorFamilies?.find(f => f.family === v);
                        if (family && family.variants && family.variants.length > 0) {
                          setMatchedColorVariant({ name: family.variants[0].name, hex: family.variants[0].hex });
                        } else {
                          setMatchedColorVariant(null);
                        }
                      }
                    }}
                    className={styles.input}
                  >
                    <option value="auto">אוטומטי (Auto)</option>
                    {filterAttributes
                      .find(attr => attr.key === 'color')
                      ?.colorFamilies?.map((f) => (
                        <option key={f.family} value={f.family}>{f.displayName}</option>
                      ))}
                  </select>
                </div>

                {/* הצגת משפחת הצבע שסופקה אוטומטית לפי צבע הווריאנט */}
                <div className={styles.colorFamilies}>
                  <label className={styles.label}>צבע לסינון:</label>
                  {selectedColorFamily ? (
                    <div className={styles.selectedFamily}>
                      <strong>
                        {filterAttributes
                          .find(attr => attr.key === 'color')
                          ?.colorFamilies
                          ?.find(f => f.family === selectedColorFamily)
                          ?.displayName || selectedColorFamily}
                      </strong>
                      {(sku as any).colorFamilySource === 'manual' && (
                        <span className={styles.manualTag} title="בחירה ידנית"> (ידני)</span>
                      )}
                      {matchedColorVariant && (
                        <span className={styles.familyVariantInfo}> — {matchedColorVariant.name || matchedColorVariant.hex}</span>
                      )}
                    </div>
                  ) : (
                    <div className={styles.noFamily}>
                      <span>לא נמצאה משפחת צבע תואמת</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </Collapsible>
        )}

        {/* 🆕 מאפיינים נוספים (דינמי) */}
        {filterAttributes.filter(attr => attr.key !== 'color' && attr.valueType !== 'color').length > 0 && (
          <Collapsible
            title="מאפיינים נוספים"
            icon={<FileText size={18} />}
            defaultOpen={true}
          >
            <div className={styles.attributesGrid}>
              {filterAttributes
                .filter(attr => attr.key !== 'color' && attr.valueType !== 'color')
                .map((attr) => (
                  <div key={attr.key} className={styles.editField}>
                    <label className={styles.editLabel}>
                      {attr.icon && <span>{attr.icon}</span>} {attr.name}
                      {attr.isRequired && <span className={styles.required}>*</span>}
                      {isAttributeMissingInCurrentSku(attr.key) && (
                        <span className={styles.missingWarning} title="מאפיין זה מולא בוריאנטים אחרים">
                          ⚠️ חסר
                        </span>
                      )}
                    </label>
                    
                    {/* אם יש ערכים מוגדרים - select */}
                    {attr.values && attr.values.length > 0 ? (
                      <select
                        className={styles.input}
                        value={(sku.attributes as any)?.[attr.key] || ''}
                        onChange={(e) => {
                          const newAttributes = { ...(sku.attributes as any) || {} };
                          if (e.target.value) {
                            newAttributes[attr.key] = e.target.value;
                          } else {
                            delete newAttributes[attr.key];
                          }
                          onChange(index, 'attributes', newAttributes);
                        }}
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
                      /* אין ערכים מוגדרים - input חופשי */
                      <input
                        type={attr.valueType === 'number' ? 'number' : 'text'}
                        className={styles.input}
                        value={(sku.attributes as any)?.[attr.key] || ''}
                        onChange={(e) => {
                          const newAttributes = { ...(sku.attributes as any) || {} };
                          if (e.target.value) {
                            newAttributes[attr.key] = e.target.value;
                          } else {
                            delete newAttributes[attr.key];
                          }
                          onChange(index, 'attributes', newAttributes);
                        }}
                        placeholder={`הזן ${attr.name}`}
                      />
                    )}
                  </div>
                ))}
            </div>
          </Collapsible>
        )}

        {/* שורת מידע - מחיר + מלאי */}
        <Collapsible
          title="מחיר ומלאי"
          icon={<DollarSign size={18} />}
          defaultOpen={true}
        >
          <div className={styles.editRow}>
            <div className={styles.editFieldHalf}>
              <label className={styles.editLabel}>מחיר (₪):</label>
              <input
                type="number"
                className={`${styles.input} ${errors?.price ? styles.inputError : ''}`}
                value={sku.price ?? ''}
                onChange={(e) =>
                  onChange(index, 'price', e.target.value ? parseFloat(e.target.value) : null)
                }
                placeholder="מחיר"
                step="0.01"
                min="0"
              />
              {errors?.price && (
                <div className={styles.error}>
                  {typeof errors.price === 'string' ? errors.price : (errors.price as any)?.message || 'שגיאה במחיר'}
                </div>
              )}
            </div>
            <div className={styles.editFieldHalf}>
              <label className={styles.editLabel}>מלאי:</label>
              <input
                type="number"
                className={`${styles.input} ${errors?.stockQuantity ? styles.inputError : ''}`}
                value={sku.stockQuantity}
                onChange={(e) =>
                  onChange(index, 'stockQuantity', parseInt(e.target.value, 10) || 0)
                }
                placeholder="כמות"
                min="0"
              />
              {errors?.stockQuantity && (
                <div className={styles.error}>
                  {typeof errors.stockQuantity === 'string' ? errors.stockQuantity : (errors.stockQuantity as any)?.message || 'שגיאה במלאי'}
                </div>
              )}
            </div>
          </div>
        </Collapsible>

        {/* סטטוס */}
        <div className={styles.editField}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={sku.isActive}
              onChange={(e) => onChange(index, 'isActive', e.target.checked)}
            />
            <span>SKU פעיל</span>
          </label>
        </div>

        {/* כפתורי שמירה/ביטול */}
        <div className={styles.skuActions}>
          <button
            type="button"
            className={`${styles.btnAction} ${styles.success}`}
            onClick={() => onSave(index)}
            title="שמור"
          >
            <Check size={16} />
            <span>שמור</span>
          </button>
          <button
            type="button"
            className={styles.btnAction}
            onClick={() => onCancel(index)}
            title="בטל"
          >
            <X size={16} />
            <span>בטל</span>
          </button>
          {onCheckAvailability && (
            <button
              type="button"
              className={styles.btnAction}
              onClick={handleCheckSKU}
              disabled={!sku.sku || checkingSKU}
              title="בדוק זמינות SKU"
            >
              {checkingSKU ? <span>...</span> : <CheckCircle size={16} />}
              <span>בדוק</span>
            </button>
          )}
        </div>
      </div>
    </div>

    {/* מודל ניהול תמונות */}
    {showImageManager && (
      <SKUImageManager
        isOpen={showImageManager}
        onClose={() => setShowImageManager(false)}
        skuName={sku.name}
        sku={sku.sku}
        images={sku.images || []}
        onSave={(updatedImages) => {
          onChange(index, 'images', updatedImages);
          setShowImageManager(false);
        }}
        onUpload={onUploadImages}
        maxImages={10}
        maxFileSize={5 * 1024 * 1024}
      />
    )}
    </>
  );
};

export default SKURow;
