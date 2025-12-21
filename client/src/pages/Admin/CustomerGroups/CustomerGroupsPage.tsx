import React, { useState } from 'react';
import { UsersRound } from 'lucide-react';
import { useAppDispatch } from '../../../hooks/reduxHooks';
import { fetchCustomerGroups } from '../../../store/slices/customerGroupsSlice';
import CustomerGroupsList from '../../../components/features/admin/CustomerGroups/CustomerGroupsList/index';
import CustomerGroupForm from '../../../components/features/admin/CustomerGroups/CustomerGroupForm/index';
import DeleteConfirmModal from '../../../components/features/admin/CustomerGroups/DeleteConfirmModal/index';
import type { CustomerGroup } from '../../../types/CustomerGroup';
import { useSocket } from '../../../hooks/useSocket';
import styles from './CustomerGroupsPage.module.css';

type ModalType = 'create' | 'edit' | 'delete' | null;

const CustomerGroupsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);

  // סנכרון בזמן אמת - רענון קבוצות כשמגיע עדכון מהשרת
  useSocket('groupUpdated', () => {
    dispatch(fetchCustomerGroups());
  });

  // Handle create group
  const handleCreateGroup = () => {
    setSelectedGroup(null);
    setActiveModal('create');
  };

  // Handle edit group
  const handleEditGroup = (group: CustomerGroup) => {
    setSelectedGroup(group);
    setActiveModal('edit');
  };

  // Handle delete group
  const handleDeleteGroup = (group: CustomerGroup) => {
    setSelectedGroup(group);
    setActiveModal('delete');
  };

  // Handle modal close
  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedGroup(null);
  };

  // Handle success actions with refresh
  const handleSuccess = async () => {
    try {
      // רענון אוטומטי אחרי פעולה מוצלחת
      await dispatch(fetchCustomerGroups()).unwrap();
    } catch (error) {
      console.error('Failed to refresh customer groups:', error);
    }
    handleCloseModal();
  };

  return (
    <div className={styles.customerGroupsPage}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <div className={styles.titleWrapper}>
            <div className={styles.titleIcon}>
              <UsersRound size={28} strokeWidth={2} />
            </div>
            <div>
              <h1 className={styles.pageTitle}>ניהול קבוצות לקוחות</h1>
              <p className={styles.pageDescription}>
                צור, ערוך ומחק קבוצות לקוחות עם הנחות והגדרות שקיפות מותאמות
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          <CustomerGroupsList
            onEditGroup={handleEditGroup}
            onCreateGroup={handleCreateGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        </div>

        {/* Modals */}
        <div className={styles.modalContainer}>
          {/* Create/Edit Modal */}
          {(activeModal === 'create' || activeModal === 'edit') && (
            <CustomerGroupForm
              group={selectedGroup}
              onClose={handleCloseModal}
              onSuccess={handleSuccess}
            />
          )}

          {/* Delete Confirmation Modal */}
          {activeModal === 'delete' && selectedGroup && (
            <DeleteConfirmModal
              group={selectedGroup}
              onClose={handleCloseModal}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerGroupsPage;
