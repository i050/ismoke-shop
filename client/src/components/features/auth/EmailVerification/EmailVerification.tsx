import React, { useState } from 'react';
import { Button, Icon, Typography } from '../../../../components/ui';
import { Input } from '../../../../components/ui';
import styles from './EmailVerification.module.css';

// הגדרת טיפוסים
interface EmailVerificationData {
  verificationCode: string;
}

interface EmailVerificationProps {
  email?: string;
  onSuccess?: () => void;
  onResendCode?: () => void;
  onBackToLogin?: () => void;
}

// רכיב אימות אימייל
const EmailVerification: React.FC<EmailVerificationProps> = ({
  email = 'user@example.com',
  onSuccess,
  onResendCode,
  onBackToLogin,
}) => {
  // ניהול מצב הטופס
  const [formData, setFormData] = useState<EmailVerificationData>({
    verificationCode: '',
  });

  const [errors, setErrors] = useState<Partial<EmailVerificationData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // טיפול בשינויים בשדות
  const handleInputChange = (field: keyof EmailVerificationData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/\D/g, ''); // רק מספרים
    setFormData(prev => ({ ...prev, [field]: value }));

    // ניקוי שגיאה כשמשתמש מתחיל להקליד
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // ולידציה
  const validateForm = (): boolean => {
    const newErrors: Partial<EmailVerificationData> = {};

    if (!formData.verificationCode.trim()) {
      newErrors.verificationCode = 'קוד אימות הוא שדה חובה';
    } else if (formData.verificationCode.length !== 6) {
      newErrors.verificationCode = 'קוד אימות חייב להכיל 6 ספרות';
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
      // סימולציה של אימות הקוד
      await new Promise(resolve => setTimeout(resolve, 2000));

      // הצלחה
      onSuccess?.();
    } catch (error) {
      console.error('Email verification error:', error);
      setErrors({ verificationCode: 'קוד אימות שגוי' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // שליחה חוזרת של קוד
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);

    try {
      // סימולציה של שליחת קוד חדש
      await new Promise(resolve => setTimeout(resolve, 1500));

      // התחלת cooldown
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      onResendCode?.();
    } catch (error) {
      console.error('Resend code error:', error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={styles.verificationContainer}>
      {/* כותרת */}
      <div className={styles.header}>
        <div className={styles.icon} aria-hidden="true"><Icon name="Mail" size={40} /></div>
        <Typography variant="h2" align="center">
          אימות אימייל
        </Typography>
        <Typography variant="body1" align="center" color="secondary">
          שלחנו קוד אימות בן 6 ספרות לכתובת האימייל שלך
        </Typography>
        <Typography variant="body1" align="center" className={styles.emailHighlight}>
          {email}
        </Typography>
      </div>

      {/* טופס */}
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {/* שדה קוד אימות */}
        <div className={styles.fieldGroup}>
          <Input
            type="text"
            placeholder="הכנס קוד אימות (6 ספרות)"
            value={formData.verificationCode}
            onChange={handleInputChange('verificationCode')}
            error={!!errors.verificationCode}
            helperText={errors.verificationCode}
            disabled={isSubmitting}
            aria-label="קוד אימות"
          />
        </div>

        {/* כפתור אימות */}
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'מאמת...' : 'אמת קוד'}
        </Button>

        {/* אפשרויות נוספות */}
        <div className={styles.options}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={handleResendCode}
            disabled={isResending || resendCooldown > 0}
          >
            {isResending ? 'שולח...' :
             resendCooldown > 0 ? `שלח שוב (${resendCooldown})` :
             'שלח קוד חדש'}
          </button>

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

      {/* הוראות */}
      <div className={styles.instructions}>
        <Typography variant="body2" align="center" color="secondary">
          לא קיבלת את הקוד? בדוק את תיקיית הספאם או לחץ על "שלח קוד חדש"
        </Typography>
      </div>
    </div>
  );
};

export default EmailVerification;
