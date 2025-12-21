import React, { useState } from 'react';
import { Button, Typography } from '../../../../components/ui';
import { Input } from '../../../../components/ui';
import styles from './PasswordReset.module.css';

// הגדרת טיפוסים
interface PasswordResetData {
  email: string;
}

interface PasswordResetProps {
  onSuccess?: () => void;
  onBackToLogin?: () => void;
}

// רכיב שחזור סיסמה
const PasswordReset: React.FC<PasswordResetProps> = ({
  onSuccess,
  onBackToLogin,
}) => {
  // ניהול מצב הטופס
  const [formData, setFormData] = useState<PasswordResetData>({
    email: '',
  });

  const [errors, setErrors] = useState<Partial<PasswordResetData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // טיפול בשינויים בשדות
  const handleInputChange = (field: keyof PasswordResetData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // ניקוי שגיאה כשמשתמש מתחיל להקליד
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // ולידציה
  const validateForm = (): boolean => {
    const newErrors: Partial<PasswordResetData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'אימייל הוא שדה חובה';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'אימייל לא תקין';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // טיפול בשליחת הטופס
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // סימולציה של שליחת אימייל
      await new Promise(resolve => setTimeout(resolve, 2000));

      // הצלחה
      setIsSuccess(true);
      onSuccess?.();
    } catch (error) {
      console.error('Password reset error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // אם נשלח בהצלחה
  if (isSuccess) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successIcon}>✅</div>
        <Typography variant="h2" align="center">
          אימייל נשלח בהצלחה!
        </Typography>
        <Typography variant="body1" align="center" color="secondary">
          שלחנו לך קישור לאיפוס הסיסמה לכתובת:
        </Typography>
        <Typography variant="body1" align="center" className={styles.emailHighlight}>
          {formData.email}
        </Typography>
        <Typography variant="body2" align="center" color="secondary">
          בדוק את תיבת הדואר שלך ולחץ על הקישור כדי לאפס את הסיסמה.
        </Typography>

        <div className={styles.successActions}>
          <Button
            variant="primary"
            onClick={onBackToLogin}
          >
            חזרה לכניסה
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.resetContainer}>
      {/* כותרת */}
      <div className={styles.header}>
        <Typography variant="h2" align="center">
          שחזור סיסמה
        </Typography>
        <Typography variant="body1" align="center" color="secondary">
          הכנס את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
        </Typography>
      </div>

      {/* טופס */}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {/* שדה אימייל */}
        <div className={styles.fieldGroup}>
          <Input
            type="email"
            placeholder="הכנס את כתובת האימייל שלך"
            value={formData.email}
            onChange={handleInputChange('email')}
            error={!!errors.email}
            helperText={errors.email}
            disabled={isSubmitting}
            required
            aria-label="אימייל לשחזור סיסמה"
          />
        </div>

        {/* כפתור שליחה */}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'שולח...' : 'שלח קישור איפוס'}
        </Button>

        {/* קישור חזרה לכניסה */}
        <div className={styles.backToLogin}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={onBackToLogin}
            disabled={isSubmitting}
          >
            חזרה לכניסה
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordReset;
