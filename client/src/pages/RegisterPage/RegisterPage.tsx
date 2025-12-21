import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/reduxHooks';
import { RegisterForm } from '../../components/features/auth';
import { AuthCard } from '../../components/features/auth';
import { Typography, Button } from '../../components/ui';
import styles from './RegisterPage.module.css';

const RegisterPage = () => {
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

  // טיפול בהצלחה - מפנה לדף הבית או למיקום המקורי
  const handleRegisterSuccess = () => {
    const from = location.state?.from?.pathname || '/';
    navigate(from, { replace: true });
  };

  // טיפול במעבר להתחברות
  const handleSwitchToLogin = () => {
    navigate('/login', { state: { from: location.state?.from } });
  };

  return (
    <div className={styles.registerPage}>
      <div className={styles.container}>
        {/* כותרת */}
        <div className={styles.header}>
          <Typography variant="h1" align="center">
            הרשמה
          </Typography>
          <Typography variant="body1" align="center" color="secondary">
            צור חשבון חדש והצטרף אלינו!
          </Typography>
        </div>

        {/* טופס הרשמה */}
        <div className={styles.formContainer}>
          <AuthCard title="יצירת חשבון חדש">
            <RegisterForm
              onSuccess={handleRegisterSuccess}
              onSwitchToLogin={handleSwitchToLogin}
            />
          </AuthCard>
        </div>

        {/* קישור חזרה לדף הבית - שימוש ברכיב Button מהערכת ה-UI */}
        <div className={styles.backLink}>
          <Button
            variant="ghost"
            size="md"
            aria-label="חזרה לדף הבית"
            onClick={() => navigate('/')}
          >
            ← חזרה לדף הבית
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
