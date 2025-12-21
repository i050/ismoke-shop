/**
 * SiteStatusContext - ניהול מצב האתר (תחזוקה)
 * 
 * Context שמנהל את מצב התחזוקה של האתר ברמה גלובלית.
 * טוען את הסטטוס מהשרת בעת טעינת האפליקציה ומספק גישה
 * לכל הקומפוננטות באפליקציה.
 * 
 * @module contexts/SiteStatusContext
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSiteStatus } from '../services/settingsService';

// ============================================================================
// Types
// ============================================================================

/**
 * מצב סטטוס האתר
 */
interface SiteStatus {
  maintenanceMode: boolean;  // האם מצב תחזוקה מופעל
  message: string;           // הודעה למבקרים
  allowedRoles: string[];    // תפקידים מורשים לגשת במצב תחזוקה
}

/**
 * ערכי ה-Context
 */
interface SiteStatusContextValue {
  status: SiteStatus;        // מצב נוכחי
  isLoading: boolean;        // האם בטעינה
  error: string | null;      // שגיאה אם יש
  refreshStatus: () => Promise<void>; // רענון ידני של הסטטוס (מהשרת)
  updateStatus: (updates: Partial<SiteStatus>) => void; // עדכון מקומי ישיר (בלי טעינה מהשרת)
}

// ============================================================================
// Context
// ============================================================================

/**
 * יצירת ה-Context עם ערכי ברירת מחדל
 */
const SiteStatusContext = createContext<SiteStatusContextValue>({
  status: {
    maintenanceMode: false,
    message: '',
    allowedRoles: ['admin', 'super_admin', 'customer'] // ברירת מחדל - כולם מורשים
  },
  isLoading: true,
  error: null,
  refreshStatus: async () => {},
  updateStatus: () => {}
});

// ============================================================================
// Provider Component
// ============================================================================

interface SiteStatusProviderProps {
  children: ReactNode;
}

/**
 * Provider שמספק את מצב האתר לכל האפליקציה
 * 
 * @example
 * // ב-main.tsx או App.tsx
 * <SiteStatusProvider>
 *   <App />
 * </SiteStatusProvider>
 */
export const SiteStatusProvider: React.FC<SiteStatusProviderProps> = ({ children }) => {
  // מצב הסטטוס
  const [status, setStatus] = useState<SiteStatus>({
    maintenanceMode: false,
    message: '',
    allowedRoles: ['admin', 'super_admin', 'customer'] // ברירת מחדל - כולם מורשים
  });
  
  // מצב טעינה
  const [isLoading, setIsLoading] = useState(true);
  
  // שגיאה
  const [error, setError] = useState<string | null>(null);

  /**
   * טעינת הסטטוס מהשרת
   */
  const fetchStatus = useCallback(async () => {
    try {
      // console.log('🔄 SiteStatusContext: מתחיל טעינת סטטוס...');
      setIsLoading(true);
      setError(null);
      
      // timeout של 3 שניות למניעת blocking
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const response = await Promise.race([getSiteStatus(), timeoutPromise]) as any;
      // console.log('✅ SiteStatusContext: תשובה מהשרת:', response);
      
      if (response.success) {
        setStatus({
          maintenanceMode: response.data.maintenanceMode,
          message: response.data.message || '',
          allowedRoles: response.data.allowedRoles || ['admin', 'super_admin', 'customer']
        });
      }
    } catch (err) {
      console.error('❌ SiteStatusContext: שגיאה בטעינת סטטוס האתר:', err);
      setError('שגיאה בטעינת סטטוס האתר');
      // במקרה של שגיאה - נניח שהאתר פתוח (fail-open)
      setStatus({
        maintenanceMode: false,
        message: '',
        allowedRoles: ['admin', 'super_admin', 'customer']
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * רענון ידני של הסטטוס
   */
  const refreshStatus = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  /**
   * עדכון מקומי ישיר של הסטטוס (בלי קריאה לשרת)
   * משמש כשכבר עדכנו את השרת ורוצים לסנכרן את ה-UI בלי רענון
   */
  const updateStatus = useCallback((updates: Partial<SiteStatus>) => {
    setStatus(prev => ({ ...prev, ...updates }));
  }, []);

  // טעינה ראשונית בעת mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ערך ה-Context
  const value: SiteStatusContextValue = {
    status,
    isLoading,
    error,
    refreshStatus,
    updateStatus
  };

  return (
    <SiteStatusContext.Provider value={value}>
      {children}
    </SiteStatusContext.Provider>
  );
};

// ============================================================================
// Hook לשימוש נוח
// ============================================================================

/**
 * Hook לגישה למצב האתר
 * 
 * @example
 * const { status, isLoading } = useSiteStatus();
 * if (status.maintenanceMode) {
 *   // הצג הודעת תחזוקה
 * }
 */
export const useSiteStatus = (): SiteStatusContextValue => {
  const context = useContext(SiteStatusContext);
  
  if (!context) {
    throw new Error('useSiteStatus חייב להיות בתוך SiteStatusProvider');
  }
  
  return context;
};

// ייצוא ברירת מחדל
export default SiteStatusContext;
