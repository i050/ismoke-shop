import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Category, CategoryCreateRequest, CategoryUpdateRequest } from '../../../../../types/Category';
import type { CategoryTreeNodeClient } from '../../../../../services/categoryService';
import { getDescendantIds, findNodeById } from '../../../../../services/categoryService';
import { Button, Icon } from '../../../../../components/ui';
import styles from './CategoryForm.module.css';

interface CategoryFormProps {
  mode: 'create' | 'edit';
  category?: Category;               // רק במצב עריכה
  tree: CategoryTreeNodeClient[];    // עץ הקטגוריות לבחירת הורה
  onSubmit: (data: CategoryCreateRequest | CategoryUpdateRequest) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => void;             // רק במצב עריכה
  saving: boolean;
  error: string | null;
  initialParentId?: string;          // parentId התחלתי (למצב יצירה)
}

/**
 * טופס יצירה/עריכה של קטגוריה
 * כולל URL preview בזמן אמת וסינון מעגליות
 */
export const CategoryForm: React.FC<CategoryFormProps> = ({
  mode,
  category,
  tree,
  onSubmit,
  onCancel,
  onDelete,
  saving,
  error,
  initialParentId,
}) => {
  // === State טופס ===
  const [name, setName] = useState(category?.name || '');
  const [slug, setSlug] = useState(category?.slug || '');
  const [parentId, setParentId] = useState<string>(
    category?.parentId || initialParentId || ''
  );
  const [description, setDescription] = useState(category?.description || '');
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  
  // האם המשתמש שינה ידנית את ה-slug
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // === חישוב slug אוטומטי מהשם ===
  useEffect(() => {
    if (!slugManuallyEdited && mode === 'create') {
      const autoSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(autoSlug);
    }
  }, [name, slugManuallyEdited, mode]);

  // === סינון קטגוריות זמינות לבחירה כהורה ===
  // במצב עריכה: סינון הקטגוריה עצמה + כל צאצאיה
  const availableParents = useMemo(() => {
    const flatten = (nodes: CategoryTreeNodeClient[], depth = 0): Array<CategoryTreeNodeClient & { depth: number }> => {
      const result: Array<CategoryTreeNodeClient & { depth: number }> = [];
      for (const node of nodes) {
        result.push({ ...node, depth });
        if (node.children.length > 0) {
          result.push(...flatten(node.children, depth + 1));
        }
      }
      return result;
    };

    let flat = flatten(tree);

    // במצב עריכה - סנן את הקטגוריה עצמה וצאצאיה
    if (mode === 'edit' && category) {
      const descendantIds = getDescendantIds(tree, category._id);
      const excludeIds = new Set([category._id, ...descendantIds]);
      flat = flat.filter(node => !excludeIds.has(node._id));
    }

    // סנן רמות עמוקות מדי (מקסימום 3 רמות: 0, 1, 2)
    // אם בוחרים הורה ברמה 2, לא ניתן ליצור תת-קטגוריה
    flat = flat.filter(node => (node.level ?? 0) < 2);

    return flat;
  }, [tree, mode, category]);

  // === חישוב URL Preview ===
  const urlPreview = useMemo(() => {
    if (!slug) return '';
    
    if (!parentId) {
      return `/${slug}`;
    }
    
    const parentNode = findNodeById(tree, parentId);
    if (parentNode) {
      const parentPath = parentNode.path || `/${parentNode.slug}`;
      return `${parentPath}/${slug}`;
    }
    
    return `/${slug}`;
  }, [slug, parentId, tree]);

  // === ולידציה ===
  const validateForm = useCallback((): string | null => {
    if (!name.trim()) {
      return 'שם הקטגוריה הוא שדה חובה';
    }
    if (name.length < 2) {
      return 'שם הקטגוריה חייב להכיל לפחות 2 תווים';
    }
    if (name.length > 100) {
      return 'שם הקטגוריה לא יכול להכיל יותר מ-100 תווים';
    }
    if (!slug.trim()) {
      return 'ה-Slug הוא שדה חובה';
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return 'ה-Slug יכול להכיל רק אותיות קטנות באנגלית, מספרים ומקפים';
    }
    if (description && description.length > 500) {
      return 'התיאור לא יכול להכיל יותר מ-500 תווים';
    }
    return null;
  }, [name, slug, description]);

  // === שליחת הטופס ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      // TODO: הצגת שגיאה למשתמש
      console.error('❌ שגיאת ולידציה:', validationError);
      return;
    }

    const data: CategoryCreateRequest | CategoryUpdateRequest = {
      name: name.trim(),
      slug: slug.trim(),
      parentId: parentId || null,
      description: description.trim() || undefined,
      isActive,
      sortOrder,
    };

    await onSubmit(data);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* כותרת טופס */}
      <div className={styles.formHeader}>
        <h2>{mode === 'create' ? 'יצירת קטגוריה חדשה' : 'עריכת קטגוריה'}</h2>
        {mode === 'edit' && onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className={styles.deleteBtn}
          >
            <Icon name="Trash2" size={16} />
            מחק
          </Button>
        )}
      </div>

      {/* הודעת שגיאה */}
      {error && (
        <div className={styles.error} role="alert">
          <Icon name="AlertCircle" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* שדות הטופס */}
      <div className={styles.fields}>
        {/* שם */}
        <div className={styles.field}>
          <label htmlFor="categoryName" className={styles.label}>
            שם הקטגוריה <span className={styles.required}>*</span>
          </label>
          <input
            id="categoryName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: אלקטרוניקה"
            maxLength={100}
            required
            autoFocus
            className={styles.input}
          />
          <span className={styles.hint}>2-100 תווים</span>
        </div>

        {/* Slug */}
        <div className={styles.field}>
          <label htmlFor="categorySlug" className={styles.label}>
            Slug (כתובת URL) <span className={styles.required}>*</span>
          </label>
          <input
            id="categorySlug"
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManuallyEdited(true);
            }}
            placeholder="לדוגמה: electronics"
            pattern="[a-z0-9-]+"
            required
            dir="ltr"
            className={styles.input}
          />
          <span className={styles.hint}>
            אותיות קטנות באנגלית, מספרים ומקפים בלבד
          </span>
        </div>

        {/* URL Preview */}
        {urlPreview && (
          <div className={styles.urlPreview}>
            <Icon name="ExternalLink" size={16} />
            <span className={styles.urlLabel}>כתובת URL:</span>
            <code className={styles.urlValue}>{urlPreview}</code>
          </div>
        )}

        {/* קטגוריית אב */}
        <div className={styles.field}>
          <label htmlFor="parentCategory" className={styles.label}>
            קטגוריית אב
          </label>
          <select
            id="parentCategory"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className={styles.select}
          >
            <option value="">ללא (קטגוריה ראשית)</option>
            {availableParents.map((node) => (
              <option key={node._id} value={node._id}>
                {'—'.repeat(node.depth)} {node.name}
              </option>
            ))}
          </select>
          <span className={styles.hint}>
            ניתן לבנות עד 3 רמות של קטגוריות
          </span>
        </div>

        {/* תיאור */}
        <div className={styles.field}>
          <label htmlFor="categoryDescription" className={styles.label}>
            תיאור
          </label>
          <textarea
            id="categoryDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="תיאור קצר של הקטגוריה (אופציונלי)"
            maxLength={500}
            rows={3}
            className={styles.textarea}
          />
          <span className={styles.hint}>
            {description.length}/500 תווים
          </span>
        </div>

        {/* סדר תצוגה */}
        <div className={styles.field}>
          <label htmlFor="sortOrder" className={styles.label}>
            סדר תצוגה
          </label>
          <input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            min={0}
            max={9999}
            className={styles.input}
          />
          <span className={styles.hint}>
            מספר נמוך יותר = מוצג קודם
          </span>
        </div>

        {/* פעיל/לא פעיל */}
        {/* <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className={styles.checkbox}
            />
            <span>קטגוריה פעילה</span>
          </label>
          <span className={styles.hint}>
            קטגוריות לא פעילות לא יוצגו בחנות
          </span>
        </div> */}
      </div>

      {/* כפתורי פעולה */}
      <div className={styles.actions}>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          ביטול
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={saving || !name.trim() || !slug.trim()}
        >
          {saving ? (
            <>
              <Icon name="Loader2" size={18} className={styles.spinner} />
              שומר...
            </>
          ) : mode === 'create' ? (
            <>
              <Icon name="Plus" size={18} />
              צור קטגוריה
            </>
          ) : (
            <>
              <Icon name="Check" size={18} />
              שמור שינויים
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;
