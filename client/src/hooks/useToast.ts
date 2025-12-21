import { useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
}

/**
 * Simple toast hook for displaying notifications
 * Uses console logging and CSS-based toast for now
 */
export const useToast = () => {
  const showToast = useCallback((type: ToastType, message: string, _options?: ToastOptions) => {
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // יצירת toast element בסיסי
    const existingToast = document.getElementById('simple-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'simple-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      color: white;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 400px;
      word-wrap: break-word;
      direction: rtl;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    // צבעים לפי סוג ההודעה
    const colors: Record<ToastType, string> = {
      success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    };
    toast.style.background = colors[type];
    toast.textContent = `${prefix} ${message}`;

    // הוספת סגנון האנימציה
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    // הסרה אוטומטית אחרי משך זמן מוגדר
    const defaultDuration = type === 'error' ? 5000 : 3000;
    const duration = _options?.duration ?? defaultDuration;
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => {
        toast.remove();
        style.remove();
      }, 300);
    }, duration);
  }, []);

  return { showToast };
};
