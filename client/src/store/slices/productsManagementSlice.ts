// Redux slice לניהול מוצרים (Products Management)
// מטרת הקובץ: ניהול מצב המוצרים בדף הניהול - גרסה מקוצרת ל-Phase 4
// Phase 3: Redux מינימלי - רק fetchProducts + deleteProduct

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '../../types/Product';
import type { ProductFormData } from '../../schemas/productFormSchema';

// ייבוא service (יווצר בשלב 3.2)
import productManagementService from '../../services/productManagementService';

// ==========================================
// ממשקי Types
// ==========================================

/**
 * פילטרים למוצרים
 */
export interface ProductFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  stockStatus?: 'all' | 'low' | 'out' | 'lowOrOut'; // סינון לפי מצב מלאי: כל המוצרים, מלאי נמוך, אזל מלאי, או שניהם
  minPrice?: number;
  maxPrice?: number;
}

/**
 * אפשרויות מיון
 */
export type ProductSortOption = 'name' | 'price' | 'createdAt' | 'salesCount' | 'stockQuantity';
export type SortDirection = 'asc' | 'desc';

/**
 * מצב תצוגת רשימת המוצרים
 * 'active' - מוצרים פעילים בלבד (ברירת מחדל)
 * 'deleted' - מוצרים שנמחקו (לא פעילים)
 */
export type ProductViewMode = 'active' | 'deleted';

/**
 * מצב ה-slice
 */
export interface ProductsManagementState {
  // רשימת המוצרים
  products: Product[];
  
  // מצבי טעינה ושגיאות
  loading: boolean;
  error: string | null;
  
  // פילטרים ומיון
  filters: ProductFilters;
  sortBy: ProductSortOption;
  sortDirection: SortDirection;
  
  // Pagination (cursor-based)
  cursor: string | null; // המוצר האחרון שנטען
  hasMore: boolean; // האם יש עוד מוצרים
  
  // בחירת מוצרים (לפעולות מרובות - יתווסף ב-Phase 5)
  selectedIds: string[];
  
  // מצב התצוגה - Phase 6
  mode: 'list' | 'create' | 'edit'; // מצב הדף: רשימה, יצירה או עריכה
  editingProduct: Product | null; // המוצר שנמצא בעריכה (אם mode === 'edit')
  
  // מצב תצוגת רשימה - Phase 7: פח אשפה
  viewMode: ProductViewMode; // 'active' = מוצרים פעילים, 'deleted' = מוצרים שנמחקו
}

// ==========================================
// מצב התחלתי
// ==========================================

const initialState: ProductsManagementState = {
  products: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    isActive: undefined,
    stockStatus: 'all', // ברירת מחדל: כל המוצרים
  },
  sortBy: 'createdAt',
  sortDirection: 'desc',
  cursor: null,
  hasMore: true,
  selectedIds: [],
  mode: 'list', // Phase 6: מתחילים במצב רשימה
  editingProduct: null, // Phase 6: אין מוצר בעריכה בהתחלה
  viewMode: 'active', // Phase 7: ברירת מחדל - מציגים רק מוצרים פעילים
};

// ==========================================
// Async Thunks - פעולות אסינכרוניות
// ==========================================

/**
 * פרמטרים לטעינת מוצרים
 */
export interface FetchProductsParams {
  filters?: ProductFilters;
  sortBy?: ProductSortOption;
  sortDirection?: SortDirection;
  cursor?: string | null;
  limit?: number;
}

/**
 * תגובה מהשרת לטעינת מוצרים
 */
export interface FetchProductsResponse {
  products: Product[];
  cursor: string | null;
  hasMore: boolean;
  total: number;
}

/**
 * טעינת רשימת המוצרים עם פילטרים ועימוד cursor-based
 * Phase 3: פונקציה מינימלית - רק GET
 */
export const fetchProducts = createAsyncThunk(
  'productsManagement/fetchProducts',
  async (params: FetchProductsParams = {}, { rejectWithValue }) => {
    try {
      const response = await productManagementService.getProducts(params);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בטעינת המוצרים');
    }
  }
);

/**
 * מחיקת מוצר (soft delete)
 * Phase 3: פונקציה מינימלית - רק DELETE
 */
export const deleteProduct = createAsyncThunk(
  'productsManagement/deleteProduct',
  async (productId: string, { rejectWithValue }) => {
    try {
      await productManagementService.deleteProduct(productId);
      return productId;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה במחיקת המוצר');
    }
  }
);

/**
 * יצירת מוצר חדש
 * Phase 6.2: הוספה כחלק מהאינטגרציה עם ProductForm
 */
export const createProduct = createAsyncThunk(
  'productsManagement/createProduct',
  async (productData: ProductFormData, { rejectWithValue }) => {
    try {
      const newProduct = await productManagementService.createProduct(productData);
      return newProduct;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה ביצירת המוצר');
    }
  }
);

/**
 * עדכון מוצר קיים
 * Phase 6.2: הוספה כחלק מהאינטגרציה עם ProductForm
 */
export const updateProduct = createAsyncThunk(
  'productsManagement/updateProduct',
  async ({ productId, productData }: { productId: string; productData: ProductFormData }, { rejectWithValue }) => {
    try {
      const updatedProduct = await productManagementService.updateProduct(productId, productData);
      return updatedProduct;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בעדכון המוצר');
    }
  }
);

/**
 * שכפול מוצר קיים
 * Phase 6.2: הוספה כחלק מהאינטגרציה עם ProductForm
 */
export const duplicateProduct = createAsyncThunk(
  'productsManagement/duplicateProduct',
  async (productId: string, { rejectWithValue }) => {
    try {
      const duplicatedProduct = await productManagementService.duplicateProduct(productId);
      return duplicatedProduct;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בשכפול המוצר');
    }
  }
);

/**
 * שחזור מוצר שנמחק (soft delete restore)
 * Phase 7: פח אשפה - שחזור מוצר
 */
export const restoreProduct = createAsyncThunk(
  'productsManagement/restoreProduct',
  async (productId: string, { rejectWithValue }) => {
    try {
      await productManagementService.restoreProduct(productId);
      return productId;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בשחזור המוצר');
    }
  }
);

// ==========================================
// Slice
// ==========================================

const productsManagementSlice = createSlice({
  name: 'productsManagement',
  initialState,
  
  // ==========================================
  // Reducers - פעולות סינכרוניות
  // ==========================================
  reducers: {
    /**
     * עדכון פילטרים
     */
    setFilters: (state, action: PayloadAction<Partial<ProductFilters>>) => {
      console.log('🔄 [Redux setFilters] Current filters:', state.filters);
      console.log('🔄 [Redux setFilters] New payload:', action.payload);
      
      // עדכון כל שדה בנפרד כדי למנוע בעיות של Immer
      if (action.payload.search !== undefined) {
        state.filters.search = action.payload.search;
      }
      if (action.payload.categoryId !== undefined) {
        state.filters.categoryId = action.payload.categoryId;
      } else if ('categoryId' in action.payload) {
        // אם categoryId הוא undefined באופן מפורש, נמחק אותו
        state.filters.categoryId = undefined;
      }
      if (action.payload.isActive !== undefined) {
        state.filters.isActive = action.payload.isActive;
      } else if ('isActive' in action.payload) {
        // אם isActive הוא undefined באופן מפורש, נמחק אותו
        state.filters.isActive = undefined;
      }
      if (action.payload.stockStatus !== undefined) {
        state.filters.stockStatus = action.payload.stockStatus;
      }
      if (action.payload.minPrice !== undefined) {
        state.filters.minPrice = action.payload.minPrice;
      }
      if (action.payload.maxPrice !== undefined) {
        state.filters.maxPrice = action.payload.maxPrice;
      }
      
      console.log('🔄 [Redux setFilters] Updated filters:', state.filters);
      state.cursor = null; // איפוס cursor כשמשנים פילטרים
      state.hasMore = true;
    },

    /**
     * עדכון חיפוש
     */
    setSearch: (state, action: PayloadAction<string>) => {
      state.filters.search = action.payload;
      state.cursor = null; // איפוס cursor כשמשנים חיפוש
      state.hasMore = true;
    },

    /**
     * עדכון מיון
     */
    setSorting: (state, action: PayloadAction<{ sortBy: ProductSortOption; sortDirection: SortDirection }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortDirection = action.payload.sortDirection;
      state.cursor = null; // איפוס cursor כשמשנים מיון
      state.hasMore = true;
    },

    /**
     * טעינת עמוד הבא (cursor-based pagination)
     */
    setPage: (state, action: PayloadAction<string | null>) => {
      state.cursor = action.payload;
    },

    /**
     * בחירת/ביטול בחירה של מוצר בודד
     */
    toggleProductSelection: (state, action: PayloadAction<string>) => {
      const productId = action.payload;
      const index = state.selectedIds.indexOf(productId);
      if (index > -1) {
        state.selectedIds.splice(index, 1);
      } else {
        state.selectedIds.push(productId);
      }
    },

    /**
     * בחירת כל המוצרים בעמוד הנוכחי
     */
    selectAllProducts: (state) => {
      const currentPageProductIds = state.products.map(product => product._id);
      state.selectedIds = [...new Set([...state.selectedIds, ...currentPageProductIds])];
    },

    /**
     * ביטול בחירה של כל המוצרים
     */
    clearProductSelection: (state) => {
      state.selectedIds = [];
    },

    /**
     * איפוס כל הפילטרים והמיון
     */
    resetFilters: (state) => {
      state.filters = {
        search: '',
        isActive: undefined,
        stockStatus: 'all',
      };
      state.sortBy = 'createdAt';
      state.sortDirection = 'desc';
      state.cursor = null;
      state.hasMore = true;
    },

    // ==========================================
    // Phase 6: Navigation Actions - פעולות ניווט
    // ==========================================

    /**
     * מעבר למצב יצירת מוצר חדש
     */
    setModeCreate: (state) => {
      state.mode = 'create';
      state.editingProduct = null;
    },

    /**
     * מעבר למצב עריכת מוצר
     */
    setModeEdit: (state, action: PayloadAction<Product>) => {
      state.mode = 'edit';
      state.editingProduct = action.payload;
    },

    /**
     * חזרה למצב רשימה
     */
    setModeList: (state) => {
      state.mode = 'list';
      state.editingProduct = null;
    },

    /**
     * Phase 7: שינוי מצב תצוגת הרשימה (פעילים / נמחקים)
     */
    setViewMode: (state, action: PayloadAction<ProductViewMode>) => {
      state.viewMode = action.payload;
      // איפוס cursor ו-products כשמשנים viewMode
      state.cursor = null;
      state.hasMore = true;
      state.products = [];
      state.selectedIds = [];
    },
  },

  // ==========================================
  // Extra Reducers - טיפול בתוצאות Async Thunks
  // ==========================================
  extraReducers: (builder) => {
    // טעינת מוצרים
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<FetchProductsResponse>) => {
        state.loading = false;

        // קבלת המערך הנכנס
        const incoming = action.payload.products || [];

        // *** בעברית: נבצע dedupe עבור incoming ומול ה-state הקיים כדי למנוע כפילויות.
        // סיבות אפשריות לכפילויות: טעינת דף נוסף עם overlap, response מה-API שחוזר כפול, או race conditions.
        if (!state.cursor) {
          // טעינה ראשונית - נדרוס את הרשימה, אך נדאג להסיר כפילויות בתוך ה-incoming לפי _id
          const uniqueIncoming = Array.from(new Map(incoming.map(p => [String(p._id), p])).values());
          state.products = uniqueIncoming;
        } else {
          // טעינת עמוד נוסף - נוסיף רק מוצרים שלא קיימים כבר ב-state
          const existingIds = new Set(state.products.map(p => String(p._id)));
          const newProducts = incoming.filter(p => !existingIds.has(String(p._id)));
          state.products = [...state.products, ...newProducts];
        }

        state.cursor = action.payload.cursor;
        state.hasMore = action.payload.hasMore;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

    // מחיקת מוצר
    builder
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        // הסרת המוצר מהרשימה
        state.products = state.products.filter(product => product._id !== action.payload);
        // הסרה גם מהבחירה אם נבחר
        state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Phase 6.2: יצירת מוצר חדש
    builder
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action: PayloadAction<Product>) => {
        state.loading = false;
        // הוספת המוצר החדש לתחילת הרשימה
        state.products.unshift(action.payload);
        // חזרה למצב רשימה
        state.mode = 'list';
        state.editingProduct = null;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Phase 6.2: עדכון מוצר קיים
    builder
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action: PayloadAction<Product>) => {
        state.loading = false;
        // עדכון המוצר ברשימה
        const index = state.products.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.products[index] = action.payload;
        }
        // עדכון editingProduct עם הנתונים החדשים במקום לאפס
        // כך הטופס יכול לסיים את הפעולות שלו (reset) לפני שחוזרים לרשימה
        state.editingProduct = action.payload;
        // חזרה למצב רשימה תתבצע ידנית מה-Page אחרי שהטופס מסיים
        // state.mode = 'list'; ← הוסר - יתבצע ידנית
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Phase 6.2: שכפול מוצר
    builder
      .addCase(duplicateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(duplicateProduct.fulfilled, (state, action: PayloadAction<Product>) => {
        state.loading = false;
        // הוספת המוצר המשוכפל לתחילת הרשימה
        state.products.unshift(action.payload);
        // מעבר למצב עריכה של המוצר המשוכפל
        state.mode = 'edit';
        state.editingProduct = action.payload;
      })
      .addCase(duplicateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Phase 7: שחזור מוצר שנמחק
    builder
      .addCase(restoreProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreProduct.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        // הסרת המוצר מרשימת הנמחקים (כי הוא עכשיו פעיל)
        state.products = state.products.filter(product => product._id !== action.payload);
        // הסרה גם מהבחירה אם נבחר
        state.selectedIds = state.selectedIds.filter(id => id !== action.payload);
      })
      .addCase(restoreProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// ==========================================
// Export Actions & Reducer
// ==========================================

export const {
  setFilters,
  setSearch,
  setSorting,
  setPage,
  toggleProductSelection,
  selectAllProducts,
  clearProductSelection,
  resetFilters,
  // Phase 6: Navigation actions
  setModeCreate,
  setModeEdit,
  setModeList,
  // Phase 7: View mode (active/deleted)
  setViewMode,
} = productsManagementSlice.actions;

export default productsManagementSlice.reducer;
