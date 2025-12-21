// ייבוא ספריות React הבסיסיות
import React, { useEffect } from 'react';
// ייבוא ReactDOM לצורך יצירת Portal
import ReactDOM from 'react-dom';
// ייבוא קובץ הסטיילים שלנו (CSS Modules)
import styles from './Modal.module.css';

// הגדרת הטיפוסים - מה ה-Modal יכול לקבל כ-props
interface ModalProps {
  isOpen: boolean;                                        // האם ה-Modal פתוח - חובה
  onClose: () => void;                                    // פונקציה לסגירת ה-Modal - חובה
  children: React.ReactNode;                              // התוכן שבתוך ה-Modal - חובה
  title?: string;                                         // כותרת ה-Modal - אופציונלי
  size?: 'small' | 'medium' | 'large' | 'fullscreen';    // גודל ה-Modal - אופציונלי
  showCloseButton?: boolean;                              // האם להציג כפתור X - אופציונלי
  closeOnOverlayClick?: boolean;                          // האם לסגור בלחיצה על הרקע - אופציונלי
  closeOnEscape?: boolean;                                // האם לסגור במקש Escape - אופציונלי
  className?: string;                                     // קלאס נוסף - אופציונלי
}

// הגדרת הקומפוננטה עצמה + destructuring של ה-props + ערכי ברירת מחדל
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'medium',                 // ברירת מחדל: גודל בינוני
  showCloseButton = true,          // ברירת מחדל: להציג כפתור סגירה
  closeOnOverlayClick = true,      // ברירת מחדל: לסגור בלחיצה על הרקע
  closeOnEscape = true,            // ברירת מחדל: לסגור במקש Escape
  className = ''                   // ברירת מחדל: ללא קלאס נוסף
}) => {
  // פונקציה לטיפול במקש Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    };

    // אם ה-Modal פתוח ומותר לסגור ב-Escape
    if (isOpen && closeOnEscape) {
      document.addEventListener('keydown', handleEscape);
    }

    // ניקוי ה-event listener כשהקומפוננטה נמחקת או isOpen משתנה
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeOnEscape, onClose]);

  // אם ה-Modal סגור - לא מציגים כלום
  if (!isOpen) return null;

  // פונקציה לטיפול בלחיצה על הרקע
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // עצירת propagation להימנע מניווט ל-Link הורה
    event.stopPropagation();
    
    // בודקים אם לחצו על הרקע (overlay) ולא על התוכן
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // יצירת Portal - הModal יוצג מחוץ לעץ הDOM הרגיל
  // כדי לאפשר לו להיות מעל לכל התוכן האחר
  // ולקבל את כל הרוחב והגובה של המסך
  // בעברית פשוטה המושג "Portal" מאפשר לנו להציג את ה-Modal
  // מחוץ למבנה הרגיל של ה-DOM, כך שהוא יכול להיות מעל לכל התוכן האחר
  return ReactDOM.createPortal(
    <div 
      className={styles.overlay} 
      onClick={handleOverlayClick}
    >
      <div className={`${styles.modal} ${styles[size]} ${className}`}>
        {/* כותרת ה-Modal עם כפתור סגירה */}
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {showCloseButton && (
              <button 
                className={styles.closeButton}
                onClick={onClose}
                aria-label="סגור"
              >
                ×
              </button>
            )}
          </div>
        )}
        
        {/* תוכן ה-Modal */}
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>,
    document.body  // ה-Modal יצורף ישירות ל-body של הדף
  );
};

// ייצוא הקומפוננטה כדי שניתן יהיה להשתמש בה במקומות אחרים
export default Modal;
