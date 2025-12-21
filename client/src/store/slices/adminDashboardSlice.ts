import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
  AdminWarningsService,
  type InconsistencyWarning,
  type SetIgnoreParams,
} from '../../services/adminWarningsService';

/**
 * מצב Redux לניהול התראות אי-עקביות במוצרים
 */
interface AdminDashboardState {
  warnings: InconsistencyWarning[]; // רשימת מוצרים עם בעיות
  loading: boolean; // האם נתונים נטענים כרגע
  error: string | null; // הודעת שגיאה אם יש
  lastFetch: number | null; // זמן טעינה אחרונה (לקאש)
  isModalOpen: boolean; // האם המודאל פתוח
}

/**
 * מצב התחלתי
 */
const initialState: AdminDashboardState = {
  warnings: [],
  loading: false,
  error: null,
  lastFetch: null,
  isModalOpen: false,
};

/**
 * Async Thunk: טעינת התראות מהשרת
 * נקרא בעת פתיחת הדשבורד או רענון ידני
 */
export const fetchInconsistencies = createAsyncThunk(
  'adminDashboard/fetchInconsistencies',
  async (_, { rejectWithValue }) => {
    try {
      const warnings = await AdminWarningsService.getInconsistencies();
      return warnings;
    } catch (error: any) {
      // במקרה של 401 - אין צורך בלוגר צפוף
      if (error && (error.status === 401 || error.message === 'לא מחובר')) {
        console.warn('Unauthorized - skipping fetchInconsistencies because user not authenticated');
        return rejectWithValue('unauthorized');
      }
      console.error('❌ שגיאה בטעינת התראות:', error);
      return rejectWithValue(error.message || 'שגיאה בטעינת התראות');
    }
  }
);

/**
 * Async Thunk: הגדרת התעלמות עבור מוצר
 * @param params - { productId, ignoreType: 'forever' | 'snooze' }
 */
export const setProductIgnore = createAsyncThunk(
  'adminDashboard/setIgnore',
  async (params: SetIgnoreParams, { rejectWithValue, dispatch }) => {
    try {
      await AdminWarningsService.setIgnore(params);
      
      // לאחר הצלחה - רענון הרשימה כדי להסיר את המוצר
      dispatch(fetchInconsistencies());
      
      return params.productId;
    } catch (error: any) {
      console.error('❌ שגיאה בשמירת התעלמות:', error);
      return rejectWithValue(error.message || 'שגיאה בשמירת התעלמות');
    }
  }
);

/**
 * Async Thunk: הסרת התעלמות (ביטול ignore/snooze)
 * @param productId - מזהה המוצר
 */
export const removeProductIgnore = createAsyncThunk(
  'adminDashboard/removeIgnore',
  async (productId: string, { rejectWithValue, dispatch }) => {
    try {
      await AdminWarningsService.removeIgnore(productId);
      
      // לאחר הצלחה - רענון הרשימה
      dispatch(fetchInconsistencies());
      
      return productId;
    } catch (error: any) {
      console.error('❌ שגיאה בהסרת התעלמות:', error);
      return rejectWithValue(error.message || 'שגיאה בהסרת התעלמות');
    }
  }
);

/**
 * Redux Slice לניהול התראות דשבורד
 */
const adminDashboardSlice = createSlice({
  name: 'adminDashboard',
  initialState,
  reducers: {
    // פתיחת המודאל
    openModal: (state) => {
      state.isModalOpen = true;
    },
    // סגירת המודאל
    closeModal: (state) => {
      state.isModalOpen = false;
    },
    // ניקוי שגיאות
    clearError: (state) => {
      state.error = null;
    },
    // איפוס קאש (אילוץ טעינה מחדש)
    invalidateCache: (state) => {
      state.lastFetch = null;
    },
  },
  extraReducers: (builder) => {
    // טעינת התראות
    builder
      .addCase(fetchInconsistencies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchInconsistencies.fulfilled,
        (state, action: PayloadAction<InconsistencyWarning[]>) => {
          state.loading = false;
          state.warnings = action.payload;
          state.lastFetch = Date.now();
          state.error = null;
        }
      )
      .addCase(fetchInconsistencies.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'שגיאה בטעינת התראות';
      });

    // הגדרת התעלמות
    builder
      .addCase(setProductIgnore.pending, () => {
        // אפשר להוסיף מצב loading ספציפי אם רוצים
      })
      .addCase(setProductIgnore.fulfilled, () => {
        // הרשימה תתעדכן אוטומטית ב-fetchInconsistencies שקורה אחר כך
      })
      .addCase(setProductIgnore.rejected, (state, action) => {
        state.error = (action.payload as string) || 'שגיאה בשמירת התעלמות';
      });

    // הסרת התעלמות
    builder
      .addCase(removeProductIgnore.pending, () => {
        // אפשר להוסיף מצב loading ספציפי אם רוצים
      })
      .addCase(removeProductIgnore.fulfilled, () => {
        // הרשימה תתעדכן אוטומטית ב-fetchInconsistencies שקורה אחר כך
      })
      .addCase(removeProductIgnore.rejected, (state, action) => {
        state.error = (action.payload as string) || 'שגיאה בהסרת התעלמות';
      });
  },
});

// ייצוא הפעולות הסינכרוניות
export const { openModal, closeModal, clearError, invalidateCache } =
  adminDashboardSlice.actions;

// ייצוא ה-reducer
export default adminDashboardSlice.reducer;
