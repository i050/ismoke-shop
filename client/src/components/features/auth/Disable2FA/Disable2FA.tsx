import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import { disable2FAStart, disable2FASuccess, disable2FAFailure } from '../../../../store/slices/authSlice';
import { Button, Typography, Modal } from '../../../../components/ui';
import { AuthService } from '../../../../services/authService';
import styles from './Disable2FA.module.css';

// הגדרת טיפוסים
interface Disable2FAProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// רכיב ביטול 2FA
const Disable2FA: React.FC<Disable2FAProps> = ({
  onSuccess,
  onError,
}) => {
  // ניהול מצב הדיאלוג
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Redux
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  // פתיחת דיאלוג אישור
  const handleDisableClick = () => {
    setShowConfirmDialog(true);
  };

  // סגירת דיאלוג אישור
  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  // ביצוע ביטול 2FA
  const handleConfirmDisable = async () => {
    setIsDisabling(true);
    setShowConfirmDialog(false);
    dispatch(disable2FAStart());

    try {
      // קריאה אמיתית לשרת לביטול 2FA
      const response = await AuthService.disable2FA();

      if (response.success) {
        dispatch(disable2FASuccess(authState.user!)); // המשתמש הנוכחי עם 2FA מבוטל
        onSuccess?.();
      } else {
        dispatch(disable2FAFailure(response.message || 'שגיאה בביטול 2FA'));
        onError?.(response.message || 'שגיאה בביטול 2FA');
      }
    } catch (error) {
      console.error('Disable 2FA error:', error);
      const errorMessage = 'שגיאה בביטול 2FA';
      dispatch(disable2FAFailure(errorMessage));
      onError?.(errorMessage);
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleDisableClick}
        disabled={isDisabling || authState.isLoading}
      >
        {isDisabling ? 'מבטל...' : 'בטל 2FA'}
      </Button>

      {/* דיאלוג אישור */}
      <Modal
        isOpen={showConfirmDialog}
        onClose={handleCancel}
        title="בטל אימות דו-שלבי"
      >
        <div className={styles.confirmDialog}>
          <Typography variant="body1" align="center">
            האם אתה בטוח שברצונך לבטל את האימות הדו-שלבי?
          </Typography>
          <Typography variant="body2" align="center" color="secondary">
            פעולה זו תפחית את רמת האבטחה של החשבון שלך.
          </Typography>

          <div className={styles.buttonGroup}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isDisabling}
            >
              ביטול
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmDisable}
              disabled={isDisabling}
            >
              כן, בטל 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Disable2FA;
