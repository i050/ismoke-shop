import React, { useState, useCallback } from 'react';
import type { CategoryTreeNodeClient } from '../../../../../services/categoryService';
import { Icon, Button } from '../../../../../components/ui';
import styles from './CategoryTree.module.css';

interface CategoryTreeProps {
  tree: CategoryTreeNodeClient[];
  onEdit: (category: CategoryTreeNodeClient) => void;
  onDelete: (category: CategoryTreeNodeClient) => void;
  onToggleActive: (category: CategoryTreeNodeClient) => void;
  onAddSubcategory: (parentId: string) => void;
  /** callback לפתיחת עורך תבנית מפרט טכני */
  onEditSpecificationTemplate?: (category: CategoryTreeNodeClient) => void;
}

/**
 * עץ קטגוריות אינטראקטיבי לניהול Admin
 * תומך ב-expand/collapse, הצגת סטטוס ופעולות
 */
export const CategoryTree: React.FC<CategoryTreeProps> = ({
  tree,
  onEdit,
  onDelete,
  onToggleActive,
  onAddSubcategory,
  onEditSpecificationTemplate,
}) => {
  // מעקב אחרי צמתים פתוחים
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // פתיחת רמה ראשונה כברירת מחדל
    const initial = new Set<string>();
    tree.forEach(node => initial.add(node._id));
    return initial;
  });

  // Toggle פתיחה/סגירה של צומת
  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // פתיחת כל הצמתים
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (nodes: CategoryTreeNodeClient[]) => {
      for (const node of nodes) {
        allIds.add(node._id);
        if (node.children.length > 0) {
          collectIds(node.children);
        }
      }
    };
    collectIds(tree);
    setExpanded(allIds);
  }, [tree]);

  // סגירת כל הצמתים
  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  // רינדור צומת בודד
  const renderNode = (node: CategoryTreeNodeClient, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node._id);
    const isActive = node.isActive !== false; // ברירת מחדל: פעיל
    // חישוב מחלקה לפי עומק
    const depthClass = depth === 0 ? styles.depth0 
      : depth === 1 ? styles.depth1 
      : depth === 2 ? styles.depth2 
      : styles.depth3;

    return (
      <li key={node._id} className={styles.node}>
        <div 
          className={`${styles.row} ${!isActive ? styles.inactive : ''} ${depthClass}`}
        >
          {/* כפתור expand/collapse */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={styles.expandBtn}
            onClick={() => toggleExpand(node._id)}
            disabled={!hasChildren}
            aria-label={isExpanded ? 'סגור' : 'פתח'}
          >
            {hasChildren ? (
              <Icon 
                name={isExpanded ? 'ChevronDown' : 'ChevronLeft'} 
                size={16} 
              />
            ) : (
              <span className={styles.spacer} />
            )}
          </Button>

          {/* אייקון קטגוריה */}
          <span className={styles.icon}>
            <Icon 
              name={hasChildren ? (isExpanded ? 'FolderOpen' : 'Folder') : 'File'} 
              size={18} 
            />
          </span>

          {/* שם הקטגוריה */}
          <span className={styles.name}>
            {node.name}
          </span>

          {/* תגית לא פעיל */}
          {!isActive && (
            <span className={styles.badge}>לא פעיל</span>
          )}

          {/* נתיב */}
          <span className={styles.path}>
            {node.path || `/${node.slug}`}
          </span>

          {/* פעולות */}
          <div className={styles.actions}>
            {/* Toggle פעיל/לא פעיל */}
            {/* <button
              type="button"
              className={`${styles.actionBtn} ${isActive ? styles.active : ''}`}
              onClick={() => onToggleActive(node)}
              title={isActive ? 'השבת קטגוריה' : 'הפעל קטגוריה'}
              aria-label={isActive ? 'השבת' : 'הפעל'}
            >
              <Icon name={isActive ? 'Eye' : 'EyeOff'} size={16} />
            </button> */}

            {/* הוספת תת-קטגוריה (עד 3 רמות) */}
            {(node.level ?? 0) < 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={styles.actionBtn}
                onClick={() => onAddSubcategory(node._id)}
                title="הוסף תת-קטגוריה"
                aria-label="הוסף תת-קטגוריה"
              >
                <Icon name="FolderPlus" size={16} />
              </Button>
            )}

            {/* הגדרת מפרט טכני */}
            {onEditSpecificationTemplate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={styles.actionBtn}
                onClick={() => onEditSpecificationTemplate(node)}
                title="הגדר מפרט טכני"
                aria-label="הגדר מפרט טכני"
              >
                <Icon name="FileText" size={16} />
              </Button>
            )}

            {/* עריכה */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={styles.actionBtn}
              onClick={() => onEdit(node)}
              title="ערוך קטגוריה"
              aria-label="ערוך"
            >
              <Icon name="Edit" size={16} />
            </Button>

            {/* מחיקה */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={() => onDelete(node)}
              title="מחק קטגוריה"
              aria-label="מחק"
            >
              <Icon name="Trash2" size={16} />
            </Button>
          </div>
        </div>

        {/* ילדים */}
        {hasChildren && isExpanded && (
          <ul className={styles.children}>
            {node.children.map(child => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className={styles.treeWrapper}>
      {/* כלי עץ */}
      <div className={styles.toolbar}>
        <Button
          variant="ghost"
          size="sm"
          onClick={expandAll}
          className={styles.toolbarBtn}
        >
          <Icon name="ChevronDown" size={16} />
          פתח הכל
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={collapseAll}
          className={styles.toolbarBtn}
        >
          <Icon name="ChevronUp" size={16} />
          סגור הכל
        </Button>
      </div>

      {/* העץ */}
      <ul className={styles.tree} role="tree" aria-label="עץ קטגוריות">
        {tree.map(node => renderNode(node, 0))}
      </ul>
    </div>
  );
};

export default CategoryTree;
