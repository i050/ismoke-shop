// הגדרת ממשקים לאימות
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  guestSessionId?: string; // למזג cart אורח בעת התחברות
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface Setup2FARequest {
  password: string;
}

export interface Verify2FARequest {
  token: string;
  password?: string;
}

export interface Disable2FARequest {
  password: string;
}

export interface LoginWith2FARequest {
  userId: string;
  token: string;
  guestSessionId?: string; // למזג cart אורח בעת התחברות עם 2FA
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
