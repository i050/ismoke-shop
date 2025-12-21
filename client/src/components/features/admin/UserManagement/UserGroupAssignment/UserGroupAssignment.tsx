// רכיב שיוך משתמש לקבוצה - משימה 2: שיוך לקוחות לקבוצות
// מטרת הקומפוננטה: ממשק לשיוך משתמש לקבוצה או הסרתו מקבוצה

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/reduxHooks';
import {
  assignUserToGroup,
  removeUserFromGroup
} from '../../../../../store/slices/userManagementSlice';
import { fetchCustomerGroups } from '../../../../../store/slices/customerGroupsSlice';
import type { UserSummary } from '../../../../../types/UserManagement';
import { Button } from '../../../../ui';
import { Modal } from '../../../../ui';
import styles from './UserGroupAssignment.module.css';

// ==========================================
// טיפוסים מקומיים לקומפוננטה
// ==========================================

/**
 * Props של הקומפוננטה
 */
interface UserGroupAssignmentProps {
  /** האם המודל פתוח */
  isOpen: boolean;
  /** פונקציה לסגירת המודל */
  onClose: () => void;
  /** המשתמש לשיוך */
  user: UserSummary | null;
  /** מצב הפעולה - שיוך או הסרה */
  mode: 'assign' | 'remove';
  /** פונקציה שתופעל לאחר הצלחה */
  onSuccess?: () => void;
}

// ==========================================
// קומפוננטה ראשית - שיוך משתמש לקבוצה
// ==========================================

const UserGroupAssignment: React.FC<UserGroupAssignmentProps> = ({
  isOpen,
  onClose,
  user,
  mode,
  onSuccess
}) => {
  const dispatch = useAppDispatch();

  // חיבור ל-Redux store (מוקלד)
  const {
    groups: customerGroups,
    loading: groupsLoading
  } = useAppSelector((state) => state.customerGroups);

  const {
    loading: assignmentLoading,
    error
  } = useAppSelector((state) => state.userManagement);

  // מצב מקומי
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [confirmText, setConfirmText] = useState<string>('');

  // טעינת קבוצות בעת פתיחת המודל
  useEffect(() => {
    if (isOpen && mode === 'assign') {
      dispatch(fetchCustomerGroups());
    }
  }, [isOpen, mode, dispatch]);

  // איפוס מצב בעת פתיחת/סגירת המודל
  useEffect(() => {
    if (isOpen) {
      setSelectedGroupId('');
      setConfirmText('');
    }
  }, [isOpen]);

  // ==========================================
  // פונקציות לטיפול בפעולות
  // ==========================================

  /**
   * טיפול בבחירת קבוצה
   */
  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  /**
   * ביצוע שיוך משתמש לקבוצה
   */
  const handleAssignUser = async () => {
    if (!user || !selectedGroupId) return;

    try {
      await dispatch(assignUserToGroup({
        userId: user._id,
        groupId: selectedGroupId
      })).unwrap();

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('שיוך משתמש נכשל:', error);
    }
  };

  /**
   * ביצוע הסרת משתמש מקבוצה
   */
  const handleRemoveUser = async () => {
    if (!user) return;

    try {
      await dispatch(removeUserFromGroup(user._id)).unwrap();

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('הסרת משתמש מקבוצה נכשלה:', error);
    }
  };

  /**
   * ביצוע הפעולה (שיוך או הסרה)
   */
  const handleConfirm = async () => {
    if (mode === 'assign') {
      await handleAssignUser();
    } else {
      await handleRemoveUser();
    }
  };

  /**
   * בדיקה האם הפעולה יכולה להתבצע
   */
  const canConfirm = () => {
    if (mode === 'assign') {
      return selectedGroupId && confirmText === 'שייך';
    } else {
      return confirmText === 'הסר';
    }
  };

  // ==========================================
  // רינדור הקומפוננטה
  // ==========================================

  if (!user) return null;

  const selectedGroup = customerGroups.find(group => group._id === selectedGroupId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'assign' ? 'שיוך משתמש לקבוצה' : 'הסרת משתמש מקבוצה'}
      size="medium"
    >
      <div className={styles.container}>
        {/* מידע על המשתמש */}
        <div className={styles.userInfo}>
          <h3 className={styles.userName}>
            {user.firstName} {user.lastName}
          </h3>
          <p className={styles.userEmail}>{user.email}</p>
          {user.customerGroupId && (
            <p className={styles.currentGroup}>
              קבוצה נוכחית: <span className={styles.groupName}>
                {typeof user.customerGroupId === 'object' ? user.customerGroupId.name : 'קבוצה'}
              </span>
            </p>
          )}
        </div>

        {/* הודעת שגיאה */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* תוכן לפי מצב */}
        {mode === 'assign' ? (
          <div className={styles.assignContent}>
            <h4>בחר קבוצה לשיוך:</h4>

            {(groupsLoading || assignmentLoading) ? (
              <div className={styles.loading}>טוען קבוצות...</div>
            ) : (
              <div className={styles.groupsList}>
                {customerGroups.map((group) => (
                  <div
                    key={group._id}
                    className={`${styles.groupItem} ${
                      selectedGroupId === group._id ? styles.selected : ''
                    }`}
                    onClick={() => handleGroupSelect(group._id)}
                  >
                    <div className={styles.groupHeader}>
                      <h5 className={styles.groupName}>{group.name}</h5>
                      <span className={styles.discount}>
                        {group.discountPercentage}% הנחה
                      </span>
                    </div>
                    <p className={styles.groupDescription}>
                      {group.description || 'אין תיאור'}
                    </p>
                    <div className={styles.groupStats}>
                      <span>חברים: {typeof group.membersCount === 'number' ? group.membersCount : (typeof group.userCount === 'number' ? group.userCount : 0)}</span>
                      <span>סטטוס: {group.isActive ? 'פעיל' : 'לא פעיל'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedGroup && (
              <div className={styles.selectedGroupInfo}>
                <h5>קבוצה נבחרת: {selectedGroup.name}</h5>
                <p>הנחה: {selectedGroup.discountPercentage}%</p>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.removeContent}>
            <div className={styles.warning}>
              <h4>⚠️ אזהרה</h4>
              <p>
                פעולה זו תסיר את המשתמש <strong>{user.firstName} {user.lastName}</strong> מהקבוצה.
                המשתמש לא יקבל יותר את ההנחות של הקבוצה.
              </p>
            </div>
          </div>
        )}

        {/* אישור הפעולה */}
        <div className={styles.confirmation}>
          <div className={styles.confirmInput}>
            <label htmlFor="confirmText">
              הקלד "{mode === 'assign' ? 'שייך' : 'הסר'}" לאישור:
            </label>
            <input
              id="confirmText"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={mode === 'assign' ? 'שייך' : 'הסר'}
              className={styles.confirmField}
            />
          </div>
        </div>

        {/* כפתורי פעולה */}
        <div className={styles.actions}>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={assignmentLoading}
          >
            ביטול
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!canConfirm() || assignmentLoading}
          >
            {assignmentLoading ? 'מעבד...' : (mode === 'assign' ? 'שייך לקבוצה' : 'הסר מקבוצה')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserGroupAssignment;
