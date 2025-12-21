import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/reduxHooks';
import {
  fetchCustomerGroups,
  setFilters,
  setPagination,
  clearError,
  toggleCustomerGroup
} from '../../../../../store/slices/customerGroupsSlice';
import type { CustomerGroup } from '../../../../../types/CustomerGroup';
import { useSocket } from '../../../../../hooks/useSocket';
import styles from './CustomerGroupsList.module.css';

interface CustomerGroupsListProps {
  onEditGroup?: (group: CustomerGroup) => void;
  onCreateGroup?: () => void;
  onDeleteGroup?: (group: CustomerGroup) => void;
}

const CustomerGroupsList: React.FC<CustomerGroupsListProps> = ({
  onEditGroup,
  onCreateGroup,
  onDeleteGroup
}) => {
  const dispatch = useAppDispatch();
  const {
    groups,
    loading,
    error,
    filters,
    pagination
  } = useAppSelector((state) => state.customerGroups);

  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [statusFilter, setStatusFilter] = useState<string>(
    filters.isActive === null ? 'all' : filters.isActive ? 'active' : 'inactive'
  );

  // Load groups on component mount
  useEffect(() => {
    dispatch(fetchCustomerGroups());
  }, [dispatch]);

  // רענון אוטומטי של הקבוצות כשיש עדכון מהשרת
  useSocket('groupUpdated', () => {
    dispatch(fetchCustomerGroups());
  });

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    dispatch(setFilters({ search: value }));
  };

  // Handle status filter
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    const isActive = value === 'all' ? null : value === 'active';
    dispatch(setFilters({ isActive }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    dispatch(setPagination({ page }));
    dispatch(fetchCustomerGroups());
  };

  // Clear error
  const handleClearError = () => {
    dispatch(clearError());
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'תאריך לא זמין';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'תאריך לא תקין';
      return date.toLocaleDateString('he-IL');
    } catch (err) {
      // לוג לשגיאה מועטת לצורך דיבוג (מניעת unused variable)
      console.debug('formatDate error:', err);
      return 'תאריך לא זמין';
    }
  };

  if (loading && groups.length === 0) {
    return (
      <div className={styles.customerGroupsList}>
        <div className={styles.loading}>טוען קבוצות לקוח...</div>
      </div>
    );
  }

  return (
    <div className={styles.customerGroupsList}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>ניהול קבוצות לקוח</h1>
        <button
          className={styles.createButton}
          onClick={onCreateGroup}
        >
          + קבוצה חדשה
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={handleClearError}>סגור</button>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="חפש לפי שם..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className={styles.statusFilter}
          title="סינון לפי סטטוס"
        >
          <option value="all">כל הקבוצות</option>
          <option value="active">פעילות</option>
          <option value="inactive">לא פעילות</option>
        </select>
      </div>

      {/* Groups Table */}
      {groups.length === 0 && !loading ? (
        <div className={styles.empty}>
          <h3>אין קבוצות לקוח</h3>
          <p>צור קבוצה ראשונה כדי להתחיל</p>
        </div>
      ) : (
        <>
          <table className={styles.table}>
            <thead className={styles.tableHeader}>
              <tr>
                <th>שם הקבוצה</th>
                <th>הנחה</th>
                <th>סטטוס</th>
                <th>חברים</th>
                <th>תאריך יצירה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {groups.map((group: CustomerGroup) => (
                <tr key={group._id}>
                  <td>
                    <div className={styles.groupName}>{group.name || 'ללא שם'}</div>
                    {group.description && typeof group.description === 'string' && (
                      <small className={styles.description}>{group.description}</small>
                    )}
                  </td>
                  <td>
                    <span className={styles.discountBadge}>
                      {typeof group.discountPercentage === 'number' ? group.discountPercentage : 0}%
                    </span>
                  </td>
                  <td>
                    <span className={
                      group.isActive ? styles.statusActive : styles.statusInactive
                    }>
                      {group.isActive ? 'פעילה' : 'לא פעילה'}
                    </span>
                  </td>
                  <td>
                    {typeof group.membersCount === 'number' ? group.membersCount : (typeof group.userCount === 'number' ? group.userCount : 0)} חברים
                  </td>
                  <td>
                    {formatDate(group.createdAt)}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.editButton}
                        onClick={() => onEditGroup?.(group)}
                        title="ערוך קבוצה"
                      >
                        ערוך
                      </button>
                      <button
                        className={styles.toggleButton}
                        onClick={() => dispatch(toggleCustomerGroup(group._id!))}
                        title={group.isActive ? 'השבת קבוצה' : 'הפעל קבוצה'}
                      >
                        {group.isActive ? 'השבת' : 'הפעל'}
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => onDeleteGroup?.(group)}
                        title="מחק קבוצה"
                      >
                        מחק
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                קודם
              </button>

              <span>
                עמוד {pagination.page} מתוך {Math.ceil(pagination.total / pagination.limit)}
              </span>

              <button
                className={styles.pageButton}
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              >
                הבא
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerGroupsList;
