// SKU Row Component
// מטרת הקומפוננטה: שורת SKU בטבלה עם inline editing

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { SKUFormData } from '../../../../../../schemas/productFormSchema';
import styles from './SKURow.module.css';
import { detectColorFamily } from '../../../../../../utils/colorUtils';
import SKUImageManager from './SKUImageManager';
import { getColorNameHebrew } from '../../../../../../utils/colorUtils';
import { PRODUCT_IMAGE_UPLOAD_MAX_FILE_SIZE_BYTES } from '../../../../../../config/imageUpload';
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
      {/* כרטיס SKU מינימלי */}
      <div className={styles.skuCard}>
        <div className={styles.skuContent}>
          <div className={styles.skuName}>{sku.name}</div>
          
          {/* פרטי SKU - מינימלי */}
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
              <span className={styles.detailValue}>
                {sku.stockQuantity}
              </span>
            </div>
          </div>

          {/* כפתורי פעולה */}
          <div className={styles.skuActions}>
            <button
              type="button"
              className={styles.btnAction}
              onClick={() => onEdit(index)}
              title="ערוך"
            >
              <Edit2 size={16} />
            </button>
            <button
              type="button"
              className={`${styles.btnAction} ${styles.danger}`}
              onClick={() => onDelete(index)}
              title="מחק"
            >
              <Trash2 size={16} />
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
          maxFileSize={PRODUCT_IMAGE_UPLOAD_MAX_FILE_SIZE_BYTES}
        />
      )}
      </>
    );
  }

  // מצב עריכה - מחיר ומלאי בלבד
  return (
    <>
    <div className={`${styles.skuCard} ${styles.skuCardEditing}`}>
      <div className={styles.skuContent}>
        <div className={styles.skuName}>{sku.name}</div>
        <div className={styles.editingNote}>עריכת מחיר ומלאי</div>

        {/* מחיר + מלאי */}
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
        maxFileSize={PRODUCT_IMAGE_UPLOAD_MAX_FILE_SIZE_BYTES}
      />
    )}
    </>
  );
};

export default SKURow;
