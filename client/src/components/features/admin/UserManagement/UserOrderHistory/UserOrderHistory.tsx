// רכיב היסטוריית הזמנות של משתמש - Admin View
// מטרת הקומפוננטה: מאפשר למנהל לצפות בכל ההזמנות של לקוח

import React, { useEffect, useState, useCallback } from 'react';
import userManagementService from '../../../../../services/userManagementService';
import type { 
  UserOrderSummary, 
  UserOrderStats,
  OrderStatus,
  GetUserOrdersParams 
} from '../../../../../types/UserManagement';
import { 
  Package, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  CreditCard,
  Truck,
  TrendingUp,
  ShoppingBag,
  XCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '../../../../ui';
import { Modal } from '../../../../ui';
import OrderDetailsModal from '../OrderDetailsModal';
import styles from './UserOrderHistory.module.css';

// ==========================================
// טיפוסים מקומיים
// ==========================================

interface UserOrderHistoryProps {
  /** האם המודל פתוח */
  isOpen: boolean;
  /** פונקציה לסגירת המודל */
  onClose: () => void;
  /** מזהה המשתמש */
  userId: string;
  /** שם המשתמש להצגה */
  userName?: string;
}

// ==========================================
// פונקציות עזר
// ==========================================

/**
 * פורמט מחיר בשקלים
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
};

/**
 * פורמט תאריך בעברית
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

/**
 * תרגום סטטוס הזמנה לעברית עם צבע
 */
const getOrderStatusInfo = (status: OrderStatus): { label: string; className: string; icon: React.ReactNode } => {
  const statusMap: Record<OrderStatus, { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: 'ממתין', className: 'statusPending', icon: <Package size={14} /> },
    confirmed: { label: 'אושר', className: 'statusConfirmed', icon: <CheckCircle size={14} /> },
    processing: { label: 'בעיבוד', className: 'statusProcessing', icon: <Package size={14} /> },
    shipped: { label: 'נשלח', className: 'statusShipped', icon: <Truck size={14} /> },
    delivered: { label: 'נמסר', className: 'statusDelivered', icon: <CheckCircle size={14} /> },
    cancelled: { label: 'בוטל', className: 'statusCancelled', icon: <XCircle size={14} /> },
    returned: { label: 'הוחזר', className: 'statusReturned', icon: <XCircle size={14} /> },
    attention: { label: 'דורש טיפול', className: 'statusAttention', icon: <AlertCircle size={14} /> }
  };
  return statusMap[status] || { label: status, className: '', icon: <Package size={14} /> };
};

/**
 * תרגום סטטוס תשלום לעברית
 */
const getPaymentStatusInfo = (status: string): { label: string; className: string } => {
  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { label: 'ממתין', className: 'paymentPending' },
    paid: { label: 'שולם', className: 'paymentPaid' },
    failed: { label: 'נכשל', className: 'paymentFailed' },
    refunded: { label: 'הוחזר', className: 'paymentRefunded' },
    partially_refunded: { label: 'הוחזר חלקית', className: 'paymentPartial' }
  };
  return statusMap[status] || { label: status, className: '' };
};

// ==========================================
// קומפוננטת סטטיסטיקות
// ==========================================

const StatsCards: React.FC<{ stats: UserOrderStats }> = ({ stats }) => (
  <div className={styles.statsGrid}>
    <div className={styles.statCard}>
      <ShoppingBag size={20} className={styles.statIcon} />
      <div className={styles.statContent}>
        <span className={styles.statValue}>{stats.totalOrders}</span>
        <span className={styles.statLabel}>סה"כ הזמנות</span>
      </div>
    </div>
    
    <div className={styles.statCard}>
      <TrendingUp size={20} className={styles.statIcon} />
      <div className={styles.statContent}>
        <span className={styles.statValue}>{formatPrice(stats.totalSpent)}</span>
        <span className={styles.statLabel}>סה"כ הוצאות</span>
      </div>
    </div>
    
    <div className={styles.statCard}>
      <CreditCard size={20} className={styles.statIcon} />
      <div className={styles.statContent}>
        <span className={styles.statValue}>{formatPrice(stats.avgOrderValue)}</span>
        <span className={styles.statLabel}>ממוצע להזמנה</span>
      </div>
    </div>
    
    <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
      <CheckCircle size={20} className={styles.statIcon} />
      <div className={styles.statContent}>
        <span className={styles.statValue}>{stats.completedOrders}</span>
        <span className={styles.statLabel}>הושלמו</span>
      </div>
    </div>
  </div>
);

// ==========================================
// קומפוננטת שורת הזמנה בטבלה
// ==========================================

const OrderRow: React.FC<{ 
  order: UserOrderSummary; 
  onViewDetails: (orderId: string) => void;
}> = ({ order, onViewDetails }) => {
  const statusInfo = getOrderStatusInfo(order.status);
  const paymentInfo = getPaymentStatusInfo(order.paymentStatus);

  return (
    <tr className={styles.orderRow}>
      <td className={styles.orderNumber}>
        <span>{order.orderNumber}</span>
      </td>
      <td className={styles.orderDate}>
        <Calendar size={14} />
        <span>{formatDate(order.createdAt)}</span>
      </td>
      <td className={styles.orderItems}>
        <span>{order.items.length} פריטים</span>
      </td>
      <td className={styles.orderTotal}>
        <span>{formatPrice(order.total)}</span>
      </td>
      <td>
        <span className={`${styles.statusBadge} ${styles[statusInfo.className]}`}>
          {statusInfo.icon}
          {statusInfo.label}
        </span>
      </td>
      <td>
        <span className={`${styles.paymentBadge} ${styles[paymentInfo.className]}`}>
          {paymentInfo.label}
        </span>
      </td>
      <td className={styles.orderActions}>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onViewDetails(order._id)}
          title="צפה בפרטי ההזמנה"
        >
          <Eye size={16} />
        </Button>
      </td>
    </tr>
  );
};

// ==========================================
// קומפוננטה ראשית - היסטוריית הזמנות
// ==========================================

const UserOrderHistory: React.FC<UserOrderHistoryProps> = ({ isOpen, onClose, userId, userName }) => {
  // מצבים מקומיים
  const [orders, setOrders] = useState<UserOrderSummary[]>([]);
  const [stats, setStats] = useState<UserOrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  
  // מודל פרטי הזמנה
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // טעינת הזמנות
  const loadOrders = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const params: GetUserOrdersParams = {
        page,
        limit: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await userManagementService.getUserOrders(userId, params);
      
      if (response.success) {
        setOrders(response.data.orders);
        setStats(response.data.stats);
        setTotalPages(response.data.pagination.totalPages);
        setTotal(response.data.pagination.total);
      }
    } catch (err: any) {
      console.error('Error loading user orders:', err);
      setError(err.message || 'שגיאה בטעינת ההזמנות');
    } finally {
      setLoading(false);
    }
  }, [userId, page, statusFilter]);

  // טעינה כשהמודל נפתח
  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen, loadOrders]);

  // ניקוי בסגירה
  const handleClose = () => {
    setOrders([]);
    setStats(null);
    setError(null);
    setPage(1);
    setStatusFilter('');
    onClose();
  };

  // פתיחת מודל פרטי הזמנה
  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowDetailsModal(true);
  };

  // סגירת מודל פרטי הזמנה
  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedOrderId(null);
  };

  // ניווט בין עמודים
  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // שינוי פילטר סטטוס
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as OrderStatus | '');
    setPage(1); // חזרה לעמוד ראשון
  };

  // ==========================================
  // רינדור תוכן המודל
  // ==========================================

  const renderContent = () => {
    // מצב טעינה
    if (loading && orders.length === 0) {
      return (
        <div className={styles.loading}>
          <Loader2 size={32} className={styles.spinner} />
          <span>טוען היסטוריית הזמנות...</span>
        </div>
      );
    }

    // מצב שגיאה
    if (error) {
      return (
        <div className={styles.error}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadOrders}>
            נסה שוב
          </Button>
        </div>
      );
    }

    return (
      <>
        {/* כותרת */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Package size={20} />
            <h3>היסטוריית הזמנות</h3>
            <span className={styles.totalCount}>({total} הזמנות)</span>
          </div>
          <Button variant="ghost" size="sm" onClick={loadOrders}>
            <RefreshCw size={16} className={loading ? styles.spinner : ''} />
          </Button>
        </div>

        {/* סטטיסטיקות */}
        {stats && stats.totalOrders > 0 && <StatsCards stats={stats} />}

        {/* פילטרים */}
        <div className={styles.filters}>
          <select 
            className={styles.filterSelect}
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="">כל הסטטוסים</option>
            <option value="pending">ממתין</option>
            <option value="confirmed">אושר</option>
            <option value="processing">בעיבוד</option>
            <option value="shipped">נשלח</option>
            <option value="delivered">נמסר</option>
            <option value="cancelled">בוטל</option>
            <option value="returned">הוחזר</option>
          </select>
        </div>

        {/* טבלת הזמנות או מצב ריק */}
        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <Package size={48} className={styles.emptyIcon} />
            <h3>אין הזמנות</h3>
            <p>
              {statusFilter 
                ? `אין הזמנות בסטטוס "${getOrderStatusInfo(statusFilter as OrderStatus).label}"`
                : `למשתמש ${userName || 'זה'} אין הזמנות עדיין`
              }
            </p>
          </div>
        ) : (
          <>
            {/* טבלת הזמנות */}
            <div className={styles.tableWrapper}>
              <table className={styles.ordersTable}>
                <thead>
                  <tr>
                    <th>מספר הזמנה</th>
                    <th>תאריך</th>
                    <th>פריטים</th>
                    <th>סה"כ</th>
                    <th>סטטוס</th>
                    <th>תשלום</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <OrderRow 
                      key={order._id} 
                      order={order} 
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* עימוד */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronRight size={16} />
                  הקודם
                </Button>
                
                <span className={styles.pageInfo}>
                  עמוד {page} מתוך {totalPages}
                </span>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                >
                  הבא
                  <ChevronLeft size={16} />
                </Button>
              </div>
            )}
          </>
        )}

        {/* מודל פרטי הזמנה */}
        {showDetailsModal && selectedOrderId && (
          <OrderDetailsModal
            isOpen={showDetailsModal}
            onClose={handleCloseDetails}
            userId={userId}
            orderId={selectedOrderId}
          />
        )}
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`היסטוריית הזמנות - ${userName || 'לקוח'}`}
      size="large"
    >
      <div className={styles.container}>
        {renderContent()}
      </div>
    </Modal>
  );
};

export default UserOrderHistory;
