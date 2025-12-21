import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';

/**
 * ממשק הגדרות לאישור
 */
export interface ConfirmOptions {
  /** כותרת המודאל */
  title: string;
  /** תיאור/הודעה */
  message: string;
  /** טקסט כפתור אישור */
  confirmText?: string;
  /** טקסט כפתור ביטול */
  cancelText?: string;
  /** האם זו פעולה מסוכנת */
  danger?: boolean;
  /** אייקון מותאם אישית */
  icon?: string;
}

/**
 * ממשק הקונטקסט
 */
interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// יצירת הקונטקסט
const ConfirmContext = createContext<ConfirmContextType | null>(null);

/**
 * Provider לניהול מודאלי אישור
 * יש לעטוף את האפליקציה בקומפוננטה זו
 */
export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // בדיקות אבחון: מדפיסים לוג שה-Provider רנדר ומתי הוא מסיים
  // שימוש ב-useEffect כדי להבטיח שהלוגים מדווחים על mount/unmount
  useEffect(() => {
    return () => {};
  }, []);
  // מצב המודאל
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  /**
   * פונקציית האישור הראשית
   * מחזירה Promise שמתממש כ-true אם המשתמש אישר, false אם ביטל
   */
  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  }, []);

  /**
   * טיפול באישור
   */
  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(true);
    }
    // ניקוי אחרי אנימציית הסגירה
    setTimeout(() => {
      setOptions(null);
      setResolvePromise(null);
    }, 200);
  }, [resolvePromise]);

  /**
   * טיפול בביטול
   */
  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(false);
    }
    // ניקוי אחרי אנימציית הסגירה
    setTimeout(() => {
      setOptions(null);
      setResolvePromise(null);
    }, 200);
  }, [resolvePromise]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {/* המודאל עצמו */}
      {options && (
        <ConfirmModal
          isOpen={isOpen}
          title={options.title}
          message={options.message}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          danger={options.danger}
          icon={options.icon}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

/**
 * Hook לשימוש במודאל אישור
 * 
 * @example
 * const confirm = useConfirm();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'מחיקת מוצר',
 *     message: 'האם אתה בטוח שברצונך למחוק את המוצר?',
 *     danger: true,
 *     confirmText: 'מחק'
 *   });
 *   
 *   if (confirmed) {
 *     // בצע מחיקה
 *   }
 * };
 */
export const useConfirm = (): ((options: ConfirmOptions) => Promise<boolean>) => {
  const context = useContext(ConfirmContext);
  
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  
  return context.confirm;
};

export default useConfirm;
