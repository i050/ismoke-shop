/**
 * שירות הזמנות - API client להזמנות
 * מטפל בכל הבקשות הקשורות להזמנות ותשלומים
 */

import { ApiError } from '../utils/ApiError';
import { getToken } from '../utils/tokenUtils';
import { API_BASE_URL } from '../config/api';

// =====================================
// פונקציות עזר
// =====================================

/**
 * יצירת headers עם טוקן ו-sessionId
 */
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // הוספת טוקן אם קיים (למשתמשים מחוברים)
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // הוספת sessionId (למשתמשים אורחים - לעתיד)
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sessionId', sessionId);
  }
  headers['x-session-id'] = sessionId;
  
  return headers;
};

/**
 * טיפול בתגובת API
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
  const status = response.status;
  const result = await response.json().catch(() => ({ success: false }));
  
  if (!response.ok) {
    const msg = result?.message || result?.error || response.statusText || 'שגיאה בתקשורת עם השרת';
    throw new ApiError(status, msg, undefined, result);
  }
  
  return result as T;
};

// =====================================
// טיפוסים
// =====================================

/** פריט בעגלה ליצירת הזמנה */
export interface OrderItemInput {
  productId: string;
  skuId?: string;
  quantity: number;
}

/** כתובת משלוח */
export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country?: string;
  notes?: string;
}

/** נתונים ליצירת הזמנה */
export interface CreateOrderData {
  items: OrderItemInput[];
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  paymentIntentId?: string;
  notes?: string;
}

/** פילטרים לשליפת הזמנות */
export interface OrdersFilterParams {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/** סטטוס הזמנה */
export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/** סטטוס תשלום */
export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

/** פריט בהזמנה (מהשרת) */
export interface OrderItem {
  productId: string;
  productName: string;
  productSlug: string;
  skuId?: string;
  skuName?: string;  // שם ה-SKU הספציפי (למשל: "אמבר", "כחול M")
  sku?: string;      // קוד SKU (מק"ט)
  skuCode?: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  attributes?: Record<string, string>;
  subtotal: number;
}

/** פרטי תשלום */
export interface PaymentInfo {
  gateway: 'stripe' | 'paypal' | 'cash' | 'mock';
  transactionId?: string;
  status: 'pending' | 'processing' | 'completed' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'partially_refunded';
  lastError?: string;
  paidAt?: string;
}

/** היסטוריית סטטוס */
export interface StatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

/** הזמנה מלאה */
export interface Order {
  _id: string;
  orderNumber: string;
  userId?: string | { _id: string; firstName: string; lastName: string; email: string; phone?: string };
  guestEmail?: string;
  status: OrderStatus;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  payment: PaymentInfo;
  statusHistory: StatusHistoryItem[];
  notes?: string;
  internalNotes?: string;
  estimatedDelivery?: string;
  // פרטי משלוח אופציונליים
  trackingNumber?: string;        // מספר מעקב משלוח
  shippingCarrier?: string;       // שם חברת המשלוחים
  courierPhone?: string;          // טלפון השליח
  estimatedDeliveryDays?: number; // ימי עסקים צפויים
  shippingNotes?: string;         // הערות משלוח
  createdAt: string;
  updatedAt: string;
}

/** תגובה עם pagination */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// =====================================
// פונקציות API
// =====================================

/**
 * יצירת הזמנה חדשה
 */
export const createOrder = async (data: CreateOrderData): Promise<{ success: boolean; data: Order; message?: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return handleResponse(response);
};

/**
 * שליפת הזמנות של המשתמש הנוכחי
 */
export const getUserOrders = async (params?: OrdersFilterParams): Promise<PaginatedResponse<Order>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.search) searchParams.set('search', params.search);
  
  const url = `${API_BASE_URL}/api/orders${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(response);
};

/**
 * שליפת הזמנה ספציפית לפי ID
 */
export const getOrderById = async (orderId: string): Promise<{ success: boolean; data: Order }> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(response);
};

/**
 * שליפת הזמנה לפי מספר הזמנה
 */
export const getOrderByNumber = async (orderNumber: string): Promise<{ success: boolean; data: Order }> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/number/${orderNumber}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(response);
};

/**
 * ביטול הזמנה
 */
export const cancelOrder = async (orderId: string, reason?: string): Promise<{ success: boolean; data: Order; message?: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reason })
  });
  return handleResponse(response);
};

// =====================================
// פונקציות תשלומים
// =====================================

/**
 * יצירת Payment Intent (לתשלומי Stripe)
 */
export const createPaymentIntent = async (amount: number, orderId?: string): Promise<{
  success: boolean;
  clientSecret: string;
  paymentIntentId: string;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/payments/create-intent`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ amount, orderId })
  });
  return handleResponse(response);
};

/**
 * בדיקת סטטוס תשלום
 */
export const getPaymentStatus = async (paymentIntentId: string): Promise<{
  success: boolean;
  status: string;
  amount?: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/payments/status/${paymentIntentId}`, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(response);
};

/**
 * אישור תשלום (Mock Mode)
 */
export const confirmMockPayment = async (orderId: string, paymentIntentId: string): Promise<{
  success: boolean;
  message?: string;
}> => {
  const response = await fetch(`${API_BASE_URL}/api/payments/confirm-mock`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ orderId, paymentIntentId })
  });
  return handleResponse(response);
};

// =====================================
// פונקציות Admin
// =====================================

/**
 * שליפת כל ההזמנות (Admin)
 */
export const getAllOrders = async (params?: OrdersFilterParams): Promise<PaginatedResponse<Order>> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.search) searchParams.set('search', params.search);
  
  const url = `${API_BASE_URL}/api/orders/admin/all${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(response);
};

/**
 * פרטי משלוח אופציונליים לעדכון סטטוס "נשלח"
 */
export interface ShippingDetails {
  shippingCarrier?: string;       // שם חברת המשלוחים
  trackingNumber?: string;        // מספר מעקב
  courierPhone?: string;          // טלפון השליח
  estimatedDeliveryDays?: number; // יגיע תוך X ימי עסקים
  shippingNotes?: string;         // הערות משלוח
}

/**
 * עדכון סטטוס הזמנה (Admin)
 * כשמעדכנים ל-shipped ניתן להוסיף פרטי משלוח אופציונליים
 */
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  note?: string,
  shippingDetails?: ShippingDetails
): Promise<{ success: boolean; data: Order; message?: string }> => {
  const bodyData: any = { 
    status, 
    note
  };
  
  // הוספת פרטי משלוח - שלח את כל השדות אם יש shippingDetails
  if (shippingDetails) {
    bodyData.shippingCarrier = shippingDetails.shippingCarrier || '';
    bodyData.trackingNumber = shippingDetails.trackingNumber || '';
    bodyData.courierPhone = shippingDetails.courierPhone || '';
    if (shippingDetails.estimatedDeliveryDays) {
      bodyData.estimatedDeliveryDays = shippingDetails.estimatedDeliveryDays;
    }
    bodyData.shippingNotes = shippingDetails.shippingNotes || '';
  }
  
  console.log('=== ORDER SERVICE UPDATE ===');
  console.log('Sending to API:', bodyData);
  
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(bodyData)
  });
  return handleResponse(response);
};

/**
 * עדכון סטטוס תשלום (Admin)
 * מאפשר למנהל לשנות סטטוס תשלום (למשל: סימון כ"שולם" עבור תשלום במזומן)
 */
export const updatePaymentStatus = async (
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<{ success: boolean; data: Order; message?: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/payment-status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ paymentStatus })
  });
  return handleResponse(response);
};

/**
 * שליחה מחדש של מייל עדכון משלוח (Admin)
 */
export const resendShippedEmail = async (orderId: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/resend-shipped-email`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
};

/**
 * שליפת סטטיסטיקות הזמנות (Admin)
 */
export const getOrdersStats = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  success: boolean;
  data: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<OrderStatus, number>;
    recentOrders: Order[];
  };
}> => {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  
  const url = `${API_BASE_URL}/api/orders/admin/stats${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(response);
};

/**
 * מוצר נמכר ביותר - מבנה התגובה
 */
export interface TopSellingProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  imageUrl?: string;
}

/**
 * שליפת המוצרים הנמכרים ביותר (Admin Dashboard)
 * מחזיר רשימה של המוצרים שהוזמנו הכי הרבה
 */
export const getTopSellingProducts = async (
  limit: number = 10,
  signal?: AbortSignal
): Promise<{
  success: boolean;
  data: TopSellingProduct[];
}> => {
  const url = `${API_BASE_URL}/api/orders/admin/top-selling-products?limit=${limit}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
    signal
  });
  return handleResponse(response);
};

/**
 * קבוצת לקוח - הכנסות
 */
export interface CustomerGroupRevenue {
  groupName: string;
  groupId: string | null;
  revenue: number;
}

/**
 * שליפת הכנסות מחולקות לפי קבוצות לקוחות (Admin Dashboard)
 * מחזיר את סה"כ ההכנסות מכל קבוצת לקוח כולל "ללא קבוצה"
 */
export const getRevenueByCustomerGroup = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  success: boolean;
  data: CustomerGroupRevenue[];
}> => {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  
  const url = `${API_BASE_URL}/api/orders/admin/revenue-by-group${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });
  return handleResponse(response);
};

// =====================================
// Export כ-object לנוחות
// =====================================

export const orderService = {
  // הזמנות
  createOrder,
  getUserOrders,
  getOrderById,
  getOrderByNumber,
  cancelOrder,
  
  // תשלומים
  createPaymentIntent,
  getPaymentStatus,
  confirmMockPayment,
  
  // Admin
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  getOrdersStats,
  getTopSellingProducts,
  getRevenueByCustomerGroup
};

export default orderService;
