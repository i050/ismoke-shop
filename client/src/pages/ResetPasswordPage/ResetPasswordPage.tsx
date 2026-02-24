import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Input, Card } from '../../components/ui';
import { AuthService } from '../../services/authService';
import styles from './ResetPasswordPage.module.css';

// הגדרת טיפוסים
interface ResetPasswordData {
  password: string;
  confirmPassword: string;
}

interface ResetPasswordFormProps {
  onSuccess?: () => void;
}

// רכיב דף איפוס סיסמה
const ResetPasswordPage: React.FC<ResetPasswordFormProps> = ({
  onSuccess,
}) => {
  // ניהול מצב הטופס
  const [formData, setFormData] = useState<ResetPasswordData>({
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Partial<ResetPasswordData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [token, setToken] = useState<string>('');

  // React Router hooks
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // קבלת token מה-URL בטעינת הקומפוננטה
  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (resetToken) {
      setToken(resetToken);
    } else {
      setErrors({ password: 'קישור איפוס לא תקין או פג תוקף' });
    }
  }, [searchParams]);

  // טיפול בשינויים בשדות
  const handleInputChange = (field: keyof ResetPasswordData) => (
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
    const newErrors: Partial<ResetPasswordData> = {};

    if (!formData.password.trim()) {
      newErrors.password = 'נא להזין סיסמה חדשה';
    } else if (formData.password.length < 8) {
      newErrors.password = 'הסיסמה חייבת להכיל לפחות 8 תווים';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'נא לאשר את הסיסמה';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'הסיסמאות לא תואמות';
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
      // קריאה לשרת לאיפוס סיסמה
      const response = await AuthService.resetPassword(token, formData.password);

      if (response.success) {
        setIsSuccess(true);
        onSuccess?.();
      } else {
        setErrors({ password: response.message || 'שגיאה באיפוס הסיסמה. הקישור עשוי להיות פג תוקף.' });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setErrors({ password: 'שגיאה באיפוס הסיסמה. הקישור עשוי להיות פג תוקף.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // טיפול בחזרה להתחברות
  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className={styles.resetPasswordPage}>
      <div className={styles.container}>
        <Card className={styles.formCard}>
          {!isSuccess ? (
            <>
              {/* כותרת */}
              <div className={styles.header}>
                <Typography variant="h2" align="center">
                  איפוס סיסמה
                </Typography>
                <Typography variant="body2" align="center" color="secondary">
                  הזן סיסמה חדשה לחשבון שלך
                </Typography>
              </div>

              {/* טופס */}
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <Input
                    label="סיסמה חדשה"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    error={!!errors.password}
                    placeholder="הזן סיסמה חדשה"
                    disabled={isSubmitting}
                    required
                  />
                  {errors.password && (
                    <Typography variant="body2" color="error" className={styles.errorText}>
                      {errors.password}
                    </Typography>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <Input
                    label="אישור סיסמה"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    error={!!errors.confirmPassword}
                    placeholder="הזן שוב את הסיסמה"
                    disabled={isSubmitting}
                    required
                  />
                  {errors.confirmPassword && (
                    <Typography variant="body2" color="error" className={styles.errorText}>
                      {errors.confirmPassword}
                    </Typography>
                  )}
                </div>

                <div className={styles.buttonGroup}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !token}
                  >
                    {isSubmitting ? 'מאפס...' : 'אפס סיסמה'}
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
                הסיסמה אופסה בהצלחה!
              </Typography>
              <Typography variant="body1" align="center">
                הסיסמה שלך שונתה. כעת תוכל להתחבר עם הסיסמה החדשה.
              </Typography>

              <div className={styles.successActions}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleBackToLogin}
                >
                  התחבר עכשיו
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
