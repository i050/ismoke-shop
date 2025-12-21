import React, { useState, useCallback } from 'react';
import { Button, Modal, Input, Icon } from '../../../ui';
import { createStockAlert, checkExistingAlert } from '../../../../services/stockAlertService';
import styles from './StockAlertButton.module.css';

/**
 * Props עבור כפתור התראת מלאי
 */
interface StockAlertButtonProps {
  productId: string;           // מזהה המוצר
  productName: string;         // שם המוצר - להצגה במודל
  skuCode?: string;            // קוד SKU (אופציונלי) - להתראה על וריאנט ספציפי
  sku?: string;                // קוד SKU (alias) - להתראה על וריאנט ספציפי
  userEmail?: string;          // אימייל המשתמש אם מחובר
  variant?: 'button' | 'link' | 'minimal'; // סוג התצוגה: כפתור, קישור או מינימלי (לעגלה)
  className?: string;          // קלאס נוסף לעיצוב
}

/**
 * StockAlertButton - רכיב כפתור "עדכן אותי כשחוזר למלאי"
 * 
 * מציג כפתור שבלחיצה פותח מודל להרשמה להתראה.
 * כולל:
 * - טופס הרשמה עם שדה אימייל
 * - ולידציה של אימייל
 * - בדיקה אם כבר קיימת התראה
 * - הודעת הצלחה לאחר ההרשמה
 */
const StockAlertButton: React.FC<StockAlertButtonProps> = ({
  productId,
  productName,
  skuCode,
  sku,
  userEmail = '',
  variant = 'button',
  className = '',
}) => {
  // תמיכה ב-sku כ-alias ל-skuCode
  const effectiveSkuCode = skuCode || sku;
  // ========================================
  // State - ניהול מצב הקומפוננטה
  // ========================================
  
  // האם המודל פתוח
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // כתובת האימייל בטופס
  const [email, setEmail] = useState(userEmail);
  
  // האם בתהליך שליחה
  const [isLoading, setIsLoading] = useState(false);
  
  // הודעת שגיאה לתצוגה
  const [error, setError] = useState<string | null>(null);
  
  // האם ההרשמה הצליחה
  const [isSuccess, setIsSuccess] = useState(false);
  
  // האם כבר נרשם להתראה
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  // ========================================
  // Handlers - פונקציות טיפול באירועים
  // ========================================

  /**
   * פתיחת המודל ובדיקת התראה קיימת
   * @param e - אירוע הקליק (אופציונלי) - חשוב לעצור propagation כשהכפתור בתוך Link
   */
  const handleOpenModal = useCallback(async (e?: React.MouseEvent) => {
    // מניעת ניווט כשהכפתור נמצא בתוך Link (למשל ב-ProductCard)
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsModalOpen(true);
    setError(null);
    setIsSuccess(false);
    setAlreadySubscribed(false);
    
    // אם יש אימייל - בדוק אם כבר נרשם
    if (email) {
      try {
        const hasAlert = await checkExistingAlert(productId, email, effectiveSkuCode);
        if (hasAlert) {
          setAlreadySubscribed(true);
        }
      } catch {
        // שגיאה בבדיקה - לא קריטי, נמשיך
        console.warn('Failed to check existing alert');
      }
    }
  }, [email, productId, effectiveSkuCode]);

  /**
   * סגירת המודל ואיפוס מצב
   */
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // איפוס מצב רק אחרי סגירה
    setTimeout(() => {
      setError(null);
      setIsSuccess(false);
      setAlreadySubscribed(false);
      // לא מאפסים את האימייל - נשמור אותו לנוחות
    }, 300);
  }, []);

  /**
   * ולידציה של כתובת אימייל
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * שליחת טופס ההרשמה
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // מניעת bubbling ל-Link הורה
    setError(null);

    // ולידציה
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('נא להזין כתובת אימייל');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('כתובת האימייל אינה תקינה');
      return;
    }

    setIsLoading(true);

    try {
      // בדיקה אם כבר נרשם (למקרה שלא בדקנו קודם)
      const hasAlert = await checkExistingAlert(productId, trimmedEmail, effectiveSkuCode);
      if (hasAlert) {
        setAlreadySubscribed(true);
        setIsLoading(false);
        return;
      }

      // יצירת ההתראה
      const result = await createStockAlert({
        productId,
        email: trimmedEmail,
        skuCode: effectiveSkuCode,
        productName,
      });

      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.message || 'אירעה שגיאה, נסה שוב');
      }
    } catch (err) {
      console.error('Error creating stock alert:', err);
      setError('אירעה שגיאה בשליחת הבקשה');
    } finally {
      setIsLoading(false);
    }
  }, [email, productId, productName, effectiveSkuCode]);

  /**
   * טיפול בשינוי בשדה האימייל
   */
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null); // ניקוי שגיאה בעת הקלדה
    setAlreadySubscribed(false); // ניקוי הודעת "כבר נרשם" בעת שינוי
  }, []);

  // ========================================
  // Render - תצוגת הקומפוננטה
  // ========================================

  return (
    <div className={`${styles.container} ${variant === 'minimal' ? styles.containerMinimal : ''} ${className}`}>
      {/* תווית "אזל מהמלאי" - רק בגרסאות button ו-link */}
      {variant !== 'minimal' && (
        <span className={styles.outOfStockLabel}>
          אזל מהמלאי
        </span>
      )}

      {/* כפתור/קישור לפתיחת המודל */}
      {variant === 'button' ? (
        <Button
          variant="outline"
          size="md"
          onClick={handleOpenModal}
          icon={<Icon name="Bell" size={18} />}
          className={styles.alertButton}
        >
          עדכן אותי כשיחזור
        </Button>
      ) : variant === 'minimal' ? (
        /* גרסה מינימלית לשימוש בעגלה */
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleOpenModal}
          className={styles.alertButtonMinimal}
        >
          <Icon name="Bell" size={14} />
          <span>עדכנו אותי כשיחזור</span>
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleOpenModal}
          className={styles.alertLink}
        >
          <Icon name="Bell" size={16} />
          <span>עדכן אותי כשיחזור</span>
        </Button>
      )}
      

      {/* מודל ההרשמה */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="התראה על חזרה למלאי"
        size="small"
      >
        <div className={styles.modalContent}>
          {/* הודעת הצלחה */}
          {isSuccess ? (
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>
                <Icon name="CheckCircle2" size={48} />
              </div>
              <h3 className={styles.successTitle}>נרשמת בהצלחה!</h3>
              <p className={styles.successText}>
                נשלח לך אימייל ברגע ש<strong>{productName}</strong> יחזור למלאי.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={handleCloseModal}
                className={styles.closeButton}
              >
                סגור
              </Button>
            </div>
          ) : alreadySubscribed ? (
            /* הודעה על התראה קיימת */
            <div className={styles.alreadySubscribedMessage}>
              <div className={styles.infoIcon}>
                <Icon name="Bell" size={48} />
              </div>
              <h3 className={styles.infoTitle}>כבר נרשמת להתראה</h3>
              <p className={styles.infoText}>
                האימייל <strong>{email}</strong> כבר רשום לקבלת התראה עבור מוצר זה.
              </p>
              <Button
                variant="outline"
                size="md"
                onClick={handleCloseModal}
                className={styles.closeButton}
              >
                הבנתי
              </Button>
            </div>
          ) : (
            /* טופס הרשמה */
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* תיאור */}
              <p className={styles.formDescription}>
                השאר את האימייל שלך ונודיע לך ברגע שהמוצר{' '}
                <strong>{productName}</strong> יחזור למלאי.
              </p>

              {/* שדה אימייל */}
              <div className={styles.inputWrapper}>
                <Input
                  type="email"
                  placeholder="הזן כתובת אימייל"
                  value={email}
                  onChange={handleEmailChange}
                  error={!!error}
                  helperText={error || undefined}
                  required
                  size="large"
                  label="כתובת אימייל"
                />
              </div>

              {/* כפתורי פעולה */}
              <div className={styles.formActions}>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isLoading}
                  disabled={isLoading || !email.trim()}
                  fullWidth
                >
                  {isLoading ? 'שולח...' : 'עדכן אותי'}
                </Button>
              </div>

              {/* הערת פרטיות */}
              <p className={styles.privacyNote}>
                <Icon name="Shield" size={14} />
                <span>האימייל שלך ישמש רק להתראה זו ולא ישותף עם צד שלישי.</span>
              </p>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default StockAlertButton;
