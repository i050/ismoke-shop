// רכיב מודל פרטי הזמנה עם ציר זמן - Admin View
// מטרת הקומפוננטה: הצגת פרטי הזמנה מלאים כולל ציר זמן סטטוסים

import React, { useEffect, useState, useCallback } from 'react';
import userManagementService from '../../../../../services/userManagementService';
import type { 
  UserOrderSummary, 
  OrderTimeline 
} from '../../../../../types/UserManagement';
import { Modal } from '../../../../ui';
import { Button } from '../../../../ui';
import { 
  Package, 
  AlertCircle, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  MapPin,
  CreditCard,
  User,
  Calendar,
  FileText,
  Phone
} from 'lucide-react';
import styles from './OrderDetailsModal.module.css';

// ==========================================
// טיפוסים מקומיים
// ==========================================

interface OrderDetailsModalProps {
  /** האם המודל פתוח */
  isOpen: boolean;
  /** פונקציה לסגירת המודל */
  onClose: () => void;
  /** מזהה המשתמש */
  userId: string;
  /** מזהה ההזמנה */
  orderId: string;
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
 * פורמט תאריך ושעה בעברית
 */
const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * מידע על סטטוס לציר הזמן
 */
interface TimelineStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  date: string | null;
  completed: boolean;
  current: boolean;
  cancelled?: boolean;
}

/**
 * בניית שלבי ציר הזמן
 */
const buildTimelineSteps = (timeline: OrderTimeline): TimelineStep[] => {
  const { statusDates, currentStatus } = timeline;
  
  // אם ההזמנה בוטלה או הוחזרה - הצג ציר זמן מותאם
  if (currentStatus === 'cancelled') {
    return [
      { 
        key: 'created', 
        label: 'הזמנה נוצרה', 
        icon: <Package size={18} />, 
        date: statusDates.created, 
        completed: true, 
        current: false 
      },
      { 
        key: 'cancelled', 
        label: 'הזמנה בוטלה', 
        icon: <XCircle size={18} />, 
        date: statusDates.cancelled, 
        completed: true, 
        current: true,
        cancelled: true 
      }
    ];
  }

  if (currentStatus === 'returned') {
    return [
      { 
        key: 'created', 
        label: 'הזמנה נוצרה', 
        icon: <Package size={18} />, 
        date: statusDates.created, 
        completed: true, 
        current: false 
      },
      { 
        key: 'delivered', 
        label: 'נמסר', 
        icon: <CheckCircle size={18} />, 
        date: statusDates.delivered, 
        completed: true, 
        current: false 
      },
      { 
        key: 'returned', 
        label: 'הוחזר', 
        icon: <XCircle size={18} />, 
        date: statusDates.returned, 
        completed: true, 
        current: true,
        cancelled: true 
      }
    ];
  }

  // ציר זמן רגיל
  const steps: TimelineStep[] = [
    { 
      key: 'created', 
      label: 'הזמנה התקבלה', 
      icon: <Package size={18} />, 
      date: statusDates.created, 
      completed: !!statusDates.created, 
      current: currentStatus === 'pending' 
    },
    { 
      key: 'confirmed', 
      label: 'אושרה', 
      icon: <CheckCircle size={18} />, 
      date: statusDates.confirmed, 
      completed: !!statusDates.confirmed, 
      current: currentStatus === 'confirmed' 
    },
    { 
      key: 'processing', 
      label: 'בהכנה', 
      icon: <Clock size={18} />, 
      date: statusDates.processing, 
      completed: !!statusDates.processing, 
      current: currentStatus === 'processing' 
    },
    { 
      key: 'shipped', 
      label: 'נשלחה', 
      icon: <Truck size={18} />, 
      date: statusDates.shipped, 
      completed: !!statusDates.shipped, 
      current: currentStatus === 'shipped' 
    },
    { 
      key: 'delivered', 
      label: 'נמסרה', 
      icon: <CheckCircle size={18} />, 
      date: statusDates.delivered, 
      completed: !!statusDates.delivered, 
      current: currentStatus === 'delivered' 
    }
  ];

  return steps;
};

// ==========================================
// קומפוננטת ציר זמן
// ==========================================

const OrderTimeline: React.FC<{ timeline: OrderTimeline }> = ({ timeline }) => {
  const steps = buildTimelineSteps(timeline);

  return (
    <div className={styles.timeline}>
      <h4 className={styles.sectionTitle}>
        <Clock size={16} />
        מסלול ההזמנה
      </h4>
      <div className={styles.timelineSteps}>
        {steps.map((step, index) => (
          <div 
            key={step.key}
            className={`
              ${styles.timelineStep}
              ${step.completed ? styles.completed : ''}
              ${step.current ? styles.current : ''}
              ${step.cancelled ? styles.cancelled : ''}
            `}
          >
            {/* קו מחבר */}
            {index < steps.length - 1 && (
              <div className={`${styles.connector} ${steps[index + 1].completed ? styles.connectorCompleted : ''}`} />
            )}
            
            {/* אייקון */}
            <div className={styles.stepIcon}>
              {step.icon}
            </div>
            
            {/* תוכן */}
            <div className={styles.stepContent}>
              <span className={styles.stepLabel}>{step.label}</span>
              <span className={styles.stepDate}>
                {step.date ? formatDateTime(step.date) : 'ממתין'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// קומפוננטה ראשית - מודל פרטי הזמנה
// ==========================================

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  userId,
  orderId
}) => {
  // מצבים
  const [order, setOrder] = useState<UserOrderSummary | null>(null);
  const [timeline, setTimeline] = useState<OrderTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // טעינת פרטי ההזמנה
  const loadOrderDetails = useCallback(async () => {
    if (!userId || !orderId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await userManagementService.getUserOrderById(userId, orderId);
      
      if (response.success) {
        setOrder(response.data.order);
        setTimeline(response.data.timeline);
      }
    } catch (err: any) {
      console.error('Error loading order details:', err);
      setError(err.message || 'שגיאה בטעינת פרטי ההזמנה');
    } finally {
      setLoading(false);
    }
  }, [userId, orderId]);

  // טעינה בעת פתיחת המודל
  useEffect(() => {
    if (isOpen) {
      loadOrderDetails();
    }
  }, [isOpen, loadOrderDetails]);

  // ניקוי בעת סגירה
  const handleClose = () => {
    setOrder(null);
    setTimeline(null);
    setError(null);
    onClose();
  };

  // ==========================================
  // רינדור תוכן המודל
  // ==========================================

  const renderContent = () => {
    // מצב טעינה
    if (loading) {
      return (
        <div className={styles.loading}>
          <Loader2 size={32} className={styles.spinner} />
          <span>טוען פרטי הזמנה...</span>
        </div>
      );
    }

    // מצב שגיאה
    if (error) {
      return (
        <div className={styles.error}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadOrderDetails}>
            נסה שוב
          </Button>
        </div>
      );
    }

    if (!order) return null;

    return (
      <div className={styles.content}>
        {/* כותרת עם מספר הזמנה */}
        <div className={styles.orderHeader}>
          <span className={styles.orderNumber}>{order.orderNumber}</span>
          <span className={styles.orderDate}>
            <Calendar size={14} />
            {formatDateTime(order.createdAt)}
          </span>
        </div>

        {/* ציר זמן */}
        {timeline && <OrderTimeline timeline={timeline} />}

        {/* פרטי משלוח */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <MapPin size={16} />
            כתובת משלוח
          </h4>
          <div className={styles.addressCard}>
            <div className={styles.addressLine}>
              <User size={14} />
              <span>{order.shippingAddress.fullName}</span>
            </div>
            <div className={styles.addressLine}>
              <Phone size={14} />
              <span>{order.shippingAddress.phone}</span>
            </div>
            <div className={styles.addressLine}>
              <MapPin size={14} />
              <span>
                {order.shippingAddress.street}, {order.shippingAddress.city}
                {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
              </span>
            </div>
            {order.shippingAddress.notes && (
              <div className={styles.addressLine}>
                <FileText size={14} />
                <span>{order.shippingAddress.notes}</span>
              </div>
            )}
          </div>

          {/* פרטי מעקב משלוח */}
          {(order.trackingNumber || order.shippingCarrier || order.courierPhone) && (
            <div className={styles.trackingInfo}>
              {order.shippingCarrier && (
                <span><Truck size={14} /> {order.shippingCarrier}</span>
              )}
              {order.trackingNumber && (
                <span>מספר מעקב: {order.trackingNumber}</span>
              )}
              {order.courierPhone && (
                <span><Phone size={14} /> שליח: {order.courierPhone}</span>
              )}
            </div>
          )}
        </div>

        {/* פריטי ההזמנה */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Package size={16} />
            פריטים ({order.items.length})
          </h4>
          <div className={styles.itemsList}>
            {order.items.map((item, index) => (
              <div key={index} className={styles.orderItem}>
                <div className={styles.itemImage}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} />
                  ) : (
                    <Package size={20} />
                  )}
                </div>
                <div className={styles.itemDetails}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemSku}>מק"ט: {item.sku}</span>
                  {item.attributes && Object.keys(item.attributes).length > 0 && (
                    <span className={styles.itemAttributes}>
                      {Object.entries(item.attributes)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(' | ')}
                    </span>
                  )}
                </div>
                <div className={styles.itemQuantity}>
                  <span>{item.quantity} יח'</span>
                </div>
                <div className={styles.itemPrice}>
                  <span>{formatPrice(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* סיכום כספי */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <CreditCard size={16} />
            סיכום
          </h4>
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span>סכום ביניים</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className={`${styles.summaryRow} ${styles.discount}`}>
                <span>הנחה</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className={styles.summaryRow}>
              <span>משלוח</span>
              <span>{order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'חינם'}</span>
            </div>
            {order.tax > 0 && (
              <div className={styles.summaryRow}>
                <span>מע"מ</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
            )}
            <div className={`${styles.summaryRow} ${styles.total}`}>
              <span>סה"כ</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* הערות */}
        {order.notes && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>
              <FileText size={16} />
              הערות מהלקוח
            </h4>
            <p className={styles.notes}>{order.notes}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="פרטי הזמנה"
      size="large"
    >
      <div className={styles.container}>
        {renderContent()}
      </div>
    </Modal>
  );
};

export default OrderDetailsModal;
