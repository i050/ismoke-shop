@# מערכת מיילים – תכנית שדרוג Production

**React + Node.js (TypeScript) + Express + BullMQ + Redis + Resend + Nodemailer (Gmail SMTP fallback)**

> מסמך זה מותאם **במדויק** לפרויקט הקיים. כל פריט מתייחס לקבצים אמיתיים בפרויקט ומגדיר מה חסר ומה צריך לשנות.

---

## 1. סטטוס נוכחי – מה כבר קיים ועובד

הפרויקט כבר כולל מערכת מיילים מבוססת Queue מתקדמת. להלן מיפוי מלא:

### 1.1 תשתית קיימת ✅

| רכיב | קובץ | סטטוס |
|------|------|-------|
| **תור מיילים (BullMQ)** | `server/src/queues/index.ts` | ✅ עובד – Queue `emails`, lazy init, exponential backoff, 3 ניסיונות |
| **Email Worker** | `server/src/queues/workers/emailWorker.ts` | ✅ עובד – concurrency=10, rate limiter 20/שנייה, Resend+Gmail fallback |
| **Workers Manager** | `server/src/queues/workers/index.ts` | ✅ עובד – `startAllWorkers()` / `stopAllWorkers()` |
| **Redis Connection** | `server/src/config/redis.ts` + `queues/index.ts` | ✅ עובד – חיבור נפרד לתורים, retry strategy |
| **Resend (ספק ראשי)** | emailWorker.ts + emailService.ts | ✅ עובד – lazy initialization |
| **Gmail SMTP (fallback)** | emailWorker.ts + emailService.ts | ✅ עובד – pool, timeouts |
| **Mock Mode** | emailWorker.ts | ✅ עובד – `EMAIL_MOCK_MODE` |
| **Winston Logger** | `server/src/utils/logger.ts` | ✅ עובד – DailyRotateFile, console, audit |
| **Graceful Shutdown** | `server/src/server.ts` | ✅ עובד – SIGTERM/SIGINT → stopWorkers → closeQueues |
| **Queue Stats API** | `server/src/server.ts` | ✅ עובד – `GET /api/admin/queues` |

### 1.2 סוגי מיילים קיימים (דרך Queue) ✅

| סוג מייל | EmailJobType | נשלח מאיפה |
|----------|-------------|------------|
| אישור הזמנה | `order_confirmation` | `orderService.ts` → `addEmailJob()` |
| הזמנה חדשה למנהל | `admin_new_order` | `orderService.ts` → `addEmailJob()` |
| עדכון משלוח | `order_shipped` | `orderService.ts` → `addEmailJob()` |
| כישלון תשלום | `payment_failed` | `paymentWorker.ts` → `addEmailJob()` |
| החזר כספי | `refund_processed` | emailWorker templates |
| חזרה למלאי | `stock_alert` | `stockAlertService.ts` → `addEmailJob()` |
| ברוכים הבאים | `welcome` | template קיים ב-emailWorker |
| איפוס סיסמה | `password_reset` | template קיים ב-emailWorker |

### 1.3 מיילים שנשלחים **ישירות** (Synchronous – הבעיה) ⚠️

| פונקציה | קובץ | נקרא מאיפה | בעיה |
|---------|------|-----------|------|
| `sendPasswordResetEmail()` | `emailService.ts` | `auth/security.ts` | שליחה synchronous מה-controller |
| `sendLoginOTPEmail()` | `emailService.ts` | `auth/authentication.ts` (2 מקומות) | שליחה synchronous מה-controller |
| `sendVerificationEmail()` | `emailService.ts` | לא בשימוש כרגע | פונקציה מיותרת |

---

## 2. מה צריך לעשות – 4 משימות

### משימה 1: איחוד מיילי Auth לתוך ה-Queue ⭐ קריטי

**הבעיה:** שלוש פונקציות ב-`emailService.ts` שולחות מייל ישירות מה-controller (synchronous). אם Resend וגם Gmail נפלו – הלקוח מקבל שגיאה ומאבד את הבקשה. אם השליחה איטית – ה-controller תקוע.

**הפתרון:** להעביר את כל שלושת סוגי המייל לעבוד דרך `addEmailJob()` – אותו מנגנון שכבר עובד להזמנות ומשלוחים.

#### שלב 1.1 – הוספת סוג `login_otp` ל-EmailJobType

**קובץ:** `server/src/queues/index.ts`

```typescript
// שורות 102-111 – הוספת login_otp ו-email_verification
export type EmailJobType =
  | 'order_confirmation'
  | 'order_shipped'
  | 'payment_failed'
  | 'refund_processed'
  | 'password_reset'
  | 'welcome'
  | 'stock_alert'
  | 'admin_new_order'
  | 'login_otp'              // ← חדש: קוד OTP להתחברות
  | 'email_verification';    // ← חדש: אימות חשבון
```

#### שלב 1.2 – הוספת תבניות ל-emailWorker.ts

**קובץ:** `server/src/queues/workers/emailWorker.ts`

בתוך `getEmailTemplate()`, להוסיף שני templates חדשים:

```typescript
// תבנית קוד OTP להתחברות
login_otp: {
  subject: '🔐 קוד אימות להתחברות',
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
      <p style="color: #dc3545;">אם לא ביקשת להתחבר, מישהו אחר מנסה לגשת לחשבון שלך.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">מייל זה נשלח אוטומטית. אנא אל תשיב למייל זה.</p>
    </div>
  `
},

// תבנית אימות חשבון
email_verification: {
  subject: '✉️ אימות חשבון',
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
      <p style="color: #666; font-size: 12px;">מייל זה נשלח אוטומטית.</p>
    </div>
  `
}
```

#### שלב 1.3 – שינוי controllers לשימוש ב-addEmailJob()

**קובץ:** `server/src/controllers/auth/authentication.ts`

**לפני:**
```typescript
import { sendLoginOTPEmail } from '../../services/emailService';
// ...
await sendLoginOTPEmail(user.email, otpCode);
```

**אחרי:**
```typescript
import { addEmailJob } from '../../queues';
// ...
await addEmailJob({
  type: 'login_otp',
  to: user.email,
  data: { otpCode }
});
```

> ⚠️ **הערה חשובה לגבי OTP:** קוד OTP תקף ל-10 דקות. ה-Queue מעבד מיילים כמעט מיידית (ms-level latency כשה-Worker רץ). עם concurrency=10 ו-rate limiter של 20/שנייה, אין סיכון של עיכוב משמעותי. **אם** Redis יפול – הלקוח יקבל שגיאה כבר בשלב הכנסת ה-job לתור (ניתן לתפוס את ה-error ולהודיע ללקוח לנסות שוב).

**קובץ:** `server/src/controllers/auth/security.ts`

**לפני:**
```typescript
import { sendPasswordResetEmail } from '../../services/emailService';
// ...
await sendPasswordResetEmail(user.email, resetToken);
```

**אחרי:**
```typescript
import { addEmailJob } from '../../queues';
// ...
await addEmailJob({
  type: 'password_reset',
  to: user.email,
  data: {
    resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`
  }
});
```

#### שלב 1.4 – מחיקת emailService.ts

לאחר המעבר, הקובץ `server/src/services/emailService.ts` מיותר לחלוטין. כל הלוגיקה (Resend + Gmail fallback + templates) כבר קיימת ב-emailWorker.ts. יש למחוק את הקובץ.

**שימו לב:** לפני המחיקה יש לוודא שאין עוד imports ממנו (כרגע רק 2: authentication.ts ו-security.ts).

---

### משימה 2: Resend Webhook – טיפול ב-Bounce ו-Complaint 🟠 גבוה

**למה צריך:** אם כתובת מייל לא קיימת (hard bounce) ומוסיפים להישלח אליה – Resend יוריד את ה-reputation ובסוף מיילים ינחתו ב-spam לכולם.

#### שלב 2.1 – Route חדש: webhooks

**קובץ חדש:** `server/src/routes/webhookRoutes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import User from '../models/User';
import StockAlert from '../models/StockAlert';

const router = Router();

/**
 * Resend Webhook – מקבל אירועי bounce ו-complaint
 * @route POST /api/webhooks/resend
 * @description
 * Resend שולח POST לכאן כשמתרחש:
 * - email.bounced – כתובת לא קיימת (hard bounce)
 * - email.complained – הנמען דיווח ספאם
 *
 * יש להגדיר את ה-URL הזה ב-Resend Dashboard → Webhooks
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    // אימות שה-webhook מגיע מ-Resend (לפי svix headers)
    // בעתיד: להוסיף אימות חתימה עם svix library
    // https://resend.com/docs/dashboard/webhooks/verify-webhooks

    const email = data?.to?.[0] || data?.email_address;
    if (!email) {
      return res.status(400).json({ error: 'חסרה כתובת מייל' });
    }

    switch (type) {
      case 'email.bounced': {
        // Hard bounce – כתובת לא קיימת → סמן שלא לשלוח אליה
        logger.warn('⚠️ Hard bounce מ-Resend', { email, bounceType: data.bounce?.bounce_type });

        // עדכון משתמש אם קיים
        await User.updateOne(
          { email },
          { $set: { emailBounced: true, emailBouncedAt: new Date() } }
        );

        // ביטול התראות מלאי לאימייל הזה
        await StockAlert.updateMany(
          { email, status: 'active' },
          { $set: { status: 'cancelled' } }
        );

        break;
      }

      case 'email.complained': {
        // דיווח ספאם → הסרה מיידית
        logger.warn('🚨 Spam complaint מ-Resend', { email });

        await User.updateOne(
          { email },
          { $set: { emailComplaint: true, emailComplaintAt: new Date() } }
        );

        await StockAlert.updateMany(
          { email, status: 'active' },
          { $set: { status: 'cancelled' } }
        );

        break;
      }

      default:
        // אירועים אחרים (email.sent, email.delivered, email.opened) – לוג בלבד
        logger.debug('Resend webhook event', { type, email });
    }

    res.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    logger.error('❌ שגיאה בעיבוד Resend webhook', { error: message });
    res.status(500).json({ error: 'שגיאה פנימית' });
  }
});

export default router;
```

#### שלב 2.2 – רישום ה-Route ב-server.ts

**קובץ:** `server/src/server.ts`

```typescript
import webhookRoutes from './routes/webhookRoutes';
// ...
// Webhooks - לפני maintenanceMiddleware כי הם צריכים לעבוד תמיד!
app.use('/api/webhooks', webhookRoutes);
```

> ⚠️ **חשוב:** ה-webhook route צריך להיות **לפני** ה-`maintenanceMiddleware` כדי שיעבוד גם במצב תחזוקה.

#### שלב 2.3 – הוספת שדות bounce למודל User

**קובץ:** `server/src/models/User.ts`

להוסיף לסכמת User:

```typescript
// שדות ניהול deliverability
emailBounced: { type: Boolean, default: false },
emailBouncedAt: { type: Date },
emailComplaint: { type: Boolean, default: false },
emailComplaintAt: { type: Date },
```

#### שלב 2.4 – בדיקת bounce לפני שליחה ב-emailWorker

**קובץ:** `server/src/queues/workers/emailWorker.ts`

בתוך `processEmailJob()`, לפני השליחה:

```typescript
import User from '../../models/User';

// בדיקת bounce – אם הכתובת מסומנת כ-bounced, לא שולחים
const bouncedUser = await User.findOne(
  { email: to, emailBounced: true },
  { _id: 1 }
).lean();

if (bouncedUser) {
  logger.warn('⛔ דילוג על מייל – כתובת מסומנת כ-bounced', { to, type });
  return { success: false, error: 'Email address bounced' };
}
```

#### שלב 2.5 – הגדרה ב-Resend Dashboard

1. כנס ל-Resend Dashboard → Webhooks
2. הוסף endpoint: `https://your-domain.com/api/webhooks/resend`
3. סמן אירועים: `email.bounced`, `email.complained`
4. (אופציונלי) סמן גם: `email.delivered`, `email.opened` – לסטטיסטיקות

---

### משימה 3: הגדרות DNS – SPF, DKIM, DMARC 🔴 קריטי

**למה קריטי:** בלי הגדרות DNS תקינות, מיילים ינחתו ב-Spam. Gmail ו-Yahoo דורשים את כל שלושת הרשומות.

> ⚠️ **זו משימת DNS, לא קוד.** מתבצעת ב-DNS Manager של הדומיין.

#### 3.1 SPF (Sender Policy Framework)

מוסיפים רשומה TXT לדומיין הראשי:

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com include:_spf.google.com ~all
```

- `include:_spf.resend.com` – מרשה ל-Resend לשלוח בשמך
- `include:_spf.google.com` – מרשה ל-Gmail SMTP (fallback) לשלוח בשמך

#### 3.2 DKIM (DomainKeys Identified Mail)

ב-Resend Dashboard → Domains → הוסף דומיין → קבל את רשומות ה-DKIM והוסף אותן ב-DNS:

```
Type: CNAME
Name: resend._domainkey
Value: (מ-Resend Dashboard)
```

#### 3.3 DMARC

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100
```

- `p=quarantine` – מיילים שנכשלים ב-SPF/DKIM יועברו ל-spam
- `rua` – כתובת לקבלת דוחות DMARC

#### 3.4 אימות ב-Resend Dashboard

1. הוסף דומיין ב-Resend Dashboard → Domains
2. המתן 24-48 שעות להפצת DNS
3. לחץ "Verify" ב-Resend Dashboard
4. בדוק עם [mail-tester.com](https://www.mail-tester.com/) – ציון 10/10

#### 3.5 עדכון SMTP_FROM ב-.env

לאחר אימות הדומיין ב-Resend, עדכן:

```env
SMTP_FROM=noreply@yourdomain.com
```

---

### משימה 4: ניוזלטר ורשימת תפוצה (אופציונלי) 🟡

> **משימה זו רלוונטית רק אם צריך מערכת ניוזלטרים.** אם לא צריך – דלגו.

#### 4.1 מודל Subscriber חדש

**קובץ חדש:** `server/src/models/Subscriber.ts`

```typescript
import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface ISubscriber {
  email: string;
  name?: string;
  token: string;              // טוקן ייחודי לניהול הרשמה
  active: boolean;            // מנוי פעיל
  unsubscribed: boolean;      // ביקש להסיר
  unsubscribedAt?: Date;
  hardBounced: boolean;       // כתובת לא קיימת
  spamComplaint: boolean;     // דיווח ספאם
  source: string;             // מאיפה נרשם (footer, popup, checkout)
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscriberDocument extends ISubscriber, Document {
  _id: mongoose.Types.ObjectId;
}

const SubscriberSchema = new Schema<ISubscriberDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, trim: true },
    token: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    active: { type: Boolean, default: true },
    unsubscribed: { type: Boolean, default: false },
    unsubscribedAt: { type: Date },
    hardBounced: { type: Boolean, default: false },
    spamComplaint: { type: Boolean, default: false },
    source: { type: String, default: 'website' },
  },
  { timestamps: true }
);

// אינדקסים לשליפה מהירה של מנויים פעילים
SubscriberSchema.index({ active: 1, unsubscribed: 1, hardBounced: 1 });

export default mongoose.model<ISubscriberDocument>('Subscriber', SubscriberSchema);
```

#### 4.2 Routes להרשמה/הסרה

**קובץ חדש:** `server/src/routes/subscriberRoutes.ts`

```typescript
import { Router, Request, Response } from 'express';
import Subscriber from '../models/Subscriber';
import { logger } from '../utils/logger';

const router = Router();

// הרשמה לניוזלטר
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { email, name, source } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'אימייל חובה' });
    }

    // בדיקה אם כבר רשום
    const existing = await Subscriber.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.unsubscribed) {
        // הרשמה מחדש
        existing.unsubscribed = false;
        existing.active = true;
        existing.unsubscribedAt = undefined;
        await existing.save();
        return res.json({ success: true, message: 'נרשמת מחדש בהצלחה' });
      }
      return res.json({ success: true, message: 'כבר רשום/ה' });
    }

    await Subscriber.create({ email: email.toLowerCase(), name, source: source || 'website' });
    res.status(201).json({ success: true, message: 'נרשמת בהצלחה!' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'שגיאה';
    logger.error('❌ שגיאה בהרשמה לניוזלטר', { error: message });
    res.status(500).json({ error: 'שגיאה בהרשמה' });
  }
});

// הסרה מניוזלטר (GET – דף אישור, POST – ביצוע)
router.get('/unsubscribe', async (req: Request, res: Response) => {
  const subscriber = await Subscriber.findOne({ token: req.query.token });
  if (!subscriber) return res.status(404).json({ error: 'טוקן לא תקין' });
  res.json({ email: subscriber.email, token: req.query.token });
});

router.post('/unsubscribe', async (req: Request, res: Response) => {
  const subscriber = await Subscriber.findOne({ token: req.body.token });
  if (!subscriber) return res.status(404).json({ error: 'טוקן לא תקין' });

  subscriber.unsubscribed = true;
  subscriber.unsubscribedAt = new Date();
  await subscriber.save();

  logger.info('📧 הסרה מניוזלטר', { email: subscriber.email });
  res.json({ success: true, message: 'הוסרת בהצלחה' });
});

export default router;
```

#### 4.3 סוג מייל newsletter ב-Queue

הוספה ל-`EmailJobType` ב-`queues/index.ts`:

```typescript
| 'newsletter'  // ← חדש: ניוזלטר
```

הוספת template ב-`emailWorker.ts` + headers:

```typescript
newsletter: {
  subject: data.subject as string || 'ניוזלטר שבועי',
  html: data.html as string || '',
  // Headers נוספים לניוזלטר (RFC 8058 - One-Click Unsubscribe)
  // יש להוסיף ל-sendEmail function:
  // headers: {
  //   'List-Unsubscribe': `<${process.env.FRONTEND_URL}/newsletter/unsubscribe?token=${data.token}>`,
  //   'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
  // }
}
```

> ⚠️ **החל מ-2024**, Gmail ו-Yahoo **דורשים** תמיכה ב-One-Click Unsubscribe (RFC 8058) לניוזלטרים. חוסר יגרום לדחיית מיילים.

#### 4.4 Cron Job לניוזלטר שבועי (אם צריך)

**קובץ חדש:** `server/src/scripts/weeklyNewsletter.ts`

```typescript
import cron from 'node-cron';
import Subscriber from '../models/Subscriber';
import { addEmailJob } from '../queues';
import { logger } from '../utils/logger';

// כל ראשון בשעה 9:00
cron.schedule('0 9 * * 1', async () => {
  try {
    const subscribers = await Subscriber.find({
      active: true,
      unsubscribed: false,
      hardBounced: false,
      spamComplaint: false,
    }).select('email name token').lean();

    // כל מנוי = job נפרד בתור (כל מייל מקבל retry עצמאי)
    for (const sub of subscribers) {
      await addEmailJob({
        type: 'newsletter' as any,
        to: sub.email,
        data: {
          name: sub.name,
          token: sub.token,
          subject: 'הניוזלטר השבועי שלנו',
          html: '...' // תוכן הניוזלטר – ניתן לקרוא מ-CMS או מ-DB
        }
      });
    }

    logger.info('📨 ניוזלטר שבועי נוסף לתור', { total: subscribers.length });
  } catch (error) {
    logger.error('❌ שגיאה בתזמון ניוזלטר', { error });
  }
});
```

---

## 3. מה **לא** צריך (הסברים)

| טכנולוגיה | למה לא צריך |
|-----------|-------------|
| **Postmark** | הפרויקט משתמש ב-Resend (ספק ראשי) + Gmail SMTP (fallback). שני ספקים מספיקים. Resend תומך גם ב-transactional וגם ב-marketing. |
| **React Email / @react-email** | הפרויקט משתמש ב-HTML templates ישירות – פשוט יותר, לא דורש build step, ולא מוסיף תלות. |
| **Pino Logger** | הפרויקט משתמש ב-Winston עם DailyRotateFile – כבר עובד מצוין. |
| **Bull Board** | Nice-to-have בלבד. יש כבר `GET /api/admin/queues` עם סטטיסטיקות. |
| **sendEmailBatch** | ה-Queue כבר שולח כל מייל כ-job נפרד – עדיף כי כל מייל מקבל retry עצמאי. |
| **Zod validation** | הפרויקט משתמש ב-Joi ו-express-validator. |

---

## 4. סדר ביצוע מומלץ

| # | משימה | קריטיות | אומדן | תלוי ב- |
|---|-------|---------|-------|---------|
| 1 | **איחוד emailService.ts לתוך Queue** | 🔴 קריטי | ~2 שעות | – |
| 2 | **הגדרות DNS: SPF, DKIM, DMARC** | 🔴 קריטי | ~30 דקות + 24-48 שעות המתנה | – |
| 3 | **Resend Webhook לbounce/complaint** | 🟠 גבוה | ~1.5 שעות | משימה 2 |
| 4 | **ניוזלטר (אופציונלי)** | 🟡 בינוני | ~1 יום | משימות 1, 2, 3 |

---

## 5. משתני סביבה – מצב נוכחי vs נדרש

### קיימים ✅ (ב-.env.example)

```env
RESEND_API_KEY=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@yourdomain.com
EMAIL_MOCK_MODE=false
STORE_NAME=...
FRONTEND_URL=...
CLIENT_URL=...
REDIS_URL=...
```

### להוסיף (רק אם מממשים ניוזלטר)

```env
# אין משתני סביבה חדשים נדרשים למשימות 1-3
# הכל כבר קיים!
```

---

## 6. מבנה קבצים – שינויים בלבד

```
server/src/
  ├── queues/
  │   ├── index.ts                     ← עדכון: הוספת login_otp, email_verification ל-EmailJobType
  │   └── workers/
  │       └── emailWorker.ts           ← עדכון: הוספת 2 templates + בדיקת bounce
  ├── routes/
  │   └── webhookRoutes.ts             ← חדש: Resend bounce/complaint webhook
  ├── controllers/auth/
  │   ├── authentication.ts            ← עדכון: שימוש ב-addEmailJob() במקום sendLoginOTPEmail()
  │   └── security.ts                  ← עדכון: שימוש ב-addEmailJob() במקום sendPasswordResetEmail()
  ├── models/
  │   └── User.ts                      ← עדכון: הוספת שדות emailBounced, emailComplaint
  ├── services/
  │   └── emailService.ts              ← למחוק (לאחר המעבר)
  └── server.ts                        ← עדכון: רישום webhookRoutes

  # אופציונלי (רק אם מממשים ניוזלטר):
  ├── models/
  │   └── Subscriber.ts                ← חדש
  ├── routes/
  │   └── subscriberRoutes.ts          ← חדש
  └── scripts/
      └── weeklyNewsletter.ts          ← חדש
```

---

## 7. Checklist – העלאה ל-Production

| # | משימה | קריטיות | סטטוס |
|---|-------|---------|-------|
| 1 | ✅ BullMQ Queue + Email Worker עובדים | 🔴 | **כבר קיים** |
| 2 | ✅ Resend כספק ראשי + Gmail fallback | 🔴 | **כבר קיים** |
| 3 | ✅ Graceful shutdown (Workers + Queues) | 🔴 | **כבר קיים** |
| 4 | ✅ Mock mode לפיתוח | 🟠 | **כבר קיים** |
| 5 | ✅ Winston logging לכל שליחה/שגיאה | 🟠 | **כבר קיים** |
| 6 | ✅ Unsubscribe ל-Stock Alerts | 🔴 | **כבר קיים** |
| 7 | ⬜ איחוד emailService.ts לתוך Queue | 🔴 | **לביצוע** |
| 8 | ⬜ DNS: SPF, DKIM, DMARC | 🔴 | **לביצוע** |
| 9 | ⬜ אימות Sender Domain ב-Resend Dashboard | 🔴 | **לביצוע** |
| 10 | ⬜ Resend Webhook לbounce/complaint | 🟠 | **לביצוע** |
| 11 | ⬜ בדיקת bounce לפני שליחה ב-Worker | 🟠 | **לביצוע** |
| 12 | ⬜ mail-tester.com: ציון 10/10 | 🟠 | **לביצוע** |
| 13 | ⬜ ניוזלטר + Subscriber (אופציונלי) | 🟡 | **אופציונלי** |

---

## 8. עלויות ריאליסטיות

הערכת עלויות לחנות עם ~2,000 הזמנות ו-~5,000 מיילים בחודש:

| שירות | כמות / חודש | עלות |
|-------|------------|------|
| Resend | ~5,000–8,000 מיילים | 3,000 חינם / חודש, אח"כ $20/חודש |
| Redis (Railway / Upstash) | Queue + Workers | $5–$10 / חודש |
| Gmail SMTP (fallback) | רק בכישלון Resend | חינם |
| **סה"כ** | | **$5–$30 / חודש** |

---

*מעודכן לפרויקט הקיים | TypeScript + Express + BullMQ + Redis + Resend + Gmail SMTP | 2026*
