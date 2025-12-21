export interface User {
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
