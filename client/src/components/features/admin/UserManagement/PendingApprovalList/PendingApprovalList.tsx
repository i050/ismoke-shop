/**
 * קומפוננטת רשימת משתמשים ממתינים לאישור
 * 
 * מציגה טבלה של משתמשים שנרשמו וממתינים לאישור מנהל
 * עם אפשרות לאשר או לדחות כל משתמש
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, RefreshCw, UserCheck, Search } from 'lucide-react';
import { Button, Input } from '../../../../ui';
import userManagementService from '../../../../../services/userManagementService';
import { useToast } from '../../../../../hooks/useToast';
import styles from './PendingApprovalList.module.css';

// ============================================================================
// Types
// ============================================================================

interface PendingUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// Component
// ============================================================================

const PendingApprovalList: React.FC = () => {
  // State
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

  const { showToast } = useToast();

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchPendingUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await userManagementService.getPendingApprovalUsers({
        page,
        limit: 20,
        search: searchTerm || undefined,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      });

      if (response.success) {
        setUsers(response.data as PendingUser[]);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
      showToast('error', 'שגיאה בטעינת המשתמשים הממתינים');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showToast]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleApprove = async (userId: string, userName: string) => {
    try {
      setProcessingUsers(prev => new Set(prev).add(userId));
      
      const response = await userManagementService.approveUser(userId);
      
      if (response.success) {
        showToast('success', `המשתמש ${userName} אושר בהצלחה`);
        // הסרת המשתמש מהרשימה
        setUsers(prev => prev.filter(u => u._id !== userId));
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      }
    } catch (error) {
      console.error('Error approving user:', error);
      showToast('error', 'שגיאה באישור המשתמש');
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך לדחות את הבקשה של ${userName}? פעולה זו תמחק את המשתמש.`)) {
      return;
    }

    try {
      setProcessingUsers(prev => new Set(prev).add(userId));
      
      const response = await userManagementService.rejectUser(userId);
      
      if (response.success) {
        showToast('success', `הבקשה של ${userName} נדחתה`);
        // הסרת המשתמש מהרשימה
        setUsers(prev => prev.filter(u => u._id !== userId));
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      showToast('error', 'שגיאה בדחיית המשתמש');
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPendingUsers(1);
  };

  const handlePageChange = (newPage: number) => {
    fetchPendingUsers(newPage);
  };

  // ============================================================================
  // Render
  // ============================================================================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // אם אין משתמשים ממתינים
  if (!loading && users.length === 0 && !searchTerm) {
    return (
      <div className={styles.emptyState}>
        <UserCheck size={48} className={styles.emptyIcon} />
        <h3>אין משתמשים ממתינים לאישור</h3>
        <p>כל בקשות ההרשמה טופלו</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* כותרת */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>משתמשים ממתינים לאישור</h2>
          <span className={styles.badge}>{pagination.total}</span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchPendingUsers(pagination.page)}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? styles.spinning : ''} />
          רענן
        </Button>
      </div>

      {/* חיפוש */}
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <Input
            type="text"
            placeholder="חיפוש לפי שם או אימייל..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          חפש
        </Button>
      </form>

      {/* טבלה */}
      {loading ? (
        <div className={styles.loading}>טוען...</div>
      ) : users.length === 0 ? (
        <div className={styles.noResults}>
          לא נמצאו תוצאות עבור "{searchTerm}"
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>אימייל</th>
                  <th>תאריך הרשמה</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const isProcessing = processingUsers.has(user._id);
                  const fullName = `${user.firstName} ${user.lastName}`;
                  
                  return (
                    <tr key={user._id} className={isProcessing ? styles.processing : ''}>
                      <td className={styles.nameCell}>
                        <span className={styles.userName}>{fullName}</span>
                      </td>
                      <td className={styles.emailCell}>
                        {user.email}
                      </td>
                      <td className={styles.dateCell}>
                        {formatDate(user.createdAt)}
                      </td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actions}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(user._id, fullName)}
                            disabled={isProcessing}
                            className={styles.approveBtn}
                          >
                            <Check size={16} />
                            אשר
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(user._id, fullName)}
                            disabled={isProcessing}
                            className={styles.rejectBtn}
                          >
                            <X size={16} />
                            דחה
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* עימוד */}
          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                הקודם
              </Button>
              <span className={styles.pageInfo}>
                עמוד {pagination.page} מתוך {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                הבא
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PendingApprovalList;
