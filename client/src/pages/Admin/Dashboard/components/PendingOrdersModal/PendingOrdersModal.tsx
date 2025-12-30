import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';
import { Icon, Button } from '@ui';
import type { Order } from '@/services/orderService';
import styles from './PendingOrdersModal.module.css';

interface PendingOrdersModalProps {
  /** האם המודאל פתוח */
  isOpen: boolean;
  /** פונקציה לסגירת המודאל */
  onClose: () => void;
  /** רשימת הזמנות ממתינות */
  orders: Order[];
  /** האם בתהליך טעינה */
  isLoading?: boolean;
}

/**
 * פורמט מטבע
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * חישוב זמן המתנה בשעות
 */
const getWaitingHours = (dateString: string): number => {
  const created = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
};

/**
 * מודאל להצגת הזמנות ממתינות
 * מציג טבלה מפורטת עם מספר הזמנה, לקוח, סכום וזמן המתנה
 */
const PendingOrdersModal: React.FC<PendingOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  // פונקציה לניווט לדף ניהול הזמנות עם סטטוס pending
  const handleNavigateToOrders = () => {
    onClose(); // סוגרים את המודאל
    navigate('/admin/orders?status=pending'); // מנווטים לדף הזמנות עם פילטר ממתינות
  };

  // פונקציה לפתיחת ההזמנה בדף ניהול הזמנות בתוך הדשבורד
  // נשלח את orderId ב-URL, OrdersPage יטפל בפתיחת המודאל אוטומטית
  const handleViewOrder = (orderId: string) => {
    // סוגרים את המודאל קודם
    onClose();

    // מנווטים לעמוד ניהול הזמנות עם הודעה של ההזמנה שצריך לפתוח
    // OrdersPage עם יקח את הparam 'orderId' מה-URL ויפתח את OrderDetailModal אוטומטית
    navigate(`/admin/orders?orderId=${encodeURIComponent(orderId)}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="הזמנות ממתינות לטיפול"
      size="large"
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      <div className={styles.modalContent}>
        {/* כותרת משנה עם הסבר */}
        <div className={styles.description}>
          <Icon name="Clock" size={20} />
          <p>
            הרשימה הבאה מציגה הזמנות שממתינות לאישור ועיבוד. 
            מומלץ לטפל בהזמנות אלו בהקדם האפשרי.
          </p>
        </div>

        {/* אזור הטבלה */}
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>טוען הזמנות...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon name="CheckCircle2" size={48} />
            <h3>אין הזמנות ממתינות</h3>
            <p>כל ההזמנות טופלו 👍</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.iconCell}>
                    <Icon name="Clock" size={16} />
                  </th>
                  <th>מספר הזמנה</th>
                  <th>לקוח</th>
                  <th>פריטים</th>
                  <th className={styles.amountCell}>סכום</th>
                  <th className={styles.statusCell}>זמן המתנה</th>
                  <th className={styles.actionsCell}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  // חישוב רמת הדחיפות לפי זמן המתנה
                  const waitingHours = getWaitingHours(order.createdAt);
                  const urgency = waitingHours >= 48 
                    ? 'critical' 
                    : waitingHours >= 24 
                    ? 'high' 
                    : 'medium';

                  // שם הלקוח
                  const customerName = order.shippingAddress?.fullName || 
                    order.guestEmail || 
                    'לקוח אנונימי';

                  // מספר פריטים
                  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

                  return (
                    <tr key={order._id} className={styles[`row-${urgency}`]}>
                      <td className={styles.iconCell}>
                        <span className={styles[`urgencyIcon-${urgency}`]}>
                          {urgency === 'critical' ? '🔴' : urgency === 'high' ? '🟠' : '🟡'}
                        </span>
                      </td>
                      <td className={styles.orderNumber}>
                        <code>{order.orderNumber}</code>
                      </td>
                      <td className={styles.customerName}>
                        <span className={styles.name}>{customerName}</span>
                      </td>
                      <td className={styles.itemsCount}>
                        {itemsCount} פריטים
                      </td>
                      <td className={styles.amountCell}>
                        <span className={styles.amount}>
                          {formatCurrency(order.total)}
                        </span>
                      </td>
                      <td className={styles.statusCell}>
                        <span className={styles[`badge-${urgency}`]}>
                          {waitingHours < 1 
                            ? 'פחות משעה'
                            : waitingHours < 24 
                            ? `${waitingHours} שעות` 
                            : `${Math.floor(waitingHours / 24)} ימים`}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <Button
                          variant="outline"
                          size="sm"
                          className={styles.viewOrderBtn}
                          onClick={() => handleViewOrder(order._id)}
                        >
                          <Icon name="Eye" size={14} />
                          צפה בהזמנה
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* סיכום */}
        {orders.length > 0 && (
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>סה"כ הזמנות:</span>
              <span className={styles.summaryValue}>{orders.length}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>סה"כ שווי:</span>
              <span className={styles.summaryValue}>
                {formatCurrency(orders.reduce((sum, o) => sum + o.total, 0))}
              </span>
            </div>
          </div>
        )}

        {/* כפתורי פעולה בתחתית */}
        <div className={styles.footer}>
          <Button
            variant="ghost"
            className={styles.closeButton}
            onClick={onClose}
          >
            סגור
          </Button>
          {orders.length > 0 && (
            <Button
              variant="primary"
              className={styles.actionButton}
              onClick={handleNavigateToOrders}
            >
              <Icon name="ClipboardList" size={16} />
              עבור לניהול הזמנות
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PendingOrdersModal;
