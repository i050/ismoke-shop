// קובץ טיפוסים לניהול משתמשים ומשימה 2: שיוך לקוחות לקבוצות
// מטרת הקובץ: להגדיר את כל הטיפוסים הנחוצים לניהול משתמשים ולשיוך לקבוצות

// ייבוא טיפוסים קיימים מהמודולים האחרים
import type { CustomerGroup } from './CustomerGroup';

// ==========================================
// טיפוסים בסיסיים למשתמשים
// ==========================================

/**
 * טיפוס בסיסי למשתמש במערכת
 * משמש לכל הפעולות הקשורות לניהול משתמשים
 */
export interface User {
  _id: string;                    // מזהה ייחודי של המשתמש
  email: string;                  // כתובת אימייל (שדה חובה)
  firstName: string;              // שם פרטי
  lastName: string;               // שם משפחה
  phone?: string;                 // מספר טלפון (אופציונלי)
  address?: {                     // כתובת (אופציונלי)
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  customerGroupId?: string;       // מזהה הקבוצה שאליה המשתמש משויך (אופציונלי)
  customerGroup?: CustomerGroup;  // אובייקט הקבוצה המלא (אופציונלי - נטען לפי צורך)
  isActive: boolean;              // האם המשתמש פעיל
  createdAt: string;              // תאריך יצירה
  updatedAt: string;              // תאריך עדכון אחרון
  lastLoginAt?: string;           // תאריך התחברות אחרון
}

/**
 * טיפוס מצומצם למשתמש - משמש לרשימות וטבלאות
 * מכיל רק את השדות החיוניים להצגה מהירה
 */
export interface UserSummary {
  _id: string;           // מזהה ייחודי
  email: string;         // כתובת אימייל
  firstName: string;     // שם פרטי
  lastName: string;      // שם משפחה
  customerGroupId?: string | CustomerGroup; // מזהה קבוצה או אובייקט קבוצה (populate)
  isActive: boolean;     // סטטוס פעילות
  createdAt: string;     // תאריך יצירה
}

// ==========================================
// טיפוסים לפעולות שיוך לקבוצות
// ==========================================

/**
 * בקשה לשיוך משתמש לקבוצה
 * משמש ב-API calls לשיוך משתמש לקבוצה ספציפית
 */
export interface AssignUserToGroupRequest {
  userId: string;        // מזהה המשתמש לשיוך
  groupId: string;       // מזהה הקבוצה שאליה משייכים
}

/**
 * בקשה להסרת משתמש מקבוצה
 * משמש ב-API calls להסרת שיוך משתמש מקבוצה
 */
export interface RemoveUserFromGroupRequest {
  userId: string;        // מזהה המשתמש להסרה
}

/**
 * תגובה משיוך משתמש לקבוצה
 * מחזירה את פרטי המשתמש המעודכנים לאחר השיוך
 */
export interface AssignUserToGroupResponse {
  success: boolean;      // האם הפעולה הצליחה
  message: string;       // הודעת הצלחה או שגיאה
  data: User;           // פרטי המשתמש המעודכנים
}

/**
 * תגובה להסרת משתמש מקבוצה
 * מחזירה את פרטי המשתמש המעודכנים לאחר ההסרה
 */
export interface RemoveUserFromGroupResponse {
  success: boolean;      // האם הפעולה הצליחה
  message: string;       // הודעת הצלחה או שגיאה
  data: User;           // פרטי המשתמש המעודכנים
}

// ==========================================
// טיפוסים ליצירת משתמש חדש ע"י מנהל
// ==========================================

/**
 * בקשה ליצירת משתמש חדש ע"י מנהל
 * משמש ב-API call ליצירת משתמש חדש מממשק הניהול
 */
export interface CreateUserRequest {
  firstName: string;              // שם פרטי (חובה)
  lastName: string;               // שם משפחה (חובה)
  email: string;                  // כתובת אימייל (חובה)
  password: string;               // סיסמה (חובה)
  role?: 'customer' | 'admin' | 'super_admin'; // תפקיד (ברירת מחדל: customer)
  customerGroupId?: string;       // שיוך לקבוצת לקוחות (אופציונלי)
  isActive?: boolean;             // האם פעיל (ברירת מחדל: true)
  sendWelcomeEmail?: boolean;     // האם לשלוח מייל ברוכים הבאים
}

/**
 * תגובה ליצירת משתמש חדש
 * מחזירה את פרטי המשתמש שנוצר
 */
export interface CreateUserResponse {
  success: boolean;      // האם הפעולה הצליחה
  message: string;       // הודעת הצלחה או שגיאה
  data: UserSummary;     // פרטי המשתמש שנוצר
}

// ==========================================
// טיפוסים לעריכת משתמש ע"י מנהל
// ==========================================

/**
 * בקשה לעריכת משתמש קיים ע"י מנהל
 * משמש ב-API call לעדכון פרטי משתמש מממשק הניהול
 */
export interface UpdateUserRequest {
  firstName?: string;              // שם פרטי
  lastName?: string;               // שם משפחה
  email?: string;                  // כתובת אימייל
  phone?: string | null;           // טלפון
  role?: 'customer' | 'admin' | 'super_admin'; // תפקיד
  customerGroupId?: string | null; // שיוך לקבוצת לקוחות
  isActive?: boolean;              // האם פעיל
}

/**
 * תגובה לעריכת משתמש
 * מחזירה את פרטי המשתמש המעודכן
 */
export interface UpdateUserResponse {
  success: boolean;      // האם הפעולה הצליחה
  message: string;       // הודעת הצלחה או שגיאה
  data: UserSummary;     // פרטי המשתמש המעודכן
}

/**
 * משתמש עם כל הפרטים לעריכה
 */
export interface UserDetails extends UserSummary {
  phone?: string;                  // טלפון
  role: 'customer' | 'admin' | 'super_admin'; // תפקיד
  isVerified: boolean;             // האם מאומת
  isApproved: boolean;             // האם מאושר
  updatedAt: string;               // תאריך עדכון אחרון
  lastLogin?: string;              // תאריך התחברות אחרון
}

// ==========================================
// טיפוסים לפילטרים וחיפוש
// ==========================================

/**
 * פילטרים לחיפוש משתמשים
 * משמש לסינון רשימת המשתמשים לפי קריטריונים שונים
 */
export interface UserFilters {
  search?: string;       // חיפוש טקסט חופשי (שם, אימייל)
  groupId?: string;      // סינון לפי קבוצה ספציפית
  hasGroup?: boolean;    // סינון לפי משתמשים עם/בלי קבוצה
  isActive?: boolean;    // סינון לפי סטטוס פעילות
}

/**
 * אפשרויות מיון לרשימת משתמשים
 * מגדיר איך למיין את תוצאות החיפוש
 */
export type UserSortOption =
  | 'name'               // מיון לפי שם (א-ת)
  | 'email'              // מיון לפי אימייל
  | 'createdAt'          // מיון לפי תאריך יצירה
  | 'lastLoginAt'        // מיון לפי תאריך התחברות אחרון
  | 'group';             // מיון לפי קבוצה

/**
 * כיוון מיון
 * עולה או יורד
 */
export type SortDirection = 'asc' | 'desc';

// ==========================================
// טיפוסים לניהול מצב Redux
// ==========================================

/**
 * מצב ניהול המשתמשים ב-Redux store
 * מכיל את כל המידע הנחוץ לניהול משתמשים בממשק
 */
export interface UserManagementState {
  // רשימת המשתמשים הנטענים
  users: UserSummary[];           // רשימת המשתמשים (גרסה מצומצמת)

  // מידע על משתמשים נבחרים (לפעולות בכמות)
  selectedUsers: string[];        // רשימת מזהי משתמשים נבחרים

  // מיפוי של קבוצות לפי משתמש
  userGroups: { [userId: string]: CustomerGroup | null }; // קבוצה של כל משתמש

  // מצבי טעינה ושגיאות
  loading: boolean;               // האם יש פעולה מתבצעת
  error: string | null;           // הודעת שגיאה (אם קיימת)

  // פילטרים ומיון נוכחיים
  filters: UserFilters;           // הפילטרים הפעילים

  // מידע על מיון
  sortBy: UserSortOption;         // שדה מיון
  sortDirection: SortDirection;   // כיוון מיון

  // מידע על עימוד (pagination)
  pagination: {
    page: number;                 // עמוד נוכחי
    limit: number;                // מספר פריטים בעמוד
    total: number;                // סה"כ פריטים
    totalPages: number;           // סה"כ עמודים
  };
}

// ==========================================
// טיפוסים לתגובות API
// ==========================================

/**
 * תגובה כללית מ-API
 * משמש לכל התגובות מהשרת
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;      // האם הפעולה הצליחה
  message: string;       // הודעת הצלחה או שגיאה
  data?: T;             // הנתונים המוחזרים (אופציונלי)
  pagination?: Pagination; // נתוני עימוד אופציונליים
  error?: string;       // פרטי שגיאה (אופציונלי)
}

/**
 * תגובה לרשימת משתמשים עם עימוד
 * משמש לקבלת רשימה של משתמשים עם מידע על עימוד
 */
export interface UsersListResponse {
  users: UserSummary[];   // רשימת המשתמשים
  pagination: {
    page: number;         // עמוד נוכחי
    limit: number;        // מספר פריטים בעמוד
    total: number;        // סה"כ משתמשים
    totalPages: number;   // סה"כ עמודים
  };
  filters: UserFilters;   // הפילטרים שהופעלו
}

// ==========================================
// טיפוסים לחברי קבוצה
// ==========================================

/**
 * מידע על חבר בקבוצה
 * משמש להצגת רשימת חברי קבוצה
 */
export interface GroupMember {
  userId: string;        // מזהה המשתמש
  email: string;         // אימייל המשתמש
  firstName: string;     // שם פרטי
  lastName: string;      // שם משפחה
  assignedAt: string;    // תאריך שיוך לקבוצה
  isActive: boolean;     // האם המשתמש פעיל
}

/**
 * תגובה לרשימת חברי קבוצה
 * משמש לקבלת רשימת כל החברים בקבוצה מסוימת
 */
export interface GroupMembersResponse {
  groupId: string;       // מזהה הקבוצה
  groupName: string;     // שם הקבוצה
  members: GroupMember[]; // רשימת החברים
  totalMembers: number;  // סה"כ חברים
  pagination: {
    page: number;        // עמוד נוכחי
    limit: number;       // מספר פריטים בעמוד
    total: number;       // סה"כ חברים
    totalPages: number;  // סה"כ עמודים
  };
}

// ==========================================
// טיפוסים לפעולות בכמות (Bulk Operations)
// ==========================================

/**
 * בקשה לביצוע פעולה על מספר משתמשים
 * משמש לשיוך או הסרה של מספר משתמשים בבת אחת
 */
export interface BulkUserOperationRequest {
  userIds: string[];     // רשימת מזהי המשתמשים
  operation: 'assign' | 'remove'; // סוג הפעולה
  groupId?: string;      // מזהה הקבוצה (רק לשיוך)
}

/**
 * תגובה לפעולה בכמות
 * מחזירה תוצאות הפעולה על כל המשתמשים
 */
export interface BulkUserOperationResponse {
  success: boolean;      // האם הפעולה הכללית הצליחה
  message: string;       // הודעה כללית
  results: {
    userId: string;      // מזהה המשתמש
    success: boolean;    // האם הפעולה הצליחה למשתמש זה
    message: string;     // הודעה ספציפית למשתמש
  }[];
  totalSuccess: number;  // מספר הפעולות שהצליחו
  totalFailed: number;   // מספר הפעולות שנכשלו
}

// ==========================================
// טיפוסים ללוגיקה עסקית
// ==========================================

/**
 * סטטיסטיקות משתמשים
 * משמש להצגת מידע סטטיסטי על המשתמשים במערכת
 */
export interface UserStatistics {
  totalUsers: number;           // סה"כ משתמשים
  activeUsers: number;          // משתמשים פעילים
  usersWithGroups: number;      // משתמשים עם קבוצות
  usersWithoutGroups: number;   // משתמשים ללא קבוצות
  groupDistribution: {          // התפלגות לפי קבוצות
    groupId: string;
    groupName: string;
    userCount: number;
  }[];
}

/**
 * אפשרויות תצוגה לממשק המשתמש
 * מגדיר איך להציג את רשימת המשתמשים
 */
export interface UserDisplayOptions {
  showInactive: boolean;        // האם להציג משתמשים לא פעילים
  showGroupInfo: boolean;       // האם להציג מידע על קבוצה
  showLastLogin: boolean;       // האם להציג תאריך התחברות אחרון
  compactView: boolean;         // תצוגה מצומצמת או מלאה
}

// ==========================================
// טיפוסים לאימות ותקינות
// ==========================================

/**
 * שגיאות אפשריות בשיוך משתמשים
 * משמש לטיפול בשגיאות ספציפיות
 */
export type UserAssignmentError =
  | 'USER_NOT_FOUND'           // המשתמש לא נמצא
  | 'GROUP_NOT_FOUND'          // הקבוצה לא נמצאה
  | 'USER_ALREADY_ASSIGNED'    // המשתמש כבר משויך לקבוצה
  | 'GROUP_NOT_ACTIVE'         // הקבוצה לא פעילה
  | 'PERMISSION_DENIED'        // אין הרשאה לבצע פעולה זו
  | 'DATABASE_ERROR';          // שגיאת מסד נתונים

/**
 * הודעות שגיאה מתורגמות
 * משמש להצגת הודעות שגיאה ברורות למשתמש
 */
export const USER_ASSIGNMENT_ERROR_MESSAGES: Record<UserAssignmentError, string> = {
  USER_NOT_FOUND: 'המשתמש לא נמצא במערכת',
  GROUP_NOT_FOUND: 'הקבוצה לא נמצאת במערכת',
  USER_ALREADY_ASSIGNED: 'המשתמש כבר משויך לקבוצה זו',
  GROUP_NOT_ACTIVE: 'לא ניתן לשייך לקבוצה לא פעילה',
  PERMISSION_DENIED: 'אין לך הרשאה לבצע פעולה זו',
  DATABASE_ERROR: 'שגיאה במסד הנתונים, נסה שוב מאוחר יותר'
};

// ==========================================
// טיפוסים לשירותים (Services)
// ==========================================

/**
 * פרמטרים לקריאת רשימת משתמשים
 * משמש בשירותים לקבלת רשימת משתמשים עם פילטרים
 */
export interface GetUsersParams {
  page?: number;                // עמוד (ברירת מחדל: 1)
  limit?: number;               // מספר פריטים בעמוד (ברירת מחדל: 20)
  filters?: UserFilters;        // פילטרים
  sortBy?: UserSortOption;      // שדה מיון
  sortDirection?: SortDirection; // כיוון מיון
}

/**
 * פרמטרים לקריאת חברי קבוצה
 * משמש בשירותים לקבלת רשימת חברי קבוצה
 */
export interface GetGroupMembersParams {
  groupId: string;              // מזהה הקבוצה
  page?: number;                // עמוד
  limit?: number;               // מספר פריטים בעמוד
  search?: string;              // חיפוש בתוך הקבוצה
}

// ==========================================
// טיפוסים לסל קניות והזמנות משתמש (Admin View)
// ==========================================

/**
 * פריט בסל קניות
 */
export interface CartItem {
  _id: string;
  productId: string | {
    _id: string;
    name: string;
    slug: string;
    images?: string[];
  };
  name: string;
  price: number;
  quantity: number;
  image: string;
  sku?: string;
  variant?: {
    color?: string;
    size?: string;
    name?: string;
  };
  subtotal: number;
  availableStock?: number;
}

/**
 * קופון מופעל בסל
 */
export interface CartCoupon {
  code: string;
  discountAmount: number;
  discountType: 'percentage' | 'fixed';
}

/**
 * סל קניות של משתמש
 */
export interface UserCart {
  _id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  totalPrice: number;
  coupon?: CartCoupon;
  status: 'active' | 'abandoned' | 'checkedOut' | 'merged';
  itemsCount: number;
  totalQuantity: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * תגובת API לסל קניות של משתמש
 */
export interface UserCartResponse {
  success: boolean;
  data: {
    exists: boolean;
    cart: UserCart | null;
    message?: string;
  };
}

/**
 * פריט בהזמנה
 */
export interface OrderItem {
  productId: string;
  skuId?: string;
  name: string;
  skuName?: string;  // שם ה-SKU הספציפי (למשל: "אמבר", "כחול M")
  sku: string;       // קוד SKU (מק"ט)
  price: number;
  quantity: number;
  imageUrl?: string;
  attributes?: Record<string, any>;
  subtotal: number;
}

/**
 * כתובת משלוח
 */
export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  notes?: string;
}

/**
 * רשומה בהיסטוריית סטטוס
 */
export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

/**
 * סטטוסי הזמנה
 */
export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'attention';

/**
 * סטטוסי תשלום
 */
export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

/**
 * סטטוסי הכנה למשלוח
 */
export type FulfillmentStatus = 
  | 'pending'
  | 'packed'
  | 'shipped'
  | 'delivered';

/**
 * הזמנה של משתמש (סיכום לרשימה)
 */
export interface UserOrderSummary {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  statusHistory: StatusHistoryEntry[];
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  shippingCarrier?: string;
  courierPhone?: string;
  estimatedDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * סטטיסטיקות הזמנות של משתמש
 */
export interface UserOrderStats {
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

/**
 * פרמטרים לקבלת הזמנות משתמש
 */
export interface GetUserOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * תגובת API להזמנות משתמש
 */
export interface UserOrdersResponse {
  success: boolean;
  data: {
    orders: UserOrderSummary[];
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    stats: UserOrderStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * ציר זמן סטטוסים של הזמנה
 */
export interface OrderTimeline {
  statusDates: {
    created: string | null;
    confirmed: string | null;
    processing: string | null;
    shipped: string | null;
    delivered: string | null;
    cancelled: string | null;
    returned: string | null;
  };
  currentStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
}

/**
 * תגובת API לפרטי הזמנה ספציפית
 */
export interface UserOrderDetailResponse {
  success: boolean;
  data: {
    order: UserOrderSummary;
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    timeline: OrderTimeline;
  };
}

// ייצוא כל הטיפוסים כ-default export
export default {};
