import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import * as bannerService from '../../services/bannerService';
import type { Banner, BannerFormData } from '../../services/bannerService';

// ============================================================================
// טיפוסים
// ============================================================================

/**
 * מצבי תצוגה שונים של דף ניהול הבאנרים
 */
export type BannerMode = 'list' | 'create' | 'edit' | 'reorder';

/**
 * מצב ה-slice של ניהול באנרים
 */
interface BannerManagementState {
  /** רשימת כל הבאנרים */
  banners: Banner[];
  /** האם בטעינה */
  loading: boolean;
  /** הודעת שגיאה */
  error: string | null;
  /** מצב תצוגה נוכחי */
  mode: BannerMode;
  /** באנר בעריכה (null אם אין) */
  editingBanner: Banner | null;
  /** מזהי באנרים נבחרים (למחיקה מרובה) */
  selectedIds: string[];
  /** האם בתהליך שמירה */
  saving: boolean;
}

// ============================================================================
// Thunks - פעולות אסינכרוניות
// ============================================================================

/**
 * טעינת כל הבאנרים (Admin)
 */
export const fetchBanners = createAsyncThunk(
  'bannerManagement/fetchBanners',
  async (_, { rejectWithValue }) => {
    try {
      const banners = await bannerService.getAllBanners();
      return banners;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch banners');
    }
  }
);

/**
 * יצירת באנר חדש
 */
export const createBanner = createAsyncThunk(
  'bannerManagement/createBanner',
  async (bannerData: BannerFormData, { rejectWithValue }) => {
    try {
      const newBanner = await bannerService.createBanner(bannerData);
      return newBanner;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create banner');
    }
  }
);

/**
 * עדכון באנר קיים
 */
export const updateBanner = createAsyncThunk(
  'bannerManagement/updateBanner',
  async (
    { id, data, version }: { id: string; data: BannerFormData; version: number },
    { rejectWithValue }
  ) => {
    try {
      const updatedBanner = await bannerService.updateBanner(id, data, version);
      return updatedBanner;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update banner');
    }
  }
);

/**
 * מחיקת באנר
 */
export const deleteBanner = createAsyncThunk(
  'bannerManagement/deleteBanner',
  async (id: string, { rejectWithValue }) => {
    try {
      await bannerService.deleteBanner(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete banner');
    }
  }
);

/**
 * שינוי סדר באנרים
 */
export const reorderBanners = createAsyncThunk(
  'bannerManagement/reorderBanners',
  async (bannerIds: string[], { rejectWithValue }) => {
    try {
      await bannerService.reorderBanners(bannerIds);
      return bannerIds;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to reorder banners');
    }
  }
);

/**
 * העלאת תמונת באנר
 */
export const uploadBannerImage = createAsyncThunk(
  'bannerManagement/uploadBannerImage',
  async (file: File, { rejectWithValue }) => {
    try {
      const result = await bannerService.uploadBannerImage(file);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload image');
    }
  }
);

// ============================================================================
// Slice
// ============================================================================

const initialState: BannerManagementState = {
  banners: [],
  loading: false,
  error: null,
  mode: 'list',
  editingBanner: null,
  selectedIds: [],
  saving: false,
};

const bannerManagementSlice = createSlice({
  name: 'bannerManagement',
  initialState,
  reducers: {
    /**
     * שינוי מצב תצוגה
     */
    setMode: (state, action: PayloadAction<BannerMode>) => {
      state.mode = action.payload;
      // איפוס editingBanner כשחוזרים לרשימה
      if (action.payload === 'list') {
        state.editingBanner = null;
      }
    },

    /**
     * הגדרת באנר לעריכה
     */
    setEditingBanner: (state, action: PayloadAction<Banner | null>) => {
      state.editingBanner = action.payload;
      if (action.payload) {
        state.mode = 'edit';
      }
    },

    /**
     * בחירה/ביטול בחירה של באנר
     */
    toggleSelect: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.selectedIds.indexOf(id);
      if (index >= 0) {
        state.selectedIds.splice(index, 1);
      } else {
        state.selectedIds.push(id);
      }
    },

    /**
     * בחירת כל הבאנרים
     */
    selectAll: (state) => {
      state.selectedIds = state.banners.map((b) => b._id);
    },

    /**
     * ניקוי בחירה
     */
    clearSelection: (state) => {
      state.selectedIds = [];
    },

    /**
     * איפוס שגיאות
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ========== fetchBanners ==========
    builder
      .addCase(fetchBanners.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBanners.fulfilled, (state, action) => {
        state.loading = false;
        state.banners = action.payload;
      })
      .addCase(fetchBanners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // ========== createBanner ==========
    builder
      .addCase(createBanner.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createBanner.fulfilled, (state, action) => {
        state.saving = false;
        state.banners.push(action.payload);
        state.mode = 'list';
      })
      .addCase(createBanner.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });

    // ========== updateBanner ==========
    builder
      .addCase(updateBanner.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateBanner.fulfilled, (state, action) => {
        state.saving = false;
        const index = state.banners.findIndex((b) => b._id === action.payload._id);
        if (index >= 0) {
          state.banners[index] = action.payload;
        }
        state.mode = 'list';
        state.editingBanner = null;
      })
      .addCase(updateBanner.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });

    // ========== deleteBanner ==========
    builder
      .addCase(deleteBanner.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBanner.fulfilled, (state, action) => {
        state.loading = false;
        state.banners = state.banners.filter((b) => b._id !== action.payload);
        // הסרה מרשימת הנבחרים
        state.selectedIds = state.selectedIds.filter((id) => id !== action.payload);
      })
      .addCase(deleteBanner.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // ========== reorderBanners ==========
    builder
      .addCase(reorderBanners.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(reorderBanners.fulfilled, (state, action) => {
        state.saving = false;
        // עדכון הסדר לפי המערך שהתקבל
        const newOrder = action.payload;
        state.banners.sort((a, b) => {
          return newOrder.indexOf(a._id) - newOrder.indexOf(b._id);
        });
      })
      .addCase(reorderBanners.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });

    // ========== uploadBannerImage ==========
    builder
      .addCase(uploadBannerImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadBannerImage.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(uploadBannerImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// ייצוא actions
export const {
  setMode,
  setEditingBanner,
  toggleSelect,
  selectAll,
  clearSelection,
  clearError,
} = bannerManagementSlice.actions;

// ייצוא reducer
export default bannerManagementSlice.reducer;
