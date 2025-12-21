import React, { useEffect } from 'react';
import Modal from '../Modal';
import { Icon } from '../Icon';
import { Button } from '../Button';
import styles from './ConfirmDialog.module.css';

/**
 * ממשק Props של ConfirmDialog
 */
export interface ConfirmDialogProps {
  /** האם הדיאלוג פתוח */
  isOpen: boolean;
  /** כותרת הדיאלוג */
  title: string;
  /** הודעת התוכן */
  message: string;
  /** טקסט כפתור אישור */
  confirmText?: string;
  /** טקסט כפתור ביטול */
  cancelText?: string;
  /** פונקציה שנקראת בלחיצה על אישור */
  onConfirm: () => void;
  /** פונקציה שנקראת בלחיצה על ביטול או סגירה */
  onCancel: () => void;
  /** סוג הדיאלוג - משפיע על הצבע והאייקון */
  variant?: 'danger' | 'warning' | 'info';
  /** האם להציג loading על כפתור האישור */
  isLoading?: boolean;
}

/**
 * קומפוננטה לאישור פעולות קריטיות
 * תומכת ב-3 variants: danger, warning, info
 * כולל keyboard support (Enter, Escape)
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'אישור',
  cancelText = 'ביטול',
  onConfirm,
  onCancel,
  variant = 'info',
  isLoading = false,
}) => {
  /**
   * טיפול במקשי Enter ו-Escape
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || isLoading) return;

      // Enter - אישור
      if (event.key === 'Enter') {
        event.preventDefault();
        onConfirm();
      }
      // Escape - ביטול (Modal כבר מטפל בזה, אבל נוסיף גם כאן)
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onConfirm, onCancel, isLoading]);

  /**
   * קביעת האייקון לפי variant
   */
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Icon name="AlertTriangle" size={48} className={styles.iconDanger} />;
      case 'warning':
        return <Icon name="AlertCircle" size={48} className={styles.iconWarning} />;
      case 'info':
      default:
        return <Icon name="HelpCircle" size={48} className={styles.iconInfo} />;
    }
  };

  /**
   * קביעת סוג הכפתור לפי variant
   */
  const getButtonVariant = (): 'primary' | 'danger' => {
    switch (variant) {
      case 'danger':
        return 'danger';
      case 'warning':
      case 'info':
      default:
        return 'primary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="small"
      showCloseButton={false}
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      className={styles.confirmDialog}
    >
      <div className={styles.container}>
        {/* אייקון */}
        <div className={styles.iconWrapper}>
          {getIcon()}
        </div>

        {/* כותרת */}
        <h2 className={styles.title}>{title}</h2>

        {/* הודעה */}
        <p className={styles.message}>{message}</p>

        {/* כפתורים */}
        <div className={styles.actions}>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className={styles.cancelButton}
          >
            {cancelText}
          </Button>
          <Button
            variant={getButtonVariant()}
            onClick={onConfirm}
            disabled={isLoading}
            className={styles.confirmButton}
          >
            {isLoading ? 'מעבד...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
