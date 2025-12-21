import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  CustomerGroup,
  CustomerGroupsState,
  CustomerGroupFormData,
  DeleteGroupWithMembersResponse, // טיפוס חדש: מידע למודל אזהרה
  ForceDeleteGroupResponse        // טיפוס חדש: תגובה למחיקה בכוח
} from '../../types/CustomerGroup';
import customerGroupService from '../../services/customerGroupService';

// Initial state
const initialState: CustomerGroupsState = {
  groups: [],
  currentGroup: null,
  loading: false,
  error: null,
  filters: {
    search: '',
    isActive: null,
    sortBy: 'name',
    sortOrder: 'asc'
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0
  }
};

// Async thunks
export const fetchCustomerGroups = createAsyncThunk(
  'customerGroups/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      // השתמשות בשירות במקום fetch ישיר - דרך נורמלית ומקובלת
      const response = await customerGroupService.getAllGroups();
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message);
    }
  }
);

export const fetchCustomerGroupById = createAsyncThunk(
  'customerGroups/fetchGroupById',
  async (id: string, { rejectWithValue }) => {
    try {
      // השתמשות בשירות - דרך נורמלית ומקובלת
      const group = await customerGroupService.getGroupById(id);
      return group;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message);
    }
  }
);

export const createCustomerGroup = createAsyncThunk(
  'customerGroups/createGroup',
  async (groupData: CustomerGroupFormData, { rejectWithValue }) => {
    try {
      // השתמשות בשירות - דרך נורמלית ומקובלת
      const group = await customerGroupService.createGroup(groupData);
      return group;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message);
    }
  }
);

export const updateCustomerGroup = createAsyncThunk(
  'customerGroups/updateGroup',
  async ({ id, groupData }: { id: string; groupData: Partial<CustomerGroupFormData> }, { rejectWithValue }) => {
    try {
      // השתמשות בשירות - דרך נורמלית ומקובלת
      const group = await customerGroupService.updateGroup(id, groupData);
      return group;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message);
    }
  }
);

// בדיקה לפני מחיקת קבוצה - עשויה להחזיר מידע למודל אזהרה
// מטרה: לבדוק אם אפשר למחוק קבוצה, ואם לא - לקבל מידע למודל
export const checkDeleteCustomerGroup = createAsyncThunk<
  string | DeleteGroupWithMembersResponse, // מחזיר או ID (מחיקה הצליחה) או מידע למודל
  string
>(
  'customerGroups/checkDeleteGroup',
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await customerGroupService.deleteGroup(id);
      
      if (result === undefined) {
        // המחיקה הצליחה (קבוצה ריקה נמחקה)
        return id;
      } else {
        // יש משתמשים - מחזיר מידע למודל אזהרה
        return result;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message);
    }
  }
);

// מחיקת קבוצה בכוח - אחרי אישור המשתמש
// מטרה: למחוק קבוצה וכל המשתמשים שבה (הופכים לרגילים)
export const forceDeleteCustomerGroup = createAsyncThunk<
  ForceDeleteGroupResponse,
  string
>(
  'customerGroups/forceDeleteGroup', 
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await customerGroupService.forceDeleteGroup(id);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message);
    }
  }
);

export const toggleCustomerGroup = createAsyncThunk(
  'customerGroups/toggleGroup',
  async (id: string, { rejectWithValue }) => {
    try {
      // השתמש בשירות המרכזי שמטפל בשגיאות (ApiError)
      const group = await customerGroupService.toggleGroupStatus(id);
      return group;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = (err as any)?.status || 500;
      return rejectWithValue({ message, status });
    }
  }
);

// Slice
const customerGroupsSlice = createSlice({
  name: 'customerGroups',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<CustomerGroupsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action: PayloadAction<Partial<CustomerGroupsState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentGroup: (state, action: PayloadAction<CustomerGroup | null>) => {
      state.currentGroup = action.payload;
    },
    resetForm: (state) => {
      state.currentGroup = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch groups
    builder
      .addCase(fetchCustomerGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerGroups.fulfilled, (state, action) => {
        state.loading = false;
        // השירות מחזיר CustomerGroup[] ישירות
        if (action.payload && Array.isArray(action.payload)) {
          state.groups = action.payload;
          state.pagination.total = action.payload.length;
        } else {
          // fallback במקרה שהמבנה שונה
          console.warn('Unexpected payload structure:', action.payload);
          state.groups = [];
          state.pagination.total = 0;
        }
      })
      .addCase(fetchCustomerGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch single group
      .addCase(fetchCustomerGroupById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerGroupById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentGroup = action.payload;
      })
      .addCase(fetchCustomerGroupById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create group
      .addCase(createCustomerGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomerGroup.fulfilled, (state, action) => {
        state.loading = false;
        // וידוא שהנתונים תקינים לפני הוספה
        if (action.payload && action.payload._id) {
          // הוספה בתחילת הרשימה (קבוצה חדשה למעלה)
          state.groups.unshift(action.payload);
        } else {
          console.warn('Invalid payload in createCustomerGroup.fulfilled:', action.payload);
        }
        state.currentGroup = null;
      })
      .addCase(createCustomerGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update group
      .addCase(updateCustomerGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomerGroup.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex(group => group._id === action.payload._id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
        state.currentGroup = action.payload;
      })
      .addCase(updateCustomerGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // בדיקת מחיקה - עשויה להחזיר מידע למודל או למחוק מיד
      .addCase(checkDeleteCustomerGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkDeleteCustomerGroup.fulfilled, (state, action) => {
        state.loading = false;
        
        // בדיקה אם זה ID (מחיקה הצליחה) או מידע למודל
        if (typeof action.payload === 'string') {
          // זה ID - המחיקה הצליחה (קבוצה ריקה נמחקה)
          const deletedId = action.payload;
          state.groups = state.groups.filter(group => group._id !== deletedId);
          if (state.currentGroup?._id === deletedId) {
            state.currentGroup = null;
          }
        }
        // אם זה לא string, זה מידע למודל - הקומפוננטה תטפל בזה
      })
      .addCase(checkDeleteCustomerGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // מחיקה בכוח - אחרי אישור המשתמש
      .addCase(forceDeleteCustomerGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forceDeleteCustomerGroup.fulfilled, (state, action) => {
        state.loading = false;
        
        // חילוץ ה-ID מהתגובה (השרת מחזיר מידע מפורט)
        const response = action.payload;
        // נצטרך למצוא את ה-ID של הקבוצה שנמחקה
        // בינתיים נעדכן את הרשימה על בסיס השם
        const deletedGroupName = response.data.deletedGroup;
        state.groups = state.groups.filter(group => group.name !== deletedGroupName);
        
        // ניקוי currentGroup אם זו הקבוצה שנמחקה
        if (state.currentGroup?.name === deletedGroupName) {
          state.currentGroup = null;
        }
      })
      .addCase(forceDeleteCustomerGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Toggle group
      .addCase(toggleCustomerGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleCustomerGroup.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.groups.findIndex(group => group._id === action.payload._id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
        if (state.currentGroup?._id === action.payload._id) {
          state.currentGroup = action.payload;
        }
      })
      .addCase(toggleCustomerGroup.rejected, (state, action) => {
        state.loading = false;
        const payload: any = action.payload;
        state.error = payload?.message || payload || 'שגיאה בהחלפת מצב הקבוצה';
      });
  }
});

// Export actions
export const {
  setFilters,
  setPagination,
  clearError,
  setCurrentGroup,
  resetForm
} = customerGroupsSlice.actions;

// Export reducer
export default customerGroupsSlice.reducer;
