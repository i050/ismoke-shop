/**
 * CheckoutPage - עמוד השלמת הזמנה
 * כולל טופס פרטי משלוח וסיכום הזמנה
 * תומך ב-Mock Payment Mode
 * Phase 4.1: שולח רק פריטים נבחרים להזמנה
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/reduxHooks';
import { 
  fetchCart, 
  clearCart,
  // Phase 4.1: selectors לפריטים נבחרים
  selectSelectedItems,
  selectSelectedSubtotal,
  selectSelectedIsFreeShipping,
} from '../../store/slices/cartSlice';
import { loginSuccess } from '../../store/slices/authSlice';
import { orderService, type CreateOrderData, type ShippingAddress } from '../../services/orderService';
import { getPublicSettings, type PublicSettings } from '../../services/settingsService';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import Modal from '../../components/ui/Modal';
import StockAlertButton from '../../components/features/products/StockAlertButton';
import { setUser } from '../../utils/tokenUtils';
import { API_BASE_URL } from '../../config/api';
import styles from './CheckoutPage.module.css';

// =====================================
// קבועים
// =====================================

// ערכי ברירת מחדל (ישמשו אם הטעינה נכשלה)
const DEFAULT_SHIPPING_THRESHOLD = 200;
const DEFAULT_SHIPPING_COST = 30;
// Phase 4.2: מע"מ כלול במחיר - לא מחשבים בנפרד

// סטטוס הטופס
type CheckoutStep = 'shipping' | 'payment' | 'processing' | 'complete';

// =====================================
// קומפוננטה ראשית
// =====================================

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // נתונים מה-store
  const cart = useAppSelector((state) => state.cart.cart);
  const cartItems = cart?.items || [];
  // Phase 4.1: שימוש בפריטים נבחרים בלבד
  const selectedItems = useAppSelector(selectSelectedItems);
  const selectedSubtotal = useAppSelector(selectSelectedSubtotal);
  const selectedIsFreeShipping = useAppSelector(selectSelectedIsFreeShipping);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  
  // מצבים מקומיים
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // שגיאת מלאי ספציפית - כאשר פריט אזל תוך כדי ביצוע ההזמנה
  const [stockError, setStockError] = useState<{
    message: string;
    productId?: string;
    productName?: string;
    sku?: string;
  } | null>(null);
  
  // הגדרות מהשרת
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [_settingsLoading, setSettingsLoading] = useState(true);
  
  // פרטי משלוח - מילוי אוטומטי מפרטי המשתמש
  const [shippingData, setShippingData] = useState<ShippingAddress>({
    fullName: user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : '',
    phone: user?.phone || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    postalCode: user?.address?.postalCode || '',
    country: user?.address?.country || 'ישראל',
    notes: ''
  });
  
  // מצב למודל עדכון פרטים בפרופיל
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const [profileUpdateData, setProfileUpdateData] = useState<{
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  } | null>(null);
  
  // שגיאות ולידציה
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});
  
  // חישובי הגדרות משלוח (מהשרת או ברירת מחדל)
  const shippingThreshold = settings?.shipping.freeShippingThreshold ?? DEFAULT_SHIPPING_THRESHOLD;
  const shippingCost = settings?.shipping.defaultShippingCost ?? DEFAULT_SHIPPING_COST;
  const allowUnpaidOrders = settings?.orders.allowUnpaidOrders ?? false;
  const disablePayment = settings?.orders.disablePayment ?? false;
  
  // Phase 4.1 + 4.2: חישוב סכומים - מבוסס על פריטים נבחרים, מע"מ כלול במחיר
  const subtotal = selectedSubtotal;
  const shipping = selectedIsFreeShipping ? 0 : shippingCost;
  
  // Phase 6.0: חישוב הנחת סף
  const thresholdDiscountSettings = settings?.thresholdDiscount;
  const isEligibleForThresholdDiscount = thresholdDiscountSettings?.enabled && subtotal >= (thresholdDiscountSettings?.minimumAmount ?? 0);
  const thresholdDiscountAmount = isEligibleForThresholdDiscount
    ? (subtotal * (thresholdDiscountSettings?.discountPercentage ?? 0)) / 100
    : 0;
  
  const total = subtotal + shipping - thresholdDiscountAmount;
  
  // טעינת הסל והגדרות בעלייה לעמוד
  useEffect(() => {
    dispatch(fetchCart());
    
    // טעינת הגדרות מהשרת
    const loadSettings = async () => {
      try {
        setSettingsLoading(true);
        const response = await getPublicSettings();
        if (response.success) {
          setSettings(response.data);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        // ימשיך עם ערכי ברירת מחדל
      } finally {
        setSettingsLoading(false);
      }
    };
    
    loadSettings();
  }, [dispatch]);
  
  // בדיקת אימות
  useEffect(() => {
    if (!isAuthenticated) {
      // אם המשתמש לא מחובר, נשמור את הנתיב הנוכחי ונעביר להתחברות
      navigate('/login?redirect=/checkout');
    }
  }, [isAuthenticated, navigate]);
  
  // ולידציה של שדות הטופס
  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof ShippingAddress, string>> = {};
    
    if (!shippingData.fullName.trim()) {
      errors.fullName = 'שם מלא הוא שדה חובה';
    }
    
    if (!shippingData.phone.trim()) {
      errors.phone = 'טלפון הוא שדה חובה';
    } else if (!/^0\d{8,9}$/.test(shippingData.phone.replace(/[-\s]/g, ''))) {
      errors.phone = 'מספר טלפון לא תקין';
    }
    
    if (!shippingData.street.trim()) {
      errors.street = 'רחוב ומספר הוא שדה חובה';
    }
    
    if (!shippingData.city.trim()) {
      errors.city = 'עיר היא שדה חובה';
    }
    
    // מיקוד אינו חובה, אך אם הוזן - חייב להיות תקין
    if (shippingData.postalCode.trim() && !/^\d{5,7}$/.test(shippingData.postalCode)) {
      errors.postalCode = 'מיקוד לא תקין (5-7 ספרות)';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [shippingData]);
  
  // פונקציה לבדיקה אם יש פרטים חדשים/שונים לעדכון בפרופיל
  // רק מוסיפה/מעדכנת - לא מוחקת פרטים קיימים
  const checkForProfileUpdates = useCallback(() => {
    const updates: {
      phone?: string;
      address?: {
        street?: string;
        city?: string;
        postalCode?: string;
        country?: string;
      };
    } = {};
    
    // בדיקת טלפון - רק אם הוזן ערך חדש שונה מהקיים
    if (shippingData.phone && shippingData.phone !== user?.phone) {
      updates.phone = shippingData.phone;
    }
    
    // בדיקת כתובת - רק שדות שהוזנו ושונים מהקיים
    const addressUpdates: { street?: string; city?: string; postalCode?: string; country?: string } = {};
    
    if (shippingData.street && shippingData.street !== user?.address?.street) {
      addressUpdates.street = shippingData.street;
    }
    if (shippingData.city && shippingData.city !== user?.address?.city) {
      addressUpdates.city = shippingData.city;
    }
    if (shippingData.postalCode && shippingData.postalCode !== user?.address?.postalCode) {
      addressUpdates.postalCode = shippingData.postalCode;
    }
    if (shippingData.country && shippingData.country !== user?.address?.country) {
      addressUpdates.country = shippingData.country;
    }
    
    // הוספת כתובת רק אם יש שינויים
    if (Object.keys(addressUpdates).length > 0) {
      updates.address = addressUpdates;
    }
    
    // מחזיר null אם אין שינויים
    return Object.keys(updates).length > 0 ? updates : null;
  }, [shippingData, user]);
  
  // מעבר לשלב התשלום
  const handleContinueToPayment = () => {
    if (validateForm()) {
      // בדיקה אם יש פרטים חדשים/שונים לעדכון בפרופיל
      const updatesToProfile = checkForProfileUpdates();
      if (updatesToProfile) {
        setProfileUpdateData(updatesToProfile);
        setShowUpdateProfileModal(true);
        // לא עוברים לשלב התשלום עדיין - ממתינים לתשובת המשתמש במודל
      } else {
        // אין עדכונים - ממשיכים ישירות לתשלום
        setStep('payment');
        setError(null);
      }
    }
  };
  
  // חזרה לשלב המשלוח
  const handleBackToShipping = () => {
    setStep('shipping');
    setError(null);
  };
  
  // ביצוע ההזמנה (Mock Payment או ללא תשלום)
  const handlePlaceOrder = async (skipPayment: boolean = false) => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError(null);
    setStep('processing');
    
    try {
      // Phase 4.1: יצירת נתוני ההזמנה - רק פריטים נבחרים!
      const orderData: CreateOrderData = {
        items: selectedItems.map(item => ({
          productId: item.productId,
          skuId: item.sku,  // sku code string - השרת יחפש לפי קוד
          quantity: item.quantity
        })),
        shippingAddress: shippingData,
        notes: skipPayment 
          ? `${shippingData.notes || ''} [הזמנה ללא תשלום מיידי]`.trim()
          : shippingData.notes || undefined
      };
      
      // יצירת ההזמנה
      const response = await orderService.createOrder(orderData);
      
      if (!response.success) {
        throw new Error(response.message || 'שגיאה ביצירת ההזמנה');
      }
      
      // Phase 4.1: ניקוי העגלה - כרגע מנקה הכל, בעתיד אפשר לעדכן שישאיר פריטים לא נבחרים
      dispatch(clearCart());
      
      // מעבר לעמוד ההצלחה
      setStep('complete');
      navigate(`/order-success/${response.data._id}`);
      
    } catch (err: any) {
      console.error('שגיאה בתהליך ההזמנה:', err);
      
      // בדיקה אם זו שגיאת מלאי
      const errorMessage = err.message || '';
      const isStockError = errorMessage.includes('מלאי') || 
                          errorMessage.includes('stock') || 
                          errorMessage.includes('INSUFFICIENT');
      
      if (isStockError) {
        // ניסיון לחלץ פרטי המוצר מהשגיאה
        // הפורמט הצפוי: "אין מספיק מלאי עבור SKU: PROD-123-BLUE"
        const skuMatch = errorMessage.match(/SKU[:\s]+([A-Z0-9-]+)/i);
        const sku = skuMatch ? skuMatch[1] : undefined;
        
        // מציאת הפריט הרלוונטי בעגלה לפי SKU
        const item = sku ? cartItems.find(i => i.sku === sku) : undefined;
        
        setStockError({
          message: 'המוצר אזל מהמלאי בזמן ביצוע ההזמנה',
          productId: item?.productId,
          productName: item?.name,
          sku: sku || item?.sku,
        });
        setError(null); // ננקה שגיאה כללית כי יש לנו שגיאה ספציפית
      } else {
        setError(err.message || 'אירעה שגיאה בתהליך ההזמנה. אנא נסה שוב.');
        setStockError(null);
      }
      
      setStep('payment');
    } finally {
      setIsLoading(false);
    }
  };
  
  // פונקציה לעדכון הפרופיל עם הפרטים החדשים
  const handleUpdateProfile = async () => {
    if (!profileUpdateData || !user) {
      setShowUpdateProfileModal(false);
      return;
    }
    
    try {
      // מיזוג הכתובת הקיימת עם העדכונים (שמירת שדות קיימים שלא השתנו)
      const mergedAddress = {
        ...user.address,
        ...profileUpdateData.address
      };
      
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: profileUpdateData.phone || user.phone,
          address: mergedAddress
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.user) {
        // עדכון localStorage ו-Redux
        setUser(data.data.user);
        dispatch(loginSuccess(data.data.user));
      }
    } catch (error) {
      console.error('שגיאה בעדכון הפרופיל:', error);
    } finally {
      setShowUpdateProfileModal(false);
      // ממשיכים לשלב התשלום אחרי סגירת המודל
      setStep('payment');
      setError(null);
    }
  };
  
  // סגירת המודל ללא עדכון הפרופיל - ממשיכים לתשלום
  const handleSkipProfileUpdate = () => {
    setShowUpdateProfileModal(false);
    setStep('payment');
    setError(null);
  };
  
  // עדכון שדה בטופס
  const handleInputChange = (field: keyof ShippingAddress, value: string) => {
    setShippingData(prev => ({ ...prev, [field]: value }));
    // ניקוי שגיאה כשהמשתמש מתחיל להקליד
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  // Phase 4.1: אם אין פריטים נבחרים (או סל ריק) - הפניה לעמוד הסל
  if (!cart || cartItems.length === 0 || selectedItems.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyCart}>
          <div className={styles.emptyIcon}><Icon name="ShoppingCart" size={48} /></div>
          <h2>{selectedItems.length === 0 && cartItems.length > 0 ? 'לא נבחרו פריטים' : 'העגלה ריקה'}</h2>
          <p>{selectedItems.length === 0 && cartItems.length > 0 
            ? 'בחר לפחות פריט אחד בעגלה כדי להמשיך לתשלום' 
            : 'הוסף מוצרים לעגלה לפני שתמשיך לתשלום'}</p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate(cartItems.length > 0 ? '/cart' : '/products')}
          >
            {cartItems.length > 0 ? 'חזרה לעגלה' : 'חזרה לחנות'}
          </Button>
        </div>
      </div>
    );
  }
  
  // מסך עיבוד
  if (step === 'processing') {
    return (
      <div className={styles.container}>
        <div className={styles.processing}>
          <div className={styles.spinner} />
          <h2>מעבד את ההזמנה...</h2>
          <p>אנא המתן, התהליך עשוי לקחת מספר שניות</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      {/* כותרת */}
      <div className={styles.header}>
        <h1 className={styles.title}>השלמת הזמנה</h1>
        <div className={styles.steps}>
          <div className={`${styles.stepIndicator} ${step === 'shipping' ? styles.active : styles.completed}`}>
            <span className={styles.stepNumber}>1</span>
            <span className={styles.stepLabel}>פרטי משלוח</span>
          </div>
          <div className={styles.stepDivider} />
          <div className={`${styles.stepIndicator} ${step === 'payment' ? styles.active : ''}`}>
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepLabel}>תשלום</span>
          </div>
        </div>
      </div>
      
      {/* שגיאה כללית */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorIcon}><Icon name="AlertTriangle" size={20} /></span>
          <span>{error}</span>
          <button 
            className={styles.errorClose} 
            onClick={() => setError(null)}
            aria-label="סגור הודעת שגיאה"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* שגיאת מלאי - עם כפתור "עדכנו אותי" */}
      {stockError && (
        <div className={styles.stockErrorBanner} role="alert">
          <div className={styles.stockErrorContent}>
            <div className={styles.stockErrorHeader}>
              <Icon name="AlertCircle" size={22} />
              <span className={styles.stockErrorTitle}>אזל מהמלאי</span>
            </div>
            <p className={styles.stockErrorMessage}>
              {stockError.productName 
                ? `המוצר "${stockError.productName}" אזל מהמלאי בזמן ביצוע ההזמנה.`
                : 'אחד המוצרים בהזמנה אזל מהמלאי.'}
            </p>
            <p className={styles.stockErrorHint}>
              ניתן להירשם להתראה ונודיע לך כשהמוצר יחזור למלאי.
            </p>
          </div>
          <div className={styles.stockErrorActions}>
            {stockError.productId && stockError.productName && (
              <StockAlertButton
                productId={stockError.productId}
                productName={stockError.productName}
                sku={stockError.sku}
                userEmail={user?.email}
                variant="minimal"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStockError(null);
                navigate('/cart');
              }}
            >
              חזרה לעגלה
            </Button>
          </div>
        </div>
      )}
      
      {/* תוכן ראשי */}
      <div className={styles.content}>
        {/* טופס */}
        <div className={styles.formPanel}>
          {step === 'shipping' && (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}><Icon name="Package" size={20} /></span>
                פרטי משלוח
              </h2>
              
              <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleContinueToPayment(); }}>
                {/* שם מלא */}
                <div className={styles.formGroup}>
                  <label htmlFor="fullName" className={styles.label}>
                    שם מלא <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    className={`${styles.input} ${validationErrors.fullName ? styles.inputError : ''}`}
                    value={shippingData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="ישראל ישראלי"
                  />
                  {validationErrors.fullName && (
                    <span className={styles.fieldError}>{validationErrors.fullName}</span>
                  )}
                </div>
                
                {/* טלפון */}
                <div className={styles.formGroup}>
                  <label htmlFor="phone" className={styles.label}>
                    טלפון <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className={`${styles.input} ${validationErrors.phone ? styles.inputError : ''}`}
                    value={shippingData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="050-1234567"
                    dir="ltr"
                  />
                  {validationErrors.phone && (
                    <span className={styles.fieldError}>{validationErrors.phone}</span>
                  )}
                </div>
                
                {/* רחוב */}
                <div className={styles.formGroup}>
                  <label htmlFor="street" className={styles.label}>
                    רחוב ומספר <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="street"
                    type="text"
                    className={`${styles.input} ${validationErrors.street ? styles.inputError : ''}`}
                    value={shippingData.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    placeholder="רחוב הרצל 123, דירה 4"
                  />
                  {validationErrors.street && (
                    <span className={styles.fieldError}>{validationErrors.street}</span>
                  )}
                </div>
                
                {/* עיר ומיקוד */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="city" className={styles.label}>
                      עיר <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      className={`${styles.input} ${validationErrors.city ? styles.inputError : ''}`}
                      value={shippingData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="תל אביב"
                    />
                    {validationErrors.city && (
                      <span className={styles.fieldError}>{validationErrors.city}</span>
                    )}
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="postalCode" className={styles.label}>
                      מיקוד
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      className={`${styles.input} ${validationErrors.postalCode ? styles.inputError : ''}`}
                      value={shippingData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      placeholder="1234567 (אופציונלי)"
                      dir="ltr"
                    />
                    {validationErrors.postalCode && (
                      <span className={styles.fieldError}>{validationErrors.postalCode}</span>
                    )}
                  </div>
                </div>
                
                {/* הערות */}
                <div className={styles.formGroup}>
                  <label htmlFor="notes" className={styles.label}>
                    הערות למשלוח
                  </label>
                  <textarea
                    id="notes"
                    className={styles.textarea}
                    value={shippingData.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="הערות מיוחדות לשליח (אופציונלי)"
                    rows={3}
                  />
                </div>
                
                {/* כפתורים */}
                <div className={styles.formActions}>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => navigate('/cart')}
                    type="button"
                  >
                    חזרה לעגלה
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    type="submit"
                  >
                    המשך לתשלום
                  </Button>
                </div>
              </form>
            </div>
          )}
          
          {step === 'payment' && (
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}><Icon name="CreditCard" size={20} /></span>
                תשלום
              </h2>
              
              {/* סיכום כתובת */}
              <div className={styles.addressSummary}>
                <div className={styles.addressHeader}>
                  <h3>כתובת למשלוח</h3>
                  <button 
                    className={styles.editButton}
                    onClick={handleBackToShipping}
                    type="button"
                  >
                    ערוך
                  </button>
                </div>
                <p className={styles.addressText}>
                  {shippingData.fullName}<br />
                  {shippingData.street}<br />
                  {shippingData.city}, {shippingData.postalCode}<br />
                  טלפון: {shippingData.phone}
                </p>
              </div>
              
              {/* Mock Payment Notice - רק אם התשלום לא מכובה */}
              {!disablePayment && (
                <div className={styles.mockPaymentNotice}>
                  <div className={styles.noticeIcon}><Icon name="Construction" size={24} /></div>
                  <div className={styles.noticeContent}>
                    <h4>מצב פיתוח - תשלום מדומה</h4>
                    <p>
                      המערכת פועלת במצב פיתוח. התשלום יאושר אוטומטית ללא חיוב אמיתי.
                    </p>
                  </div>
                </div>
              )}
              
              {/* הודעה כשאפשרות התשלום מכובה */}
              {disablePayment && (
                <div className={styles.unpaidOrderOption}>
                  <div className={styles.unpaidOrderIcon}><Icon name="CreditCard" size={24} /></div>
                  <div className={styles.unpaidOrderContent}>
                    <h4>הזמנה ללא תשלום</h4>
                    <p>
                      באתר זה ניתן לבצע הזמנה ללא תשלום מיידי.
                      ניתן לשלם מאוחר יותר (העברה בנקאית, מזומן בעת מסירה וכו')
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => handlePlaceOrder(true)}
                      disabled={isLoading}
                      className={styles.unpaidOrderButton}
                    >
                      {isLoading ? 'מעבד...' : `בצע הזמנה - ₪${total.toFixed(2)}`}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* אפשרות הזמנה ללא תשלום - רק אם allowUnpaidOrders מופעל ותשלום לא מכובה */}
              {allowUnpaidOrders && !disablePayment && (
                <div className={styles.unpaidOrderOption}>
                  <div className={styles.unpaidOrderIcon}><Icon name="CreditCard" size={24} /></div>
                  <div className={styles.unpaidOrderContent}>
                    <h4>הזמנה ללא תשלום מיידי</h4>
                    <p>
                      ניתן לבצע הזמנה ולשלם מאוחר יותר (העברה בנקאית, מזומן בעת מסירה וכו')
                    </p>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => handlePlaceOrder(true)}
                      disabled={isLoading}
                      className={styles.unpaidOrderButton}
                    >
                      {isLoading ? 'מעבד...' : 'בצע הזמנה ללא תשלום'}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* כפתורים - רק אם התשלום לא מכובה */}
              {!disablePayment && (
                <div className={styles.formActions}>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={handleBackToShipping}
                    disabled={isLoading}
                  >
                    חזרה
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => handlePlaceOrder(false)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'מעבד...' : `בצע הזמנה - ₪${total.toFixed(2)}`}
                  </Button>
                </div>
              )}
              
              {/* כפתור חזרה בלבד כשתשלום מכובה */}
              {disablePayment && (
                <div className={styles.formActions}>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={handleBackToShipping}
                    disabled={isLoading}
                  >
                    חזרה לפרטי משלוח
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* סיכום הזמנה */}
        <div className={styles.summaryPanel}>
          <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>סיכום הזמנה</h2>
            
            {/* Phase 4.1: רשימת פריטים נבחרים בלבד */}
            <div className={styles.summaryItems}>
              {selectedItems.map((item) => (
                <div key={item._id || item.sku} className={styles.summaryItem}>
                  <div className={styles.itemImage}>
                    <img src={item.image} alt={item.name} />
                    <span className={styles.itemQuantity}>{item.quantity}</span>
                  </div>
                  <div className={styles.itemDetails}>
                    <h4 className={styles.itemName}>{item.name}</h4>
                    {item.variant?.color && (
                      <span className={styles.itemVariant}>
                        צבע: {item.variant.color}
                      </span>
                    )}
                    {item.variant?.size && (
                      <span className={styles.itemVariant}>
                        מידה: {item.variant.size}
                      </span>
                    )}
                  </div>
                  <span className={styles.itemPrice}>
                    ₪{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            {/* פירוט מחירים */}
            <div className={styles.summaryTotals}>
              <div className={styles.summaryRow}>
                <span>סכום ביניים:</span>
                <span>₪{subtotal.toFixed(2)}</span>
              </div>
              {/* Phase 4.2: מע"מ כלול במחיר - לא מציגים בנפרד */}
              <div className={styles.summaryRow}>
                <span>משלוח:</span>
                <span className={shipping === 0 ? styles.freeShipping : ''}>
                  {shipping === 0 ? <><Icon name="Gem" size={16} /> חינם</> : `₪${shipping.toFixed(2)}`}
                </span>
              </div>
              {/* Phase 6.0: הנחת סף */}
              {thresholdDiscountAmount > 0 && (
                <div className={`${styles.summaryRow} ${styles.thresholdDiscount}`}>
                  <span className={styles.thresholdDiscountLabel}>
                    <Icon name="Gift" size={16} /> הנחת סף ({thresholdDiscountSettings?.discountPercentage}%):
                  </span>
                  <span>-₪{thresholdDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className={styles.summaryDivider} />
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <span>סה"כ לתשלום:</span>
                <span>₪{total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Trust badges */}
            <div className={styles.trustBadges}>
              <div className={styles.badge}>
                <span className={styles.badgeIcon}><Icon name="Shield" size={16} /></span>
                <span>תשלום מאובטח</span>
              </div>
              <div className={styles.badge}>
                <span className={styles.badgeIcon}><Icon name="Truck" size={16} /></span>
                <span>משלוח מהיר</span>
              </div>
              <div className={styles.badge}>
                <span className={styles.badgeIcon}><Icon name="Undo" size={16} /></span>
                <span>החזרה חינם</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* מודל לעדכון פרטי הפרופיל */}
      <Modal
        isOpen={showUpdateProfileModal}
        onClose={handleSkipProfileUpdate}
        title="עדכון פרטי הפרופיל"
      >
        <div className={styles.updateProfileModal}>
          <p className={styles.updateProfileText}>
            שמנו לב שהזנת פרטים חדשים/שונים. האם לעדכן את פרטי הפרופיל שלך?
          </p>
          
          {profileUpdateData && (
            <div className={styles.updateProfileDetails}>
              {profileUpdateData.phone && (
                <div className={styles.updateProfileItem}>
                  <strong>טלפון:</strong> {profileUpdateData.phone}
                </div>
              )}
              {profileUpdateData.address?.street && (
                <div className={styles.updateProfileItem}>
                  <strong>רחוב:</strong> {profileUpdateData.address.street}
                </div>
              )}
              {profileUpdateData.address?.city && (
                <div className={styles.updateProfileItem}>
                  <strong>עיר:</strong> {profileUpdateData.address.city}
                </div>
              )}
              {profileUpdateData.address?.postalCode && (
                <div className={styles.updateProfileItem}>
                  <strong>מיקוד:</strong> {profileUpdateData.address.postalCode}
                </div>
              )}
              {profileUpdateData.address?.country && (
                <div className={styles.updateProfileItem}>
                  <strong>מדינה:</strong> {profileUpdateData.address.country}
                </div>
              )}
            </div>
          )}
          
          <div className={styles.updateProfileActions}>
            <Button
              variant="outline"
              onClick={handleSkipProfileUpdate}
            >
              לא, תודה
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateProfile}
            >
              כן, עדכן את הפרופיל
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CheckoutPage;
