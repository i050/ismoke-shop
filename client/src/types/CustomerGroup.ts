// Customer Group Types
export interface CustomerGroup {
  _id: string;
  name: string;
  discountPercentage: number;
  color: string;
  description?: string;
  isActive: boolean;
  priority: number;
  taxRate: number;

  // תכונות שקיפות
  showGroupMembership: boolean;
  showOriginalPrice: boolean;

  // מעקב אחר שינויים
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;

  // תנאים לקבוצה (עתידי)
  conditions?: {
    minOrderAmount?: number;
    minOrdersCount?: number;
  };

  // Virtual fields
  userCount?: number;
  activeUserCount?: number;
  membersCount?: number;  // מספר חברי הקבוצה הנוכחיים
}

// Form data for creating/updating customer groups
export interface CustomerGroupFormData {
  name: string;
  discountPercentage: number;
  color: string;
  description?: string;
  priority?: number;
  taxRate?: number;
  showGroupMembership: boolean;
  showOriginalPrice: boolean;
  conditions?: {
    minOrderAmount?: number;
    minOrdersCount?: number;
  };
}

// API Response types
export interface CustomerGroupsResponse {
  success: boolean;
  data: {
    groups: CustomerGroup[];
    count: number;
    totalPages?: number;
    currentPage?: number;
  };
}

export interface CustomerGroupResponse {
  success: boolean;
  data: CustomerGroup;
}

// Redux State
export interface CustomerGroupsState {
  groups: CustomerGroup[];
  currentGroup: CustomerGroup | null;
  loading: boolean;
  error: string | null;
  filters: {
    search: string;
    isActive: boolean | null;
    sortBy: 'name' | 'priority' | 'createdAt';
    sortOrder: 'asc' | 'desc';
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Form validation errors
export interface CustomerGroupFormErrors {
  name?: string;
  discountPercentage?: string;
  color?: string;
  description?: string;
  priority?: string;
  taxRate?: string;
  showGroupMembership?: string;
  showOriginalPrice?: string;
  conditions?: {
    minOrderAmount?: string;
    minOrdersCount?: string;
  };
}

// טיפוסים חדשים למודל מחיקה עם אזהרה
// מטרה: לטפל בתגובה החדשה מהשרת כשיש משתמשים בקבוצה

// מידע על קבוצה למחיקה - מגיע מהשרת כשיש משתמשים
export interface GroupDeletionInfo {
  name: string;              // שם הקבוצה למודל האזהרה
  membersCount: number;      // מספר המשתמשים שיושפעו
  discountPercentage: number; // אחוז ההנחה שיאבד
}

// תגובת שרת כשמנסים למחוק קבוצה עם משתמשים
export interface DeleteGroupWithMembersResponse {
  success: false;                        // תמיד false כי דורש אישור
  requiresConfirmation: true;            // סימן לקליינט שצריך מודל אזהרה
  groupInfo: GroupDeletionInfo;          // המידע למודל האזהרה
  message: string;                       // הודעה דינמית למשתמש
}

// תגובת שרת אחרי מחיקה בכוח מוצלחת
export interface ForceDeleteGroupResponse {
  success: true;                         // מחיקה הצליחה
  message: string;                       // הודעת הצלחה עם פרטים
  data: {
    deletedGroup: string;                // שם הקבוצה שנמחקה
    affectedUsersCount: number;          // כמה משתמשים הושפעו
  };
}

// מצב המודל למחיקה - עם מידע על הקבוצה
export interface DeleteConfirmationModalState {
  isOpen: boolean;
  group: CustomerGroup | null;           // הקבוצה שרוצים למחוק
  groupInfo: GroupDeletionInfo | null;   // מידע נוסף על ההשפעה
  message: string;                       // הודעה דינמית מהשרת
}
