import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { logger } from '../utils/logger';

// =============================================================================
// הגדרת ספקי מייל - Resend כראשי, Gmail SMTP כגיבוי
// =============================================================================

// Resend - ספק ראשי (מהיר, אמין, 99.99% uptime)
const resend = new Resend(process.env.RESEND_API_KEY);

// Gmail SMTP - ספק גיבוי במקרה של כישלון
const gmailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  pool: true,
  connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT || '10000'),
  greetingTimeout: parseInt(process.env.SMTP_GREETING_TIMEOUT || '20000'),
  socketTimeout: parseInt(process.env.SMTP_SOCKET_TIMEOUT || '20000')
});

// בדיקת חיבור ראשונית ל-Gmail SMTP לצורך דיאגנוסטיקה
gmailTransporter.verify()
  .then(() => logger.info('✅ Gmail SMTP transporter verified (fallback ready)'))
  .catch((err: any) => logger.warn('⚠️ Gmail SMTP transporter verify failed (fallback unavailable)', { error: err && err.message }));

/**
 * פונקציה מרכזית לשליחת מייל עם fallback אוטומטי
 * מנסה Resend תחילה, ואם נכשל עובר ל-Gmail SMTP
 */
async function sendEmailWithFallback(
  to: string,
  subject: string,
  html: string,
  from: string = `${process.env.STORE_NAME || 'E-commerce'} <${process.env.SMTP_USER}>`
): Promise<void> {
  // ניסיון ראשון - Resend (ספק ראשי)
  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    logger.info('✅ מייל נשלח בהצלחה דרך Resend (primary)', { 
      to, 
      subject,
      messageId: result.data?.id 
    });
    return;
  } catch (resendError: any) {
    // לוג כישלון Resend
    logger.warn('⚠️ Resend נכשל, מעבר ל-Gmail fallback', {
      to,
      subject,
      error: resendError.message,
      code: resendError.code
    });

    // ניסיון שני - Gmail SMTP (גיבוי)
    try {
      const info = await gmailTransporter.sendMail({
        from,
        to,
        subject,
        html
      });

      logger.info('✅ מייל נשלח בהצלחה דרך Gmail (fallback)', {
        to,
        subject,
        messageId: info.messageId
      });
    } catch (gmailError: any) {
      // שני הספקים נכשלו - שגיאה קריטית
      logger.error('❌ כישלון שליחת מייל בשני הספקים (Resend + Gmail)', {
        to,
        subject,
        resendError: resendError.message,
        gmailError: gmailError.message,
        gmailCode: gmailError.code,
        gmailResponse: gmailError.response
      });
      throw new Error('כישלון קריטי בשליחת מייל - כל הספקים נכשלו');
    }
  }
}

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
    await sendEmailWithFallback(
      email,
      'איפוס סיסמה - E-commerce App',
      mailOptions.html
    );
  } catch (error) {
    logger.error('❌ שגיאה בשליחת מייל איפוס סיסמה', { email, error });
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
    await sendEmailWithFallback(
      email,
      'אימות חשבון - E-commerce App',
      mailOptions.html
    );
  } catch (error) {
    logger.error('❌ שגיאה בשליחת מייל אימות', { email, error });
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
    await sendEmailWithFallback(
      email,
      'קוד אימות להתחברות - E-commerce App',
      mailOptions.html
    );
  } catch (error) {
    logger.error('❌ שגיאה בשליחת מייל קוד אימות', { email, error });
    throw new Error('שגיאה בשליחת מייל קוד אימות');
  }
};
