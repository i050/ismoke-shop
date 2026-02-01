import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleWithIcon, Icon } from '../../../components/ui';
import { 
  getMaintenanceSettings, 
  updateMaintenanceSettings, 
  toggleAllowUnpaidOrders,
  toggleDisablePayment,
  toggleRequireRegistrationApproval,
  toggleRequireLoginOTP,
  toggleShowCartTotalInHeader,
  updateInventorySettings,
  updateThresholdDiscountSettings,
  updateShippingPolicy,
  updateAdminNotificationEmails,
  getAllSettings,
  type MaintenanceSettings,
  type ShippingPolicy,
  type ShippingPolicySection
} from '../../../services/settingsService';
import { useSiteStatus } from '../../../contexts/SiteStatusContext';
import { useToast } from '../../../hooks/useToast';
import { ReAuthModal } from '../../../components/features/auth/ReAuthModal/ReAuthModal';
import { isRecentlyAuthenticated } from '../../../utils/tokenUtils';
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
  
  // הגדרות UI
  const [showCartTotalInHeader, setShowCartTotalInHeader] = useState<boolean>(false);
  const [uiSettingsLoading, setUISettingsLoading] = useState<boolean>(false);
  
  // הגדרות מלאי
  const [defaultLowStockThreshold, setDefaultLowStockThreshold] = useState<number>(5);
  const [inventorySettingsLoading, setInventorySettingsLoading] = useState<boolean>(false);
  
  // הגדרות הנחת סף (Threshold Discount)
  const [thresholdDiscountEnabled, setThresholdDiscountEnabled] = useState<boolean>(false);
  const [thresholdMinimumAmount, setThresholdMinimumAmount] = useState<number>(500);
  const [thresholdDiscountPercentage, setThresholdDiscountPercentage] = useState<number>(10);
  const [thresholdDiscountLoading, setThresholdDiscountLoading] = useState<boolean>(false);
  
  // מדיניות משלוח והחזרות
  const [shippingPolicy, setShippingPolicy] = useState<ShippingPolicy>({
    shipping: { enabled: true, title: 'משלוח', icon: 'Truck', items: [] },
    returns: { enabled: true, title: 'החזרות', icon: 'Undo', items: [] },
    warranty: { enabled: true, title: 'אחריות', icon: 'Shield', items: [] }
  });
  const [shippingPolicyLoading, setShippingPolicyLoading] = useState<boolean>(false);
  const [tempItemInputs, setTempItemInputs] = useState<{
    shipping: string;
    returns: string;
    warranty: string;
  }>({ shipping: '', returns: '', warranty: '' });
  
  // התראות מנהל - הזמנות חדשות
  const [adminNotificationEmails, setAdminNotificationEmails] = useState<string[]>([]);
  const [adminNotificationEmailsInput, setAdminNotificationEmailsInput] = useState<string>('');
  const [notificationSettingsLoading, setNotificationSettingsLoading] = useState<boolean>(false);
  
  // מצבי עריכה inline של פריטים
  const [editingItemId, setEditingItemId] = useState<string | null>(null); // "section-index" (למשל "shipping-0")
  const [editingItemText, setEditingItemText] = useState<string>(''); // הטקסט המתערך
  
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
  
  // 🔐 Soft Login - ReAuth Modal state
  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);
  
  // 🔐 Soft Login - פונקציה לעטיפת פעולות רגישות
  const withReAuth = useCallback(async (action: () => Promise<void>) => {
    // בדיקה האם נדרש אימות מחדש (isAdmin=true לחלון 30 דקות)
    if (!isRecentlyAuthenticated(true)) {
      pendingActionRef.current = action;
      setShowReAuthModal(true);
      return;
    }
    
    // ביצוע הפעולה ישירות
    try {
      await action();
    } catch (err: any) {
      // טיפול בשגיאת REAUTH_REQUIRED מהשרת
      if (err?.response?.data?.code === 'REAUTH_REQUIRED') {
        pendingActionRef.current = action;
        setShowReAuthModal(true);
        return;
      }
      throw err;
    }
  }, []);
  
  // 🔐 Soft Login - Handler לאחר אימות מוצלח
  const handleReAuthSuccess = async () => {
    setShowReAuthModal(false);
    
    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      try {
        await action();
      } catch (err) {
        console.error('Error executing pending action:', err);
      }
    }
  };
  
  // 🔐 Soft Login - Handler לסגירת modal
  const handleReAuthClose = () => {
    setShowReAuthModal(false);
    pendingActionRef.current = null;
  };

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
        // הגדרות UI
        setShowCartTotalInHeader(allSettingsResponse.data.ui?.showCartTotalInHeader ?? false);
        // הנחת סף
        setThresholdDiscountEnabled(allSettingsResponse.data.thresholdDiscount?.enabled ?? false);
        setThresholdMinimumAmount(allSettingsResponse.data.thresholdDiscount?.minimumAmount ?? 500);
        setThresholdDiscountPercentage(allSettingsResponse.data.thresholdDiscount?.discountPercentage ?? 10);
        // מדיניות משלוח והחזרות
        if (allSettingsResponse.data.shippingPolicy) {
          setShippingPolicy(allSettingsResponse.data.shippingPolicy);
        } else {
          // אם אין shippingPolicy בתשובה, נשאיר את ברירת המחדל הקיימת
          console.warn('shippingPolicy לא נמצא בהגדרות');
        }
        // התראות מנהל
        const emails = allSettingsResponse.data.notifications?.adminNewOrderEmails || [];
        setAdminNotificationEmails(emails);
        setAdminNotificationEmailsInput(emails.join(', '));
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
      // אם מכבים - עוטפים ב-withReAuth
      withReAuth(async () => {
        await saveSettings({ enabled: false });
      });
    }
  };

  // אישור הפעלת מצב תחזוקה - עטוף ב-withReAuth
  const confirmEnableMaintenance = () => {
    setShowConfirmModal(false);
    withReAuth(async () => {
      await saveSettings({ enabled: true });
    });
  };

  // ביטול הפעלת מצב תחזוקה
  const cancelEnableMaintenance = () => {
    setShowConfirmModal(false);
    setPendingEnabled(false);
  };

  // שמירת הודעה מותאמת - עטוף ב-withReAuth
  const handleMessageSave = () => {
    withReAuth(async () => {
      await saveSettings({ message: maintenanceSettings.message });
    });
  };

  // טיפול בשינוי תפקידים מורשים - עטוף ב-withReAuth
  const handleRoleToggle = (role: string) => {
    const currentRoles = maintenanceSettings.allowedRoles;
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    // תמיד לשמור admin ו-super_admin
    if (!newRoles.includes('admin')) newRoles.push('admin');
    if (!newRoles.includes('super_admin')) newRoles.push('super_admin');
    
    setMaintenanceSettings(prev => ({ ...prev, allowedRoles: newRoles }));
    withReAuth(async () => {
      await saveSettings({ allowedRoles: newRoles });
    });
  };

  // טיפול בשינוי הגדרת הזמנות ללא תשלום - עטוף ב-withReAuth
  const handleToggleUnpaidOrders = async () => {
    const newValue = !allowUnpaidOrders;
    
    withReAuth(async () => {
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
    });
  };

  // טיפול בשינוי הגדרת כיבוי אפשרות תשלום - עטוף ב-withReAuth
  const handleToggleDisablePayment = async () => {
    const newValue = !disablePayment;
    
    withReAuth(async () => {
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
    });
  };

  // טיפול בשינוי הגדרת דרישת אישור הרשמה - עטוף ב-withReAuth
  const handleToggleRegistrationApproval = async () => {
    const newValue = !requireRegistrationApproval;
    
    withReAuth(async () => {
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
    });
  };

  // טיפול בשינוי הגדרת דרישת OTP בהתחברות - עטוף ב-withReAuth
  const handleToggleLoginOTP = async () => {
    const newValue = !requireLoginOTP;
    
    withReAuth(async () => {
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
    });
  };

  // טיפול בשינוי הגדרת הצגת מחיר עגלה בהדר
  const handleToggleShowCartTotal = async () => {
    const newValue = !showCartTotalInHeader;
    
    try {
      setUISettingsLoading(true);
      const response = await toggleShowCartTotalInHeader(newValue);
      
      if (response.success) {
        setShowCartTotalInHeader(response.data.showCartTotalInHeader);
        const msg = newValue 
          ? 'הצגת מחיר העגלה בהדר הופעלה' 
          : 'הצגת מחיר העגלה בהדר בוטלה';
        showToast('success', msg);
      }
    } catch (err) {
      console.error('Error toggling show cart total setting:', err);
      showToast('error', 'שגיאה בשמירת ההגדרה');
    } finally {
      setUISettingsLoading(false);
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

  // =============== מדיניות משלוח והחזרות - Shipping Policy ===============
  
  // טיפול בהפעלה/כיבוי של חלק במדיניות משלוח
  const handleTogglePolicySection = async (section: 'shipping' | 'returns' | 'warranty') => {
    const newValue = !shippingPolicy[section].enabled;
    
    try {
      setShippingPolicyLoading(true);
      const response = await updateShippingPolicy({
        [section]: { ...shippingPolicy[section], enabled: newValue }
      });
      
      if (response.success && response.data.shippingPolicy) {
        setShippingPolicy(response.data.shippingPolicy);
        const msg = newValue ? `${shippingPolicy[section].title} הופעל` : `${shippingPolicy[section].title} הוסתר`;
        showToast('success', msg);
      }
    } catch (err) {
      console.error('Error toggling policy section:', err);
      showToast('error', 'שגיאה בעדכון ההגדרה');
    } finally {
      setShippingPolicyLoading(false);
    }
  };

  // הוספת פריט חדש לרשימה
  const handleAddItem = async (section: 'shipping' | 'returns' | 'warranty') => {
    const inputValue = tempItemInputs[section];
    if (!inputValue.trim()) {
      showToast('error', 'אנא הזן טקסט לפני ההוספה');
      return;
    }
    
    const newItems = [...shippingPolicy[section].items, inputValue.trim()];
    
    try {
      setShippingPolicyLoading(true);
      const response = await updateShippingPolicy({
        [section]: { ...shippingPolicy[section], items: newItems }
      });
      
      if (response.success && response.data.shippingPolicy) {
        setShippingPolicy(response.data.shippingPolicy);
        setTempItemInputs(prev => ({ ...prev, [section]: '' }));
        showToast('success', 'פריט נוסף בהצלחה');
      }
    } catch (err) {
      console.error('Error adding item:', err);
      showToast('error', 'שגיאה בהוספת הפריט');
    } finally {
      setShippingPolicyLoading(false);
    }
  };

  // מחיקת פריט מהרשימה
  const handleDeleteItem = async (section: 'shipping' | 'returns' | 'warranty', index: number) => {
    const newItems = shippingPolicy[section].items.filter((_, i) => i !== index);
    
    try {
      setShippingPolicyLoading(true);
      const response = await updateShippingPolicy({
        [section]: { ...shippingPolicy[section], items: newItems }
      });
      
      if (response.success && response.data.shippingPolicy) {
        setShippingPolicy(response.data.shippingPolicy);
        showToast('success', 'פריט נמחק בהצלחה');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      showToast('error', 'שגיאה במחיקת הפריט');
    } finally {
      setShippingPolicyLoading(false);
    }
  };

  // התחלת עריכה inline של פריט - הפיכתו לניתן לעריכה
  const handleEditItemStart = (section: 'shipping' | 'returns' | 'warranty', index: number, currentText: string) => {
    // יצירת ID ייחודי לפריט: "section-index"
    const itemId = `${section}-${index}`;
    setEditingItemId(itemId);
    setEditingItemText(currentText);
  };

  // ביטול עריכה ללא שמירה
  const handleEditItemCancel = () => {
    setEditingItemId(null);
    setEditingItemText('');
  };

  // שמירת הפריט המתערך
  const handleEditItemSave = async (section: 'shipping' | 'returns' | 'warranty', index: number) => {
    const newText = editingItemText.trim();
    
    // וולידציה - הטקסט לא יכול להיות ריק
    if (!newText) {
      showToast('error', 'הטקסט לא יכול להיות ריק');
      return;
    }
    
    // אם הטקסט לא השתנה - רק סוגרים את העריכה
    if (newText === shippingPolicy[section].items[index]) {
      handleEditItemCancel();
      return;
    }
    
    // עדכון הפריט בשרת
    const newItems = [...shippingPolicy[section].items];
    newItems[index] = newText;
    
    try {
      setShippingPolicyLoading(true);
      const response = await updateShippingPolicy({
        [section]: { ...shippingPolicy[section], items: newItems }
      });
      
      if (response.success && response.data.shippingPolicy) {
        setShippingPolicy(response.data.shippingPolicy);
        handleEditItemCancel();
        showToast('success', 'פריט עודכן בהצלחה');
      }
    } catch (err) {
      console.error('Error editing item:', err);
      showToast('error', 'שגיאה בעריכת הפריט');
    } finally {
      setShippingPolicyLoading(false);
    }
  };

  // עריכת פריט ברשימה (נשמר עבור compatibility אם צריך ישירות)
  const handleEditItem = async (section: 'shipping' | 'returns' | 'warranty', index: number, newText: string) => {
    if (!newText.trim()) {
      showToast('error', 'הטקסט לא יכול להיות ריק');
      return;
    }
    
    const newItems = [...shippingPolicy[section].items];
    newItems[index] = newText.trim();
    
    try {
      setShippingPolicyLoading(true);
      const response = await updateShippingPolicy({
        [section]: { ...shippingPolicy[section], items: newItems }
      });
      
      if (response.success && response.data.shippingPolicy) {
        setShippingPolicy(response.data.shippingPolicy);
        showToast('success', 'פריט עודכן בהצלחה');
      }
    } catch (err) {
      console.error('Error editing item:', err);
      showToast('error', 'שגיאה בעריכת הפריט');
    } finally {
      setShippingPolicyLoading(false);
    }
  };

  // =============== התראות מנהל - Admin Notifications ===============
  
  // שמירת כתובות מייל להתראות מנהל
  const handleSaveAdminNotificationEmails = async () => {
    // פירסור הקלט - מפריד פסיקים או רווחים
    const emails = adminNotificationEmailsInput
      .split(/[,\s]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
    
    // ולידציה בסיסית
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(e => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      showToast('error', `כתובות לא תקינות: ${invalidEmails.join(', ')}`);
      return;
    }
    
    try {
      setNotificationSettingsLoading(true);
      const response = await updateAdminNotificationEmails(emails);
      
      if (response.success) {
        setAdminNotificationEmails(emails);
        setAdminNotificationEmailsInput(emails.join(', '));
        showToast('success', emails.length > 0 
          ? `נשמרו ${emails.length} כתובות מייל להתראות` 
          : 'התראות הזמנות חדשות בוטלו');
      }
    } catch (err) {
      console.error('Error saving admin notification emails:', err);
      showToast('error', 'שגיאה בשמירת הגדרות התראות');
    } finally {
      setNotificationSettingsLoading(false);
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

        {/* כרטיס הגדרות ממשק משתמש (UI) */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Icon name="Eye" size={24} className={styles.cardIcon} />
              <div>
                <h3 className={styles.cardTitle}>הגדרות ממשק משתמש</h3>
                <p className={styles.cardDescription}>
                  התאמת תצוגת הממשק ללקוחות
                </p>
              </div>
            </div>
          </div>
          
          <div className={styles.cardContent}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>הצגת מחיר עגלה בהדר</span>
                <span className={styles.settingHint}>
                  הצגת המחיר הכולל (אחרי הנחות) ליד אייקון העגלה בהדר
                </span>
              </div>
              
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={showCartTotalInHeader}
                  onChange={handleToggleShowCartTotal}
                  disabled={uiSettingsLoading}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
            
            {showCartTotalInHeader && (
              <div className={styles.infoBanner}>
                <Icon name="DollarSign" size={16} />
                <span>מופעל - לקוחות יראו את סכום העגלה בהדר</span>
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

        {/* כרטיס מדיניות משלוח והחזרות */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Icon name="TruckIcon" size={24} className={styles.cardIcon} />
              <div>
                <h3 className={styles.cardTitle}>מדיניות משלוח והחזרות</h3>
                <p className={styles.cardDescription}>
                  ניהול התוכן בטאב "משלוח והחזרות" בעמוד המוצר
                </p>
              </div>
            </div>
          </div>
          
          <div className={styles.cardContent}>
            {/* חלק משלוח */}
            <div className={styles.policySection}>
              <div className={styles.policySectionHeader}>
                <div className={styles.policySectionTitle}>
                  <Icon name="Truck" size={20} />
                  <span>משלוח</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={shippingPolicy.shipping.enabled}
                    onChange={() => handleTogglePolicySection('shipping')}
                    disabled={shippingPolicyLoading}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
              
              {shippingPolicy.shipping.enabled && (
                <div className={styles.policyItems}>
                  <ul className={styles.itemsList}>
                    {shippingPolicy.shipping.items.map((item, index) => {
                      // בדיקה האם פריט זה נמצא בעריכה
                      const isEditing = editingItemId === `shipping-${index}`;
                      
                      return (
                        <li key={index} className={styles.policyItem}>
                          {isEditing ? (
                            // מצב עריכה - input ניתן לעריכה
                            <input
                              type="text"
                              className={styles.editInput}
                              value={editingItemText}
                              onChange={(e) => setEditingItemText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditItemSave('shipping', index);
                                } else if (e.key === 'Escape') {
                                  handleEditItemCancel();
                                }
                              }}
                              autoFocus
                              disabled={shippingPolicyLoading}
                            />
                          ) : (
                            // מצב קריאה - הצגת הטקסט
                            <span>{item}</span>
                          )}
                          
                          <div className={styles.itemActions}>
                            {isEditing ? (
                              // כפתורי שומר/ביטול בעריכה
                              <>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleEditItemSave('shipping', index)}
                                  disabled={shippingPolicyLoading}
                                  title="שמור (Enter)"
                                >
                                  <Icon name="Check" size={16} />
                                </button>
                                <button
                                  className={`${styles.iconButton} ${styles.deleteButton}`}
                                  onClick={() => handleEditItemCancel()}
                                  disabled={shippingPolicyLoading}
                                  title="ביטול (Escape)"
                                >
                                  <Icon name="X" size={16} />
                                </button>
                              </>
                            ) : (
                              // כפתורי עריכה/מחיקה בקריאה
                              <>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleEditItemStart('shipping', index, item)}
                                  disabled={shippingPolicyLoading}
                                  title="ערוך"
                                >
                                  <Icon name="Pencil" size={16} />
                                </button>
                                <button
                                  className={`${styles.iconButton} ${styles.deleteButton}`}
                                  onClick={() => handleDeleteItem('shipping', index)}
                                  disabled={shippingPolicyLoading}
                                  title="מחק"
                                >
                                  <Icon name="Trash2" size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className={styles.addItemForm}>
                    <input
                      type="text"
                      className={styles.addItemInput}
                      placeholder="הוסף פריט חדש..."
                      value={tempItemInputs.shipping}
                      onChange={(e) => setTempItemInputs(prev => ({ ...prev, shipping: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tempItemInputs.shipping.trim()) {
                          handleAddItem('shipping');
                        }
                      }}
                      disabled={shippingPolicyLoading}
                    />
                    <button
                      className={styles.addButton}
                      onClick={() => handleAddItem('shipping')}
                      disabled={shippingPolicyLoading || !tempItemInputs.shipping.trim()}
                    >
                      <Icon name="Plus" size={18} />
                      הוסף
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* חלק החזרות */}
            <div className={styles.policySection}>
              <div className={styles.policySectionHeader}>
                <div className={styles.policySectionTitle}>
                  <Icon name="Undo" size={20} />
                  <span>החזרות</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={shippingPolicy.returns.enabled}
                    onChange={() => handleTogglePolicySection('returns')}
                    disabled={shippingPolicyLoading}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
              
              {shippingPolicy.returns.enabled && (
                <div className={styles.policyItems}>
                  <ul className={styles.itemsList}>
                    {shippingPolicy.returns.items.map((item, index) => {
                      // בדיקה האם פריט זה נמצא בעריכה
                      const isEditing = editingItemId === `returns-${index}`;
                      
                      return (
                        <li key={index} className={styles.policyItem}>
                          {isEditing ? (
                            // מצב עריכה - input ניתן לעריכה
                            <input
                              type="text"
                              className={styles.editInput}
                              value={editingItemText}
                              onChange={(e) => setEditingItemText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditItemSave('returns', index);
                                } else if (e.key === 'Escape') {
                                  handleEditItemCancel();
                                }
                              }}
                              autoFocus
                              disabled={shippingPolicyLoading}
                            />
                          ) : (
                            // מצב קריאה - הצגת הטקסט
                            <span>{item}</span>
                          )}
                          
                          <div className={styles.itemActions}>
                            {isEditing ? (
                              // כפתורי שומר/ביטול בעריכה
                              <>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleEditItemSave('returns', index)}
                                  disabled={shippingPolicyLoading}
                                  title="שמור (Enter)"
                                >
                                  <Icon name="Check" size={16} />
                                </button>
                                <button
                                  className={`${styles.iconButton} ${styles.deleteButton}`}
                                  onClick={() => handleEditItemCancel()}
                                  disabled={shippingPolicyLoading}
                                  title="ביטול (Escape)"
                                >
                                  <Icon name="X" size={16} />
                                </button>
                              </>
                            ) : (
                              // כפתורי עריכה/מחיקה בקריאה
                              <>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleEditItemStart('returns', index, item)}
                                  disabled={shippingPolicyLoading}
                                  title="ערוך"
                                >
                                  <Icon name="Pencil" size={16} />
                                </button>
                                <button
                                  className={`${styles.iconButton} ${styles.deleteButton}`}
                                  onClick={() => handleDeleteItem('returns', index)}
                                  disabled={shippingPolicyLoading}
                                  title="מחק"
                                >
                                  <Icon name="Trash2" size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className={styles.addItemForm}>
                    <input
                      type="text"
                      className={styles.addItemInput}
                      placeholder="הוסף פריט חדש..."
                      value={tempItemInputs.returns}
                      onChange={(e) => setTempItemInputs(prev => ({ ...prev, returns: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tempItemInputs.returns.trim()) {
                          handleAddItem('returns');
                        }
                      }}
                      disabled={shippingPolicyLoading}
                    />
                    <button
                      className={styles.addButton}
                      onClick={() => handleAddItem('returns')}
                      disabled={shippingPolicyLoading || !tempItemInputs.returns.trim()}
                    >
                      <Icon name="Plus" size={18} />
                      הוסף
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* חלק אחריות */}
            <div className={styles.policySection}>
              <div className={styles.policySectionHeader}>
                <div className={styles.policySectionTitle}>
                  <Icon name="Shield" size={20} />
                  <span>אחריות</span>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={shippingPolicy.warranty.enabled}
                    onChange={() => handleTogglePolicySection('warranty')}
                    disabled={shippingPolicyLoading}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
              
              {shippingPolicy.warranty.enabled && (
                <div className={styles.policyItems}>
                  <ul className={styles.itemsList}>
                    {shippingPolicy.warranty.items.map((item, index) => {
                      // בדיקה האם פריט זה נמצא בעריכה
                      const isEditing = editingItemId === `warranty-${index}`;
                      
                      return (
                        <li key={index} className={styles.policyItem}>
                          {isEditing ? (
                            // מצב עריכה - input ניתן לעריכה
                            <input
                              type="text"
                              className={styles.editInput}
                              value={editingItemText}
                              onChange={(e) => setEditingItemText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditItemSave('warranty', index);
                                } else if (e.key === 'Escape') {
                                  handleEditItemCancel();
                                }
                              }}
                              autoFocus
                              disabled={shippingPolicyLoading}
                            />
                          ) : (
                            // מצב קריאה - הצגת הטקסט
                            <span>{item}</span>
                          )}
                          
                          <div className={styles.itemActions}>
                            {isEditing ? (
                              // כפתורי שומר/ביטול בעריכה
                              <>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleEditItemSave('warranty', index)}
                                  disabled={shippingPolicyLoading}
                                  title="שמור (Enter)"
                                >
                                  <Icon name="Check" size={16} />
                                </button>
                                <button
                                  className={`${styles.iconButton} ${styles.deleteButton}`}
                                  onClick={() => handleEditItemCancel()}
                                  disabled={shippingPolicyLoading}
                                  title="ביטול (Escape)"
                                >
                                  <Icon name="X" size={16} />
                                </button>
                              </>
                            ) : (
                              // כפתורי עריכה/מחיקה בקריאה
                              <>
                                <button
                                  className={styles.iconButton}
                                  onClick={() => handleEditItemStart('warranty', index, item)}
                                  disabled={shippingPolicyLoading}
                                  title="ערוך"
                                >
                                  <Icon name="Pencil" size={16} />
                                </button>
                                <button
                                  className={`${styles.iconButton} ${styles.deleteButton}`}
                                  onClick={() => handleDeleteItem('warranty', index)}
                                  disabled={shippingPolicyLoading}
                                  title="מחק"
                                >
                                  <Icon name="Trash2" size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className={styles.addItemForm}>
                    <input
                      type="text"
                      className={styles.addItemInput}
                      placeholder="הוסף פריט חדש..."
                      value={tempItemInputs.warranty}
                      onChange={(e) => setTempItemInputs(prev => ({ ...prev, warranty: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tempItemInputs.warranty.trim()) {
                          handleAddItem('warranty');
                        }
                      }}
                      disabled={shippingPolicyLoading}
                    />
                    <button
                      className={styles.addButton}
                      onClick={() => handleAddItem('warranty')}
                      disabled={shippingPolicyLoading || !tempItemInputs.warranty.trim()}
                    >
                      <Icon name="Plus" size={18} />
                      הוסף
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
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

        {/* כרטיס התראות מנהל - הזמנות חדשות */}
        <div className={styles.settingsCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleWrapper}>
              <Icon name="Mail" size={24} className={styles.cardIcon} />
              <div>
                <h3 className={styles.cardTitle}>התראות מנהל</h3>
                <p className={styles.cardDescription}>
                  קבלת התראות מייל על הזמנות חדשות
                </p>
              </div>
            </div>
          </div>
          
          <div className={styles.cardContent}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>כתובות מייל להתראות</span>
                <span className={styles.settingHint}>
                  הפרד כתובות מרובות בפסיק או רווח
                </span>
              </div>
            </div>
            
            <div className={styles.notificationEmailsRow}>
              <input
                type="text"
                value={adminNotificationEmailsInput}
                onChange={(e) => setAdminNotificationEmailsInput(e.target.value)}
                placeholder="admin@example.com, manager@example.com"
                disabled={notificationSettingsLoading}
                className={styles.textInput}
                style={{ flex: 1 }}
              />
              <button
                onClick={handleSaveAdminNotificationEmails}
                disabled={notificationSettingsLoading}
                className={styles.saveButton}
              >
                {notificationSettingsLoading ? (
                  <Icon name="Loader2" size={16} className={styles.spinner} />
                ) : (
                  <Icon name="Check" size={16} />
                )}
                שמור
              </button>
            </div>
            
            {adminNotificationEmails.length > 0 && (
              <div className={styles.successBanner}>
                <Icon name="Mail" size={16} />
                <span>
                  התראות על הזמנות חדשות יישלחו ל-{adminNotificationEmails.length} כתובות
                </span>
              </div>
            )}
            
            {adminNotificationEmails.length === 0 && (
              <div className={styles.warningBanner}>
                <Icon name="AlertTriangle" size={16} />
                <span>
                  לא הוגדרו כתובות - לא יישלחו התראות על הזמנות חדשות
                </span>
              </div>
            )}
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
      
      {/* 🔐 Soft Login - ReAuth Modal */}
      <ReAuthModal
        isOpen={showReAuthModal}
        onClose={handleReAuthClose}
        onSuccess={handleReAuthSuccess}
        title="נדרש אימות מחדש"
        message="לשינוי הגדרות מערכת נדרש להזין את הסיסמה שלך"
      />
    </div>
  );
};

export default AdminSettingsPage;
