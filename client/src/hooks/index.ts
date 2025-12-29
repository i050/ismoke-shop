/**
 * Hooks Index
 * ===========
 * קובץ מרכזי לייצוא כל ה-hooks של האפליקציה
 * מאפשר ייבוא נוח: import { useResponsive, useToast } from '@/hooks'
 */

// ==================== Responsive Hook ====================
// זיהוי גודל מסך, orientation, ומכשיר מגע
export { useResponsive, BREAKPOINTS } from './useResponsive';
export type { ResponsiveState, Orientation } from './useResponsive';

// ==================== Toast Hook ====================
// הודעות למשתמש
export { useToast } from './useToast';

// ==================== Redux Hooks ====================
// hooks מותאמים ל-Redux store
export { useAppDispatch, useAppSelector } from './reduxHooks';

// ==================== Confirmation Hook ====================
// דיאלוג אישור
export { useConfirm, ConfirmProvider } from './useConfirm';

// ==================== Scroll Restoration Hook ====================
// שחזור מיקום גלילה
export { useInternalScrollRestoration } from './useInternalScrollRestoration';

// ==================== Socket Hook ====================
// WebSocket connection
export { useSocket } from './useSocket';

// ==================== Debounce Hook ====================
// ערך מושהה למניעת קריאות API מרובות בזמן הקלדה
export { useDebouncedValue } from './useDebouncedValue';
