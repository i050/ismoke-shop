// Redux slice לניהול משתמשים ומשימה 2: שיוך לקוחות לקבוצות
// מטרת הקובץ: ניהול מצב המשתמשים והשיוכים לקבוצות ב-Redux store

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  UserManagementState,
  UserFilters,
  UserSortOption,
  SortDirection,
  AssignUserToGroupRequest,
  BulkUserOperationRequest,
  BulkUserOperationResponse,
  GetUsersParams,
  GetGroupMembersParams,
  CreateUserRequest,
  UpdateUserRequest
} from '../../types/UserManagement';

// ייבוא service - עכשיו הוא קיים!
import userManagementService from '../../services/userManagementService';

// ==========================================
// מצב התחלתי של ה-slice
// ==========================================

/**
 * מצב התחלתי של ניהול המשתמשים
 * מגדיר את הערכים ההתחלתיים לכל השדות
 */
const initialState: UserManagementState = {
  // רשימת המשתמשים הנטענים
  users: [],

  // מידע על משתמשים נבחרים (לפעולות בכמות)
  selectedUsers: [],

  // מיפוי של קבוצות לפי משתמש
  userGroups: {},

  // מצבי טעינה ושגיאות
  loading: false,
  error: null,

  // פילטרים ומיון נוכחיים
  filters: {
    search: '',
    hasGroup: undefined,
    isActive: undefined
  },
  sortBy: 'name',
  sortDirection: 'asc',

  // מידע על עימוד
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  }
};

// ==========================================
// Async Thunks - פעולות אסינכרוניות
// ==========================================

/**
 * טעינת רשימת המשתמשים עם פילטרים ועימוד
 * משמש להצגת רשימת כל המשתמשים בממשק הניהול
 */
export const fetchUsers = createAsyncThunk(
  'userManagement/fetchUsers',
  async (params: GetUsersParams = {}, { rejectWithValue }) => {
    try {
      const response = await userManagementService.getAllUsers(params);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בטעינת המשתמשים');
    }
  }
);

/**
 * יצירת משתמש חדש ע"י מנהל
 * משמש להוספת משתמש חדש מממשק הניהול
 */
export const createUser = createAsyncThunk(
  'userManagement/createUser',
  async (userData: CreateUserRequest, { rejectWithValue }) => {
    try {
      const response = await userManagementService.createUser(userData);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה ביצירת המשתמש');
    }
  }
);

/**
 * קבלת פרטי משתמש בודד
 * משמש לטעינת כל הפרטים של משתמש לצורך עריכה
 */
export const fetchUserById = createAsyncThunk(
  'userManagement/fetchUserById',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userManagementService.getUserById(userId);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בטעינת פרטי המשתמש');
    }
  }
);

/**
 * עדכון פרטי משתמש ע"י מנהל
 * משמש לעריכת משתמש קיים מממשק הניהול
 */
export const updateUser = createAsyncThunk(
  'userManagement/updateUser',
  async ({ userId, userData }: { userId: string; userData: UpdateUserRequest }, { rejectWithValue }) => {
    try {
      const response = await userManagementService.updateUser(userId, userData);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בעדכון המשתמש');
    }
  }
);

/**
 * קבלת קבוצה של משתמש ספציפי
 * משמש לבדיקת הקבוצה הנוכחית של משתמש
 */
export const fetchUserGroup = createAsyncThunk(
  'userManagement/fetchUserGroup',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userManagementService.getUserGroup(userId);
      return { userId, group: response.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בקבלת קבוצת המשתמש');
    }
  }
);

/**
 * שיוך משתמש לקבוצה
 * הפעולה המרכזית במשימה 2 - משייכת משתמש לקבוצה ספציפית
 */
export const assignUserToGroup = createAsyncThunk(
  'userManagement/assignUserToGroup',
  async (request: AssignUserToGroupRequest, { rejectWithValue }) => {
    try {
      const response = await userManagementService.assignUserToGroup(request);
      return { userId: request.userId, response };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בשיוך המשתמש לקבוצה');
    }
  }
);

/**
 * הסרת משתמש מקבוצה
 * מסירה את השיוך של משתמש מקבוצה (מחזירה אותו ללא קבוצה)
 */
export const removeUserFromGroup = createAsyncThunk(
  'userManagement/removeUserFromGroup',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userManagementService.removeUserFromGroup(userId);
      return { userId, response };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בהסרת המשתמש מקבוצה');
    }
  }
);

/**
 * קבלת חברי קבוצה ספציפית
 * משמש להצגת רשימת כל החברים בקבוצה מסוימת
 */
export const fetchGroupMembers = createAsyncThunk(
  'userManagement/fetchGroupMembers',
  async (params: GetGroupMembersParams, { rejectWithValue }) => {
    try {
      const response = await userManagementService.getGroupMembers(params);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בטעינת חברי הקבוצה');
    }
  }
);

/**
 * פעולה בכמות - שיוך מספר משתמשים בבת אחת
 * משמש לשיוך מהיר של מספר משתמשים לקבוצה
 */
export const bulkAssignUsersToGroup = createAsyncThunk(
  'userManagement/bulkAssignUsersToGroup',
  async (request: BulkUserOperationRequest, { rejectWithValue }) => {
    try {
      const response = await userManagementService.bulkAssignUsersToGroup(request);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בשיוך בכמות');
    }
  }
);

/**
 * פעולה בכמות - הסרת מספר משתמשים מקבוצה
 * משמש להסרה מהירה של מספר משתמשים מקבוצה
 */
export const bulkRemoveUsersFromGroup = createAsyncThunk(
  'userManagement/bulkRemoveUsersFromGroup',
  async (request: BulkUserOperationRequest, { rejectWithValue }) => {
    try {
      const response = await userManagementService.bulkRemoveUsersFromGroup(request);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return rejectWithValue(message || 'שגיאה בהסרה בכמות');
    }
  }
);

// ==========================================
// יצירת ה-Slice עם Reducers
// ==========================================

/**
 * ה-slice הראשי של ניהול המשתמשים
 * מכיל את כל הלוגיקה לניהול מצב המשתמשים והשיוכים
 */
const userManagementSlice = createSlice({
  name: 'userManagement',
  initialState,
  reducers: {
    // ניקוי שגיאות
    clearError: (state) => {
      state.error = null;
    },

    // עדכון פילטרים
    setFilters: (state, action: PayloadAction<UserFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // חזרה לעמוד ראשון כשמשנים פילטרים
    },

    // עדכון מיון
    setSorting: (state, action: PayloadAction<{ sortBy: UserSortOption; sortDirection: SortDirection }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortDirection = action.payload.sortDirection;
    },

    // עדכון עמוד נוכחי
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },

    // בחירת/ביטול בחירה של משתמש בודד
    toggleUserSelection: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      const index = state.selectedUsers.indexOf(userId);
      if (index > -1) {
        state.selectedUsers.splice(index, 1);
      } else {
        state.selectedUsers.push(userId);
      }
    },

    // בחירת כל המשתמשים בעמוד הנוכחי
    selectAllUsers: (state) => {
      const currentPageUserIds = state.users.map(user => user._id);
      state.selectedUsers = [...new Set([...state.selectedUsers, ...currentPageUserIds])];
    },

    // ביטול בחירה של כל המשתמשים
    clearUserSelection: (state) => {
      state.selectedUsers = [];
    },

    // איפוס כל הפילטרים והמיון
    resetFilters: (state) => {
      state.filters = {
        search: '',
        hasGroup: undefined,
        isActive: undefined
      };
      state.sortBy = 'name';
      state.sortDirection = 'asc';
      state.pagination.page = 1;
    }
  },

  // ==========================================
  // Extra Reducers - טיפול בתוצאות Async Thunks
  // ==========================================

  extraReducers: (builder) => {
    // טעינת משתמשים
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<import('../../types/UserManagement').UsersListResponse>) => {
        state.loading = false;
        // השרת מחזיר UsersListResponse
        state.users = action.payload.users || [];
        state.pagination = action.payload.pagination || state.pagination;
        // state.filters = action.payload.filters || state.filters;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // יצירת משתמש חדש ע"י מנהל
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        // הוספת המשתמש החדש לתחילת הרשימה
        if (action.payload.data) {
          state.users.unshift(action.payload.data);
          // עדכון הסה"כ
          state.pagination.total += 1;
        }
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // עדכון פרטי משתמש ע"י מנהל
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        // עדכון המשתמש ברשימה
        if (action.payload.data) {
          const userIndex = state.users.findIndex(user => user._id === action.payload.data._id);
          if (userIndex > -1) {
            state.users[userIndex] = {
              ...state.users[userIndex],
              ...action.payload.data
            };
          }
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // קבלת קבוצה של משתמש
      .addCase(fetchUserGroup.fulfilled, (state, action) => {
        const payload = action.payload as { userId: string; group?: import('../../types/CustomerGroup').CustomerGroup | null } | undefined;
        if (!payload) return;
        const { userId, group } = payload;
        state.userGroups[userId] = group ?? null;
      })

      // שיוך משתמש לקבוצה
      .addCase(assignUserToGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignUserToGroup.fulfilled, (state, action) => {
        state.loading = false;
        const { userId, response } = action.payload;

        // עדכון המשתמש ברשימה
        const userIndex = state.users.findIndex(user => user._id === userId);
        if (userIndex > -1) {
          state.users[userIndex] = {
            ...state.users[userIndex],
            customerGroupId: response.data.customerGroupId
          };
        }

        // עדכון מיפוי הקבוצות
        state.userGroups[userId] = response.data.customerGroup || null;

        // ניקוי בחירה אם המשתמש היה נבחר
        state.selectedUsers = state.selectedUsers.filter(id => id !== userId);
      })
      .addCase(assignUserToGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // הסרת משתמש מקבוצה
      .addCase(removeUserFromGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeUserFromGroup.fulfilled, (state, action) => {
        state.loading = false;
        const { userId } = action.payload;

        // עדכון המשתמש ברשימה
        const userIndex = state.users.findIndex(user => user._id === userId);
        if (userIndex > -1) {
          state.users[userIndex] = {
            ...state.users[userIndex],
            customerGroupId: undefined
          };
        }

        // עדכון מיפוי הקבוצות
        state.userGroups[userId] = null;

        // ניקוי בחירה אם המשתמש היה נבחר
        state.selectedUsers = state.selectedUsers.filter(id => id !== userId);
      })
      .addCase(removeUserFromGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // טעינת חברי קבוצה
      .addCase(fetchGroupMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupMembers.fulfilled, (state) => {
        state.loading = false;
        // המידע על חברי הקבוצה נשמר ב-component עצמו
      })
      .addCase(fetchGroupMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // פעולות בכמות
      .addCase(bulkAssignUsersToGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkAssignUsersToGroup.fulfilled, (state, action: PayloadAction<BulkUserOperationResponse>) => {
        state.loading = false;
        // עדכון המשתמשים שהצליחו
        action.payload.results.forEach(result => {
          if (result.success) {
            const userIndex = state.users.findIndex(user => user._id === result.userId);
            if (userIndex > -1) {
              // עדכון customerGroupId (נצטרך לקבל את זה מהשרת)
              state.users[userIndex] = {
                ...state.users[userIndex],
                customerGroupId: 'temp-group-id' // זמני עד שניצור את ה-service
              };
            }
          }
        });
        state.selectedUsers = []; // ניקוי בחירה אחרי פעולה בכמות
      })
      .addCase(bulkAssignUsersToGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(bulkRemoveUsersFromGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkRemoveUsersFromGroup.fulfilled, (state, action: PayloadAction<BulkUserOperationResponse>) => {
        state.loading = false;
        // עדכון המשתמשים שהצליחו
        action.payload.results.forEach(result => {
          if (result.success) {
            const userIndex = state.users.findIndex(user => user._id === result.userId);
            if (userIndex > -1) {
              state.users[userIndex] = {
                ...state.users[userIndex],
                customerGroupId: undefined
              };
            }
          }
        });
        state.selectedUsers = []; // ניקוי בחירה אחרי פעולה בכמות
      })
      .addCase(bulkRemoveUsersFromGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// ==========================================
// ייצוא Actions ו-Reducer
// ==========================================

// ייצוא ה-actions הרגילים
export const {
  clearError,
  setFilters,
  setSorting,
  setPage,
  toggleUserSelection,
  selectAllUsers,
  clearUserSelection,
  resetFilters
} = userManagementSlice.actions;

// ייצוא ה-reducer
export default userManagementSlice.reducer;
