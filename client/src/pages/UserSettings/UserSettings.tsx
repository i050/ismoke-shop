import React, { useState } from 'react';
import { useAppSelector } from '../../hooks/reduxHooks';
import { Button, Typography, Card, Modal, Input } from '../../components/ui';
import { AuthService } from '../../services/authService';
import Setup2FAForm from '@features/auth/Setup2FAForm/Setup2FAForm';
import Disable2FA from '@features/auth/Disable2FA/Disable2FA';
import styles from './UserSettings.module.css';

// הגדרת טיפוסים
interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UserSettingsProps {
  onSuccess?: () => void;
}

// רכיב דף הגדרות משתמש
const UserSettings: React.FC<UserSettingsProps> = ({
  onSuccess,
}) => {
  // ניהול מצב מודלים
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // ניהול מצב שינוי סיסמה
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Partial<PasswordChangeData>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Redux - קבלת פרטי המשתמש
  const user = useAppSelector(state => state.auth.user);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  // אם המשתמש לא מחובר
  if (!isAuthenticated || !user) {
    return (
      <div className={styles.userSettings}>
        <Typography variant="h2" align="center">
          אנא התחבר כדי לצפות בהגדרות
        </Typography>
      </div>
    );
  }

  // טיפול בשינויים בשדות סיסמה
  const handlePasswordChange = (field: keyof PasswordChangeData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setPasswordData(prev => ({ ...prev, [field]: value }));

    // ניקוי שגיאה כשמשתמש מתחיל להקליד
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // ולידציה של שינוי סיסמה
  const validatePasswordForm = (): boolean => {
    const newErrors: Partial<PasswordChangeData> = {};

    if (!passwordData.currentPassword.trim()) {
      newErrors.currentPassword = 'נא להזין סיסמה נוכחית';
    }

    if (!passwordData.newPassword.trim()) {
      newErrors.newPassword = 'נא להזין סיסמה חדשה';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'הסיסמה חייבת להכיל לפחות 8 תווים';
    }

    if (!passwordData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'נא לאשר את הסיסמה';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'הסיסמאות לא תואמות';
    }

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      return false;
    }

    return true;
  };

  // טיפול בשינוי סיסמה
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsChangingPassword(true);

    try {
      // קריאה לשרת לשינוי סיסמה
      const response = await AuthService.changePassword(passwordData.currentPassword, passwordData.newPassword);

      if (response.success) {
        setShowChangePassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        onSuccess?.();
      } else {
        setPasswordErrors({ currentPassword: response.message || 'שגיאה בשינוי הסיסמה' });
      }
    } catch (error) {
      console.error('Change password error:', error);
      setPasswordErrors({ currentPassword: 'שגיאה בשינוי הסיסמה' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // טיפול בהצלחה הגדרת 2FA
  const handleSetup2FASuccess = () => {
    setShowSetup2FA(false);
  };

  // טיפול בביטול הגדרת 2FA
  const handleSetup2FACancel = () => {
    setShowSetup2FA(false);
  };

  // טיפול בהצלחה ביטול 2FA
  const handleDisable2FASuccess = () => {
    // הודעת הצלחה
  };

  // טיפול בשגיאה בביטול 2FA
  const handleDisable2FAError = (error: string) => {
    console.error('Disable 2FA error:', error);
  };

  return (
    <div className={styles.userSettings}>
      <div className={styles.container}>
        {/* כותרת הדף */}
        <div className={styles.header}>
          <Typography variant="h1" align="center">
            הגדרות משתמש
          </Typography>
        </div>

        {/* הגדרות אבטחה */}
        <Card className={styles.securityCard}>
          <Typography variant="h3" className={styles.cardTitle}>
            אבטחה וסיסמה
          </Typography>

          <div className={styles.settingsSection}>
            {/* שינוי סיסמה */}
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <Typography variant="h4">
                  שינוי סיסמה
                </Typography>
                <Typography variant="body2" color="secondary">
                  עדכן את סיסמת החשבון שלך
                </Typography>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowChangePassword(true)}
              >
                שנה סיסמה
              </Button>
            </div>

            {/* אימות דו-שלבי */}
            <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <Typography variant="h4">
                  אימות דו-שלבי (2FA)
                </Typography>
                <div className={styles.twoFactorStatus}>
                  <span className={`${styles.statusDot} ${user.twoFactorEnabled ? styles.enabled : styles.disabled}`} />
                  <Typography variant="body2">
                    {user.twoFactorEnabled ? 'מופעל' : 'כבוי'}
                  </Typography>
                </div>
              </div>
              <div className={styles.twoFactorActions}>
                {!user.twoFactorEnabled ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setShowSetup2FA(true)}
                  >
                    הגדר 2FA
                  </Button>
                ) : (
                  <Disable2FA
                    onSuccess={handleDisable2FASuccess}
                    onError={handleDisable2FAError}
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* הגדרות חשבון */}
        <Card className={styles.accountCard}>
          <Typography variant="h3" className={styles.cardTitle}>
            פרטי חשבון
          </Typography>

          <div className={styles.accountDetails}>
            <div className={styles.detailRow}>
              <Typography variant="body1" className={styles.label}>
                שם מלא:
              </Typography>
              <Typography variant="body1">
                {user.firstName} {user.lastName}
              </Typography>
            </div>

            <div className={styles.detailRow}>
              <Typography variant="body1" className={styles.label}>
                אימייל:
              </Typography>
              <Typography variant="body1">
                {user.email}
              </Typography>
            </div>

            <div className={styles.detailRow}>
              <Typography variant="body1" className={styles.label}>
                תפקיד:
              </Typography>
              <Typography variant="body1">
                {user.role === 'customer' ? 'לקוח' :
                 user.role === 'admin' ? 'מנהל' : 'סופר מנהל'}
              </Typography>
            </div>
          </div>
        </Card>
      </div>

      {/* מודל שינוי סיסמה */}
      <Modal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        title="שינוי סיסמה"
      >
        <form onSubmit={handleChangePassword} className={styles.passwordForm}>
          <div className={styles.inputGroup}>
            <Input
              label="סיסמה נוכחית"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange('currentPassword')}
              error={!!passwordErrors.currentPassword}
              placeholder="הזן סיסמה נוכחית"
              disabled={isChangingPassword}
              required
            />
            {passwordErrors.currentPassword && (
              <Typography variant="body2" color="error" className={styles.errorText}>
                {passwordErrors.currentPassword}
              </Typography>
            )}
          </div>

          <div className={styles.inputGroup}>
            <Input
              label="סיסמה חדשה"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange('newPassword')}
              error={!!passwordErrors.newPassword}
              placeholder="הזן סיסמה חדשה"
              disabled={isChangingPassword}
              required
            />
            {passwordErrors.newPassword && (
              <Typography variant="body2" color="error" className={styles.errorText}>
                {passwordErrors.newPassword}
              </Typography>
            )}
          </div>

          <div className={styles.inputGroup}>
            <Input
              label="אישור סיסמה"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange('confirmPassword')}
              error={!!passwordErrors.confirmPassword}
              placeholder="הזן שוב את הסיסמה"
              disabled={isChangingPassword}
              required
            />
            {passwordErrors.confirmPassword && (
              <Typography variant="body2" color="error" className={styles.errorText}>
                {passwordErrors.confirmPassword}
              </Typography>
            )}
          </div>

          <div className={styles.buttonGroup}>
            <Button
              type="submit"
              variant="primary"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'משנה...' : 'שנה סיסמה'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowChangePassword(false)}
              disabled={isChangingPassword}
            >
              ביטול
            </Button>
          </div>
        </form>
      </Modal>

      {/* מודל הגדרת 2FA */}
      <Modal
        isOpen={showSetup2FA}
        onClose={handleSetup2FACancel}
        title="הגדרת אימות דו-שלבי"
      >
        <Setup2FAForm
          onSuccess={handleSetup2FASuccess}
          onCancel={handleSetup2FACancel}
        />
      </Modal>
    </div>
  );
};

export default UserSettings;
