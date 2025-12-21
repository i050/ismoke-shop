import React, { useState, useEffect, useCallback } from 'react';
import { TitleWithIcon, Icon } from '../../../components/ui';
import { 
  getMaintenanceSettings, 
  updateMaintenanceSettings, 
  toggleAllowUnpaidOrders,
  toggleDisablePayment,
  toggleRequireRegistrationApproval,
  toggleRequireLoginOTP,
  updateInventorySettings,
  updateThresholdDiscountSettings,
  getAllSettings,
  type MaintenanceSettings 
} from '../../../services/settingsService';
import { useSiteStatus } from '../../../contexts/SiteStatusContext';
import { useToast } from '../../../hooks/useToast';
import styles from './AdminSettingsPage.module.css';

/**
 * דף הגדרות מערכת
 * כולל ניהול מצב תחזוקה (Maintenance Mode)
 */
const AdminSettingsPage: React.FC = () => {
  // מצב תחזוקה מקומי לעריכה
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>({
    enabled: false,
    message: '',
    allowedRoles: ['admin', 'super_admin', 'customer']
  });
  
  // הגדרות הזמנות
  const [allowUnpaidOrders, setAllowUnpaidOrders] = useState<boolean>(false);
  const [disablePayment, setDisablePayment] = useState<boolean>(false);
  const [ordersSettingsLoading, setOrdersSettingsLoading] = useState<boolean>(false);
  
  // הגדרות משתמשים
  const [requireRegistrationApproval, setRequireRegistrationApproval] = useState<boolean>(false);
  const [requireLoginOTP, setRequireLoginOTP] = useState<boolean>(false);
  const [usersSettingsLoading, setUsersSettingsLoading] = useState<boolean>(false);
  
  // הגדרות מלאי
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState<number>(5);
  const [inventorySettingsLoading, setInventorySettingsLoading] = useState<boolean>(false);
  
  // הגדרות הנחת סף (Threshold Discount)
  const [thresholdDiscountEnabled, setThresholdDiscountEnabled] = useState<boolean>(false);
  const [thresholdMinimumAmount, setThresholdMinimumAmount] = useState<number>(500);
  const [thresholdDiscountPercentage, setThresholdDiscountPercentage] = useState<number>(10);
  const [thresholdDiscountLoading, setThresholdDiscountLoading] = useState<boolean>(false);
  
  // מצבי טעינה ושגיאה
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal אישור
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState(false);
  
  // עדכון הסטטוס הגלובלי (בלי רענון מהשרת)
  const { updateStatus } = useSiteStatus();
  
  // Toast notifications
  const { showToast } = useToast();

  // טעינת ההגדרות
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // טעינת הגדרות תחזוקה
      const maintenanceResponse = await getMaintenanceSettings();
      if (maintenanceResponse.success) {
        setMaintenanceSettings(maintenanceResponse.data);
      }
      
      // טעינת כל ההגדרות (כולל הזמנות ומשתמשים)
      const allSettingsResponse = await getAllSettings();
      if (allSettingsResponse.success) {
        setAllowUnpaidOrders(allSettingsResponse.data.orders?.allowUnpaidOrders ?? false);
        setDisablePayment(allSettingsResponse.data.orders?.disablePayment ?? false);
        setRequireRegistrationApproval(allSettingsResponse.data.users?.requireRegistrationApproval ?? false);
        setRequireLoginOTP(allSettingsResponse.data.users?.requireLoginOTP ?? false);
        setDefaultLowStockThreshold(allSettingsResponse.data.inventory?.defaultLowStockThreshold ?? 5);
        // הנחת סף
        setThresholdDiscountEnabled(allSettingsResponse.data.thresholdDiscount?.enabled ?? false);
        setThresholdMinimumAmount(allSettingsResponse.data.thresholdDiscount?.minimumAmount ?? 500);
        setThresholdDiscountPercentage(allSettingsResponse.data.thresholdDiscount?.discountPercentage ?? 10);
      }
    } catch (err) {
      console.error('שגיאה בטעינת הגדרות:', err);
      setError('שגיאה בטעינת ההגדרות');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // שמירת השינויים
  const saveSettings = async (updates: Partial<MaintenanceSettings>) => {
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await updateMaintenanceSettings(updates);
      
      if (response.success) {
        setMaintenanceSettings(prev => ({
          ...prev,
          enabled: response.data.maintenanceMode,
          message: response.data.message,
          allowedRoles: response.data.allowedRoles
        }));
        
        // Toast הצלחה
        const successMsg = updates.enabled === false 
          ? 'מצב פרטי בוטל' 
          : updates.enabled === true 
          ? 'מצב פרטי הופעל' 
          : 'הגדרות עדכנו בהצלחה';
        showToast('success', successMsg);
        
        // עדכון הסטטוס הגלובלי ישירות (בלי רענון מהשרת - מונע קפיצה של הדף)
        updateStatus({
          maintenanceMode: response.data.maintenanceMode,
          message: response.data.message
        });
      }
    } catch (err) {
      console.error('שגיאה בשמירת הגדרות:', err);
      setError('שגיאה בשמירת ההגדרות');
      showToast('error', 'שגיאה בשמירת ההגדרות');
    } finally {
      setIsSaving(false);
    }
  };

  // טיפול בשינוי toggle
  const handleToggleChange = (newEnabled: boolean) => {
    if (newEnabled) {
      // אם מפעילים - מבקשים אישור
      setPendingEnabled(true);
      setShowConfirmModal(true);
    } else {
      // אם מכבים - שומרים ישירות
      saveSettings({ enabled: false });
    }
  };

  // אישור הפעלת מצב תחזוקה
  const confirmEnableMaintenance = () => {
    setShowConfirmModal(false);
    saveSettings({ enabled: true });
  };

  // ביטול הפעלת מצב תחזוקה
  const cancelEnableMaintenance = () => {
    setShowConfirmModal(false);
    setPendingEnabled(false);
  };

  // שמירת הודעה מותאמת
  const handleMessageSave = () => {
    saveSettings({ message: maintenanceSettings.message });
  };

  // טיפול בשינוי תפקידים מורשים
  const handleRoleToggle = (role: string) => {
    const currentRoles = maintenanceSettings.allowedRoles;
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    // תמיד לשמור admin ו-super_admin
    if (!newRoles.includes('admin')) newRoles.push('admin');
    if (!newRoles.includes('super_admin')) newRoles.push('super_admin');
    
    setMaintenanceSettings(prev => ({ ...prev, allowedRoles: newRoles }));
    saveSettings({ allowedRoles: newRoles });
  };

  // טיפול בשינוי הגדרת הזמנות ללא תשלום
  const handleToggleUnpaidOrders = async () => {
    const newValue = !allowUnpaidOrders;
    
    try {
      setOrdersSettingsLoading(true);
      const response = await toggleAllowUnpaidOrders(newValue);
      
      if (response.success) {
        setAllowUnpaidOrders(response.data.allowUnpaidOrders);
        const msg = newValue ? 'הזמנות ללא תשלום מיידי הופעלו' : 'הזמנות ללא תשלום מיידי בוטלו';
        showToast('success', msg);
      }
    } catch (err) {
      console.error('Error toggling unpaid orders setting:', err);
      showToast('error', 'שגיאה בשמירת ההגדרה');
    } finally {
      setOrdersSettingsLoading(false);
    }
  };

  // טיפול בשינוי הגדרת כיבוי אפשרות תשלום
  const handleToggleDisablePayment = async () => {
    const newValue = !disablePayment;
    
    try {
      setOrdersSettingsLoading(true);
      const response = await toggleDisablePayment(newValue);
      
      if (response.success) {
        setDisablePayment(response.data.disablePayment);
        const msg = newValue 
          ? 'אפשרות התשלום כובתה - לקוחות יראו רק אפשרות הזמנה ללא תשלום' 
          : 'אפשרות התשלום הופעלה מחדש';
        showToast('success', msg);
      }
    } catch (err) {
      console.error('Error toggling disable payment setting:', err);
      showToast('error', 'שגיאה בשמירת ההגדרה');
    } finally {
      setOrdersSettingsLoading(false);
    }
  };

  // טיפול בשינוי הגדרת דרישת אישור הרשמה
  const handleToggleRegistrationApproval = async () => {
    const newValue = !requireRegistrationApproval;
    
    try {
      setUsersSettingsLoading(true);
      const response = await toggleRequireRegistrationApproval(newValue);
      
      if (response.success) {
        setRequireRegistrationApproval(response.data.requireRegistrationApproval);
        const msg = newValue 
          ? 'אישור מנהל להרשמה הופעל - משתמשים חדשים יצטרכו אישור' 
          : 'אישור מנהל להרשמה בוטל - משתמשים יכולים להירשם באופן חופשי';
        showToast('success', msg);
      }
    } catch (err) {
      console.error('Error toggling registration approval setting:', err);
      showToast('error', 'שגיאה בשמירת ההגדרה');
    } finally {
      setUsersSettingsLoading(false);
    }
  };

  // טיפול בשינוי הגדרת דרישת OTP בהתחברות
  const handleToggleLoginOTP = async () => {
    const newValue = !requireLoginOTP;
    
    try {
      setUsersSettingsLoading(true);
      const response = await toggleRequireLoginOTP(newValue);
      
      if (response.success) {
        setRequireLoginOTP(response.data.requireLoginOTP);
        const msg = newValue 
          ? 'אימות OTP בהתחברות הופעל - משתמשים יקבלו קוד במייל בכל התחברות' 
          : 'אימות OTP בהתחברות בוטל';
        showToast('success', msg);
      }
    } catch (err) {
      console.error('Error toggling login OTP setting:', err);
      showToast('error', 'שגיאה בשמירת ההגדרה');
    } finally {
      setUsersSettingsLoading(false);
    }
  };

  // טיפול בשינוי הגדרת סף מלאי נמוך
  const handleUpdateLowStockThreshold = async (newValue: number) => {
    // ולידציה
    if (newValue < 0 || newValue > 1000) {
      showToast('error', 'הערך חייב להיות בין 0 ל-1000');
      return;
    }
    
    try {
      setInventorySettingsLoading(true);
      const response = await updateInventorySettings({ defaultLowStockThreshold: newValue });
      
      if (response.success) {
        setDefaultLowStockThreshold(newValue);
        showToast('success', `סף מלאי נמוך עודכן ל-${newValue} יחידות`);
      }
    } catch (err) {
      console.error('Error updating low stock threshold:', err);
      showToast('error', 'שגיאה בעדכון הגדרת המלאי');
    } finally {
      setInventorySettingsLoading(false);
    }
  };

  // טיפול בהפעלה/כיבוי של הנחת סף
  const handleToggleThresholdDiscount = async () => {
    const newValue = !thresholdDiscountEnabled;
    
    try {
      setThresholdDiscountLoading(true);
      const response = await updateThresholdDiscountSettings({ enabled: newValue });
      
      if (response.success) {
        setThresholdDiscountEnabled(newValue);
        const msg = newValue 
          ? `הנחת סף הופעלה - ${thresholdDiscountPercentage}% הנחה על הזמנות מעל ₪${thresholdMinimumAmount}` 
          : 'הנחת סף בוטלה';
        showToast('success', msg);
      }
    } catch (err) {
      console.error('Error toggling threshold discount:', err);
      showToast('error', 'שגיאה בשמירת ההגדרה');
    } finally {
      setThresholdDiscountLoading(false);
    }
  };

  // טיפול בעדכון סכום מינימום להנחת סף
  const handleUpdateThresholdMinimumAmount = async (newValue: number) => {
    if (newValue < 0) {
      showToast('error', 'הסכום חייב להיות חיובי');
      return;
    }
    
    try {
      setThresholdDiscountLoading(true);
      const response = await updateThresholdDiscountSettings({ minimumAmount: newValue });
      
      if (response.success) {
        setThresholdMinimumAmount(newValue);
        showToast('success', `סכום מינימום להנחה עודכן ל-₪${newValue}`);
      }
    } catch (err) {
      console.error('Error updating threshold minimum amount:', err);
      showToast('error', 'שגיאה בעדכון הסכום');
    } finally {
      setThresholdDiscountLoading(false);
    }
  };

  // טיפול בעדכון אחוז הנחת סף
  const handleUpdateThresholdDiscountPercentage = async (newValue: number) => {
    if (newValue < 0 || newValue > 100) {
      showToast('error', 'אחוז ההנחה חייב להיות בין 0 ל-100');
      return;
    }
    
    try {
      setThresholdDiscountLoading(true);
      const response = await updateThresholdDiscountSettings({ discountPercentage: newValue });
      
      if (response.success) {
        setThresholdDiscountPercentage(newValue);
        showToast('success', `אחוז ההנחה עודכן ל-${newValue}%`);
      }
    } catch (err) {
      console.error('Error updating threshold discount percentage:', err);
      showToast('error', 'שגיאה בעדכון אחוז ההנחה');
    } finally {
      setThresholdDiscountLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.settingsPage}>
        <TitleWithIcon
          icon="Settings"
          title="הגדרות מערכת"
          subtitle="טוען..."
        />
        <div className={styles.loadingContainer}>
          <Icon name="Loader2" size={32} className={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsPage}>
      <TitleWithIcon
        icon="Settings"
        title="הגדרות מערכת"
        subtitle="ניהול הגדרות האתר"
      />
      
      {/* הודעות שגיאה */}
      {error && (
        <div className={styles.errorBanner}>
          <Icon name="AlertCircle" size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Banner אזהרה כשמצב פרטי מופעל */}
      {maintenanceSettings.enabled && (
        <div className={styles.warningBanner}>
          <Icon name="Lock" size={20} />
          <span>האתר במצב פרטי - רק משתמשים מורשים יכולים לגשת</span>
        </div>
      )}

      <div className={styles.settingsGrid}>
        {/* כרטיס מצב פרטי */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Icon name="Lock" size={24} className={styles.cardIcon} />
              <div>
                <h3 className={styles.cardTitle}>מצב פרטי</h3>
                <p className={styles.cardDescription}>
                  כאשר מופעל, רק משתמשים רשומים יוכלו לגשת לאתר
                </p>
              </div>
            </div>
            
            {/* Toggle Switch */}
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={maintenanceSettings.enabled}
                onChange={(e) => handleToggleChange(e.target.checked)}
                disabled={isSaving}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {/* הגדרות נוספות - רק כשמופעל */}
          {maintenanceSettings.enabled && (
            <div className={styles.cardContent}>
              {/* הודעה מותאמת */}
              <div className={styles.formGroup}>
                <label className={styles.label}>הודעה למבקרים:</label>
                <textarea
                  className={styles.textarea}
                  value={maintenanceSettings.message}
                  onChange={(e) => setMaintenanceSettings(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="האתר במצב פרטי. רק משתמשים רשומים יכולים לגשת."
                  rows={3}
                />
                <button
                  className={styles.saveButton}
                  onClick={handleMessageSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'שומר...' : 'שמור הודעה'}
                </button>
              </div>

              {/* תפקידים מורשים */}
              <div className={styles.formGroup}>
                <label className={styles.label}>מי יכול לגשת:</label>
                <div className={styles.rolesList}>
                  <label className={`${styles.roleItem} ${styles.disabled}`}>
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                    />
                    <span>מנהלים (admin, super_admin)</span>
                    <span className={styles.requiredBadge}>חובה</span>
                  </label>
                  
                  <label className={styles.roleItem}>
                    <input
                      type="checkbox"
                      checked={maintenanceSettings.allowedRoles.includes('customer')}
                      onChange={() => handleRoleToggle('customer')}
                      disabled={isSaving}
                    />
                    <span>לקוחות רשומים (customer)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* כרטיס הגדרות הזמנות */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Icon name="ShoppingCart" size={24} className={styles.cardIcon} />
              <div>
                <h3 className={styles.cardTitle}>הגדרות הזמנות</h3>
                <p className={styles.cardDescription}>
                  ניהול אפשרויות תשלום והזמנות
                </p>
              </div>
            </div>
          </div>
          
          <div className={styles.cardContent}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>אפשר הזמנות ללא תשלום מיידי</span>
                <span className={styles.settingHint}>
                  לקוחות יוכלו להזמין ולשלם מאוחר יותר
                </span>
              </div>
              
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={allowUnpaidOrders}
                  onChange={handleToggleUnpaidOrders}
                  disabled={ordersSettingsLoading || disablePayment}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            
            {allowUnpaidOrders && !disablePayment && (
              <div className={styles.warningBanner}>
                <Icon name="AlertCircle" size={16} />
                <span>מופעל - הזמנות ללא תשלום יסומנו כ"לא שולם"</span>
              </div>
            )}
            
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>כיבוי אפשרות התשלום</span>
                <span className={styles.settingHint}>
                  לקוחות יראו רק אפשרות "הזמנה ללא תשלום" - אפשרות התשלום תוסתר
                </span>
              </div>
              
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={disablePayment}
                  onChange={handleToggleDisablePayment}
                  disabled={ordersSettingsLoading}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            
            {disablePayment && (
              <div className={styles.warningBanner}>
                <Icon name="AlertCircle" size={16} />
                <span>מופעל - לקוחות לא יכולים לשלם על ההזמנה</span>
              </div>
            )}
          </div>
        </div>

        {/* כרטיס הגדרות משתמשים */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Icon name="Users" size={24} className={styles.cardIcon} />
              <div>
                <h3 className={styles.cardTitle}>הגדרות משתמשים</h3>
                <p className={styles.cardDescription}>
                  ניהול הרשמה ואישור משתמשים
                </p>
              </div>
            </div>
          </div>
          
          <div className={styles.cardContent}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>דרוש אישור מנהל להרשמה</span>
                <span className={styles.settingHint}>
                  משתמשים חדשים יצטרכו אישור מנהל לפני שיוכלו להתחבר
                </span>
              </div>
              
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={requireRegistrationApproval}
                  onChange={handleToggleRegistrationApproval}
                  disabled={usersSettingsLoading}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            
            {requireRegistrationApproval && (
              <div className={styles.warningBanner}>
                <Icon name="AlertCircle" size={16} />
                <span>מופעל - משתמשים חדשים ימתינו לאישור מנהל</span>
              </div>
            )}
            
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>קוד אימות במייל בהתחברות</span>
                <span className={styles.settingHint}>
                  בכל התחברות, המשתמש יקבל קוד חד פעמי (OTP) למייל שלו
                </span>
              </div>
              
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={requireLoginOTP}
                  onChange={handleToggleLoginOTP}
                  disabled={usersSettingsLoading}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            
            {requireLoginOTP && (
              <div className={styles.infoBanner}>
                <Icon name="Mail" size={16} />
                <span>מופעל - משתמשים יקבלו קוד אימות במייל בכל התחברות</span>
              </div>
            )}
          </div>
        </div>

        {/* כרטיס הגדרות מלאי */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Icon name="Package" size={24} className={styles.cardIcon} />
              <div>
                <h3 className={styles.cardTitle}>הגדרות מלאי</h3>
                <p className={styles.cardDescription}>
                  ברירות מחדל למעקב אחרי מלאי
                </p>
              </div>
            </div>
          </div>
          
          <div className={styles.cardContent}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>סף ברירת מחדל למלאי נמוך</span>
                <span className={styles.settingHint}>
                  כאשר כמות המלאי נמוכה מערך זה, המוצר יסומן כ"מלאי נמוך" (ניתן להגדיר סף ספציפי לכל מוצר)
                </span>
              </div>
              
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={defaultLowStockThreshold}
                  onChange={(e) => setDefaultLowStockThreshold(Number(e.target.value))}
                  onBlur={() => handleUpdateLowStockThreshold(defaultLowStockThreshold)}
                  disabled={inventorySettingsLoading}
                  className={styles.numberInput}
                />
                <span className={styles.inputLabel}>יחידות</span>
              </div>
            </div>
            
            <div className={styles.infoBanner}>
              <Icon name="Info" size={16} />
              <span>
                הגדרה זו חלה על מוצרים שלא הוגדר להם סף מותאם אישית. 
                ניתן לשנות את הסף לכל מוצר בנפרד בעמוד עריכת המוצר.
              </span>
            </div>
          </div>
        </div>

        {/* כרטיס הנחת סף - הנחה אוטומטית מעל סכום מסוים */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Icon name="Percent" size={24} className={styles.cardIcon} />
              <div>
                <h3 className={styles.cardTitle}>הנחת סף</h3>
                <p className={styles.cardDescription}>
                  הנחה אוטומטית כשהזמנה עוברת סכום מסוים
                </p>
              </div>
            </div>
            
            {/* Toggle Switch */}
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={thresholdDiscountEnabled}
                onChange={handleToggleThresholdDiscount}
                disabled={thresholdDiscountLoading}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          
          {/* הגדרות נוספות - רק כשמופעל */}
          {thresholdDiscountEnabled && (
            <div className={styles.cardContent}>
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>סכום מינימום להזמנה</span>
                  <span className={styles.settingHint}>
                    הזמנות מעל סכום זה יקבלו את ההנחה
                  </span>
                </div>
                
                <div className={styles.inputGroup}>
                  <span className={styles.inputPrefix}>₪</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={thresholdMinimumAmount}
                    onChange={(e) => setThresholdMinimumAmount(Number(e.target.value))}
                    onBlur={() => handleUpdateThresholdMinimumAmount(thresholdMinimumAmount)}
                    disabled={thresholdDiscountLoading}
                    className={styles.numberInput}
                  />
                </div>
              </div>
              
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>אחוז הנחה</span>
                  <span className={styles.settingHint}>
                    אחוז ההנחה שיוחל על סכום ההזמנה
                  </span>
                </div>
                
                <div className={styles.inputGroup}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={thresholdDiscountPercentage}
                    onChange={(e) => setThresholdDiscountPercentage(Number(e.target.value))}
                    onBlur={() => handleUpdateThresholdDiscountPercentage(thresholdDiscountPercentage)}
                    disabled={thresholdDiscountLoading}
                    className={styles.numberInput}
                  />
                  <span className={styles.inputLabel}>%</span>
                </div>
              </div>
              
              <div className={styles.successBanner}>
                <Icon name="Gift" size={16} />
                <span>
                  לקוחות שיזמינו מעל ₪{thresholdMinimumAmount} יקבלו {thresholdDiscountPercentage}% הנחה אוטומטית!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* כרטיסי placeholder להגדרות נוספות */}
        <div className={`${styles.settingsCard} ${styles.comingSoon}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Icon name="CreditCard" size={24} className={styles.cardIcon} />
              <div>
                <h3 className={styles.cardTitle}>הגדרות תשלום ומשלוח</h3>
                <p className={styles.cardDescription}>בקרוב...</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.settingsCard} ${styles.comingSoon}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Icon name="Mail" size={24} className={styles.cardIcon} />
              <div>
                <h3 className={styles.cardTitle}>הגדרות מייל</h3>
                <p className={styles.cardDescription}>בקרוב...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal אישור */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <Icon name="Lock" size={32} className={styles.modalIcon} />
              <h3>האם להפעיל מצב פרטי?</h3>
            </div>
            <p className={styles.modalText}>
              כאשר מצב פרטי מופעל, מבקרים שאינם רשומים לא יוכלו לגשת לאתר.
              <br />
              רק משתמשים עם חשבון פעיל יוכלו להתחבר ולגלוש.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={cancelEnableMaintenance}
              >
                ביטול
              </button>
              <button
                className={styles.confirmButton}
                onClick={confirmEnableMaintenance}
              >
                <Icon name="Lock" size={18} />
                הפעל מצב פרטי
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
