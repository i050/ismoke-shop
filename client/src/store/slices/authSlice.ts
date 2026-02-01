// AuthSlice - ניהול מצב האימות של המשתמשים
// זהו ה-slice הראשי לניהול כל מה שקשור לאימות: התחברות, יציאה, פרטי משתמש

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { getToken, getUser, clearAuthData, getLastAuthAt, setLastAuthAt } from '../../utils/tokenUtils'

// הגדרת הממשקים (interfaces) עבור TypeScript
// זה מבטיח שכל הנתונים יהיו מוקלדים נכון ובטוח

// ממשק של משתמש במערכת
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;          // null for social-only users
  phone?: string;
  avatar?: string;            // profile picture from social login

  // Address Information
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Social Authentication
  providers: {
    google?: {
      id: string;
      email: string;
      verified: boolean;
    };
    apple?: {
      id: string;
      email: string;
    };
    facebook?: {              // optional
      id: string;
      email: string;
    };
  };

  // Security & Status
  isActive: boolean;          // block users
  isVerified: boolean;        // email verification (true if from social)
  role: 'customer' | 'admin' | 'super_admin';
  customerGroupId?: string;   // reference to customer group

  // Security Tracking
  lastLogin?: string;
  loginAttempts: number;      // brute force protection
  lockUntil?: string;         // temporary account lock
  refreshTokens: string[];    // array of active refresh tokens

  // Two-Factor Authentication
  twoFactorEnabled: boolean;  // is 2FA enabled
  twoFactorSecret?: string;   // TOTP secret
  backupCodes: string[];      // backup codes

  // Verification & Reset
  verificationToken?: string;
  verificationTokenExpires?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ממשק של מצב האימות בכל האפליקציה
interface AuthState {
  user: User | null             // פרטי המשתמש המחובר (null אם לא מחובר)
  isAuthenticated: boolean      // האם יש משתמש מחובר כרגע
  isLoading: boolean           // האם אנחנו בתהליך של בדיקת אימות/התחברות
  error: string | null         // הודעת שגיאה אם יש בעיה באימות
  // 🔐 Soft Login: זמן אימות אחרון (לפעולות רגישות)
  lastAuthAt: number | null
  isReAuthenticating: boolean  // האם בתהליך אימות מחדש
}

// מצב התחלתי של ה-slice
// כאשר האפליקציה נטענת, בודק אם יש נתוני התחברות שמורים
const initialState: AuthState = (() => {
  const token = getToken()
  const user = getUser()
  const lastAuthAt = getLastAuthAt() // 🔐 Soft Login: טעינת זמן אימות אחרון

  return {
    user: user,                          // טוען משתמש מ-localStorage אם קיים
    isAuthenticated: !!(token && user),  // מאומת אם יש טוקן ומשתמש
    isLoading: false,                   // לא בתהליך טעינה
    error: null,                        // אין שגיאות
    // 🔐 Soft Login
    lastAuthAt: lastAuthAt,             // זמן אימות אחרון
    isReAuthenticating: false           // לא בתהליך אימות מחדש
  }
})()

// יצירת ה-slice עצמו באמצעות createSlice מ-Redux Toolkit
// createSlice הוא פונקציה חכמה שיוצרת בבת אחת:
// 1. Actions (פעולות) - מה אנחנו יכולים לעשות
// 2. Reducer (מפחית) - איך המצב משתנה בהתאם לפעולות
const authSlice = createSlice({
  name: 'auth',                // שם ה-slice - ישמש בזיהוי ב-Redux DevTools
  initialState,               // המצב ההתחלתי שהגדרנו למעלה
  
  // Reducers - הפונקציות שמשנות את המצב
  // כל reducer מקבל את המצב הנוכחי ופעולה (action) ומחזיר מצב חדש
  reducers: {
    
    // פעולה: התחלת תהליך התחברות
    // נקראת כאשר המשתמש לוחץ על "התחבר" ואנחנו שולחים בקשה לשרת
    loginStart: (state) => {
      state.isLoading = true     // מציינים שאנחנו בתהליך טעינה
      state.error = null         // מנקים שגיאות קודמות
    },
    
    // פעולה: התחברות הצליחה
    // נקראת כאשר השרת מחזיר שהמשתמש התחבר בהצלחה
    loginSuccess: (state, action: PayloadAction<User>) => {
      const now = Date.now()
      state.isLoading = false           // גמרנו את התהליך
      state.isAuthenticated = true      // המשתמש מאומת כעת
      state.user = action.payload       // שומרים את פרטי המשתמש שהתקבלו מהשרת
      state.error = null               // אין שגיאות
      // 🔐 Soft Login: שמירת זמן אימות אחרון
      state.lastAuthAt = now
      setLastAuthAt(now)
    },
    
    // פעולה: התחברות נכשלה
    // נקראת כאשר יש בעיה בהתחברות (סיסמה שגויה, בעיית שרת וכו')
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false           // גמרנו את התהליך
      state.isAuthenticated = false     // המשתמש לא מאומת
      state.user = null                // אין פרטי משתמש
      state.error = action.payload      // שומרים את הודעת השגיאה להצגה למשתמש
    },
    
    // פעולה: התחלת תהליך רישום
    // נקראת כאשר המשתמש לוחץ על "הירשם" ואנחנו שולחים בקשה לשרת
    registerStart: (state) => {
      state.isLoading = true     // מציינים שאנחנו בתהליך טעינה
      state.error = null         // מנקים שגיאות קודמות
    },
    
    // פעולה: רישום הצליח
    // נקראת כאשר השרת מחזיר שהמשתמש נרשם בהצלחה
    registerSuccess: (state, action: PayloadAction<User>) => {
      state.isLoading = false           // גמרנו את התהליך
      state.isAuthenticated = true      // המשתמש מאומת כעת
      state.user = action.payload       // שומרים את פרטי המשתמש שהתקבלו מהשרת
      state.error = null               // אין שגיאות
    },
    
    // פעולה: רישום נכשל
    // נקראת כאשר יש בעיה ברישום (מייל קיים, בעיית שרת וכו')
    registerFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false           // גמרנו את התהליך
      state.isAuthenticated = false     // המשתמש לא מאומת
      state.user = null                // אין פרטי משתמש
      state.error = action.payload      // שומרים את הודעת השגיאה להצגה למשתמש
    },
    
    // פעולה: התחלת רענון טוקן
    // נקראת כאשר אנחנו שולחים בקשה לשרת לרענון ה-access token
    refreshTokenStart: (state) => {
      state.isLoading = true     // מציינים שאנחנו בתהליך טעינה
      state.error = null         // מנקים שגיאות קודמות
    },
    
    // פעולה: רענון טוקן הצליח
    // נקראת כאשר השרת מחזיר טוקן חדש בהצלחה
    refreshTokenSuccess: (state, action: PayloadAction<User>) => {
      state.isLoading = false           // גמרנו את התהליך
      state.isAuthenticated = true      // המשתמש עדיין מאומת
      state.user = action.payload       // מעדכנים את פרטי המשתמש
      state.error = null               // אין שגיאות
    },
    
    // פעולה: רענון טוקן נכשל
    // נקראת כאשר יש בעיה ברענון הטוקן (טוקן לא תקף, בעיית שרת וכו')
    refreshTokenFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false           // גמרנו את התהליך
      state.isAuthenticated = false     // המשתמש לא מאומת יותר
      state.user = null                // מוחקים את פרטי המשתמש
      state.error = action.payload      // שומרים את הודעת השגיאה
    },
    
    // פעולה: התחלת הגדרת 2FA
    // נקראת כאשר המשתמש מתחיל להגדיר אימות דו-שלבי
    setup2FAStart: (state) => {
      state.isLoading = true     // מציינים שאנחנו בתהליך טעינה
      state.error = null         // מנקים שגיאות קודמות
    },
    
    // פעולה: הגדרת 2FA הצליחה
    // נקראת כאשר השרת מחזיר QR code ו-secret להגדרת 2FA
    setup2FASuccess: (state) => {
      state.isLoading = false           // גמרנו את התהליך
      state.error = null               // אין שגיאות
      // ניתן להוסיף שדה למצב אם צריך לשמור את ה-QR code
    },
    
    // פעולה: הגדרת 2FA נכשלה
    // נקראת כאשר יש בעיה בהגדרת 2FA
    setup2FAFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false           // גמרנו את התהליך
      state.error = action.payload      // שומרים את הודעת השגיאה
    },
    
    // פעולה: התחלת אימות 2FA
    // נקראת כאשר המשתמש מזין קוד 2FA להתחברות
    verify2FAStart: (state) => {
      state.isLoading = true     // מציינים שאנחנו בתהליך טעינה
      state.error = null         // מנקים שגיאות קודמות
    },
    
    // פעולה: אימות 2FA הצליח
    // נקראת כאשר הקוד שהמשתמש הזין תקין
    verify2FASuccess: (state, action: PayloadAction<User>) => {
      state.isLoading = false           // גמרנו את התהליך
      state.isAuthenticated = true      // המשתמש מאומת כעת
      state.user = action.payload       // מעדכנים את פרטי המשתמש
      state.error = null               // אין שגיאות
    },
    
    // פעולה: אימות 2FA נכשל
    // נקראת כאשר הקוד שהמשתמש הזין שגוי
    verify2FAFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false           // גמרנו את התהליך
      state.error = action.payload      // שומרים את הודעת השגיאה
    },
    
    // פעולה: התחלת ביטול 2FA
    // נקראת כאשר המשתמש רוצה לבטל את האימות הדו-שלבי
    disable2FAStart: (state) => {
      state.isLoading = true     // מציינים שאנחנו בתהליך טעינה
      state.error = null         // מנקים שגיאות קודמות
    },
    
    // פעולה: ביטול 2FA הצליח
    // נקראת כאשר 2FA בוטל בהצלחה
    disable2FASuccess: (state, action: PayloadAction<User>) => {
      state.isLoading = false           // גמרנו את התהליך
      state.user = action.payload       // מעדכנים את פרטי המשתמש
      state.error = null               // אין שגיאות
    },
    
    // פעולה: ביטול 2FA נכשל
    // נקראת כאשר יש בעיה בביטול 2FA
    disable2FAFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false           // גמרנו את התהליך
      state.error = action.payload      // שומרים את הודעת השגיאה
    },
    
    // פעולה: יציאה מהמערכת
    // נקראת כאשר המשתמש לוחץ על "התנתק" או כאשר התוקף של הטוקן פג
    logout: (state) => {
      console.log('🔄 Redux logout action triggered');
      clearAuthData()                 // מוחק את כל נתוני האימות מ-localStorage
      state.user = null                // מוחקים את פרטי המשתמש מה-state
      state.isAuthenticated = false    // המשתמש לא מאומת יותר
      state.isLoading = false         // לא בתהליך טעינה
      state.error = null              // מנקים שגיאות
      console.log('✅ Redux logout action completed');
    },
    
    // פעולה: ניקוי שגיאות
    // נקראת כאשר רוצים לנקות הודעת שגיאה (למשל, כאשר המשתמש סוגר את ההודעה)
    clearError: (state) => {
      state.error = null              // מנקים את השגיאה
    },
    
    // 🔐 Soft Login: התחלת אימות מחדש
    reAuthStart: (state) => {
      state.isReAuthenticating = true
      state.error = null
    },
    
    // 🔐 Soft Login: אימות מחדש הצליח
    reAuthSuccess: (state, action: PayloadAction<{ user: User; lastAuthAt: number }>) => {
      state.isReAuthenticating = false
      state.user = action.payload.user
      state.lastAuthAt = action.payload.lastAuthAt
      state.error = null
      setLastAuthAt(action.payload.lastAuthAt)
    },
    
    // 🔐 Soft Login: אימות מחדש נכשל
    reAuthFailure: (state, action: PayloadAction<string>) => {
      state.isReAuthenticating = false
      state.error = action.payload
    }
  }
})

// ייצוא של כל הפעולות שיוצר ה-slice אוטומטית
// אלו הן הפעולות שנוכל לקרוא מרכיבי React כדי לשנות את מצב האימות
export const { 
  loginStart,     // התחלת התחברות
  loginSuccess,   // התחברות הצליחה  
  loginFailure,   // התחברות נכשלה
  registerStart,  // התחלת רישום
  registerSuccess,// רישום הצליח
  registerFailure,// רישום נכשל
  refreshTokenStart,  // התחלת רענון טוקן
  refreshTokenSuccess,// רענון טוקן הצליח
  refreshTokenFailure,// רענון טוקן נכשל
  setup2FAStart,  // התחלת הגדרת 2FA
  setup2FASuccess,// הגדרת 2FA הצליחה
  setup2FAFailure,// הגדרת 2FA נכשלה
  verify2FAStart, // התחלת אימות 2FA
  verify2FASuccess,// אימות 2FA הצליח
  verify2FAFailure,// אימות 2FA נכשל
  disable2FAStart, // התחלת ביטול 2FA
  disable2FASuccess,// ביטול 2FA הצליח
  disable2FAFailure,// ביטול 2FA נכשל
  logout,         // יציאה מהמערכת
  clearError,     // ניקוי שגיאות
  // 🔐 Soft Login: אימות מחדש לפעולות רגישות
  reAuthStart,    // התחלת אימות מחדש
  reAuthSuccess,  // אימות מחדש הצליח
  reAuthFailure   // אימות מחדש נכשל
} = authSlice.actions

// ייצוא ה-reducer שישמש ב-store הראשי
// זה מה שנחבר ל-configureStore ב-index.ts
export default authSlice.reducer