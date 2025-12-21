// רכיב מודל יצירת משתמש חדש ע"י מנהל
// מטרת הקומפוננטה: ממשק להוספת משתמש חדש למערכת

import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../../hooks/reduxHooks';
import { createUser } from '../../../../../store/slices/userManagementSlice';
import { fetchCustomerGroups } from '../../../../../store/slices/customerGroupsSlice';
import type { CreateUserRequest } from '../../../../../types/UserManagement';
import { Button } from '../../../../ui';
import { Modal } from '../../../../ui';
import { Input } from '../../../../ui';
import { Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';
import styles from './CreateUserModal.module.css';

// ==========================================
// טיפוסים מקומיים לקומפוננטה
// ==========================================

/**
 * Props של הקומפוננטה
 */
interface CreateUserModalProps {
  /** האם המודל פתוח */
  isOpen: boolean;
  /** פונקציה לסגירת המודל */
  onClose: () => void;
  /** פונקציה שתופעל לאחר יצירה מוצלחת */
  onSuccess?: () => void;
}

/**
 * מבנה הטופס ליצירת משתמש
 */
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
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
  password?: string;
  confirmPassword?: string;
}

// מצב התחלתי של הטופס
const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'customer',
  customerGroupId: '',
  isActive: true
};

// ==========================================
// קומפוננטה ראשית - מודל יצירת משתמש
// ==========================================

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const dispatch = useAppDispatch();

  // חיבור ל-Redux store
  const { groups: customerGroups, loading: groupsLoading } = useAppSelector(
    (state) => state.customerGroups
  );
  const { loading: createLoading, error: createError } = useAppSelector(
    (state) => state.userManagement
  );

  // מצבים מקומיים
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // טעינת קבוצות לקוחות בעת פתיחת המודל
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchCustomerGroups());
      // איפוס הטופס
      setFormData(initialFormData);
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, dispatch]);

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

      case 'password':
        if (!value) return 'סיסמה היא שדה חובה';
        if (value.length < 8) return 'סיסמה חייבת להכיל לפחות 8 תווים';
        return undefined;

      case 'confirmPassword':
        if (!value) return 'אישור סיסמה הוא שדה חובה';
        if (value !== formData.password) return 'הסיסמאות אינן תואמות';
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
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword)
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
   * טיפול בשליחת הטופס
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // ולידציה
    if (!validateForm()) {
      return;
    }

    try {
      // הכנת הנתונים לשליחה
      const userData: CreateUserRequest = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        isActive: formData.isActive
      };

      // הוספת קבוצת לקוחות רק אם נבחרה
      if (formData.customerGroupId) {
        userData.customerGroupId = formData.customerGroupId;
      }

      // שליחה לשרת
      await dispatch(createUser(userData)).unwrap();

      // הצלחה - סגירת המודל וקריאה ל-callback
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSubmitError(message || 'שגיאה ביצירת המשתמש');
    }
  };

  /**
   * יצירת סיסמה אקראית
   */
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({
      ...prev,
      password,
      confirmPassword: password
    }));
    // ניקוי שגיאות סיסמה
    setErrors((prev) => ({
      ...prev,
      password: undefined,
      confirmPassword: undefined
    }));
  };

  // ==========================================
  // רינדור הקומפוננטה
  // ==========================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="הוספת משתמש חדש"
    >
      <div className={styles.container}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* הודעת שגיאה כללית */}
          {(submitError || createError) && (
            <div className={styles.error}>
              <AlertCircle size={18} />
              <span>{submitError || createError}</span>
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

          {/* סיסמה */}
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="password" className={styles.label}>
                סיסמה <span className={styles.required}>*</span>
              </label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className={styles.generateBtn}
              >
                צור סיסמה אקראית
              </button>
            </div>
            <div className={styles.passwordWrapper}>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="לפחות 8 תווים"
                className={errors.password ? styles.inputError : ''}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.eyeBtn}
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <span className={styles.fieldError}>{errors.password}</span>
            )}
          </div>

          {/* אישור סיסמה */}
          <div className={styles.field}>
            <label htmlFor="confirmPassword" className={styles.label}>
              אישור סיסמה <span className={styles.required}>*</span>
            </label>
            <div className={styles.passwordWrapper}>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="הכנס שוב את הסיסמה"
                className={errors.confirmPassword ? styles.inputError : ''}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={styles.eyeBtn}
                aria-label={showConfirmPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className={styles.fieldError}>{errors.confirmPassword}</span>
            )}
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
              onClick={onClose}
              disabled={createLoading}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createLoading}
            >
              {createLoading ? (
                'יוצר משתמש...'
              ) : (
                <>
                  <UserPlus size={18} />
                  צור משתמש
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateUserModal;
