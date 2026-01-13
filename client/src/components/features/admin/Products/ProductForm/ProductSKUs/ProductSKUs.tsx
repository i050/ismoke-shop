// Product SKUs Component
// מטרת הקומפוננטה: ניהול SKUs (וריאנטים) של המוצר
// 🆕 תמיכה בתצוגה מקובצת לפי צבע
// 🆕 Phase 2: תמיכה בשני סוגי וריאנטים (צבעים / מותאמים אישית)

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { SKUFormData } from '../../../../../../schemas/productFormSchema';
import type { VariantType } from '../../../../../../types/Product';
import { Icon } from '../../../../../ui/Icon';
import SKURow from './SKURow';
import AddSKUModal from './AddSKUModal';
import ConfirmDialog from '../../../../../ui/ConfirmDialog';
import ColorGroupedView from './ColorGroupedView';
import CustomVariantsView from './CustomVariantsView'; // 🆕 Phase 3: וריאנטים מותאמים אישית
import styles from './ProductSKUs.module.css';

/** סוג תצוגת SKUs */
type ViewMode = 'flat' | 'grouped';

/**
 * פונקציה ליצירת קוד SKU בסיסי מתוך שם המוצר
 * הופכת את השם לאותיות גדולות, מחליפה רווחים במקפים, ומסירה תווים לא תקינים
 * מסירה תווים עבריים כי SKU חייב להיות באנגלית בלבד (A-Z, 0-9, -)
 * @param name - שם המוצר
 * @returns קוד SKU בסיסי ללא מספר סידורי (לדוגמה: MINICAN4PLUS)
 */
export const generateSkuFromName = (name: string): string => {
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
 * פונקציה ליצירת קוד SKU הבא עם מספר סידורי
 * בודקת את כל ה-SKUs הקיימים ומוצאת את המספר הבא הפנוי
 * 🔧 שיפור: מחפשת את המספר הסידורי הגבוה ביותר בכל ה-SKUs (ללא קשר ל-prefix)
 * זה פותר בעיה שבה שינוי שם מוצר יוצר קודים כפולים
 * @param baseName - שם המוצר (לדוגמה: "Minican 4 plus")
 * @param existingSkus - רשימת ה-SKUs הקיימים
 * @returns קוד SKU ייחודי עם מספר סידורי (לדוגמה: MINICAN4PLUS-001)
 */
export const generateNextSkuCode = (baseName: string, existingSkus: SKUFormData[] = []): string => {
  // יצירת prefix מהשם
  const prefix = generateSkuFromName(baseName);
  
  // אם אין SKUs קיימים, החזר את הראשון
  if (existingSkus.length === 0) {
    return `${prefix}-001`;
  }
  
  // 🔧 שיפור: מצא את כל המספרים הסידוריים בכל ה-SKUs (לא רק עם prefix מדויק)
  // זה מונע כפילויות כאשר משנים את שם המוצר
  // דוגמה: אם יש MINICAN4-001, MINICAN4-002 והשם השתנה ל-"Minican 4 Plus"
  // הקוד הבא יהיה MINICAN4PLUS-003 ולא MINICAN4PLUS-001
  const existingNumbers = existingSkus
    .map(sku => sku.sku)
    .filter(code => code) // רק SKUs תקינים
    .map(code => {
      // חילוץ המספר הסידורי מסוף הקוד (אחרי המקף האחרון)
      const match = code.match(/-0*(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num) && num > 0); // רק מספרים תקינים וחיוביים
  
  // מצא את המספר הבא - המקסימום מכל ה-SKUs + 1
  const nextNumber = existingNumbers.length > 0 
    ? Math.max(...existingNumbers) + 1 
    : 1;
  
  // החזר קוד עם מספר תלת-ספרתי
  return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
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
  /** 🆕 ציר וריאנט משני - null = ללא תת-וריאנט (רק צבעים) */
  secondaryVariantAttribute?: string | null;
  /** 🆕 callback לשינוי ציר משני */
  onSecondaryVariantAttributeChange?: (attr: string | null) => void;

  // ============================================================================
  // 🆕 Phase 2: Dual Variant System Props
  // ============================================================================

  /** 🆕 סוג מערכת הוריאנטים: 'color' | 'custom' | null */
  variantType?: VariantType;
  /** 🆕 callback לשינוי סוג וריאנט */
  onVariantTypeChange?: (type: VariantType) => void;
  /** 🆕 תווית הוריאנט הראשי */
  primaryVariantLabel?: string;
  /** 🆕 callback לשינוי תווית ראשית */
  onPrimaryVariantLabelChange?: (label: string) => void;
  /** 🆕 תווית הוריאנט המשני */
  secondaryVariantLabel?: string;
  /** 🆕 callback לשינוי תווית משנית */
  onSecondaryVariantLabelChange?: (label: string) => void;
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
  secondaryVariantAttribute, // 🆕 ציר משני
  onSecondaryVariantAttributeChange, // 🆕 callback לשינוי
  // 🆕 Phase 2: Dual Variant System Props
  variantType = null,
  onVariantTypeChange,
  // 🆕 Phase 3: props לוריאנטים מותאמים אישית
  primaryVariantLabel,
  onPrimaryVariantLabelChange,
  secondaryVariantLabel,
  onSecondaryVariantLabelChange,
}) => {
  // State לעריכה
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [originalSKU, setOriginalSKU] = useState<SKUFormData | null>(null);

  // State למודאל הוספה
  const [showAddModal, setShowAddModal] = useState(false);

  // State למחיקה
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // 🆕 State לתצוגה מקובצת/שטוחה
  // 🔒 ברירת מחדל: 'grouped' - המנהל יראה רק תצוגה מקובצת (כפתורי ה-toggle מוסתרים)
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  
  // 🆕 State לאזהרת יצירת וריאנטים
  const [showVariantTypeWarning, setShowVariantTypeWarning] = useState(false);
  const [pendingVariantType, setPendingVariantType] = useState<VariantType | null>(null);
  
  // Ref למעקב אחרי פתיחה אוטומטית - כדי למנוע פתיחה חוזרת
  const didAutoOpenRef = useRef<boolean>(false);
  
  /**
   * בניית defaultSku מנתוני הטופס הראשי
   * משמש למילוי מראש של המודאל
   * 🆕 יוצר קוד SKU אוטומטי תמיד, אבל ממלא שאר השדות רק בוריאנט הראשון
   */
  const buildDefaultSku = useCallback((): Partial<SKUFormData> | undefined => {
    if (!productFormData) return undefined;
    
    const { name = '' } = productFormData;
    
    // אם זה הוריאנט הראשון - נמלא גם מחיר, מלאי ותמונות מהטופס הראשי
    if (value.length === 0) {
      const { basePrice = 0, stockQuantity = 0, images = [] } = productFormData;
      // 🔧 חשוב: יוצרים עותק עמוק של מערך התמונות כדי למנוע שיתוף reference
      // זה מונע בעיה שבה שינוי תמונות ב-SKU אחד משפיע על SKUs אחרים
      const imagesCopy = images ? images.map(img => ({ ...img })) : [];
      return {
        sku: generateNextSkuCode(name, value),
        name: name || 'מוצר ברירת מחדל',
        price: basePrice || null,
        stockQuantity: stockQuantity || 0,
        images: imagesCopy,
        attributes: {},
        isActive: true,
      };
    }
    
    // אם זה וריאנט נוסף - רק קוד SKU אוטומטי, שאר השדות ריקים
    return {
      sku: generateNextSkuCode(name, value),
      name: '', // שדה ריק - המשתמש ימלא
      price: null,
      stockQuantity: 0,
      images: [], // מערך חדש ריק - לא reference!
      attributes: {},
      isActive: true,
    };
  }, [productFormData, value]);

  /**
   * useEffect - פתיחה אוטומטית של מצב עריכה לוריאנט הראשוני במצב create
   * נפתח אוטומטית פעם אחת כאשר:
   * 1. mode === 'create'
   * 2. יש SKU ראשוני אחד שנוצר אוטומטית (שם ריק)
   * 3. טרם נפתח אוטומטית (didAutoOpenRef)
   * 
   * זה מאפשר למשתמש לערוך מיד את שם הוריאנט, להוסיף תמונות, וכו'
   */
  useEffect(() => {
    // תנאי לפתיחת עריכה אוטומטית לוריאנט הראשוני
    // 🆕 בודקים שם ריק במקום "וריאנט ראשוני"
    const isInitialVariant = 
      mode === 'create' &&                          // רק במצב יצירה
      value.length === 1 &&                         // יש בדיוק SKU אחד
      (value[0]?.name === '' || !value[0]?.name) && // SKU ראשוני עם שם ריק
      !didAutoOpenRef.current;                      // טרם נפתח אוטומטית
    
    if (isInitialVariant) {
      console.log('🚀 [ProductSKUs] Auto-opening initial variant for editing');
      didAutoOpenRef.current = true;  // סימון שנפתח
      setEditingIndex(0);             // פתיחת הוריאנט הראשון למצב עריכה
    }
  }, [mode, value]);

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

  /**
   * 🆕 טיפול בשינוי סוג וריאנט עם אזהרה
   * אם יש SKU דיפולטיבי אחד - מציג אזהרה
   */
  const handleVariantTypeChange = useCallback((newType: VariantType) => {
    // בדיקה: האם יש SKU דיפולטיבי אחד שיימחק
    const hasDefaultSku = 
      value.length === 1 && 
      !value[0].variantName && 
      !value[0].color;

    if (hasDefaultSku && (newType === 'color' || newType === 'custom')) {
      // יש SKU דיפולטיבי - הצג אזהרה
      setPendingVariantType(newType);
      setShowVariantTypeWarning(true);
    } else {
      // אין SKU או שכבר יש וריאנטים - שנה ישירות
      onVariantTypeChange?.(newType);
    }
  }, [value, onVariantTypeChange]);

  /**
   * 🆕 אישור שינוי סוג וריאנט (אחרי אזהרה)
   */
  const handleConfirmVariantTypeChange = useCallback(() => {
    if (pendingVariantType) {
      onVariantTypeChange?.(pendingVariantType);
      // 🔧 אם עוברים לוריאנטים של צבע, עבור אוטומטית לתצוגה מקובצת
      if (pendingVariantType === 'color') {
        setViewMode('grouped');
      }
      setShowVariantTypeWarning(false);
      setPendingVariantType(null);
    }
  }, [pendingVariantType, onVariantTypeChange]);

  /**
   * 🆕 ביטול שינוי סוג וריאנט
   */
  const handleCancelVariantTypeChange = useCallback(() => {
    setShowVariantTypeWarning(false);
    setPendingVariantType(null);
  }, []);

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

  // 🔒 זיהוי סוג הוריאנטים הקיימים (למניעת שילוב color + custom)
  const hasColorVariants = value.some(sku => sku.color);
  const hasCustomVariants = value.some(sku => (sku as any).variantName);
  
  // 🚫 קביעת מתי להשבית כפתורים (לא ניתן לשלב שני סוגי וריאנטים)
  const disableColorType = hasCustomVariants; // אם יש custom → לא ניתן לעבור ל-color
  const disableCustomType = hasColorVariants; // אם יש color → לא ניתן לעבור ל-custom

  return (
    <div className={styles.container}>
      {/* ============================================================================
          🆕 Phase 2: בחירת סוג וריאנט - צבעים או מותאם אישית
          ============================================================================ */}
      {onVariantTypeChange && (
        <section className={styles.variantTypeSection}>
          <h4 className={styles.variantTypeTitle}>
            <Icon name="Settings" size={20} />
            בחר סוג וריאנטים
          </h4>
          <p className={styles.variantTypeSubtitle}>
            בחר את סוג הוריאנטים שמתאים למוצר זה
          </p>

          <div className={styles.variantTypeOptions}>
            {/* אפשרות 1: וריאנטים של צבעים */}
            <label 
              className={`${styles.variantTypeCard} ${variantType === 'color' ? styles.selected : ''} ${disableColorType ? styles.disabled : ''}`}
              title={disableColorType ? '⚠️ לא ניתן לעבור לוריאנטי צבעים - קיימים וריאנטים מותאמים אישית. למחיקת כל הוריאנטים והתחלה מחדש, מחק את כל ה-SKUs.' : ''}
            >
              <div className={styles.variantTypeCardHeader}>
                <input
                  type="radio"
                  name="variantType"
                  value="color"
                  checked={variantType === 'color'}
                  onChange={() => handleVariantTypeChange('color')}
                  className={styles.variantTypeRadio}
                  disabled={disableColorType}
                />
                <div className={styles.variantTypeIcon}>
                  <Icon name="Palette" size={20} />
                </div>
              </div>
              <div className={styles.variantTypeCardContent}>
                <h5 className={styles.variantTypeCardTitle}>וריאנטים של צבעים</h5>
                <p className={styles.variantTypeCardDescription}>
                  מוצרים עם צבעים שונים (חולצות, נעליים, תיקים)
                </p>
              </div>
              <div className={styles.variantTypeCardFeatures}>
                <span className={styles.variantTypeFeature}>
                  <Icon name="Check" size={12} />
                  כפתורי צבע בכרטיסיות
                </span>
                <span className={styles.variantTypeFeature}>
                  <Icon name="Check" size={12} />
                  סינון אוטומטי
                </span>
              </div>
              {disableColorType && (
                <div className={styles.variantTypeCardLock}>
                  <Icon name="Lock" size={16} />
                  <span>נעול - קיימים וריאנטים מותאמים</span>
                </div>
              )}
            </label>

            {/* אפשרות 2: וריאנטים מותאמים אישית */}
            <label 
              className={`${styles.variantTypeCard} ${variantType === 'custom' ? styles.selected : ''} ${disableCustomType ? styles.disabled : ''}`}
              title={disableCustomType ? '⚠️ לא ניתן לעבור לוריאנטים מותאמים - קיימים וריאנטי צבעים. למחיקת כל הוריאנטים והתחלה מחדש, מחק את כל ה-SKUs.' : ''}
            >
              <div className={styles.variantTypeCardHeader}>
                <input
                  type="radio"
                  name="variantType"
                  value="custom"
                  checked={variantType === 'custom'}
                  onChange={() => handleVariantTypeChange('custom')}
                  className={styles.variantTypeRadio}
                  disabled={disableCustomType}
                />
                <div className={styles.variantTypeIcon}>
                  <Icon name="Layers" size={20} />
                </div>
              </div>
              <div className={styles.variantTypeCardContent}>
                <h5 className={styles.variantTypeCardTitle}>וריאנטים מותאמים אישית</h5>
                <p className={styles.variantTypeCardDescription}>
                  מוצרים עם וריאנטים שאינם צבעים (טעמים, גדלים, סוגים)
                </p>
              </div>
              <div className={styles.variantTypeCardFeatures}>
                <span className={styles.variantTypeFeature}>
                  <Icon name="Check" size={12} />
                  תוויות מותאמות
                </span>
                <span className={styles.variantTypeFeature}>
                  <Icon name="Check" size={12} />
                  קישור לסינון אופציונלי
                </span>
              </div>
              {disableCustomType && (
                <div className={styles.variantTypeCardLock}>
                  <Icon name="Lock" size={16} />
                  <span>נעול - קיימים וריאנטי צבעים</span>
                </div>
              )}
            </label>
          </div>
        </section>
      )}

      {/* 🆕 הודעת מוצר פשוט/מורכב - רק במצב create */}
      {mode === 'create' && value.length === 0 && (
        <div className={styles.infoBox}>
          <div className={styles.infoIcon}><Icon name="AlertCircle" size={24} /></div>
          <div className={styles.infoContent}>
            <h4 className={styles.infoTitle}>הגדרת וריאנט</h4>
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
              : variantType === 'custom'
                ? 'נהל את הוריאנטים המותאמים אישית של המוצר'
                : 'נהל את הוריאנטים השונים של המוצר (צבעים, מידות וכו׳)'
            }
          </p>
        </div>

        {/* 🆕 Toggle בין תצוגה שטוחה למקובצת - רק לוריאנטים של צבעים */}
        {/* 🔒 HIDDEN: כפתורי ה-toggle מוסתרים - המנהל יראה רק תצוגה מקובצת */}
        {/* הקוד נשמר למקרה שנרצה להחזיר את האפשרות בעתיד */}
        {false && (variantType === 'color' || variantType === null) && (
          <div className={styles.headerActions}>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.toggleButton} ${viewMode === 'flat' ? styles.active : ''}`}
                onClick={() => setViewMode('flat')}
                title="תצוגת רשימה"
              >
                <Icon name="List" size={18} />
              </button>
              <button
                type="button"
                className={`${styles.toggleButton} ${viewMode === 'grouped' ? styles.active : ''}`}
                onClick={() => setViewMode('grouped')}
                title="תצוגה לפי צבעים"
              >
                <Icon name="Palette" size={18} />
              </button>
            </div>

            {viewMode === 'flat' && (
              <button
                type="button"
                className={styles.addButton}
                onClick={() => setShowAddModal(true)}
              >
                <Icon name="Plus" size={20} />
                <span>הוסף SKU</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============================================================================
          תצוגת וריאנטים - מותנית לפי סוג
          ============================================================================ */}
      
      {/* 🆕 Phase 3: וריאנטים מותאמים אישית */}
      {variantType === 'custom' && (
        <CustomVariantsView
          value={value}
          onChange={onChange}
          basePrice={productFormData?.basePrice || 0}
          productName={productFormData?.name || ''}
          primaryVariantLabel={primaryVariantLabel}
          onPrimaryVariantLabelChange={onPrimaryVariantLabelChange}
          secondaryVariantLabel={secondaryVariantLabel}
          onSecondaryVariantLabelChange={onSecondaryVariantLabelChange}
          onUploadImages={onUploadImages}
        />
      )}

      {/* תצוגת וריאנטים של צבעים - רק כש-variantType === 'color' */}
      {variantType === 'color' && viewMode === 'grouped' && (
        <ColorGroupedView
          value={value}
          onChange={onChange}
          basePrice={productFormData?.basePrice || 0}
          productName={productFormData?.name || ''}
          onUploadImages={onUploadImages}
          secondaryAttribute={secondaryVariantAttribute}
          onSecondaryAttributeChange={onSecondaryVariantAttributeChange}
        />
      )}

      {/* Grid של כרטיסי SKUs - תצוגה שטוחה (כולל כש-variantType === null) */}
      {/* {(variantType === 'color' || variantType === null) && (variantType === null || viewMode === 'flat') && (
        value.length > 0 ? (
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
            <Icon name="Package" size={48} />
            <p className={styles.emptyText}>אין SKUs עדיין</p>
            <p className={styles.emptySubtext}>
              לחץ על "הוסף SKU" כדי להתחיל
            </p>
          </div>
        )
      )} */}

      {/* שגיאה כללית */}
      {errors?.skus && (
        <div className={styles.globalError}>
          {typeof errors.skus === 'string' 
            ? errors.skus 
            : (errors.skus as any)?.message || 'שגיאה בוריאנטים'}
        </div>
      )}

      {/* טיפים */}
      {/* <div className={styles.tips}>
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
      </div> */}

      {/* מודאל הוספה */}
      {/**
       * 🆕 תמיד נעביר initialSku עם קוד SKU אוטומטי
       * זה יבטיח שכל וריאנט חדש יקבל קוד אוטומטי
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
        initialSku={buildDefaultSku()}
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

      {/* 🆕 דיאלוג אזהרה לפני יצירת וריאנטים */}
      <ConfirmDialog
        isOpen={showVariantTypeWarning}
        title={pendingVariantType === 'color' ? 'יצירת וריאנטים לפי צבע' : 'יצירת וריאנטים מותאמים אישית'}
        message={
          <>
            {/* <p className={styles.variantWarningParagraph}>
              <strong>שים לב:</strong> בחירה באפשרות זו תמחק את ה-SKU הקיים ותאפשר לך ליצור וריאנטים חדשים.
            </p> */}
            <p className={styles.variantWarningParagraph}>
              <strong>האם למוצר הזה יש {pendingVariantType === 'color' ? 'צבעים שונים' : 'וריאנטים (טעמים, גדלים, סוגים וכו\')'}?</strong>
            </p>
            <ul className={styles.variantWarningList}>
              <li><strong>כן</strong> - לחץ "המשך" כדי ליצור וריאנטים</li>
              <li><strong>לא</strong> - לחץ "ביטול" ושמור את המוצר כפי שהוא (SKU יחיד)</li>
            </ul>
            {/* <p className={styles.variantWarningHint}>
              💡 מוצר עם SKU יחיד מתאים למוצרים ללא וריאנטים (לדוגמה: מוצר במחיר אחד וללא אפשרויות בחירה)
            </p> */}
          </>
        }
        confirmText="המשך"
        cancelText="ביטול"
        variant="warning"
        onConfirm={handleConfirmVariantTypeChange}
        onCancel={handleCancelVariantTypeChange}
      />
    </div>
  );
};

export default ProductSKUs;
