import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../../hooks/reduxHooks';
import { logout } from '../../../../store/slices/authSlice';
import { AuthService } from '../../../../services/authService';
import { Button, Typography } from '../../../../components/ui';
import { Icon } from '../../../../components/ui/Icon';
import styles from './UserProfile.module.css';

// הגדרת טיפוסים
interface UserProfileProps {
  onEditProfile?: () => void;
  onChangePassword?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
}

// רכיב פרופיל משתמש
const UserProfile: React.FC<UserProfileProps> = ({
  onEditProfile,
  onChangePassword,
  onSettings,
  onLogout,
}) => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(false);

  // טיפול ביציאה
  const handleLogout = async () => {
    console.log('🚪 Logout button clicked');
    setIsLoading(true);
    try {
      console.log('🔄 Calling AuthService.logout()...');
      await AuthService.logout();
      console.log('✅ AuthService.logout() completed');
      
      console.log('🔄 Dispatching Redux logout...');
      dispatch(logout());
      console.log('✅ Redux logout completed');
      
      onLogout?.();
      console.log('🎉 Logout process completed successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // גם אם השרת נכשל, נמשיך עם logout בצד ה-client
      dispatch(logout());
      onLogout?.();
    } finally {
      setIsLoading(false);
    }
  };

  // אם אין משתמש מחובר
  if (!authState.user) {
    return (
      <div className={styles.notLoggedIn}>
        <Typography variant="h3" align="center">
          לא מחובר למערכת
        </Typography>
        <Typography variant="body1" align="center" color="secondary">
          אנא התחבר כדי לצפות בפרופיל שלך
        </Typography>
      </div>
    );
  }

  return (
    <div className={styles.profileContainer}>
      {/* כותרת */}
      <div className={styles.header}>
        <Typography variant="h2" align="center">
          פרופיל משתמש
        </Typography>
      </div>

      {/* מידע משתמש */}
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          <div className={styles.avatarPlaceholder}>
            {authState.user.firstName.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className={styles.userDetails}>
          <Typography variant="h3" className={styles.name}>
            {`${authState.user.firstName} ${authState.user.lastName}`}
          </Typography>
          <Typography variant="body1" color="secondary" className={styles.email}>
            {authState.user.email}
          </Typography>
          <div className={styles.status}>
            <span className={`${styles.statusBadge} ${authState.user.isVerified ? styles.verified : styles.unverified}`}>
              {authState.user.isVerified ? <><Icon name="CheckCircle2" size={14} /> מאומת</> : <><Icon name="Clock" size={14} /> לא מאומת</>}
            </span>
            <span className={`${styles.statusBadge} ${authState.user.isActive ? styles.active : styles.inactive}`}>
              {authState.user.isActive ? <><span className={styles.dotActive}></span> פעיל</> : <><span className={styles.dotInactive}></span> לא פעיל</>}
            </span>
          </div>
        </div>
      </div>

      {/* פעולות */}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={onEditProfile}
        >
          <Icon name="Edit" size={16} /> עריכת פרופיל
        </Button>

        <Button
          variant="secondary"
          onClick={onSettings}
        >
          <Icon name="Settings" size={16} /> הגדרות
        </Button>

        <Button
          variant="secondary"
          onClick={onChangePassword}
        >
          <Icon name="Key" size={16} /> שינוי סיסמה
        </Button>

        <Button
          variant="secondary"
          onClick={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? 'יוצא...' : 'יציאה'}
        </Button>
      </div>
    </div>
  );
};

export default UserProfile;
