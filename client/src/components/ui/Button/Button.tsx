import React, { forwardRef } from 'react';
import styles from './Button.module.css';

/**
 * Button Props - תכונות מתקדמות לכפתור ברמה אנטרפרייז
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode; /* optional when using icon-only mode */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  rounded?: boolean;
  elevated?: boolean;
  /** make button full-width only on small screens (mobile) */
  mobileFull?: boolean;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}

/**
 * Button Component - כפתור מודרני ונגיש ברמה אנטרפרייז
 * תכונות:
 * - forwardRef לגישה ישירה לאלמנט
 * - Loading state עם spinner
 * - תמיכה באייקונים
 * - ARIA attributes לנגישות
 * - Variants מתקדמים
 * - Elevated mode עם צללים
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      mobileFull = false,
      rounded = false,
      elevated = false,
      type = 'button',
      className = '',
      onClick,
      'aria-label': ariaLabel,
      ...rest
    },
    ref
  ) => {
    // בניית מחרוזת הקלאסים
    const buttonClasses = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      mobileFull && styles.mobileFullWidth,
      rounded && styles.rounded,
      elevated && styles.elevated,
      loading && styles.loading,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // טיפול בלחיצה - מונע לחיצה כשטוען או מושבת
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    // בניית ARIA attributes באופן דינמי - למניעת אזהרות linter
    const ariaAttributes: Record<string, string | undefined> = {
      'aria-label': ariaLabel,
      ...(loading && { 'aria-busy': 'true' }),
      ...((disabled || loading) && { 'aria-disabled': 'true' }),
    };

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        onClick={handleClick}
        type={type}
        {...ariaAttributes}
        {...rest}
      >
        {loading && (
          <span className={styles.spinner} aria-hidden="true">
            <svg className={styles.spinnerIcon} viewBox="0 0 24 24">
              <circle
                className={styles.spinnerCircle}
                cx="12"
                cy="12"
                r="10"
                fill="none"
                strokeWidth="3"
              />
            </svg>
          </span>
        )}
        
        {!loading && icon && iconPosition === 'left' && (
          <span className={styles.iconLeft} aria-hidden="true">
            {icon}
          </span>
        )}
        
        {children && <span className={styles.content}>{children}</span>}
        
        {!loading && icon && iconPosition === 'right' && (
          <span className={styles.iconRight} aria-hidden="true">
            {icon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
