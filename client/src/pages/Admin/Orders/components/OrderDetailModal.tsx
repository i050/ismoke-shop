/**
 * מודל פרטי הזמנה - Order Detail Modal
 * Phase 5.2 מתוך ORDERS_SYSTEM_IMPLEMENTATION_PLAN.md
 * 
 * מציג את כל פרטי ההזמנה כולל:
 * - פרטי לקוח וכתובת משלוח
 * - רשימת פריטים
 * - היסטוריית סטטוסים
 * - אפשרות לעדכן סטטוס
 * - פרטי משלוח אופציונליים כשמשנים ל"נשלח"
 * 
 * @module pages/Admin/Orders/components/OrderDetailModal
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  Clock,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertCircle,
  FileText,
  History,
  Printer,
  FileDown
} from 'lucide-react';
import domtoimage from 'dom-to-image-more';
import { jsPDF } from 'jspdf';
import { Button, Input } from '../../../../components/ui';
import type { Order, OrderStatus, ShippingDetails } from '../../../../services/orderService';
import styles from './OrderDetailModal.module.css';

// ============================================================================
// Types
// ============================================================================

interface OrderDetailModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (status: OrderStatus, shippingDetails?: ShippingDetails) => void;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_OPTIONS: { value: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'pending', label: 'ממתין', icon: <Clock size={14} /> },
  { value: 'confirmed', label: 'אושר', icon: <CheckCircle2 size={14} /> },
  { value: 'processing', label: 'בעיבוד', icon: <Package size={14} /> },
  { value: 'shipped', label: 'נשלח', icon: <Truck size={14} /> },
  { value: 'delivered', label: 'נמסר', icon: <CheckCircle2 size={14} /> },
  { value: 'cancelled', label: 'בוטל', icon: <X size={14} /> },
  { value: 'refunded', label: 'הוחזר', icon: <AlertCircle size={14} /> },
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

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין לתשלום',
  processing: 'בעיבוד',
  completed: 'שולם',
  failed: 'נכשל',
  refunded: 'הוחזר',
  cancelled: 'בוטל',
};

// ============================================================================
// Component
// ============================================================================

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onStatusUpdate,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>(order.status);
  const [updating, setUpdating] = useState(false);
  
  // פרטי משלוח אופציונליים - מוצגים רק כשבוחרים "נשלח"
  const [shippingCarrier, setShippingCarrier] = useState(order.shippingCarrier || '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [courierPhone, setCourierPhone] = useState(order.courierPhone || '');
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState<string>(
    order.estimatedDeliveryDays?.toString() || ''
  );
  const [shippingNotes, setShippingNotes] = useState(order.shippingNotes || '');

  // איפוס פרטי משלוח כשמשתנה ההזמנה
  useEffect(() => {
    setSelectedStatus(order.status);
    setShippingCarrier(order.shippingCarrier || '');
    setTrackingNumber(order.trackingNumber || '');
    setCourierPhone(order.courierPhone || '');
    setEstimatedDeliveryDays(order.estimatedDeliveryDays?.toString() || '');
    setShippingNotes(order.shippingNotes || '');
  }, [order]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  /**
   * הדפסת ההזמנה - פותח חלון הדפסה
   * CSS של @media print מסתיר את החלקים שלא רלוונטיים
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * שמירת ההזמנה כ-PDF
   * צולם את המודאל כולו (בלי אלמנטי עדכון) ושומר כ-PDF
   * מטפל בגלילה על ידי שינוי זמני של overflow לפני הצילום
   */
  const handleExportPdf = async () => {
    try {
      const modalElement = document.querySelector(`.${styles.modal}`) as HTMLElement;
      const contentElement = modalElement?.querySelector(`.${styles.content}`) as HTMLElement;
      
      if (!modalElement || !contentElement) {
        alert('לא נמצא אלמנט המודאל');
        return;
      }

      // שמירת הסגנונות המקוריים לפני השינוי
      const originalModalMaxHeight = modalElement.style.maxHeight;
      const originalModalOverflow = modalElement.style.overflow;
      const originalContentMaxHeight = contentElement.style.maxHeight;
      const originalContentOverflow = contentElement.style.overflow;

      // הסתרת אלמנטים שלא צריכים להיות ב-PDF
      const noPrintElements = modalElement.querySelectorAll('.no-print');
      noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');

      // שינוי זמני - הצגת כל התוכן בלי גלילה לצורך הצילום
      modalElement.style.maxHeight = 'none';
      modalElement.style.overflow = 'visible';
      contentElement.style.maxHeight = 'none';
      contentElement.style.overflow = 'visible';

      // המתנה קצרה לעיבוד ה-DOM אחרי השינויים
      await new Promise(resolve => setTimeout(resolve, 200));

      // צילום המודאל המלא
      // @ts-ignore - dom-to-image-more doesn't have TypeScript definitions
      const dataUrl = await domtoimage.toPng(modalElement, {
        quality: 0.95,
        bgcolor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top right'
        }
      });

      // החזרת הסגנונות המקוריים
      modalElement.style.maxHeight = originalModalMaxHeight;
      modalElement.style.overflow = originalModalOverflow;
      contentElement.style.maxHeight = originalContentMaxHeight;
      contentElement.style.overflow = originalContentOverflow;

      // החזרת האלמנטים המוסתרים
      noPrintElements.forEach(el => (el as HTMLElement).style.display = '');

      // יצירת PDF עם שמירה על aspect ratio מדויק
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210; // רוחב A4 במ"מ
      const pdfHeight = 297; // גובה A4 במ"מ
      const margin = 10; // שוליים סביב התוכן
      
      // שטח זמין בתוך השוליים
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      // חישוב יחס רוחב-גובה המדויק של התמונה
      const imageAspectRatio = modalElement.offsetWidth / modalElement.scrollHeight;
      
      // חישוב גודל התמונה כך שתיכנס בשטח הזמין תוך שמירה על aspect ratio
      let imgWidth = availableWidth;
      let imgHeight = imgWidth / imageAspectRatio;
      
      // אם התמונה יוצאת מהגובה הזמין, נכווץ לפי גובה
      if (imgHeight > availableHeight) {
        imgHeight = availableHeight;
        imgWidth = imgHeight * imageAspectRatio;
      }
      
      // מרכוז התמונה בדף (אופקית ואנכית)
      const xPosition = (pdfWidth - imgWidth) / 2;
      const yPosition = (pdfHeight - imgHeight) / 2;
      
      // הוספת התמונה ל-PDF
      pdf.addImage(dataUrl, 'PNG', xPosition, yPosition, imgWidth, imgHeight);

      pdf.save(`order-${order.orderNumber}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('שגיאה ביצירת PDF');
    }
  };

  const handleStatusChange = async () => {
    // שולח פרטי משלוח גם כשההזמנה כבר shipped או delivered
    const shouldIncludeShipping = selectedStatus === 'shipped' || order.status === 'shipped' || order.status === 'delivered';
    
    console.log('=== SHIPPING DETAILS DEBUG ===');
    console.log('shippingCarrier input:', shippingCarrier);
    console.log('trackingNumber input:', trackingNumber);
    console.log('courierPhone input:', courierPhone);
    console.log('estimatedDeliveryDays input:', estimatedDeliveryDays);
    console.log('shippingNotes input:', shippingNotes);
    console.log('shouldIncludeShipping:', shouldIncludeShipping);
    
    const shippingDetails: ShippingDetails | undefined = 
      shouldIncludeShipping ? {
        shippingCarrier: shippingCarrier.trim(),
        trackingNumber: trackingNumber.trim(),
        courierPhone: courierPhone.trim(),
        estimatedDeliveryDays: estimatedDeliveryDays ? parseInt(estimatedDeliveryDays, 10) : undefined,
        shippingNotes: shippingNotes.trim()
      } : undefined;

    console.log('shippingDetails object:', shippingDetails);

    const originalShippingCarrier = (order.shippingCarrier || '').trim();
    const originalTrackingNumber = (order.trackingNumber || '').trim();
    const originalCourierPhone = (order.courierPhone || '').trim();

    const newShippingCarrier = (shippingDetails?.shippingCarrier || '').trim();
    const newTrackingNumber = (shippingDetails?.trackingNumber || '').trim();
    const newCourierPhone = (shippingDetails?.courierPhone || '').trim();

    const shippingChanged = (newShippingCarrier && newShippingCarrier !== originalShippingCarrier) ||
                            (newTrackingNumber && newTrackingNumber !== originalTrackingNumber) ||
                            (newCourierPhone && newCourierPhone !== originalCourierPhone);

    console.log('shippingChanged:', shippingChanged);
    console.log('selectedStatus:', selectedStatus, 'order.status:', order.status);

    if (selectedStatus === order.status && !shippingChanged) {
      console.log('Early return - no changes detected');
      return;
    }
    
    setUpdating(true);
    try {
      console.log('Calling onStatusUpdate with:', { selectedStatus, shippingDetails });
      await onStatusUpdate(selectedStatus, shippingDetails);
    } finally {
      setUpdating(false);
    }
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

  // חישוב טקסט הכפתור בהתאם למצב
  const getButtonText = (): string => {
    if (updating) return 'מעדכן...';
    
    // אם יש שינוי סטטוס - הצג "עדכן ל..."
    if (selectedStatus !== order.status) {
      const statusLabel = STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label || selectedStatus;
      return `עדכן ל${statusLabel}`;
    }
    
    // אם ההזמנה כבר shipped/delivered - ניתן לעדכן פרטי משלוח
    if (order.status === 'shipped' || order.status === 'delivered') {
      return 'עדכן פרטי משלוח';
    }
    
    return 'עדכן סטטוס';
  };

  // בדיקה האם הכפתור צריך להיות disabled
  const isButtonDisabled = (): boolean => {
    if (updating) return true;
    
    // אם יש שינוי סטטוס - לא disabled
    if (selectedStatus !== order.status) return false;
    
    // אם ההזמנה shipped/delivered - נבדוק אם יש שינוי בפרטי משלוח
    if (order.status === 'shipped' || order.status === 'delivered') {
      const originalShippingCarrier = (order.shippingCarrier || '').trim();
      const originalTrackingNumber = (order.trackingNumber || '').trim();
      const originalCourierPhone = (order.courierPhone || '').trim();
      const originalEstimatedDeliveryDays = order.estimatedDeliveryDays?.toString() || '';
      const originalShippingNotes = (order.shippingNotes || '').trim();

      const hasShippingChanges = 
        shippingCarrier.trim() !== originalShippingCarrier ||
        trackingNumber.trim() !== originalTrackingNumber ||
        courierPhone.trim() !== originalCourierPhone ||
        estimatedDeliveryDays !== originalEstimatedDeliveryDays ||
        shippingNotes.trim() !== originalShippingNotes;
      
      return !hasShippingChanges;
    }
    
    // בכל מצב אחר - disabled
    return true;
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h2 className={styles.title}>
              <FileText size={24} />
              הזמנה {order.orderNumber}
            </h2>
            <span className={styles.date}>
              <Clock size={14} />
              {formatDate(order.createdAt)}
            </span>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="סגור" title="סגור">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Status Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Package size={18} />
              סטטוס הזמנה
            </h3>
            <div className={styles.statusSection}>
              <div className={styles.currentStatus}>
                <span className={`${styles.badge} ${styles[`badge${STATUS_COLORS[order.status]}`]}`}>
                  {STATUS_OPTIONS.find(s => s.value === order.status)?.icon}
                  {STATUS_OPTIONS.find(s => s.value === order.status)?.label}
                </span>
                <span 
                  className={`${styles.badge} ${
                    order.payment?.status === 'completed' ? styles.badgesuccess : 
                    order.payment?.status === 'failed' ? styles.badgedanger : styles.badgewarning
                  }`}
                >
                  <CreditCard size={14} />
                  {PAYMENT_STATUS_LABELS[order.payment?.status || 'pending'] || order.payment?.status}
                </span>
              </div>
              
              <div className={`${styles.statusUpdate} no-print`}>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                  className={`${styles.statusSelect} no-print`}
                  aria-label="בחר סטטוס"
                  title="בחר סטטוס להזמנה"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* שדות פרטי משלוח - מוצגים כשבוחרים "נשלח" או כשההזמנה כבר נשלחה/הגיעה */}
              {(selectedStatus === 'shipped' || order.status === 'shipped' || order.status === 'delivered') && (
                <div className={`${styles.shippingFields} no-print`}>
                  <h4 className={styles.shippingFieldsTitle}>
                    <Truck size={16} />
                    פרטי משלוח (אופציונלי)
                  </h4>
                  <p className={styles.shippingFieldsNote}>
                    השדות הבאים יופיעו במייל ללקוח אם ימולאו
                  </p>
                  <div className={styles.shippingFieldsGrid}>
                    <div className={styles.fieldGroup}>
                      <label htmlFor="shippingCarrier">חברת משלוחים</label>
                      <Input
                        id="shippingCarrier"
                        placeholder="לדוגמה: דואר ישראל"
                        value={shippingCarrier}
                        onChange={(e) => setShippingCarrier(e.target.value)}
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label htmlFor="trackingNumber">מספר מעקב</label>
                      <Input
                        id="trackingNumber"
                        placeholder="מספר מעקב משלוח"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label htmlFor="courierPhone">טלפון שליח</label>
                      <Input
                        id="courierPhone"
                        placeholder="לדוגמה: 050-1234567"
                        value={courierPhone}
                        onChange={(e) => setCourierPhone(e.target.value)}
                        className={styles.ltrInput}
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label htmlFor="estimatedDeliveryDays">יגיע תוך (ימי עסקים)</label>
                      <Input
                        id="estimatedDeliveryDays"
                        type="number"
                        placeholder="לדוגמה: 3"
                        value={estimatedDeliveryDays}
                        onChange={(e) => setEstimatedDeliveryDays(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.fieldGroup} style={{ marginTop: 'var(--spacing-md)' }}>
                    <label htmlFor="shippingNotes">הערות למשלוח</label>
                    <textarea
                      id="shippingNotes"
                      placeholder="הערות שיופיעו במייל ללקוח..."
                      value={shippingNotes}
                      onChange={(e) => setShippingNotes(e.target.value)}
                      className={styles.textArea}
                      rows={3}
                    />
                  </div>
                </div>
              )}
              
              {/* כפתור עדכון - אחרי שדות המשלוח */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleStatusChange}
                disabled={isButtonDisabled()}
                className={`${styles.updateButton} no-print`}
              >
                {getButtonText()}
              </Button>
            </div>
          </section>

          <div className={styles.twoColumns}>
            {/* Customer & Shipping Info */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <User size={18} />
                פרטי לקוח ומשלוח
              </h3>
              <div className={styles.infoCard}>
                <div className={styles.infoRow}>
                  <User size={16} />
                  <span>{order.shippingAddress?.fullName}</span>
                </div>
                <div className={styles.infoRow}>
                  <Phone size={16} />
                  <span dir="ltr">{order.shippingAddress?.phone}</span>
                </div>
                {order.guestEmail && (
                  <div className={styles.infoRow}>
                    <Mail size={16} />
                    <span>{order.guestEmail}</span>
                  </div>
                )}
                <div className={styles.divider} />
                <div className={styles.infoRow}>
                  <MapPin size={16} />
                  <div className={styles.address}>
                    <span>{order.shippingAddress?.street}</span>
                    <span>{order.shippingAddress?.city} {order.shippingAddress?.postalCode}</span>
                    <span>{order.shippingAddress?.country}</span>
                  </div>
                </div>
                {order.shippingAddress?.notes && (
                  <div className={styles.notes}>
                    <strong>הערות:</strong> {order.shippingAddress.notes}
                  </div>
                )}
              </div>
            </section>

            {/* Order Summary */}
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <CreditCard size={18} />
                סיכום הזמנה
              </h3>
              <div className={styles.infoCard}>
                <div className={styles.summaryRow}>
                  <span>סכום ביניים:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>מע"ם:</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>משלוח:</span>
                  <span>{order.shippingCost === 0 ? 'חינם' : formatCurrency(order.shippingCost)}</span>
                </div>
                {order.discount > 0 && (
                  <div className={styles.summaryRow}>
                    <span>הנחה:</span>
                    <span className={styles.discount}>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className={styles.divider} />
                <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                  <span>סה"כ לתשלום:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </section>
          </div>

          {/* Order Items */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Package size={18} />
              פריטי הזמנה ({order.items?.length || 0})
            </h3>
            <div className={styles.itemsList}>
              {order.items?.map((item, index) => (
                <div key={index} className={styles.orderItem}>
                  <div className={styles.itemImage}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} />
                    ) : (
                      <Package size={32} />
                    )}
                  </div>
                  <div className={styles.itemDetails}>
                    <span className={styles.itemName}>{item.productName}</span>
                    {item.skuCode && <span className={styles.itemSku}>מק"ט: {item.skuCode}</span>}
                    {item.attributes && Object.keys(item.attributes).length > 0 && (
                      <div className={styles.itemAttributes}>
                        {item.attributes.color && (
                          <span className={styles.attribute}>צבע: {item.attributes.color}</span>
                        )}
                        {item.attributes.size && (
                          <span className={styles.attribute}>מידה: {item.attributes.size}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={styles.itemQuantity}>
                    x{item.quantity}
                  </div>
                  <div className={styles.itemPrice}>
                    {formatCurrency(item.price)}
                  </div>
                  <div className={styles.itemSubtotal}>
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Status History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <History size={18} />
                היסטוריית סטטוסים
              </h3>
              <div className={styles.timeline}>
                {order.statusHistory.map((entry, index) => (
                  <div key={index} className={styles.timelineItem}>
                    <div className={styles.timelineDot} />
                    <div className={styles.timelineContent}>
                      <span className={`${styles.badge} ${styles[`badge${STATUS_COLORS[entry.status]}`]}`}>
                        {STATUS_OPTIONS.find(s => s.value === entry.status)?.label || entry.status}
                      </span>
                      <span className={styles.timelineDate}>
                        {formatDate(entry.timestamp)}
                      </span>
                      {entry.note && (
                        <span className={styles.timelineNote}>{entry.note}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Admin Notes */}
          {order.internalNotes && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <FileText size={18} />
                הערות פנימיות
              </h3>
              <div className={styles.adminNotes}>
                {order.internalNotes}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerActions}>
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
          <Button variant="outline" onClick={onClose} className="no-print">
            סגור
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
