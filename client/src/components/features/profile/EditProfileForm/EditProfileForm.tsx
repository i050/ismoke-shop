import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../hooks/reduxHooks';
import { Button, Typography } from '@ui';
import { Icon } from '../../../ui/Icon';
import { setUser } from '../../../../utils/tokenUtils';
import { loginSuccess } from '../../../../store/slices/authSlice';
import { API_BASE_URL } from '../../../../config/api';
import styles from './EditProfileForm.module.css';

interface EditProfileFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ onSuccess, onCancel }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);

  // Initialize form data from current user
  const [formData, setFormData] = useState<FormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      postalCode: user?.address?.postalCode || '',
      country: user?.address?.country || 'ישראל', // Default country
    },
  });

  // Keep form data in sync with Redux user: when user object changes (e.g., after
  // a profile refresh or after saving changes), update the form values so
  // that the modal shows the latest data instead of placeholders/defaults.
  React.useEffect(() => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: {
        street: user?.address?.street || '',
        city: user?.address?.city || '',
        state: user?.address?.state || '',
        postalCode: user?.address?.postalCode || '',
        country: user?.address?.country || 'ישראל',
      },
    });
  }, [user]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'שגיאה בעדכון הפרופיל');
      }

      if (data.success && data.data?.user) {
        // Update local storage
        setUser(data.data.user);
        
        // Update Redux store with loginSuccess action (expects User object only)
        dispatch(loginSuccess(data.data.user));

        setSuccessMessage('הפרופיל עודכן בהצלחה!');
        
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500);
        }
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בעדכון הפרופיל');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Personal Details Section */}
      <div className={styles.section}>
        <Typography variant="h4" className={styles.sectionTitle}>
          פרטים אישיים
        </Typography>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="firstName" className={styles.label}>
              שם פרטי *
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="lastName" className={styles.label}>
              שם משפחה *
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            אימייל *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="phone" className={styles.label}>
            טלפון
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="050-1234567"
            className={styles.input}
          />
        </div>
      </div>

      {/* Address Section */}
      <div className={styles.section}>
        <Typography variant="h4" className={styles.sectionTitle}>
          כתובת
        </Typography>

        <div className={styles.field}>
          <label htmlFor="address.street" className={styles.label}>
            רחוב ומספר בית
          </label>
          <input
            id="address.street"
            name="address.street"
            type="text"
            value={formData.address.street}
            onChange={handleChange}
            placeholder="רחוב הרצל 123"
            className={styles.input}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="address.city" className={styles.label}>
              עיר
            </label>
            <input
              id="address.city"
              name="address.city"
              type="text"
              value={formData.address.city}
              onChange={handleChange}
              placeholder="תל אביב"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="address.postalCode" className={styles.label}>
              מיקוד
            </label>
            <input
              id="address.postalCode"
              name="address.postalCode"
              type="text"
              value={formData.address.postalCode}
              onChange={handleChange}
              placeholder="1234567"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="address.state" className={styles.label}>
              מחוז/אזור
            </label>
            <input
              id="address.state"
              name="address.state"
              type="text"
              value={formData.address.state}
              onChange={handleChange}
              placeholder="מרכז"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="address.country" className={styles.label}>
              מדינה
            </label>
            <input
              id="address.country"
              name="address.country"
              type="text"
              value={formData.address.country}
              onChange={handleChange}
              placeholder="ישראל"
              className={styles.input}
            />
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className={styles.errorMessage}>
          <Icon name="AlertCircle" size={18} />
          <Typography variant="body2">{error}</Typography>
        </div>
      )}

      {successMessage && (
        <div className={styles.successMessage}>
          <Icon name="CheckCircle" size={18} />
          <Typography variant="body2">{successMessage}</Typography>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actions}>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            ביטול
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          className={styles.submitBtn}
        >
          {isLoading ? 'שומר...' : 'שמור שינויים'}
        </Button>
      </div>
    </form>
  );
};

export default EditProfileForm;
