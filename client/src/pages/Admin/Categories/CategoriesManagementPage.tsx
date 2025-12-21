import React, { useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../../hooks/reduxHooks';
import { useToast } from '../../../hooks/useToast';
import {
  fetchCategoriesTree,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchCategoryStats,
  setModeList,
  setModeCreate,
  setModeEdit,
  clearCategoryStats,
  selectCategoriesTree,
  selectCategoriesLoading,
  selectCategoriesError,
  selectCategoryMode,
  selectEditingCategory,
  selectParentIdForCreate,
  selectCategorySaving,
  selectCategoryDeleting,
  selectCategoryFormError,
  selectCategoryStats,
  selectLoadingStats,
} from '../../../store/slices/categoriesSlice';
import { TitleWithIcon, Button, Icon } from '../../../components/ui';
import { CategoryTree } from './components/CategoryTree';
import { CategoryForm } from './components/CategoryForm';
import { CategoryDeleteModal } from './components/CategoryDeleteModal';
import type { CategoryCreateRequest, CategoryUpdateRequest, CategoryDeleteOptions, Category } from '../../../types/Category';
import type { CategoryTreeNodeClient } from '../../../services/categoryService';
import styles from './CategoriesManagementPage.module.css';

/**
 * דף ניהול קטגוריות - Admin
 * מאפשר יצירה, עריכה ומחיקה של קטגוריות בעץ היררכי
 */
const CategoriesManagementPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  // === State מ-Redux ===
  const tree = useAppSelector(selectCategoriesTree);
  const loading = useAppSelector(selectCategoriesLoading);
  const error = useAppSelector(selectCategoriesError);
  const mode = useAppSelector(selectCategoryMode);
  const editingCategory = useAppSelector(selectEditingCategory);
  const parentIdForCreate = useAppSelector(selectParentIdForCreate);
  const saving = useAppSelector(selectCategorySaving);
  const deleting = useAppSelector(selectCategoryDeleting);
  const formError = useAppSelector(selectCategoryFormError);
  const categoryStats = useAppSelector(selectCategoryStats);
  const loadingStats = useAppSelector(selectLoadingStats);

  // State מקומי למודאל מחיקה
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [categoryToDelete, setCategoryToDelete] = React.useState<CategoryTreeNodeClient | null>(null);

  // טעינת קטגוריות בעת טעינת הדף
  useEffect(() => {
    console.log('📁 טוען קטגוריות...');
    dispatch(fetchCategoriesTree());
  }, [dispatch]);

  // === Handlers ===

  // פתיחת טופס יצירת קטגוריה חדשה
  const handleAddCategory = useCallback((parentId?: string) => {
    console.log('➕ יצירת קטגוריה חדשה', parentId ? `תחת ${parentId}` : 'ראשית');
    dispatch(setModeCreate(parentId));
  }, [dispatch]);

  // פתיחת טופס עריכת קטגוריה
  const handleEditCategory = useCallback((category: CategoryTreeNodeClient) => {
    console.log('✏️ עריכת קטגוריה:', category.name);
    // המרה לטיפוס Category מלא
    const fullCategory: Category = {
      _id: category._id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      level: category.level ?? 0,
      path: category.path ?? `/${category.slug}`,
      isActive: category.isActive ?? true,
      sortOrder: category.sortOrder ?? 0,
      description: category.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch(setModeEdit(fullCategory));
  }, [dispatch]);

  // פתיחת מודאל מחיקה
  const handleDeleteClick = useCallback(async (category: CategoryTreeNodeClient) => {
    console.log('🗑️ בקשת מחיקת קטגוריה:', category.name);
    setCategoryToDelete(category);
    // טעינת סטטיסטיקות לפני פתיחת המודאל
    await dispatch(fetchCategoryStats(category._id));
    setDeleteModalOpen(true);
  }, [dispatch]);

  // ביצוע מחיקה
  const handleConfirmDelete = useCallback(async (options: CategoryDeleteOptions) => {
    if (!categoryToDelete) return;
    
    console.log('🗑️ מחיקת קטגוריה:', categoryToDelete.name, 'עם אפשרויות:', options);
    
    try {
      await dispatch(deleteCategory({ id: categoryToDelete._id, options })).unwrap();
      showToast('success', `הקטגוריה "${categoryToDelete.name}" נמחקה בהצלחה`);
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      dispatch(clearCategoryStats());
    } catch (err) {
      console.error('❌ שגיאה במחיקה:', err);
      showToast('error', `שגיאה במחיקת הקטגוריה: ${err}`);
    }
  }, [categoryToDelete, dispatch, showToast]);

  // ביטול מחיקה
  const handleCancelDelete = useCallback(() => {
    setDeleteModalOpen(false);
    setCategoryToDelete(null);
    dispatch(clearCategoryStats());
  }, [dispatch]);

  // שמירת קטגוריה (יצירה או עדכון)
  const handleSubmit = useCallback(async (data: CategoryCreateRequest | CategoryUpdateRequest) => {
    console.log('💾 שמירת קטגוריה:', data);
    
    try {
      if (mode === 'create') {
        await dispatch(createCategory(data as CategoryCreateRequest)).unwrap();
        showToast('success', 'הקטגוריה נוצרה בהצלחה');
      } else if (mode === 'edit' && editingCategory) {
        await dispatch(updateCategory({ id: editingCategory._id, data: data as CategoryUpdateRequest })).unwrap();
        showToast('success', 'הקטגוריה עודכנה בהצלחה');
      }
    } catch (err) {
      console.error('❌ שגיאה בשמירה:', err);
      showToast('error', `שגיאה בשמירת הקטגוריה: ${err}`);
    }
  }, [mode, editingCategory, dispatch, showToast]);

  // ביטול טופס
  const handleCancel = useCallback(() => {
    console.log('❌ ביטול טופס');
    dispatch(setModeList());
  }, [dispatch]);

  // Toggle פעיל/לא פעיל
  const handleToggleActive = useCallback(async (category: CategoryTreeNodeClient) => {
    const newStatus = !category.isActive;
    console.log(`🔄 שינוי סטטוס "${category.name}" ל-${newStatus ? 'פעיל' : 'לא פעיל'}`);
    
    try {
      await dispatch(updateCategory({ 
        id: category._id, 
        data: { isActive: newStatus } 
      })).unwrap();
      showToast('success', `הקטגוריה "${category.name}" ${newStatus ? 'הופעלה' : 'הושבתה'}`);
    } catch (err) {
      console.error('❌ שגיאה בשינוי סטטוס:', err);
      showToast('error', `שגיאה בשינוי סטטוס הקטגוריה`);
    }
  }, [dispatch, showToast]);

  return (
    <div className={styles.categoriesPage}>
      {/* כותרת */}
      <TitleWithIcon
        icon="FolderTree"
        title="ניהול קטגוריות"
        subtitle={
          mode === 'list'
            ? 'צפייה ועריכה של עץ הקטגוריות'
            : mode === 'create'
            ? 'יצירת קטגוריה חדשה'
            : 'עריכת קטגוריה'
        }
      />

      {/* תצוגת רשימה */}
      {mode === 'list' && (
        <>
          {/* Header עם כפתור הוספה */}
          <div className={styles.header}>
            <div className={styles.stats}>
              {/* <div className={styles.statsIcon}>
                <Icon name="FolderTree" size={24} />
              </div> */}
              <div className={styles.statsContent}>
                <span className={styles.totalCount}>
                  {tree.length > 0 ? countCategories(tree) : 0}
                </span>
                <span className={styles.statsLabel}>
                  {tree.length > 0 ? 'קטגוריות במערכת' : 'אין קטגוריות'}
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => handleAddCategory()}
              className={styles.addButton}
            >
              <Icon name="Plus" size={18} />
              קטגוריה חדשה
            </Button>
          </div>

          {/* הודעת שגיאה */}
          {error && (
            <div className={styles.errorBanner} role="alert">
              <Icon name="AlertCircle" size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* עץ קטגוריות */}
          <div className={styles.treeContainer}>
            {loading ? (
              <div className={styles.loading}>
                <Icon name="Loader2" size={24} className={styles.spinner} />
                <span>טוען קטגוריות...</span>
              </div>
            ) : tree.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Icon name="Folder" size={40} />
                </div>
                <h3>אין קטגוריות עדיין</h3>
                <p>צור את הקטגוריה הראשונה שלך כדי להתחיל לארגן את המוצרים</p>
                <Button variant="primary" onClick={() => handleAddCategory()}>
                  <Icon name="Plus" size={18} />
                  צור קטגוריה ראשונה
                </Button>
              </div>
            ) : (
              <CategoryTree
                tree={tree}
                onEdit={handleEditCategory}
                onDelete={handleDeleteClick}
                onToggleActive={handleToggleActive}
                onAddSubcategory={(parentId: string) => {
                  // מעבר ליצירה עם parentId שמור ב-Redux
                  handleAddCategory(parentId);
                }}
              />
            )}
          </div>
        </>
      )}

      {/* טופס יצירה */}
      {mode === 'create' && (
        <CategoryForm
          mode="create"
          tree={tree}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          saving={saving}
          error={formError}
          initialParentId={parentIdForCreate || undefined}
        />
      )}

      {/* טופס עריכה */}
      {mode === 'edit' && editingCategory && (
        <CategoryForm
          mode="edit"
          category={editingCategory}
          tree={tree}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onDelete={() => {
            // המרה לצומת עץ לפתיחת מודאל המחיקה
            const node: CategoryTreeNodeClient = {
              _id: editingCategory._id,
              name: editingCategory.name,
              slug: editingCategory.slug,
              parentId: editingCategory.parentId,
              children: [],
              level: editingCategory.level,
              path: editingCategory.path,
              isActive: editingCategory.isActive,
              sortOrder: editingCategory.sortOrder,
              description: editingCategory.description,
            };
            handleDeleteClick(node);
          }}
          saving={saving}
          error={formError}
        />
      )}

      {/* מודאל מחיקה */}
      <CategoryDeleteModal
        isOpen={deleteModalOpen}
        category={categoryToDelete}
        stats={categoryStats}
        loadingStats={loadingStats}
        tree={tree}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        deleting={deleting}
      />
    </div>
  );
};

// פונקציית עזר לספירת קטגוריות בעץ
function countCategories(tree: CategoryTreeNodeClient[]): number {
  let count = 0;
  const countRecursive = (nodes: CategoryTreeNodeClient[]) => {
    for (const node of nodes) {
      count++;
      if (node.children.length > 0) {
        countRecursive(node.children);
      }
    }
  };
  countRecursive(tree);
  return count;
}

export default CategoriesManagementPage;
