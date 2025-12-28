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
import ProductFilterAttributes from './ProductFilterAttributes';
import ProductSpecifications from './ProductSpecifications/ProductSpecifications';
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
  
  /** נתונים ראשוניים (רק במצב עריכה) */
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
  initialActiveTab?: 'basic' | 'pricing' | 'inventory' | 'images' | 'categories' | 'attributes' | 'specifications' | 'skus';
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
  const [activeSection, setActiveSection] = useState<'basic' | 'pricing' | 'inventory' | 'images' | 'categories' | 'attributes' | 'specifications' | 'skus'>(initialActiveTab);
  const [globalLowStockThreshold, setGlobalLowStockThreshold] = useState<number>(5);
  
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

  // ==========================================
  // React Hook Form Setup
  // ==========================================

  // 🎯 עדכון סינכרוני של הטאב הפעיל כש-initialActiveTab משתנה (למנוע "flash" לטאב ברירת מחדל)
  useLayoutEffect(() => {
    console.log('🎯 [ProductForm] initialActiveTab changed (useLayoutEffect):', initialActiveTab);
    setActiveSection(initialActiveTab);
  }, [initialActiveTab]);

  // 🔍 DEBUG: בדיקת initialData
  useEffect(() => {
    if (initialData) {
      console.log('🔍 [ProductForm] initialData received:', {
        name: initialData.name,
        basePrice: initialData.basePrice,
        categoryId: initialData.categoryId,
        images: initialData.images,
        skus: initialData.skus?.length || 0,
        fullData: initialData
      });
    }
  }, [initialData]);

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
                color: sku.color || (sku.attributes as any)?.color || '',
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
        sku: initialSkuCode,
        name: 'וריאנט ראשוני',
        price: null,
        stockQuantity: defaultProductValues.stockQuantity ?? 0,
        color: '',
        attributes: {},
        images: [],
        isActive: true,
      };

      return {
        ...defaultProductValues,
        // ודא שיש לפחות SKU ראשוני לעריכה מידית
        skus: [initialSku as any],
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
  const formValues = watch();

  // 🔧 FIX: הפעלת validation מיידית בפתיחת הטופס (מצב יצירה)
  // כך המנהל יראה מיד את השגיאות לפני שהוא ממלא את השדות
  useEffect(() => {
    if (mode === 'create') {
      // הפעלת validation לשדות הקריטיים מיד
      trigger(['name', 'basePrice']);
    }
  }, [mode, trigger]);

  // 🔧 FIX: הפעלת validation מחדש כשמשתנים את שדות הקריטיים
  // כדי שהשגיאות יעלמו בזמן אמת כשהמנהל מתקן את הבעיות
  useEffect(() => {
    if (mode === 'create' || isDirty) {
      trigger(['name', 'basePrice']);
    }
  }, [formValues.name, formValues.basePrice, trigger, mode, isDirty]);

  // 🆕 עדכון אוטומטי של SKU ראשוני כשמשנים את שם המוצר
  // רק במצב יצירה וכאשר יש SKU ראשוני בלבד (לא נערך ידנית)
  useEffect(() => {
    if (mode === 'create' && formValues.name && formValues.skus?.length === 1) {
      const currentSku = formValues.skus[0];
      // בדיקה אם ה-SKU הנוכחי נוצר אוטומטית (מתחיל ב-PRODUCT- או זהה לשם הקודם)
      const isAutoGenerated = currentSku.sku.startsWith('PRODUCT-') || 
                              currentSku.name === 'וריאנט ראשוני';
      
      if (isAutoGenerated) {
        // יצירת SKU חדש מהשם המעודכן
        const newSkuCode = generateNextSkuCode(formValues.name, []);
        setValue('skus.0.sku', newSkuCode, { shouldDirty: false });
        console.log('🔄 [ProductForm] Auto-updated initial SKU:', newSkuCode);
      }
    }
  }, [formValues.name, formValues.skus, mode, setValue]);

  // ניווט React Router - משמש לאחר יצירה כדי לעבור לדף עריכה
  const navigate = useNavigate();
  
  // 🔍 DEBUG: בדיקת formValues
  useEffect(() => {
    console.log('📊 [ProductForm] formValues:', {
      name: formValues.name,
      basePrice: formValues.basePrice,
      categoryId: formValues.categoryId,
      images: formValues.images?.length || 0,
      skus: formValues.skus?.length || 0
    });
  }, [formValues.name, formValues.basePrice, formValues.categoryId]);
  
  // ⚠️ FIX: במצב edit, RHF לפעמים לא מזהה dirty נכון
  // נעקוב ידנית אחרי שינויים
  const [hasManualChanges, setHasManualChanges] = useState(false);
  
  // Wrapper ל-setValue שמסמן שינויים ידניים
  const setValueWithDirty = (field: any, value: any, options?: any) => {
    console.log('🔄 [ProductForm] setValue called:', { field, mode, hasManualChanges, value });
    setValue(field, value, { ...options, shouldDirty: true });
    // במצב edit - תמיד מסמן כ-dirty אחרי שינוי
    if (mode === 'edit') {
      console.log('✅ [ProductForm] Marking form as dirty (edit mode)');
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
  
  // Logging לדיבאג
  useEffect(() => {
    console.log('📊 [ProductForm] Dirty state:', {
      mode,
      isDirty,
      hasManualChanges,
      isFormDirty,
      isSubmitting,
      isValid,
      buttonWillBeDisabled: !isFormDirty || !isValid || isSubmitting,
      dirtyFieldsCount: Object.keys(dirtyFields).length,
      errorsCount: Object.keys(errors).length,
      errors: errors
    });
  }, [isDirty, hasManualChanges, isFormDirty, mode, dirtyFields, isSubmitting, isValid, errors]);

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

  // שחזור draft בטעינה (רק במצב create)
  useEffect(() => {
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
  }, [mode, reset, confirm]);

  // ==========================================
  // Handlers
  // ==========================================

  /**
   * טיפול בשליחת הטופס
   */
  const handleFormSubmit = async (data: ProductFormData) => {
    console.log('🚀 [ProductForm] handleFormSubmit called!', { 
      mode, 
      hasData: !!data,
      dataKeys: Object.keys(data),
      specifications: data.specifications, // 🔍 DEBUG: בדיקת specifications
    });
    
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

  /**
   * מעבר לקטע הבא
   */
  const goToNextSection = () => {
    const sections: typeof activeSection[] = ['basic', 'pricing', 'inventory', 'images', 'categories', 'attributes', 'specifications', 'skus'];
    const currentIndex = sections.indexOf(activeSection);
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /**
   * מעבר לקטע הקודם
   */
  const goToPreviousSection = () => {
    const sections: typeof activeSection[] = ['basic', 'pricing', 'inventory', 'images', 'categories', 'attributes', 'specifications', 'skus'];
    const currentIndex = sections.indexOf(activeSection);
    if (currentIndex > 0) {
      setActiveSection(sections[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
              {mode === 'create' ? 'יצירת מוצר חדש' : 'עריכת מוצר'}
            </h2>
            <p className={styles.subtitle}>
              {mode === 'create'
                ? 'מלא את כל הפרטים הנדרשים ליצירת מוצר חדש'
                : 'ערוך את פרטי המוצר ושמור את השינויים'}
            </p>
          </div>

          {/* Progress Bar */}
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
        </div>

        {/* Section Navigation Tabs */}
        <div className={styles.sectionNav}>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'basic' ? styles.active : ''}`}
            onClick={() => setActiveSection('basic')}
          >
            מידע בסיסי
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'pricing' ? styles.active : ''}`}
            onClick={() => setActiveSection('pricing')}
          >
            מחירים
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'inventory' ? styles.active : ''}`}
            onClick={() => setActiveSection('inventory')}
          >
            מלאי
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'images' ? styles.active : ''}`}
            onClick={() => setActiveSection('images')}
          >
            תמונות
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'categories' ? styles.active : ''}`}
            onClick={() => setActiveSection('categories')}
          >
            קטגוריות
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'attributes' ? styles.active : ''}`}
            onClick={() => setActiveSection('attributes')}
          >
            מאפייני סינון
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'specifications' ? styles.active : ''}`}
            onClick={() => setActiveSection('specifications')}
          >
            מפרט טכני
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${activeSection === 'skus' ? styles.active : ''}`}
            onClick={() => setActiveSection('skus')}
          >
            וריאנטים (SKUs)
          </button>
        </div>

        {/* Form Sections */}
        <div className={styles.formContent}>
          {/* Basic Info Section */}
          {activeSection === 'basic' && (
            <div className={styles.section}>
              <ProductBasicInfo
                values={{
                  name: formValues.name || '',
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
            </div>
          )}

          {/* Pricing Section */}
          {activeSection === 'pricing' && (
            <div className={styles.section}>
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
          )}

          {/* Inventory Section */}
          {activeSection === 'inventory' && (
            <div className={styles.section}>
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
              />
            </div>
          )}

          {/* Images Section */}
          {activeSection === 'images' && (
            <div className={styles.section}>
              <ProductImages
                images={formValues.images || []}
                errors={errors as any}
                onChange={(images) => setValueWithDirty('images', images)}
                onUpload={handleProductImagesUpload}
                // ניווט מקצועי לטאב הוריאנטים (SKUs)
                onNavigateToVariants={() => setActiveSection('skus')}
              />
            </div>
          )}

          {/* Categories Section */}
          {activeSection === 'categories' && (
            <div className={styles.section}>
              <ProductCategories
                values={{
                  categoryId: formValues.categoryId || null,
                  tags: (formValues.tags || []).filter((tag): tag is string => tag !== undefined),
                }}
                errors={errors as any}
                onChange={(field, value) => setValueWithDirty(field, value)}
              />
            </div>
          )}

          {/* Filter Attributes Section - מאפייני סינון */}
          {activeSection === 'attributes' && (
            <div className={styles.section}>
              <ProductFilterAttributes
                skus={formValues.skus || []}
                onSkusChange={(updatedSkus) => setValueWithDirty('skus', updatedSkus)}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Technical Specifications Section - מפרט טכני */}
          {activeSection === 'specifications' && (
            <div className={styles.section}>
              <ProductSpecifications
                specifications={formValues.specifications || []}
                onChange={(specs) => setValueWithDirty('specifications', specs)}
                disabled={isSubmitting}
                errors={errors as any}
              />
            </div>
          )}

          {/* SKUs Section */}
          {activeSection === 'skus' && (
            <div className={styles.section}>
              <ProductSKUs
                value={formValues.skus || []}
                onChange={(skus) => setValueWithDirty('skus', skus)}
                errors={errors as any}
                isSkuMode={true}
                mode={mode}
                onUploadImages={handleSKUImagesUpload}
                productFormData={{
                  name: formValues.name,
                  basePrice: formValues.basePrice,
                  stockQuantity: formValues.stockQuantity ?? 0,
                  images: formValues.images,
                }}
              />
            </div>
          )}

          {/* Section Navigation Buttons */}
          <div className={styles.sectionNavButtons}>
            {activeSection !== 'basic' && (
              <button
                type="button"
                className={styles.navButton}
                onClick={goToPreviousSection}
                disabled={isSubmitting}
              >
                ← הקטע הקודם
              </button>
            )}
            {activeSection !== 'skus' && (
              <button
                type="button"
                className={styles.navButton}
                onClick={goToNextSection}
                disabled={isSubmitting}
              >
                הקטע הבא →
              </button>
            )}
          </div>
        </div>

        {/* Actions Footer (Sticky) */}
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
