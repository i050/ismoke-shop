// ייבוא Redux Toolkit לניהול מצב קטגוריות
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
// ייבוא שירות קטגוריות מה-API
import { 
  getCategoriesTree, 
  createCategory as apiCreateCategory,
  updateCategory as apiUpdateCategory,
  safeDeleteCategory as apiSafeDeleteCategory,
  getCategoryStats as apiGetCategoryStats,
  reorderCategories as apiReorderCategories,
  type CategoryTreeNodeClient 
} from '../../services/categoryService';
import type { 
  CategoryCreateRequest, 
  CategoryUpdateRequest, 
  CategoryDeleteOptions, 
  CategoryStats,
  CategoryReorderItem,
  Category 
} from '../../types/Category';

// ===== טיפוסים =====

// מצב ניהול (Admin)
type CategoryManagementMode = 'list' | 'create' | 'edit';

// הגדרת הטיפוס למצב הקטגוריות ב-Redux Store
interface CategoriesState {
  // נתוני עץ
  tree: CategoryTreeNodeClient[];   // עץ הקטגוריות המלא מה-API
  loading: boolean;                 // מצב טעינה - האם נתונים נטענים כרגע
  error: string | null;             // שגיאה אם יש - null אם הכל בסדר
  lastFetch: number | null;         // זמן טעינה אחרונה (timestamp) לcache יעיל
  treeResetKey: number;             // מונה לאיפוס עץ הפילטרים כשבוחרים מההדר
  
  // מצב ניהול (Admin)
  mode: CategoryManagementMode;     // מצב נוכחי: רשימה/יצירה/עריכה
  editingCategory: Category | null; // הקטגוריה הנערכת כרגע
  parentIdForCreate: string | null; // parentId התחלתי ליצירת תת-קטגוריה
  
  // מצב פעולות
  saving: boolean;                  // האם שומרים כרגע
  deleting: boolean;                // האם מוחקים כרגע
  formError: string | null;         // שגיאת טופס
  
  // סטטיסטיקות קטגוריה נבחרת
  selectedCategoryStats: CategoryStats | null;
  loadingStats: boolean;
}

// מצב התחלתי של הקטגוריות
const initialState: CategoriesState = {
  tree: [],
  loading: false,
  error: null,
  lastFetch: null,
  treeResetKey: 0,
  
  mode: 'list',
  editingCategory: null,
  parentIdForCreate: null,
  
  saving: false,
  deleting: false,
  formError: null,
  
  selectedCategoryStats: null,
  loadingStats: false,
};

// ===== Async Thunks =====

// טעינת עץ קטגוריות
export const fetchCategoriesTree = createAsyncThunk(
  'categories/fetchTree',
  async (_, { rejectWithValue }) => {
    try {
      const tree = await getCategoriesTree();
      return tree;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה בטעינת קטגוריות');
    }
  }
);

// יצירת קטגוריה חדשה
export const createCategory = createAsyncThunk(
  'categories/create',
  async (data: CategoryCreateRequest, { rejectWithValue, dispatch }) => {
    try {
      const category = await apiCreateCategory(data);
      // רענון העץ אחרי יצירה
      dispatch(fetchCategoriesTree());
      return category;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה ביצירת קטגוריה');
    }
  }
);

// עדכון קטגוריה קיימת
export const updateCategory = createAsyncThunk(
  'categories/update',
  async ({ id, data }: { id: string; data: CategoryUpdateRequest }, { rejectWithValue, dispatch }) => {
    try {
      const category = await apiUpdateCategory(id, data);
      // רענון העץ אחרי עדכון
      dispatch(fetchCategoriesTree());
      return category;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה בעדכון קטגוריה');
    }
  }
);

// מחיקה בטוחה של קטגוריה
export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async ({ id, options }: { id: string; options?: CategoryDeleteOptions }, { rejectWithValue, dispatch }) => {
    try {
      const result = await apiSafeDeleteCategory(id, options);
      // רענון העץ אחרי מחיקה
      dispatch(fetchCategoriesTree());
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה במחיקת קטגוריה');
    }
  }
);

// קבלת סטטיסטיקות קטגוריה
export const fetchCategoryStats = createAsyncThunk(
  'categories/fetchStats',
  async (id: string, { rejectWithValue }) => {
    try {
      const stats = await apiGetCategoryStats(id);
      return stats;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה בטעינת סטטיסטיקות');
    }
  }
);

// שינוי סדר קטגוריות
export const reorderCategories = createAsyncThunk(
  'categories/reorder',
  async (items: CategoryReorderItem[], { rejectWithValue, dispatch }) => {
    try {
      await apiReorderCategories(items);
      // רענון העץ אחרי שינוי סדר
      dispatch(fetchCategoriesTree());
      return items;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'שגיאה בשינוי סדר קטגוריות');
    }
  }
);

// ===== Slice =====

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    // פעולה לניקוי שגיאות
    clearError: (state) => {
      state.error = null;
      state.formError = null;
    },
    
    // פעולה לאיפוס cache
    invalidateCache: (state) => {
      state.lastFetch = null;
    },
    
    // פעולה לאיפוס עץ הפילטרים
    resetFilterTree: (state) => {
      state.treeResetKey = state.treeResetKey + 1;
    },
    
    // מעבר למצב רשימה
    setModeList: (state) => {
      state.mode = 'list';
      state.editingCategory = null;
      state.parentIdForCreate = null;
      state.formError = null;
    },
    
    // מעבר למצב יצירה (עם parentId אופציונלי לתת-קטגוריה)
    setModeCreate: (state, action: PayloadAction<string | undefined>) => {
      state.mode = 'create';
      state.editingCategory = null;
      state.parentIdForCreate = action.payload || null;
      state.formError = null;
    },
    
    // מעבר למצב עריכה
    setModeEdit: (state, action: PayloadAction<Category>) => {
      state.mode = 'edit';
      state.editingCategory = action.payload;
      state.formError = null;
    },
    
    // ניקוי סטטיסטיקות
    clearCategoryStats: (state) => {
      state.selectedCategoryStats = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // === טעינת עץ ===
      .addCase(fetchCategoriesTree.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoriesTree.fulfilled, (state, action: PayloadAction<CategoryTreeNodeClient[]>) => {
        state.loading = false;
        state.tree = action.payload;
        state.lastFetch = Date.now();
        state.error = null;
      })
      .addCase(fetchCategoriesTree.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'שגיאה לא ידועה בטעינת קטגוריות';
      })
      
      // === יצירת קטגוריה ===
      .addCase(createCategory.pending, (state) => {
        state.saving = true;
        state.formError = null;
      })
      .addCase(createCategory.fulfilled, (state) => {
        state.saving = false;
        state.mode = 'list';
        state.formError = null;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.saving = false;
        state.formError = action.payload as string;
      })
      
      // === עדכון קטגוריה ===
      .addCase(updateCategory.pending, (state) => {
        state.saving = true;
        state.formError = null;
      })
      .addCase(updateCategory.fulfilled, (state) => {
        state.saving = false;
        state.mode = 'list';
        state.editingCategory = null;
        state.formError = null;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.saving = false;
        state.formError = action.payload as string;
      })
      
      // === מחיקת קטגוריה ===
      .addCase(deleteCategory.pending, (state) => {
        state.deleting = true;
        state.formError = null;
      })
      .addCase(deleteCategory.fulfilled, (state) => {
        state.deleting = false;
        state.mode = 'list';
        state.editingCategory = null;
        state.selectedCategoryStats = null;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.deleting = false;
        state.formError = action.payload as string;
      })
      
      // === טעינת סטטיסטיקות ===
      .addCase(fetchCategoryStats.pending, (state) => {
        state.loadingStats = true;
      })
      .addCase(fetchCategoryStats.fulfilled, (state, action: PayloadAction<CategoryStats>) => {
        state.loadingStats = false;
        state.selectedCategoryStats = action.payload;
      })
      .addCase(fetchCategoryStats.rejected, (state) => {
        state.loadingStats = false;
        state.selectedCategoryStats = null;
      })
      
      // === שינוי סדר ===
      .addCase(reorderCategories.pending, (state) => {
        state.saving = true;
      })
      .addCase(reorderCategories.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(reorderCategories.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

// ייצוא הפעולות
export const { 
  clearError, 
  invalidateCache, 
  resetFilterTree,
  setModeList,
  setModeCreate,
  setModeEdit,
  clearCategoryStats,
} = categoriesSlice.actions;

// ===== Selectors =====

export const selectCategoriesTree = (state: { categories: CategoriesState }) => state.categories.tree;
export const selectCategoriesLoading = (state: { categories: CategoriesState }) => state.categories.loading;
export const selectCategoriesError = (state: { categories: CategoriesState }) => state.categories.error;
export const selectCategoriesLastFetch = (state: { categories: CategoriesState }) => state.categories.lastFetch;
export const selectTreeResetKey = (state: { categories: CategoriesState }) => state.categories.treeResetKey;

// Selectors לניהול (Admin)
export const selectCategoryMode = (state: { categories: CategoriesState }) => state.categories.mode;
export const selectEditingCategory = (state: { categories: CategoriesState }) => state.categories.editingCategory;
export const selectParentIdForCreate = (state: { categories: CategoriesState }) => state.categories.parentIdForCreate;
export const selectCategorySaving = (state: { categories: CategoriesState }) => state.categories.saving;
export const selectCategoryDeleting = (state: { categories: CategoriesState }) => state.categories.deleting;
export const selectCategoryFormError = (state: { categories: CategoriesState }) => state.categories.formError;
export const selectCategoryStats = (state: { categories: CategoriesState }) => state.categories.selectedCategoryStats;
export const selectLoadingStats = (state: { categories: CategoriesState }) => state.categories.loadingStats;

// ייצוא ה-reducer
export default categoriesSlice.reducer;
