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

// ==================== File Processing Hook ====================
// עיבוד קבצים
export { useFileProcessor } from './useFileProcessor';

// ==================== Scroll Restoration Hook ====================
// שחזור מיקום גלילה
export { useInternalScrollRestoration } from './useInternalScrollRestoration';

// ==================== Socket Hook ====================
// WebSocket connection
export { useSocket } from './useSocket';

// ==================== Upload Manager Hook ====================
// ניהול העלאות
export { useUploadManager } from './useUploadManager';
