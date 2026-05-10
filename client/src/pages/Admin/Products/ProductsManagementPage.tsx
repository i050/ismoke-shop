import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import { useConfirm } from '../../../hooks/useConfirm';
import {
  fetchProducts,
  setFilters,
  resetFilters,
  setSorting,
  deleteProduct,
  createProduct,
  updateProduct,
  duplicateProduct,
  clearProductSelection,
  setModeCreate,
  setModeEdit,
  setModeList,
  setViewMode,
  restoreProduct,
  bulkDeleteProducts,
  bulkRestoreProducts,
  bulkDeleteProductsPermanently,
} from '../../../store/slices/productsManagementSlice';
import { TitleWithIcon, Button, Icon } from '../../../components/ui';
import ProductsTableHeader from '../../../components/features/admin/Products/ProductsTable/ProductsTableHeader';
import ProductsTableFilters from '../../../components/features/admin/Products/ProductsTable/ProductsTableFilters';
import ProductsTableToolbar from '../../../components/features/admin/Products/ProductsTable/ProductsTableToolbar';
import ProductsTable from '../../../components/features/admin/Products/ProductsTable/ProductsTable';
import { ProductForm } from '../../../components/features/admin/Products/ProductForm';
import type { ProductFormData } from '../../../schemas/productFormSchema';
import { ProductService } from '../../../services/productService'; // 🔧 FIX: הוספת import לטעינת מוצר עם SKUs
import productManagementService from '../../../services/productManagementService'; // Phase 7.2: עבור מחיקה לצמיתות
import styles from './ProductsManagementPage.module.css';

// ברירת מחדל לגודל דף ברשימות ניהול (מניעת טעינת מאות פריטים בבת אחת)
const DEFAULT_ADMIN_PAGE_LIMIT = 50;
import { useLocation } from 'react-router-dom';

/**
 * דף ניהול מוצרים
 * Phase 4: Products Table MVP
 * Phase 4.7.5: הוספת Bulk Delete
 * Phase 6: אינטגרציה עם ProductForm
 * Phase 7: פח אשפה - מוצרים פעילים/נמחקים עם שחזור
 */
const ProductsManagementPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { showToast } = useToast();
  const confirm = useConfirm();
  
  // State לשמירת טאב התחלתי (למשל, מאזהרת inconsistency)
  const [initialActiveTab, setInitialActiveTab] = useState<'basic' | 'pricing' | 'inventory' | 'images' | 'categories' | 'attributes' | 'skus'>('basic');
  const [deepLinkProductId, setDeepLinkProductId] = useState<string | null>(null);
  const [globalLowStockThreshold, setGlobalLowStockThreshold] = useState<number>(5);
  
  // 🆕 הבחירה "יש גרסאות?" עברה לתוך הטופס - אין צורך ב-state כאן
  
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

  // קבלת נתונים מ-Redux - Phase 6: הוספת mode + editingProduct, Phase 7: viewMode
  const {
    products,
    loading,
    filters,
    sortBy,
    sortDirection,
    error,
    selectedIds,
    mode,
    editingProduct,
    viewMode,
  } = useAppSelector((state) => state.productsManagement);

  // Phase 7: האם אנחנו בתצוגת מוצרים נמחקים
  const isDeletedView = viewMode === 'deleted';

  // טעינת מוצרים בעת טעינת הדף או שינוי viewMode
  // Phase 7.1: לא טוענים אם יש stockStatusFilter מהדשבורד (יטען ב-useEffect הייעודי)
  useEffect(() => {
    // אם יש פילטר מהדשבורד - לא טוענים כאן, ה-useEffect השני יטפל בזה
    if (location.state?.stockStatusFilter) {
      console.log('📦 דילוג על טעינה ראשונית - יש פילטר מהדשבורד');
      return;
    }
    
    console.log('📦 טוען מוצרים... (viewMode:', viewMode, ')');
    // בהתאם ל-viewMode, נשלח isActive: true (פעילים) או isActive: false (נמחקים)
    const isActiveFilter = viewMode === 'active' ? true : false;
    dispatch(fetchProducts({ filters: { ...filters, isActive: isActiveFilter }, limit: DEFAULT_ADMIN_PAGE_LIMIT })).then((result: any) => {
      if (result.payload) {
        console.log('✅ מוצרים נטענו:', result.payload.total);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, viewMode]);

  // Handle deep linking from dashboard
  useEffect(() => {
    if (location.state?.editProductId) {
      console.log('🔗 Deep linking to product (received):', location.state.editProductId);
      console.log('🔗 Location state full:', location.state);

      // שמירת הטאב הרצוי אם סופק
      if (location.state.activeTab) {
        console.log('🔗 Setting initial active tab (deep link):', location.state.activeTab);
        setInitialActiveTab(location.state.activeTab);
      } else {
        console.log('⚠️  No activeTab in location.state, using default: basic');
        setInitialActiveTab('basic'); // איפוס לברירת מחדל
      }

      // שמור את ה-productId לטיפול מאוחר יותר - נריץ את handleEditProduct
      // רק אחרי ש־initialActiveTab הוגדר (מניעת race conditions)
      setDeepLinkProductId(location.state.editProductId as string);
    }
    
    // Phase 7.1: טיפול בפילטר מלאי מהדשבורד
    if (location.state?.stockStatusFilter) {
      console.log('📦 Setting stock status filter from navigation:', location.state.stockStatusFilter);
      const stockFilter = location.state.stockStatusFilter as 'all' | 'low' | 'out' | 'lowOrOut';
      // עדכון הפילטר ב-Redux וטעינת מוצרים עם הפילטר
      dispatch(setFilters({ stockStatus: stockFilter }));
      dispatch(fetchProducts({ 
        filters: { 
          stockStatus: stockFilter, 
          isActive: true // תמיד מוצרים פעילים כשמגיעים מהדשבורד
        },
        limit: DEFAULT_ADMIN_PAGE_LIMIT
      }));
      // נקה את ה-state כדי למנוע הפעלה חוזרת בניווטים עתידיים
      window.history.replaceState({}, document.title);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // כאשר יש deepLinkProductId ו־initialActiveTab מעודכן — רוץ ה־edit
  useEffect(() => {
    if (deepLinkProductId) {
      console.log('🔁 Processing deep link for product:', deepLinkProductId, 'with initialActiveTab:', initialActiveTab);
      // קריאה ל-handleEditProduct ואז איפוס ה-deepLinkProductId
      handleEditProduct(deepLinkProductId);
      setDeepLinkProductId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkProductId, initialActiveTab]);

  // איפוס הטאב ההתחלתי כשחוזרים למצב list
  useEffect(() => {
    if (mode === 'list') {
      setInitialActiveTab('basic');
    }
  }, [mode]);

  // פונקציה להוספת מוצר - עוברת ישירות ליצירה (הבחירה "יש גרסאות?" בתוך הטופס)
  const handleAddProduct = () => {
    dispatch(setModeCreate());
  };

  // Phase 6.2: טיפול בשמירת מוצר (create or update)
  const handleProductSubmit = async (data: ProductFormData) => {
    try {
      if (mode === 'create') {
        await dispatch(createProduct(data)).unwrap();
      } else if (mode === 'edit' && editingProduct) {
        // שמירת ה-ID לפני שהוא נמחק
        const productId = editingProduct._id;
        await dispatch(updateProduct({ productId, productData: data })).unwrap();
      }
      
      // חזרה לרשימה אחרי שהטופס סיים בהצלחה
      dispatch(setModeList());
    } catch (error) {
      throw error; // ProductForm יטפל בזה
    }
  };

  // Phase 6: ביטול טופס
  const handleProductCancel = () => {
    dispatch(setModeList());
  };

  // Phase 6: מחיקת מוצר מתוך הטופס
  const handleProductDelete = async () => {
    if (!editingProduct) return;
    
    // שמירת ה-ID לפני שהוא נמחק
    const productId = editingProduct._id;
    console.log('🗑️ מחיקת מוצר מתוך הטופס:', productId);
    
    try {
      await dispatch(deleteProduct(productId)).unwrap();
      dispatch(setModeList());
      dispatch(fetchProducts({ filters, sortBy, sortDirection, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
    } catch (error) {
      console.error('❌ שגיאה במחיקת מוצר:', error);
      throw error;
    }
  };

  // Phase 6.2: שכפול מוצר
  const handleProductDuplicate = async () => {
    if (!editingProduct) return;
    
    // שמירת ה-ID לפני שהוא נמחק
    const productId = editingProduct._id;
    console.log('📋 שכפול מוצר:', productId);
    
    try {
      await dispatch(duplicateProduct(productId)).unwrap();
      console.log('✅ מוצר שוכפל בהצלחה');
      // ה-Redux כבר מעביר למצב edit של המוצר המשוכפל
    } catch (error) {
      console.error('❌ שגיאה בשכפול מוצר:', error);
      showToast('error', 'שגיאה בשכפול המוצר. אנא נסה שוב.');
    }
  };

  // טיפול בשינוי פילטרים
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    console.log('🔍 שינוי פילטרים:', newFilters);
    console.log('📊 פילטרים נוכחיים:', filters);
    console.log('📦 פילטרים מאוחדים:', { ...filters, ...newFilters });
    dispatch(setFilters(newFilters));
    // טעינה מחדש עם הפילטרים החדשים
    dispatch(fetchProducts({ filters: { ...filters, ...newFilters }, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
  };

  // איפוס פילטרים
  const handleResetFilters = () => {
    console.log('🔄 איפוס פילטרים');
    dispatch(resetFilters());
    dispatch(fetchProducts({ limit: DEFAULT_ADMIN_PAGE_LIMIT }));
  };

  // טיפול בחיפוש
  const handleSearchChange = (query: string) => {
    console.log('🔍 מבצע חיפוש:', query);
    const newFilters = { ...filters, search: query };
    dispatch(setFilters({ search: query }));
    dispatch(fetchProducts({ filters: newFilters, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
  };

  // טיפול במיון
  const handleSortChange = (
    newSortBy: typeof sortBy,
    newSortDirection: typeof sortDirection
  ) => {
    console.log('🔢 שינוי מיון:', { newSortBy, newSortDirection });
    dispatch(setSorting({ sortBy: newSortBy, sortDirection: newSortDirection }));
    dispatch(
      fetchProducts({
        filters,
        sortBy: newSortBy,
        sortDirection: newSortDirection,
        limit: DEFAULT_ADMIN_PAGE_LIMIT,
      })
    );
  };

  // טיפול בעריכת מוצר (Phase 5)
  const handleEditProduct = async (productId: string) => {
    console.log('✏️ עריכת מוצר:', productId);
    
    // אם זו עריכה רגילה (לא מ-deep link), איפוס הטאב לברירת מחדל
    if (!location.state?.editProductId) {
      console.log('📝 Regular edit - resetting to basic tab');
      setInitialActiveTab('basic');
    }
    
    try {
      // 🔧 FIX: טוען את המוצר עם SKUs מה-API במקום מהרשימה
      const productWithSkus = await ProductService.getProductById(productId);
      dispatch(setModeEdit(productWithSkus));
    } catch (error) {
      showToast('error', 'שגיאה בטעינת המוצר');
    }
  };

  // טיפול במחיקת מוצר - Phase 4.7.1
  const handleDeleteProduct = async (productId: string) => {
    const product = products.find((p) => p._id === productId);
    
    if (!product) {
      console.error('❌ מוצר לא נמצא');
      return;
    }
    
    // אישור מחיקה באמצעות מודאל
    const confirmed = await confirm({
      title: 'מחיקת מוצר',
      message: `האם אתה בטוח שברצונך למחוק את המוצר "${product.name}"?\nהמוצר יועבר לפח האשפה וניתן יהיה לשחזר אותו.`,
      confirmText: 'מחק',
      cancelText: 'ביטול',
      danger: true,
    });

    if (confirmed) {
      try {
        // שליחת פעולת מחיקה ל-Redux
        await dispatch(deleteProduct(productId)).unwrap();
        
        // הצלחה - הודעה ידידותית
        showToast('success', `המוצר "${product.name}" הועבר לפח האשפה`);
        
        // טעינה מחדש של הרשימה (כדי לעדכן מונים ומצב)
        const isActiveFilter = viewMode === 'active' ? true : false;
        dispatch(fetchProducts({ filters: { ...filters, isActive: isActiveFilter }, sortBy, sortDirection, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
      } catch (error) {
        // טיפול בשגיאה
        console.error('❌ שגיאה במחיקת המוצר:', error);
        showToast('error', `שגיאה במחיקת המוצר: ${error}`);
      }
    }
  };

  // Phase 7: טיפול בשחזור מוצר
  const handleRestoreProduct = async (productId: string) => {
    console.log('🔄 שחזור מוצר:', productId);
    const product = products.find((p) => p._id === productId);
    
    if (!product) {
      console.error('❌ מוצר לא נמצא');
      return;
    }
    
    // אישור שחזור באמצעות מודאל
    const confirmed = await confirm({
      title: 'שחזור מוצר',
      message: `האם אתה בטוח שברצונך לשחזר את המוצר "${product.name}"?`,
      confirmText: 'שחזר',
      cancelText: 'ביטול',
      danger: false,
    });

    if (confirmed) {
      try {
        // שליחת פעולת שחזור ל-Redux
        await dispatch(restoreProduct(productId)).unwrap();
        
        // הצלחה - הודעה ידידותית
        console.log('✅ מוצר שוחזר בהצלחה');
        showToast('success', `המוצר "${product.name}" שוחזר בהצלחה`);
        
        // טעינה מחדש של הרשימה
        dispatch(fetchProducts({ filters: { ...filters, isActive: false }, sortBy, sortDirection, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
      } catch (error) {
        // טיפול בשגיאה
        console.error('❌ שגיאה בשחזור המוצר:', error);
        showToast('error', `שגיאה בשחזור המוצר: ${error}`);
      }
    }
  };

  // Phase 7.2: מחיקה לצמיתות (Hard Delete)
  const handlePermanentlyDeleteProduct = async (productId: string) => {
    console.log('🗑️ מחיקה לצמיתות:', productId);
    const product = products.find((p) => p._id === productId);
    
    if (!product) {
      console.error('❌ מוצר לא נמצא');
      return;
    }
    
    // אישור מחיקה לצמיתות באמצעות מודאל (עם warning כי זה בלתי הפיך)
    const confirmed = await confirm({
      title: '⚠️ מחיקה לצמיתות',
      message: `פעולה זו תמחק את המוצר "${product.name}" מהשרת ומהאחסון בצורה בלתי הפיכה!
      
לא ניתן לשחזר את המוצר לאחר מכן. האם אתה בטוח?`,
      confirmText: 'מחק לצמיתות',
      cancelText: 'ביטול',
      danger: true,
    });

    if (confirmed) {
      try {
        // שליחת בקשה מחיקה לצמיתות לשרת
        const result = await productManagementService.deleteProductPermanently(productId);
        
        if (result.success) {
          // הצלחה - הודעה ידידותית
          console.log('✅ מוצר נמחק לצמיתות בהצלחה');
          showToast('success', `המוצר "${product.name}" נמחק לצמיתות`);
          
          // טעינה מחדש של הרשימה (נמחקים)
          dispatch(fetchProducts({ filters: { ...filters, isActive: false }, sortBy, sortDirection, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
        }
      } catch (error) {
        // טיפול בשגיאה
        console.error('❌ שגיאה במחיקת המוצר לצמיתות:', error);
        const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
        showToast('error', `שגיאה במחיקת המוצר: ${errorMessage}`);
      }
    }
  };

  // Phase 7: שינוי מצב תצוגה (פעילים / נמחקים)
  const handleViewModeChange = (newMode: 'active' | 'deleted') => {
    console.log('🔄 שינוי תצוגה ל:', newMode);
    dispatch(setViewMode(newMode));
    // הטעינה מחדש תתבצע ב-useEffect כתגובה לשינוי viewMode
  };

  // טיפול במחיקה מרובה - Phase 4.7.5
  const handleBulkDelete = async () => {
    console.log('🗑️ מחיקה מרובה:', selectedIds);
    const productIds = [...selectedIds];
    const selectedCount = productIds.length;
    
    if (selectedCount === 0) {
      console.warn('⚠️ אין מוצרים נבחרים');
      return;
    }

    if (isDeletedView) {
      const confirmed = await confirm({
        title: 'מחיקה סופית מרובה',
        message: `פעולה זו תמחק לצמיתות ${selectedCount} מוצרים מהשרת ומהאחסון. לא ניתן לשחזר אותם לאחר מכן.`,
        confirmText: 'מחק לצמיתות',
        cancelText: 'ביטול',
        danger: true,
      });

      if (!confirmed) return;

      try {
        await dispatch(bulkDeleteProductsPermanently(productIds)).unwrap();
        showToast('success', `${selectedCount} מוצרים נמחקו לצמיתות`);
        dispatch(clearProductSelection());
        dispatch(fetchProducts({ filters: { ...filters, isActive: false }, sortBy, sortDirection, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
      } catch (error) {
        console.error('❌ שגיאה במחיקה סופית מרובה:', error);
        showToast('error', `שגיאה במחיקה סופית של מוצרים: ${error}`);
        dispatch(fetchProducts({ filters: { ...filters, isActive: false }, sortBy, sortDirection, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
      }
      return;
    }
    
    // אישור מחיקה מרובה באמצעות מודאל
    const confirmed = await confirm({
      title: 'מחיקה מרובה',
      message: `האם אתה בטוח שברצונך להעביר ${selectedCount} מוצרים לפח האשפה? ניתן יהיה לשחזר אותם.`,
      confirmText: 'העבר לפח',
      cancelText: 'ביטול',
      danger: true,
    });

    if (confirmed) {
      try {
        await dispatch(bulkDeleteProducts(productIds)).unwrap();
        
        // הצלחה - ניקוי הבחירה
        console.log('✅ כל המוצרים הנבחרים נמחקו בהצלחה');
        showToast('success', `${selectedCount} מוצרים הועברו לפח האשפה`);
        dispatch(clearProductSelection());
        
        // טעינה מחדש של הרשימה
        dispatch(fetchProducts({ filters: { ...filters, isActive: true }, sortBy, sortDirection, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
      } catch (error) {
        // טיפול בשגיאה
        console.error('❌ שגיאה במחיקת מוצרים:', error);
        showToast('error', `שגיאה במחיקת מוצרים: ${error}`);
        
        // גם במקרה של שגיאה - נטען מחדש כדי לראות מה בכל זאת נמחק
        dispatch(fetchProducts({ filters: { ...filters, isActive: true }, sortBy, sortDirection, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
      }
    }
  };

  // טיפול בשחזור מרובה מפח האשפה
  const handleBulkRestore = async () => {
    console.log('🔄 שחזור מרובה:', selectedIds);
    const productIds = [...selectedIds];
    const selectedCount = productIds.length;

    if (selectedCount === 0) {
      console.warn('⚠️ אין מוצרים נבחרים לשחזור');
      return;
    }

    const confirmed = await confirm({
      title: 'שחזור מרובה',
      message: `האם לשחזר ${selectedCount} מוצרים מפח האשפה?`,
      confirmText: 'שחזר נבחרים',
      cancelText: 'ביטול',
      danger: false,
    });

    if (!confirmed) return;

    try {
      await dispatch(bulkRestoreProducts(productIds)).unwrap();
      showToast('success', `${selectedCount} מוצרים שוחזרו בהצלחה`);
      dispatch(clearProductSelection());
      dispatch(fetchProducts({ filters: { ...filters, isActive: false }, sortBy, sortDirection, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
    } catch (error) {
      console.error('❌ שגיאה בשחזור מרובה:', error);
      showToast('error', `שגיאה בשחזור מוצרים: ${error}`);
      dispatch(fetchProducts({ filters: { ...filters, isActive: false }, sortBy, sortDirection, limit: DEFAULT_ADMIN_PAGE_LIMIT }));
    }
  };

  return (
    <div className={styles.productsPage}>
      {/* Header - תמיד מוצג */}
      <TitleWithIcon
        icon="Package"
        title="ניהול מוצרים"
        subtitle={
          mode === 'list'
            ? isDeletedView
              ? 'פח אשפה - מוצרים שנמחקו'
              : 'רשימת מוצרים פעילים'
            : mode === 'create'
            ? 'יצירת מוצר חדש'
            : 'עריכת מוצר'
        }
      />

      {/* Phase 6: תצוגה מותנית לפי mode */}
      {mode === 'list' && (
        <>
          {/* Phase 7: טאבים - מוצרים פעילים / פח אשפה */}
          <div className={styles.viewModeTabs}>
            <Button
              variant={viewMode === 'active' ? 'primary' : 'outline'}
              size="md"
              onClick={() => handleViewModeChange('active')}
              className={styles.viewModeTab}
            >
              <Icon name="Package" size={18} />
              מוצרים פעילים
            </Button>
            <Button
              variant={viewMode === 'deleted' ? 'primary' : 'outline'}
              size="md"
              onClick={() => handleViewModeChange('deleted')}
              className={styles.viewModeTab}
            >
              <Icon name="Trash2" size={18} />
              פח אשפה
            </Button>
          </div>

          {/* 🧪 Phase 4.1: Header - רק במצב פעילים */}
          {!isDeletedView && (
            <ProductsTableHeader
              totalCount={products?.length || 0}
              onAddProduct={handleAddProduct}
              loading={loading}
            />
          )}

          {/* 🧪 Phase 4.2: Filters - רק במצב פעילים */}
          {!isDeletedView && (
            <ProductsTableFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleResetFilters}
            />
          )}

          {/* 🧪 Phase 4.3: Toolbar */}
          <ProductsTableToolbar
            searchQuery={filters.search || ''}
            onSearchChange={handleSearchChange}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            resultsCount={products?.length || 0}
            loading={loading}
          />

          {/* 🧪 Phase 4.4-4.5: Table + Rows */}
          <ProductsTable
            products={products}
            loading={loading}
            error={error}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onBulkDelete={handleBulkDelete}
            onBulkRestore={handleBulkRestore}
            onRestore={handleRestoreProduct}
            onPermanentlyDelete={handlePermanentlyDeleteProduct}
            isDeletedView={isDeletedView}
            globalLowStockThreshold={globalLowStockThreshold}
          />
        </>
      )}

      {/* Phase 6: טופס יצירה - הבחירה "יש גרסאות?" נעשית בתוך הטופס */}
      {mode === 'create' && (
        <ProductForm
          mode="create"
          onSubmit={handleProductSubmit}
          onCancel={handleProductCancel}
        />
      )}

      {/* Phase 6: טופס עריכה */}
      {mode === 'edit' && editingProduct && (
        <ProductForm
          mode="edit"
          initialData={editingProduct}
          onSubmit={handleProductSubmit}
          onCancel={handleProductCancel}
          onDelete={handleProductDelete}
          onDuplicate={handleProductDuplicate}
          initialActiveTab={initialActiveTab}
          key={`${editingProduct._id}-${initialActiveTab}`} // Force re-render when tab changes
        />
      )}

    </div>
  );
};

export default ProductsManagementPage;
