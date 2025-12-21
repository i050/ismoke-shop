import React, { useState } from 'react';
import { Button, Typography, Input, Card } from '../../components/ui';
import { AuthService } from '../../services/authService';
import styles from './ForgotPasswordPage.module.css';

// הגדרת טיפוסים
interface ForgotPasswordData {
  email: string;
}

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onBackToLogin?: () => void;
}

// רכיב דף שחזור סיסמה
const ForgotPasswordPage: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onBackToLogin,
}) => {
  // ניהול מצב הטופס
  const [formData, setFormData] = useState<ForgotPasswordData>({
    email: '',
  });

  const [errors, setErrors] = useState<Partial<ForgotPasswordData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // טיפול בשינויים בשדות
  const handleInputChange = (field: keyof ForgotPasswordData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // ניקוי שגיאה כשמשתמש מתחיל להקליד
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // ולידציה בסיסית
  const validateForm = (): boolean => {
    const newErrors: Partial<ForgotPasswordData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'נא להזין כתובת אימייל';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'נא להזין כתובת אימייל תקינה';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    return true;
  };

  // טיפול בהגשת הטופס
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // קריאה לשרת לשליחת מייל שחזור סיסמה
      const response = await AuthService.forgotPassword(formData.email);

      if (response.success) {
        setIsSuccess(true);
        onSuccess?.();
      } else {
        setErrors({ email: response.message || 'שגיאה בשליחת בקשת שחזור סיסמה' });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setErrors({ email: 'שגיאה בשליחת בקשת שחזור סיסמה' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // טיפול בחזרה לדף התחברות
  const handleBackToLogin = () => {
    onBackToLogin?.();
  };

  return (
    <div className={styles.forgotPasswordPage}>
      <div className={styles.container}>
        <Card className={styles.formCard}>
          {!isSuccess ? (
            <>
              {/* כותרת */}
              <div className={styles.header}>
                <Typography variant="h2" align="center">
                  שחזור סיסמה
                </Typography>
                <Typography variant="body2" align="center" color="secondary">
                  הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
                </Typography>
              </div>

              {/* טופס */}
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <Input
                    label="כתובת אימייל"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    error={!!errors.email}
                    placeholder="הזן את כתובת האימייל שלך"
                    disabled={isSubmitting}
                    required
                  />
                  {errors.email && (
                    <Typography variant="body2" color="error" className={styles.errorText}>
                      {errors.email}
                    </Typography>
                  )}
                </div>

                <div className={styles.buttonGroup}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'שולח...' : 'שלח קישור איפוס'}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBackToLogin}
                    disabled={isSubmitting}
                  >
                    חזרה להתחברות
                  </Button>
                </div>
              </form>
            </>
          ) : (
            /* הודעת הצלחה */
            <div className={styles.successMessage}>
              <Typography variant="h3" align="center" color="success">
                בקשה נשלחה בהצלחה!
              </Typography>
              <Typography variant="body1" align="center">
                בדוק את תיבת הדואר שלך. שלחנו לך קישור לאיפוס הסיסמה.
              </Typography>
              <Typography variant="body2" align="center" color="secondary">
                אם לא קיבלת את המייל, בדוק בתיקיית הספאם.
              </Typography>

              <div className={styles.successActions}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleBackToLogin}
                >
                  חזרה להתחברות
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
