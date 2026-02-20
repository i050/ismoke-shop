/**
 * Email Worker
 * ============
 * מעבד משימות מייל מהתור
 * - אישור הזמנה
 * - עדכון משלוח
 * - התראות תשלום
 * - הודעות כלליות
 */

import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { QUEUE_NAMES, EmailJobData, getSharedRedisConnection } from '../index';
import { logger } from '../../utils/logger';
import User from '../../models/User';

// =============================================================================
// הגדרת ספקי מייל - Resend כראשי, Gmail SMTP כגיבוי
// =============================================================================

// Resend - ספק ראשי (מהיר, אמין, 99.99% uptime)
// Lazy initialization - נוצר רק בפעם הראשונה שמשתמשים בו
let resend: Resend | null = null;
function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

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
  .then(() => logger.info('✅ Gmail SMTP transporter verified (emailWorker fallback ready)'))
  .catch((err: any) => logger.warn('⚠️ Gmail SMTP transporter verify failed (emailWorker fallback unavailable)', { error: err && err.message }));

// =============================================================================
// תבניות מייל מלאות
// =============================================================================

interface EmailTemplate {
  subject: string;
  html: string;
}

/**
 * פורמט מטבע
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * פורמט תאריך
 */
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * יצירת HTML לפריטי הזמנה
 */
function renderOrderItems(items: any[]): string {
  if (!items || items.length === 0) return '';
  
  return items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.productName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.productName}${item.skuName ? ` - ${item.skuName}` : ''}</strong>
        ${item.sku ? `<br><small style="color: #999;">SKU: ${item.sku}</small>` : ''}
        ${item.attributes ? `<br><small style="color: #666;">${Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}</small>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: left;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('');
}

function getEmailTemplate(type: EmailJobData['type'], data: Record<string, unknown>): EmailTemplate {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const storeName = process.env.STORE_NAME || 'E-commerce Store';
  
  const templates: Record<EmailJobData['type'], EmailTemplate> = {
    // =====================================================
    // תבנית אישור הזמנה מלאה
    // =====================================================
    order_confirmation: {
      subject: `✅ אישור הזמנה #${data.orderNumber} - ${storeName}`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">✅ ההזמנה התקבלה!</h1>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 30px;">
              
              <!-- ברכה -->
              <p style="font-size: 18px; color: #333; margin-bottom: 20px;">
                שלום <strong>${data.customerName || 'לקוח/ה יקר/ה'}</strong>,
              </p>
              <p style="color: #555; line-height: 1.6;">
                תודה על הזמנתך! קיבלנו אותה בהצלחה ואנחנו כבר מטפלים בה.
              </p>
              
              <!-- פרטי הזמנה -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">📋 פרטי הזמנה</h2>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">מספר הזמנה:</td>
                    <td style="padding: 8px 0; text-align: left;"><strong>${data.orderNumber}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">תאריך:</td>
                    <td style="padding: 8px 0; text-align: left;">${formatDate(data.orderDate as string)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">סטטוס:</td>
                    <td style="padding: 8px 0; text-align: left;">
                      <span style="background: #fff3cd; color: #856404; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                        ממתין לאישור
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- רשימת מוצרים -->
              <h3 style="color: #333; margin-top: 30px;">🛒 המוצרים שהזמנת</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;"></th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">מוצר</th>
                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">כמות</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">מחיר</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderOrderItems(data.items as any[])}
                </tbody>
              </table>
              
              <!-- סיכום כספי -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">סכום ביניים:</td>
                    <td style="padding: 8px 0; text-align: left;">${formatCurrency(data.subtotal as number)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">מע"מ:</td>
                    <td style="padding: 8px 0; text-align: left;">${formatCurrency(data.tax as number)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">משלוח:</td>
                    <td style="padding: 8px 0; text-align: left;">${(data.shippingCost as number) === 0 ? '<span style="color: #28a745;">חינם! 🎉</span>' : formatCurrency(data.shippingCost as number)}</td>
                  </tr>
                  ${(data.discount as number) > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #28a745;">הנחה:</td>
                    <td style="padding: 8px 0; text-align: left; color: #28a745;">-${formatCurrency(data.discount as number)}</td>
                  </tr>
                  ` : ''}
                  <tr style="border-top: 2px solid #dee2e6;">
                    <td style="padding: 12px 0; font-size: 18px;"><strong>סה"כ לתשלום:</strong></td>
                    <td style="padding: 12px 0; text-align: left; font-size: 18px;"><strong>${formatCurrency(data.total as number)}</strong></td>
                  </tr>
                </table>
              </div>
              
              <!-- כתובת משלוח -->
              <div style="background: #e8f5e9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">📦 כתובת למשלוח</h3>
                <p style="margin: 0; line-height: 1.8; color: #555;">
                  ${(data.shippingAddress as any)?.fullName}<br>
                  ${(data.shippingAddress as any)?.street}<br>
                  ${(data.shippingAddress as any)?.city}, ${(data.shippingAddress as any)?.postalCode}<br>
                  טלפון: ${(data.shippingAddress as any)?.phone}
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${frontendUrl}/orders?orderId=${data.orderId || ''}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
                  צפייה בהזמנה
                </a>
              </div>
              
              <!-- מידע נוסף -->
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  📧 נשלח לך עדכון כשההזמנה תישלח<br>
                  📞 שאלות? צור קשר: ${process.env.SUPPORT_EMAIL || 'support@example.com'}
                </p>
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                ${storeName} | מייל זה נשלח אוטומטית, אנא אל תשיב עליו.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `
    },
    
    // =====================================================
    // תבנית עדכון משלוח
    // =====================================================
    order_shipped: {
      subject: `📦 הזמנתך נשלחה! - ${data.orderNumber}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 30px;">
          <h1 style="color: #333; text-align: center;">📦 הזמנתך בדרך אליך!</h1>
          <p>שלום ${data.customerName || 'לקוח/ה יקר/ה'},</p>
          <p>הזמנה מספר <strong>${data.orderNumber}</strong> נשלחה!</p>
          
          ${/* פרטי משלוח - מוצגים רק אם הוזנו על ידי המנהל */
            (data.shippingCarrier || data.trackingNumber || data.courierPhone) ? `
          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #2e7d32;">🚚 פרטי המשלוח</h3>
            ${data.shippingCarrier ? `<p style="margin: 8px 0;"><strong>חברת משלוחים:</strong> ${data.shippingCarrier}</p>` : ''}
            ${data.trackingNumber ? `<p style="margin: 8px 0;"><strong>מספר מעקב:</strong> ${data.trackingNumber}</p>` : ''}
            ${data.courierPhone ? `<p style="margin: 8px 0;"><strong>טלפון שליח:</strong> <span dir="ltr">${data.courierPhone}</span></p>` : ''}
          </div>
          ` : ''}
          
          <p>המשלוח צפוי להגיע תוך ${data.estimatedDeliveryDays ? `${data.estimatedDeliveryDays} ימי עסקים` : '3-5 ימי עסקים'}.</p>
          ${data.shippingNotes ? `
          <div style="background: #fff8e1; padding: 15px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>📝 הערות:</strong> ${data.shippingNotes}</p>
          </div>
          ` : ''}
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">מייל זה נשלח אוטומטית.</p>
        </div>
      `
    },
    
    // =====================================================
    // תבנית כישלון תשלום
    // =====================================================
    payment_failed: {
      subject: '⚠️ בעיה בתשלום - נדרשת פעולה',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 30px;">
          <h1 style="color: #dc3545; text-align: center;">⚠️ התשלום נכשל</h1>
          <p>שלום ${data.customerName || 'לקוח/ה יקר/ה'},</p>
          <p>לצערנו, התשלום עבור הזמנה מספר <strong>${data.orderNumber}</strong> נכשל.</p>
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;">אנא נסה שוב או השתמש באמצעי תשלום אחר.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/checkout" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              נסה שוב
            </a>
          </div>
        </div>
      `
    },
    
    // =====================================================
    // תבנית החזר כספי
    // =====================================================
    refund_processed: {
      subject: `↩️ החזר כספי אושר - ${data.orderNumber}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 30px;">
          <h1 style="color: #28a745; text-align: center;">↩️ ההחזר הכספי אושר</h1>
          <p>שלום ${data.customerName || 'לקוח/ה יקר/ה'},</p>
          <p>ההחזר הכספי עבור הזמנה מספר <strong>${data.orderNumber}</strong> אושר.</p>
          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 24px; margin: 0;"><strong>${formatCurrency(data.amount as number)}</strong></p>
            <p style="color: #666; margin: 10px 0 0 0;">יוחזר לאמצעי התשלום שלך</p>
          </div>
          <p>ההחזר יופיע בחשבונך תוך 5-10 ימי עסקים.</p>
        </div>
      `
    },
    
    // =====================================================
    // תבנית איפוס סיסמה
    // =====================================================
    password_reset: {
      subject: '🔐 איפוס סיסמה',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 30px;">
          <h2 style="color: #333; text-align: center;">איפוס סיסמה</h2>
          <p>קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              איפוס סיסמה
            </a>
          </div>
          <p><strong>שים לב:</strong> הקישור תקף ל-24 שעות בלבד.</p>
          <p>אם לא ביקשת לאפס את הסיסמה, התעלם ממייל זה.</p>
        </div>
      `
    },
    
    // =====================================================
    // תבנית ברוכים הבאים
    // =====================================================
    welcome: {
      subject: `🎉 ברוך הבא ל-${storeName}!`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 30px;">
          <h1 style="color: #333; text-align: center;">🎉 ברוך הבא!</h1>
          <p>שלום ${data.customerName || 'לקוח/ה יקר/ה'},</p>
          <p>שמחים שהצטרפת למשפחה שלנו!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/products" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
              התחל לקנות
            </a>
          </div>
        </div>
      `
    },
    
    // =====================================================
    // תבנית התראת חזרה למלאי - Stock Alert
    // =====================================================
    stock_alert: {
      subject: `🎉 ${data.productName || 'המוצר'} חזר למלאי! - ${storeName}`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🎉 חדשות טובות!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">המוצר שחיכית לו חזר למלאי</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 30px;">
              
              <!-- תמונת המוצר -->
              ${data.productImage ? `
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="${data.productImage}" alt="${data.productName}" 
                     style="max-width: 200px; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              </div>
              ` : ''}
              
              <!-- פרטי המוצר -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <h2 style="margin: 0 0 10px 0; color: #333; font-size: 20px;">${data.productName || 'המוצר'}</h2>
                ${data.skuName ? `<p style="color: #666; margin: 5px 0;">וריאנט: ${data.skuName}</p>` : ''}
                ${data.skuCode ? `<p style="color: #999; margin: 5px 0; font-size: 12px;">מק"ט: ${data.skuCode}</p>` : ''}
                ${data.price ? `
                <p style="font-size: 24px; color: #28a745; margin: 15px 0 0 0; font-weight: bold;">
                  ${formatCurrency(data.price as number)}
                </p>
                ` : ''}
              </div>
              
              <!-- הודעת דחיפות -->
              <div style="background: #fff3cd; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⚡ <strong>מהרו!</strong> המלאי מוגבל ועלול להיגמר במהירות
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.productUrl || frontendUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                  קנה עכשיו 🛒
                </a>
              </div>
              
              <!-- מידע נוסף -->
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; text-align: center;">
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  ביקשת לקבל התראה כשהמוצר יחזור למלאי.<br>
                  אם אינך מעוניין/ת לקבל התראות נוספות,
                  <a href="${data.unsubscribeUrl || '#'}" style="color: #007bff;">לחץ/י כאן לביטול</a>.
                </p>
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                ${storeName} | מייל זה נשלח אוטומטית בעקבות בקשתך.
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `
    },
    
    // =====================================================
    // תבנית התראת הזמנה חדשה למנהל - Admin New Order
    // =====================================================
    admin_new_order: {
      subject: `🆕 הזמנה חדשה #${data.orderNumber} - ${data.customerName}`,
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🆕 הזמנה חדשה התקבלה!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">הזמנה #${data.orderNumber}</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 30px;">
              
              <!-- פרטי לקוח -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                <h2 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">👤 פרטי לקוח</h2>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">שם:</td>
                    <td style="padding: 8px 0; text-align: left;"><strong>${data.customerName}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">אימייל:</td>
                    <td style="padding: 8px 0; text-align: left;">${data.customerEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">תאריך הזמנה:</td>
                    <td style="padding: 8px 0; text-align: left;">${formatDate(data.createdAt as string)}</td>
                  </tr>
                </table>
              </div>
              
              <!-- פריטי ההזמנה -->
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 0 0 20px 0;">
                <h2 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">📦 פריטי ההזמנה</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <thead>
                    <tr style="background: #e9ecef;">
                      <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">תמונה</th>
                      <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">מוצר</th>
                      <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">כמות</th>
                      <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">מחיר</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${((data.items as any[]) || []).map((item: any) => `
                      <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">
                          ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : '<span style="color: #999;">-</span>'}
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee;">
                          <strong>${item.name}${item.skuName ? ` - ${item.skuName}` : ''}</strong>
                          ${item.sku ? `<br><small style="color: #999;">SKU: ${item.sku}</small>` : ''}
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: left;">${formatCurrency(item.price)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              
              <!-- סיכום -->
              <div style="background: #d4edda; border-radius: 8px; padding: 20px; text-align: center;">
                <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #155724;">סה"כ לתשלום</h2>
                <p style="font-size: 32px; color: #155724; margin: 0; font-weight: bold;">
                  ${formatCurrency(data.total as number)}
                </p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${frontendUrl}/admin/orders?highlight=${data.orderId}" 
                   style="display: inline-block; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);">
                  צפה בהזמנה באזור הניהול 📋
                </a>
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                ${storeName} | התראה אוטומטית להזמנה חדשה
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `
    },

    // =====================================================
    // תבנית קוד OTP להתחברות
    // =====================================================
    login_otp: {
      subject: `🔐 קוד אימות להתחברות - ${storeName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 30px;">
          <h2 style="color: #333; text-align: center;">קוד אימות להתחברות</h2>
          <p>שלום,</p>
          <p>התקבלה בקשת התחברות לחשבונך.</p>
          <p>קוד האימות שלך:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="background-color: #f8f9fa; color: #333; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; display: inline-block; border: 2px dashed #007bff;">
              ${data.otpCode}
            </span>
          </div>
          <p><strong>שים לב:</strong> הקוד תקף ל-10 דקות בלבד.</p>
          <p style="color: #dc3545;">אם לא ביקשת להתחבר, מישהו אחר מנסה לגשת לחשבון שלך. מומלץ לשנות את הסיסמה שלך.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">מייל זה נשלח אוטומטית. אנא אל תשיב למייל זה.</p>
        </div>
      `
    },

    // =====================================================
    // תבנית אימות חשבון באימייל
    // =====================================================
    email_verification: {
      subject: `✉️ אימות חשבון - ${storeName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; padding: 30px;">
          <h2 style="color: #333; text-align: center;">אימות חשבון</h2>
          <p>שלום,</p>
          <p>תודה על הרשמתך!</p>
          <p>כדי להפעיל את החשבון שלך, לחץ על הקישור הבא:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationUrl}"
               style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              אימות חשבון
            </a>
          </div>
          <p><strong>שים לב:</strong> הקישור תקף ל-24 שעות בלבד.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">מייל זה נשלח אוטומטית. אנא אל תשיב למייל זה.</p>
        </div>
      `
    }
  };
  
  return templates[type];
}

// =============================================================================
// פונקציית שליחת מייל
// =============================================================================

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  
  const isMockMode = process.env.EMAIL_MOCK_MODE !== 'false';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
  const storeName = process.env.STORE_NAME || 'E-commerce Store';
  
  if (isMockMode) {
    // Mock mode - לוג בלבד (לפיתוח ובדיקות)
    logger.info('📧 [MOCK] מייל נשלח', {
      to,
      subject,
      htmlLength: html.length
    });
    
    // סימולציה של השהיה
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId: `mock-${Date.now()}`
    };
  }
  
  // שליחה אמיתית עם Resend (ספק ראשי) + Gmail fallback
  // ניסיון ראשון - Resend
  try {
    const result = await getResend().emails.send({
      from: `${storeName} <${fromEmail}>`,
      to,
      subject,
      html
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
    
    logger.info('📧 מייל נשלח בהצלחה דרך Resend (primary)', {
      to,
      subject,
      messageId: result.data?.id
    });
    
    return {
      success: true,
      messageId: result.data?.id || `resend-${Date.now()}`
    };
    
  } catch (resendError: any) {
    // לוג כישלון Resend
    logger.warn('⚠️ Resend נכשל בעובד התור, מעבר ל-Gmail fallback', {
      to,
      subject,
      error: resendError.message,
      code: resendError.code
    });

    // ניסיון שני - Gmail SMTP (גיבוי)
    try {
      const result = await gmailTransporter.sendMail({
        from: `"${storeName}" <${fromEmail}>`,
        to,
        subject,
        html
      });
      
      logger.info('📧 מייל נשלח בהצלחה דרך Gmail (fallback)', {
        to,
        subject,
        messageId: result.messageId
      });
      
      return {
        success: true,
        messageId: result.messageId
      };
      
    } catch (gmailError: any) {
      // שני הספקים נכשלו
      const errorMessage = gmailError && gmailError.message ? gmailError.message : 'שגיאה לא ידועה';

      logger.error('❌ כישלון שליחת מייל בשני הספקים (Resend + Gmail)', {
        to,
        subject,
        resendError: resendError.message,
        gmailError: errorMessage,
        gmailCode: gmailError && gmailError.code,
        gmailResponse: gmailError && gmailError.response,
        stack: gmailError && gmailError.stack
      });

      return {
        success: false,
        error: `כישלון קריטי: Resend (${resendError.message}), Gmail (${errorMessage})`
      };
    }
  }
}

// =============================================================================
// פונקציית עיבוד משימת מייל
// =============================================================================

async function processEmailJob(job: Job<EmailJobData>): Promise<SendEmailResult> {
  const { type, to, data, subject: customSubject } = job.data;
  
  logger.info('📧 מעבד משימת מייל', {
    jobId: job.id,
    type,
    to,
    attempt: job.attemptsMade + 1
  });
  
  try {
    // בדיקת bounce – אם הכתובת מסומנת כ-bounced/complaint, לא שולחים
    const bouncedUser = await User.findOne(
      { email: to, $or: [{ emailBounced: true }, { emailComplaint: true }] },
      { _id: 1 }
    ).lean();

    if (bouncedUser) {
      logger.warn('⛔ דילוג על מייל – כתובת מסומנת כ-bounced/complaint', { to, type });
      return { success: false, error: 'Email address bounced or complained' };
    }

    // קבלת תבנית
    const template = getEmailTemplate(type, data);
    const subject = customSubject || template.subject;
    
    // שליחה
    const result = await sendEmail(to, subject, template.html);
    
    if (!result.success) {
      throw new Error(result.error || 'שליחת מייל נכשלה');
    }
    
    logger.info('✅ מייל נשלח', {
      jobId: job.id,
      type,
      to,
      messageId: result.messageId
    });
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    
    logger.error('❌ כישלון בשליחת מייל', {
      jobId: job.id,
      type,
      to,
      error: errorMessage,
      attempt: job.attemptsMade + 1
    });
    
    throw error;
  }
}

// =============================================================================
// יצירת ה-Worker
// =============================================================================

let emailWorker: Worker | null = null;

export function startEmailWorker(): Worker {
  if (emailWorker) {
    logger.warn('Email Worker כבר רץ');
    return emailWorker;
  }
  
  emailWorker = new Worker<EmailJobData>(
    QUEUE_NAMES.EMAILS,
    processEmailJob,
    {
      connection: getSharedRedisConnection(),
      concurrency: 10,  // מיילים יכולים להישלח במקביל
      limiter: {
        max: 20,        // מקסימום 20 מיילים
        duration: 1000  // לשנייה
      }
    }
  );
  
  // Event handlers
  emailWorker.on('completed', (job) => {
    logger.debug('✅ משימת מייל הושלמה', {
      jobId: job.id,
      type: job.data.type
    });
  });
  
  emailWorker.on('failed', (job, error) => {
    logger.error('❌ משימת מייל נכשלה', {
      jobId: job?.id,
      type: job?.data.type,
      to: job?.data.to,
      error: error.message
    });
  });
  
  emailWorker.on('error', (error) => {
    logger.error('❌ שגיאת Email Worker', {
      error: error.message
    });
  });
  
  logger.info('📧 Email Worker התחיל');
  
  return emailWorker;
}

export async function stopEmailWorker(): Promise<void> {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
    logger.info('📧 Email Worker נעצר');
  }
}

export { emailWorker };
