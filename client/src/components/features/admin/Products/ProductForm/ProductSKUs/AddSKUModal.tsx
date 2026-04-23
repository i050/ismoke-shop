// Add SKU Modal Component
// מטרת הקומפוננטה: מודאל להוספת SKU חדש

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Modal from '../../../../../ui/Modal';
import { Input } from '../../../../../ui/Input';
import { ColorSelect } from '../../../../../ui/ColorSelect';
import { Collapsible } from '../../../../../ui/Collapsible';
import ImageGalleryManager from '../../../../../ui/ImageGalleryManager';
import type { SKUFormData } from '../../../../../../schemas/productFormSchema';
import { defaultSKUValues } from '../../../../../../schemas/productFormSchema';
import { FilterAttributeService } from '../../../../../../services/filterAttributeService';
import type { FilterAttribute } from '../../../../../../services/filterAttributeService';
import { PRODUCT_IMAGE_UPLOAD_MAX_FILE_SIZE_BYTES } from '../../../../../../config/imageUpload';
import styles from './AddSKUModal.module.css';
import { detectColorFamily } from '../../../../../../utils/colorUtils';
import { Palette, FileText, DollarSign, Image as ImageIcon } from 'lucide-react';
import { useConfirm } from '../../../../../../hooks/useConfirm';

/**
 * Props של קומפוננטת AddSKUModal
 */
interface AddSKUModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (sku: SKUFormData) => void;
  onCheckAvailability?: (skuCode: string) => Promise<boolean>;
  existingSkus: SKUFormData[];
  onUploadImages?: (files: File[], sku: string) => Promise<Array<{
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
  }>>;
  /** ערכי התחלה למילוי מראש של הטופס - לשימוש בפתיחה אוטומטית */
  initialSku?: Partial<SKUFormData>;
}

/**
 * קומפוננטת AddSKUModal
 * מודאל להוספת SKU חדש עם כל השדות הנדרשים
 */
const AddSKUModal: React.FC<AddSKUModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onCheckAvailability,
  existingSkus,
  onUploadImages,
  initialSku, // ערכי התחלה למילוי מראש
}) => {
  // Hook for confirmations
  const confirm = useConfirm();
  
  /**
   * 🔧 Helper function ליצירת עותק עמוק של SKU עם מערך תמונות נפרד
   * מונע שיתוף reference בין SKUs שונים
   */
  const createSkuWithDeepCopy = (base: Partial<SKUFormData>, override?: Partial<SKUFormData>): SKUFormData => {
    const merged = { ...base, ...override };
    return {
      ...merged,
      images: merged.images ? merged.images.map(img => ({ ...img })) : [],
      attributes: merged.attributes ? { ...merged.attributes } : {},
    } as SKUFormData;
  };

  // State לנתוני SKU חדש - משלב ערכי ברירת מחדל עם initialSku אם סופק
  // 🔧 עותק עמוק כדי למנוע שיתוף reference של מערך תמונות
  const [newSKU, setNewSKU] = useState<SKUFormData>(() => 
    createSkuWithDeepCopy(defaultSKUValues, initialSku)
  );

  // State לבדיקת זמינות
  const [checkingSKU, setCheckingSKU] = useState(false);
  const [skuAvailable, setSkuAvailable] = useState<boolean | null>(null);

  // State לשגיאות
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // 🆕 State למאפייני סינון
  const [filterAttributes, setFilterAttributes] = useState<FilterAttribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [missingAttributes, setMissingAttributes] = useState<string[]>([]); // אזהרות
  const [selectedColorFamily, setSelectedColorFamily] = useState<string | null>(null); // משפחת צבע נבחרת
  const [matchedColorVariant, setMatchedColorVariant] = useState<{ name?: string; hex?: string } | null>(null);
  const [detectionMethod, setDetectionMethod] = useState<'exact' | 'name' | 'fuzzy' | 'none'>('none');
  const [detectionScore, setDetectionScore] = useState<number | null>(null);
  // TODO: הצג detectionMethod ו-detectionScore ב-UI (אינדיקטור אמון)
  void detectionMethod; void detectionScore; // שמורים לעתיד

  /**
   * 🆕 טעינת מאפייני הסינון מהשרת
   * נטען רק כשהמודאל נפתח
   * משתמש ב-getAttributesForFilter (ציבורי) במקום getAllAttributes
   */
  useEffect(() => {
    const loadAttributes = async () => {
      if (!isOpen) return;

      try {
        setLoadingAttributes(true);
        // Admin UI: נטען את כל המאפיינים מהשרת (כולל unused)
        // כדי שהמנהל יראה את המאפיינים מיד לאחר יצירתם בדף הניהול
        const attrs = await FilterAttributeService.getAllAttributes();
        setFilterAttributes(attrs);
        console.log('✅ נטענו מאפיינים (כלליים):', attrs.length);
      } catch (error) {
        console.error('❌ שגיאה בטעינת מאפיינים:', error);
        // לא חוסמים - ממשיכים גם אם נכשל
      } finally {
        setLoadingAttributes(false);
      }
    };

    loadAttributes();
  }, [isOpen]);

  /**
   * 🔧 עדכון הטופס כשהמודאל נפתח עם initialSku חדש
   * זה חיוני כדי שכל פעם שמוסיפים SKU חדש, קוד SKU אחר יוצר
   * (למשל PRODUCTNAME-001, אחר כך PRODUCTNAME-002, וכו')
   * 🔧 משתמש ב-createSkuWithDeepCopy למניעת שיתוף reference
   */
  useEffect(() => {
    if (isOpen) {
      // כשהמודאל נפתח, אתחל את הטופס עם ה-initialSku החדש (עותק עמוק)
      setNewSKU(createSkuWithDeepCopy(defaultSKUValues, initialSku));
      setErrors({});
      setSkuAvailable(null);
      console.log('🔄 עדכון initialSku בטופס:', initialSku?.sku);
    }
  }, [isOpen, initialSku]);

  /**
   * �🎨 הוספת צבעי רקע דינמית לאלמנטי צבע
   * מפתרון לבעיית inline styles - משתמש ב-data attributes
   */
  useEffect(() => {
    // הוסף צבעים ל-color dots
    document.querySelectorAll(`.${styles.colorDot}[data-color]`).forEach((dot) => {
      const colorValue = (dot as HTMLElement).getAttribute('data-color');
      if (colorValue) {
        (dot as HTMLElement).style.backgroundColor = colorValue;
      }
    });

    // הוסף צבעים ל-variant colors
    document.querySelectorAll(`.${styles.variantColor}[data-color]`).forEach((variant) => {
      const colorValue = (variant as HTMLElement).getAttribute('data-color');
      if (colorValue) {
        (variant as HTMLElement).style.backgroundColor = colorValue;
      }
    });
  }, [filterAttributes, selectedColorFamily]);

  // שמירת הצבע הקודם למניעת infinite loop
  const previousColorRef = useRef<string | null>(null);

  /**
   * 🆕 בדיקה אם מאפיין מסוים קיים בוריאנטים קיימים אבל חסר בוריאנט החדש
   */
  const isAttributeMissingInExistingSkus = useCallback(
    (attributeKey: string): boolean => {
      // אם יש ערך נוכחי במאפיין הזה
      const currentValue = (newSKU.attributes as any)?.[attributeKey];
      if (currentValue) return false; // יש ערך - לא חסר

      // בדוק אם יש ערך במאפיין הזה בוריאנטים קיימים
      return existingSkus.some((existingSku) => {
        const existingValue = (existingSku.attributes as any)?.[attributeKey];
        return existingValue && existingValue !== ''; // יש ערך בוריאנט קיים
      });
    },
    [newSKU.attributes, existingSkus]
  );

  /**
   * כאשר הצבע של ה-SKU משתנה, נסמן את המשפחה המתאימה אוטומטית.
   * בדיקה לפי שם הגוון או hex (גם תמיכה ב-#HEX וב-HEX ללא #).
   * 
   * CRITICAL: משתמש ב-useRef כדי לזהות שינוי אמיתי בצבע ולאפשר שינויים חוזרים.
   */
  useEffect(() => {
    const currentColor = newSKU?.color ? String(newSKU.color) : null;
    
    // אם המשתמש בחר ידנית מקור - אל נעשה זיהוי אוטומטי
    if ((newSKU as any)?.colorFamilySource && (newSKU as any).colorFamilySource === 'manual') {
      return;
    }

    // בדיקה אם הצבע באמת השתנה (לא רק re-render)
    if (currentColor === previousColorRef.current) {
      return; // אין שינוי אמיתי, לא צריך לעדכן
    }
    
    // עדכון הצבע הקודם
    previousColorRef.current = currentColor;

    if (!currentColor) {
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
      // עדכן את שדה colorFamily בטופס ישירות (בלי התייחסות ל-wrapped handleChange)
      setNewSKU((prev) => ({ ...prev, colorFamily: detection.family }));
    } else {
      setSelectedColorFamily(null);
      setMatchedColorVariant(null);
      setDetectionMethod('none');
      setDetectionScore(null);
      setNewSKU((prev) => ({ ...prev, colorFamily: undefined } as any));
    }
  }, [newSKU?.color, filterAttributes]);

  /**
   * איפוס הטופס - חזרה לערכי ברירת מחדל או initialSku אם סופק
   * 🔧 משתמש ב-createSkuWithDeepCopy למניעת שיתוף reference
   */
  const resetForm = useCallback(() => {
    setNewSKU(createSkuWithDeepCopy(defaultSKUValues, initialSku));
    setErrors({});
    setSkuAvailable(null);
  }, [initialSku]);

  /**
   * סגירת המודאל
   */
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  /**
   * שינוי ערך בשדה
   */
  const handleChange = useCallback(
    (field: keyof SKUFormData, value: any) => {
      setNewSKU((prev) => ({
        ...prev,
        [field]: value,
      }));

      // ניקוי שגיאה של השדה
      if (errors[field]) {
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated[field];
          return updated;
        });
      }

      // איפוס בדיקת זמינות אם שינו את קוד ה-SKU
      if (field === 'sku') {
        setSkuAvailable(null);
      }
    },
    [errors]
  );

  /**
   * שינוי צבע - כתיבה לשדה שטוח color
   */
  const handleColorChange = useCallback((color: string) => {
    setNewSKU((prev) => ({
      ...prev,
      color,
    }));
  }, []);

  // אין צורך ב-handleSizeChange ייעודי - גודל מטופל דינמית דרך attributes

  /**
   * 🆕 בודק אילו מאפיינים חסרים - גרסה דינמית
   * מחזיר רשימה לאזהרה - לא חוסם שמירה!
   * 
   * הערה חשובה: SKU במערכת שלנו משתמש ב-Flat Attributes Pattern:
   * - color, size - שדות שטוחים ברמה עליונה
   * - attributes - אובייקט גמיש למאפיינים נוספים (material, weight וכו')
   */
  const checkMissingAttributes = useCallback(() => {
    const missing: string[] = [];

    filterAttributes.forEach((attr) => {
      // רק מאפיינים שמסומנים כ-required
      if (!attr.isRequired) return;

      const key = attr.key;

      // בדיקה דינמית לפי סוג המאפיין
      if (key === 'color') {
        // color יכול להיות ב-color (שדה שטוח) או ב-colorFamily
        if (!newSKU.color && !newSKU.colorFamily) {
          missing.push(attr.name);
        }
      } else {
        // כל מאפיין אחר נמצא ב-attributes object
        const attributes = newSKU.attributes as Record<string, any> | undefined;
        if (!attributes?.[key]) {
          missing.push(attr.name);
        }
      }
    });

    setMissingAttributes(missing);
    return missing;
  }, [filterAttributes, newSKU]);

  /**
   * בדיקת זמינות קוד SKU
   */
  const handleCheckSKU = useCallback(async () => {
    if (!newSKU.sku) return;

    // בדיקה מקומית - האם קיים ברשימה הנוכחית
    const existsLocally = existingSkus.some((s) => s.sku === newSKU.sku);
    if (existsLocally) {
      setSkuAvailable(false);
      return;
    }

    // בדיקה בשרת (אם קיימת הפונקציה)
    if (onCheckAvailability) {
      setCheckingSKU(true);
      try {
        const available = await onCheckAvailability(newSKU.sku);
        setSkuAvailable(available);
      } catch (error) {
        console.error('שגיאה בבדיקת SKU:', error);
        setSkuAvailable(false);
      } finally {
        setCheckingSKU(false);
      }
    } else {
      // אם אין פונקציה - סמן כזמין
      setSkuAvailable(true);
    }
  }, [newSKU.sku, onCheckAvailability, existingSkus]);

  /**
   * ולידציה של הטופס
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: { [key: string]: string } = {};

    // קוד SKU
    if (!newSKU.sku) {
      newErrors.sku = 'קוד SKU הוא שדה חובה';
    } else if (!/^[A-Z0-9-]+$/.test(newSKU.sku)) {
      newErrors.sku = 'קוד SKU יכול להכיל רק אותיות גדולות, מספרים ומקפים';
    } else if (newSKU.sku.length < 3) {
      newErrors.sku = 'קוד SKU חייב להכיל לפחות 3 תווים';
    } else if (existingSkus.some((s) => s.sku === newSKU.sku)) {
      newErrors.sku = 'קוד SKU זה כבר קיים';
    }

    // שם
    if (!newSKU.name) {
      newErrors.name = 'שם הוריאנט הוא שדה חובה';
    } else if (newSKU.name.length < 3) {
      newErrors.name = 'שם הוריאנט חייב להכיל לפחות 3 תווים';
    }

    // מחיר (אופציונלי אבל אם מוגדר צריך להיות חיובי)
    if (newSKU.price !== null && newSKU.price !== undefined) {
      if (newSKU.price < 0) {
        newErrors.price = 'מחיר חייב להיות מספר חיובי';
      } else if (newSKU.price > 999999) {
        newErrors.price = 'מחיר לא יכול לעלות על 999,999';
      }
    }

    // מלאי
    if (newSKU.stockQuantity < 0) {
      newErrors.stockQuantity = 'כמות במלאי לא יכולה להיות שלילית';
    } else if (newSKU.stockQuantity > 999999) {
      newErrors.stockQuantity = 'כמות במלאי לא יכולה לעלות על 999,999';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [newSKU, existingSkus]);

  /**
   * הוספת SKU
   */
  const handleAdd = useCallback(async () => {
    console.log('🔵 handleAdd called - newSKU:', newSKU);
    
    if (!validateForm()) {
      console.log('❌ Validation failed - errors:', errors);
      return;
    }

    // 🆕 בדיקת מאפיינים חסרים
    const missing = checkMissingAttributes();
    if (missing.length > 0) {
      const confirmed = await confirm({
        title: '⚠️ חסרים מאפיינים מומלצים',
        message: `חסרים: ${missing.join(', ')}\n\nמאפיינים אלו עוזרים ללקוחות לסנן ולמצוא את המוצר.\nהאם להמשיך בכל זאת בלי למלא אותם?`,
        confirmText: 'המשך בכל זאת',
        cancelText: 'חזור למילוי',
      });
      if (!confirmed) {
        console.log('⚠️ User canceled due to missing attributes');
        return;
      }
    }

    console.log('✅ Validation passed - adding SKU');
    onAdd(newSKU);
    resetForm();
    onClose();
  }, [newSKU, validateForm, checkMissingAttributes, onAdd, resetForm, onClose, errors, confirm]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="הוספת SKU חדש">
      <div className={styles.container}>
        {/* הודעת עזר כשהמודאל נפתח עם ערכים מוקדמים */}
        {/* 🆕 הצג את ההודעה רק אם באמת מולאו שדות נוספים מלבד קוד SKU (כלומר וריאנט ראשון) */}
        {initialSku && (initialSku.name || initialSku.price || (initialSku.images && initialSku.images.length > 0)) && (
          <div className={styles.helperBanner}>
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
              השדות מולאו אוטומטית מפרטי המוצר. ודא שהמלאי והתמונות נכונים לפני השמירה.
            </span>
          </div>
        )}

        {/* קוד SKU */}
        <div className={styles.field}>
          <label className={styles.label}>
            קוד SKU <span className={styles.required}>*</span>
          </label>
          <div className={styles.skuInputWrapper}>
            <Input
              type="text"
              value={newSKU.sku}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange('sku', e.target.value.toUpperCase())
              }
              placeholder="SKU-001"
              error={!!errors.sku}
              className={styles.skuInput}
            />
            {onCheckAvailability && (
              <button
                type="button"
                className={styles.checkButton}
                onClick={handleCheckSKU}
                disabled={!newSKU.sku || checkingSKU}
              >
                {checkingSKU ? 'בודק...' : 'בדוק זמינות'}
              </button>
            )}
          </div>
          {skuAvailable !== null && (
            <div
              className={`${styles.availability} ${
                skuAvailable
                  ? styles.availabilitySuccess
                  : styles.availabilityError
              }`}
            >
              {skuAvailable ? '✓ קוד SKU זמין' : '✗ קוד SKU תפוס'}
            </div>
          )}
        </div>

        {/* שם */}
        <div className={styles.field}>
          <label className={styles.label}>
            שם הוריאנט <span className={styles.required}>*</span>
          </label>
          <Input
            type="text"
            value={newSKU.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
            placeholder="למשל: אדום - גודל L"
            error={!!errors.name}
          />
        </div>

        {/* תכונות (Attributes) */}
        <div className={styles.attributesSection}>
          <h4 className={styles.sectionTitle}>תכונות</h4>

          <div className={styles.attributesGrid}>
            {/* צבע - רשימה נפתחת עם קו צבעוני */}
            <div className={styles.field}>
              <ColorSelect
                label="צבע"
                value={newSKU?.color || ''}
                onChange={handleColorChange}
                placeholder="בחר מהרשימה"
                showCustomPicker
                allowCustomHex
                helperText={newSKU.color ? `צבע נוכחי: ${newSKU.color.toUpperCase()}` : 'ניתן לבחור מהרשימה או לבחור צבע חופשי'}
              />
            </div>
          </div>
        </div>

        {/* 🆕 סקשן: בחירת צבע מבנק הצבעים - UX משופר */}
        {filterAttributes.find(attr => attr.key === 'color' && attr.valueType === 'color') && (
          <Collapsible
            title="צבע לסינון"
            icon={<Palette size={18} />}
            defaultOpen={true}
          >
            <p className={styles.hint}>
              המשפחה נבחרת אוטומטית לפי צבע הווריאנט. ניתן לשנות צבע הווריאנט כדי להתאים משפחת צבע.
            </p>
            
            {loadingAttributes ? (
              <div className={styles.loadingState}>טוען משפחות צבעים...</div>
            ) : (
              <>
                        {/* שורה: מצב זיהוי משפחת צבע - Auto / Manual */}
                        <div className={styles.familyControl}>
                          <label className={styles.label}>מקור משפחת צבע:</label>
                          <select
                            value={(newSKU as any).colorFamilySource || 'auto'}
                            onChange={(e) => {
                              const v = e.target.value as string;
                              if (v === 'auto') {
                                handleChange('colorFamilySource', 'auto');
                                // הזיהוי האוטומטי יתעדכן דרך ה-useEffect הקיים
                              } else {
                                // בחירה ידנית - נקבע את המשפחה שנבחרה
                                handleChange('colorFamilySource', 'manual');
                                handleChange('colorFamily', v);
                                setSelectedColorFamily(v);
                                // נבחר variant ראשון אם קיים
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

                        {/* הצגת משפחת צבע שנבחרה אוטומטית לפי הצבע שבחר המשתמש ברמה זו */}
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
                              {(newSKU as any).colorFamilySource === 'manual' && (
                                <span className={styles.manualTag} title="בחירה ידנית"> &nbsp; (ידני)</span>
                              )}
                              {matchedColorVariant && (
                                <span className={styles.familyVariantInfo}> — {matchedColorVariant.name || matchedColorVariant.hex}</span>
                              )}
                            </div>
                          ) : (
                            <div className={styles.noFamily}>
                              <span>לא נמצאה משפחת צבע תואמת</span>
                              <span className={styles.helper}>צור משפחת צבע בעמוד הניהול כדי לשפר סינון</span>
                            </div>
                          )}
                        </div>
              </>
            )}
          </Collapsible>
        )}

        {/* אזהרה על מאפיינים חסרים */}
        {missingAttributes.length > 0 && (
          <div className={styles.warningBox}>
            <strong>⚠️ שים לב: חסרים מאפיינים מומלצים</strong>
            <ul>
              {missingAttributes.map((attr) => (
                <li key={attr}>{attr}</li>
              ))}
            </ul>
            <p className={styles.warningNote}>
              ניתן לשמור בכל מקרה, אך מומלץ למלא את המאפיינים לשיפור חוויית הלקוח
            </p>
          </div>
        )}

        {/* מחיר ומלאי */}
        <Collapsible
          title="מחיר ומלאי"
          icon={<DollarSign size={18} />}
          defaultOpen={true}
        >
          {/* מחיר */}
          <div className={styles.field}>
            <label className={styles.label}>
              מחיר ספציפי
              <span className={styles.optional}> (אופציונלי)</span>
            </label>
            <Input
              type="number"
              value={newSKU.price !== null && newSKU.price !== undefined ? String(newSKU.price) : ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange(
                  'price',
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              placeholder="השאר ריק לשימוש במחיר בסיס"
              error={!!errors.price}
            />
            <p className={styles.helperText}>
              אם לא מוגדר, ישתמש במחיר הבסיס של המוצר
            </p>
          </div>

          {/* מלאי */}
          <div className={styles.field}>
            <label className={styles.label}>
              כמות במלאי <span className={styles.required}>*</span>
            </label>
            <Input
              type="number"
              value={String(newSKU.stockQuantity)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange('stockQuantity', parseInt(e.target.value, 10) || 0)
              }
              placeholder="0"
              error={!!errors.stockQuantity}
            />
          </div>
        </Collapsible>

        {/* תמונות */}
        <Collapsible
          title="תמונות הוריאנט"
          icon={<ImageIcon size={18} />}
          defaultOpen={false}
        >
          <ImageGalleryManager
            mode="inline"
            images={newSKU.images || []}
            onChange={(updatedImages) => {
              handleChange('images', updatedImages);
            }}
            onUpload={onUploadImages ? (files) => onUploadImages(files, newSKU.sku) : undefined}
            maxImages={5}
            maxFileSize={PRODUCT_IMAGE_UPLOAD_MAX_FILE_SIZE_BYTES}
            deleteMode="hard"
            allowReorder={true}
            showPrimaryBadge={false}
            showProgress={true}
          />
          <p className={styles.helperText}>
            תמונות ספציפיות לוריאנט זה (עד 5 תמונות)
          </p>
        </Collapsible>

        {/* סטטוס */}
        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={newSKU.isActive}
              onChange={(e) => handleChange('isActive', e.target.checked)}
              className={styles.checkbox}
            />
            <span>SKU פעיל</span>
          </label>
        </div>

        {/* כפתורי פעולה */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
          >
            ביטול
          </button>
          <button
            type="button"
            className={styles.addButton}
            onClick={handleAdd}
          >
            הוסף SKU
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddSKUModal;
