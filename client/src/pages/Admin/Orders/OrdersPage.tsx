/**
 * דף ניהול הזמנות לאדמין
 * Phase 5.1 מתוך ORDERS_SYSTEM_IMPLEMENTATION_PLAN.md
 * 
 * כולל:
 * - טבלת הזמנות עם pagination
 * - פילטרים (סטטוס, תאריכים, חיפוש)
 * - עדכון סטטוס הזמנה
 * - מודל פרטי הזמנה
 * 
 * @module pages/Admin/Orders/OrdersPage
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TitleWithIcon, Button, Input } from '../../../components/ui';
import { 
  Search, 
  RefreshCw, 
  Eye, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getAllOrders, updateOrderStatus, updatePaymentStatus, getOrdersStats } from '../../../services/orderService';
import { useToast } from '../../../hooks/useToast';
import type { Order, OrderStatus, PaymentStatus, ShippingDetails } from '../../../services/orderService';
import { OrderDetailModal } from './components';
import { ReAuthModal } from '../../../components/features/auth/ReAuthModal/ReAuthModal';
import { isRecentlyAuthenticated } from '../../../utils/tokenUtils';
import styles from './OrdersPage.module.css';

// ============================================================================
// Types
// ============================================================================

interface OrdersStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
}

interface Filters {
  status: OrderStatus | '';
  search: string;
  page: number;
  limit: number;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'כל הסטטוסים' },
  { value: 'pending', label: 'ממתין' },
  { value: 'confirmed', label: 'אושר' },
  { value: 'processing', label: 'בעיבוד' },
  { value: 'shipped', label: 'נשלח' },
  { value: 'delivered', label: 'נמסר' },
  { value: 'cancelled', label: 'בוטל' },
  { value: 'refunded', label: 'הוחזר' },
];

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'לא שולם',
  processing: 'בעיבוד',
  completed: 'שולם',
  paid: 'שולם',
  failed: 'נכשל',
  refunded: 'הוחזר',
  cancelled: 'בוטל',
  partially_refunded: 'הוחזר חלקית',
};

// אפשרויות סטטוס תשלום ל-dropdown
const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'לא שולם' },
  { value: 'paid', label: 'שולם' },
  { value: 'failed', label: 'נכשל' },
  { value: 'cancelled', label: 'בוטל' },
  { value: 'refunded', label: 'הוחזר' },
  { value: 'partially_refunded', label: 'הוחזר חלקית' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'danger',
  refunded: 'secondary',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} />,
  confirmed: <CheckCircle2 size={14} />,
  processing: <Package size={14} />,
  shipped: <Truck size={14} />,
  delivered: <CheckCircle2 size={14} />,
  cancelled: <XCircle size={14} />,
  refunded: <RefreshCw size={14} />,
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  confirmed: 'אושר',
  processing: 'בעיבוד',
  shipped: 'נשלח',
  delivered: 'נמסר',
  cancelled: 'בוטל',
  refunded: 'הוחזר',
};

// ============================================================================
// Main Component
// ============================================================================

const OrdersPage: React.FC = () => {
  // URL Search Params - לפתיחת מודאל ישירות מ-URL
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrdersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<Filters>({
    status: '',
    search: '',
    page: 1,
    limit: 20,
  });
  
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
  });
  
  // Highlight - הזמנה שצריכה להבהב (מגיע מקישור במייל)
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
  
  // 🔐 Soft Login - ReAuth Modal state
  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const pendingStatusUpdateRef = useRef<{ orderId: string; newStatus: OrderStatus; shippingDetails?: ShippingDetails } | null>(null);
  const pendingPaymentUpdateRef = useRef<{ orderId: string; paymentStatus: PaymentStatus } | null>(null);
  
  const { showToast } = useToast();

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAllOrders({
        page: filters.page,
        limit: filters.limit,
        status: filters.status || undefined,
        search: filters.search || undefined,
      });
      
      if (response.success) {
        setOrders(response.data);
        setPagination({
          total: response.pagination.total,
          pages: response.pagination.pages,
        });
      } else {
        setError('שגיאה בטעינת הזמנות');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('שגיאה בטעינת הזמנות');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getOrdersStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ==========================================================================
  // Auto-open Modal from URL Parameter
  // ==========================================================================
  
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId && orders.length > 0 && !loading) {
      // מחפש את ההזמנה ברשימה
      const orderToOpen = orders.find(o => o._id === orderId || o.orderNumber === orderId);
      if (orderToOpen) {
        setSelectedOrder(orderToOpen);
        setIsModalOpen(true);
        // מנקה את ה-parameter מה-URL אחרי פתיחה
        searchParams.delete('orderId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [orders, loading, searchParams, setSearchParams]);

  // ==========================================================================
  // Highlight Effect - הבהוב שורת הזמנה (מקישור במייל)
  // ==========================================================================
  
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && orders.length > 0 && !loading) {
      // מחפש את ההזמנה ברשימה
      const orderToHighlight = orders.find(o => o._id === highlightId || o.orderNumber === highlightId);
      if (orderToHighlight) {
        setHighlightOrderId(orderToHighlight._id);
        // מנקה את ה-parameter מה-URL
        searchParams.delete('highlight');
        setSearchParams(searchParams, { replace: true });
        
        // גלילה לשורה
        setTimeout(() => {
          const row = document.getElementById(`order-row-${orderToHighlight._id}`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        // הסרת ההבהוב אחרי 3 שניות (3 הבהובים)
        setTimeout(() => {
          setHighlightOrderId(null);
        }, 3000);
      }
    }
  }, [orders, loading, searchParams, setSearchParams]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleFilterChange = (key: keyof Filters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : Number(value), // Reset to page 1 on filter change
    }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus, shippingDetails?: ShippingDetails) => {
    // 🔐 Soft Login - בדיקה האם נדרש אימות מחדש (isAdmin=true לחלון 30 דקות)
    if (!isRecentlyAuthenticated(true)) {
      // שמירת הפעולה הממתינה והצגת modal
      pendingStatusUpdateRef.current = { orderId, newStatus, shippingDetails };
      setShowReAuthModal(true);
      return;
    }
    
    // ביצוע עדכון הסטטוס
    await executeStatusUpdate(orderId, newStatus, shippingDetails);
  };
  
  // פונקציה פנימית לביצוע עדכון סטטוס (לאחר אימות)
  const executeStatusUpdate = async (orderId: string, newStatus: OrderStatus, shippingDetails?: ShippingDetails) => {
    try {
      setUpdatingStatus(orderId);
      // שליחת פרטי משלוח אם קיימים (רלוונטי כשעוברים ל-shipped)
      const response = await updateOrderStatus(orderId, newStatus, undefined, shippingDetails);
      
      if (response.success) {
        // עדכון הרשימה המקומית עם פרטי המשלוח החדשים
        setOrders(prev => 
          prev.map(order => 
            order._id === orderId 
              ? { 
                  ...order, 
                  status: newStatus,
                  // עדכון פרטי משלוח אם נשלחו
                  ...(shippingDetails?.shippingCarrier && { shippingCarrier: shippingDetails.shippingCarrier }),
                  ...(shippingDetails?.trackingNumber && { trackingNumber: shippingDetails.trackingNumber }),
                  ...(shippingDetails?.courierPhone && { courierPhone: shippingDetails.courierPhone })
                }
              : order
          )
        );
        // רענון סטטיסטיקות
        fetchStats();
        // show toast if shipping details were sent
        if (shippingDetails) {
          showToast('success', 'מייל עדכון משלוח הוזמן ונשלח ללקוח');
        }
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      // 🔐 Soft Login - טיפול בשגיאת REAUTH_REQUIRED מהשרת
      if (err?.response?.data?.code === 'REAUTH_REQUIRED') {
        pendingStatusUpdateRef.current = { orderId, newStatus: newStatus, shippingDetails };
        setShowReAuthModal(true);
        return;
      }
      showToast('error', 'שגיאה בעדכון סטטוס');
    } finally {
      setUpdatingStatus(null);
    }
  };
  
  // 🔐 Soft Login - Handler לאחר אימות מוצלח
  const handleReAuthSuccess = async () => {
    setShowReAuthModal(false);
    
    // בדיקה אם יש עדכון סטטוס הזמנה ממתין
    if (pendingStatusUpdateRef.current) {
      const { orderId, newStatus, shippingDetails } = pendingStatusUpdateRef.current;
      pendingStatusUpdateRef.current = null;
      await executeStatusUpdate(orderId, newStatus, shippingDetails);
    }
    
    // בדיקה אם יש עדכון סטטוס תשלום ממתין
    if (pendingPaymentUpdateRef.current) {
      const { orderId, paymentStatus } = pendingPaymentUpdateRef.current;
      pendingPaymentUpdateRef.current = null;
      await executePaymentStatusUpdate(orderId, paymentStatus);
    }
  };
  
  // 🔐 Soft Login - Handler לסגירת modal ללא המשך
  const handleReAuthClose = () => {
    setShowReAuthModal(false);
    pendingStatusUpdateRef.current = null;
    pendingPaymentUpdateRef.current = null;
  };

  // ==========================================================================
  // Payment Status Handlers - עדכון סטטוס תשלום
  // ==========================================================================

  const handlePaymentStatusUpdate = async (orderId: string, newPaymentStatus: PaymentStatus) => {
    // 🔐 Soft Login - בדיקה האם נדרש אימות מחדש
    if (!isRecentlyAuthenticated(true)) {
      pendingPaymentUpdateRef.current = { orderId, paymentStatus: newPaymentStatus };
      setShowReAuthModal(true);
      return;
    }
    
    await executePaymentStatusUpdate(orderId, newPaymentStatus);
  };
  
  // פונקציה פנימית לביצוע עדכון סטטוס תשלום (לאחר אימות)
  const executePaymentStatusUpdate = async (orderId: string, newPaymentStatus: PaymentStatus) => {
    try {
      setUpdatingPayment(orderId);
      const response = await updatePaymentStatus(orderId, newPaymentStatus);
      
      if (response.success) {
        // עדכון הרשימה המקומית עם הנתונים מהשרת
        setOrders(prev => 
          prev.map(order => 
            order._id === orderId 
              ? { 
                  ...order, 
                  ...response.data,
                  payment: { ...order.payment, status: newPaymentStatus }
                }
              : order
          )
        );
        fetchStats();
        showToast('success', `סטטוס תשלום עודכן ל-${PAYMENT_STATUS_LABELS[newPaymentStatus]}`);
      }
    } catch (err: any) {
      console.error('Error updating payment status:', err);
      if (err?.response?.data?.code === 'REAUTH_REQUIRED') {
        pendingPaymentUpdateRef.current = { orderId, paymentStatus: newPaymentStatus };
        setShowReAuthModal(true);
        return;
      }
      showToast('error', 'שגיאה בעדכון סטטוס תשלום');
    } finally {
      setUpdatingPayment(null);
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleRefresh = () => {
    fetchOrders();
    fetchStats();
  };

  // ==========================================================================
  // Render Helpers
  // ==========================================================================

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className={styles.ordersPage}>
      {/* Header */}
      <div className={styles.header}>
        <TitleWithIcon
          icon="ShoppingCart"
          title="ניהול הזמנות"
          subtitle={`${pagination.total} הזמנות`}
        />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          רענון
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconPrimary}`}>
              <Package size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.totalOrders}</span>
              <span className={styles.statLabel}>סה"כ הזמנות</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconWarning}`}>
              <Clock size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.ordersByStatus?.pending || 0}</span>
              <span className={styles.statLabel}>ממתינות לטיפול</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
              <CheckCircle2 size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.ordersByStatus?.delivered || 0}</span>
              <span className={styles.statLabel}>הושלמו</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconInfo}`}>
              <span className={styles.currencyIcon}>₪</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</span>
              <span className={styles.statLabel}>הכנסות</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filtersBar}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchInputWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <Input
              placeholder="חיפוש לפי מספר הזמנה, שם לקוח..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </form>
        
        <div className={styles.filterGroup}>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={styles.filterSelect}
            aria-label="סינון לפי סטטוס"
            title="סינון לפי סטטוס הזמנה"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className={styles.errorMessage}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>טוען הזמנות...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <Package size={48} />
          <h3>לא נמצאו הזמנות</h3>
          <p>נסה לשנות את הפילטרים או לחפש מחדש</p>
        </div>
      ) : (
        <>
          {/* Orders Table */}
          <div className={styles.tableContainer}>
            <table className={styles.ordersTable}>
              <thead>
                <tr>
                  <th>מס' הזמנה</th>
                  <th>תאריך</th>
                  <th>לקוח</th>
                  <th>פריטים</th>
                  <th>סכום</th>
                  <th>סטטוס</th>
                  {/* <th>עדכון</th> */}
                  <th>תשלום</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr 
                    key={order._id}
                    id={`order-row-${order._id}`}
                    className={highlightOrderId === order._id ? styles.highlightRow : ''}
                  >
                    <td className={styles.orderNumber}>
                      {order.orderNumber}
                    </td>
                    <td className={styles.date}>
                      {formatDate(order.createdAt)}
                    </td>
                    <td className={styles.customer}>
                      <span className={styles.customerName}>
                        {order.shippingAddress?.fullName || 'לא ידוע'}
                      </span>
                      <span className={styles.customerPhone}>
                        {order.shippingAddress?.phone}
                      </span>
                    </td>
                    <td className={styles.items}>
                      {order.items?.length || 0} פריטים
                    </td>
                    <td className={styles.total}>
                      {formatCurrency(order.total)}
                    </td>
                    <td>
                      <div className={styles.statusCell}>
                        <span className={`${styles.badge} ${styles[`badge${STATUS_COLORS[order.status]}`]}`}>
                          {STATUS_ICONS[order.status]}
                          {STATUS_LABELS[order.status]}
                        </span>
                        
                        {/* Quick status update */}
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order._id, e.target.value as OrderStatus)}
                          className={styles.statusSelect}
                          disabled={updatingStatus === order._id}
                          aria-label="עדכון סטטוס הזמנה"
                          title="עדכון סטטוס הזמנה"
                        >
                          {STATUS_OPTIONS.filter(s => s.value).map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <div className={styles.paymentCell}>
                        <span className={`${styles.badge} ${
                          order.payment?.status === 'completed' || order.payment?.status === 'paid' ? styles.badgesuccess : 
                          order.payment?.status === 'failed' ? styles.badgedanger : styles.badgewarning
                        }`}>
                          {PAYMENT_STATUS_LABELS[order.payment?.status || 'pending'] || 'ממתין'}
                        </span>
                        
                        {/* עדכון מהיר של סטטוס תשלום */}
                        <select
                          value={order.payment?.status === 'completed' ? 'paid' : (order.payment?.status || 'pending')}
                          onChange={(e) => handlePaymentStatusUpdate(order._id, e.target.value as PaymentStatus)}
                          className={styles.paymentSelect}
                          disabled={updatingPayment === order._id}
                          aria-label="עדכון סטטוס תשלום"
                          title="עדכון סטטוס תשלום"
                        >
                          {PAYMENT_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewOrder(order)}
                        title="צפייה בפרטי הזמנה"
                      >
                        <Eye size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', filters.page - 1)}
                disabled={filters.page === 1}
              >
                <ChevronRight size={16} />
                הקודם
              </Button>
              
              <span className={styles.pageInfo}>
                עמוד {filters.page} מתוך {pagination.pages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', filters.page + 1)}
                disabled={filters.page === pagination.pages}
              >
                הבא
                <ChevronLeft size={16} />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
          onStatusUpdate={(status: OrderStatus, shippingDetails?: ShippingDetails) => 
            handleStatusUpdate(selectedOrder._id, status, shippingDetails)
          }
          onPaymentStatusUpdate={(paymentStatus: PaymentStatus) =>
            handlePaymentStatusUpdate(selectedOrder._id, paymentStatus)
          }
        />
      )}
      
      {/* 🔐 Soft Login - ReAuth Modal */}
      <ReAuthModal
        isOpen={showReAuthModal}
        onClose={handleReAuthClose}
        onSuccess={handleReAuthSuccess}
        title="נדרש אימות מחדש"
        message="לעדכון סטטוס הזמנה נדרש להזין את הסיסמה שלך"
      />
    </div>
  );
};

export default OrdersPage;
