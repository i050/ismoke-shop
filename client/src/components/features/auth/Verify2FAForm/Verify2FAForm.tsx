import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import { verify2FAStart, verify2FASuccess, verify2FAFailure } from '../../../../store/slices/authSlice';
import { setCart } from '../../../../store/slices/cartSlice';
import { Button, Typography, Input } from '../../../../components/ui';
import { AuthService } from '../../../../services/authService';
import styles from './Verify2FAForm.module.css';

// הגדרת טיפוסים
interface Verify2FAData {
  verificationCode: string;
}

interface Verify2FAFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// רכיב טופס אימות 2FA
const Verify2FAForm: React.FC<Verify2FAFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  // ניהול מצב הטופס
  const [formData, setFormData] = useState<Verify2FAData>({
    verificationCode: '',
  });

  const [errors, setErrors] = useState<Partial<Verify2FAData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redux
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  // טיפול בשינויים בשדות
  const handleInputChange = (field: keyof Verify2FAData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // ניקוי שגיאה כשמשתמש מתחיל להקליד
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // טיפול בהגשת הטופס
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ולידציה בסיסית
    const newErrors: Partial<Verify2FAData> = {};
    if (!formData.verificationCode.trim()) {
      newErrors.verificationCode = 'נא להזין קוד אימות';
    } else if (formData.verificationCode.length !== 6) {
      newErrors.verificationCode = 'קוד האימות חייב להכיל 6 ספרות';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    dispatch(verify2FAStart());

    try {
      // קבל guestSessionId מ-localStorage
      const guestSessionId = localStorage.getItem('sessionId') || undefined;
      
      // קריאה אמיתית לשרת לאימות 2FA עם guestSessionId
      const response = await AuthService.verify2FA(formData.verificationCode, guestSessionId);

      if (response.success && response.data?.user) {
        dispatch(verify2FASuccess(response.data.user));
        
        // ✅ עדכון הסל ב-Redux אם חזר סל מאוחד מהשרת
        if (response.data.cart) {
          dispatch(setCart(response.data.cart));
          console.log('✅ Cart merged after 2FA and updated in Redux:', response.data.cart);
        }
        
        onSuccess?.();
      } else {
        dispatch(verify2FAFailure(response.message || 'שגיאה באימות 2FA'));
      }
    } catch (error) {
      console.error('Verify 2FA error:', error);
      dispatch(verify2FAFailure('שגיאה באימות 2FA'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // טיפול בביטול
  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <div className={styles.verify2FAForm}>
      <div className={styles.header}>
        <Typography variant="h3" align="center">
          אימות דו-שלבי
        </Typography>
        <Typography variant="body2" align="center" color="secondary">
          הזן את הקוד מהאפליקציית אימות שלך
        </Typography>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <Input
            label="קוד אימות (6 ספרות)"
            type="text"
            value={formData.verificationCode}
            onChange={handleInputChange('verificationCode')}
            error={!!errors.verificationCode}
            placeholder="הזן את הקוד מהאפליקציה"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className={styles.buttonGroup}>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || authState.isLoading}
          >
            {isSubmitting ? 'מאמת...' : 'אמת קוד'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting || authState.isLoading}
          >
            ביטול
          </Button>
        </div>
      </form>

      {authState.error && (
        <div className={styles.errorMessage}>
          <Typography variant="body2" color="error" align="center">
            {authState.error}
          </Typography>
        </div>
      )}
    </div>
  );
};

export default Verify2FAForm;
