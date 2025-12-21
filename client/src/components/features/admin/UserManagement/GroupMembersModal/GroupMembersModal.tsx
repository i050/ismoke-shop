// ==========================================
// רכיב מודל צפייה בחברי קבוצה - משימה 2: שיוך לקוחות לקבוצות
// ==========================================
// מטרת הקומפוננטה: הצגת רשימת כל החברים בקבוצה ספציפית
// למה זה חשוב: מאפשר למנהל לראות מי חבר בקבוצה, מתי הצטרף, ולנהל את החברים
//
// מה הקומפוננטה תעשה:
// 1. תציג את שם הקבוצה וכמות החברים
// 2. תציג טבלה עם פרטי כל חבר (שם, אימייל, תאריך הצטרפות)
// 3. תאפשר הסרה של חברים מהקבוצה
// 4. תציג סטטיסטיקות על הקבוצה
//
// למה אנחנו יוצרים קומפוננטה נפרדת:
// - הפרדה של אחריות - כל קומפוננטה עושה דבר אחד טוב
// - שימוש חוזר - נוכל להשתמש בזה במקומות אחרים
// - קל יותר לתחזק ולבדוק
//
// הטכנולוגיות שבהן נשתמש:
// - React עם TypeScript
// - Redux Toolkit לשליפת נתונים
// - CSS Modules לעיצוב
// - Modal component קיים לעיצוב החלון

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/reduxHooks';

// ==========================================
// ייבוא טיפוסים וקומפוננטות בסיסיות
// ==========================================

// ייבוא טיפוסים מהקבצים שיצרנו קודם
import type { UserSummary } from '../../../../../types/UserManagement';
import type { CustomerGroup } from '../../../../../types/CustomerGroup';

// ייבוא קומפוננטות בסיסיות מהספרייה המשותפת
import { Button } from '../../../../ui';
import { Modal } from '../../../../ui';
import { useToast } from '../../../../../hooks/useToast';
import { useConfirm } from '../../../../../hooks/useConfirm';

// ייבוא פעולות Redux
import { removeUserFromGroup } from '../../../../../store/slices/userManagementSlice';

// ייבוא סטיילים - ניצור קובץ CSS Module נפרד
import styles from './GroupMembersModal.module.css';

// ==========================================
// הגדרת טיפוסים לקומפוננטה זו
// ==========================================

/**
 * Props של הקומפוננטה
 * זה מגדיר איזה מידע הקומפוננטה צריכה לקבל מבחוץ
 */
interface GroupMembersModalProps {
  /** האם המודל פתוח או סגור */
  isOpen: boolean;
  /** פונקציה לסגירת המודל */
  onClose: () => void;
  /** הקבוצה שרוצים לצפות בחבריה */
  group: CustomerGroup;
}

// ==========================================
// הקומפוננטה הראשית
// ==========================================

/**
 * GroupMembersModal - מודל להצגת חברי קבוצה
 *
 * זו הקומפוננטה הראשית שתציג את כל המידע על חברי הקבוצה.
 * אנחנו מתחילים עם מבנה בסיסי ונבנה אותו צעד אחר צעד.
 */
const GroupMembersModal: React.FC<GroupMembersModalProps> = ({
  isOpen,
  onClose,
  group
}) => {
  // ==========================================
  // חיבור ל-Redux store
  // ==========================================

  // חיבור ל-dispatch מוקלד
  const dispatch = useAppDispatch();
  
  // Hooks for Toast and Confirm
  const { showToast } = useToast();
  const confirm = useConfirm();

  // חיבור ל-state של userManagement באמצעות useAppSelector (מוקלד)
  const { users, loading, error } = useAppSelector((state) => state.userManagement);

  // ==========================================
  // מצבי state מקומיים
  // ==========================================

  // מצב לטעינת חברי הקבוצה
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // מצב להסרת חבר
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // ==========================================
  // אפקטים - פעולות שרצות כשמשהו משתנה
  // ==========================================

  /**
   * טעינת חברי הקבוצה כשהמודל נפתח
   * זה ירוץ בכל פעם ש-isOpen או group משתנים
   */
  useEffect(() => {
    if (!isOpen || !group._id) return;

    const load = async () => {
      setMembersLoading(true);
      try {
        const groupMembers = users.filter(user => user.customerGroupId === group._id);
        setMembers(groupMembers);
      } catch (err) {
        console.error('שגיאה בטעינת חברי הקבוצה:', err);
      } finally {
        setMembersLoading(false);
      }
    };

    load();
  }, [isOpen, group._id, users]);

  // ==========================================
  // פונקציות עזר
  // ==========================================

  /**
   * טעינת חברי הקבוצה
   * פונקציה זו תשלוף את כל המשתמשים ששייכים לקבוצה הספציפית
   */
  const loadGroupMembers = async () => {
    setMembersLoading(true);
    try {
      // כרגע נשתמש בנתונים מה-store הקיים
      // בעתיד ניישם קריאה ל-API ספציפית לחברי קבוצה
      const groupMembers = users.filter(user => user.customerGroupId === group._id);
      setMembers(groupMembers);
    } catch (error) {
      console.error('שגיאה בטעינת חברי הקבוצה:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  /**
   * הסרת חבר מקבוצה
   * פונקציה זו תסיר משתמש מהקבוצה
   */
  const handleRemoveMember = async (userId: string) => {
    const confirmed = await confirm({
      title: 'הסרת חבר מקבוצה',
      message: `האם אתה בטוח שברצונך להסיר את המשתמש מקבוצה "${group.name}"?`,
      confirmText: 'הסר',
      cancelText: 'ביטול',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    setRemovingUserId(userId);

    try {
      // נשתמש ב-dispatch לשליחת פעולת ההסרה
      await dispatch(removeUserFromGroup(userId)).unwrap();

      // רענון הרשימה לאחר ההסרה
      loadGroupMembers();
    } catch (error) {
      console.error('שגיאה בהסרת חבר מקבוצה:', error);
      showToast('error', 'שגיאה בהסרת המשתמש מהקבוצה. אנא נסה שוב.');
    } finally {
      setRemovingUserId(null);
    }
  };

  // ==========================================
  // רינדור הקומפוננטה
  // ==========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`חברי קבוצה: ${group.name}`}
      size="large"
    >
      <div className={styles.container}>
        {/* כותרת עם מידע על הקבוצה */}
        <div className={styles.header}>
          <h3>חברי הקבוצה</h3>
          <p className={styles.stats}>
            סה"כ חברים: {members.length}
          </p>
        </div>

        {/* הודעת שגיאה אם יש */}
        {error && (
          <div className={styles.error}>
            <p>{error}</p>
          </div>
        )}

        {/* תוכן המודל */}
        <div className={styles.content}>
          {membersLoading || loading ? (
            <div className={styles.loading}>טוען חברי קבוצה...</div>
          ) : (
            <div className={styles.membersList}>
              {members.length === 0 ? (
                <p className={styles.empty}>אין חברים בקבוצה זו</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>שם</th>
                      <th>אימייל</th>
                      <th>תאריך הצטרפות</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member._id}>
                        <td>{`${member.firstName} ${member.lastName}`}</td>
                        <td>{member.email}</td>
                        <td>{new Date(member.createdAt).toLocaleDateString('he-IL')}</td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member._id)}
                            disabled={removingUserId === member._id}
                          >
                            {removingUserId === member._id ? 'מסיר...' : 'הסר מקבוצה'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* כפתורי פעולה */}
        <div className={styles.actions}>
          <Button variant="primary" onClick={onClose}>
            סגור
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GroupMembersModal;
