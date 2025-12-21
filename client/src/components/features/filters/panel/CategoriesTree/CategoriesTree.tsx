import React from 'react';
import { useAppSelector, useAppDispatch } from '../../../../../hooks/reduxHooks';
import { 
  fetchCategoriesTree,
  selectCategoriesTree,
  selectCategoriesLoading,
  selectCategoriesError
} from '../../../../../store/slices/categoriesSlice';
import type { CategoryTreeNodeClient } from '@/services/categoryService';
// שימוש ב-React.useMemo במקום ייבוא עצמאי כדי לשמור על עקביות הקריאות ל-hooks
import { buildCategoryDescendantsMap, getDescendantsFromMap } from '@/services/categoryHierarchyService';
import styles from './CategoriesTree.module.css';
import { Button, Icon } from '@/components/ui';

interface CategoriesTreeProps {
  selectedCategoryIds: string[];
  onToggle: (id: string) => void;
  resetTreeKey?: number;
}

/**
 * CategoriesTree עם expand/collapse ונגישות בסיסית (ARIA)
 * תומך בעומק בלתי מוגבל; פותח מסלול אוטומטי לקטגוריה נבחרת
 */
const CategoriesTree: React.FC<CategoriesTreeProps> = ({ selectedCategoryIds, onToggle, resetTreeKey }) => {
  // שימוש ב-Redux במקום state מקומי
  const dispatch = useAppDispatch();
  const tree = useAppSelector(selectCategoriesTree);
  const loading = useAppSelector(selectCategoriesLoading);
  const error = useAppSelector(selectCategoriesError);
  
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // איפוס expanded כאשר resetTreeKey משתנה
  React.useEffect(() => {
    setExpanded(new Set());
  }, [resetTreeKey]);

  // בניית מפה של יורשים (descendants) באופן לא-תנאי כדי לא לשבור את סדר ה-hooks
  const descendantsMap = React.useMemo(() => buildCategoryDescendantsMap(tree), [tree]);

  // טעינת קטגוריות מ-Redux אם אין נתונים
  React.useEffect(() => {
    if (tree.length === 0 && !loading && !error) {
      dispatch(fetchCategoriesTree());
    }
  }, [dispatch, tree.length, loading, error]);

  // אין יותר שימוש ב-window כדי לשתף את ה‑categoriesTree — כולם יקראו מה‑store

  // פתיחת מסלול לקטגוריות הנבחרות (אם קיימות) כאשר העץ נטען
  React.useEffect(() => {
    if (!tree || tree.length === 0 || selectedCategoryIds.length === 0) return;
    const toOpen = new Set<string>();
    // חישוב מסלול להורים: עוברים על כל הצמתים ומחזיקים parent map זמני
    const parentMap = new Map<string, string | null>();
    const buildParentMap = (nodes: CategoryTreeNodeClient[], parentId: string | null) => {
      for (const n of nodes) {
        parentMap.set(n._id, parentId);
        if (n.children?.length) buildParentMap(n.children, n._id);
      }
    };
    buildParentMap(tree, null);
    
    // פתיחת מסלול לכל קטגוריה נבחרת
    selectedCategoryIds.forEach(selectedId => {
      let current: string | null = selectedId;
      while (current) {
        const p: string | null = parentMap.get(current) ?? null;
        if (p) toOpen.add(p);
        current = p;
      }
    });
    
    setExpanded(prev => new Set([...prev, ...toOpen]));
  }, [tree, selectedCategoryIds]);

  if (loading) return <div className={styles.state} role="status" aria-live="polite">טוען קטגוריות...</div>;
  if (error) return <div className={styles.state} role="alert">{error}</div>;
  if (!tree) return null;

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });


  const renderNode = (n: CategoryTreeNodeClient, depth: number) => {
    const isSelected = selectedCategoryIds.includes(n._id);
    const hasChildren = !!(n.children && n.children.length);
    const isExpanded = expanded.has(n._id);
    let indeterminate = false;
    if (tree && hasChildren) {
      const all = getDescendantsFromMap(descendantsMap, n._id);
      const checkedCount = all.filter(id => selectedCategoryIds.includes(id)).length;
      if (checkedCount > 0 && checkedCount < all.length) indeterminate = true;
    }
    const depthClass = depth === 0 ? styles.depth0 : depth === 1 ? styles.depth1 : styles.depth2;
    return (
      <li key={n._id} className={depthClass}>
        <div className={styles.row}>
          <label className={styles.nodeLabel}>
            <input
              type="checkbox"
              checked={isSelected}
              ref={el => { if (el) el.indeterminate = indeterminate; }}
              onChange={() => onToggle(n._id)}
              className={styles.checkbox}
              aria-label={`בחר קטגוריה ${n.name}`}
            />
            <span 
              className={styles.categoryName}
              onClick={(e) => {
                if (hasChildren) {
                  e.preventDefault();
                  toggle(n._id);
                }
              }}
            >
              {n.name}
            </span>
            {hasChildren && (
              <span 
                className={styles.expandIcon}
                onClick={(e) => {
                  e.preventDefault();
                  toggle(n._id);
                }}
              >
                <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={16} />
              </span>
            )}
          </label>
        </div>
        {hasChildren && isExpanded && (
          <ul className={styles.children}>
            {n.children!.map(child => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className={styles.tree} aria-label="קטגוריות">
      <div className={styles.headerRow}>
        {/* <strong className={styles.title}>קטגוריות</strong> */}
        <div className={styles.headerControls}>
          <Button
            type="button"
            className={styles.clearBtn}
            variant="outline"
            size="sm"
            disabled={selectedCategoryIds.length === 0}
            onClick={() => onToggle('')} // נשלח ערך ריק לביטול כל הקטגוריות
          >
            כל הקטגוריות
          </Button>
        </div>
      </div>
      <ul className={styles.list}>
        {tree.map(root => renderNode(root, 0))}
      </ul>
    </div>
  );
};

export default React.memo(CategoriesTree);
