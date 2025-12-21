import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/reduxHooks.ts';
import { loginSuccess } from '../../store/slices/authSlice';
import { Button, Typography, Card, Modal, Input } from '@ui';
import { Icon } from '../../components/ui/Icon';
import { AuthService } from '../../services/authService';
import { setUser } from '../../utils/tokenUtils';
import Setup2FAForm from '@features/auth/Setup2FAForm/Setup2FAForm.tsx';
import Disable2FA from '@features/auth/Disable2FA/Disable2FA.tsx';
import EditProfileForm from '@features/profile/EditProfileForm';
import styles from './ProfilePage.module.css';

// הגדרת טיפוסים לשינוי סיסמה
interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// רכיב דף פרופיל משתמש
const ProfilePage: React.FC = () => {
  // ניהול מצב מודלים
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // ניהול מצב שינוי סיסמה
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Partial<PasswordChangeData>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux - קבלת פרטי המשתמש
  const user = useAppSelector(state => state.auth.user);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  // רענון נתוני המשתמש מהשרת
  useEffect(() => {
    const refreshProfile = async () => {
      if (isAuthenticated) {
        try {
          const response = await AuthService.getProfile();
          if (response.success && response.data) {
            setUser(response.data.user);
            // עדכון Redux עם הנתונים החדשים
            dispatch(loginSuccess(response.data.user));
          }
        } catch (error) {
          console.error('Error refreshing profile:', error);
        }
      }
    };

    refreshProfile();
  }, [isAuthenticated, dispatch]);

  // אם המשתמש לא מחובר
  if (!isAuthenticated || !user) {
    return (
      <div className={styles.profilePage}>
        <Typography variant="h2" align="center">
          אנא התחבר כדי לצפות בפרופיל
        </Typography>
      </div>
    );
  }

  // טיפול בהצלחה הגדרת 2FA
  const handleSetup2FASuccess = () => {
    setShowSetup2FA(false);
    // אפשר להוסיף הודעת הצלחה או רענון נתונים
  };

  // טיפול בביטול הגדרת 2FA
  const handleSetup2FACancel = () => {
    setShowSetup2FA(false);
  };

  // טיפול בהצלחה עדכון פרופיל
  const handleEditProfileSuccess = () => {
    setShowEditProfile(false);
  };

  // טיפול בביטול עדכון פרופיל
  const handleEditProfileCancel = () => {
    setShowEditProfile(false);
  };

  // טיפול בהצלחה ביטול 2FA
  const handleDisable2FASuccess = () => {
    // אפשר להוסיף הודעת הצלחה או רענון נתונים
  };

  // טיפול בשגיאה בביטול 2FA
  const handleDisable2FAError = (error: string) => {
    console.error('Disable 2FA error:', error);
    // אפשר להציג הודעת שגיאה למשתמש
  };

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
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'הסיסמה חייבת להכיל לפחות 6 תווים';
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
  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
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

  return (
    <div className={styles.profilePage}>
      {/* מיכל אנימציית כניסה - משפר תחושת חיות בדף */}
      <div className={`${styles.container} ${styles.animatedContainer}`}>
        {/* כותרת הדף */}
        <div className={styles.header}>
          <Typography variant="h1" align="center">
            פרופיל משתמש
          </Typography>
        </div>

        {/* פרטי המשתמש */}
        {/* כרטיס משתמש - כניסה ועדכון קל למראה חיי */}
        <Card className={`${styles.userInfoCard} ${styles.cardAnimated}`}>
          <div className={styles.cardHeader}>
            <Typography variant="h3" className={`${styles.cardTitle} ${styles.titleAnimated}`}>
              פרטים אישיים
            </Typography>
            {/* כפתור עריכה עם מיקרו-אינטראקציה */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditProfile(true)}
              className={`${styles.editBtn} ${styles.btnInteractive}`}
            >
              <span className={styles.iconWrap}><Icon name="Edit" size={16} /></span> ערוך פרופיל
            </Button>
          </div>

          <div className={styles.userDetails}>
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

            {user.phone && (
              <div className={styles.detailRow}>
                <Typography variant="body1" className={styles.label}>
                  טלפון:
                </Typography>
                <Typography variant="body1">
                  {user.phone}
                </Typography>
              </div>
            )}

            {user.address && (user.address.street || user.address.city) && (
              <div className={styles.detailRow}>
                <Typography variant="body1" className={styles.label}>
                  כתובת:
                </Typography>
                <Typography variant="body1">
                  {[
                    user.address.street,
                    user.address.city,
                    user.address.state,
                    user.address.postalCode,
                    user.address.country
                  ].filter(Boolean).join(', ')}
                </Typography>
              </div>
            )}

            <div className={styles.detailRow}>
              <Typography variant="body1" className={styles.label}>
                תפקיד:
              </Typography>
              <Typography variant="body1">
                {user.role === 'customer' ? 'לקוח' :
                 user.role === 'admin' ? 'מנהל' : 'סופר מנהל'}
              </Typography>
            </div>

            <div className={styles.detailRow}>
              <Typography variant="body1" className={styles.label}>
                סטטוס חשבון:
              </Typography>
              <Typography variant="body1">
                {user.isActive ? 'פעיל' : 'לא פעיל'}
              </Typography>
            </div>
          </div>
        </Card>

        {/* קישורים מהירים */}
        <Card className={styles.quickLinksCard}>
          <Typography variant="h3" className={styles.cardTitle}>
            קישורים מהירים
          </Typography>
          <div className={styles.quickLinks}>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/orders')}
              className={styles.quickLinkBtn}
            >
              <Icon name="Package" size={18} /> ההזמנות שלי
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/cart')}
              className={styles.quickLinkBtn}
            >
              <Icon name="ShoppingCart" size={18} /> סל הקניות
            </Button>
          </div>
        </Card>

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
                <Icon name="Lock" size={16} /> שנה סיסמה
              </Button>
            </div>

            {/* אימות דו-שלבי */}
            {/* <div className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <Typography variant="h4">
                  אימות דו-שלבי (2FA)
                </Typography>
                <div className={styles.statusIndicator}>
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
            </div> */}
          </div>
        </Card>
      </div>

      {/* מודל שינוי סיסמה */}
      <Modal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        title="שינוי סיסמה"
      >
        <form onSubmit={handleSubmitPasswordChange} className={styles.passwordForm}>
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

      {/* מודל עריכת פרופיל */}
      <Modal
        isOpen={showEditProfile}
        onClose={handleEditProfileCancel}
        title="עריכת פרופיל"
      >
        <EditProfileForm
          onSuccess={handleEditProfileSuccess}
          onCancel={handleEditProfileCancel}
        />
      </Modal>
    </div>
  );
};

export default ProfilePage;
