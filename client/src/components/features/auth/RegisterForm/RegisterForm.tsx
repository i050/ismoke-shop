import React, { useState } from 'react';
import { useAppDispatch } from '../../../../hooks/reduxHooks';
import { loginSuccess } from '../../../../store/slices/authSlice';
import { AuthService } from '../../../../services/authService';
import { Input, Button, Icon } from '../../../../components/ui';
import styles from './RegisterForm.module.css';

// הגדרת טיפוסים
interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

interface RegisterFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

// סטטוס לאחר הרשמה
type RegistrationStatus = 'idle' | 'pending_approval' | 'success';

// רכיב טופס הרשמה
const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  // ניהול מצב הטופס
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>('idle');
  const [pendingEmail, setPendingEmail] = useState<string>('');

  // Redux
  const dispatch = useAppDispatch();

  // טיפול בשינויים בשדות
  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'acceptTerms' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // ניקוי שגיאה כשמשתמש מתחיל להקליד
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // ולידציה מקיפה
  const validateForm = (): boolean => {
    const newErrors: RegisterFormErrors = {};

    // ולידציה שם פרטי
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'שם פרטי הוא שדה חובה';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'שם פרטי חייב להכיל לפחות 2 תווים';
    }

    // ולידציה שם משפחה
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'שם משפחה הוא שדה חובה';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'שם משפחה חייב להכיל לפחות 2 תווים';
    }

    // ולידציה אימייל
    if (!formData.email.trim()) {
      newErrors.email = 'אימייל הוא שדה חובה';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'אימייל לא תקין';
    }

    // ולידציה סיסמה
    if (!formData.password.trim()) {
      newErrors.password = 'סיסמה היא שדה חובה';
    } else if (formData.password.length < 8) {
      newErrors.password = 'סיסמה חייבת להכיל לפחות 8 תווים';
    }

    // ולידציה אישור סיסמה
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'אישור סיסמה הוא שדה חובה';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'הסיסמאות לא תואמות';
    }

    // ולידציה תנאי שימוש
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'חובה לקבל את תנאי השימוש';
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
      // קריאה אמיתית לשרת דרך AuthService
      const response = await AuthService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      });

      // בדיקה אם נדרש אישור מנהל - Type Guard
      if ('pendingApproval' in response.data && response.data.pendingApproval) {
        setRegistrationStatus('pending_approval');
        setPendingEmail(response.data.email);
        return;
      }

      // הצלחה - שמירת הנתונים ב-Redux
      // TypeScript יודע שאם הגענו לכאן, זה חייב להיות AuthResponse (לא PendingApprovalResponse)
      if ('user' in response.data && 'token' in response.data) {
        dispatch(loginSuccess(response.data.user));
        setRegistrationStatus('success');
        onSuccess?.();
      }
    } catch (error) {
      // טיפול בשגיאות מהשרת
      console.error('Registration error:', error);
      // כאן אפשר להוסיף טיפול שגיאות יותר מתקדם
    } finally {
      setIsSubmitting(false);
    }
  };

  // אם ההרשמה ממתינה לאישור מנהל
  if (registrationStatus === 'pending_approval') {
    return (
      <div className={styles.formWrapper}>
        <div className={styles.pendingApproval}>
          <div className={styles.pendingIcon} aria-hidden="true"><Icon name="Mail" size={48} /></div>
          <h3 className={styles.pendingTitle}>בקשתך נשלחה!</h3>
          <p className={styles.pendingMessage}>
            בקשתך להרשמה נשלחה למנהל החנות.
            <br />
            תקבל הודעה לכתובת <strong>{pendingEmail}</strong> כאשר חשבונך יאושר.
          </p>
          <Button
            variant="secondary"
            onClick={onSwitchToLogin}
          >
            חזרה לדף ההתחברות
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formWrapper}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* שדות שם */}
      <div className={styles.nameFields}>
        <div className={styles.fieldGroup}>
          <Input
            type="text"
            placeholder="שם פרטי"
            value={formData.firstName}
            onChange={handleInputChange('firstName')}
            error={!!errors.firstName}
            helperText={errors.firstName}
            disabled={isSubmitting}
            required
            aria-label="שם פרטי"
          />
        </div>

        <div className={styles.fieldGroup}>
          <Input
            type="text"
            placeholder="שם משפחה"
            value={formData.lastName}
            onChange={handleInputChange('lastName')}
            error={!!errors.lastName}
            helperText={errors.lastName}
            disabled={isSubmitting}
            required
            aria-label="שם משפחה"
          />
        </div>
      </div>

      {/* שדה אימייל */}
      <div className={styles.fieldGroup}>
        <Input
          type="email"
          placeholder="הכנס אימייל"
          value={formData.email}
          onChange={handleInputChange('email')}
          error={!!errors.email}
          helperText={errors.email}
          disabled={isSubmitting}
          required
          aria-label="אימייל"
        />
      </div>

      {/* שדה סיסמה */}
      <div className={styles.fieldGroup}>
        <Input
          type="password"
          placeholder="הכנס סיסמה (8 תווים לפחות)"
          value={formData.password}
          onChange={handleInputChange('password')}
          error={!!errors.password}
          helperText={errors.password}
          disabled={isSubmitting}
          required
          aria-label="סיסמה"
        />
      </div>

      {/* שדה אישור סיסמה */}
      <div className={styles.fieldGroup}>
        <Input
          type="password"
          placeholder="אשר סיסמה"
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword}
          disabled={isSubmitting}
          required
          aria-label="אישור סיסמה"
        />
      </div>

      {/* תיבת סימון תנאי שימוש */}
      <div className={styles.checkboxGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={formData.acceptTerms}
            onChange={handleInputChange('acceptTerms')}
            disabled={isSubmitting}
            required
          />
          <span className={styles.checkboxText}>
            אני מסכים ל
            <button type="button" className={styles.linkButton}>
              תנאי השימוש
            </button>
            ו
            <button type="button" className={styles.linkButton}>
              מדיניות הפרטיות
            </button>
          </span>
        </label>
        {errors.acceptTerms && (
          <div className={styles.errorText}>{errors.acceptTerms}</div>
        )}
      </div>

      {/* כפתור הרשמה */}
      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'נרשם...' : 'הירשם'}
      </Button>

      {/* מפריד */}
      {/* <AuthDivider /> */}

      {/* כפתורי התחברות חברתית */}
      {/* <SocialLoginButtons
        onGoogleLogin={() => handleSocialLogin('Google')}
        onAppleLogin={() => handleSocialLogin('Apple')}
        onFacebookLogin={() => handleSocialLogin('Facebook')}
      /> */}

      {/* קישור לכניסה */}
      <div className={styles.switchMode}>
        <span>כבר יש לך חשבון? </span>
        <button
          type="button"
          className={styles.linkButton}
          onClick={onSwitchToLogin}
          disabled={isSubmitting}
        >
          התחבר כאן
        </button>
      </div>
    </form>
    </div>
  );
};

export default RegisterForm;
