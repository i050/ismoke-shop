import type {
  CustomerGroup,
  CustomerGroupFormData,
  CustomerGroupsResponse,
  CustomerGroupResponse,
  DeleteGroupWithMembersResponse, // טיפוס חדש: תגובה כשיש משתמשים בקבוצה
  ForceDeleteGroupResponse        // טיפוס חדש: תגובה אחרי מחיקה בכוח
} from '../types/CustomerGroup';
import { ApiError } from '../utils/ApiError';
import { API_BASE_URL } from '../config/api'; // 🔧 FIX: שימוש ב-API_BASE_URL המרכזי

class CustomerGroupService {
  private baseUrl = `${API_BASE_URL}/api/customer-groups`; // 🔧 FIX: שימוש ב-URL המלא של Backend

  // Helper method for handling API responses
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      const message = errorData?.message || response.statusText || `HTTP ${response.status}`;
      throw new ApiError(response.status, message, undefined, errorData);
    }

    const data = await response.json();
    return data;
  }

  // Helper method for making requests with retry logic
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

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new Error('Max retries exceeded');
  }

  // Get all customer groups with optional filters
  async getAllGroups(filters?: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<CustomerGroup[]> {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const url = `${this.baseUrl}?${params.toString()}`;
    const response = await this.makeRequest<CustomerGroupsResponse>(url);

    return response.data.groups; // ✅ מחזיר רק את ה-array
  }

  // Get a specific customer group by ID
  async getGroupById(id: string): Promise<CustomerGroup> {
    const response = await this.makeRequest<CustomerGroupResponse>(
      `${this.baseUrl}/${id}`
    );

    return response.data; // ✅ זה כבר CustomerGroup
  }

  // Create a new customer group
  async createGroup(groupData: CustomerGroupFormData): Promise<CustomerGroup> {
    const response = await this.makeRequest<CustomerGroupResponse>(
      this.baseUrl,
      {
        method: 'POST',
        body: JSON.stringify(groupData),
      }
    );

    return response.data;
  }

  // Update an existing customer group
  async updateGroup(id: string, groupData: Partial<CustomerGroupFormData>): Promise<CustomerGroup> {
    const response = await this.makeRequest<CustomerGroupResponse>(
      `${this.baseUrl}/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(groupData),
      }
    );

    return response.data;
  }

  // בדיקה לפני מחיקת קבוצה - עשויה להחזיר מידע למודל אזהרה
  // מטרה: לבדוק אם אפשר למחוק, ואם לא - לקבל מידע למודל אזהרה
  async deleteGroup(id: string): Promise<void | DeleteGroupWithMembersResponse> {
    // קריאה ישירה לשרת כדי לטפל ב-409 בצורה נכונה
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      // המחיקה הצליחה - קבוצה ריקה נמחקה
      return;
    } else if (response.status === 409) {
      // HTTP 409 = דרישת אישור - זה לא שגיאה, זה מידע למודל אזהרה!
      const data = await response.json() as DeleteGroupWithMembersResponse;
      return data;
    } else {
      // שגיאה אמיתית - נזרוק אותה
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      const message = errorData?.message || response.statusText || `HTTP ${response.status}`;
      throw new ApiError(response.status, message, undefined, errorData);
    }
  }

  // מחיקת קבוצה בכוח - כולל הסרת המשתמשים
  // מטרה: למחוק קבוצה גם כשיש בה משתמשים (אחרי אישור מהמשתמש)
  async forceDeleteGroup(id: string): Promise<ForceDeleteGroupResponse> {
    const response = await this.makeRequest<ForceDeleteGroupResponse>(
      `${this.baseUrl}/${id}/force`,
      {
        method: 'DELETE',
      }
    );
    return response;
  }

  // Toggle customer group active status
  async toggleGroupStatus(id: string): Promise<CustomerGroup> {
    const response = await this.makeRequest<CustomerGroupResponse>(
      `${this.baseUrl}/${id}/toggle`,
      {
        method: 'PATCH',
      }
    );

    return response.data;
  }

  // Get customer group statistics
  async getGroupStats(id: string): Promise<{
    userCount: number;
    activeUserCount: number;
    totalSales: number;
    averageOrderValue: number;
  }> {
    const response = await this.makeRequest<{
      success: boolean;
      data: {
        userCount: number;
        activeUserCount: number;
        totalSales: number;
        averageOrderValue: number;
      };
    }>(`${this.baseUrl}/${id}/stats`);

    return response.data;
  }
}

// Export singleton instance
const customerGroupService = new CustomerGroupService();
export default customerGroupService;
