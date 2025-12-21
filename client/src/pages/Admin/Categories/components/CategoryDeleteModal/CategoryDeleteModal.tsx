import React, { useState, useMemo } from 'react';
import type { CategoryStats, CategoryDeleteOptions } from '../../../../../types/Category';
import type { CategoryTreeNodeClient } from '../../../../../services/categoryService';
import { flattenTree } from '../../../../../services/categoryService';
import Modal from '../../../../../components/ui/Modal';
import { Button, Icon } from '../../../../../components/ui';
import styles from './CategoryDeleteModal.module.css';

interface CategoryDeleteModalProps {
  isOpen: boolean;
  category: CategoryTreeNodeClient | null;
  stats: CategoryStats | null;
  loadingStats: boolean;
  tree: CategoryTreeNodeClient[];
  onConfirm: (options: CategoryDeleteOptions) => Promise<void>;
  onCancel: () => void;
  deleting: boolean;
}

/**
 * מודאל אישור מחיקת קטגוריה
 * מציג סטטיסטיקות ואפשרויות למחיקה
 */
export const CategoryDeleteModal: React.FC<CategoryDeleteModalProps> = ({
  isOpen,
  category,
  stats,
  loadingStats,
  tree,
  onConfirm,
  onCancel,
  deleting,
}) => {
  // אפשרויות מחיקה
  const [deleteSubcategories, setDeleteSubcategories] = useState(false);
  const [reassignTo, setReassignTo] = useState<string>('');

  // קטגוריות זמינות להעברה (לא הקטגוריה הנמחקת וצאצאיה)
  const availableCategories = useMemo(() => {
    if (!category) return [];
    
    const flat = flattenTree(tree);
    
    // סנן את הקטגוריה הנמחקת וצאצאיה
    const excludeIds = new Set<string>();
    excludeIds.add(category._id);
    
    const addDescendants = (nodeId: string) => {
      const node = flat.find(n => n._id === nodeId);
      if (node?.children) {
        for (const child of node.children) {
          excludeIds.add(child._id);
          addDescendants(child._id);
        }
      }
    };
    addDescendants(category._id);
    
    return flat.filter(node => !excludeIds.has(node._id));
  }, [tree, category]);

  // האם יש מוצרים שיושפעו
  const hasProducts = stats && stats.descendantProductsCount > 0;
  const hasSubcategories = stats && stats.subcategoriesCount > 0;

  // טיפול באישור
  const handleConfirm = async () => {
    const options: CategoryDeleteOptions = {};
    
    if (hasSubcategories && deleteSubcategories) {
      options.deleteSubcategories = true;
    }
    
    if (hasProducts && reassignTo) {
      options.reassignTo = reassignTo;
    } else if (hasProducts) {
      options.reassignTo = null; // הסרת categoryId מהמוצרים
    }
    
    await onConfirm(options);
  };

  // איפוס בסגירה
  const handleClose = () => {
    setDeleteSubcategories(false);
    setReassignTo('');
    onCancel();
  };

  if (!category) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="מחיקת קטגוריה">
      <div className={styles.content}>
        {/* אזהרה */}
        <div className={styles.warning}>
          <Icon name="AlertTriangle" size={24} />
          <span>פעולה זו אינה ניתנת לביטול!</span>
        </div>

        {/* פרטי הקטגוריה */}
        <div className={styles.categoryInfo}>
          <strong>קטגוריה למחיקה:</strong>
          <span className={styles.categoryName}>{category.name}</span>
          <code className={styles.categoryPath}>{category.path || `/${category.slug}`}</code>
        </div>

        {/* סטטיסטיקות */}
        {loadingStats ? (
          <div className={styles.loading}>
            <Icon name="Loader2" size={20} className={styles.spinner} />
            <span>טוען נתונים...</span>
          </div>
        ) : stats ? (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <Icon name="FolderTree" size={18} />
              <span>{stats.subcategoriesCount} תת-קטגוריות</span>
            </div>
            <div className={styles.statItem}>
              <Icon name="Package" size={18} />
              <span>{stats.productsCount} מוצרים ישירים</span>
            </div>
            {stats.descendantProductsCount > stats.productsCount && (
              <div className={styles.statItem}>
                <Icon name="Package" size={18} />
                <span>{stats.descendantProductsCount} מוצרים סה"כ (כולל צאצאים)</span>
              </div>
            )}
          </div>
        ) : null}

        {/* אפשרויות */}
        <div className={styles.options}>
          {/* אפשרות מחיקת תת-קטגוריות */}
          {hasSubcategories && (
            <div className={styles.option}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={deleteSubcategories}
                  onChange={(e) => setDeleteSubcategories(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>מחק גם את כל תת-הקטגוריות ({stats?.subcategoriesCount})</span>
              </label>
              {!deleteSubcategories && (
                <p className={styles.optionHint}>
                  אם לא תבחר באפשרות זו, לא ניתן יהיה למחוק את הקטגוריה
                </p>
              )}
            </div>
          )}

          {/* אפשרות העברת מוצרים */}
          {hasProducts && (
            <div className={styles.option}>
              <label htmlFor="reassignCategory" className={styles.selectLabel}>
                מה לעשות עם {stats?.descendantProductsCount} המוצרים?
              </label>
              <select
                id="reassignCategory"
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className={styles.select}
                title="בחר קטגוריה להעברת המוצרים"
              >
                <option value="">הסר את הקטגוריה מהמוצרים</option>
                {availableCategories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    העבר ל: {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* כפתורים */}
        <div className={styles.actions}>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={deleting}
          >
            ביטול
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={deleting || Boolean(hasSubcategories && !deleteSubcategories)}
            className={styles.deleteButton}
          >
            {deleting ? (
              <>
                <Icon name="Loader2" size={18} className={styles.spinner} />
                מוחק...
              </>
            ) : (
              <>
                <Icon name="Trash2" size={18} />
                מחק קטגוריה
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CategoryDeleteModal;
