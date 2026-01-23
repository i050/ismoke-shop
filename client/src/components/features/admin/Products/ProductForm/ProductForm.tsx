import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import ProductBasicInfo from './ProductBasicInfo';
import ProductPricing from './ProductPricing';
import ProductInventory from './ProductInventory';
import ProductImages from './ProductImages';
import ProductCategories from './ProductCategories';
import ProductSKUs, { generateNextSkuCode } from './ProductSKUs'; // ייבוא הפונקציה החדשה
import ColorFamilyImages from './ColorFamilyImages';
import ProductFilterAttributes from './ProductFilterAttributes';
import ProductSpecifications from './ProductSpecifications/ProductSpecifications';
import { ProductSEO } from './ProductSEO';
import { ProductMarketing } from './ProductMarketing';
import { ProductFormActions } from './ProductFormActions';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button, Icon } from '@/components/ui';
import { useConfirm } from '@/hooks/useConfirm';
import { productSchema, defaultProductValues, type ProductFormData } from '@/schemas/productFormSchema';
import type { Product } from '@/types/Product';
import productManagementService from '@/services/productManagementService';
import styles from './ProductForm.module.css';

/**
 * ProductForm Props
 * תכונות לטופס ניהול מוצר
 */
export interface ProductFormProps {
  /** מצב הטופס: יצירה או עריכה */
  mode: 'create' | 'edit';
  
  /** נתונים ראשוניים (רק במצב עריכה) - hasVariants יילקח מכאן */
  initialData?: Product;
  
  /** פונקציה לשמירת הטופס - מחזירה את המוצר שנוצר/העודכן (כדי לאפשר ניווט/עדכון) */
  onSubmit: (data: ProductFormData) => Promise<any>;
  
  /** פונקציה לביטול הטופס */
  onCancel: () => void;
  
  /** פונקציה למחיקת המוצר (רק במצב עריכה) */
  onDelete?: () => Promise<void>;
  
  /** פונקציה לשכפול המוצר (רק במצב עריכה) */
  onDuplicate?: () => Promise<void>;
  
  /** טאב התחלתי לפתיחה (למשל: 'skus' כשבאים מאזהרת inconsistency, 'attributes' לעריכת מאפיינים) */
  initialActiveTab?: 'basic' | 'pricing' | 'inventory' | 'images' | 'categories' | 'attributes' | 'specifications' | 'skus' | 'colorFamilyImages' | 'seo' | 'marketing';
}

/**
 * ProductForm Component
 * טופס מלא לניהול מוצר עם כל הקטעים (Basic, Pricing, Inventory, Images, Categories, SKUs)
 * 
 * תכונות:
 * - אינטגרציה עם react-hook-form + yup validation
 * - תמיכה במצב יצירה ועריכה
 * - ניהול SKUs (מצב בודד או רב-וריאנט)
 * - העלאת תמונות
 * - קטגוריות היררכיות
 * - שמירה אוטומטית של draft (localStorage)
 * - אזהרה על שינויים שלא נשמרו
 */
export const ProductForm: React.FC<ProductFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  onDuplicate,
  initialActiveTab = 'basic',
}) => {
  // ==========================================
  // State Management
  // ==========================================
  
  const confirm = useConfirm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'pricing' | 'inventory' | 'images' | 'categories' | 'attributes' | 'specifications' | 'skus' | 'colorFamilyImages' | 'seo' | 'marketing'>(initialActiveTab);
  const [globalLowStockThreshold, setGlobalLowStockThreshold] = useState<number>(5);
  
  // 🆕 hasVariants עכשיו state פנימי - נקבע מ-initialData במצב edit, או ע"י המשתמש במצב create
  const [hasVariants, setHasVariants] = useState<boolean>(initialData?.hasVariants ?? false);

  // 🆕 צבעים שנבחרו בזרימת יצירת הוריאנטים (לפני יצירת SKUs בפועל)
  const [draftVariantColors, setDraftVariantColors] = useState<Array<{ color: string; colorHex?: string; colorFamily?: string }>>([]);
  
  // טעינת סף מלאי נמוך גלובלי מהגדרות החנות
  useEffect(() => {
    const fetchGlobalThreshold = async () => {
      try {
        const { getAllSettings } = await import('@/services/settingsService');
        const response = await getAllSettings();
        if (response.success && response.data.inventory?.defaultLowStockThreshold != null) {
          setGlobalLowStockThreshold(response.data.inventory.defaultLowStockThreshold);
        }
      } catch (error) {
        console.error('Failed to fetch global low stock threshold:', error);
      }
    };
    fetchGlobalThreshold();
  }, []);

  // 🔧 FIX: עדכון hasVariants אוטומטי לפי מספר ה-SKUs שנטענו מהשרת
  // זה מבטיח שהטאב "וריאנטים" יופיע בעריכת מוצר אם יש לו SKUs
  useEffect(() => {
    const skus = initialData?.skus || [];
    if (mode === 'edit' && skus.length > 0) {
      // אם יש יותר מ-SKU אחד, או אם ה-SKU היחיד הוא וריאנט (יש לו צבע/מאפיינים)
      const hasMultipleSkus = skus.length > 1;
      const singleSkuIsVariant = skus.length === 1 && (
        skus[0].color || 
        (skus[0].attributes && Object.keys(skus[0].attributes).length > 0)
      );
      
      if (hasMultipleSkus || singleSkuIsVariant) {
        setHasVariants(true);
      }
    }
  }, [initialData, mode]);

  // ==========================================
  // React Hook Form Setup
  // ==========================================

  // 🎯 עדכון סינכרוני של הטאב הפעיל כש-initialActiveTab משתנה (למנוע "flash" לטאב ברירת מחדל)
  useLayoutEffect(() => {
    console.log('🎯 [ProductForm] initialActiveTab changed (useLayoutEffect):', initialActiveTab);
    setActiveSection(initialActiveTab);
  }, [initialActiveTab]);

  // 🎯 Scroll Spy - עדכון הטאב הפעיל לפי מיקום הגלילה
  useEffect(() => {
    const sections = [
      { id: 'basic-section', name: 'basic' as const },
      { id: 'pricing-section', name: 'pricing' as const },
      { id: 'inventory-section', name: 'inventory' as const },
      { id: 'images-section', name: 'images' as const },
      { id: 'categories-section', name: 'categories' as const },
      { id: 'attributes-section', name: 'attributes' as const },
      { id: 'specifications-section', name: 'specifications' as const },
      { id: 'skus-section', name: 'skus' as const },
      { id: 'color-family-images-section', name: 'colorFamilyImages' as const },
      { id: 'seo-section', name: 'seo' as const },
      { id: 'marketing-section', name: 'marketing' as const },
    ];

    // יצירת Intersection Observer לעקוב אחרי הקטעים
    const observer = new IntersectionObserver(
      (entries) => {
        // מציאת הקטע הנמצא ביותר בתצוגה
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        
        if (visibleEntries.length > 0) {
          // מיון לפי כמה מהקטע נמצא בתצוגה (intersectionRatio)
          const mostVisible = visibleEntries.reduce((prev, current) => 
            current.intersectionRatio > prev.intersectionRatio ? current : prev
          );
          
          // עדכון הטאב הפעיל לפי הקטע הנראה ביותר
          const section = sections.find(s => s.id === mostVisible.target.id);
          if (section) {
            setActiveSection(section.name);
          }
        }
      },
      {
        // הגדרות Observer
        threshold: [0.1, 0.3, 0.5, 0.7, 0.9], // מספר נקודות בדיקה
        rootMargin: '-80px 0px -50% 0px', // מתחשבים בגובה הניווט הצמוד
      }
    );

    // התחברות לכל הקטעים
    sections.forEach(section => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    // ניקוי בעת unmount
    return () => {
      observer.disconnect();
    };
  }, []);

  const methods = useForm<ProductFormData>({
    // TODO [TECH-DEBT]: Fix type mismatch between yup.InferType and react-hook-form
    // Issue: yup returns required fields, RHF expects optional fields
    // Solutions: 1) Migrate to Zod 2) Use Partial<ProductFormData> 3) Custom type mapping
    // Priority: Low (validation works correctly at runtime)
    // Created: Phase 5.9
    resolver: yupResolver(productSchema) as any,
    mode: 'all', // 🔧 FIX: הפעלת validation מיידי כדי שהשגיאות יוצגו מיד בפתיחת הטופס
    defaultValues: (() => {
      // *** בעברית: בונה ערכי ברירת מחדל לטופס. במצב יצירה (create)
      // ניצור וריאנט ראשוני ברירת מחדל כך שהמנהל יוכל מיד לערוך מלאי.
      // הערה: אנחנו מייצרים SKU זמני ולא משאירים שדות ריקים כדי למנוע validate מידי
      // ולספק חוויית משתמש חלקה.
      if (initialData) {
        return {
          // המרת Product קיים ל-ProductFormData - כל השדות!
          name: initialData.name || '',
          description: initialData.description || '',
          brand: null, // TODO: להוסיף brand ל-Product type
          basePrice: initialData.basePrice || 0,
          compareAtPrice: null, // TODO: להוסיף compareAtPrice ל-Product type
          // 🔧 FIX: המרת תמונות ישנות (string) לפורמט חדש (object)
          images: initialData.images?.map(img => 
            typeof img === 'string' 
              ? { url: img, public_id: '', format: '' } 
              : img
          ) || [],
          // 🔧 FIX: categoryId יכול להיות string או object - נחלץ רק את ה-_id
          categoryId: typeof initialData.categoryId === 'string' 
            ? initialData.categoryId 
            : (initialData.categoryId as any)?._id || null,
          tags: [], // TODO: להוסיף tags ל-Product type
          // 🔧 FIX: הוספת שדות מלאי מ-initialData
          sku: (initialData as any).sku || '',
          stockQuantity: initialData.quantityInStock ?? 0,
          trackInventory: (initialData as any).trackInventory ?? true,
          lowStockThreshold: (initialData as any).lowStockThreshold ?? null,
          skus: initialData.skus && initialData.skus.length > 0
            ? initialData.skus.map(sku => ({
                sku: sku.sku || '',
                name: sku.name || '',
                price: sku.price || null,
                stockQuantity: sku.stockQuantity || 0,
                // שדה שטוח - color ישירות
                // 🔧 אם אין צבע, השאר undefined (לא string ריק) כדי שהלוגיקה של hasExistingVariants תעבוד
                color: sku.color || (sku.attributes as any)?.color || undefined,
                // 🆕 קוד HEX של הצבע (לתצוגה בכפתורי הצבע)
                colorHex: (sku as any).colorHex || undefined,
                // 🆕 משפחת צבע ומקור - חשוב לשמור כדי לא לדרוס בחירה ידנית!
                colorFamily: (sku as any).colorFamily || undefined,
                colorFamilySource: (sku as any).colorFamilySource || 'auto',
                // 🔧 FIX: המרת תמונות ישנות (string) לפורמט חדש (object)
                images: sku.images?.map(img => 
                  typeof img === 'string' 
                    ? { url: img, public_id: '', format: '' } 
                    : img
                ) || [],
                isActive: sku.isActive !== undefined ? sku.isActive : true,
                // attributes מכיל מאפיינים דינמיים כמו size
                attributes: sku.attributes || {},
              }))
            : [],
          isActive: initialData.isActive !== undefined ? initialData.isActive : true,
          // מפרט טכני - specifications
          specifications: (initialData as any).specifications || [],
          // 🆕 ציר וריאנט משני - size/resistance/nicotine וכו'
          secondaryVariantAttribute: (initialData as any).secondaryVariantAttribute || null,
          // 🆕 Phase 2: Dual Variant System Fields
          variantType: (initialData as any).variantType || null,
          primaryVariantLabel: (initialData as any).primaryVariantLabel || '',
          secondaryVariantLabel: (initialData as any).secondaryVariantLabel || '',
          primaryFilterAttribute: (initialData as any).primaryFilterAttribute || '',
          secondaryFilterAttribute: (initialData as any).secondaryFilterAttribute || '',
          // 🆕 Color Family Images - תמונות לפי משפחת צבע
          colorFamilyImages: (initialData as any).colorFamilyImages || {},
          // 🆕 Color Images - תמונות לפי צבע ספציפי
          colorImages: (initialData as any).colorImages || {},
          // 🆕 hasVariants - חשוב ל-validation של SKUs
          hasVariants: initialData.hasVariants ?? false,
        };
      }

      // מצב יצירה: נבנה ערכי ברירת מחדל משופרים הכוללים SKU ראשוני
      // כדי לאפשר למנהל להתחיל למלא מלאי כבר בלי לשמור את המוצר לשרת
      // 🆕 שימוש בפונקציה generateNextSkuCode ליצירת קוד SKU מקצועי
      const initialSkuCode = generateNextSkuCode(defaultProductValues.name || 'Product', []);
      const initialSku = {
        // שילוב ערכי ברירת מחדל להגנה מפני ואלידציה מידית
        // שימו לב: price נשאר null כדי להצביע על "לא הוזן" - תוצג כ'מחיר בסיס'
        // וכאשר המשתמש ישמור את המוצר, נחליף null במחיר הבסיס בפונקציית ה-submit.
        // 🔧 אין שדה color - SKU דיפולטיבי הוא מוצר פשוט, לא וריאנט צבע
        // 🆕 שם ריק - לא מציגים "וריאנט ראשוני" למנהל
        sku: initialSkuCode,
        name: '', // SKU ברירת מחדל בלי שם - לא מוצג למנהל במוצר פשוט
        price: null,
        stockQuantity: defaultProductValues.stockQuantity ?? 0,
        attributes: {},
        images: [],
        isActive: true,
      };

      return {
        ...defaultProductValues,
        // ודא שיש לפחות SKU ראשוני לעריכה מידית
        skus: [initialSku as any],
        // 🆕 hasVariants - ברירת מחדל false (מוצר פשוט)
        hasVariants: false,
      } as any;
    })(),
  });

  const {
    handleSubmit,
    formState: { errors, isDirty, dirtyFields, isValid },
    watch,
    setValue,
    reset,
    trigger, // 🔧 FIX: להפעלת validation מיידית
  } = methods;

  // ניטור ערכים מהטופס
  // הערה: watch() ללא פרמטרים גורם ל-re-render בכל שינוי, 
  // אבל זה נדרש כדי שהקומפוננטות יקבלו את הערכים המעודכנים
  const formValues = watch();
  
  // Alias לתאימות לאחור
  const watchedName = formValues.name;
  const watchedSkus = formValues.skus;

  // 🔧 FIX: הפעלת validation מיידית בפתיחת הטופס (מצב יצירה)
  // כך המנהל יראה מיד את השגיאות לפני שהוא ממלא את השדות
  useEffect(() => {
    if (mode === 'create') {
      // הפעלת validation לשדות הקריטיים מיד (כולל קטגוריה שחובה)
      trigger(['name', 'basePrice', 'categoryId']);
    }
  }, [mode, trigger]);

  // 🔧 PERF: הסרנו useEffect שהריץ trigger בכל הקשה
  // react-hook-form עם mode: 'all' כבר מפעיל validation אוטומטית בזמן אמת

  // 🆕 עדכון אוטומטי של SKU ראשוני כשמשנים את שם המוצר
  // 🔧 PERF: שימוש ב-debounce ו-ref למניעת עדכונים מיותרים
  const skuUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // ניקוי timeout קודם
    if (skuUpdateTimeoutRef.current) {
      clearTimeout(skuUpdateTimeoutRef.current);
    }
    
    // רק במצב יצירה ועם SKU יחיד
    if (mode !== 'create' || !watchedName || watchedSkus?.length !== 1) {
      return;
    }
    
    const currentSku = watchedSkus[0];
    const isAutoGenerated = currentSku.sku.startsWith('PRODUCT-') || 
                            currentSku.name === '' || 
                            !currentSku.name;
    
    if (!isAutoGenerated) return;
    
    // 🔧 PERF: debounce של 500ms - מחכה שהמשתמש יסיים להקליד
    skuUpdateTimeoutRef.current = setTimeout(() => {
      const newSkuCode = generateNextSkuCode(watchedName, []);
      setValue('skus.0.sku', newSkuCode, { shouldDirty: false });
    }, 500);
    
    return () => {
      if (skuUpdateTimeoutRef.current) {
        clearTimeout(skuUpdateTimeoutRef.current);
      }
    };
  }, [watchedName, watchedSkus, mode, setValue]);

  // ניווט React Router - משמש לאחר יצירה כדי לעבור לדף עריכה
  const navigate = useNavigate();
  
  // 🔍 DEBUG: בדיקת formValues - מושבת לשיפור ביצועים
  // אפשר להפעיל מחדש בפיתוח עם process.env.NODE_ENV === 'development'
  
  // ⚠️ FIX: במצב edit, RHF לפעמים לא מזהה dirty נכון
  // נעקוב ידנית אחרי שינויים
  const [hasManualChanges, setHasManualChanges] = useState(false);
  
  // Wrapper ל-setValue שמסמן שינויים ידניים ומריץ validation
  const setValueWithDirty = (field: any, value: any, options?: any) => {
    setValue(field, value, { ...options, shouldDirty: true, shouldValidate: true });
    // במצב edit - תמיד מסמן כ-dirty אחרי שינוי
    if (mode === 'edit') {
      setHasManualChanges(true);
    }
  };
  
  // סימון שהיו שינויים ידניים
  useEffect(() => {
    if (mode === 'edit' && Object.keys(dirtyFields).length > 0) {
      setHasManualChanges(true);
    }
  }, [dirtyFields, mode]);
  
  // isDirty משולב - RHF או ידני
  const isFormDirty = mode === 'create' ? isDirty : (isDirty || hasManualChanges);

  // ==========================================
  // Auto-save Draft (localStorage)
  // ==========================================

  useEffect(() => {
    if (mode === 'create' && isFormDirty) {
      const draftKey = 'productFormDraft';
      const currentValues = methods.getValues();
      
      // שמירה ל-localStorage כל 5 שניות
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(draftKey, JSON.stringify(currentValues));
          console.log('Draft saved to localStorage');
        } catch (error) {
          console.error('Failed to save draft:', error);
        }
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [isFormDirty, mode, methods]);

  // מניעת pull-to-refresh בזמן יצירת מוצר
  useEffect(() => {
    if (mode === 'create') {
      // שמירת הערך המקורי
      const originalOverscrollBehavior = document.body.style.overscrollBehavior;
      
      // מניעת pull-to-refresh
      document.body.style.overscrollBehavior = 'contain';
      
      // שחזור כשיוצאים מהקומפוננטה
      return () => {
        document.body.style.overscrollBehavior = originalOverscrollBehavior;
      };
    }
  }, [mode]);

  // שחזור draft בטעינה - מושבת (לא להציג חלון קופץ)
  {/* useEffect(() => {
    const restoreDraft = async () => {
      if (mode === 'create') {
        const draftKey = 'productFormDraft';
        const savedDraft = localStorage.getItem(draftKey);
        
        if (savedDraft) {
          try {
            const draftData = JSON.parse(savedDraft);
            const shouldRestore = await confirm({
              title: 'שחזור טיוטה',
              message: 'נמצא טיוטה שמורה. האם לשחזר אותה?',
              confirmText: 'שחזר',
              cancelText: 'התעלם',
            });
            
            if (shouldRestore) {
              reset(draftData);
            } else {
              localStorage.removeItem(draftKey);
            }
          } catch (error) {
            console.error('Failed to restore draft:', error);
            localStorage.removeItem(draftKey);
          }
        }
      }
    };
    
    restoreDraft();
  }, [mode, reset, confirm]); */}

  // ==========================================
  // Handlers
  // ==========================================

  /**
   * טיפול בשליחת הטופס
   */
  const handleFormSubmit = async (data: ProductFormData) => {
    // לוג מופחת - רק במצב פיתוח
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [ProductForm] handleFormSubmit', { mode, skusCount: data.skus?.length });
    }
    
    setIsSubmitting(true);
    
    try {
      // סינון specifications ריקים - אם המשתמש הוסיף שורה ולא מילא אותה, לא נשלח אותה
      const filteredSpecifications = (data.specifications || []).filter(
        spec => spec.key.trim() !== '' && spec.value.trim() !== ''
      );

      // לפני השליחה לשרת: אם יש SKUs עם price == null, נחליף אותם במחיר הבסיס
      const payload = {
        ...data,
        specifications: filteredSpecifications,
        hasVariants, // 🆕 שליחת hasVariants לשרת לפי הבחירה בדיאלוג
        skus: (data.skus || []).map(sku => ({
          ...sku,
          price: sku.price == null ? data.basePrice ?? null : sku.price,
        })),
      } as ProductFormData;

      // קריאה ל-onSubmit: מצופה שתחזיר את המוצר שנוצר/עודכן
      const result = await onSubmit(payload);

      // ניקוי draft אחרי שמירה מוצלחת
      if (mode === 'create') {
        localStorage.removeItem('productFormDraft');
      }

      // אם מדובר ביצירה והשרת החזיר מוצר עם _id -> ננווט ל-edit
      // המטרה: לאפשר לטעון מחדש מהשרת ולוודא שה-SKUs נראים מיד
      try {
        const createdProductId = result && (result._id || result.id || result.data?.product?._id);
        if (mode === 'create' && createdProductId) {
          // *** בעברית: ניווט אוטומטי לדף עריכה של המוצר שנוצר כדי שה-UI יטען את המצב המלא ***
          navigate(`/admin/products/${createdProductId}/edit`);
          return; // לא צריך להמשיך ב-reset כי ננווט החוצה
        }
      } catch (err) {
        console.warn('Could not auto-navigate after create:', err);
      }

      // במקרה שלא ננווט - נעדכן את ה-form בערכים שהתקבלו
      reset(data, { keepValues: true });
    } catch (error) {
      console.error('Form submission error:', error);
      // שגיאה תטופל ברמה העליונה (onSubmit)
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Error handler for form validation failures
   */
  const handleFormError = (errors: any) => {
    console.error('❌ [ProductForm] Validation errors preventing submit:', errors);
    console.error('❌ Full errors JSON:', JSON.stringify(errors, null, 2));
    
    // הצג את כל השדות עם שגיאות
    Object.keys(errors).forEach(key => {
      console.error(`  - ${key}:`, errors[key]);
      console.error(`  - ${key} JSON:`, JSON.stringify(errors[key], null, 2));
      
      // אם זה שגיאה ב-SKUs, הצג פירוט
      if (key === 'skus' && Array.isArray(errors[key])) {
        errors[key].forEach((skuError: any, index: number) => {
          if (skuError) {
            console.error(`    SKU ${index}:`, skuError);
            console.error(`    SKU ${index} JSON:`, JSON.stringify(skuError, null, 2));
          }
        });
      }
    });
  };

  /**
   * טיפול בביטול הטופס
   */
  const handleCancelClick = () => {
    if (isFormDirty) {
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  const handleCancelConfirm = () => {
    // ניקוי draft
    if (mode === 'create') {
      localStorage.removeItem('productFormDraft');
    }
    
    setShowCancelConfirm(false);
    onCancel();
  };

  /**
   * טיפול במחיקת מוצר
   */
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    
    setIsSubmitting(true);
    setShowDeleteConfirm(false);
    
    try {
      await onDelete();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * טיפול בשכפול מוצר
   */
  const handleDuplicateClick = async () => {
    if (!onDuplicate) return;
    
    setIsSubmitting(true);
    
    try {
      await onDuplicate();
    } catch (error) {
      console.error('Duplicate error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // Progress Calculation
  // ==========================================

  const calculateProgress = (): number => {
    const values = methods.getValues();
    let completed = 0;
    let total = 0;

    // בדיקת שדות חובה
    const requiredFields = [
      { value: values.name, weight: 1 },
      { value: values.description, weight: 1 },
      { value: values.basePrice > 0, weight: 1 },
      { value: values.images.length > 0, weight: 1 },
      { value: values.skus.length > 0, weight: 1 },
    ];

    requiredFields.forEach(field => {
      total += field.weight;
      if (field.value) completed += field.weight;
    });

    return Math.round((completed / total) * 100);
  };

  const progress = calculateProgress();

  // Ref ל־progress fill כדי לעדכן רוחב ללא שימוש ב-inline style ב-JSX
  const progressFillRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (progressFillRef.current) {
      progressFillRef.current.style.width = `${progress}%`;
    }
  }, [progress]);

  // ==========================================
  // Image Upload Handlers - העלאת תמונות ל-Cloudinary
  // ==========================================

  /**
   * פונקציה להעלאת תמונות מוצר ל-Cloudinary
   * מעלה תמונות עם category ו-productId להתארגנות היררכית
   */
  const handleProductImagesUpload = async (files: File[]): Promise<Array<{
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
  }>> => {
    try {
      // קבלת productId מהטופס
      // הערה: category לא נשלח כרגע כי צריך להמיר מ-ObjectId ל-slug
      // TODO: להוסיף המרה של categoryId ל-slug בעתיד
      const productId = initialData?._id || `temp_${Date.now()}`;

      // העלאה ל-Cloudinary דרך ה-service (ללא category)
      const uploadedImages = await productManagementService.uploadImages(files, {
        // category: undefined, // לא שולחים עד שנמיר ObjectId ל-slug
        productId,
        isVariant: false,
      });

      return uploadedImages;
    } catch (error) {
      console.error('❌ שגיאה בהעלאת תמונות מוצר:', error);
      throw error;
    }
  };

  /**
   * פונקציה להעלאת תמונות SKU ל-Cloudinary
   * מעלה תמונות עם category, productId ו-SKU להתארגנות היררכית
   */
  const handleSKUImagesUpload = async (
    files: File[],
    sku: string
  ): Promise<Array<{
    url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
  }>> => {
    try {
      // קבלת productId מהטופס
      // הערה: category לא נשלח כרגע כי צריך להמיר מ-ObjectId ל-slug
      // TODO: להוסיף המרה של categoryId ל-slug בעתיד
      const productId = initialData?._id || `temp_${Date.now()}`;

      // העלאה ל-Cloudinary דרך ה-service עם SKU (ללא category)
      const uploadedImages = await productManagementService.uploadImages(files, {
        // category: undefined, // לא שולחים עד שנמיר ObjectId ל-slug
        productId,
        sku,
        isVariant: true,
      });

      return uploadedImages;
    } catch (error) {
      console.error(`❌ שגיאה בהעלאת תמונות SKU ${sku}:`, error);
      throw error;
    }
  };

  // ==========================================
  // JSX Render
  // ==========================================

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className={styles.form}
        noValidate
      >
        {/* Header עם כותרת ו-Progress */}
        <div className={styles.header}>
          {/* כפתור סגירה/חזרה בצד שמאל-עליון שמשתמש ב-same handler כמו כפתור הביטול */}
          <Button
            type="button"
            className={styles.closeButton}
            variant="secondary"
            size="sm"
            icon={<Icon name="ChevronLeft" size={16} />}
            iconPosition="left"
            aria-label="חזרה לרשימת המוצרים"
            onClick={handleCancelClick}
          >
            חזרה לרשימת המוצרים
          </Button>

          <div className={styles.titleSection}>
            <h2 className={styles.title}>
              {mode === 'create' 
                ? 'יצירת מוצר חדש'
                : 'עריכת מוצר'}
            </h2>
            <p className={styles.subtitle}>
              {mode === 'create'
                ? 'מלא את פרטי המוצר ובחר האם יש לו גירסאות'
                : 'ערוך את פרטי המוצר ושמור את השינויים'}
            </p>
          </div>

          {/* Progress Bar - מוסתר (לא רלוונטי) */}
          {false && (
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>התקדמות</span>
              <span className={styles.progressValue}>{progress}%</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                ref={progressFillRef}
              />
            </div>
          </div>
          )}
        </div>

        {/* Section Navigation Tabs - ניווט עם גלילה חלקה */}
        {/* 🆕 סדר שונה למוצר פשוט לעומת מוצר עם וריאנטים */}
        <div className={styles.sectionNav}>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'basic' ? styles.active : ''}`}
            onClick={() => {
              document.getElementById('basic-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setActiveSection('basic');
            }}
          >
            מידע בסיסי
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'pricing' ? styles.active : ''}`}
            onClick={() => {
              document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setActiveSection('pricing');
            }}
          >
            מחירים
          </button>
          
          {/* מוצר פשוט: מלאי אחרי מחירים */}
          {!hasVariants && (
            <button
              type="button"
              className={`${styles.navTab} ${activeSection === 'inventory' ? styles.active : ''}`}
              onClick={() => {
                document.getElementById('inventory-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveSection('inventory');
              }}
            >
              מלאי
            </button>
          )}
          
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'images' ? styles.active : ''}`}
            onClick={() => {
              document.getElementById('images-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setActiveSection('images');
            }}
          >
            תמונות
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'categories' ? styles.active : ''}`}
            onClick={() => {
              document.getElementById('categories-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setActiveSection('categories');
            }}
          >
            קטגוריות
          </button>
          
          {/* מוצר פשוט: מאפייני סינון אחרי קטגוריות */}
          {/* 🔒 מוסתר זמנית - מאפייני סינון */}
          {false && !hasVariants && (
            <button
              type="button"
              className={`${styles.navTab} ${activeSection === 'attributes' ? styles.active : ''}`}
              onClick={() => {
                document.getElementById('attributes-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveSection('attributes');
              }}
            >
              מאפייני סינון
            </button>
          )}
          
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'specifications' ? styles.active : ''}`}
            onClick={() => {
              document.getElementById('specifications-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setActiveSection('specifications');
            }}
          >
            מפרט טכני
          </button>
          
          {/* מוצר עם וריאנטים: וריאנטים → מלאי → מאפייני סינון */}
          {hasVariants && (
            <>
              <button
                type="button"
                className={`${styles.navTab} ${activeSection === 'skus' ? styles.active : ''}`}
                onClick={() => {
                  document.getElementById('skus-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActiveSection('skus');
                }}
              >
                גירסאות
              </button>
              <button
                type="button"
                className={`${styles.navTab} ${activeSection === 'colorFamilyImages' ? styles.active : ''}`}
                onClick={() => {
                  document.getElementById('color-family-images-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActiveSection('colorFamilyImages');
                }}
              >
                תמונות צבע
              </button>
              <button
                type="button"
                className={`${styles.navTab} ${activeSection === 'inventory' ? styles.active : ''}`}
                onClick={() => {
                  document.getElementById('inventory-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActiveSection('inventory');
                }}
              >
                מלאי
              </button>
              {/* 🔒 מוסתר זמנית - מאפייני סינון */}
              {false && (
              <button
                type="button"
                className={`${styles.navTab} ${activeSection === 'attributes' ? styles.active : ''}`}
                onClick={() => {
                  document.getElementById('attributes-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActiveSection('attributes');
                }}
              >
                מאפייני סינון
              </button>
              )}
            </>
          )}
          
          {/* טאבים קבועים: SEO ושיווק - מוסתרים לעת עתה */}
          {/* 
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'seo' ? styles.active : ''}`}
            onClick={() => {
              document.getElementById('seo-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setActiveSection('seo');
            }}
          >
            SEO
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'marketing' ? styles.active : ''}`}
            onClick={() => {
              document.getElementById('marketing-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setActiveSection('marketing');
            }}
          >
            שיווק
          </button>
          */}
        </div>

        {/* Form Sections - כל הקטעים מוצגים בגלילה רציפה */}
        {/* 🆕 סדר שונה למוצר פשוט לעומת מוצר עם וריאנטים */}
        <div className={styles.formContent}>
          {/* Basic Info Section */}
          <div id="basic-section" className={styles.section}>
            <ProductBasicInfo
              values={{
                name: formValues.name || '',
                subtitle: formValues.subtitle || '', // שם משני אופציונלי
                description: formValues.description || '',
                brand: formValues.brand || null,
              }}
              // TODO [TECH-DEBT]: Type assertion due to FieldError vs string mismatch
              // RHF returns FieldError objects, components expect string errors
              // Fix in Phase 7 refactoring
              errors={errors as any}
              onChange={(field, value) => setValueWithDirty(field, value)}
              disabled={isSubmitting}
            />
            
            {/* 🆕 שאלה "האם למוצר יש גירסאות?" - בתוך הטופס במקום בדיאלוג */}
            {mode === 'create' && (
              <div className={styles.variantQuestion}>
                <div className={styles.variantQuestionHeader}>
                  <Icon name="HelpCircle" size={20} />
                  <span>האם למוצר הזה יש גירסאות שונות?</span>
                </div>
                <p className={styles.variantQuestionSubtext}>
                  (כמו מידות, צבעים, חומרים וכו')
                </p>
                <div className={styles.variantQuestionOptions}>
                  <label className={`${styles.variantOption} ${!hasVariants ? styles.selected : ''}`}>
                    <input
                      type="radio"
                      name="hasVariants"
                      checked={!hasVariants}
                      onChange={() => {
                        setHasVariants(false);
                        // 🔧 FIX: סנכרון hasVariants עם הטופס ל-validation נכון
                        setValue('hasVariants', false, { shouldValidate: true });
                      }}
                      disabled={isSubmitting}
                    />
                    <div className={styles.variantOptionContent}>
                      <Icon name="Package" size={24} />
                      <div>
                        <strong>לא - מוצר פשוט</strong>
                        <span>מוצר אחד עם מחיר אחד ומלאי אחד</span>
                      </div>
                    </div>
                  </label>
                  <label className={`${styles.variantOption} ${hasVariants ? styles.selected : ''}`}>
                    <input
                      type="radio"
                      name="hasVariants"
                      checked={hasVariants}
                      onChange={() => {
                        setHasVariants(true);
                        // 🔧 FIX: סנכרון hasVariants עם הטופס ל-validation נכון
                        setValue('hasVariants', true, { shouldValidate: true });
                        // 🆕 מחיקת ה-SKU הדיפולטיבי כשבוחרים "מוצר עם וריאנטים"
                        // המנהל יוסיף וריאנטים בעצמו דרך הממשק
                        const currentSkus = formValues.skus || [];
                        // מחיקת SKUs "ריקים" (ללא שם או צבע) - אלה הדיפולטיביים
                        const realSkus = currentSkus.filter(sku => 
                          (sku.name && sku.name.trim() !== '') || 
                          (sku.color && sku.color.trim() !== '')
                        );
                        setValueWithDirty('skus', realSkus);
                      }}
                      disabled={isSubmitting}
                    />
                    <div className={styles.variantOptionContent}>
                      <Icon name="Palette" size={24} />
                      <div>
                        <strong>כן - למוצר יש גירסאות</strong>
                        <span>מוצר עם צבעים, מידות או וריאציות אחרות</span>
                      </div>
                    </div>
                  </label>
                </div>
                <p className={styles.variantQuestionTip}>
                  💡 לדוגמה: ספר הוא מוצר פשוט, חולצה עם מידות היא מוצר עם גירסאות
                </p>
              </div>
            )}
          </div>

          {/* Pricing Section */}
          <div id="pricing-section" className={styles.section}>
            <ProductPricing
              values={{
                basePrice: formValues.basePrice || 0,
                compareAtPrice: formValues.compareAtPrice || null,
              }}
              errors={errors as any}
              onChange={(field, value) => setValueWithDirty(field, value)}
              disabled={isSubmitting}
            />
          </div>

          {/* 🆕 מוצר פשוט: מלאי אחרי מחירים */}
          {!hasVariants && (
            <div id="inventory-section" className={styles.section}>
              <ProductInventory
                values={{
                  trackInventory: formValues.trackInventory ?? true,
                  lowStockThreshold: formValues.lowStockThreshold,
                }}
                globalLowStockThreshold={globalLowStockThreshold}
                skus={formValues.skus || []}
                errors={errors as any}
                onChange={(field, value) => setValueWithDirty(field as any, value)}
                onSkusChange={(updatedSkus) => setValueWithDirty('skus', updatedSkus)}
                productId={initialData?._id || null}
                disabled={isSubmitting}
                isSimpleProduct={true}
              />
            </div>
          )}

          {/* Images Section */}
          <div id="images-section" className={styles.section}>
            <ProductImages
              images={formValues.images || []}
              errors={errors as any}
              onChange={(images) => setValueWithDirty('images', images)}
              onUpload={handleProductImagesUpload}
              hasVariants={hasVariants}
              // ניווט מקצועי לטאב הוריאנטים (SKUs) - גלילה חלקה (רק למוצר עם וריאנטים)
              onNavigateToVariants={hasVariants ? () => {
                document.getElementById('skus-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveSection('skus');
              } : undefined}
            />
          </div>

          {/* Categories Section */}
          <div id="categories-section" className={styles.section}>
            <ProductCategories
              values={{
                categoryId: formValues.categoryId || null,
                tags: (formValues.tags || []).filter((tag): tag is string => tag !== undefined),
              }}
              errors={errors as any}
              onChange={(field, value) => setValueWithDirty(field, value)}
            />
          </div>

          {/* 🆕 מוצר פשוט: מאפייני סינון אחרי קטגוריות */}
          {/* 🔒 מוסתר זמנית - מאפייני סינון */}
          {false && !hasVariants && (
            <div id="attributes-section" className={styles.section}>
              <ProductFilterAttributes
                skus={formValues.skus || []}
                onSkusChange={(updatedSkus) => setValueWithDirty('skus', updatedSkus)}
                disabled={isSubmitting}
                isSimpleProduct={true}
              />
            </div>
          )}

          {/* Technical Specifications Section - מפרט טכני */}
          <div id="specifications-section" className={styles.section}>
            <ProductSpecifications
              specifications={formValues.specifications || []}
              onChange={(specs) => setValueWithDirty('specifications', specs)}
              disabled={isSubmitting}
              errors={errors as any}
            />
          </div>

          {/* 🆕 מוצר עם וריאנטים: וריאנטים → מלאי → מאפייני סינון */}
          {hasVariants && (
            <>
              {/* SKUs Section - וריאנטים */}
              <div id="skus-section" className={styles.section}>
                <ProductSKUs
                  value={formValues.skus || []}
                  onChange={(skus) => setValueWithDirty('skus', skus)}
                  errors={errors as any}
                  isSkuMode={true}
                  mode={mode}
                  onUploadImages={handleSKUImagesUpload}
                  onDraftColorsChange={setDraftVariantColors}
                  productFormData={{
                    name: formValues.name,
                    basePrice: formValues.basePrice,
                    stockQuantity: formValues.stockQuantity ?? 0,
                    images: formValues.images,
                  }}
                  secondaryVariantAttribute={formValues.secondaryVariantAttribute}
                  onSecondaryVariantAttributeChange={(attr) => setValueWithDirty('secondaryVariantAttribute', attr)}
                  // 🆕 Phase 2: Dual Variant System Props
                  variantType={formValues.variantType}
                  onVariantTypeChange={(type) => setValueWithDirty('variantType', type)}
                  primaryVariantLabel={formValues.primaryVariantLabel || undefined}
                  onPrimaryVariantLabelChange={(label) => setValueWithDirty('primaryVariantLabel', label)}
                  secondaryVariantLabel={formValues.secondaryVariantLabel || undefined}
                  onSecondaryVariantLabelChange={(label) => setValueWithDirty('secondaryVariantLabel', label)}
                />
              </div>

              {/* 🆕 Color Family Images Section - תמונות לפי משפחת צבע */}
              <div id="color-family-images-section" className={styles.section}>
                <ColorFamilyImages
                  value={(formValues as any).colorFamilyImages || {}}
                  onChange={(images) => setValueWithDirty('colorFamilyImages' as any, images)}
                  // 🆕 תמונות לפי צבע ספציפי
                  colorImagesValue={(formValues as any).colorImages || {}}
                  onColorImagesChange={(images) => setValueWithDirty('colorImages' as any, images)}
                  draftColors={draftVariantColors}
                  onUpload={(files: File[]) => handleSKUImagesUpload(files, '__COLOR_IMAGES__') as unknown as Promise<any>}
                  maxImagesPerFamily={10}
                  disabled={isSubmitting}
                  activeFamilies={(formValues.skus || []).map(sku => sku.colorFamily).filter((f): f is string => !!f)}
                  // 🆕 נתוני ה-SKUs לשליפת מידע על הצבעים
                  skus={formValues.skus || []}
                />
              </div>

              {/* Inventory Section - מלאי */}
              <div id="inventory-section" className={styles.section}>
                <ProductInventory
                  values={{
                    trackInventory: formValues.trackInventory ?? true,
                    lowStockThreshold: formValues.lowStockThreshold,
                  }}
                  globalLowStockThreshold={globalLowStockThreshold}
                  skus={formValues.skus || []}
                  errors={errors as any}
                  onChange={(field, value) => setValueWithDirty(field as any, value)}
                  onSkusChange={(updatedSkus) => setValueWithDirty('skus', updatedSkus)}
                  productId={initialData?._id || null}
                  disabled={isSubmitting}
                  isSimpleProduct={false}
                />
              </div>

              {/* Filter Attributes Section - מאפייני סינון */}
              {/* 🔒 מוסתר זמנית - מאפייני סינון */}
              {false && (
              <div id="attributes-section" className={styles.section}>
                <ProductFilterAttributes
                  skus={formValues.skus || []}
                  onSkusChange={(updatedSkus) => setValueWithDirty('skus', updatedSkus)}
                  disabled={isSubmitting}
                  isSimpleProduct={false}
                />
              </div>
              )}
            </>
          )}

          {/* SEO Section - מוסתר לעת עתה */}
          {/* 
          <div id="seo-section" className={styles.section}>
            <ProductSEO
              seoTitle={formValues.seoTitle || ''}
              seoDescription={formValues.seoDescription || ''}
              slug={formValues.slug || ''}
              productName={formValues.name || ''}
              onChange={(field, value) => setValueWithDirty(field as any, value)}
              disabled={isSubmitting}
            />
          </div>
          */}

          {/* Marketing Section - מוסתר לעת עתה */}
          {/* 
          <div id="marketing-section" className={styles.section}>
            <ProductMarketing
              isNew={formValues.isNew || false}
              isFeatured={formValues.isFeatured || false}
              isBestSeller={formValues.isBestSeller || false}
              promotionTags={(formValues.promotionTags || []).filter((t): t is string => !!t)}
              onChange={(field, value) => setValueWithDirty(field as any, value)}
              disabled={isSubmitting}
            />
          </div>
          */}
        </div>

        {/* Actions Footer (Sticky) */}
          {/* 🔍 DEBUG - הדפס שגיאות לזיהוי הבעיה */}
        {Object.keys(errors).length > 0 && (
          <div style={{ background: '#fee', padding: '10px', margin: '10px', direction: 'ltr', fontSize: '12px' }}>
            <strong>DEBUG Errors:</strong>
            <pre>{JSON.stringify(errors, (key, value) => {
              if (key === 'ref') return undefined;
              return value;
            }, 2)}</pre>
          </div>
        )}
        <ProductFormActions
          mode={mode}
          isSubmitting={isSubmitting}
          isDirty={isFormDirty}
          isValid={isValid}
          validationErrors={{
            name: typeof errors.name?.message === 'string' ? errors.name.message : undefined,
            basePrice: typeof errors.basePrice?.message === 'string' ? errors.basePrice.message : undefined,
            categoryId: typeof errors.categoryId?.message === 'string' ? errors.categoryId.message : undefined,
            skus: Array.isArray(errors.skus) ? 'יש שגיאות בחלק מה-SKUs' : (typeof errors.skus?.message === 'string' ? errors.skus.message : undefined),
          }}
          onSave={handleSubmit(handleFormSubmit, handleFormError)}
          onCancel={handleCancelClick}
          onDelete={mode === 'edit' ? handleDeleteClick : undefined}
          onDuplicate={mode === 'edit' ? handleDuplicateClick : undefined}
        />

        {/* Confirm Dialogs */}
        <ConfirmDialog
          isOpen={showCancelConfirm}
          title="ביטול שינויים"
          message="קיימים שינויים שלא נשמרו. האם אתה בטוח שברצונך לבטל?"
          confirmText="כן, בטל"
          cancelText="המשך עריכה"
          onConfirm={handleCancelConfirm}
          onCancel={() => setShowCancelConfirm(false)}
          variant="warning"
        />

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="מחיקת מוצר"
          message={`האם אתה בטוח שברצונך למחוק את המוצר "${methods.getValues('name')}"? פעולה זו לא ניתנת לביטול.`}
          confirmText="כן, מחק"
          cancelText="ביטול"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      </form>
    </FormProvider>
  );
};
