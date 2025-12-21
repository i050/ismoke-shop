import nodemailer from 'nodemailer';

// הגדרת transporter לשליחת מיילים
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * שליחת מייל איפוס סיסמה
 */
export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"E-commerce App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'איפוס סיסמה - E-commerce App',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">איפוס סיסמה</h2>
        <p>שלום,</p>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך באפליקציית E-commerce.</p>
        <p>כדי לאפס את הסיסמה, לחץ על הקישור הבא:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            איפוס סיסמה
          </a>
        </div>
        <p><strong>שים לב:</strong> הקישור תקף ל-24 שעות בלבד.</p>
        <p>אם לא ביקשת לאפס את הסיסמה, התעלם ממייל זה.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          מייל זה נשלח אוטומטית. אנא אל תשיב למייל זה.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Password reset email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('שגיאה בשליחת מייל איפוס סיסמה');
  }
};

/**
 * שליחת מייל אימות חשבון
 */
export const sendVerificationEmail = async (email: string, verificationToken: string): Promise<void> => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"E-commerce App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'אימות חשבון - E-commerce App',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">אימות חשבון</h2>
        <p>שלום,</p>
        <p>תודה על הרשמתך לאפליקציית E-commerce!</p>
        <p>כדי להפעיל את החשבון שלך, לחץ על הקישור הבא:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}"
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            אימות חשבון
          </a>
        </div>
        <p><strong>שים לב:</strong> הקישור תקף ל-24 שעות בלבד.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          מייל זה נשלח אוטומטית. אנא אל תשיב למייל זה.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Verification email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('שגיאה בשליחת מייל אימות');
  }
};

/**
 * שליחת מייל OTP להתחברות
 * @param email - כתובת המייל
 * @param otpCode - קוד OTP בן 6 ספרות
 */
export const sendLoginOTPEmail = async (email: string, otpCode: string): Promise<void> => {
  const mailOptions = {
    from: `"E-commerce App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'קוד אימות להתחברות - E-commerce App',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">קוד אימות להתחברות</h2>
        <p>שלום,</p>
        <p>התקבלה בקשת התחברות לחשבונך באפליקציית E-commerce.</p>
        <p>קוד האימות שלך:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="background-color: #f8f9fa; color: #333; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; display: inline-block; border: 2px dashed #007bff;">
            ${otpCode}
          </span>
        </div>
        <p><strong>שים לב:</strong> הקוד תקף ל-10 דקות בלבד.</p>
        <p style="color: #dc3545;">אם לא ביקשת להתחבר, מישהו אחר מנסה לגשת לחשבון שלך. מומלץ לשנות את הסיסמה שלך.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          מייל זה נשלח אוטומטית. אנא אל תשיב למייל זה.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Login OTP email sent to ${email}`);
  } catch (error) {
    console.error('❌ Error sending login OTP email:', error);
    throw new Error('שגיאה בשליחת מייל קוד אימות');
  }
};
