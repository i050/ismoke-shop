import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import { loginStart, loginSuccess, loginFailure } from '../../../../store/slices/authSlice';
import { setCart } from '../../../../store/slices/cartSlice';
import { AuthService } from '../../../../services/authService';
import { Input, Button } from '../../../../components/ui';
import { useToast } from '../../../../hooks/useToast';
import styles from './LoginForm.module.css';

// הגדרת טיפוסים
interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

// שלבי התחברות
type LoginStep = 'credentials' | 'otp';

// רכיב טופס התחברות
const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  onForgotPassword,
}) => {
  // ניהול מצב הטופס
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // מצב OTP
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [otpUserId, setOtpUserId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isResendingOTP, setIsResendingOTP] = useState(false);

  // Redux
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const { showToast } = useToast();

  // טיפול בשינויים בשדות
  const handleInputChange = (field: keyof LoginFormData) => (
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
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'אימייל הוא שדה חובה';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'אימייל לא תקין';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'סיסמה היא שדה חובה';
    } else if (formData.password.length < 6) {
      newErrors.password = 'סיסמה חייבת להכיל לפחות 6 תווים';
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
    dispatch(loginStart());

    try {
      // קבל את guestSessionId מ-localStorage (אם משתמש אורח קיים)
      const guestSessionId = localStorage.getItem('sessionId') || undefined;
      
      // קריאה אמיתית לשרת דרך AuthService עם guestSessionId
      const response = await AuthService.login({
        email: formData.email,
        password: formData.password,
        guestSessionId
      });

      // בדיקה אם נדרש OTP
      if (response.data && 'requiresLoginOTP' in response.data && response.data.requiresLoginOTP) {
        // Cast to the correct type for OTP response
        const otpData = response.data as unknown as { userId: string; requiresLoginOTP: boolean };
        setOtpUserId(otpData.userId);
        setLoginStep('otp');
        showToast('info', 'קוד אימות נשלח למייל שלך');
        dispatch(loginFailure('')); // Reset loading state without error
        return;
      }

      // הצלחה - שמירת המשתמש ב-Redux (רק אם יש user בתגובה)
      if ('user' in response.data) {
        dispatch(loginSuccess(response.data.user));
        
        // ✅ עדכון הסל ב-Redux אם חזר סל מאוחד מהשרת
        if (response.data.cart) {
          dispatch(setCart(response.data.cart));
          console.log('✅ Cart merged and updated in Redux:', response.data.cart);
        }

        onSuccess?.();
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // בדיקה אם השגיאה היא 403 (חשבון ממתין לאישור)
      if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
        const errorMessage = 'message' in error && typeof error.message === 'string' 
          ? error.message 
          : 'החשבון שלך ממתין לאישור מנהל החנות';
        
        showToast('warning', errorMessage, { duration: 2000 });
        dispatch(loginFailure(errorMessage));
      } else {
        dispatch(loginFailure('שגיאה בכניסה - בדוק את הפרטים ונסה שוב'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // טיפול בשליחת OTP
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode.trim()) {
      setOtpError('נא להזין את קוד האימות');
      return;
    }

    if (otpCode.length !== 6) {
      setOtpError('קוד האימות חייב להכיל 6 ספרות');
      return;
    }

    if (!otpUserId) {
      setOtpError('שגיאה - נסה להתחבר מחדש');
      return;
    }

    setIsSubmitting(true);
    setOtpError(null);

    try {
      const guestSessionId = localStorage.getItem('sessionId') || undefined;
      
      const response = await AuthService.loginWithOTP({
        userId: otpUserId,
        otpCode: otpCode,
        guestSessionId
      });

      // הצלחה - שמירת המשתמש ב-Redux
      dispatch(loginSuccess(response.data.user));
      
      // ✅ עדכון הסל ב-Redux אם חזר סל מאוחד מהשרת
      if (response.data.cart) {
        dispatch(setCart(response.data.cart));
      }

      showToast('success', 'התחברת בהצלחה!');
      onSuccess?.();
    } catch (error) {
      console.error('OTP verification error:', error);
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message)
        : 'קוד אימות שגוי';
      setOtpError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // שליחה מחדש של OTP
  const handleResendOTP = async () => {
    if (!otpUserId || isResendingOTP) return;
    
    setIsResendingOTP(true);
    setOtpError(null);
    
    try {
      await AuthService.resendLoginOTP(otpUserId);
      showToast('success', 'קוד אימות חדש נשלח למייל שלך');
    } catch (error) {
      console.error('Resend OTP error:', error);
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message)
        : 'שגיאה בשליחת קוד חדש';
      setOtpError(errorMessage);
    } finally {
      setIsResendingOTP(false);
    }
  };

  // חזרה לשלב הקודם
  const handleBackToCredentials = () => {
    setLoginStep('credentials');
    setOtpUserId(null);
    setOtpCode('');
    setOtpError(null);
  };

  // שלב OTP - הזנת קוד אימות
  if (loginStep === 'otp') {
    return (
      <form className={styles.form} onSubmit={handleOTPSubmit} noValidate>
        <div className={styles.otpHeader}>
          <h3 className={styles.otpTitle}>קוד אימות</h3>
          <p className={styles.otpDescription}>
            קוד אימות בן 6 ספרות נשלח למייל שלך
          </p>
        </div>

        <div className={styles.fieldGroup}>
          <Input
            type="text"
            placeholder="הזן קוד אימות"
            value={otpCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtpCode(value);
              setOtpError(null);
            }}
            error={!!otpError}
            helperText={otpError || ''}
            disabled={isSubmitting}
            required
            aria-label="קוד אימות"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || otpCode.length !== 6}
        >
          {isSubmitting ? 'מאמת...' : 'אימות והתחברות'}
        </Button>

        <div className={styles.otpActions}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={handleResendOTP}
            disabled={isResendingOTP}
          >
            {isResendingOTP ? 'שולח...' : 'שלח קוד חדש'}
          </button>
          
          <button
            type="button"
            className={styles.linkButton}
            onClick={handleBackToCredentials}
            disabled={isSubmitting}
          >
            חזרה להתחברות
          </button>
        </div>
      </form>
    );
  }

  // שלב רגיל - הזנת אימייל וסיסמה
  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
          placeholder="הכנס סיסמה"
          value={formData.password}
          onChange={handleInputChange('password')}
          error={!!errors.password}
          helperText={errors.password}
          disabled={isSubmitting}
          required
          aria-label="סיסמה"
        />
      </div>

      {/* שגיאות כלליות */}
      {authState.error && (
        <div className={styles.errorMessage}>
          {authState.error}
        </div>
      )}

      {/* כפתור שכחתי סיסמה */}
      <div className={styles.forgotPassword}>
        <button
          type="button"
          className={styles.linkButton}
          onClick={onForgotPassword}
          disabled={isSubmitting}
        >
          שכחתי סיסמה
        </button>
      </div>

      {/* כפתור התחברות */}
      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting || authState.isLoading}
      >
        {isSubmitting || authState.isLoading ? 'מתחבר...' : 'התחבר'}
      </Button>

      {/* מפריד */}
      {/* <AuthDivider /> */}

      {/* כפתורי התחברות חברתית */}
      {/* <SocialLoginButtons
        onGoogleLogin={() => handleSocialLogin('Google')}
        onAppleLogin={() => handleSocialLogin('Apple')}
        onFacebookLogin={() => handleSocialLogin('Facebook')}
      /> */}

      {/* קישור להרשמה */}
      <div className={styles.switchMode}>
        <span>אין לך חשבון? </span>
        <button
          type="button"
          className={styles.linkButton}
          onClick={onSwitchToRegister}
          disabled={isSubmitting}
        >
          הירשם כאן
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
