import { Router } from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  setup2FA,
  verify2FA,
  disable2FA,
  loginWith2FA,
  loginWithOTP,
  resendLoginOTP,
  forgotPassword,
  resetPassword
} from '../controllers/auth';
import { authMiddleware } from '../middleware/authMiddleware';

// יצירת router
const router = Router();

// רוטס ציבורי - לא דורש אימות
router.post('/register', register);
router.post('/login', login);
router.post('/login-2fa', loginWith2FA); // חדש
router.post('/login-otp', loginWithOTP); // התחברות עם קוד OTP מהמייל
router.post('/resend-login-otp', resendLoginOTP); // שליחה מחדש של קוד OTP
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// רוטס מוגן - דורש אימות
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.put('/change-password', authMiddleware, changePassword);

// רוטס 2FA - דורש אימות
router.post('/setup-2fa', authMiddleware, setup2FA);
router.post('/verify-2fa', authMiddleware, verify2FA);
router.post('/disable-2fa', authMiddleware, disable2FA);

// ייצוא ה-router
export default router;
