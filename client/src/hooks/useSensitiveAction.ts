// useSensitiveAction.ts - Hook לביצוע פעולות רגישות עם אימות מחדש אוטומטי
// חלק ממימוש Soft Login - מאפשר לבצע פעולות רגישות רק אם המשתמש עבר אימות לאחרונה

import { useState, useCallback } from 'react';
import { isRecentlyAuthenticated } from '../utils/tokenUtils';

// טיפוס התוצאה של ה-hook
interface UseSensitiveActionResult<T> {
  // פונקציה לביצוע הפעולה הרגישה (עם בדיקת אימות אוטומטית)
  executeSensitiveAction: () => Promise<T | undefined>;
  // האם להציג את מודל האימות מחדש
  showReAuthModal: boolean;
  // פונקציה שתופעל לאחר אימות מוצלח - ממשיכה את הפעולה שהייתה ממתינה
  handleReAuthSuccess: () => Promise<T | undefined>;
  // פונקציה לסגירת המודל ללא המשך הפעולה
  handleReAuthClose: () => void;
  // האם הפעולה בתהליך (לטיפול ב-loading state)
  isProcessing: boolean;
}

/**
 * 🔐 useSensitiveAction - Hook לפעולות רגישות
 * 
 * שימוש:
 * ```tsx
 * const { executeSensitiveAction, showReAuthModal, handleReAuthSuccess, handleReAuthClose } = 
 *   useSensitiveAction(async () => {
 *     // הפעולה הרגישה (למשל יצירת הזמנה)
 *     return await OrderService.createOrder(orderData);
 *   });
 * 
 * // בלחיצה על כפתור
 * const handleCheckout = () => executeSensitiveAction();
 * 
 * // ב-JSX
 * <ReAuthModal 
 *   isOpen={showReAuthModal}
 *   onClose={handleReAuthClose}
 *   onSuccess={handleReAuthSuccess}
 * />
 * ```
 * 
 * @param action הפעולה הרגישה לביצוע
 * @returns אובייקט עם פונקציות ו-state לניהול הזרימה
 */
export function useSensitiveAction<T>(action: () => Promise<T>): UseSensitiveActionResult<T> {
  // State להצגת מודל האימות
  const [showReAuthModal, setShowReAuthModal] = useState(false);
  // שמירת הפעולה הממתינה לאחר אימות מחדש
  const [pendingAction, setPendingAction] = useState<(() => Promise<T>) | null>(null);
  // State לסימון שהפעולה בתהליך
const [isProcessing, setIsProcessing] = useState(false);

  // פונקציה לביצוע הפעולה הרגישה
  const executeSensitiveAction = useCallback(async (): Promise<T | undefined> => {
    // 🔍 בדיקה: האם האימות עדיין טרי (פחות מ-15 דקות)?
    if (isRecentlyAuthenticated()) {
      // ✅ אימות טרי - בצע את הפעולה ישירות
      setIsProcessing(true);
      try {
        return await action();
      } finally {
        setIsProcessing(false);
      }
    }
    
    // ⚠️ אימות לא טרי - שמור את הפעולה והצג מודל אימות מחדש
    setPendingAction(() => action);
    setShowReAuthModal(true);
    return undefined; // הפעולה תתבצע רק לאחר אימות מוצלח
  }, [action]);

  // פונקציה שתופעל לאחר אימות מוצלח - ממשיכה את הפעולה הממתינה
  const handleReAuthSuccess = useCallback(async (): Promise<T | undefined> => {
    setShowReAuthModal(false);
    
    if (pendingAction) {
      setIsProcessing(true);
      try {
        // ✅ אימות הצליח - בצע את הפעולה שהייתה ממתינה
        const result = await pendingAction();
        return result;
      } finally {
        setPendingAction(null);
        setIsProcessing(false);
      }
    }
    return undefined;
  }, [pendingAction]);

  // פונקציה לסגירת המודל ללא המשך הפעולה
  const handleReAuthClose = useCallback(() => {
    setShowReAuthModal(false);
    setPendingAction(null);
    setIsProcessing(false);
  }, []);

  return {
    executeSensitiveAction,
    showReAuthModal,
    handleReAuthSuccess,
    handleReAuthClose,
    isProcessing
  };
}

export default useSensitiveAction;
