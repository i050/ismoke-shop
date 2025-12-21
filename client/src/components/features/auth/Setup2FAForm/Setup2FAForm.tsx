import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import { setup2FAStart, setup2FASuccess, setup2FAFailure } from '../../../../store/slices/authSlice';
import { Button, Typography, Input } from '../../../../components/ui';
import { AuthService } from '../../../../services/authService';
import styles from './Setup2FAForm.module.css';

// הגדרת טיפוסים
interface Setup2FAData {
  verificationCode: string;
}

interface Setup2FAFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// רכיב טופס הגדרת 2FA
const Setup2FAForm: React.FC<Setup2FAFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  // ניהול מצב הטופס
  const [formData, setFormData] = useState<Setup2FAData>({
    verificationCode: '',
  });

  const [errors, setErrors] = useState<Partial<Setup2FAData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redux
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  // טיפול בשינויים בשדות
  const handleInputChange = (field: keyof Setup2FAData) => (
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
    const newErrors: Partial<Setup2FAData> = {};
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
    dispatch(setup2FAStart());

    try {
      // קריאה אמיתית לשרת להגדרת 2FA
      const response = await AuthService.setup2FA(formData.verificationCode);

      if (response.success) {
        dispatch(setup2FASuccess());
        onSuccess?.();
      } else {
        dispatch(setup2FAFailure(response.message || 'שגיאה בהגדרת 2FA'));
      }
    } catch (error) {
      console.error('Setup 2FA error:', error);
      dispatch(setup2FAFailure('שגיאה בהגדרת 2FA'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // טיפול בביטול
  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <div className={styles.setup2FAForm}>
      <div className={styles.header}>
        <Typography variant="h3" align="center">
          הגדרת אימות דו-שלבי
        </Typography>
        <Typography variant="body2" align="center" color="secondary">
          סרוק את קוד ה-QR עם אפליקציית אימות כמו Google Authenticator
        </Typography>
      </div>

      {/* כאן יהיה ה-QR code */}
      <div className={styles.qrCodeContainer}>
        <div className={styles.qrCodePlaceholder}>
          <Typography variant="body1" align="center">
            QR Code יוצג כאן
          </Typography>
        </div>
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
            {isSubmitting ? 'מגדיר...' : 'הגדר 2FA'}
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

export default Setup2FAForm;