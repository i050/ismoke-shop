import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';
import { Icon } from '@ui';
import type { LowStockSku } from '@/services/skuReportService';
import styles from './LowStockModal.module.css';

interface LowStockModalProps {
  /** האם המודאל פתוח */
  isOpen: boolean;
  /** פונקציה לסגירת המודאל */
  onClose: () => void;
  /** רשימת SKUs במלאי נמוך */
  skus: LowStockSku[];
  /** האם בתהליך טעינה */
  isLoading?: boolean;
}

/**
 * מודאל להצגת מוצרים במלאי נמוך
 * מציג טבלה מפורטת עם שם מוצר, קוד SKU, כמות נוכחית
 */
const LowStockModal: React.FC<LowStockModalProps> = ({
  isOpen,
  onClose,
  skus,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  // פונקציה לניווט לדף ניהול מלאי
  const handleNavigateToInventory = () => {
    onClose(); // סוגרים את המודאל
    // מנווטים לדף ניהול המלאי החדש
    navigate('/admin/inventory');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="מוצרים במלאי נמוך"
      size="large"
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      <div className={styles.modalContent}>
        {/* כותרת משנה עם הסבר */}
        <div className={styles.description}>
          <Icon name="AlertTriangle" size={20} />
          <p>
            הרשימה הבאה מציגה מוצרים שהמלאי שלהם נמוך מהסף המוגדר. 
            מומלץ להזמין מלאי נוסף בהקדם.
          </p>
        </div>

        {/* אזור הטבלה */}
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>טוען נתוני מלאי...</p>
          </div>
        ) : skus.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon name="CheckCircle2" size={48} />
            <h3>אין מוצרים במלאי נמוך</h3>
            <p>כל המוצרים במלאי תקין 👍</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.iconCell}>
                    <Icon name="AlertCircle" size={16} />
                  </th>
                  <th>קוד SKU</th>
                  <th>שם המוצר</th>
                  <th className={styles.quantityCell}>כמות במלאי</th>
                  <th className={styles.statusCell}>סטטוס</th>
                  <th className={styles.actionsCell}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {skus.map((sku) => {
                  // הסף האפקטיבי מהשרת (או ברירת מחדל 5)
                  const threshold = sku.lowStockThreshold ?? 5;
                  // חישוב רמת הדחיפות לפי הכמות ביחס לסף
                  const urgency = sku.stockQuantity === 0 
                    ? 'critical' 
                    : sku.stockQuantity <= threshold * 0.4 
                    ? 'high' 
                    : 'medium';

                  // שם המוצר - מנסה לקבל מהמוצר המקושר או מה-SKU עצמו
                  const productName = 
                    typeof sku.productId === 'object' && sku.productId?.name
                      ? sku.productId.name
                      : sku.name || 'ללא שם';

                  return (
                    <tr key={sku._id} className={styles[`row-${urgency}`]}>
                      <td className={styles.iconCell}>
                        <span className={styles[`urgencyIcon-${urgency}`]}>
                          {urgency === 'critical' ? '🔴' : urgency === 'high' ? '🟠' : '🟡'}
                        </span>
                      </td>
                      <td className={styles.skuCode}>
                        <code>{sku.sku}</code>
                      </td>
                      <td className={styles.productName}>
                        <span className={styles.name}>{productName}</span>
                      </td>
                      <td className={styles.quantityCell}>
                        <span className={styles[`quantity-${urgency}`]}>
                          {sku.stockQuantity} יחידות
                        </span>
                      </td>
                      <td className={styles.statusCell}>
                        <span className={styles[`badge-${urgency}`]}>
                          {urgency === 'critical' 
                            ? 'אזל מלאי' 
                            : urgency === 'high' 
                            ? 'דחוף' 
                            : 'מלאי נמוך'}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          className={styles.updateStockBtn}
                          onClick={() => {
                            onClose();
                            navigate('/admin/inventory', {
                              state: {
                                highlightSku: sku.sku,
                                highlightUrgency: urgency,
                              },
                            });
                          }}
                        >
                          <Icon name="Package" size={14} />
                          עדכן מלאי
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* כפתורי פעולה בתחתית */}
        <div className={styles.footer}>
          <button 
            className={styles.closeButton}
            onClick={onClose}
          >
            סגור
          </button>
          {skus.length > 0 && (
            <button 
              className={styles.actionButton}
              onClick={handleNavigateToInventory}
            >
              <Icon name="Package" size={16} />
              עבור לניהול מלאי
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default LowStockModal;
