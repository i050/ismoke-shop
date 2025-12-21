// Service לניהול משתמשים ומשימה 2: שיוך לקוחות לקבוצות
// מטרת הקובץ: טיפול בכל הקריאות ל-API הקשורות לניהול משתמשים ושיוך לקבוצות

import type {
  UserSummary,
  AssignUserToGroupRequest,
  AssignUserToGroupResponse,
  RemoveUserFromGroupResponse,
  UsersListResponse,
  GroupMembersResponse,
  BulkUserOperationRequest,
  BulkUserOperationResponse,
  GetUsersParams,
  GetGroupMembersParams,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UserDetails,
  UserCartResponse,
  UserOrdersResponse,
  UserOrderDetailResponse,
  GetUserOrdersParams
} from '../types/UserManagement';
import { ApiError } from '../utils/ApiError';

class UserManagementService {
  private baseUrl = '/api/users';

  // ==========================================
  // Helper Methods - מתודות עזר
  // ==========================================

  /**
   * טיפול בתגובות API
   * בודק אם התגובה תקינה ומחזיר את הנתונים או שגיאה
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'שגיאת רשת' }));
      const message = errorData?.message || response.statusText || `HTTP ${response.status}`;
      throw new ApiError(response.status, message, undefined, errorData);
    }

    const data = await response.json();
    return data;
  }

  /**
   * ביצוע בקשות עם לוגיקת retry
   * מנסה שוב אם הבקשה נכשלת (עד 2 פעמים)
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          ...options,
        });

        return await this.handleResponse<T>(response);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        // המתנה לפני ניסיון חוזר (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('חרג ממספר הניסיונות המקסימלי');
  }

  // ==========================================
  // User Management Methods - מתודות ניהול משתמשים
  // ==========================================

  /**
   * קבלת רשימת כל המשתמשים עם פילטרים ועימוד
   * משמש להצגת רשימת המשתמשים בממשק הניהול
   */
  async getAllUsers(params: GetUsersParams = {}): Promise<UsersListResponse> {
    const queryParams = new URLSearchParams();

    // הוספת פרמטרים לפי הצורך
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.filters?.search) queryParams.append('search', params.filters.search);
    if (params.filters?.groupId) queryParams.append('groupId', params.filters.groupId);
    if (params.filters?.hasGroup !== undefined) queryParams.append('hasGroup', params.filters.hasGroup.toString());
    if (params.filters?.isActive !== undefined) queryParams.append('isActive', params.filters.isActive.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const url = `${this.baseUrl}?${queryParams.toString()}`;

    // השרת מחזיר מבנה wrapper טיפוסי: { success: boolean, data: T, pagination?: {...} }
    // המרה של ה-wrapper לפורמט שה־slice והקומפוננטות מצפות לו
    const raw = await this.makeRequest<import('../types/UserManagement').ApiResponse<UserSummary[]>>(url);

    const users: UserSummary[] = Array.isArray(raw.data) ? raw.data : [];
    const pagination = raw.pagination || {
      page: params.page || 1,
      limit: params.limit || 20,
      total: users.length,
      totalPages: Math.ceil((users.length || 0) / (params.limit || 20)),
    };

    return {
      users,
      pagination,
      filters: params.filters || { search: '', hasGroup: undefined, isActive: undefined },
    } as UsersListResponse;
  }

  /**
   * יצירת משתמש חדש ע"י מנהל
   * משמש להוספת משתמש חדש מממשק הניהול
   */
  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    const url = this.baseUrl;
    return this.makeRequest<CreateUserResponse>(url, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * קבלת פרטי משתמש בודד
   * משמש לקבלת כל הפרטים של משתמש לצורך עריכה
   */
  async getUserById(userId: string): Promise<{
    success: boolean;
    data: UserDetails;
  }> {
    const url = `${this.baseUrl}/${userId}`;
    return this.makeRequest<{
      success: boolean;
      data: UserDetails;
    }>(url);
  }

  /**
   * עדכון פרטי משתמש ע"י מנהל
   * משמש לעריכת משתמש קיים מממשק הניהול
   */
  async updateUser(userId: string, userData: UpdateUserRequest): Promise<UpdateUserResponse> {
    const url = `${this.baseUrl}/${userId}`;
    return this.makeRequest<UpdateUserResponse>(url, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  /**
   * קבלת קבוצה של משתמש ספציפי
   * משמש לבדיקת הקבוצה הנוכחית של משתמש
   */
  async getUserGroup(userId: string): Promise<import('../types/UserManagement').ApiResponse<import('../types/CustomerGroup').CustomerGroup | null>> {
    const url = `${this.baseUrl}/${userId}/group`;
    return this.makeRequest<import('../types/UserManagement').ApiResponse<import('../types/CustomerGroup').CustomerGroup | null>>(url);
  }

  // ==========================================
  // Group Assignment Methods - מתודות שיוך לקבוצות
  // ==========================================

  /**
   * שיוך משתמש לקבוצה
   * הפעולה המרכזית במשימה 2 - משייכת משתמש לקבוצה ספציפית
   */
  async assignUserToGroup(request: AssignUserToGroupRequest): Promise<AssignUserToGroupResponse> {
    const url = `${this.baseUrl}/${request.userId}/assign`;
    return this.makeRequest<AssignUserToGroupResponse>(url, {
      method: 'POST',
      body: JSON.stringify({ groupId: request.groupId }),
    });
  }

  /**
   * הסרת משתמש מקבוצה
   * מסירה את השיוך של משתמש מקבוצה (מחזירה אותו ללא קבוצה)
   */
  async removeUserFromGroup(userId: string): Promise<RemoveUserFromGroupResponse> {
    const url = `${this.baseUrl}/${userId}/group`;
    return this.makeRequest<RemoveUserFromGroupResponse>(url, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // Group Members Methods - מתודות חברי קבוצה
  // ==========================================

  /**
   * קבלת חברי קבוצה ספציפית
   * משמש להצגת רשימת כל החברים בקבוצה מסוימת
   */
  async getGroupMembers(params: GetGroupMembersParams): Promise<GroupMembersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('groupId', params.groupId);

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    const url = `/api/customer-groups/${params.groupId}/members?${queryParams.toString()}`;
    return this.makeRequest<GroupMembersResponse>(url);
  }

  // ==========================================
  // Bulk Operations Methods - מתודות פעולות בכמות
  // ==========================================

  /**
   * פעולה בכמות - שיוך מספר משתמשים בבת אחת
   * משמש לשיוך מהיר של מספר משתמשים לקבוצה
   */
  async bulkAssignUsersToGroup(request: BulkUserOperationRequest): Promise<BulkUserOperationResponse> {
    const url = `${this.baseUrl}/bulk-assign`;
    return this.makeRequest<BulkUserOperationResponse>(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * פעולה בכמות - הסרת מספר משתמשים מקבוצה
   * משמש להסרה מהירה של מספר משתמשים מקבוצה
   */
  async bulkRemoveUsersFromGroup(request: BulkUserOperationRequest): Promise<BulkUserOperationResponse> {
    const url = `${this.baseUrl}/bulk-remove`;
    return this.makeRequest<BulkUserOperationResponse>(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // ==========================================
  // Statistics Methods - מתודות סטטיסטיקות
  // ==========================================

  /**
   * קבלת סטטיסטיקות משתמשים עם מגמות
   * משמש להצגת מידע סטטיסטי על המשתמשים במערכת כולל השוואה לחודש קודם
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersWithGroups: number;
    usersWithoutGroups: number;
    newCustomersThisMonth: number;
    newCustomersLastMonth: number;
    trends: {
      newCustomers: {
        current: number;
        previous: number;
        percentChange: number;
        direction: 'up' | 'down' | 'stable';
      };
      totalUsers: {
        current: number;
        growthThisMonth: number;
        percentChange: number;
        direction: 'up' | 'stable';
      };
    };
  }> {
    const url = `${this.baseUrl}/statistics`;
    return this.makeRequest<{
      totalUsers: number;
      activeUsers: number;
      usersWithGroups: number;
      usersWithoutGroups: number;
      newCustomersThisMonth: number;
      newCustomersLastMonth: number;
      trends: {
        newCustomers: {
          current: number;
          previous: number;
          percentChange: number;
          direction: 'up' | 'down' | 'stable';
        };
        totalUsers: {
          current: number;
          growthThisMonth: number;
          percentChange: number;
          direction: 'up' | 'stable';
        };
      };
    }>(url);
  }

  // ==========================================
  // Utility Methods - מתודות עזר נוספות
  // ==========================================

  /**
   * בדיקת תקינות משתמש
   * משמש לוודא שמשתמש קיים ופעיל לפני ביצוע פעולות
   */
  async validateUser(userId: string): Promise<{ valid: boolean; user?: UserSummary }> {
    try {
      const url = `${this.baseUrl}/${userId}/validate`;
      const result = await this.makeRequest<{ valid: boolean; user?: UserSummary }>(url);
      return result;
    } catch (err) {
      console.debug('validateUser error:', err);
      return { valid: false };
    }
  }

  /**
   * קבלת היסטוריית שיוכים של משתמש
   * משמש למעקב אחר שינויי קבוצות של משתמש
   */
  async getUserAssignmentHistory(userId: string): Promise<{
    history: Array<{
      groupId: string;
      groupName: string;
      assignedAt: string;
      assignedBy: string;
    }>;
  }> {
    const url = `${this.baseUrl}/${userId}/assignment-history`;
    return this.makeRequest<{
      history: Array<{
        groupId: string;
        groupName: string;
        assignedAt: string;
        assignedBy: string;
      }>;
    }>(url);
  }

  // ==========================================
  // Cart & Orders Methods - צפייה בסל קניות והזמנות משתמש
  // ==========================================

  /**
   * קבלת סל הקניות של משתמש
   * משמש למנהל לצפות בסל הקניות הנוכחי של לקוח
   */
  async getUserCart(userId: string): Promise<UserCartResponse> {
    const url = `${this.baseUrl}/${userId}/cart`;
    return this.makeRequest<UserCartResponse>(url);
  }

  /**
   * קבלת היסטוריית הזמנות של משתמש
   * משמש למנהל לצפות בכל ההזמנות של לקוח
   */
  async getUserOrders(userId: string, params: GetUserOrdersParams = {}): Promise<UserOrdersResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.set('sortDirection', params.sortDirection);

    const queryString = queryParams.toString();
    const url = `${this.baseUrl}/${userId}/orders${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<UserOrdersResponse>(url);
  }

  /**
   * קבלת פרטי הזמנה ספציפית של משתמש
   * משמש למנהל לצפות בפרטים מלאים של הזמנה כולל ציר זמן
   */
  async getUserOrderById(userId: string, orderId: string): Promise<UserOrderDetailResponse> {
    const url = `${this.baseUrl}/${userId}/orders/${orderId}`;
    return this.makeRequest<UserOrderDetailResponse>(url);
  }

  // ==========================================
  // Pending Approval Methods - ניהול הרשמות ממתינות
  // ==========================================

  /**
   * קבלת רשימת משתמשים ממתינים לאישור
   */
  async getPendingApprovalUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  } = {}): Promise<{
    success: boolean;
    data: UserSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.search) queryParams.set('search', params.search);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.set('sortDirection', params.sortDirection);

    const queryString = queryParams.toString();
    const url = `${this.baseUrl}/pending-approval${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<{
      success: boolean;
      data: UserSummary[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(url);
  }

  /**
   * אישור משתמש
   */
  async approveUser(userId: string): Promise<{
    success: boolean;
    message: string;
    data: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      isApproved: boolean;
    };
  }> {
    const url = `${this.baseUrl}/${userId}/approve`;
    return this.makeRequest<{
      success: boolean;
      message: string;
      data: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
        isApproved: boolean;
      };
    }>(url, { method: 'PATCH' });
  }

  /**
   * דחיית משתמש
   */
  async rejectUser(userId: string): Promise<{
    success: boolean;
    message: string;
    data: { userId: string };
  }> {
    const url = `${this.baseUrl}/${userId}/reject`;
    return this.makeRequest<{
      success: boolean;
      message: string;
      data: { userId: string };
    }>(url, { method: 'DELETE' });
  }
}

// ==========================================
// ייצוא Singleton Instance
// ==========================================

/**
 * ייצוא instance יחיד של ה-service
 * מבטיח שיש רק עותק אחד של ה-service בכל האפליקציה
 */
const userManagementService = new UserManagementService();
export default userManagementService;
