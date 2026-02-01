// ReAuthModal.tsx - מודל אימות מחדש לפעולות רגישות (Soft Login)
// משמש לאימות המשתמש מחדש לפני ביצוע פעולות רגישות כמו checkout, שינוי כתובת וכו'

import React, { useState, useEffect } from 'react';
import styles from './ReAuthModal.module.css';
import { Modal } from '../../../ui/Modal';
import { Button } from '@ui';
import { AuthService } from '../../../../services/authService';
import { useDispatch } from 'react-redux';
import { reAuthStart, reAuthSuccess, reAuthFailure } from '../../../../store/slices/authSlice';

// Props של הקומפוננטה
interface ReAuthModalProps {
  isOpen: boolean;                    // האם המודל פתוח
  onClose: () => void;                // פונקציה לסגירת המודל
  onSuccess: () => void;              // פונקציה שתופעל לאחר אימות מוצלח
  title?: string;                     // כותרת מותאמת אישית
  message?: string;                   // הודעה מותאמת אישית
}

// 🔐 מודל אימות מחדש
export const ReAuthModal: React.FC<ReAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'נדרש אימות מחדש',
  message = 'לביצוע פעולה זו נדרש להזין את הסיסמה שלך'
}) => {
  const dispatch = useDispatch();
  
  // State לניהול הטופס
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ניקוי השדות כשהמודל נסגר או נפתח מחדש
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  // טיפול בשליחת הטופס
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ולידציה בסיסית
    if (!password.trim()) {
      setError('נא להזין סיסמה');
      return;
    }
    
    setError('');
    dispatch(reAuthStart());
    setIsLoading(true);

    try {
      // שליחת בקשת אימות מחדש לשרת
      const response = await AuthService.reAuthenticate(password);
      
      // עדכון ה-Redux state
      dispatch(reAuthSuccess({ 
        user: response.data.user, 
        lastAuthAt: response.data.lastAuthAt 
      }));
      
      // ניקוי וסגירה
      setPassword('');
      onSuccess();
      onClose();
      
    } catch (err: any) {
      // טיפול בשגיאות
      const errorMessage = err.message || 'סיסמה שגויה';
      setError(errorMessage);
      dispatch(reAuthFailure(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  // טיפול בסגירת המודל
  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  // אם המודל לא פתוח, לא מציגים כלום
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className={styles.container}>
        {/* אייקון נעילה */}
        <div className={styles.iconWrapper}>
          <svg 
            className={styles.lockIcon} 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        
        {/* כותרת והודעה */}
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        
        {/* טופס */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="הזן סיסמה"
              autoFocus
              disabled={isLoading}
              className={`${styles.input} ${error ? styles.inputError : ''}`}
            />
          </div>
          
          {/* הודעת שגיאה */}
          {error && <p className={styles.error}>{error}</p>}
          
          {/* כפתורים */}
          <div className={styles.buttons}>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleClose} 
              disabled={isLoading}
            >
              ביטול
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? 'מאמת...' : 'אשר'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ReAuthModal;
