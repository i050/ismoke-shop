import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../../../../../hooks/reduxHooks';
import {
  createCustomerGroup,
  updateCustomerGroup,
  clearError
} from '../../../../../store/slices/customerGroupsSlice';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input/Input';
import { Checkbox } from '../../../../../components/ui/Checkbox/Checkbox';
import { ColorSelect } from '../../../../../components/ui/ColorSelect/ColorSelect';
import type { CustomerGroup, CustomerGroupFormData } from '../../../../../types/CustomerGroup';
import styles from './CustomerGroupForm.module.css';

interface CustomerGroupFormProps {
  group?: CustomerGroup | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormErrors {
  name?: string;
  discountPercentage?: string;
  color?: string;
  description?: string;
  priority?: string;
  taxRate?: string;
  showGroupMembership?: string;
  showOriginalPrice?: string;
}

const CustomerGroupForm: React.FC<CustomerGroupFormProps> = ({
  group,
  onClose,
  onSuccess
}) => {
  const dispatch = useAppDispatch();
  const isEditing = !!group;

  // Form state
  const [formData, setFormData] = useState<CustomerGroupFormData>({
    name: group?.name || '',
    discountPercentage: group?.discountPercentage || 0,
    color: group?.color || '#3b82f6',
    description: group?.description || '',
    priority: group?.priority || 0,
    taxRate: group?.taxRate || 17,
    showGroupMembership: group?.showGroupMembership ?? true,
    showOriginalPrice: group?.showOriginalPrice ?? true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear errors when form data changes
  useEffect(() => {
    // כאשר יש שינוי ב-formData - ננקה שגיאות קיימות באופן בטוח (לא נשתמש במשתנה errors ישירות)
    setErrors(prev => (Object.keys(prev).length > 0 ? {} : prev));
  }, [formData]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? parseFloat(value) || 0 : value;

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'שם הקבוצה הוא שדה חובה';
    } else if (formData.name.length < 2) {
      newErrors.name = 'שם הקבוצה חייב להכיל לפחות 2 תווים';
    } else if (formData.name.length > 50) {
      newErrors.name = 'שם הקבוצה לא יכול להיות ארוך מ-50 תווים';
    }

    if (formData.discountPercentage < 0 || formData.discountPercentage > 100) {
      newErrors.discountPercentage = 'אחוז ההנחה חייב להיות בין 0 ל-100';
    }

    if (!formData.color.match(/^#[0-9A-F]{6}$/i)) {
      newErrors.color = 'צבע חייב להיות בפורמט hex תקין (#RRGGBB)';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'תיאור לא יכול להיות ארוך מ-200 תווים';
    }

    if ((formData.priority ?? 0) < 0) {
      newErrors.priority = 'עדיפות חייבת להיות מספר חיובי';
    }

    if ((formData.taxRate ?? 17) < 0 || (formData.taxRate ?? 17) > 100) {
      newErrors.taxRate = 'שיעור המע"מ חייב להיות בין 0 ל-100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    dispatch(clearError());

    try {
      if (isEditing && group) {
        await dispatch(updateCustomerGroup({
          id: group._id,
          groupData: formData
        })).unwrap();
      } else {
        await dispatch(createCustomerGroup(formData)).unwrap();
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Form submission error:', message);
      // Error is handled by Redux slice
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    dispatch(clearError());
    onClose();
  };

  // Handle ESC key to close modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  // Handle click on overlay - close if clicking outside modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // אם לחצו על ה-overlay (לא על המודאל עצמו)
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className={styles.customerGroupForm} 
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="formTitle"
      tabIndex={-1}
    >
      <div className={styles.modalContent}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle} id="formTitle">
            {isEditing ? 'עריכת קבוצת לקוחות' : 'יצירת קבוצת לקוחות חדשה'}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            title="סגור (ESC)"
            aria-label="סגור מודאל"
          >
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className={styles.formRow}>
          <Input
            id="name"
            name="name"
            label="שם הקבוצה"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="לדוגמה: VIP, סיטונאים"
            required
            error={!!errors.name}
            helperText={errors.name || 'שם ייחודי לקבוצה'}
            variant="outlined"
            size="medium"
          />

          <Input
            id="discountPercentage"
            name="discountPercentage"
            label="אחוז הנחה (%)"
            type="number"
            value={formData.discountPercentage.toString()}
            onChange={handleInputChange}
            required
            error={!!errors.discountPercentage}
            helperText={errors.discountPercentage || '0-100'}
            variant="outlined"
            size="medium"
          />
        </div>

        {/* <div className={styles.formRow}>
          <ColorSelect
            id="color"
            name="color"
            label="צבע הקבוצה"
            value={formData.color}
            onChange={(color) => {
              setFormData(prev => ({ ...prev, color }));
              // ניקוי שגיאות כשמשנים את הצבע
              if (errors.color) {
                setErrors(prev => ({ ...prev, color: undefined }));
              }
            }}
            required
            error={!!errors.color}
            helperText={errors.color || 'בחר צבע'}
            showCustomPicker
            allowCustomHex
          />

          <Input
            id="priority"
            name="priority"
            label="עדיפות"
            type="number"
            value={(formData.priority ?? 0).toString()}
            onChange={handleInputChange}
            placeholder="0"
            helperText="עדיפות גבוהה יותר = הקבוצה תקבל עדיפות"
            error={!!errors.priority}
            variant="outlined"
            size="medium"
          />
        </div> */}

        <Input
          id="description"
          name="description"
          label="תיאור הקבוצה"
          type="text"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="תיאור קצר של הקבוצה (אופציונלי)"
          helperText={errors.description || 'עד 200 תווים'}
          error={!!errors.description}
          variant="outlined"
          size="medium"
        />

        {/* Transparency Settings */}
        <div className={styles.transparencySection}>
          <h3 className={styles.sectionTitle}>הגדרות שקיפות</h3>
          <p className={styles.sectionDescription}>
            קבע איך הלקוחות בקבוצה יראו מידע על הקבוצה והמחירים
          </p>

          <Checkbox
            id="showOriginalPrice"
            name="showOriginalPrice"
            checked={formData.showOriginalPrice}
            onChange={(checked) => {
              setFormData(prev => ({ ...prev, showOriginalPrice: checked }));
            }}
            label="הצג ללקוח את חברותו בקבוצה ואת המחיר המקורי לצד ההנחה"
            helperText="אם לא מסומן - הלקוח יראה את המחיר המוזל כאילו זה המחיר הרגיל"
          />
        </div>

        {/* Form Actions */}
        <div className={styles.formActions}>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ביטול
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isEditing ? 'שמור שינויים' : 'צור קבוצה'}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default CustomerGroupForm;
