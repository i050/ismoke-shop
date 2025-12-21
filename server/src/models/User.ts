import mongoose, { Document, Schema } from 'mongoose';
import argon2 from 'argon2';


// הגדרת ממשק User
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;          // null עבור social-only users
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
    facebook?: {              // אופציונלי
      id: string;
      email: string;
    };
  };

  // Security & Status
  isActive: boolean;          // לחסימת משתמשים
  isVerified: boolean;        // אימות email (true אם מ-social)
  isApproved: boolean;        // אישור מנהל להרשמה (true כברירת מחדל, false אם נדרש אישור)
  role: 'customer' | 'admin' | 'super_admin';
  customerGroupId?: mongoose.Types.ObjectId; // קישור לקבוצת לקוח

  // Security Tracking
  lastLogin?: Date;
  loginAttempts: number;      // brute force protection
  lockUntil?: Date;           // נעילת חשבון זמנית
  refreshTokens: string[];    // מערך של refresh tokens פעילים

  // Two-Factor Authentication
  twoFactorEnabled: boolean;  // האם 2FA מופעל
  twoFactorSecret?: string;   // סוד TOTP
  backupCodes: string[];      // קודי גיבוי

  // Verification & Reset
  verificationToken?: string;
  verificationTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  
  // Login OTP (Email verification for each login)
  loginOTPCode?: string;
  loginOTPExpires?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateVerificationToken(): string;
  generateResetToken(): string;
  incLoginAttempts(): void;
  resetLoginAttempts(): void;
  isLocked(): boolean;
  addRefreshToken(token: string): void;
  removeRefreshToken(token: string): void;
  clearRefreshTokens(): void;
}

// הגדרת סכימת User
const userSchema = new Schema<IUser>({
  firstName: {
    type: String,
    required: [true, 'שם פרטי הוא שדה חובה'],
    trim: true,
    minlength: [2, 'שם פרטי חייב להכיל לפחות 2 תווים'],
    maxlength: [50, 'שם פרטי לא יכול להכיל יותר מ-50 תווים']
  },
  lastName: {
    type: String,
    required: [true, 'שם משפחה הוא שדה חובה'],
    trim: true,
    minlength: [2, 'שם משפחה חייב להכיל לפחות 2 תווים'],
    maxlength: [50, 'שם משפחה לא יכול להכיל יותר מ-50 תווים']
  },
  email: {
    type: String,
    required: [true, 'אימייל הוא שדה חובה'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'אימייל לא תקין']
  },
  password: {
    type: String,
    required: function(this: IUser) {
      // סיסמה נדרשת רק אם אין providers (social login)
      return !this.providers || Object.keys(this.providers).length === 0;
    },
    minlength: [8, 'סיסמה חייבת להכיל לפחות 8 תווים'],
    select: false // לא להחזיר סיסמה ב-default queries
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    trim: true
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'ישראל' }
  },
  providers: {
    google: {
      id: String,
      email: String,
      verified: Boolean
    },
    apple: {
      id: String,
      email: String
    },
    facebook: {
      id: String,
      email: String
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: true  // ברירת מחדל true - יוגדר ל-false רק אם נדרש אישור מנהל
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'super_admin'],
    default: 'customer'
  },
  customerGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerGroup'
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  refreshTokens: [{
    type: String
  }],
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  backupCodes: [{
    type: String
  }],
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  loginOTPCode: String,
  loginOTPExpires: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for full name
userSchema.virtual('fullName').get(function(this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual field for customer group with populate
userSchema.virtual('customerGroup', {
  ref: 'CustomerGroup',
  localField: 'customerGroupId',
  foreignField: '_id',
  justOne: true
});

// Indexes for performance
// userSchema.index({ email: 1 }); // מוסר כי unique כבר יוצר אינדקס
userSchema.index({ customerGroupId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ isApproved: 1 });
userSchema.index({ 'providers.google.id': 1 });
userSchema.index({ 'providers.apple.id': 1 });
userSchema.index({ 'providers.facebook.id': 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new) and exists
  if (!this.isModified('password') || !this.password) return next();

  try {
    // Hash password with Argon2id (recommended parameters)
    this.password = await argon2.hash(this.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4
    });
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Middleware to update updatedAt when customerGroupId changes
userSchema.pre('save', function(next) {
  if (this.isModified('customerGroupId')) {
    this.updatedAt = new Date();
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  // אם אין סיסמה (social login), החזר false
  if (!this.password) {
    return false;
  }

  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    return false;
  }
};

// Instance method to generate verification token
userSchema.methods.generateVerificationToken = function(): string {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  this.verificationToken = token;
  this.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

// Instance method to generate reset token
userSchema.methods.generateResetToken = function(): string {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  this.resetPasswordToken = token;
  this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

// Instance method to handle failed login attempts
userSchema.methods.incLoginAttempts = function(): void {
  // אם החשבון נעול, בדוק אם הזמן עבר
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.resetLoginAttempts();
  }

  this.loginAttempts += 1;

  // נעל חשבון אחרי 5 ניסיונות כושלים
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
  }
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function(): void {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
};

// Instance method to check if account is locked
userSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Instance method to add refresh token
userSchema.methods.addRefreshToken = function(token: string): void {
  // שמור רק את 5 הטוקנים האחרונים
  this.refreshTokens = this.refreshTokens || [];
  this.refreshTokens.push(token);
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
};

// Instance method to remove refresh token
userSchema.methods.removeRefreshToken = function(token: string): void {
  this.refreshTokens = this.refreshTokens || [];
  this.refreshTokens = this.refreshTokens.filter((t: string) => t !== token);
};

// Instance method to clear all refresh tokens
userSchema.methods.clearRefreshTokens = function(): void {
  this.refreshTokens = [];
};

// יצירת המודל
const User = mongoose.model<IUser>('User', userSchema);

export default User;
