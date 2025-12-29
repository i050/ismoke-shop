import React, { useState } from 'react';
import type { CategoryTreeNodeClient } from '../../services/categoryService';
import type { Product } from '../../types';
import styles from './ProductsPage.module.css';
// ייבוא הפונקציות והקומפוננטות לניהול הסינונים
import { useFiltersState } from '../../components/features/filters/hooks/useFiltersState';
import { useFiltersUrlSync, getInitialFiltersFromUrl } from '../../components/features/filters/hooks/useFiltersUrlSync';
import { useFilteredProducts } from '../../components/features/filters/hooks/useFilteredProducts';
import FilterPanel from '../../components/features/filters/panel/FilterPanel/FilterPanel';
// ייבוא קומפוננטות מובייל
import { 
  MobileFiltersToolbar, 
  MobileSortMenu, 
  MobileFilterDrawer 
} from '../../components/features/filters/mobile';
import { Breadcrumbs, Pagination, Icon, Button, LogoLoader } from '../../components/ui';
import { ProductGrid } from '../../components/features/products/ProductGrid';
import { ProductsRealtimeProvider } from '../../components/features/products/ProductsRealtime';
import { Typography } from '@ui';
// ייבוא useSearchParams לקריאת פרמטרים מ-URL
import { useSearchParams } from 'react-router-dom';
// ייבוא Redux hooks ו-selectors לקטגוריות
import { useAppSelector, useAppDispatch } from '../../hooks/reduxHooks';
import { 
  fetchCategoriesTree, 
  selectCategoriesTree, 
  selectCategoriesLoading
} from '../../store/slices/categoriesSlice';
// ייבוא פעולת הוספה לסל
import { addItemToCart } from '../../store/slices/cartSlice';

/**
 * עמוד "כל המוצרים" - פריסה דו-אזורית:
 * 1. פאנל סינון מימין (RTL) - דבוק וגולל בפני עצמו
 * 2. אזור תוכן משמאל - גריד מוצרים + מידע נוסף
 */

const ProductsPage: React.FC = () => {
  // קריאת פרמטרים מ-URL כדי לבדוק אם נבחרה קטגוריה ספציפית מההדר המשני
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  const searchFromUrl = searchParams.get('search');
  
  // מצב מקומי לפתיחת קומפוננטות מובייל
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  
  // גישה למצב ופעולות Redux לקטגוריות
  const dispatch = useAppDispatch();
  const categoriesTree = useAppSelector(selectCategoriesTree);
  const categoriesLoading = useAppSelector(selectCategoriesLoading);
  
  // פונקציה רקורסיבית למציאת ID של קטגוריה לפי שם
  const findCategoryIdByName = React.useCallback((tree: CategoryTreeNodeClient[], name: string): string | null => {
    for (const category of tree) {
      // בדיקה אם השם של הקטגוריה תואם (case insensitive)
      if (category.name.toLowerCase() === name.toLowerCase()) {
        return category._id;
      }
      // חיפוש רקורסיבי בילדים
      if (category.children && category.children.length > 0) {
        const found = findCategoryIdByName(category.children, name);
        if (found) return found;
      }
    }
    return null;
  }, []);
  
  // טעינת עץ הקטגוריות מ-Redux בטעינה ראשונה
  React.useEffect(() => {
    // טען קטגוריות רק אם אין נתונים ואין טעינה כרגע
    if (categoriesTree.length === 0 && !categoriesLoading) {
      dispatch(fetchCategoriesTree());
    }
  }, [dispatch, categoriesTree.length, categoriesLoading]);
  
  const initial = React.useMemo(() => getInitialFiltersFromUrl(), []);
  const { state, setSort, setPriceMin, setPriceMax, toggleCategory, replaceCategory, toggleAttribute, clearAttribute, setSearch, setPage, reset } = useFiltersState(initial);
  
  // שמירת הערך הקודם של categoryFromUrl כדי לזהות שינוי בניווט
  const prevCategoryFromUrlRef = React.useRef<string | null>(null);
  
  // טיפול בפרמטר 'category' מה-URL
  // כאשר בוחרים קטגוריה מההדר המשני - מחליף את כל הבחירות הקודמות
  React.useEffect(() => {
    // אם אין פרמטר category ב-URL - לא צריך לעשות כלום
    if (!categoryFromUrl) {
      prevCategoryFromUrlRef.current = null;
      return;
    }
    
    // חכה שעץ הקטגוריות יטען
    if (!categoriesTree || categoriesTree.length === 0 || categoriesLoading) {
      return;
    }
    
    // בדיקה אם פרמטר category השתנה (ניווט חדש מההדר או שינוי URL)
    const categoryChanged = categoryFromUrl !== prevCategoryFromUrlRef.current;
    
    // עדכון הערך הקודם
    prevCategoryFromUrlRef.current = categoryFromUrl;
    
    // מצא את הקטגוריה לפי שם
    const categoryId = findCategoryIdByName(categoriesTree, categoryFromUrl);
    if (!categoryId) {
      return;
    }
    
    // אם שם הקטגוריה השתנה - תמיד החלף את הבחירה
    // זה מכסה גם טעינה ראשונית (prevRef היה null) וגם ניווט חדש מההדר
    if (categoryChanged) {
      replaceCategory(categoryId);
    }
  }, [categoryFromUrl, categoriesTree, categoriesLoading, findCategoryIdByName, replaceCategory]);
  
  // שמירת הערך הקודם של searchFromUrl כדי לזהות שינוי בחיפוש
  const prevSearchFromUrlRef = React.useRef<string | null>(null);
  
  // טיפול בפרמטר 'search' מה-URL (כאשר מגיעים מה-Header עם Autocomplete)
  React.useEffect(() => {
    const newSearch = searchFromUrl || '';
    const prevSearch = prevSearchFromUrlRef.current || '';
    
    // עדכון רק אם ערך החיפוש השתנה
    if (newSearch !== prevSearch) {
      prevSearchFromUrlRef.current = searchFromUrl;
      setSearch(newSearch);
    }
  }, [searchFromUrl, setSearch]);
  
  useFiltersUrlSync(state);
  const { products, meta, loading, error, refetch, refreshing } = useFilteredProducts(state);

  const handleRealtimeGroupUpdate = React.useCallback(() => {
    if (!loading) {
      // דיבאג: סימון קריאה ל-refetch דרך אירוע realtime
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[ProductsPage] handleRealtimeGroupUpdate - invoking refetch', { ts: Date.now() });
      }
      // רענון מבוקר לאחר אירוע socket יחיד ברמת העמוד
      refetch();
    } else {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[ProductsPage] handleRealtimeGroupUpdate skipped because loading=true');
      }
    }
  }, [loading, refetch]);

  // handleReset עבור איפוס הפילטרים
  const handleReset = () => {
    reset();
    setPage(1);
    // resetTreeKey יתעדכן אוטומטית מ-Redux כשבוחרים מההדר
  };

  // חישוב מספר הפילטרים הפעילים למובייל
  const getActiveFiltersCount = () => {
    let count = 0;
    count += state.categoryIds.length;
    if (state.price.min != null || state.price.max != null) count += 1;
    Object.values(state.attributes).forEach(values => {
      count += values.length;
    });
    return count;
  };

  // פונקציה להוספת מוצר לסל - מקבלת את ה-SKU
  const handleAddToCart = (product: Product, sku?: string) => {
    // דגל לוגים: רק בסביבת פיתוח עם דגל מפורש נדפיס פרטי דיבאג
    // ניתן להפעיל באמצעות VITE_ENABLE_PRODUCT_DEBUG=true בקובץ .env
    const SHOULD_DEBUG_PRODUCTS_PAGE_LOGS = import.meta.env.DEV && import.meta.env.VITE_ENABLE_PRODUCT_DEBUG === 'true';
    const debugPageLog = (...args: unknown[]) => {
      if (SHOULD_DEBUG_PRODUCTS_PAGE_LOGS) console.debug(...args);
    };

    debugPageLog('🛒 ProductsPage - handleAddToCart:', {
      productId: product._id,
      productName: product.name,
      hasSkus: !!product.skus && product.skus.length > 0,
      sku,
    });
    
    // אם לא נשלח SKU אבל יש SKUs, קח את הראשון
    let skuToUse = sku;
    if (!skuToUse && product.skus && product.skus.length > 0) {
      skuToUse = product.skus[0].sku;
      debugPageLog('ℹ️ לא נשלח SKU, משתמש בראשון:', skuToUse);
    }
    
    // שליחת הפעולה ל-Redux
    dispatch(addItemToCart({
      productId: product._id,
      quantity: 1,
      sku: skuToUse || '' // SKU חובה
    }));
  };

  return (
    <div className={styles.productsLayout}>
      {/* Mobile Sort Menu - מודאל נפתח */}
      <MobileSortMenu
        isOpen={isMobileSortOpen}
        currentSort={state.sort}
        onSelectSort={(s) => { setSort(s); setPage(1); }}
        onClose={() => setIsMobileSortOpen(false)}
      />
      
      {/* Mobile Filter Drawer - דרור נפתח */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        state={state}
        setPriceMin={(v) => { setPriceMin(v); setPage(1); }}
        setPriceMax={(v) => { setPriceMax(v); setPage(1); }}
        toggleCategory={(id) => { toggleCategory(id); setPage(1); }}
        toggleAttribute={(key, value) => { toggleAttribute(key, value); setPage(1); }}
        clearAttribute={(key) => { clearAttribute(key); setPage(1); }}
        reset={handleReset}
        onClearPriceFilter={() => { setPriceMin(null); setPriceMax(null); setPage(1); }}
        categoriesTree={categoriesTree}
      />
      
      <aside className={styles.filtersArea}>
        <FilterPanel
          state={state}
          setSort={(s) => { setSort(s); setPage(1); }}
          setPriceMin={(v) => { setPriceMin(v); setPage(1); }}
          setPriceMax={(v) => { setPriceMax(v); setPage(1); }}
          toggleCategory={(id) => { toggleCategory(id); setPage(1); }}
          toggleAttribute={(key, value) => { toggleAttribute(key, value); setPage(1); }}
          clearAttribute={(key) => { clearAttribute(key); setPage(1); }}
          reset={handleReset}
          onClearPriceFilter={() => { setPriceMin(null); setPriceMax(null); setPage(1); }}
        />
      </aside>
      <main className={styles.contentArea}>
        {/* Mobile Filter/Sort Toolbar - מוצג רק במובייל, מעל הגריד */}
        <MobileFiltersToolbar
          activeFiltersCount={getActiveFiltersCount()}
          currentSort={state.sort}
          onOpenFilters={() => setIsMobileFilterOpen(true)}
          onOpenSort={() => setIsMobileSortOpen(true)}
        />
        
        <Breadcrumbs
          items={[
            { label: 'בית', path: '/' },
            { label: 'מוצרים' }
          ]}
        />
        
        <ProductsRealtimeProvider onGroupUpdate={handleRealtimeGroupUpdate}>
          {/* תצוגת תוצאות עם הרכיבים החדשים */}
          {/* כדי למנוע 'flash' של הודעת "לא נמצאו מוצרים" בזמן שה-fetch הראשוני עדיין מתבצע,
              נחשב מצב טעינה גם כאשר meta === null (טרם התקבלה התשובה הראשונה).
              אבל אם יש כבר מוצרים מוצגים, נציג את המוצרים + overlay קטן של ריענון במקום full loading. */}
          {(loading || meta === null) && products.length === 0 ? (
            <div className={styles.loadingState}>
              <LogoLoader />
            </div>
          ) : error && error.status && error.status >= 500 ? (
            <div className={styles.errorState}>
              <Icon name="AlertCircle" size={48} className={styles.errorIcon} />
              <Typography variant="h2" color="error" align="center">{error.message}</Typography>
              <Button
                variant="primary"
                size="md"
                onClick={refetch}
                className={styles.retryButton}
                icon={<Icon name="AlertCircle" size={18} />}
              >
                נסה שוב
              </Button>
            </div>
          ) : (
            <>
              {/* תצוגת חיפוש פעיל */}
              {state.search && (
                <div className={styles.activeSearch}>
                  <Typography variant="body1">
                    תוצאות חיפוש עבור: <strong>"{state.search}"</strong>
                  </Typography>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearch('')}
                    icon={<Icon name="X" size={16} />}
                  >
                    נקה חיפוש
                  </Button>
                </div>
              )}
              
              {/* ספירת תוצאות */}
              {meta && (
                <div className={styles.resultsInfo}>
                  <Typography variant="body1">
                    {meta.filtered === 0 ? 'לא נמצאו מוצרים' : `נמצאו ${meta.filtered} מוצרים`}
                  </Typography>
                </div>
              )}

              {/* גריד מוצרים */}
              <div className={styles.gridWrapper}>
                {refreshing && (
                  <div className={styles.refreshOverlay}>
                    <LogoLoader size={250} />
                  </div>
                )}
                <ProductGrid 
                  products={products}
                  onAddToCart={handleAddToCart}
                />
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </ProductsRealtimeProvider>
      </main>
    </div>
  );
};

export default ProductsPage;
