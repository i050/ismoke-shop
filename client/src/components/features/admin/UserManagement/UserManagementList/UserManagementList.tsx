// רכיב רשימת ניהול משתמשים - משימה 2: שיוך לקוחות לקבוצות
// מטרת הקומפוננטה: הצגת רשימת המשתמשים עם אפשרות ערוך
// הרחבה: הוספת משתמש חדש ע"י מנהל, עריכת משתמש

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/reduxHooks';
import {
  fetchUsers,
  setFilters,
  clearError
} from '../../../../../store/slices/userManagementSlice';
import type { UserSummary, UserFilters } from '../../../../../types/UserManagement';
import type { CustomerGroup } from '../../../../../types/CustomerGroup';
import { Button } from '../../../../ui';
import { Input } from '../../../../ui';
import { Checkbox } from '../../../../ui';
import { Icon } from '../../../../ui';
import GroupMembersModal from '../GroupMembersModal/GroupMembersModal';
import CreateUserModal from '../CreateUserModal';
import EditUserModal from '../EditUserModal';
import UserCartView from '../UserCartView';
import UserOrderHistory from '../UserOrderHistory';
import { useSocket } from '../../../../../hooks/useSocket';
import { UserPlus, ShoppingCart, ClipboardList } from 'lucide-react';
import styles from './UserManagementList.module.css';

// ==========================================
// טיפוסים מקומיים לקומפוננטה
// ==========================================

/**
 * מצב מודל חברי קבוצה
 */
interface GroupMembersModalState {
  isOpen: boolean;
  group: CustomerGroup | null;
}

// ==========================================
// קומפוננטה ראשית - רשימת ניהול משתמשים
// ==========================================

const UserManagementList: React.FC = () => {
  const dispatch = useAppDispatch();

  // חיבור ל-Redux store (מוקלד דרך useAppSelector)
  const {
    users,
    selectedUsers,
    loading,
    error,
    filters,
    pagination
  } = useAppSelector((state) => state.userManagement);

  // מצבי מודלים מקומיים
  const [groupMembersModal, setGroupMembersModal] = useState<GroupMembersModalState>({
    isOpen: false,
    group: null
  });

  // מצב מודל יצירת משתמש חדש
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  // מצב מודל עריכת משתמש
  const [editUserModal, setEditUserModal] = useState<{
    isOpen: boolean;
    userId: string | null;
  }>({
    isOpen: false,
    userId: null
  });

  // מצב מודל סל קניות
  const [cartModal, setCartModal] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    userName: ''
  });

  // מצב מודל היסטוריית הזמנות
  const [ordersModal, setOrdersModal] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    userName: ''
  });

  // טעינת המשתמשים בעת טעינת הקומפוננטה
  useEffect(() => {
    dispatch(fetchUsers({ page: 1, limit: 20 }));
  }, [dispatch]);

  // רענון אוטומטי של המשתמשים כשיש עדכון בקבוצות
  useSocket('groupUpdated', () => {
    dispatch(fetchUsers({ page: 1, limit: 20 }));
  });

  // Debug console logs
  useEffect(() => {
    console.log('🔍 Redux State Debug:', {
      users,
      usersLength: users?.length,
      loading,
      error,
      pagination
    });
  }, [users, loading, error, pagination]);

  // ==========================================
  // פונקציות לטיפול בפעולות משתמש
  // ==========================================

  /**
   * טיפול בשינוי פילטרים
   */
  const handleFilterChange = (newFilters: Partial<UserFilters>) => {
    const updatedFilters = { ...(filters || {}), ...newFilters };
    dispatch(setFilters(updatedFilters));
    dispatch(fetchUsers({ page: 1, limit: 20, filters: updatedFilters }));
  };

  /**
   * טיפול בבחירת/ביטול בחירת משתמש
   */
  const handleUserSelection = (userId: string, isSelected: boolean) => {
    // TODO: יישום בחירת משתמשים
    console.log('User selection:', userId, isSelected);
  };

  /**
   * טיפול בבחירת כל המשתמשים
   */
  const handleSelectAll = (isSelected: boolean) => {
    // TODO: יישום בחירת כל המשתמשים
    console.log('Select all:', isSelected);
  };

  // פונקציות לניהול קבוצות נוסרו - ניהול קבוצות נעשה דרך EditUserModal

  /**
   * פתיחת מודל עריכת משתמש
   */
  const handleEditUser = (user: UserSummary) => {
    setEditUserModal({
      isOpen: true,
      userId: user._id
    });
  };

  /**
   * סגירת מודל עריכת משתמש
   */
  const handleCloseEditUserModal = () => {
    setEditUserModal({
      isOpen: false,
      userId: null
    });
  };

  /**
   * פתיחת מודל סל קניות
   */
  const handleViewCart = (user: UserSummary) => {
    setCartModal({
      isOpen: true,
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`
    });
  };

  /**
   * סגירת מודל סל קניות
   */
  const handleCloseCartModal = () => {
    setCartModal({
      isOpen: false,
      userId: null,
      userName: ''
    });
  };

  /**
   * פתיחת מודל היסטוריית הזמנות
   */
  const handleViewOrders = (user: UserSummary) => {
    setOrdersModal({
      isOpen: true,
      userId: user._id,
      userName: `${user.firstName} ${user.lastName}`
    });
  };

  /**
   * סגירת מודל היסטוריית הזמנות
   */
  const handleCloseOrdersModal = () => {
    setOrdersModal({
      isOpen: false,
      userId: null,
      userName: ''
    });
  };

  /**
   * פתיחת מודל צפייה בחברי קבוצה
   */
  const handleViewGroupMembers = (group: CustomerGroup) => {
    setGroupMembersModal({
      isOpen: true,
      group
    });
  };

  /**
   * סגירת מודל חברי קבוצה
   */
  const handleCloseGroupMembersModal = () => {
    setGroupMembersModal({
      isOpen: false,
      group: null
    });
  };

  /**
   * טיפול בשינוי עמוד
   */
  const handlePageChange = (page: number) => {
    dispatch(fetchUsers({ page, limit: 20, filters: filters || {} }));
  };

  /**
   * ניקוי שגיאות
   */
  const handleClearError = () => {
    dispatch(clearError());
  };

  // ==========================================
  // רינדור הקומפוננטה
  // ==========================================

  return (
    <div className={styles.container}>
      {/* כותרת וסטטיסטיקות */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>ניהול משתמשים</h1>
          <Button
            variant="primary"
            onClick={() => setIsCreateUserModalOpen(true)}
            className={styles.addUserBtn}
          >
            <UserPlus size={18} />
            הוסף משתמש
          </Button>
        </div>
        <div className={styles.stats}>
          <span>סה"כ משתמשים: {pagination?.total || 0}</span>
          <span>עמוד {pagination?.page || 1} מתוך {pagination?.totalPages || 1}</span>
        </div>
      </div>

      {/* פילטרים וחיפוש */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Input
            type="text"
            placeholder="חיפוש לפי שם או אימייל..."
            value={filters?.search || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange({ search: e.target.value })}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterButtons}>
          <Button
            variant={filters?.hasGroup === undefined ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange({ hasGroup: undefined })}
          >
            הכל
          </Button>
          <Button
            variant={filters?.hasGroup === true ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange({ hasGroup: true })}
          >
            עם קבוצה
          </Button>
          <Button
            variant={filters?.hasGroup === false ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange({ hasGroup: false })}
          >
            ללא קבוצה
          </Button>
        </div>
      </div>

      {/* הודעת שגיאה */}
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={handleClearError}>
            סגור
          </Button>
        </div>
      )}

      {/* טבלת המשתמשים */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loading}>טוען משתמשים...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <Checkbox
                    checked={(selectedUsers?.length || 0) === (users?.length || 0) && (users?.length || 0) > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>שם</th>
                <th>אימייל</th>
                <th>קבוצה</th>
                <th>סטטוס</th>
                <th>תאריך הצטרפות</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((user) => (
                <tr key={user._id}>
                  <td>
                    <Checkbox
                      checked={(selectedUsers || []).includes(user._id)}
                      onChange={(checked: boolean) => handleUserSelection(user._id, checked)}
                    />
                  </td>
                  <td>{`${user.firstName} ${user.lastName}`}</td>
                  <td>{user.email}</td>
                  <td>
                    {user.customerGroupId ? (
                      <span 
                        className={`${styles.groupBadge} ${styles.clickable}`}
                        onClick={() => {
                          // אם יש populate - הקבוצה היא אובייקט עם שם
                          const group = typeof user.customerGroupId === 'object' ? user.customerGroupId : null;
                          if (group) handleViewGroupMembers(group);
                        }}
                      >
                        {typeof user.customerGroupId === 'object' ? user.customerGroupId.name : 'קבוצה'}
                      </span>
                    ) : (
                      <span className={styles.noGroup}>ללא קבוצה</span>
                    )}
                  </td>
                  <td>
                    <span className={user.isActive ? styles.active : styles.inactive}>
                      {user.isActive ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString('he-IL')}</td>
                  <td>
                    <div className={styles.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        title="ערוך פרטי משתמש"
                      >
                        <Icon name="Edit" size={14} />
                       
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewCart(user)}
                        title="צפה בסל קניות"
                      >
                        <ShoppingCart size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewOrders(user)}
                        title="היסטוריית הזמנות"
                      >
                        <ClipboardList size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ניווט עמודים */}
      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            קודם
          </Button>

          <span className={styles.pageInfo}>
            עמוד {pagination.page} מתוך {pagination.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            הבא
          </Button>
        </div>
      )}

      {/* מודל צפייה בחברי קבוצה */}
      {groupMembersModal.group && (
        <GroupMembersModal
          isOpen={groupMembersModal.isOpen}
          onClose={handleCloseGroupMembersModal}
          group={groupMembersModal.group}
        />
      )}

      {/* מודל יצירת משתמש חדש */}
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onSuccess={() => {
          // רענון הרשימה לאחר הצלחה
          dispatch(fetchUsers({ page: 1, limit: 20, filters }));
        }}
      />

      {/* מודל עריכת משתמש */}
      <EditUserModal
        isOpen={editUserModal.isOpen}
        onClose={handleCloseEditUserModal}
        userId={editUserModal.userId}
        onSuccess={() => {
          // רענון הרשימה לאחר הצלחה
          dispatch(fetchUsers({ page: pagination.page, limit: 20, filters }));
        }}
      />

      {/* מודל סל קניות */}
      {cartModal.userId && (
        <UserCartView
          isOpen={cartModal.isOpen}
          onClose={handleCloseCartModal}
          userId={cartModal.userId}
          userName={cartModal.userName}
        />
      )}

      {/* מודל היסטוריית הזמנות */}
      {ordersModal.userId && (
        <UserOrderHistory
          isOpen={ordersModal.isOpen}
          onClose={handleCloseOrdersModal}
          userId={ordersModal.userId}
          userName={ordersModal.userName}
        />
      )}
    </div>
  );
};

export default UserManagementList;
