// Product SKUs Component
// מטרת הקומפוננטה: ניהול SKUs (וריאנטים) של המוצר

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { SKUFormData } from '../../../../../../schemas/productFormSchema';
import { Icon } from '../../../../../ui/Icon';
import SKURow from './SKURow';
import AddSKUModal from './AddSKUModal';
import ConfirmDialog from '../../../../../ui/ConfirmDialog';
import styles from './ProductSKUs.module.css';

/**
 * פונקציה ליצירת קוד SKU מתוך שם המוצר
 * הופכת את השם לאותיות גדולות, מחליפה רווחים במקפים, ומסירה תווים לא תקינים
 * מסירה תווים עבריים כי SKU חייב להיות באנגלית בלבד (A-Z, 0-9, -)
 */
const generateSkuFromName = (name: string): string => {
  if (!name) return 'SKU-DEFAULT';
  
  // טרנסליטרציה פשוטה של עברית לאנגלית (אופציונלי)
  const hebrewToEnglish: { [key: string]: string } = {
    'א': 'A', 'ב': 'B', 'ג': 'G', 'ד': 'D', 'ה': 'H', 'ו': 'V', 'ז': 'Z',
    'ח': 'CH', 'ט': 'T', 'י': 'Y', 'כ': 'K', 'ך': 'K', 'ל': 'L', 'ם': 'M',
    'מ': 'M', 'ן': 'N', 'נ': 'N', 'ס': 'S', 'ע': 'A', 'פ': 'P', 'ף': 'P',
    'צ': 'TS', 'ץ': 'TS', 'ק': 'K', 'ר': 'R', 'ש': 'SH', 'ת': 'T'
  };
  
  // המרת תווים עבריים לאנגלית
  let transliterated = name.split('').map(char => hebrewToEnglish[char] || char).join('');
  
  return transliterated
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')           // רווחים → מקפים
    .replace(/[^A-Z0-9-]/g, '')     // רק אנגלית, מספרים ומקפים
    .replace(/-+/g, '-')            // מקפים כפולים → מקף בודד
    .replace(/^-+|-+$/g, '')        // הסרת מקפים בהתחלה וסוף
    .substring(0, 50)               // הגבלת אורך
    || 'SKU-DEFAULT';               // fallback אם נשאר ריק
};

/**
 * Props של קומפוננטת ProductSKUs
 */
interface ProductSKUsProps {
  value: SKUFormData[];
  onChange: (skus: SKUFormData[]) => void;
  errors?: {
    [key: string]: string;
  };
  onCheckAvailability?: (skuCode: string, productId?: string) => Promise<boolean>;
  isSkuMode: boolean; // מצב SKU בודד או מרובה
  mode?: 'create' | 'edit'; // 🆕 מצב הטופס - במצב create נציג הודעה, במצב edit נציג SKUs רגיל
  onUploadImages?: (files: File[], sku: string) => Promise<Array<{
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
  }>>;
  /** שדות מהטופס הראשי ליצירת defaultSku - לשימוש בפתיחה אוטומטית */
  productFormData?: {
    name?: string;
    basePrice?: number;
    stockQuantity?: number;
    images?: Array<{ url: string; public_id: string; format?: string; width?: number; height?: number; }>;
  };
}

/**
 * קומפוננטת ProductSKUs
 * מאפשרת ניהול וריאנטים (SKUs) של המוצר
 */
const ProductSKUs: React.FC<ProductSKUsProps> = ({
  value,
  onChange,
  errors,
  onCheckAvailability,
  isSkuMode,
  mode = 'create', // 🆕 ברירת מחדל: create
  onUploadImages,
  productFormData, // 🆕 נתונים מהטופס הראשי
}) => {
  // State לעריכה
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [originalSKU, setOriginalSKU] = useState<SKUFormData | null>(null);

  // State למודאל הוספה
  const [showAddModal, setShowAddModal] = useState(false);

  // State למחיקה
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  
  // Ref למעקב אחרי פתיחה אוטומטית - כדי למנוע פתיחה חוזרת
  const didAutoOpenRef = useRef<boolean>(false);
  
  /**
   * בניית defaultSku מנתוני הטופס הראשי
   * משמש למילוי מראש של המודאל בפתיחה אוטומטית
   */
  const buildDefaultSku = useCallback((): Partial<SKUFormData> | undefined => {
    if (!productFormData) return undefined;
    
    const { name = '', basePrice = 0, stockQuantity = 0, images = [] } = productFormData;
    
    return {
      sku: generateSkuFromName(name),
      name: name || 'מוצר ברירת מחדל',
      price: basePrice || null,
      stockQuantity: stockQuantity || 0,
      images: images || [],
      color: '',
      attributes: {},
      isActive: true,
    };
  }, [productFormData]);

  /**
   * useEffect - פתיחה אוטומטית של המודאל במצב create
   * נפתח אוטומטית פעם אחת כאשר:
   * 1. mode === 'create'
   * 2. אין SKUs במערך
   * 3. יש productFormData (שדות מהטופס מולאו)
   * 4. טרם נפתח אוטומטית (didAutoOpenRef)
   */
  useEffect(() => {
    // תנאי לפתיחה אוטומטית
    const shouldAutoOpen = 
      mode === 'create' &&           // רק במצב יצירה
      value.length === 0 &&          // אין SKUs קיימים
      productFormData &&             // יש נתונים מהטופס
      productFormData.name &&        // יש שם למוצר (חובה)
      !didAutoOpenRef.current;       // טרם נפתח אוטומטית
    
    if (shouldAutoOpen) {
      console.log('🚀 [ProductSKUs] Auto-opening modal for initial SKU creation');
      didAutoOpenRef.current = true; // סימון שנפתח
      setShowAddModal(true);         // פתיחת המודאל
    }
  }, [mode, value.length, productFormData]);

  /**
   * התחלת עריכה
   */
  const handleEdit = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setOriginalSKU({ ...value[index] });
    },
    [value]
  );

  /**
   * ביטול עריכה
   */
  const handleCancel = useCallback(
    (index: number) => {
      if (originalSKU) {
        const updated = [...value];
        updated[index] = originalSKU;
        onChange(updated);
      }
      setEditingIndex(null);
      setOriginalSKU(null);
    },
    [originalSKU, value, onChange]
  );

  /**
   * שמירת עריכה
   */
  const handleSave = useCallback(
    (_index: number) => {
      // כאן יכולה להיות ולידציה נוספת
      setEditingIndex(null);
      setOriginalSKU(null);
    },
    []
  );

  /**
   * שינוי ערך בשדה
   */
  const handleChange = useCallback(
    (index: number, field: keyof SKUFormData, fieldValue: any) => {
      const updated = [...value];
      updated[index] = {
        ...updated[index],
        [field]: fieldValue,
      };
      onChange(updated);
    },
    [value, onChange]
  );

  /**
   * הוספת SKU חדש
   */
  const handleAdd = useCallback(
    (newSKU: SKUFormData) => {
      console.log('🟢 ProductSKUs - handleAdd called with:', newSKU);
      console.log('🟢 Current SKUs:', value);
      const updatedSKUs = [...value, newSKU];
      console.log('🟢 Updated SKUs:', updatedSKUs);
      onChange(updatedSKUs);
    },
    [value, onChange]
  );

  /**
   * אישור מחיקה
   */
  const handleDeleteConfirm = useCallback(() => {
    if (deletingIndex !== null) {
      const updated = value.filter((_, i) => i !== deletingIndex);
      onChange(updated);
      setDeletingIndex(null);
    }
  }, [deletingIndex, value, onChange]);

  /**
   * בדיקת זמינות SKU (wrapper)
   */
  const handleCheckAvailability = useCallback(
    async (skuCode: string, currentIndex: number): Promise<boolean> => {
      // בדיקה מקומית - האם קיים ברשימה הנוכחית
      const existsLocally = value.some(
        (s, i) => s.sku === skuCode && i !== currentIndex
      );
      if (existsLocally) {
        return false;
      }

      // בדיקה בשרת (אם קיימת הפונקציה)
      if (onCheckAvailability) {
        return await onCheckAvailability(skuCode);
      }

      return true;
    },
    [value, onCheckAvailability]
  );

  // אם זה מצב SKU בודד - הסתר את כל האופציות למרובה
  if (!isSkuMode) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>SKU (מזהה מוצר)</h3>
          <p className={styles.subtitle}>
            במצב זה המוצר לא כולל וריאנטים. המלאי מנוהל דרך שדה המלאי הראשי.
          </p>
        </div>

        <div className={styles.disabledNote}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
          <span>
            כדי להוסיף וריאנטים (צבעים, מידות וכו'), סמן את התיבה "עקוב אחרי מלאי"
            בשלב המלאי.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 🆕 הודעת מוצר פשוט/מורכב - רק במצב create */}
      {mode === 'create' && value.length === 0 && (
        <div className={styles.infoBox}>
          <div className={styles.infoIcon}><Icon name="AlertCircle" size={24} /></div>
          <div className={styles.infoContent}>
            <h4 className={styles.infoTitle}>הגדרת וריאנט ראשוני</h4>
            <p className={styles.infoText}>
              טופס הוריאנט נפתח אוטומטית עם הערכים שהזנת במוצר.
              <br />
              <strong>ודא את המלאי והתמונות</strong> לפני השמירה. אם תסגור את הטופס ללא שמירה, המערכת תיצור וריאנט בסיסי אוטומטית.
            </p>
          </div>
        </div>
      )}

      {/* כותרת */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>
            SKUs - וריאנטים ({value.length})
          </h3>
          <p className={styles.subtitle}>
            {mode === 'create' && value.length === 0 
              ? 'הוסף את הוריאנט הראשון של המוצר - השדות מולאו מראש מנתוני המוצר'
              : 'נהל את הוריאנטים השונים של המוצר (צבעים, מידות וכו׳)'
            }
          </p>
        </div>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setShowAddModal(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>הוסף SKU</span>
        </button>
      </div>

      {/* Grid של כרטיסי SKUs */}
      {value.length > 0 ? (
        <div className={styles.skuGrid}>
          {value.map((sku, index) => (
            <SKURow
              key={`${sku.sku}-${index}`}
              sku={sku}
              index={index}
              isEditing={editingIndex === index}
              errors={
                errors?.[`skus[${index}]`]
                  ? { [errors[`skus[${index}]`]]: 'שגיאה' }
                  : undefined
              }
              onEdit={handleEdit}
              onChange={handleChange}
              onDelete={(i) => setDeletingIndex(i)}
              onSave={handleSave}
              onCancel={handleCancel}
              onCheckAvailability={handleCheckAvailability}
              onUploadImages={onUploadImages}
              allSkus={value}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="9" x2="15" y2="15"></line>
            <line x1="15" y1="9" x2="9" y2="15"></line>
          </svg>
          <p className={styles.emptyText}>אין SKUs עדיין</p>
          <p className={styles.emptySubtext}>
            לחץ על "הוסף SKU" כדי להתחיל
          </p>
        </div>
      )}

      {/* שגיאה כללית */}
      {errors?.skus && (
        <div className={styles.globalError}>
          {typeof errors.skus === 'string' 
            ? errors.skus 
            : (errors.skus as any)?.message || 'שגיאה בוריאנטים'}
        </div>
      )}

      {/* טיפים */}
      <div className={styles.tips}>
        <div className={styles.tipsHeader}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
          </svg>
          <span>טיפים ל-SKUs</span>
        </div>
        <ul className={styles.tipsList}>
          <li>
            <strong>קוד SKU:</strong> השתמש בקוד ייחודי ועקבי (למשל: PROD-RED-L)
          </li>
          <li>
            <strong>שם תצוגה:</strong> תאר בקצרה את הוריאנט (למשל: "אדום - גודל L")
          </li>
          <li>
            <strong>מחיר:</strong> אם לא מוגדר, ישתמש במחיר הבסיס של המוצר
          </li>
          <li>
            <strong>מלאי:</strong> כל SKU מנהל מלאי נפרד
          </li>
          <li>
            <strong>צבעים ומידות:</strong> השתמש בשדות הייעודיים לסינון טוב יותר
          </li>
          <li>
            <strong>SKU בודד:</strong> לפחות SKU אחד נדרש למוצר
          </li>
        </ul>
      </div>

      {/* מודאל הוספה */}
      {/**
       * רק אם במצב יצירה ואין SKUs כבר, נעביר ערכי default ל־modal
       * כך: במצב שבו כבר קיימים SKUs, המודאל יפתח שדות ריקים כפי שביקשת
       */}
      <AddSKUModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
        onCheckAvailability={
          onCheckAvailability
            ? (skuCode) => onCheckAvailability(skuCode)
            : undefined
        }
        existingSkus={value}
        onUploadImages={onUploadImages}
        initialSku={mode === 'create' && value.length === 0 ? buildDefaultSku() : undefined}
      />

      {/* דיאלוג מחיקה */}
      <ConfirmDialog
        isOpen={deletingIndex !== null}
        title="מחיקת SKU"
        message={`האם אתה בטוח שברצונך למחוק את SKU "${
          deletingIndex !== null ? value[deletingIndex]?.name : ''
        }"?`}
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingIndex(null)}
      />
    </div>
  );
};

export default ProductSKUs;
