import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon, Card, Button, NativeSelect } from '../../../components/ui';
import inventoryService, {
  type InventorySku,
  type InventoryFilters,
  type InventoryPagination,
} from '../../../services/inventoryService';
import { getAllSettings } from '../../../services/settingsService';
import { useAppDispatch, useAppSelector } from '../../../hooks/reduxHooks';
import { fetchCategoriesTree } from '../../../store/slices/categoriesSlice';
import type { CategoryTreeNodeClient } from '../../../services/categoryService';
import styles from './InventoryManagementPage.module.css';

/**
 * InventoryManagementPage - דף ניהול מלאי
 * מציג את כל ה-SKUs עם אפשרות לעריכת כמות מלאי inline
 */

type StockFilterType = 'all' | 'low' | 'out' | 'in';

interface EditingState {
  sku: string;
  value: string;
}

/**
 * שיטוח עץ קטגוריות לרשימה שטוחה עם אינדנטציה
 * מאפשר הצגה היררכית בתוך select נייטיבי
 */
const flattenCategoryTree = (
  nodes: CategoryTreeNodeClient[],
  depth = 0
): Array<{ value: string; label: string; depth: number }> => {
  const result: Array<{ value: string; label: string; depth: number }> = [];
  
  for (const node of nodes) {
    // הוספת הקטגוריה עם אינדנטציה ויזואלית
    const indent = depth > 0 ? '—'.repeat(depth) + ' ' : '';
    result.push({
      value: node._id,
      label: `${indent}${node.name}`,
      depth,
    });
    
    // רקורסיה לילדים
    if (node.children && node.children.length > 0) {
      result.push(...flattenCategoryTree(node.children, depth + 1));
    }
  }
  
  return result;
};

const InventoryManagementPage: React.FC = () => {
  // ============================================
  // Redux
  // ============================================

  const dispatch = useAppDispatch();

  // קבלת קטגוריות מ-Redux
  const { tree: categories, loading: categoriesLoading } = useAppSelector(
    (state) => state.categories
  );
  // ============================================
  // State - מצב הקומפוננטה
  // ============================================

  const location = useLocation();
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  // נתוני SKUs
  const [skus, setSkus] = useState<InventorySku[]>([]);
  // מידע פגינציה
  const [pagination, setPagination] = useState<InventoryPagination>({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 50,
  });
  // מצב טעינה
  const [loading, setLoading] = useState(true);
  // הודעת שגיאה
  const [error, setError] = useState<string | null>(null);
  // פילטרים
  const [filters, setFilters] = useState<InventoryFilters>({
    page: 1,
    limit: 50,
    search: '',
    sortBy: 'stockQuantity',
    sortOrder: 'asc',
    stockFilter: 'all',
  });
  // מצב עריכה inline
  const [editing, setEditing] = useState<EditingState | null>(null);
  // מצב שמירה (SKU שנשמר כרגע)
  const [saving, setSaving] = useState<string | null>(null);
  // Pending values עבור optimistic UI - מספר שמוצג מיד לפני שהשרת מחזיר תשובה
  const [pendingValues, setPendingValues] = useState<Record<string, number>>({});
  // Debounce refs לניהול טיימאוטים לכל SKU
  const debounceRefs = useRef<Record<string, NodeJS.Timeout>>({});
  // קבוע debounce
  const DEBOUNCE_DELAY = 300;
  // הודעת הצלחה
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // סף מלאי נמוך מההגדרות (גלובלי)
  const [globalLowStockThreshold, setGlobalLowStockThreshold] = useState<number>(5);
  // SKU להדגשה (highlight)
  const [highlightedSku, setHighlightedSku] = useState<string | null>(null);
  // רמת דחיפות להדגשה (urgency)
  const [highlightUrgency, setHighlightUrgency] = useState<'critical' | 'high' | 'medium' | null>(null);
  // Debounce timeout לחיפוש
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Memoized Values
  // ============================================

  // שיטוח עץ הקטגוריות לרשימה היררכית עם אינדנטציה
  const categoryOptions = useMemo(() => {
    const flatCategories = flattenCategoryTree(categories);
    return [
      { value: 'all', label: 'כל הקטגוריות' },
      ...flatCategories.map((cat) => ({
        value: cat.value,
        label: cat.label,
      })),
    ];
  }, [categories]);

  // ============================================
  // טעינת נתונים
  // ============================================

  // טעינת קטגוריות בעת טעינת הקומפוננטה
  useEffect(() => {
    if (categories.length === 0) {
      dispatch(fetchCategoriesTree());
    }
  }, [dispatch, categories.length]);

  // טעינת הגדרות גלובליות (סף מלאי נמוך)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await getAllSettings();
        if (response.success && response.data.inventory?.defaultLowStockThreshold) {
          setGlobalLowStockThreshold(response.data.inventory.defaultLowStockThreshold);
        }
      } catch (err) {
        console.warn('Could not load global settings, using defaults');
      }
    };
    loadSettings();
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await inventoryService.getInventorySkus(filters);
      setSkus(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      setError(err.message || 'שגיאה בטעינת נתוני המלאי');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // טעינה ראשונית ובכל שינוי פילטרים
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ============================================
  // Highlight & Scroll Effect
  // ============================================

  // בדיקה אם יש SKU להדגיש מה-navigation state
  useEffect(() => {
    const state = location.state as { highlightSku?: string; highlightUrgency?: 'critical' | 'high' | 'medium' } | null;
    if (state?.highlightSku) {
      setHighlightedSku(state.highlightSku);
      setHighlightUrgency(state.highlightUrgency || null);
      
      // הסרת ההדגשה אחרי 3 שניות
      const timer = setTimeout(() => {
        setHighlightedSku(null);
        setHighlightUrgency(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // גלילה לשורה המודגשת ברגע שהיא מופיעה ב-DOM
  useEffect(() => {
    if (highlightedSku && highlightedRowRef.current) {
      // המתנה קצרה לוודא שה-DOM עודכן
      setTimeout(() => {
        highlightedRowRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [highlightedSku, skus]);

  // ============================================
  // פונקציות עזר
  // ============================================

  /**
   * טיפול בשינוי חיפוש עם debounce
   */
  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: value,
        page: 1, // חזרה לעמוד ראשון בחיפוש חדש
      }));
    }, 300);
  };

  /**
   * טיפול בשינוי פילטר מלאי
   */
  const handleStockFilterChange = (value: StockFilterType) => {
    setFilters((prev) => ({
      ...prev,
      stockFilter: value,
      page: 1,
    }));
  };

  /**
   * טיפול בשינוי פילטר קטגוריה
   */
  const handleCategoryChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      categoryId: value === 'all' ? undefined : value,
      page: 1,
    }));
  };

  /**
   * טיפול במיון
   */
  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder:
        prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  /**
   * טיפול בפגינציה
   */
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  /**
   * התחלת עריכה inline
   */
  const startEditing = (sku: string, currentValue: number) => {
    setEditing({
      sku,
      value: String(currentValue),
    });
  };

  /**
   * ביטול עריכה
   */
  const cancelEditing = () => {
    setEditing(null);
  };

  /**
   * שמירת כמות מלאי חדשה
   */
  const saveStockQuantity = async () => {
    if (!editing) return;

    const newQuantity = parseInt(editing.value, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
      setError('כמות לא תקינה');
      return;
    }

    setSaving(editing.sku);
    setError(null);

    try {
      await inventoryService.setStockQuantity(editing.sku, newQuantity);

      // עדכון מקומי
      setSkus((prev) =>
        prev.map((s) =>
          s.sku === editing.sku ? { ...s, stockQuantity: newQuantity } : s
        )
      );

      setSuccessMessage(`מלאי עודכן: ${editing.sku} → ${newQuantity}`);
      setTimeout(() => setSuccessMessage(null), 3000);

      setEditing(null);
    } catch (err: any) {
      console.error('Error saving stock:', err);
      setError(err.message || 'שגיאה בשמירת המלאי');
    } finally {
      setSaving(null);
    }
  };

  /**
   * עדכון מהיר (+ / -) עם Optimistic UI ו-debounce
   * המספר משתנה מיד ויזואלית, והשרת מתעדכן ברקע
   * לא מעדכנים אם יש עריכה פעילה ב-SKU הזה
   */
  const quickUpdateStock = (skuCode: string, delta: number) => {
    // אם המשתמש עורך את הערך הזה - לא מעדכנים (תן לו לסיים)
    if (editing?.sku === skuCode) return;

    // מציאת ה-SKU הנוכחי
    const currentSku = skus.find(s => s.sku === skuCode);
    if (!currentSku) return;

    // חישוב הערך הנוכחי (pending או מה-state)
    const currentValue = pendingValues[skuCode] ?? currentSku.stockQuantity;
    const newValue = Math.max(0, currentValue + delta); // לא להוריד מתחת ל-0

    // Optimistic Update - עדכון מיידי של התצוגה
    setPendingValues(prev => ({ ...prev, [skuCode]: newValue }));
    setSaving(skuCode);
    setError(null);

    // ביטול טיימאוט קודם אם קיים (debounce)
    if (debounceRefs.current[skuCode]) {
      clearTimeout(debounceRefs.current[skuCode]);
    }

    // שליחה לשרת אחרי debounce
    debounceRefs.current[skuCode] = setTimeout(async () => {
      try {
        // שליחת הערך המוחלט לשרת (לא delta)
        await inventoryService.setStockQuantity(skuCode, newValue);

        // עדכון ה-state הראשי עם הערך החדש
        setSkus((prev) =>
          prev.map((s) =>
            s.sku === skuCode ? { ...s, stockQuantity: newValue } : s
          )
        );

        // ניקוי ה-pending value
        setPendingValues(prev => {
          const updated = { ...prev };
          delete updated[skuCode];
          return updated;
        });

        setSuccessMessage(`מלאי עודכן: ${skuCode} → ${newValue}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err: any) {
        console.error('Error updating stock:', err);
        setError(err.message || 'שגיאה בעדכון המלאי');

        // Rollback - מחזירים לערך המקורי
        setPendingValues(prev => {
          const updated = { ...prev };
          delete updated[skuCode];
          return updated;
        });
      } finally {
        setSaving(null);
        delete debounceRefs.current[skuCode];
      }
    }, DEBOUNCE_DELAY);
  };

  /**
   * קבלת צבע badge לפי מצב מלאי והסף המוגדר למוצר
   * משתמש בסף הספציפי למוצר אם קיים, אחרת בסף הגלובלי מההגדרות
   */
  const getStockBadgeClass = (quantity: number, threshold?: number): string => {
    const effectiveThreshold = threshold ?? globalLowStockThreshold;
    if (quantity === 0) return styles.stockBadgeOut;
    if (quantity <= effectiveThreshold) return styles.stockBadgeLow;
    return styles.stockBadgeOk;
  };

  // ============================================
  // רינדור - מצבי טעינה ושגיאה
  // ============================================

  if (loading && skus.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Icon name="Loader2" size={48} className={styles.spinner} />
          <p>טוען נתוני מלאי...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // רינדור - תוכן ראשי
  // ============================================

  return (
    <div className={styles.container}>
      {/* כותרת הדף */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <Icon name="Boxes" size={28} className={styles.titleIcon} />
          <h1 className={styles.title}>ניהול מלאי</h1>
        </div>
        <p className={styles.subtitle}>
          ניהול כמויות מלאי לכל וריאנטי המוצרים (SKUs)
        </p>
      </header>

      {/* הודעת הצלחה */}
      {successMessage && (
        <div className={styles.successBanner}>
          <Icon name="CheckCircle2" size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* הודעת שגיאה */}
      {error && (
        <div className={styles.errorBanner}>
          <Icon name="AlertCircle" size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.dismissButton} title="סגור">
            <Icon name="X" size={16} />
          </button>
        </div>
      )}

      {/* סרגל פילטרים */}
      <section className={styles.filtersSection}>
        <Card className={styles.filtersCard}>
          <div className={styles.filtersRow}>
            {/* חיפוש */}
            <div className={styles.searchBox}>
              <Icon name="Search" size={20} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="חיפוש לפי SKU או שם..."
                defaultValue={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* פילטר קטגוריה */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                <Icon name="FolderTree" size={16} />
                קטגוריה
              </label>
              <NativeSelect
                options={categoryOptions}
                value={filters.categoryId || 'all'}
                onChange={handleCategoryChange}
                disabled={categoriesLoading}
                standalone
                className={styles.categorySelect}
              />
            </div>

            {/* פילטר מלאי */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>סינון:</label>
              <div className={styles.filterButtons}>
                <button
                  className={`${styles.filterButton} ${
                    filters.stockFilter === 'all' ? styles.filterButtonActive : ''
                  }`}
                  onClick={() => handleStockFilterChange('all')}
                >
                  הכל
                </button>
                <button
                  className={`${styles.filterButton} ${
                    filters.stockFilter === 'in' ? styles.filterButtonActive : ''
                  }`}
                  onClick={() => handleStockFilterChange('in')}
                >
                  <Icon name="CheckCircle" size={14} />
                  במלאי
                </button>
                <button
                  className={`${styles.filterButton} ${
                    filters.stockFilter === 'low' ? styles.filterButtonActive : ''
                  }`}
                  onClick={() => handleStockFilterChange('low')}
                >
                  <Icon name="AlertTriangle" size={14} />
                  נמוך
                </button>
                <button
                  className={`${styles.filterButton} ${
                    filters.stockFilter === 'out' ? styles.filterButtonActive : ''
                  }`}
                  onClick={() => handleStockFilterChange('out')}
                >
                  <Icon name="XCircle" size={14} />
                  אזל
                </button>
              </div>
            </div>

            {/* כפתור רענון */}
            <Button
              onClick={fetchInventory}
              variant="ghost"
              className={styles.refreshButton}
              disabled={loading}
            >
              <Icon
                name="RefreshCw"
                size={16}
                className={loading ? styles.spinner : undefined}
              />
              רענון
            </Button>
          </div>

          {/* סטטיסטיקות */}
          <div className={styles.statsRow}>
            <span className={styles.statItem}>
              סה"כ: <strong>{pagination.total}</strong> פריטים
            </span>
            <span className={styles.statItem}>
              עמוד <strong>{pagination.page}</strong> מתוך{' '}
              <strong>{pagination.totalPages}</strong>
            </span>
          </div>
        </Card>
      </section>

      {/* טבלת מלאי */}
      <section className={styles.tableSection}>
        <Card className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th
                    className={styles.sortableHeader}
                    onClick={() => handleSort('sku')}
                  >
                    קוד SKU
                    {filters.sortBy === 'sku' && (
                      <Icon
                        name={
                          filters.sortOrder === 'asc'
                            ? 'ChevronUp'
                            : 'ChevronDown'
                        }
                        size={14}
                      />
                    )}
                  </th>
                  <th>שם המוצר</th>
                  <th>וריאנט</th>
                  <th
                    className={styles.sortableHeader}
                    onClick={() => handleSort('stockQuantity')}
                  >
                    כמות במלאי
                    {filters.sortBy === 'stockQuantity' && (
                      <Icon
                        name={
                          filters.sortOrder === 'asc'
                            ? 'ChevronUp'
                            : 'ChevronDown'
                        }
                        size={14}
                      />
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {skus.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyCell}>
                      <div className={styles.emptyState}>
                        <Icon name="Inbox" size={48} />
                        <p>לא נמצאו פריטים</p>
                        {filters.search && (
                          <span>נסה לחפש משהו אחר</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  skus.map((sku) => (
                    <tr
                      key={sku._id}
                      ref={sku.sku === highlightedSku ? highlightedRowRef : null}
                      className={`
                        ${sku.sku === highlightedSku && highlightUrgency === 'critical' ? styles.highlightedRowCritical : ''}
                        ${sku.sku === highlightedSku && highlightUrgency === 'high' ? styles.highlightedRowHigh : ''}
                        ${sku.sku === highlightedSku && highlightUrgency === 'medium' ? styles.highlightedRowMedium : ''}
                      `.trim() || undefined}
                    >
                      <td className={styles.skuCell}>
                        <code className={styles.skuCode}>{sku.sku}</code>
                      </td>
                      <td className={styles.productCell}>
                        <div className={styles.productInfo}>
                          {sku.images?.[0] ? (
                            <img
                              src={(sku.images[0] as any)?.thumbnail || (sku.images[0] as any)?.medium || (sku.images[0] as any)?.url || '/ismoke-placeholder.png'}
                              alt=""
                              className={styles.productImage}
                            />
                          ) : sku.productId?.images?.[0] ? (
                            <img
                              src={(sku.productId.images[0] as any)?.thumbnail || (sku.productId.images[0] as any)?.medium || (sku.productId.images[0] as any)?.url || '/ismoke-placeholder.png'}
                              alt=""
                              className={styles.productImage}
                            />
                          ) : (
                            <div className={styles.productImagePlaceholder}>
                              <Icon name="Package" size={16} />
                            </div>
                          )}
                          <span className={styles.productName}>
                            {sku.productId?.name || sku.name || 'ללא שם'}
                          </span>
                        </div>
                      </td>
                      <td className={styles.variantCell}>
                        {sku.color && (
                          <span className={styles.variantTag}>
                            {sku.color}
                          </span>
                        )}
                        {sku.attributes &&
                          Object.entries(sku.attributes).map(([key, value]) => (
                            <span key={key} className={styles.variantTag}>
                              {key}: {value}
                            </span>
                          ))}
                      </td>
                      <td className={styles.stockCell}>
                        {/* QuantitySelector - כפתורי +/- עם input באמצע */}
                        {/* Optimistic UI: מציג pending value מיד ומעדכן שרת ברקע */}
                        <div className={styles.quantitySelectorWrapper}>
                          <div className={styles.quantitySelector}>
                            <button
                              className={styles.quantityButton}
                              onClick={() => quickUpdateStock(sku.sku, -1)}
                              disabled={(pendingValues[sku.sku] ?? sku.stockQuantity) === 0}
                              title="הפחת 1 יחידה"
                              aria-label="הפחת יחידה"
                            >
                              −
                            </button>
                            {editing?.sku === sku.sku ? (
                              <input
                                type="number"
                                min="0"
                                value={editing.value}
                                onChange={(e) =>
                                  setEditing({ ...editing, value: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveStockQuantity();
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                                onBlur={saveStockQuantity}
                                className={styles.quantityInput}
                                autoFocus
                                title="כמות מלאי"
                                aria-label="כמות מלאי"
                              />
                            ) : (
                              <button
                                className={`${styles.quantityDisplay} ${getStockBadgeClass(
                                  pendingValues[sku.sku] ?? sku.stockQuantity,
                                  sku.productId?.lowStockThreshold
                                )}`}
                                onClick={() =>
                                  startEditing(sku.sku, pendingValues[sku.sku] ?? sku.stockQuantity)
                                }
                                title="לחץ לעריכה"
                              >
                                {/* Optimistic: מציג pending value או ערך אמיתי */}
                                {pendingValues[sku.sku] ?? sku.stockQuantity}
                              </button>
                            )}
                            <button
                              className={styles.quantityButton}
                              onClick={() => quickUpdateStock(sku.sku, 1)}
                              title="הוסף 1 יחידה"
                              aria-label="הוסף יחידה"
                            >
                              +
                            </button>
                          </div>
                          {/* ספינר טעינה קטן - מוצג כשיש pending value */}
                          {(saving === sku.sku || pendingValues[sku.sku] !== undefined) && (
                            <span className={styles.inlineSpinner} aria-hidden="true" title="מעדכן..." />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* פגינציה */}
          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationButton}
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                title="עמוד ראשון"
              >
                <Icon name="ChevronsRight" size={16} />
              </button>
              <button
                className={styles.paginationButton}
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                title="עמוד קודם"
              >
                <Icon name="ChevronRight" size={16} />
              </button>
              <span className={styles.paginationInfo}>
                עמוד {pagination.page} מתוך {pagination.totalPages}
              </span>
              <button
                className={styles.paginationButton}
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                title="עמוד הבא"
              >
                <Icon name="ChevronLeft" size={16} />
              </button>
              <button
                className={styles.paginationButton}
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                title="עמוד אחרון"
              >
                <Icon name="ChevronsLeft" size={16} />
              </button>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};

export default InventoryManagementPage;
