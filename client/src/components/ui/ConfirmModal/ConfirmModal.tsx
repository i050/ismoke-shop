import React from 'react';
import { Modal, Button, Icon, type IconName } from '../index';
import styles from './ConfirmModal.module.css';

/**
 * ממשק הגדרות למודאל אישור
 */
export interface ConfirmModalProps {
  /** האם המודאל פתוח */
  isOpen: boolean;
  /** כותרת המודאל */
  title: string;
  /** תיאור/הודעה */
  message: string;
  /** טקסט כפתור אישור (ברירת מחדל: "אישור") */
  confirmText?: string;
  /** טקסט כפתור ביטול (ברירת מחדל: "ביטול") */
  cancelText?: string;
  /** האם זו פעולה מסוכנת (מחיקה וכו') - ישנה צבע לאדום */
  danger?: boolean;
  /** האם בתהליך עיבוד */
  isLoading?: boolean;
  /** פונקציה שנקראת בעת אישור */
  onConfirm: () => void;
  /** פונקציה שנקראת בעת ביטול/סגירה */
  onCancel: () => void;
  /** אייקון מותאם אישית (אופציונלי) */
  icon?: string;
}

/**
 * מודאל אישור גנרי
 * 
 * משמש להחלפת window.confirm() בכל הפרויקט
 * תומך בפעולות רגילות ומסוכנות (danger)
 * 
 * @example
 * <ConfirmModal
 *   isOpen={showConfirm}
 *   title="מחיקת מוצר"
 *   message="האם אתה בטוח שברצונך למחוק את המוצר?"
 *   danger={true}
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowConfirm(false)}
 * />
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'אישור',
  cancelText = 'ביטול',
  danger = false,
  isLoading = false,
  onConfirm,
  onCancel,
  icon,
}) => {
  // בחירת אייקון לפי סוג הפעולה
  const iconName: IconName = (icon || (danger ? 'AlertTriangle' : 'HelpCircle')) as IconName;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="small"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className={styles.container}>
        {/* אייקון */}
        <div className={`${styles.iconWrapper} ${danger ? styles.danger : styles.normal}`}>
          <Icon name={iconName} size={32} />
        </div>

        {/* הודעה */}
        <p className={styles.message}>{message}</p>

        {/* כפתורי פעולה */}
        <div className={styles.actions}>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={isLoading}
            className={styles.confirmButton}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                מעבד...
              </>
            ) : (
              <>
                <Icon name={danger ? 'Trash2' : 'Check'} size={16} />
                {confirmText}
              </>
            )}
          </Button>
          
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
