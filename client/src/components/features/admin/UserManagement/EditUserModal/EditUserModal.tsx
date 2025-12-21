// רכיב מודל עריכת משתמש ע"י מנהל
// מטרת הקומפוננטה: ממשק לעריכת פרטי משתמש קיים במערכת

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/reduxHooks';
import { updateUser } from '../../../../../store/slices/userManagementSlice';
import { fetchCustomerGroups } from '../../../../../store/slices/customerGroupsSlice';
import userManagementService from '../../../../../services/userManagementService';
import type { UpdateUserRequest, UserDetails } from '../../../../../types/UserManagement';
import { Button } from '../../../../ui';
import { Modal } from '../../../../ui';
import { Input } from '../../../../ui';
import { UserCog, AlertCircle, Loader2 } from 'lucide-react';
import styles from './EditUserModal.module.css';

// ==========================================
// טיפוסים מקומיים לקומפוננטה
// ==========================================

/**
 * Props של הקומפוננטה
 */
interface EditUserModalProps {
  /** האם המודל פתוח */
  isOpen: boolean;
  /** פונקציה לסגירת המודל */
  onClose: () => void;
  /** מזהה המשתמש לעריכה */
  userId: string | null;
  /** פונקציה שתופעל לאחר עדכון מוצלח */
  onSuccess?: () => void;
}

/**
 * מבנה הטופס לעריכת משתמש
 */
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin' | 'super_admin';
  customerGroupId: string;
  isActive: boolean;
}

/**
 * שגיאות ולידציה
 */
interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

// מצב התחלתי של הטופס
const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'customer',
  customerGroupId: '',
  isActive: true
};

// ==========================================
// קומפוננטה ראשית - מודל עריכת משתמש
// ==========================================

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSuccess
}) => {
  const dispatch = useAppDispatch();

  // חיבור ל-Redux store
  const { groups: customerGroups, loading: groupsLoading } = useAppSelector(
    (state) => state.customerGroups
  );
  const { loading: updateLoading, error: updateError } = useAppSelector(
    (state) => state.userManagement
  );

  // מצבים מקומיים
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [originalData, setOriginalData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  // טעינת פרטי המשתמש ורשימת הקבוצות בעת פתיחת המודל
  useEffect(() => {
    if (isOpen && userId) {
      dispatch(fetchCustomerGroups());
      loadUserDetails(userId);
    }
  }, [isOpen, userId, dispatch]);

  // טעינת פרטי המשתמש
  const loadUserDetails = async (id: string) => {
    setLoadingUser(true);
    setSubmitError(null);
    
    try {
      const response = await userManagementService.getUserById(id);
      if (response.success && response.data) {
        const user = response.data;
        setUserDetails(user);
        
        // מילוי הטופס בפרטי המשתמש
        const loadedData: FormData = {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          role: user.role || 'customer',
          customerGroupId: typeof user.customerGroupId === 'string' 
            ? user.customerGroupId 
            : (user.customerGroupId as any)?._id || '',
          isActive: user.isActive ?? true
        };
        
        setFormData(loadedData);
        setOriginalData(loadedData);
        setErrors({});
      } else {
        setSubmitError('לא ניתן לטעון את פרטי המשתמש');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSubmitError(message || 'שגיאה בטעינת פרטי המשתמש');
    } finally {
      setLoadingUser(false);
    }
  };

  // ==========================================
  // פונקציות ולידציה
  // ==========================================

  /**
   * ולידציה של שדה בודד
   */
  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return 'שם פרטי הוא שדה חובה';
        if (value.trim().length < 2) return 'שם פרטי חייב להכיל לפחות 2 תווים';
        return undefined;

      case 'lastName':
        if (!value.trim()) return 'שם משפחה הוא שדה חובה';
        if (value.trim().length < 2) return 'שם משפחה חייב להכיל לפחות 2 תווים';
        return undefined;

      case 'email':
        if (!value.trim()) return 'אימייל הוא שדה חובה';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'כתובת אימייל לא תקינה';
        return undefined;

      default:
        return undefined;
    }
  };

  /**
   * ולידציה של כל הטופס
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      firstName: validateField('firstName', formData.firstName),
      lastName: validateField('lastName', formData.lastName),
      email: validateField('email', formData.email)
    };

    // הסרת שגיאות ריקות
    Object.keys(newErrors).forEach((key) => {
      if (!newErrors[key as keyof FormErrors]) {
        delete newErrors[key as keyof FormErrors];
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==========================================
  // פונקציות טיפול באירועים
  // ==========================================

  /**
   * טיפול בשינוי שדה בטופס
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // ניקוי שגיאה בעת הקלדה
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  /**
   * בדיקה האם יש שינויים
   */
  const hasChanges = (): boolean => {
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  /**
   * טיפול בשליחת הטופס
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // ולידציה
    if (!validateForm()) {
      return;
    }

    // בדיקה שיש שינויים
    if (!hasChanges()) {
      onClose();
      return;
    }

    if (!userId) {
      setSubmitError('לא ניתן לזהות את המשתמש');
      return;
    }

    try {
      // בניית אובייקט העדכון - רק שדות שהשתנו
      const updateData: UpdateUserRequest = {};

      if (formData.firstName !== originalData.firstName) {
        updateData.firstName = formData.firstName.trim();
      }
      if (formData.lastName !== originalData.lastName) {
        updateData.lastName = formData.lastName.trim();
      }
      if (formData.email !== originalData.email) {
        updateData.email = formData.email.trim().toLowerCase();
      }
      if (formData.phone !== originalData.phone) {
        updateData.phone = formData.phone.trim() || null;
      }
      if (formData.role !== originalData.role) {
        updateData.role = formData.role;
      }
      if (formData.customerGroupId !== originalData.customerGroupId) {
        updateData.customerGroupId = formData.customerGroupId || null;
      }
      if (formData.isActive !== originalData.isActive) {
        updateData.isActive = formData.isActive;
      }

      // שליחה לשרת
      await dispatch(updateUser({ userId, userData: updateData })).unwrap();

      // הצלחה - סגירת המודל וקריאה ל-callback
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSubmitError(message || 'שגיאה בעדכון המשתמש');
    }
  };

  /**
   * סגירת המודל ואיפוס
   */
  const handleClose = () => {
    setFormData(initialFormData);
    setOriginalData(initialFormData);
    setErrors({});
    setSubmitError(null);
    setUserDetails(null);
    onClose();
  };

  // ==========================================
  // רינדור הקומפוננטה
  // ==========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="עריכת פרטי משתמש"
    >
      <div className={styles.container}>
        {/* מצב טעינה */}
        {loadingUser ? (
          <div className={styles.loading}>
            <Loader2 size={32} className={styles.spinner} />
            <span>טוען פרטי משתמש...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* הודעת שגיאה כללית */}
            {(submitError || updateError) && (
              <div className={styles.error}>
                <AlertCircle size={18} />
                <span>{submitError || updateError}</span>
              </div>
            )}

            {/* מידע על המשתמש */}
            {userDetails && (
              <div className={styles.userInfo}>
                <span className={styles.userInfoLabel}>עריכת המשתמש:</span>
                <span className={styles.userInfoValue}>
                  {userDetails.email}
                </span>
              </div>
            )}

            {/* שם פרטי ושם משפחה */}
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="firstName" className={styles.label}>
                  שם פרטי <span className={styles.required}>*</span>
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="הכנס שם פרטי"
                  className={errors.firstName ? styles.inputError : ''}
                />
                {errors.firstName && (
                  <span className={styles.fieldError}>{errors.firstName}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="lastName" className={styles.label}>
                  שם משפחה <span className={styles.required}>*</span>
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="הכנס שם משפחה"
                  className={errors.lastName ? styles.inputError : ''}
                />
                {errors.lastName && (
                  <span className={styles.fieldError}>{errors.lastName}</span>
                )}
              </div>
            </div>

            {/* אימייל */}
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                אימייל <span className={styles.required}>*</span>
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example@email.com"
                className={errors.email ? styles.inputError : ''}
              />
              {errors.email && (
                <span className={styles.fieldError}>{errors.email}</span>
              )}
            </div>

            {/* טלפון */}
            <div className={styles.field}>
              <label htmlFor="phone" className={styles.label}>
                טלפון (אופציונלי)
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="050-0000000"
              />
            </div>

            {/* תפקיד */}
            <div className={styles.field}>
              <label htmlFor="role" className={styles.label}>
                תפקיד
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={styles.select}
              >
                <option value="customer">לקוח</option>
                <option value="admin">מנהל</option>
                <option value="super_admin">מנהל ראשי</option>
              </select>
            </div>

            {/* קבוצת לקוחות - רק אם התפקיד הוא customer */}
            {formData.role === 'customer' && (
              <div className={styles.field}>
                <label htmlFor="customerGroupId" className={styles.label}>
                  קבוצת לקוחות (אופציונלי)
                </label>
                <select
                  id="customerGroupId"
                  name="customerGroupId"
                  value={formData.customerGroupId}
                  onChange={handleChange}
                  className={styles.select}
                  disabled={groupsLoading}
                >
                  <option value="">ללא קבוצה</option>
                  {customerGroups
                    .filter((group) => group.isActive)
                    .map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name} ({group.discountPercentage}% הנחה)
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* סטטוס פעיל */}
            <div className={styles.checkboxField}>
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className={styles.checkbox}
              />
              <label htmlFor="isActive" className={styles.checkboxLabel}>
                משתמש פעיל
              </label>
            </div>

            {/* כפתורי פעולה */}
            <div className={styles.actions}>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateLoading}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={updateLoading || !hasChanges()}
              >
                {updateLoading ? (
                  'שומר שינויים...'
                ) : (
                  <>
                    <UserCog size={18} />
                    שמור שינויים
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default EditUserModal;
