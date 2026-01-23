// Product SKUs Component
// מטרת הקומפוננטה: ניהול SKUs (וריאנטים) של המוצר
// 🆕 גרסה חדשה: זרימה בדף אחד (ללא קפיצות) - בחירת מאפיינים → רשת → AutoFill Accordion

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { SKUFormData } from '../../../../../../schemas/productFormSchema';
import type { VariantType } from '../../../../../../types/Product';
import { Icon } from '../../../../../ui/Icon';
import SKURow from './SKURow';
import AddSKUModal from './AddSKUModal';
import ConfirmDialog from '../../../../../ui/ConfirmDialog';
import { VariantAttributesInline, type SelectedAttribute } from './VariantAttributesInline';
import CombinationsGrid, { type Combination, type AxisValue } from './CombinationsGrid';
import { AutoFillPanel } from './AutoFillPanel';
import { FilterAttributeService } from '../../../../../../services/filterAttributeService';
import styles from './ProductSKUs.module.css';

/** 🆕 מצבי זרימה מפושטים - יצירה או ניהול */
type VariantFlowStep = 'create' | 'manage';

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
    images?: SKUFormData['images'];
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

  /** 🆕 חשיפת צבעים שנבחרו בזרימת הוריאנטים (לפני יצירת SKUs) */
  onDraftColorsChange?: (colors: Array<{ color: string; colorHex?: string; colorFamily?: string }>) => void;
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
  onDraftColorsChange,
  // 🆕 הוספת callbacks לשמירת שמות הצירים
  primaryVariantLabel, // ✅ הוספת ערך ציר ראשי
  onPrimaryVariantLabelChange,
  secondaryVariantLabel, // ✅ הוספת ערך ציר משני
  onSecondaryVariantLabelChange,
  onVariantTypeChange,
}) => {
  // State לעריכה
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [originalSKU, setOriginalSKU] = useState<SKUFormData | null>(null);

  // State למודאל הוספה
  const [showAddModal, setShowAddModal] = useState(false);

  // State למחיקה
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // ============================================================================
  // 🆕 Inline Variant Flow - State חדש
  // ============================================================================
  
  /** מצב זרימה: create (יצירת וריאנטים) או manage (ניהול קיימים) */
  const [variantFlowStep, setVariantFlowStep] = useState<VariantFlowStep>(
    // אם כבר יש SKUs, נתחיל בשלב ניהול; אחרת נתחיל בשלב יצירה
    () => value.length > 0 ? 'manage' : 'create'
  );
  
  /** מאפיינים נבחרים (עד 2) */
  const [selectedVariantAttributes, setSelectedVariantAttributes] = useState<SelectedAttribute[]>([]);
  
  /** שילובים נבחרים (A×B) */
  const [selectedCombinations, setSelectedCombinations] = useState<Combination[]>([]);
  
  /** 🆕 מצב Accordion של AutoFill (פתוח/סגור) */
  const [isAutoFillOpen, setIsAutoFillOpen] = useState(false);

  // ============================================================================
  // 🆕 Bulk Edit - עריכה מרובה
  // ============================================================================
  
  /** האם במצב עריכה מרובה */
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  
  /** קומבינציות נבחרות לעריכה מרובה */
  const [bulkEditCombinations, setBulkEditCombinations] = useState<Combination[]>([]);
  
  /** האם פאנל Bulk Edit פתוח */
  const [isBulkEditPanelOpen, setIsBulkEditPanelOpen] = useState(false);

  // ============================================================================
  // 🆕 הסרת ערך וריאנט קיים - Dialog אישור
  // ============================================================================
  
  /** ערך נעול שהמשתמש מבקש להסיר */
  const [valueToRemove, setValueToRemove] = useState<{
    value: import('./FilterAttributeValueSelector').SelectedValue;
    attributeKey: string;
  } | null>(null);
  
  /** כמות SKUs שייפגעו מהמחיקה */
  const [affectedSkusCount, setAffectedSkusCount] = useState(0);

  // ============================================================================
  // 🆕 עדכון מצב זרימה כשנטענים SKUs (חשוב לעריכת מוצר!)
  // ============================================================================
  // 🔧 FIX: השתמש ב-ref כדי לזהות האם זה mount ראשוני (טעינה מהשרת)
  // או שהמשתמש לחץ על "הוסף וריאנטים" - במקרה השני לא נדרוס את ה-state
  const initialLoadRef = React.useRef(true);
  
  useEffect(() => {
    // רק בטעינה הראשונית - אם נטענו SKUs, עבור לmanage
    if (initialLoadRef.current && value.length > 0 && variantFlowStep === 'create') {
      setVariantFlowStep('manage');
    }
    // אחרי הטעינה הראשונית, לא נתערב יותר
    initialLoadRef.current = false;
  }, [value.length]);

  // ============================================================================
  // State ישן (לתאימות אחורה - חלק ממנו עדיין בשימוש)
  // ============================================================================
  
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
   * 🆕 תמיכה בתמונות לפי ציר ראשי:
   * - אם יש צבע (sku.color) - עדכן את כל ה-SKUs עם אותו צבע
   * - אם יש שם וריאנט (sku.variantName) - עדכן את כל ה-SKUs עם אותו שם וריאנט
   * זה מאפשר "תמונה אחת לכל צבע" או "תמונה אחת לכל טעם/סוג"
   * 🔧 FIX: מוסיף variantName/subVariantName אם חסרים (חילוץ מ-name)
   */
  const handleChange = useCallback(
    (index: number, field: keyof SKUFormData, fieldValue: any) => {
      const currentSku = value[index];
      
      // 🔧 פונקציה לחילוץ variantName/subVariantName מ-name אם חסרים
      const ensureVariantFields = (sku: SKUFormData): SKUFormData => {
        const skuWithVariants = { ...sku };
        
        // אם חסר variantName או subVariantName - נחלץ מ-name
        if (sku.name && sku.name.includes(' - ')) {
          const [variant, subVariant] = sku.name.split(' - ');
          if (!(sku as any).variantName) {
            (skuWithVariants as any).variantName = variant.trim();
          }
          if (!(sku as any).subVariantName && subVariant) {
            (skuWithVariants as any).subVariantName = subVariant.trim();
          }
        }
        
        return skuWithVariants;
      };
      
      // 🆕 אם זה שינוי תמונות - עדכן את כל ה-SKUs עם אותו ציר ראשי
      if (field === 'images') {
        // זיהוי ציר ראשי: color או variantName (עם fallback לחילוץ מ-name)
        const skuWithVariants = ensureVariantFields(currentSku);
        const primaryAxisValue = skuWithVariants?.color || (skuWithVariants as any)?.variantName;
        const primaryAxisField = skuWithVariants?.color ? 'color' : 'variantName';
        
        if (primaryAxisValue) {
          const updated = value.map((sku) => {
            // וידוא ש-SKU כולל את השדות לפני בדיקה
            const skuChecked = ensureVariantFields(sku);
            
            // אם ל-SKU יש אותו ערך בציר הראשי - עדכן גם אותו
            const skuAxisValue = primaryAxisField === 'color' ? skuChecked.color : (skuChecked as any).variantName;
            if (skuAxisValue === primaryAxisValue) {
              return { ...skuChecked, images: fieldValue };
            }
            return skuChecked; // 🔧 FIX: החזר SKU עם השדות המלאים
          });
          const affectedCount = updated.filter(s => {
            const sv = primaryAxisField === 'color' ? s.color : (s as any).variantName;
            return sv === primaryAxisValue;
          }).length;
          console.log(`🎨 עדכון תמונות לכל ה-SKUs עם ${primaryAxisField}="${primaryAxisValue}" (${affectedCount} SKUs)`);
          onChange(updated);
          return;
        }
      }
      
      // עדכון רגיל - רק ה-SKU הספציפי
      const updated = [...value];
      const skuToUpdate = ensureVariantFields(updated[index]); // 🔧 FIX: וידוא שדות לפני עדכון
      updated[index] = {
        ...skuToUpdate,
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

  // ============================================================================
  // 🆕 הסרת ערך וריאנט נעול - פונקציות
  // ============================================================================

  /**
   * ספירת SKUs שיושפעו מהסרת ערך וריאנט
   * בודק גם בציר הראשי (variantName/color) וגם בציר המשני (subVariantName)
   */
  const countAffectedSkus = useCallback((valueToCheck: string): number => {
    return value.filter(sku => {
      // בדיקה בציר ראשי
      const matchesPrimary = 
        sku.variantName === valueToCheck ||
        sku.color === valueToCheck;
      
      // בדיקה בציר משני
      const matchesSecondary = sku.subVariantName === valueToCheck;
      
      return matchesPrimary || matchesSecondary;
    }).length;
  }, [value]);

  /**
   * טיפול בבקשה להסרת ערך נעול
   * נקרא מ-FilterAttributeValueSelector דרך VariantAttributesInline
   */
  const handleDisabledValueRemoveRequest = useCallback((
    disabledValue: import('./FilterAttributeValueSelector').SelectedValue,
    attributeKey: string
  ) => {
    // ספור כמה SKUs יושפעו
    const count = countAffectedSkus(disabledValue.displayName);
    setAffectedSkusCount(count);
    setValueToRemove({ value: disabledValue, attributeKey });
  }, [countAffectedSkus]);

  /**
   * אישור הסרת ערך נעול
   * מסיר את הערך מהמאפיינים הנבחרים ומסמן את ה-SKUs הרלוונטיים כלא זמינים
   */
  const handleConfirmValueRemoval = useCallback(() => {
    if (!valueToRemove) return;

    const { value: disabledValue, attributeKey } = valueToRemove;
    const valueDisplayName = disabledValue.displayName;
    
    // 1. עדכון ה-SKUs - איפוס מלאי ל-0 (מסמן כלא זמין)
    const updatedSkus = value.map(sku => {
      const matchesPrimary = 
        sku.variantName === valueDisplayName ||
        sku.color === valueDisplayName;
      const matchesSecondary = sku.subVariantName === valueDisplayName;
      
      if (matchesPrimary || matchesSecondary) {
        return {
          ...sku,
          stockQuantity: 0, // איפוס המלאי ל-0 - סימון כלא זמין
        };
      }
      return sku;
    });
    
    // ספירת SKUs שהושפעו
    const affectedCount = updatedSkus.filter(sku => {
      const matchesPrimary = 
        sku.variantName === valueDisplayName ||
        sku.color === valueDisplayName;
      const matchesSecondary = sku.subVariantName === valueDisplayName;
      return matchesPrimary || matchesSecondary;
    }).length;
    
    // 2. עדכון המאפיינים הנבחרים - הסרת הערך
    const updatedAttributes = selectedVariantAttributes.map(sa => {
      if (sa.attribute.key === attributeKey) {
        return {
          ...sa,
          selectedValues: sa.selectedValues.filter(sv => sv.value !== disabledValue.value),
        };
      }
      return sa;
    });
    
    // 3. עדכון ה-state
    onChange(updatedSkus);
    setSelectedVariantAttributes(updatedAttributes);
    
    // 4. סגירת הדיאלוג
    setValueToRemove(null);
    setAffectedSkusCount(0);
    
    console.log(`✅ ערך "${valueDisplayName}" הוסר. ${affectedCount} SKUs סומנו כלא זמינים`);
  }, [valueToRemove, value, selectedVariantAttributes, onChange]);

  /**
   * ביטול הסרת ערך נעול
   */
  const handleCancelValueRemoval = useCallback(() => {
    setValueToRemove(null);
    setAffectedSkusCount(0);
  }, []);

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

  // ============================================================================
  // 🆕 Inline Variant Flow - Functions
  // ============================================================================

  /**
   * המרת מאפיינים נבחרים לערכי AxixValue עבור CombinationsGrid
   */
  const primaryAxisValues = useMemo((): AxisValue[] => {
    const firstAttr = selectedVariantAttributes[0];
    if (!firstAttr) return [];
    
    return firstAttr.selectedValues.map(sv => ({
      value: sv.value,
      displayName: sv.displayName,
      hex: sv.hex,
    }));
  }, [selectedVariantAttributes]);

  const secondaryAxisValues = useMemo((): AxisValue[] => {
    const secondAttr = selectedVariantAttributes[1];
    if (!secondAttr) return [];
    
    return secondAttr.selectedValues.map(sv => ({
      value: sv.value,
      displayName: sv.displayName,
    }));
  }, [selectedVariantAttributes]);

  /** תוויות הצירים */
  const primaryAxisLabel = selectedVariantAttributes[0]?.attribute.name || 'מאפיין 1';
  const secondaryAxisLabel = selectedVariantAttributes[1]?.attribute.name || 'מאפיין 2';

  /**
   * 🆕 עדכון selectedCombinations כאשר המאפיינים משתנים
   * זה מאפשר לרשת להתעדכן בזמן אמת
   */
  const handleAttributesChange = useCallback((newAttrs: SelectedAttribute[]) => {
    setSelectedVariantAttributes(newAttrs);
    
    // יצירת שילובים אוטומטית כשיש ערכים נבחרים
    if (newAttrs.length >= 1 && newAttrs.every(sa => sa.selectedValues.length > 0)) {
      const allCombinations: Combination[] = [];
      
      if (newAttrs.length === 1 || newAttrs[1]?.selectedValues.length === 0) {
        // מצב 1D - רק ציר ראשי
        newAttrs[0].selectedValues.forEach(pv => {
          allCombinations.push({ primary: pv.value, secondary: '' });
        });
      } else {
        // מצב 2D - שני צירים
        newAttrs[0].selectedValues.forEach(pv => {
          newAttrs[1].selectedValues.forEach(sv => {
            allCombinations.push({ primary: pv.value, secondary: sv.value });
          });
        });
      }
      
      setSelectedCombinations(allCombinations);
    } else {
      setSelectedCombinations([]);
    }
  }, []);

  /**
   * 🆕 פתיחה אוטומטית של AutoFill כשיש וריאנטים נבחרים
   */
  useEffect(() => {
    if (selectedCombinations.length > 0 && !isAutoFillOpen) {
      setIsAutoFillOpen(true);
    }
  }, [selectedCombinations.length, isAutoFillOpen]);

  /** Toggle של Accordion */
  const handleToggleAutoFill = useCallback(() => {
    setIsAutoFillOpen(prev => !prev);
  }, []);

  /**
   * סיום AutoFill - יצירת/עדכון SKUs
   * 🔧 במצב יצירה: יוצר SKUs חדשים
   * 🔧 במצב עריכה: מבצע merge חכם - משאיר קיימים, מוסיף חדשים, מוחק שנמחקו
   */
  const handleAutoFillGenerate = useCallback((skus: SKUFormData[]) => {
    // 🎯 זיהוי האם זה מצב עריכה או יצירה
    const isEditMode = value.length > 0;
    
    if (isEditMode) {
      // 🔧 מצב עריכה - merge חכם
      
      const isColorFlow = selectedVariantAttributes[0]?.attribute.valueType === 'color';
      
      // 🔧 פונקציה לחילוץ variantName/subVariantName מה-name
      const extractVariantsFromName = (sku: SKUFormData) => {
        if (sku.name && sku.name.includes(' - ')) {
          const [variant, subVariant] = sku.name.split(' - ');
          return { variantName: variant.trim(), subVariantName: subVariant.trim() };
        }
        return { variantName: null, subVariantName: null };
      };
      
      // יצירת מפת SKUs קיימים לפי מזהה ייחודי
      const existingSkusMap = new Map<string, SKUFormData>();
      value.forEach(sku => {
        let key: string;
        if (isColorFlow) {
          const color = sku.color || sku.colorHex;
          // 🔧 FIX: נסה לקחת subVariantName גם מהשדה הישיר וגם מ-name
          const sub = (sku as any).subVariantName || sku.attributes?.size || extractVariantsFromName(sku).subVariantName || '';
          key = `${color}_${sub}`;
        } else {
          // 🔧 חילוץ מ-name אם אין variantName ישיר
          const vn = (sku as any).variantName || extractVariantsFromName(sku).variantName;
          const svn = (sku as any).subVariantName || extractVariantsFromName(sku).subVariantName;
          key = `${vn}_${svn || ''}`;
        }
        existingSkusMap.set(key, sku);
      });
      
      // יצירת מפת SKUs חדשים
      const newSkusMap = new Map<string, SKUFormData>();
      skus.forEach(sku => {
        const key = isColorFlow 
          ? `${sku.color || sku.colorHex}_${sku.subVariantName || sku.attributes?.size || ''}`
          : `${sku.variantName}_${sku.subVariantName || ''}`;
        newSkusMap.set(key, sku);
      });
      
      // 🎯 בניית רשימת SKUs סופית
      const finalSkus: SKUFormData[] = [];
      
      // 1️⃣ שמירת SKUs קיימים שעדיין נבחרו (עדכון מחירים ומלאים אם צריך)
      existingSkusMap.forEach((existingSku, key) => {
        if (newSkusMap.has(key)) {
          // 🔧 FIX: אם ה-SKU הקיים לא כולל variantName/subVariantName - נחלץ אותם מ-name
          if (!isColorFlow && (!(existingSku as any).variantName || !(existingSku as any).subVariantName)) {
            const extracted = extractVariantsFromName(existingSku);
            if (extracted.variantName) {
              (existingSku as any).variantName = extracted.variantName;
            }
            if (extracted.subVariantName) {
              (existingSku as any).subVariantName = extracted.subVariantName;
            }
          }
          // 🔧 FIX: גם בזרימת צבעים - אם יש ציר משני (subVariantName) שלא נשמר
          if (isColorFlow && !(existingSku as any).subVariantName) {
            const extracted = extractVariantsFromName(existingSku);
            if (extracted.subVariantName) {
              (existingSku as any).subVariantName = extracted.subVariantName;
            }
          }
          // SKU קיים ונבחר - שומרים אותו עם הנתונים הקיימים
          finalSkus.push(existingSku);
          newSkusMap.delete(key); // מסירים מרשימת החדשים
        }
        // אם לא נבחר - לא מוסיפים (מחיקה)
      });
      
      // 2️⃣ הוספת SKUs חדשים (שלא היו קיימים)
      newSkusMap.forEach(newSku => {
        finalSkus.push(newSku);
      });
      
      onChange(finalSkus);
    } else {
      // 🆕 מצב יצירה - פשוט מוסיפים
      onChange([...value, ...skus]);
    }
    
    // 🆕 שמירת שמות הצירים ל-Product
    const isColorFlow = selectedVariantAttributes[0]?.attribute.valueType === 'color';
    
    // שמירת סוג הוריאנט
    if (onVariantTypeChange) {
      onVariantTypeChange(isColorFlow ? 'color' : 'custom');
    }
    
    // שמירת שם הציר הראשי (למשל: "צבע", "התנגדות סלילים", "טעם")
    if (onPrimaryVariantLabelChange && selectedVariantAttributes[0]) {
      onPrimaryVariantLabelChange(selectedVariantAttributes[0].attribute.name);
    }
    
    // שמירת שם הציר המשני (אם יש)
    if (onSecondaryVariantLabelChange && selectedVariantAttributes[1]) {
      onSecondaryVariantLabelChange(selectedVariantAttributes[1].attribute.name);
    }
    
    setVariantFlowStep('manage');
    // איפוס ה-flow למקרה הבא
    setSelectedVariantAttributes([]);
    setSelectedCombinations([]);
    setIsAutoFillOpen(false);
  }, [value, onChange, selectedVariantAttributes, onVariantTypeChange, onPrimaryVariantLabelChange, onSecondaryVariantLabelChange]);

  // ============================================================================
  // 🆕 Bulk Edit - עריכה מרובה של וריאנטים קיימים
  // ============================================================================

  /**
   * חישוב ערכי ציר ראשי מ-SKUs קיימים
   */
  const existingPrimaryAxisValues = useMemo((): AxisValue[] => {
    if (value.length === 0) return [];
    
    const uniqueValues = new Map<string, AxisValue>();
    
    value.forEach(sku => {
      // זיהוי ערך ראשי לפי סוג
      const primaryValue = sku.colorHex ? sku.color || sku.colorHex : sku.variantName;
      if (!primaryValue) return;
      
      if (!uniqueValues.has(primaryValue)) {
        uniqueValues.set(primaryValue, {
          value: primaryValue,
          displayName: primaryValue,
          hex: (sku.colorHex ?? undefined) as string | undefined,
        });
      }
    });
    
    return Array.from(uniqueValues.values());
  }, [value]);

  /**
   * חישוב ערכי ציר משני מ-SKUs קיימים
   */
  const existingSecondaryAxisValues = useMemo((): AxisValue[] => {
    if (value.length === 0) return [];
    
    const uniqueValues = new Map<string, AxisValue>();
    
    value.forEach(sku => {
      // זיהוי ערך משני - מ-attributes.size או subVariantName
      const secondaryValue = sku.attributes?.size || sku.subVariantName;
      if (!secondaryValue) return;
      
      if (!uniqueValues.has(secondaryValue)) {
        uniqueValues.set(secondaryValue, {
          value: secondaryValue,
          displayName: secondaryValue,
        });
      }
    });
    
    return Array.from(uniqueValues.values());
  }, [value]);

  /**
   * תוויות צירים לעריכה מרובה
   */
  const bulkEditPrimaryLabel = useMemo(() => {
    // בדיקה אם ה-SKUs הם מסוג צבע או וריאנט מותאם
    if (value.some(sku => sku.colorHex)) return 'צבע';
    if (value.some(sku => sku.variantName)) return 'וריאנט';
    return 'ציר ראשי';
  }, [value]);

  const bulkEditSecondaryLabel = useMemo(() => {
    if (value.some(sku => sku.attributes?.size)) return 'מידה';
    if (value.some(sku => sku.subVariantName)) return 'תת-וריאנט';
    return 'ציר משני';
  }, [value]);

  /**
   * מפות ערכים לעריכה מרובה
   */
  const bulkEditPrimaryValuesMap = useMemo(() => {
    const map = new Map<string, { displayName: string; hex?: string; family?: string }>();
    value.forEach(sku => {
      const primaryValue = sku.colorHex ? sku.color || sku.colorHex : sku.variantName;
      if (primaryValue && !map.has(primaryValue)) {
        map.set(primaryValue, {
          displayName: primaryValue,
          hex: (sku.colorHex ?? undefined) as string | undefined,
          family: (sku.colorFamily ?? undefined) as string | undefined,
        });
      }
    });
    return map;
  }, [value]);

  /**
   * מעבר למצב עריכה מרובה
   */
  const handleEnterBulkEditMode = useCallback(() => {
    setIsBulkEditMode(true);
    setBulkEditCombinations([]);
    setIsBulkEditPanelOpen(false);
  }, []);

  /**
   * יציאה ממצב עריכה מרובה
   */
  const handleExitBulkEditMode = useCallback(() => {
    setIsBulkEditMode(false);
    setBulkEditCombinations([]);
    setIsBulkEditPanelOpen(false);
  }, []);

  /**
   * טיפול בשינוי בחירת קומבינציות בעריכה מרובה
   */
  const handleBulkEditCombinationsChange = useCallback((newCombinations: Combination[]) => {
    setBulkEditCombinations(newCombinations);
    // פתיחה אוטומטית של הפאנל כשיש בחירה
    if (newCombinations.length > 0 && !isBulkEditPanelOpen) {
      setIsBulkEditPanelOpen(true);
    }
  }, [isBulkEditPanelOpen]);

  /**
   * Toggle של פאנל Bulk Edit
   */
  const handleToggleBulkEditPanel = useCallback(() => {
    setIsBulkEditPanelOpen(prev => !prev);
  }, []);

  /**
   * החלת שינויים על SKUs קיימים (Bulk Edit)
   */
  const handleBulkEditApply = useCallback((updatedSkus: SKUFormData[]) => {
    console.log('🆕 Bulk Edit applied:', updatedSkus);
    onChange(updatedSkus);
    // יציאה ממצב עריכה מרובה
    handleExitBulkEditMode();
  }, [onChange, handleExitBulkEditMode]);

  /**
   * 🎯 מעבר לשלב הוספת וריאנטים נוספים - גרסה חכמה
   * 
   * אם כבר יש SKUs קיימים:
   * - מזהה את המבנה הקיים (variantType, labels, attributes)
   * - טוען את המאפיינים האמיתיים מה-FilterAttributeService
   * - עובר ישירות לשלב בחירת ערכים חדשים
   * - שומר על עקביות המבנה
   * 
   * אם אין SKUs:
   * - מתחיל מאפס (בחירת סוג וריאנט)
   */
  const handleAddMoreVariants = useCallback(async () => {
    // 🆕 אם יש SKUs קיימים - נזהה את המבנה ונמלא מראש
    if (value.length > 0) {
      // 🔍 ניתוח המבנה הקיים מה-SKUs
      const firstSku = value[0];
      
      console.log('🔍 handleAddMoreVariants - firstSku:', firstSku);
      
      // 🔧 WORKAROUND: השרת לא מחזיר variantName/subVariantName בצורה ישירה
      // נחלץ אותם מה-name שמכיל "variantName - subVariantName"
      const extractVariantsFromName = (sku: SKUFormData) => {
        if (sku.name && sku.name.includes(' - ')) {
          const [variant, subVariant] = sku.name.split(' - ');
          return { variantName: variant.trim(), subVariantName: subVariant.trim() };
        }
        return { variantName: null, subVariantName: null };
      };
      
      const { variantName: extractedVariant, subVariantName: extractedSubVariant } = extractVariantsFromName(firstSku);
      
      console.log('🔍 Extracted:', { 
        extractedVariant, 
        extractedSubVariant,
        hasVariantName: !!(firstSku as any).variantName,
        hasColor: !!(firstSku as any).color,
        hasColorFamily: !!(firstSku as any).colorFamily
      });
      
      // טעינת כל המאפיינים מהשרת
      const allAttributes = await FilterAttributeService.getAllAttributes();
      
      // זיהוי המאפיינים הקיימים
      const existingAttributes: SelectedAttribute[] = [];
      
      // 🎯 הבדיקה המרכזית: האם יש colorHex? זה סימן ודאי שצבע מעורב!
      const hasColorHex = value.some(sku => !!(sku as any).colorHex);
      
      // 🔍 זיהוי מיקום הצבע (ראשי או משני) לפי ה-SKU עצמו
      // 🎯 הפתרון הנכון והוודאי:
      // - כשהצבע משני → ב-AutoFillPanel נוסף attributes['צבע']
      // - כשהצבע ראשי → אין attributes['צבע']
      const hasColorInAttributes = !!(firstSku.attributes?.['צבע']);
      
      // הציר הראשי הוא לא-צבע אם:
      // 1. יש צבע ב-attributes (= צבע משני)
      // 2. או יש variantName ואין צבע בכלל (custom variants)
      // 3. או יש extracted variant מ-name (מצב legacy ללא colorHex)
      const hasPrimaryNonColor = !!(
        hasColorInAttributes ||
        ((firstSku as any).variantName && !hasColorHex) ||
        (extractedVariant && !hasColorHex)
      );
      
      console.log('🔍 Branch decision:', { 
        hasColorHex, 
        hasPrimaryNonColor,
        hasColorInAttributes,
        attributesColor: firstSku.attributes?.['צבע'],
        variantName: (firstSku as any).variantName,
        color: (firstSku as any).color,
        subVariantName: (firstSku as any).subVariantName,
        primaryVariantLabel,
        secondaryVariantLabel
      });
      
      // ============================================================
      // 🎯 תרחיש 1: יש colorHex וגם ציר ראשי שאינו צבע
      // לדוגמה: טעם + צבע, מידה + צבע
      // ============================================================
      if (hasColorHex && hasPrimaryNonColor) {
        console.log('🎯 Branch 1: Mixed (Primary non-color + Secondary color)');
        
        // ===== ציר ראשי: variantName (טעם, מידה וכו') =====
        const uniqueVariantNames = new Set(
          value
            .map(sku => {
              if ((sku as any).variantName) return (sku as any).variantName;
              return extractVariantsFromName(sku).variantName;
            })
            .filter(Boolean)
        );
        
        // חיפוש המאפיין האמיתי
        const primaryAttr = allAttributes.find(attr => 
          attr.name === primaryVariantLabel || attr.key === 'variantName'
        );
        
        if (primaryAttr) {
          existingAttributes.push({
            attribute: primaryAttr,
            selectedValues: Array.from(uniqueVariantNames).map(vn => ({
              value: vn,
              displayName: vn,
              disabled: mode === 'edit',
            })),
          });
        } else {
          console.warn('⚠️ לא נמצא מאפיין עבור ציר ראשי:', primaryVariantLabel);
          existingAttributes.push({
            attribute: {
              _id: 'variantName-temp',
              key: 'variantName',
              name: primaryVariantLabel || 'מאפיין 1',
              type: 'text',
              description: '',
              isActive: true,
              icon: 'Tag',
              valueType: 'text',
              values: Array.from(uniqueVariantNames).map(vn => ({ value: vn, displayName: vn })),
            } as any,
            selectedValues: Array.from(uniqueVariantNames).map(vn => ({
              value: vn,
              displayName: vn,
              disabled: mode === 'edit',
            })),
          });
        }
        
        // ===== ציר משני: צבע (מ-color או subVariantName) =====
        const uniqueColors = new Map<string, { hex?: string; family?: string }>();
        value.forEach(sku => {
          // צבע יכול להיות ב-color או ב-subVariantName
          const colorName = (sku as any).color || (sku as any).subVariantName || extractVariantsFromName(sku).subVariantName;
          const hex = (sku as any).colorHex;
          if (colorName && hex && !uniqueColors.has(colorName)) {
            uniqueColors.set(colorName, {
              hex: hex,
              family: (sku as any).colorFamily,
            });
          }
        });
        
        console.log('🎨 uniqueColors (secondary):', Array.from(uniqueColors.entries()).map(([n, d]) => ({ name: n, hex: d.hex })));
        
        // חיפוש מאפיין הצבע
        const colorAttr = allAttributes.find(attr => 
          attr.key === 'color' || attr.valueType === 'color'
        );
        
        if (colorAttr) {
          // 🔧 התאמת צבעים לפי hex
          const matchedColors: any[] = [];
          
          uniqueColors.forEach((data, colorFromSku) => {
            const hex = data.hex?.toUpperCase();
            let matchedColor: any = null;
            
            if (colorAttr.colorFamilies && hex) {
              for (const family of colorAttr.colorFamilies) {
                const variant = family.variants?.find((v: any) => v.hex?.toUpperCase() === hex);
                if (variant) {
                  matchedColor = {
                    value: variant.name,
                    displayName: variant.displayName || variant.name,
                    hex: variant.hex,
                    family: family.family,
                    disabled: mode === 'edit',
                  };
                  break;
                }
              }
            }
            
            if (matchedColor) {
              matchedColors.push(matchedColor);
              console.log('✅ התאמת צבע:', colorFromSku, '→', matchedColor.value);
            } else {
              console.warn('⚠️ לא נמצאה התאמה:', colorFromSku, 'hex:', hex);
              matchedColors.push({
                value: colorFromSku,
                displayName: colorFromSku,
                hex: data.hex,
                family: data.family,
                disabled: mode === 'edit',
              });
            }
          });
          
          existingAttributes.push({
            attribute: colorAttr,
            selectedValues: matchedColors,
          });
        }
      }
      // ============================================================
      // 🎯 תרחיש 2: יש colorHex בלי ציר ראשי אחר (צבע בלבד)
      // ============================================================
      else if (hasColorHex) {
        console.log('🎯 Branch 2: Color only (no primary variant)');
        
        const uniqueColors = new Map<string, { hex?: string; family?: string }>();
        value.forEach(sku => {
          const color = (sku as any).color;
          if (color && !uniqueColors.has(color)) {
            uniqueColors.set(color, {
              hex: (sku as any).colorHex,
              family: (sku as any).colorFamily,
            });
          }
        });
        
        const colorAttr = allAttributes.find(attr => attr.key === 'color' || attr.valueType === 'color');
        
        if (colorAttr) {
          const matchedColors: any[] = [];
          
          uniqueColors.forEach((data, colorFromSku) => {
            const hex = data.hex?.toUpperCase();
            let matchedColor: any = null;
            
            if (colorAttr.colorFamilies && hex) {
              for (const family of colorAttr.colorFamilies) {
                const variant = family.variants?.find((v: any) => v.hex?.toUpperCase() === hex);
                if (variant) {
                  matchedColor = {
                    value: variant.name,
                    displayName: variant.displayName || variant.name,
                    hex: variant.hex,
                    family: family.family,
                    disabled: mode === 'edit',
                  };
                  break;
                }
              }
            }
            
            matchedColors.push(matchedColor || {
              value: colorFromSku,
              displayName: colorFromSku,
              hex: data.hex,
              family: data.family,
              disabled: mode === 'edit',
            });
          });
          
          existingAttributes.push({
            attribute: colorAttr,
            selectedValues: matchedColors,
          });
        }
        
        // 🆕 ציר משני אם יש - נבדוק גם ב-attributes (לפי secondaryLabel)
        const uniqueSubVariantNames = new Set<string>();
        value.forEach(sku => {
          // בדיקה ב-subVariantName
          if ((sku as any).subVariantName) {
            uniqueSubVariantNames.add((sku as any).subVariantName);
          }
          // 🆕 בדיקה גם ב-attributes לפי label
          const attrValue = sku.attributes?.[secondaryVariantLabel?.toLowerCase() || ''];
          if (attrValue) {
            uniqueSubVariantNames.add(attrValue);
          }
        });
        
        console.log('🔍 Branch 2 secondary:', {
          uniqueSubVariantNames: Array.from(uniqueSubVariantNames),
          secondaryVariantLabel,
          firstSkuSubVariant: (firstSku as any).subVariantName,
          firstSkuAttributes: firstSku.attributes
        });
        
        if (uniqueSubVariantNames.size > 0) {
          const secondaryAttr = allAttributes.find(attr => 
            attr.name === secondaryVariantLabel || attr.key === 'subVariantName'
          );
          if (secondaryAttr) {
            existingAttributes.push({
              attribute: secondaryAttr,
              selectedValues: Array.from(uniqueSubVariantNames).map(svn => ({
                value: svn,
                displayName: svn,
                disabled: mode === 'edit',
              })),
            });
          }
        }
      }
      // ============================================================
      // 🎯 תרחיש 3: אין colorHex - Custom Variants (טקסט בלבד)
      // ============================================================
      else if ((firstSku as any).variantName || extractedVariant) {
        console.log('🎯 Branch 3: Custom Variants (text only)');
        
        const uniqueVariantNames = new Set(
          value
            .map(sku => (sku as any).variantName || extractVariantsFromName(sku).variantName)
            .filter(Boolean)
        );
        
        const primaryAttr = allAttributes.find(attr => 
          attr.name === primaryVariantLabel || attr.key === 'variantName'
        );
        
        if (primaryAttr) {
          existingAttributes.push({
            attribute: primaryAttr,
            selectedValues: Array.from(uniqueVariantNames).map(vn => ({
              value: vn,
              displayName: vn,
              disabled: mode === 'edit',
            })),
          });
        }
        
        // ציר משני
        const uniqueSubVariantNames = new Set(
          value
            .map(sku => (sku as any).subVariantName || extractVariantsFromName(sku).subVariantName)
            .filter(Boolean)
        );
        
        if (uniqueSubVariantNames.size > 0) {
          const secondaryAttr = allAttributes.find(attr => 
            attr.name === secondaryVariantLabel || attr.key === 'subVariantName'
          );
          if (secondaryAttr) {
            existingAttributes.push({
              attribute: secondaryAttr,
              selectedValues: Array.from(uniqueSubVariantNames).map(svn => ({
                value: svn,
                displayName: svn,
                disabled: mode === 'edit',
              })),
            });
          }
        }
      }
      
      console.log('🎨 Final existingAttributes:', existingAttributes.map(a => ({
        key: a.attribute.key,
        name: a.attribute.name,
        values: a.selectedValues.map(sv => sv.value)
      })));
      
      // 🎯 עדכון ה-state עם המבנה הקיים
      setSelectedVariantAttributes(existingAttributes);
      setSelectedCombinations([]); // נאפס את הקומבינציות - המשתמש יבחר חדשות
      setIsAutoFillOpen(false);
      setVariantFlowStep('create'); // חזרה לשלב create, אבל עם מבנה קיים!
    } else {
      // אין SKUs - התחלה מאפס
      setSelectedVariantAttributes([]);
      setSelectedCombinations([]);
      setIsAutoFillOpen(false);
      setVariantFlowStep('create');
    }
  }, [value, primaryVariantLabel, secondaryVariantLabel]);

  /**
   * מפה של ערכי ציר ראשי (לשימוש ב-AutoFillPanel)
   */
  const primaryValuesMap = useMemo(() => {
    const map = new Map<string, { displayName: string; hex?: string; family?: string }>();
    selectedVariantAttributes[0]?.selectedValues.forEach(sv => {
      map.set(sv.value, {
        displayName: sv.displayName,
        hex: sv.hex,
        family: sv.family,
      });
    });
    return map;
  }, [selectedVariantAttributes]);

  /**
   * מפה של ערכי ציר משני (כולל hex ו-family לצבעים)
   */
  const secondaryValuesMap = useMemo(() => {
    const map = new Map<string, { displayName: string; hex?: string; family?: string }>();
    selectedVariantAttributes[1]?.selectedValues.forEach(sv => {
      map.set(sv.value, { 
        displayName: sv.displayName,
        hex: sv.hex,         // ← הוספת hex
        family: sv.family    // ← הוספת family
      });
    });
    return map;
  }, [selectedVariantAttributes]);

  /**
   * 🆕 צבעים שנבחרו ב-create flow (לפי הקומבינציות המסומנות)
   * מאפשר לטאב "תמונות לפי צבע" להציג צבעים גם לפני יצירת SKUs.
   * תומך גם בצבע כציר ראשי וגם כציר משני!
   */
  const draftColorsForImages = useMemo(() => {
    if (variantFlowStep !== 'create') return [];
    
    // בדיקה: האם הציר הראשי הוא צבע?
    const isPrimaryColor = selectedVariantAttributes[0]?.attribute.valueType === 'color';
    
    // 🆕 בדיקה: האם הציר המשני הוא צבע?
    const isSecondaryColor = selectedVariantAttributes[1]?.attribute.valueType === 'color';
    
    // אם אין צבעים בכלל - החזר ריק
    if (!isPrimaryColor && !isSecondaryColor) return [];
    
    // אם אין קומבינציות - החזר ריק
    if (!selectedCombinations || selectedCombinations.length === 0) return [];

    // 🎯 מקרה 1: צבע הוא ציר ראשי
    if (isPrimaryColor) {
      const uniquePrimaryKeys = Array.from(new Set(selectedCombinations.map(c => c.primary)));

      return uniquePrimaryKeys
        .map(primaryKey => {
          const info = primaryValuesMap.get(primaryKey);
          return {
            color: info?.displayName || primaryKey,
            colorHex: info?.hex,
            colorFamily: info?.family,
          };
        })
        .filter(c => !!c.color);
    }
    
    // 🆕 מקרה 2: צבע הוא ציר משני
    if (isSecondaryColor) {
      const uniqueSecondaryKeys = Array.from(new Set(selectedCombinations.map(c => c.secondary).filter(Boolean)));

      return uniqueSecondaryKeys
        .map(secondaryKey => {
          const info = secondaryValuesMap.get(secondaryKey!);
          const svValue = selectedVariantAttributes[1]?.selectedValues.find(sv => sv.value === secondaryKey);
          return {
            color: info?.displayName || secondaryKey!,
            colorHex: svValue?.hex,
            colorFamily: svValue?.family,
          };
        })
        .filter(c => !!c.color);
    }
    
    return [];
  }, [variantFlowStep, selectedVariantAttributes, selectedCombinations, primaryValuesMap, secondaryValuesMap]);

  useEffect(() => {
    onDraftColorsChange?.(draftColorsForImages);
  }, [onDraftColorsChange, draftColorsForImages]);

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
      {/* ============================================================================
          🆕 זרימה בדף אחד - ללא קפיצות בין שלבים
          ============================================================================ */}
      
      {/* כותרת */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>
            גרסאות ({value.length})
          </h3>
          <p className={styles.subtitle}>
            {variantFlowStep === 'create' && 'בחר את סוגי הגרסאות הזמינים למכירה'}
            {variantFlowStep === 'manage' && !isBulkEditMode && 'נהל את הגרסאות השונים של המוצר'}
            {variantFlowStep === 'manage' && isBulkEditMode && 'בחר גרסאות לעריכה מרובה'}
          </p>
        </div>

        {/* כפתור ניהול וריאנטים - הוספה, עריכה ומחיקה */}
        {variantFlowStep === 'manage' && value.length > 0 && !isBulkEditMode && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.addButton}
              onClick={handleAddMoreVariants}
            >
              <Icon name="Settings" size={18} />
              <span>ניהול גירסאות</span>
            </button>
          </div>
        )}

        {/* כפתור יציאה מעריכה מרובה */}
        {variantFlowStep === 'manage' && isBulkEditMode && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleExitBulkEditMode}
            >
              <Icon name="X" size={18} />
              <span>ביטול</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================================
          שלב יצירה: הכל בדף אחד - מאפיינים → רשת → הגדרות
          ============================================================================ */}
      {variantFlowStep === 'create' && (
        <div className={styles.createFlow}>
          {/* בחירת מאפיינים וערכים */}
          <VariantAttributesInline
            selectedAttributes={selectedVariantAttributes}
            onChange={handleAttributesChange}
            showContinueButton={false}
            onDisabledValueRemoveRequest={handleDisabledValueRemoveRequest}
          />

          {/* רשת השילובים - מופיעה אוטומטית כשיש ערכים */}
          {primaryAxisValues.length > 0 && (
            <div className={styles.combinationsSection}>
              <h4 className={styles.sectionHeader}>
                <Icon name="Grid3x3" size={18} />
                בחר אילו וריאנטים זמינים למכירה
              </h4>
              <p className={styles.sectionHint}>
                סמן את הוריאנטים שקיימים במלאי. וריאנטים לא מסומנים לא יווצרו.
              </p>
              
              <CombinationsGrid
                primaryValues={primaryAxisValues}
                secondaryValues={secondaryAxisValues}
                primaryLabel={primaryAxisLabel}
                secondaryLabel={secondaryAxisLabel}
                selectedCombinations={selectedCombinations}
                onChange={setSelectedCombinations}
                showColors={selectedVariantAttributes[0]?.attribute.valueType === 'color'}
              />
            </div>
          )}

          {/* פאנל AutoFill - Accordion שנפתח אוטומטית */}
          <AutoFillPanel
            isOpen={isAutoFillOpen}
            onToggle={handleToggleAutoFill}
            combinations={selectedCombinations}
            primaryLabel={primaryAxisLabel}
            secondaryLabel={secondaryAxisLabel}
            basePrice={productFormData?.basePrice || 0}
            productName={productFormData?.name || ''}
            onGenerate={handleAutoFillGenerate}
            primaryValuesMap={primaryValuesMap}
            secondaryValuesMap={secondaryValuesMap}
            variantType={selectedVariantAttributes[0]?.attribute.valueType === 'color' ? 'color' : 'custom'}
          />

          {/* כפתור חזרה לניהול אם יש כבר וריאנטים */}
          {value.length > 0 && (
            <div className={styles.backToManage}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setVariantFlowStep('manage')}
              >
                <Icon name="ChevronRight" size={16} />
                חזרה לניהול וריאנטים קיימים
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================================
          🆕 מצב עריכה מרובה - Bulk Edit
          ============================================================================ */}
      {variantFlowStep === 'manage' && isBulkEditMode && (
        <div className={styles.bulkEditSection}>
          {/* רשת השילובים לבחירה */}
          {existingPrimaryAxisValues.length > 0 && (
            <div className={styles.combinationsSection}>
              <h4 className={styles.sectionHeader}>
                <Icon name="Grid3x3" size={18} />
                בחר וריאנטים לעריכה
              </h4>
              <p className={styles.sectionHint}>
                סמן את הוריאנטים שברצונך לעדכן. לאחר מכן בחר אילו שדות לשנות.
              </p>
              
              <CombinationsGrid
                primaryValues={existingPrimaryAxisValues}
                secondaryValues={existingSecondaryAxisValues}
                primaryLabel={bulkEditPrimaryLabel}
                secondaryLabel={bulkEditSecondaryLabel}
                selectedCombinations={bulkEditCombinations}
                onChange={handleBulkEditCombinationsChange}
                showColors={value.some(sku => sku.colorHex)}
              />
            </div>
          )}

          {/* פאנל עריכה מרובה */}
          <AutoFillPanel
            isOpen={isBulkEditPanelOpen}
            onToggle={handleToggleBulkEditPanel}
            combinations={bulkEditCombinations}
            primaryLabel={bulkEditPrimaryLabel}
            secondaryLabel={bulkEditSecondaryLabel}
            basePrice={productFormData?.basePrice || 0}
            productName={productFormData?.name || ''}
            onGenerate={() => {}} // לא בשימוש במצב edit
            primaryValuesMap={bulkEditPrimaryValuesMap}
            variantType={value.some(sku => sku.colorHex) ? 'color' : 'custom'}
            mode="edit"
            existingSkus={value}
            onApplyChanges={handleBulkEditApply}
          />
        </div>
      )}

      {/* ============================================================================
          שלב 4: טבלת ניהול וריאנטים
          ============================================================================ */}
      {variantFlowStep === 'manage' && !isBulkEditMode && (
        <div className={styles.manageSection}>
          {value.length === 0 ? (
            <div className={styles.emptyState}>
              <Icon name="Package" size={48} />
              <p className={styles.emptyText}>אין וריאנטים עדיין</p>
              <p className={styles.emptySubtext}>
                לחץ על "הוסף וריאנטים" כדי להתחיל בבחירת מאפיינים
              </p>
              <button
                type="button"
                className={styles.wizardButton}
                onClick={handleAddMoreVariants}
              >
                <Icon name="Plus" size={18} />
                <span>הוסף וריאנטים</span>
              </button>
            </div>
          ) : (
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
          )}
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

      {/* מודאל הוספת SKU בודד */}
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

      {/* 🆕 דיאלוג אישור הסרת ערך וריאנט קיים */}
      <ConfirmDialog
        isOpen={valueToRemove !== null}
        title="הסרת ערך וריאנט"
        message={
          <div style={{ textAlign: 'right' }}>
            <p style={{ marginBottom: '12px', fontWeight: 500 }}>
              האם אתה בטוח שברצונך להסיר את הערך "{valueToRemove?.value.displayName}"?
            </p>
            
            {affectedSkusCount > 0 && (
              <div style={{ 
                background: '#fef3cd', 
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <p style={{ margin: 0, color: '#856404' }}>
                  ⚠️ נמצאו <strong>{affectedSkusCount}</strong> SKUs שמשתמשים בערך הזה
                </p>
              </div>
            )}
            
            <div style={{ 
              background: '#e7f3ff', 
              border: '1px solid #2196F3',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <p style={{ margin: 0, marginBottom: '8px', fontWeight: 500, color: '#1976D2' }}>
                אם תמשיך:
              </p>
              <ul style={{ margin: 0, paddingRight: '20px', color: '#1565C0' }}>
                <li>ה-{affectedSkusCount} SKUs יסומנו כ"לא זמין במלאי"</li>
                <li>לא יהיה ניתן ליצור SKUs חדשים עם ערך זה</li>
                <li>הזמנות קיימות לא יושפעו</li>
                <li>תוכל לשחזר את הערך בעתיד על ידי הוספתו מחדש</li>
              </ul>
            </div>
          </div>
        }
        confirmText="המשך והסר"
        cancelText="ביטול"
        variant="warning"
        onConfirm={handleConfirmValueRemoval}
        onCancel={handleCancelValueRemoval}
      />
    </div>
  );
};

export default ProductSKUs;
