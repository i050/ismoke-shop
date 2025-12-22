import React from 'react';
import type { Product } from '../../../../../../types';
import ProductRow from '../ProductRow';
import Checkbox from '../../../../../ui/Checkbox';
import { Icon } from '../../../../../ui/Icon';
import { useAppDispatch, useAppSelector } from '../../../../../../hooks/reduxHooks';
import { toggleProductSelection, selectAllProducts, clearProductSelection } from '../../../../../../store/slices/productsManagementSlice';
import styles from './ProductsTable.module.css';

/**
 * ProductsTable - טבלת מוצרים מלאה
 * Phase 4.5: MVP Table Assembly
 * Phase 4.7.5: חיבור Bulk Selection ל-Redux
 * Phase 7: תמיכה בתצוגת מוצרים נמחקים עם כפתור שחזור
 */

interface ProductsTableProps {
  products: Product[];
  loading?: boolean;
  error?: string | null;
  onEdit: (productId: string) => void;
  onDelete: (productId: string) => void;
  onBulkDelete?: () => void;
  // Phase 7: פח אשפה - callback לשחזור מוצר
  onRestore?: (productId: string) => void;
  // Phase 7.2: מחיקה לצמיתות - פעולה בלתי הפיכה
  onPermanentlyDelete?: (productId: string) => void;
  // Phase 7: האם אנחנו בתצוגת מוצרים נמחקים
  isDeletedView?: boolean;
  /** סף מלאי נמוך גלובלי מהגדרות החנות */
  globalLowStockThreshold?: number;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  loading = false,
  error = null,
  onEdit,
  onDelete,
  onBulkDelete,
  onRestore,
  onPermanentlyDelete,
  isDeletedView = false,
  globalLowStockThreshold = 5,
}) => {
  const dispatch = useAppDispatch();
  
  // קריאת selectedIds מ-Redux במקום useState מקומי
  const selectedIds = useAppSelector(state => state.productsManagement.selectedIds);

  // בחירת/ביטול בחירה של שורה בודדת - דרך Redux
  const handleSelectRow = (productId: string) => {
    dispatch(toggleProductSelection(productId));
  };

  // בחירת/ביטול בחירה של כל השורות - דרך Redux
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      dispatch(selectAllProducts());
    } else {
      dispatch(clearProductSelection());
    }
  };

  // בדיקה אם כל השורות נבחרו
  const allSelected = products.length > 0 && selectedIds.length === products.length;

  // בדיקה אם חלק מהשורות נבחרו (indeterminate)
  const someSelected = selectedIds.length > 0 && selectedIds.length < products.length;

  // Empty State - אין מוצרים
  if (!loading && !error && products.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <Icon name={isDeletedView ? "Trash2" : "Package"} size={48} />
        </div>
        <h3 className={styles.emptyTitle}>
          {isDeletedView ? 'אין מוצרים בפח האשפה' : 'אין מוצרים להצגה'}
        </h3>
        <p className={styles.emptyDescription}>
          {isDeletedView 
            ? 'מוצרים שנמחקו יופיעו כאן ויהיה ניתן לשחזר אותם'
            : 'נסה לשנות את הפילטרים או להוסיף מוצר חדש'
          }
        </p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorIcon}>
          <Icon name="AlertTriangle" size={48} />
        </div>
        <h3 className={styles.errorTitle}>שגיאה בטעינת מוצרים</h3>
        <p className={styles.errorDescription}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      {/* Bulk Actions Bar - רק אם יש בחירות */}
      {selectedIds.length > 0 && (
        <div className={styles.bulkActionsBar}>
          <span className={styles.bulkCount}>
            {selectedIds.length} מוצרים נבחרו
          </span>
          <div className={styles.bulkActions}>
            <button
              className={styles.bulkDeleteBtn}
              onClick={onBulkDelete}
              disabled={!onBulkDelete}
            >
              מחק נבחרים
            </button>
            <button
              className={styles.bulkCancel}
              onClick={() => dispatch(clearProductSelection())}
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* טבלה עם overflow horizontal למובייל */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          {/* כותרות */}
          <thead className={styles.thead}>
            <tr>
              {/* <th className={styles.thCheckbox}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={handleSelectAll}
                />
              </th> */}
              <th className={styles.thImage}>תמונה</th>
              <th className={styles.thName}>שם המוצר</th>
              <th className={styles.thPrice}>מחיר</th>
              <th className={styles.thStock}>מלאי</th>
              {/* Phase 7: עמודת סטטוס הוסרה - הטאבים מפרידים בין פעילים לנמחקים */}
              {/* <th className={styles.thStatus}>סטטוס</th> */}
              {/* <th className={styles.thSales}>מכירות</th> */}
              <th className={styles.thActions}>פעולות</th>
            </tr>
          </thead>

          {/* תוכן */}
          <tbody className={styles.tbody}>
            {loading ? (
              // Loading skeleton - 5 שורות
              <>
                {[...Array(5)].map((_, index) => (
                  <tr key={`skeleton-${index}`} className={styles.skeletonRow}>
                    {/* <td className={styles.cellCheckbox}>
                      <div className={`${styles.skeleton} ${styles.skel_16_16}`} />
                    </td> */}
                    <td className={styles.cellImage}>
                      <div className={`${styles.skeleton} ${styles.skeletonImage}`} />
                    </td>
                    <td className={styles.cellName}>
                      <div className={`${styles.skeleton} ${styles.skel_200_16}`} />
                      <div className={`${styles.skeleton} ${styles.skel_150_14}`} />
                    </td>
                    <td className={styles.cellPrice}>
                      <div className={`${styles.skeleton} ${styles.skel_60_16}`} />
                    </td>
                    <td className={styles.cellStock}>
                      <div className={`${styles.skeleton} ${styles.skel_80_16}`} />
                    </td>
                    {/* Phase 7: תא סטטוס הוסר - הטאבים מפרידים בין פעילים לנמחקים */}
                    {/* <td className={styles.cellStatus}>
                      <div className={`${styles.skeleton} ${styles.skel_60_24}`} />
                    </td> */}
                    {/* <td className={styles.cellSales}>
                      <div className={`${styles.skeleton} ${styles.skel_30_16}`} />
                    </td> */}
                    <td className={styles.cellActions}>
                      <div className={`${styles.skeleton} ${styles.skel_80_32}`} />
                    </td>
                  </tr>
                ))}
              </>
            ) : (
              // שורות אמיתיות
              products.map((product, index) => {
                // *** בעברית: בחירת key ייחודי לשורה - עדיפות ל-_id (מזהה Mongo),
                // אחרת ל-sku אם קיים, ובאחריות only fallback מבוסס index.
                // שימוש ב-_id קבוע מונע התנהגות לא צפויה של React בעת עדכונים.
                const productKey = product._id ? String(product._id) : (product.sku ? String(product.sku) : `product-${index}`);

                return (
                  <ProductRow
                    key={productKey}
                    product={product}
                    isSelected={selectedIds.includes(product._id)}
                    onSelect={handleSelectRow}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onRestore={onRestore}
                    onPermanentlyDelete={onPermanentlyDelete}
                    isDeletedView={isDeletedView}
                    globalLowStockThreshold={globalLowStockThreshold}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsTable;
