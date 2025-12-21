/**
 * OrderSuccessPage - עמוד אישור הזמנה
 * מוצג לאחר השלמת הזמנה מוצלחת
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderService, type Order } from '../../services/orderService';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import styles from './OrderSuccessPage.module.css';

const OrderSuccessPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  
  // מצבים
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // טעינת פרטי ההזמנה
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError('מזהה הזמנה חסר');
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await orderService.getOrderById(orderId);
        if (response.success) {
          setOrder(response.data);
        } else {
          setError('לא נמצאה הזמנה');
        }
      } catch (err: any) {
        console.error('שגיאה בטעינת ההזמנה:', err);
        setError(err.message || 'שגיאה בטעינת פרטי ההזמנה');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrder();
  }, [orderId]);
  
  // מצב טעינה
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>טוען פרטי הזמנה...</p>
        </div>
      </div>
    );
  }
  
  // מצב שגיאה
  if (error || !order) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorIcon}><Icon name="XCircle" size={48} /></div>
          <h2>אירעה שגיאה</h2>
          <p>{error || 'לא ניתן לטעון את פרטי ההזמנה'}</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            חזרה לדף הבית
          </Button>
        </div>
      </div>
    );
  }
  
  // פורמט תאריך
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className={styles.container}>
      {/* הודעת הצלחה */}
      <div className={styles.successBanner}>
        <div className={styles.successIcon}><Icon name="CheckCircle2" size={64} /></div>
        <h1 className={styles.successTitle}>ההזמנה התקבלה בהצלחה!</h1>
        <p className={styles.successSubtitle}>
          תודה על הרכישה. נשלח לך עדכון כשההזמנה תישלח.
        </p>
      </div>
      
      {/* כרטיס פרטי הזמנה */}
      <div className={styles.orderCard}>
        {/* כותרת */}
        <div className={styles.orderHeader}>
          <div className={styles.orderInfo}>
            <h2 className={styles.orderNumber}>הזמנה #{order.orderNumber}</h2>
            <span className={styles.orderDate}>{formatDate(order.createdAt)}</span>
          </div>
          <div className={`${styles.statusBadge} ${styles[`status_${order.status}`]}`}>
            {getStatusLabel(order.status)}
          </div>
        </div>
        
        {/* תוכן */}
        <div className={styles.orderContent}>
          {/* רשימת פריטים */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>פריטים בהזמנה</h3>
            <div className={styles.itemsList}>
              {order.items.map((item, index) => (
                <div key={index} className={styles.orderItem}>
                  <div className={styles.itemImage}>
                    <img src={item.imageUrl || '/placeholder.png'} alt={item.productName} />
                    <span className={styles.itemQuantity}>{item.quantity}</span>
                  </div>
                  <div className={styles.itemDetails}>
                    <h4 className={styles.itemName}>{item.productName}</h4>
                    {item.attributes && Object.entries(item.attributes).map(([key, value]) => (
                      <span key={key} className={styles.itemAttribute}>
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                  <span className={styles.itemPrice}>
                    ₪{item.subtotal.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* פרטי משלוח */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>כתובת למשלוח</h3>
            <div className={styles.addressBox}>
              <p>{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
              <p>טלפון: {order.shippingAddress.phone}</p>
            </div>
          </div>
          
          {/* סיכום תשלום */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>סיכום תשלום</h3>
            <div className={styles.paymentSummary}>
              <div className={styles.summaryRow}>
                <span>סכום ביניים:</span>
                <span>₪{order.subtotal.toFixed(2)}</span>
              </div>
              {/* Phase 4.2: מע"מ כלול במחיר - מציגים רק אם יש ערך היסטורי */}
              {order.tax > 0 && (
                <div className={styles.summaryRow}>
                  <span>מע"מ:</span>
                  <span>₪{order.tax.toFixed(2)}</span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span>משלוח:</span>
                <span className={order.shippingCost === 0 ? styles.freeShipping : ''}>
                  {order.shippingCost === 0 ? 'חינם' : `₪${order.shippingCost.toFixed(2)}`}
                </span>
              </div>
              {order.discount > 0 && (
                <div className={`${styles.summaryRow} ${styles.discount}`}>
                  <span>הנחה:</span>
                  <span>-₪{order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className={styles.summaryDivider} />
              <div className={`${styles.summaryRow} ${styles.total}`}>
                <span>סה"כ:</span>
                <span>₪{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* הערה */}
        {order.notes && (
          <div className={styles.orderNotes}>
            <h4>הערות:</h4>
            <p>{order.notes}</p>
          </div>
        )}
      </div>
      
      {/* פעולות */}
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate('/products')}
        >
          המשך לקנות
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate('/profile')}
        >
          לאזור האישי
        </Button>
      </div>
      
      {/* מידע נוסף */}
      <div className={styles.infoCards}>
        <div className={styles.infoCard}>
          <span className={styles.infoIcon}><Icon name="Mail" size={32} /></span>
          <h4>אישור במייל</h4>
          <p>שלחנו לך אישור הזמנה למייל</p>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoIcon}><Icon name="Package" size={32} /></span>
          <h4>מעקב משלוח</h4>
          <p>נעדכן אותך כשההזמנה תישלח</p>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoIcon}><Icon name="MessageCircle" size={32} /></span>
          <h4>יש שאלות?</h4>
          <p>צור קשר בכל עת</p>
        </div>
      </div>
    </div>
  );
};

// פונקציית עזר לתרגום סטטוס
function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    pending: 'ממתין לאישור',
    confirmed: 'אושר',
    processing: 'בהכנה',
    shipped: 'נשלח',
    delivered: 'נמסר',
    cancelled: 'בוטל',
    refunded: 'הוחזר'
  };
  return statusLabels[status] || status;
}

export default OrderSuccessPage;
