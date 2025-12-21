import React, { useState } from 'react';
import { useAppDispatch } from '../../../../../hooks/reduxHooks';
import { 
  checkDeleteCustomerGroup, 
  forceDeleteCustomerGroup 
} from '../../../../../store/slices/customerGroupsSlice';
import { Icon } from '../../../../ui/Icon';
import type { 
  CustomerGroup, 
  DeleteGroupWithMembersResponse
} from '../../../../../types/CustomerGroup';
import styles from './DeleteConfirmModal.module.css';

interface DeleteConfirmModalProps {
  group: CustomerGroup;
  onClose: () => void;
  onSuccess?: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  group,
  onClose,
  onSuccess
}) => {
  const dispatch = useAppDispatch();
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalState, setModalState] = useState<'initial' | 'warning'>('initial');
  const [warningInfo, setWarningInfo] = useState<DeleteGroupWithMembersResponse | null>(null);

  // בדיקה ראשונית לפני מחיקה - עשויה למחוק מיד או להציג אזהרה  
  // מטרה: לבדוק אם יש משתמשים בקבוצה
  const handleInitialDelete = async () => {
    setIsDeleting(true);

    try {
      // בדיקת מחיקה - אם אין משתמשים ימחק מיד, אחרת יציג אזהרה
      const result = await dispatch(checkDeleteCustomerGroup(group._id)).unwrap();
      
      // בדיקה אם זה ID (מחיקה הצליחה) או מידע למודל אזהרה
      if (typeof result === 'string') {
        // המחיקה הצליחה - קבוצה ריקה נמחקה
        onSuccess?.();
        onClose();
      } else {
        // יש משתמשים - הצגת מודל אזהרה עם מידע דינמי
        setWarningInfo(result);
        setModalState('warning');
        setIsDeleting(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('❌ Check delete error:', message);
      setIsDeleting(false);
    }
  };

  // מחיקה בכוח - אחרי אישור המשתמש במודל האזהרה
  // מטרה: למחוק קבוצה גם כשיש בה משתמשים (הופכים לרגילים)
  const handleForceDelete = async () => {
    setIsDeleting(true);

    try {
      await dispatch(forceDeleteCustomerGroup(group._id)).unwrap();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Force delete error:', message);
      setIsDeleting(false);
    }
  };

  // Handle modal close - memoized כדי לשמור יציבות הפניה לאפקטים
  const handleClose = React.useCallback(() => {
    if (!isDeleting) {
      onClose();
    }
  }, [isDeleting, onClose]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {modalState === 'initial' ? 'אישור מחיקת קבוצת לקוחות' : <><Icon name="AlertTriangle" size={20} /> אזהרה: מחיקת קבוצה עם משתמשים</>}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isDeleting}
            title="סגור"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {modalState === 'initial' ? (
            // מודל התחלתי - מחיקה רגילה
            <>
              {/* Warning Icon */}
              <svg
                className={styles.warningIcon}
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>

              {/* Group Information */}
              <div className={styles.groupInfo}>
                <h3 className={styles.groupName}>{group.name}</h3>
                <p className={styles.groupDetails}>
                  <strong>הנחה:</strong> {group.discountPercentage}%<br />
                  <strong>חברים:</strong> {group.membersCount || group.userCount || 0}<br />
                  <strong>סטטוס:</strong> {group.isActive ? 'פעילה' : 'לא פעילה'}
                </p>
              </div>

              {/* Confirmation Text */}
              <div className={styles.confirmationText}>
                <p>
                  האם אתה בטוח שברצונך למחוק את קבוצת הלקוחות <strong>"{group.name}"</strong>?
                </p>
                <p>
                  פעולה זו <strong>לא ניתנת לביטול</strong> ותמחק את כל הנתונים הקשורים לקבוצה.
                </p>
              </div>
            </>
          ) : (
            // מודל אזהרה - יש משתמשים בקבוצה
            <>
              {/* Big Warning Icon */}
              <div className={styles.bigWarningIcon}>
                <Icon name="AlertTriangle" size={48} />
              </div>

              {/* הודעה דינמית מהשרת - בדיוק כמו שביקשת */}
              <div className={styles.dynamicWarningMessage}>
                <p className={styles.mainWarningText}>
                  {warningInfo?.message}
                </p>
              </div>

              {/* רשימת השלכות */}
              <div className={styles.consequencesList}>
                <h4>מה יקרה בעקבות המחיקה:</h4>
                <ul>
                  <li><Icon name="XCircle" size={16} /> <strong>{warningInfo?.groupInfo.membersCount}</strong> משתמשים יאבדו את ההנחה המיוחדת</li>
                  <li><Icon name="User" size={16} /> הם יחזרו להיות לקוחות רגילים</li>
                  <li><Icon name="Trash2" size={16} /> לא תוכל לשחזר את הקבוצה</li>
                  <li><Icon name="Undo" size={16} /> יהיה צורך לשייך אותם מחדש אם תרצה</li>
                </ul>
              </div>

              {/* מידע על הקבוצה */}
              <div className={styles.groupSummary}>
                <div className={styles.summaryItem}>
                  <strong>שם הקבוצה:</strong> {warningInfo?.groupInfo.name}
                </div>
                <div className={styles.summaryItem}>
                  <strong>משתמשים שיושפעו:</strong> {warningInfo?.groupInfo.membersCount}
                </div>
                <div className={styles.summaryItem}>
                  <strong>הנחה שתאבד:</strong> {warningInfo?.groupInfo.discountPercentage}%
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={isDeleting}
          >
            ביטול
          </button>
          
          {modalState === 'initial' ? (
            // כפתור מחיקה רגיל
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleInitialDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  בודק...
                </div>
              ) : (
                'מחק קבוצה'
              )}
            </button>
          ) : (
            // כפתור מחיקה בכוח - אדום ובולט
            <button
              type="button"
              className={`${styles.deleteButton} ${styles.forceDeleteButton}`}
              onClick={handleForceDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  מוחק...
                </div>
              ) : (
                <><Icon name="Trash2" size={16} /> מחק בכל זאת</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
