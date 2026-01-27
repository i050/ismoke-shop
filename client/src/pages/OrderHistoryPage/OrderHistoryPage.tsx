/**
 * OrderHistoryPage - עמוד היסטוריית הזמנות של הלקוח
 * מציג את כל ההזמנות של המשתמש המחובר עם אפשרות לסינון וצפייה בפרטים
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../../hooks/reduxHooks';
import { 
  getUserOrders, 
  cancelOrder,
  type Order, 
  type OrderStatus,
  type OrdersFilterParams 
} from '../../services/orderService';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import Modal from '../../components/ui/Modal/Modal';
import { useToast } from '../../hooks/useToast';
import { Printer, FileDown } from 'lucide-react';
import domtoimage from 'dom-to-image-more';
import { jsPDF } from 'jspdf';
import styles from './OrderHistoryPage.module.css';

// =====================================
// קבועים
// =====================================

// תרגום סטטוסים לעברית
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'ממתין לאישור',
  confirmed: 'אושר',
  processing: 'בהכנה',
  shipped: 'נשלח',
  delivered: 'נמסר',
  cancelled: 'בוטל',
  refunded: 'הוחזר'
};

// צבעי סטטוס
const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
  refunded: 'neutral'
};

// =====================================
// קומפוננטה ראשית
// =====================================

const OrderHistoryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  
  // Redux - בדיקת אימות
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // פילטרים
  const [filters, setFilters] = useState<OrdersFilterParams>({
    status: searchParams.get('status') || '',
    page: 1,
    limit: 10
  });
  
  // מודאל פרטי הזמנה
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // מודאל ביטול
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // ==========================================================================
  // שליפת הזמנות
  // ==========================================================================
  
  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await getUserOrders(filters);
      
      if (response.success) {
        setOrders(response.data);
        setPagination(response.pagination);
      } else {
        setError('שגיאה בטעינת ההזמנות');
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'שגיאה בטעינת ההזמנות');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, filters]);

  // טעינה ראשונית וכשהפילטרים משתנים
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // הפניה להתחברות אם לא מחובר
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/orders');
    }
  }, [isAuthenticated, navigate]);

  // ==========================================================================
  // פונקציות עזר
  // ==========================================================================

  // פורמט תאריך
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // פורמט מחיר
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // בדיקה האם ניתן לבטל הזמנה
  const canCancel = (order: Order): boolean => {
    return ['pending', 'confirmed'].includes(order.status);
  };

  // ==========================================================================
  // Handlers
  // ==========================================================================

  // שינוי פילטר סטטוס
  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  // שינוי עמוד
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // פתיחת מודאל פרטי הזמנה
  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // סגירת מודאל
  const handleCloseModal = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };

  // פונקציה להדפסת ההזמנה
  const handlePrint = async () => {
    if (!modalRef.current || !selectedOrder) return;

    try {
      // הסתרת אלמנטים שלא צריכים להיות בהדפסה
      const noPrintElements = modalRef.current.querySelectorAll('.no-print');
      noPrintElements.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });

      // שמירת overflow המקורי
      const originalOverflow = modalRef.current.style.overflow;
      modalRef.current.style.overflow = 'visible';

      // המרה לתמונה
      const dataUrl = await domtoimage.toPng(modalRef.current, {
        quality: 0.95,
        bgcolor: '#ffffff',
      });

      // החזרת overflow המקורי
      modalRef.current.style.overflow = originalOverflow;

      // החזרת אלמנטים מוסתרים
      noPrintElements.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });

      // פתיחת חלון הדפסה חדש
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('אנא אפשר חלונות קופצים כדי להדפיס');
        return;
      }

      printWindow.document.write(`
        <html>
        <head>
          <title>הזמנה ${selectedOrder.orderNumber}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
            }
            @media print {
              body {
                margin: 0;
              }
              img {
                max-width: 100%;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="הזמנה ${selectedOrder.orderNumber}" />
        </body>
        </html>
      `);
      printWindow.document.close();

      // המתנה לטעינת התמונה ופתיחת חלון ההדפסה
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          
          // מנגנון סגירה משולב לאמינות מקסימלית
          let isClosed = false;
          
          const closeWindow = () => {
            if (!isClosed) {
              isClosed = true;
              try {
                printWindow.close();
              } catch (e) {
                // אם נכשל - ננסה שוב אחרי רגע
                setTimeout(() => printWindow.close(), 100);
              }
            }
          };
          
          // אסטרטגיה 1: onafterprint (תומך ברוב הדפדפנים המודרניים)
          printWindow.onafterprint = closeWindow;
          
          // אסטרטגיה 2: focus event - כשהחלון מקבל פוקוס חזרה אחרי ההדפסה
          printWindow.onblur = () => {
            setTimeout(closeWindow, 500);
          };
          
          // אסטרטגיה 3: fallback timeout למקרה שהאירועים האחרים לא עבדו
          setTimeout(closeWindow, 3000);
          
        }, 250);
      };
    } catch (err) {
      console.error('Error printing order:', err);
      alert('שגיאה בהדפסת ההזמנה');
    }
  };

  // פונקציה לשמירת ההזמנה כ-PDF
  const handleExportPdf = async () => {
    if (!modalRef.current || !selectedOrder) return;

    try {
      // הסתרת אלמנטים שלא צריכים להיות ב-PDF
      const noPrintElements = modalRef.current.querySelectorAll('.no-print');
      noPrintElements.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });

      // שמירת overflow המקורי
      const originalOverflow = modalRef.current.style.overflow;
      modalRef.current.style.overflow = 'visible';

      // המרה לתמונה
      const dataUrl = await domtoimage.toPng(modalRef.current, {
        quality: 0.95,
        bgcolor: '#ffffff',
      });

      // החזרת overflow המקורי
      modalRef.current.style.overflow = originalOverflow;

      // החזרת אלמנטים מוסתרים
      noPrintElements.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });

      // יצירת PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // חישוב גודל התמונה ב-PDF
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (modalRef.current.offsetHeight * imgWidth) / modalRef.current.offsetWidth;

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`הזמנה-${selectedOrder.orderNumber}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('שגיאה בשמירת PDF');
    }
  };

  // פתיחת מודאל ביטול
  const handleOpenCancelModal = (orderId: string) => {
    setCancellingOrderId(orderId);
    setCancelReason('');
  };

  // סגירת מודאל ביטול
  const handleCloseCancelModal = () => {
    setCancellingOrderId(null);
    setCancelReason('');
  };

  // ביטול הזמנה
  const handleCancelOrder = async () => {
    if (!cancellingOrderId) return;
    
    try {
      setIsCancelling(true);
      const response = await cancelOrder(cancellingOrderId, cancelReason || undefined);
      
      if (response.success) {
        // עדכון הרשימה המקומית
        setOrders(prev => 
          prev.map(o => o._id === cancellingOrderId 
            ? { ...o, status: 'cancelled' as OrderStatus } 
            : o
          )
        );
        handleCloseCancelModal();
      }
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      showToast('error', err.message || 'שגיאה בביטול ההזמנה');
    } finally {
      setIsCancelling(false);
    }
  };

  // ==========================================================================
  // רנדור
  // ==========================================================================

  // מצב טעינה
  if (loading && orders.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>טוען הזמנות...</p>
        </div>
      </div>
    );
  }

  // מצב שגיאה
  if (error && orders.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorIcon}><Icon name="XCircle" size={48} /></div>
          <h2>אירעה שגיאה</h2>
          <p>{error}</p>
          <Button variant="primary" onClick={fetchOrders}>
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* כותרת */}
      <div className={styles.header}>
        <h1 className={styles.title}>ההזמנות שלי</h1>
        <p className={styles.subtitle}>
          צפייה בכל ההזמנות שביצעת
        </p>
      </div>

      {/* פילטרים */}
      <div className={styles.filters}>
        <div className={styles.statusFilters}>
          <Button
            variant="ghost"
            size="sm"
            className={`${styles.filterBtn} ${!filters.status ? styles.active : ''}`}
            onClick={() => handleStatusFilter('')}
          >
            הכל
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`${styles.filterBtn} ${filters.status === 'pending' ? styles.active : ''}`}
            onClick={() => handleStatusFilter('pending')}
          >
            ממתינות
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`${styles.filterBtn} ${filters.status === 'processing' ? styles.active : ''}`}
            onClick={() => handleStatusFilter('processing')}
          >
            בהכנה
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`${styles.filterBtn} ${filters.status === 'shipped' ? styles.active : ''}`}
            onClick={() => handleStatusFilter('shipped')}
          >
            נשלחו
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`${styles.filterBtn} ${filters.status === 'delivered' ? styles.active : ''}`}
            onClick={() => handleStatusFilter('delivered')}
          >
            הושלמו
          </Button>
        </div>

        <span className={styles.totalCount}>
          {pagination.total} הזמנות
        </span>
      </div>

      {/* רשימת הזמנות */}
      {orders.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><Icon name="Package" size={48} /></div>
          <h2>אין הזמנות</h2>
          <p>
            {filters.status 
              ? 'לא נמצאו הזמנות בסטטוס זה'
              : 'עדיין לא ביצעת הזמנות'
            }
          </p>
          <Button variant="primary" onClick={() => navigate('/products')}>
            התחל לקנות
          </Button>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {orders.map((order) => (
            <div key={order._id} className={styles.orderCard}>
              {/* כותרת הזמנה */}
              <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                  <h3 className={styles.orderNumber}>
                    הזמנה #{order.orderNumber}
                  </h3>
                  <span className={styles.orderDate}>
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <div className={`${styles.statusBadge} ${styles[`status_${STATUS_COLORS[order.status]}`]}`}>
                  {STATUS_LABELS[order.status]}
                </div>
              </div>

              {/* פריטים */}
              <div className={styles.orderItems}>
                {order.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className={styles.itemPreview}>
                    <div className={styles.itemImage}>
                      <img 
                        src={item.imageUrl || '/placeholder.png'} 
                        alt={item.productName}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                      {item.quantity > 1 && (
                        <span className={styles.itemQty}>{item.quantity}</span>
                      )}
                    </div>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className={styles.moreItems}>
                    +{order.items.length - 3}
                  </div>
                )}
              </div>

              {/* סיכום */}
              <div className={styles.orderSummary}>
                <div className={styles.summaryInfo}>
                  <span className={styles.itemsCount}>
                    {order.items.reduce((sum, i) => sum + i.quantity, 0)} פריטים
                  </span>
                  <span className={styles.totalPrice}>
                    {formatCurrency(order.total)}
                  </span>
                </div>

                {/* כפתורי פעולה */}
                <div className={styles.orderActions}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewOrder(order)}
                  >
                    צפה בפרטים
                  </Button>
                  {canCancel(order) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenCancelModal(order._id)}
                      className={styles.cancelBtn}
                    >
                      בטל הזמנה
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="ghost"
            className={styles.pageBtn}
            disabled={pagination.page <= 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            הקודם
          </Button>
          
          <span className={styles.pageInfo}>
            עמוד {pagination.page} מתוך {pagination.pages}
          </span>
          
          <Button
            variant="ghost"
            className={styles.pageBtn}
            disabled={pagination.page >= pagination.pages}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            הבא
          </Button>
        </div>
      )}

      {/* מודאל פרטי הזמנה */}
      {selectedOrder && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={`הזמנה #${selectedOrder.orderNumber}`}
          size="large"
        >
          <div ref={modalRef} className={styles.orderDetailModal}>
            {/* כותרת עם סטטוס */}
            <div className={styles.modalHeader}>
              <div className={styles.modalOrderInfo}>
                <span className={styles.modalDate}>
                  {formatDate(selectedOrder.createdAt)}
                </span>
                <div className={`${styles.statusBadge} ${styles[`status_${STATUS_COLORS[selectedOrder.status]}`]}`}>
                  {STATUS_LABELS[selectedOrder.status]}
                </div>
              </div>
            </div>

            {/* פריטי ההזמנה */}
            <div className={styles.modalSection}>
              <h4 className={styles.sectionTitle}>פריטים בהזמנה</h4>
              <div className={styles.modalItemsList}>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className={styles.modalItem}>
                    <div className={styles.modalItemImage}>
                      <img 
                        src={item.imageUrl || '/placeholder.png'} 
                        alt={item.productName}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                      <span className={styles.modalItemQty}>{item.quantity}</span>
                    </div>
                    <div className={styles.modalItemDetails}>
                      <h5 className={styles.modalItemName}>
                        {item.productName || (item as any).name}{item.skuName ? ` - ${item.skuName}` : ''}
                      </h5>
                      {item.sku && (
                        <span className={styles.modalItemSku}>
                          SKU: {item.sku}
                        </span>
                      )}
                      {item.attributes && Object.entries(item.attributes).map(([key, value]) => (
                        <span key={key} className={styles.modalItemAttr}>
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                    <span className={styles.modalItemPrice}>
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* כתובת משלוח */}
            <div className={styles.modalSection}>
              <h4 className={styles.sectionTitle}>כתובת למשלוח</h4>
              <div className={styles.addressBox}>
                <p>{selectedOrder.shippingAddress.fullName}</p>
                <p>{selectedOrder.shippingAddress.street}</p>
                <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.postalCode}</p>
                <p>טלפון: {selectedOrder.shippingAddress.phone}</p>
              </div>
            </div>

            {/* סיכום תשלום */}
            <div className={styles.modalSection}>
              <h4 className={styles.sectionTitle}>סיכום תשלום</h4>
              <div className={styles.paymentSummary}>
                <div className={styles.summaryRow}>
                  <span>סכום ביניים:</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {/* Phase 4.2: מע"מ כלול במחיר - מציגים רק אם יש ערך היסטורי */}
                {selectedOrder.tax > 0 && (
                  <div className={styles.summaryRow}>
                    <span>מע"מ:</span>
                    <span>{formatCurrency(selectedOrder.tax)}</span>
                  </div>
                )}
                <div className={styles.summaryRow}>
                  <span>משלוח:</span>
                  <span className={selectedOrder.shippingCost === 0 ? styles.freeShipping : ''}>
                    {selectedOrder.shippingCost === 0 ? 'חינם' : formatCurrency(selectedOrder.shippingCost)}
                  </span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className={`${styles.summaryRow} ${styles.discount}`}>
                    <span>הנחה:</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className={styles.summaryDivider} />
                <div className={`${styles.summaryRow} ${styles.total}`}>
                  <span>סה"כ:</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* סטטוס תשלום */}
            {selectedOrder.payment && (
              <div className={styles.modalSection}>
                <h4 className={styles.sectionTitle}>סטטוס תשלום</h4>
                <div className={`${styles.paymentStatus} ${styles[`payment_${selectedOrder.payment.status}`]}`}>
                  {selectedOrder.payment.status === 'completed' && <><Icon name="CheckCircle2" size={16} /> שולם</>}
                  {selectedOrder.payment.status === 'pending' && <><Icon name="Clock" size={16} /> ממתין לתשלום</>}
                  {selectedOrder.payment.status === 'failed' && <><Icon name="XCircle" size={16} /> תשלום נכשל</>}
                  {selectedOrder.payment.status === 'processing' && <><Icon name="Target" size={16} /> בעיבוד</>}
                  {selectedOrder.payment.status === 'refunded' && <><Icon name="Undo" size={16} /> הוחזר</>}
                  {selectedOrder.payment.status === 'cancelled' && <><Icon name="X" size={16} /> בוטל</>}
                </div>
              </div>
            )}

            {/* כפתורי פעולה */}
            <div className={styles.modalActions}>
              <div className={styles.actionGroup}>
                <Button 
                  variant="outline" 
                  onClick={handlePrint}
                  className="no-print"
                >
                  <Printer size={16} />
                  הדפס
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExportPdf}
                  className="no-print"
                >
                  <FileDown size={16} />
                  שמור PDF
                </Button>
              </div>
              <div className={styles.actionGroup}>
                <Button variant="outline" onClick={handleCloseModal} className="no-print">
                  סגור
                </Button>
                {canCancel(selectedOrder) && (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      handleCloseModal();
                      handleOpenCancelModal(selectedOrder._id);
                    }}
                    className={`${styles.cancelBtn} no-print`}
                  >
                    בטל הזמנה
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* מודאל ביטול הזמנה */}
      {cancellingOrderId && (
        <Modal
          isOpen={!!cancellingOrderId}
          onClose={handleCloseCancelModal}
          title="ביטול הזמנה"
          size="small"
        >
          <div className={styles.cancelModal}>
            <p className={styles.cancelWarning}>
              האם אתה בטוח שברצונך לבטל את ההזמנה?
              פעולה זו אינה ניתנת לביטול.
            </p>
            
            <div className={styles.cancelReasonField}>
              <label htmlFor="cancelReason">סיבת הביטול (אופציונלי):</label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="למה את/ה מבטל/ת את ההזמנה?"
                rows={3}
              />
            </div>

            <div className={styles.cancelActions}>
              <Button 
                variant="outline" 
                onClick={handleCloseCancelModal}
                disabled={isCancelling}
              >
                חזרה
              </Button>
              <Button 
                variant="primary" 
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className={styles.confirmCancelBtn}
              >
                {isCancelling ? 'מבטל...' : 'אשר ביטול'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrderHistoryPage;
