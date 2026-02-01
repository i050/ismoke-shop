import type { User } from '../types'
import { ApiError } from '../utils/ApiError';
import { setToken, setUser, clearAuthData, getToken, setLastAuthAt } from '../utils/tokenUtils'
import { API_BASE_URL as BASE_URL } from '../config/api';

// כתובת ה-API - משתמש במודול מרכזי עם זיהוי אוטומטי של Railway
const API_BASE_URL = `${BASE_URL}/api`;

export interface LoginData {
  email: string
  password: string
  guestSessionId?: string // להתחברות עם מזג cart
}

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
}

// תגובת אימות רגילה - עם משתמש וטוקן
export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    token: string
    cart?: any // cart שהתמזג מ-guest cart (אם קיים)
  }
}

// תגובת רישום שממתינה לאישור מנהל
export interface PendingApprovalResponse {
  success: boolean
  message: string
  data: {
    pendingApproval: true
    email: string
  }
}

// תגובת רישום - יכולה להיות אחד משני המצבים
export type RegisterResponse = AuthResponse | PendingApprovalResponse

export interface Setup2FAData {
  verificationCode: string
}

export interface Setup2FAResponse {
  success: boolean
  message: string
  data?: {
    qrCodeUrl: string
    secret: string
    backupCodes: string[]
  }
}

export interface Verify2FAData {
  verificationCode: string
}

export interface Verify2FAResponse {
  success: boolean
  message: string
  data?: {
    user: User
    token: string
    cart?: any // cart שהתמזג מ-guest cart (אם קיים)
  }
}

export interface Disable2FAResponse {
  success: boolean
  message: string
}

export interface ForgotPasswordData {
  email: string
}

export interface ForgotPasswordResponse {
  success: boolean
  message: string
}

export interface ResetPasswordData {
  token: string
  newPassword: string
}

export interface ResetPasswordResponse {
  success: boolean
  message: string
}

// תגובה שדורשת OTP מהמייל
export interface RequiresLoginOTPResponse {
  success: boolean
  message: string
  data: {
    requiresLoginOTP: true
    userId: string
    message: string
  }
}

// תגובה שדורשת 2FA
export interface Requires2FAResponse {
  success: boolean
  message: string
  data: {
    requires2FA: true
    userId: string
    message: string
  }
}

// Login יכול להחזיר AuthResponse, RequiresLoginOTPResponse או Requires2FAResponse
export type LoginResponse = AuthResponse | RequiresLoginOTPResponse | Requires2FAResponse

export interface LoginWithOTPData {
  userId: string
  otpCode: string
  guestSessionId?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordResponse {
  success: boolean
  message: string
}

// 🔐 Soft Login: תגובת אימות מחדש
export interface ReAuthResponse {
  success: boolean
  message: string
  data: {
    token: string
    user: User
    lastAuthAt: number
  }
}

export interface GetProfileResponse {
  success: boolean
  message: string
  data: {
    user: User
  }
}

export class AuthService {
  // התחברות
  static async login(credentials: LoginData): Promise<AuthResponse> {
    try {
      console.log('🔍 Login attempt with credentials:', credentials)
      
      const requestBody = JSON.stringify(credentials)
      console.log('📤 Request body:', requestBody)
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: requestBody
      })

      console.log('📥 Response status:', response.status)
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // אם לא הצלחנו לפרסר JSON, נשאר עם statusText
        }
        console.error('❌ Response error:', errorMessage);
        throw new ApiError(response.status, errorMessage);
      }

      const data = await response.json()
      console.log('✅ Response data:', data)

      // שמירת הטוקן והנתונים ב-localStorage
      if (data.success && data.data) {
        setToken(data.data.token)
        setUser(data.data.user)
        setLastAuthAt(Date.now()) // 🔐 Soft Login: שמירת זמן אימות אחרון
        
        // אם חזר cart מה-merge, שמור אותו ב-localStorage
        if (data.data.cart) {
          localStorage.setItem('cart', JSON.stringify(data.data.cart))
          console.log('✅ Cart merged and saved to localStorage')
          
          // ✅ נקה את sessionId של האורח - כבר לא צריך אותו
          localStorage.removeItem('sessionId')
          console.log('✅ Guest sessionId removed - cart is now associated with user')
        }
      }

      return data
    } catch (error) {
      console.error('Error logging in:', error)
      throw error
    }
  }

  // רישום משתמש חדש
  static async register(userData: RegisterData): Promise<RegisterResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // אם לא הצלחנו לפרסר JSON, נשאר עם statusText
        }
        throw new ApiError(response.status, errorMessage);
      }

      const data = await response.json()

      // 🔒 שמירת טוקן/משתמש רק אם הגיעו בפועל (כלומר לא במצב pendingApproval)
      if (data.success && data.data && data.data.token && data.data.user) {
        setToken(data.data.token)
        setUser(data.data.user)
      } else {
        // 📭 במצב pendingApproval ננקה כל נתוני auth קיימים כדי למנוע מצב ביניים שגוי
        clearAuthData()
      }

      return data
    } catch (error) {
      console.error('Error registering:', error)
      throw error
    }
  }

  // יציאה מהמערכת
  static async logout(): Promise<void> {
    try {
      console.log('🔄 Starting logout process...');
      
      // קריאה לשרת ל-logout
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Logout response status:', response.status);
      
      if (!response.ok) {
        console.warn('⚠️ Server logout failed, but continuing with client logout');
      } else {
        console.log('✅ Server logout successful');
      }
    } catch (error) {
      console.error('❌ Server logout error:', error);
      // לא נזרוק שגיאה - נמשיך עם logout בצד ה-client
    } finally {
      // תמיד ננקה את הנתונים בצד ה-client
      clearAuthData();
      console.log('🧹 Client logout completed - auth data cleared');
    }
  }

  // רענון טוקן (אם השרת תומך)
  static async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // אם לא הצלחנו לפרסר JSON, נשאר עם statusText
        }
        throw new ApiError(response.status, errorMessage);
      }

      const data = await response.json()

      // שמירת הטוקן החדש
      if (data.success && data.data) {
        setToken(data.data.token)
        if (data.data.user) {
          setUser(data.data.user)
        }
      }

      return data
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw error
    }
  }

  // הגדרת 2FA
  static async setup2FA(verificationCode: string): Promise<Setup2FAResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/setup-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ verificationCode })
      })

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // אם לא הצלחנו לפרסר JSON, נשאר עם statusText
        }
        throw new ApiError(response.status, errorMessage);
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      throw error
    }
  }

  // אימות קוד 2FA
  static async verify2FA(verificationCode: string, guestSessionId?: string): Promise<Verify2FAResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ verificationCode, guestSessionId })
      })

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // אם לא הצלחנו לפרסר JSON, נשאר עם statusText
        }
        throw new ApiError(response.status, errorMessage);
      }

      const data = await response.json()

      // שמירת הטוקן והנתונים ב-localStorage
      if (data.success && data.data) {
        setToken(data.data.token)
        setUser(data.data.user)
        
        // אם חזר cart מה-merge, שמור אותו ב-localStorage
        if (data.data.cart) {
          localStorage.setItem('cart', JSON.stringify(data.data.cart))
          console.log('✅ Cart merged and saved to localStorage')
          
          // ✅ נקה את sessionId של האורח - כבר לא צריך אותו
          localStorage.removeItem('sessionId')
          console.log('✅ Guest sessionId removed after 2FA - cart is now associated with user')
        }
      }

      return data
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      throw error
    }
  }

  // ביטול 2FA
  static async disable2FA(): Promise<Disable2FAResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/disable-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      })

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // אם לא הצלחנו לפרסר JSON, נשאר עם statusText
        }
        throw new ApiError(response.status, errorMessage);
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      throw error
    }
  }

  // שכחתי סיסמה
  static async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // אם לא הצלחנו לפרסר JSON, נשאר עם statusText
        }
        throw new ApiError(response.status, errorMessage);
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error sending forgot password request:', error)
      throw error
    }
  }

  // איפוס סיסמה
  static async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  }

  // שינוי סיסמה
  static async changePassword(currentPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error changing password:', error)
      throw error
    }
  }

  // קבלת פרופיל משתמש
  static async getProfile(): Promise<GetProfileResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error getting profile:', error)
      throw error
    }
  }

  // התחברות עם OTP (קוד מייל)
  static async loginWithOTP(loginData: LoginWithOTPData): Promise<AuthResponse> {
    try {
      console.log('🔍 Login with OTP attempt:', loginData.userId);
      
      const response = await fetch(`${API_BASE_URL}/auth/login-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // אם לא הצלחנו לפרסר JSON, נשאר עם statusText
        }
        console.error('❌ Response error:', errorMessage);
        throw new ApiError(response.status, errorMessage);
      }

      const data = await response.json();
      console.log('✅ Response data:', data);

      // שמירת הטוקן והנתונים ב-localStorage
      if (data.success && data.data) {
        setToken(data.data.token);
        setUser(data.data.user);
        
        // אם חזר cart מה-merge, שמור אותו ב-localStorage
        if (data.data.cart) {
          localStorage.setItem('cart', JSON.stringify(data.data.cart));
          console.log('✅ Cart merged and saved to localStorage');
          
          // ניקוי sessionId של האורח
          localStorage.removeItem('sessionId');
          console.log('✅ Guest sessionId removed');
        }
      }

      return data;
    } catch (error) {
      console.error('Error logging in with OTP:', error);
      throw error;
    }
  }

  // שליחה מחדש של קוד OTP
  static async resendLoginOTP(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 Resending OTP for user:', userId);
      
      const response = await fetch(`${API_BASE_URL}/auth/resend-login-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // אם לא הצלחנו לפרסר JSON, נשאר עם statusText
        }
        throw new ApiError(response.status, errorMessage);
      }

      const data = await response.json();
      console.log('✅ OTP resent successfully');
      return data;
    } catch (error) {
      console.error('Error resending OTP:', error);
      throw error;
    }
  }

  // 🔐 Soft Login: אימות מחדש לפעולות רגישות
  static async reAuthenticate(password: string): Promise<ReAuthResponse> {
    try {
      console.log('🔐 Re-authentication attempt...');
      
      const response = await fetch(`${API_BASE_URL}/auth/re-authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // אם לא הצלחנו לפרסר JSON, נשאר עם statusText
        }
        console.error('❌ Re-authentication error:', errorMessage);
        throw new ApiError(response.status, errorMessage);
      }

      const data = await response.json();
      console.log('✅ Re-authentication successful');
      
      // שמירת הטוקן החדש עם lastAuthAt
      if (data.success && data.data) {
        setToken(data.data.token);
        setUser(data.data.user);
        setLastAuthAt(data.data.lastAuthAt || Date.now());
      }
      
      return data;
    } catch (error) {
      console.error('❌ Re-authentication error:', error);
      throw error;
    }
  }
}
