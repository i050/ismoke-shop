import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/reduxHooks';
import { LoginForm } from '../../components/features/auth';
import { AuthCard } from '../../components/features/auth';
import { Typography, Button } from '../../components/ui';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // אם המשתמש כבר מחובר, מפנה לדף הבית או למיקום המקורי
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location.state?.from?.pathname, navigate]);

  // אם מחובר, לא מציג את הטופס עד שה-navigate יתבצע
  if (isAuthenticated) {
    return null;
  }

  // טיפול בהצלחה - מפנה למיקום המקורי או לדף הבית
  const handleLoginSuccess = () => {
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

  // טיפול במעבר להרשמה
  const handleSwitchToRegister = () => {
    navigate('/register', { state: { from: location.state?.from } });
  };

  // טיפול בשכחתי סיסמה
  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.container}>
        {/* כותרת */}
        <div className={styles.header}>
          <Typography variant="h1" align="center">
            התחברות
          </Typography>
          <Typography variant="body1" align="center" color="secondary">
            ברוכים הבאים! אנא הכנס את פרטי ההתחברות שלך
          </Typography>
        </div>

        {/* טופס התחברות */}
        <div className={styles.formContainer}>
          <AuthCard title="התחברות לחשבון">
            <LoginForm
              onSuccess={handleLoginSuccess}
              onSwitchToRegister={handleSwitchToRegister}
              onForgotPassword={handleForgotPassword}
            />
          </AuthCard>
        </div>

        {/* קישור חזרה לדף הבית - משתמש ברכיב הכפתור מהערכת ה-UI במקום <button> גלמי */}
        <div className={styles.backLink}>
          <Button
            variant="ghost"
            size="md"
            aria-label="חזרה לדף הבית"
            onClick={() => navigate('/')}>
            ← חזרה לדף הבית
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
