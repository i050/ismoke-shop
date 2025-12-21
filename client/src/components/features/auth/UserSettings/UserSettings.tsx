import React, { useState } from 'react';
import { useAppSelector } from '../../../../hooks/reduxHooks';
import { Button, Typography } from '../../../../components/ui';
import { Icon } from '../../../../components/ui/Icon';
import { Checkbox } from '../../../../components/ui';
import styles from './UserSettings.module.css';

// הגדרת טיפוסים
interface UserSettingsData {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  profileVisibility: 'public' | 'friends' | 'private';
  language: 'he' | 'en';
  theme: 'light' | 'dark' | 'auto';
  twoFactorAuth: boolean;
}

interface UserSettingsProps {
  onSave?: (settings: UserSettingsData) => void;
  onCancel?: () => void;
}

// רכיב הגדרות משתמש
const UserSettings: React.FC<UserSettingsProps> = ({
  onSave,
  onCancel,
}) => {
  const authState = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // הגדרות ברירת מחדל
  const [settings, setSettings] = useState<UserSettingsData>({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    profileVisibility: 'public',
    language: 'he',
    theme: 'light',
    twoFactorAuth: false,
  });

  // טיפול בשינויים - מקבל ערך גולמי וממפה/מאמת אותו לפי המפתח
  const handleSettingChange = <K extends keyof UserSettingsData>(key: K, value: unknown) => {
    // נייצר ערך מפורמט בטוח המתאים לטיפוס של השדה
    let parsed: UserSettingsData[K];

    switch (key) {
      case 'profileVisibility': {
        const v = String(value);
        parsed = (['public', 'friends', 'private'].includes(v) ? (v as UserSettingsData[K]) : 'public' as UserSettingsData[K]);
        break;
      }
      case 'language': {
        const v = String(value);
        parsed = (['he', 'en'].includes(v) ? (v as UserSettingsData[K]) : 'he' as UserSettingsData[K]);
        break;
      }
      case 'theme': {
        const v = String(value);
        parsed = (['light', 'dark', 'auto'].includes(v) ? (v as UserSettingsData[K]) : 'light' as UserSettingsData[K]);
        break;
      }
      case 'emailNotifications':
      case 'pushNotifications':
      case 'marketingEmails':
      case 'twoFactorAuth': {
        parsed = Boolean(value) as UserSettingsData[K];
        break;
      }
      default: {
        parsed = value as UserSettingsData[K];
      }
    }

    setSettings(prev => ({ ...prev, [key]: parsed }));
    setHasChanges(true);
  };

  // שמירת הגדרות
  const handleSave = async () => {
    setIsLoading(true);
    try {
      // סימולציה של שמירה
      await new Promise(resolve => setTimeout(resolve, 1500));
      onSave?.(settings);
      setHasChanges(false);
    } catch (error) {
      console.error('Save settings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ביטול שינויים
  const handleCancel = () => {
    // איפוס הגדרות למצב המקורי
    setSettings({
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      profileVisibility: 'public',
      language: 'he',
      theme: 'light',
      twoFactorAuth: false,
    });
    setHasChanges(false);
    onCancel?.();
  };

  // אם אין משתמש מחובר
  if (!authState.user) {
    return (
      <div className={styles.notLoggedIn}>
        <Typography variant="h3" align="center">
          הגדרות לא זמינות
        </Typography>
        <Typography variant="body1" align="center" color="secondary">
          אנא התחבר כדי לגשת להגדרות שלך
        </Typography>
      </div>
    );
  }

  return (
    <div className={styles.settingsContainer}>
      {/* כותרת */}
      <div className={styles.header}>
        <Typography variant="h2" align="center">
          הגדרות משתמש
        </Typography>
        <Typography variant="body1" align="center" color="secondary">
          נהל את ההעדפות והפרטיות שלך
        </Typography>
      </div>

      {/* הגדרות התראות */}
      <div className={styles.section}>
        <Typography variant="h3" className={styles.sectionTitle}>
          <Icon name="Bell" size={20} /> התראות
        </Typography>

        <div className={styles.settingGroup}>
          <div className={styles.settingItem}>
            <Checkbox
              checked={settings.emailNotifications}
              onChange={(checked) => handleSettingChange('emailNotifications', checked)}
              label="התראות באימייל"
            />
            <Typography variant="body2" color="secondary">
              קבל התראות על פעילות חשבון באימייל
            </Typography>
          </div>

          <div className={styles.settingItem}>
            <Checkbox
              checked={settings.pushNotifications}
              onChange={(checked) => handleSettingChange('pushNotifications', checked)}
              label="התראות דחיפה"
            />
            <Typography variant="body2" color="secondary">
              קבל התראות בדפדפן ובאפליקציה
            </Typography>
          </div>

          <div className={styles.settingItem}>
            <Checkbox
              checked={settings.marketingEmails}
              onChange={(checked) => handleSettingChange('marketingEmails', checked)}
              label="הודעות שיווקיות"
            />
            <Typography variant="body2" color="secondary">
              קבל מידע על מבצעים והטבות
            </Typography>
          </div>
        </div>
      </div>

      {/* הגדרות פרטיות */}
      <div className={styles.section}>
        <Typography variant="h3" className={styles.sectionTitle}>
          <Icon name="Shield" size={20} /> פרטיות
        </Typography>

        <div className={styles.settingGroup}>
          <div className={styles.settingItem}>
            <label className={styles.selectLabel}>ראות פרופיל:</label>
            <select
              value={settings.profileVisibility}
              onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
              className={styles.select}
              aria-label="ראות פרופיל"
            >
              <option value="public">ציבורי</option>
              <option value="friends">חברים בלבד</option>
              <option value="private">פרטי</option>
            </select>
          </div>
        </div>
      </div>

      {/* הגדרות כלליות */}
      <div className={styles.section}>
        <Typography variant="h3" className={styles.sectionTitle}>
          <Icon name="Settings" size={20} /> כללי
        </Typography>

        <div className={styles.settingGroup}>
          <div className={styles.settingItem}>
            <label className={styles.selectLabel}>שפה:</label>
            <select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              className={styles.select}
              aria-label="בחירת שפה"
            >
              <option value="he">עברית</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <label className={styles.selectLabel}>ערכת נושא:</label>
            <select
              value={settings.theme}
              onChange={(e) => handleSettingChange('theme', e.target.value)}
              className={styles.select}
              aria-label="בחירת ערכת נושא"
            >
              <option value="light">בהיר</option>
              <option value="dark">כהה</option>
              <option value="auto">אוטומטי</option>
            </select>
          </div>
        </div>
      </div>

      {/* הגדרות אבטחה */}
      <div className={styles.section}>
        <Typography variant="h3" className={styles.sectionTitle}>
          <Icon name="Shield" size={20} /> אבטחה
        </Typography>

        <div className={styles.settingGroup}>
          <div className={styles.settingItem}>
            <Checkbox
              checked={settings.twoFactorAuth}
              onChange={(checked) => handleSettingChange('twoFactorAuth', checked)}
              label="אימות דו-שלבי"
            />
            <Typography variant="body2" color="secondary">
              הוסף שכבת אבטחה נוספת לחשבון שלך
            </Typography>
          </div>
        </div>
      </div>

      {/* כפתורי פעולה */}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={handleCancel}
          disabled={isLoading}
        >
          ביטול
        </Button>

        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
        >
          {isLoading ? 'שומר...' : 'שמור שינויים'}
        </Button>
      </div>
    </div>
  );
};

export default UserSettings;
