# 🚀 מדריך העלאה ל-Railway - E-commerce Project

## 📋 תוכן עניינים
1. [דרישות מוקדמות](#דרישות-מוקדמות)
2. [הכנת הפרויקט](#הכנת-הפרויקט)
3. [העלאה ל-GitHub](#העלאה-ל-github)
4. [הקמת Railway Project](#הקמת-railway-project)
5. [הגדרת Services](#הגדרת-services)
6. [Environment Variables](#environment-variables)
7. [Testing & Launch](#testing--launch)

---

## 🎯 דרישות מוקדמות

### חשבונות נדרשים:
- ✅ חשבון GitHub (חינמי)
- ✅ חשבון Railway (חינמי עד $5/חודש)
- ✅ חשבון Cloudinary (חינמי)
- ✅ חשבון SMTP (Gmail או SendGrid)

### כלים מקומיים:
```bash
# בדוק שיש לך:
node --version  # צריך v18 או גבוה יותר
git --version   # כל גרסה
```

---

## 📦 הכנת הפרויקט

### 1. יצירת קבצי סביבה (אם עדיין לא קיימים)

**Server** (`server/.env`):
```bash
# העתק את server/.env.example ל-server/.env
# ומלא את הערכים האמיתיים שלך
cp server/.env.example server/.env
```

**Client** (`client/.env`):
```bash
# העתק את client/.env.example ל-client/.env
cp client/.env.example client/.env
```

### 2. וידוא שהכל עובד מקומית

```bash
# טרמינל 1 - Server
cd server
npm install
npm run dev

# טרמינל 2 - Client  
cd client
npm install
npm run dev
```

בדוק שהאתר עובד ב-`http://localhost:5173`

---

## 🌐 העלאה ל-GitHub

### 1. אתחול Git Repository

```bash
# מתיקיית ה-root של הפרויקט
git init
git add .
git commit -m "Initial commit - E-commerce project ready for Railway"
```

### 2. יצירת Repository ב-GitHub

1. לך ל-[GitHub.com](https://github.com/new)
2. צור repository חדש בשם `ecommerce-project`
3. **אל תסמן** "Initialize with README" (יש לנו כבר)
4. העתק את ה-URL של ה-repository

### 3. חיבור ל-GitHub והעלאה

```bash
# החלף USERNAME בשם המשתמש שלך ב-GitHub
git remote add origin https://github.com/USERNAME/ecommerce-project.git
git branch -M main
git push -u origin main
```

---

## 🚂 הקמת Railway Project

### 1. יצירת Project

1. לך ל-[Railway.app](https://railway.app)
2. לחץ **"New Project"**
3. בחר **"Deploy from GitHub repo"**
4. חבר את ה-repository שיצרת
5. שם ל-project: `ecommerce-production`

### 2. הוספת Services הנדרשים

Railway יזהה אוטומטית את הקוד, אבל צריך להוסיף:

#### א. MongoDB
1. לחץ **"+ New"** → **"Database"** → **"Add MongoDB"**
2. שם השירות: `MongoDB`
3. Railway יגדיר אוטומטית את `MONGO_URL`

#### ב. Redis
1. לחץ **"+ New"** → **"Database"** → **"Add Redis"**
2. שם השירות: `Redis`
3. Railway יגדיר אוטומטית את `REDIS_URL`

---

## ⚙️ הגדרת Services

### 1. Backend Service

#### הגדרות בסיסיות:
- **שם**: `server`
- **Root Directory**: `server`
- **Build Command**: אוטומטי (Nixpacks)
- **Start Command**: `npm run start`

#### Environment Variables:
```bash
# MongoDB
MONGO_URI=${{MongoDB.MONGO_URL}}

# Redis  
REDIS_URL=${{Redis.REDIS_URL}}

# JWT
JWT_SECRET=<הזן-מפתח-חזק-אקראי-64-תווים>

# Node
NODE_ENV=production
PORT=5000

# URLs - לא למלא עדיין, נשלים אחרי deployment
CLIENT_URL=
FRONTEND_URL=

# Cloudinary - הכנס את הערכים מחשבון Cloudinary שלך
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_WEBHOOK_SECRET=your-webhook-secret

# Email - הכנס את פרטי SMTP שלך
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
EMAIL_MOCK_MODE=false

# Payment
PAYMENT_MOCK_MODE=true

# Store
STORE_NAME=החנות שלי
SUPPORT_EMAIL=support@yourdomain.com
```

### 2. Frontend Service

#### הגדרות בסיסיות:
- **שם**: `client`
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

#### Environment Variables:
```bash
# API URL - נשלים אחרי ש-backend יקבל domain
VITE_API_URL=

# Debug (כבה ב-production)
VITE_ENABLE_PRODUCT_DEBUG=false
VITE_ENABLE_PERF_LOGGING=false
```

---

## 🔗 השלמת Reference Variables

### 1. קבלת URLs של Services

אחרי ש-Railway יעלה את ה-services, כל אחד יקבל domain:
- Backend: `https://server-production-xxxx.up.railway.app`
- Frontend: `https://client-production-yyyy.up.railway.app`

### 2. עדכון Variables - Backend

חזור ל-**server** service ועדכן:
```bash
CLIENT_URL=https://client-production-yyyy.up.railway.app
FRONTEND_URL=https://client-production-yyyy.up.railway.app
```

או השתמש ב-Reference Variables (מומלץ):
```bash
CLIENT_URL=https://${{client.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://${{client.RAILWAY_PUBLIC_DOMAIN}}
```

### 3. עדכון Variables - Frontend

חזור ל-**client** service ועדכן:
```bash
VITE_API_URL=https://server-production-xxxx.up.railway.app
```

או Reference Variable:
```bash
VITE_API_URL=https://${{server.RAILWAY_PUBLIC_DOMAIN}}
```

### 4. Redeploy

אחרי עדכון המשתנים:
1. לחץ על **server** → **Deployments** → **Redeploy**
2. לחץ על **client** → **Deployments** → **Redeploy**

---

## 🧪 Testing & Launch

### 1. בדיקת Health Checks

```bash
# בדוק שה-backend עולה:
curl https://server-production-xxxx.up.railway.app/health

# צריך להחזיר:
{
  "status": "healthy",
  "timestamp": "...",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 2. בדיקת Frontend

1. פתח את `https://client-production-yyyy.up.railway.app`
2. בדוק שהדף נטען
3. נסה להתחבר / להירשם
4. בדוק שמוצרים נטענים

### 3. Logs Monitoring

ב-Railway Dashboard:
1. לחץ על **server** → **Logs**
2. חפש שגיאות
3. וודא ש-MongoDB ו-Redis מתחברים בהצלחה

---

## 🎊 סיימת!

האתר שלך עכשיו באוויר! 🚀

### צעדים נוספים (אופציונלי):

#### 1. Custom Domain
1. ב-Railway: **Settings** → **Domains**
2. הוסף את ה-domain שלך
3. עדכן DNS records

#### 2. Environment Separation
צור עוד environment ל-Staging:
1. **New Project** → `ecommerce-staging`
2. חזור על התהליך עם ערכים שונים

#### 3. Monitoring & Alerts
1. הגדר webhooks ל-Slack/Discord
2. הוסף uptime monitoring (UptimeRobot)
3. הגדר alerts על CPU/Memory

---

## 🆘 פתרון בעיות נפוצות

### Backend לא עולה

```bash
# בדוק logs ב-Railway
# בעיות נפוצות:
- MONGO_URI לא מוגדר נכון
- JWT_SECRET חסר
- Cloudinary credentials שגויים
```

### Frontend לא מתחבר ל-Backend

```bash
# בדוק:
1. VITE_API_URL מוגדר נכון?
2. CORS מוגדר ב-server עם ה-domain של הclient?
3. הייתה redeploy אחרי שינוי משתנים?
```

### "Cannot connect to MongoDB"

```bash
# וודא:
1. MongoDB service רץ
2. MONGO_URI = ${{MongoDB.MONGO_URL}}
3. Private networking מופעל
```

---

## 📞 תמיכה

- 📧 Railway Docs: https://docs.railway.app
- 💬 Railway Discord: https://discord.gg/railway
- 🐛 GitHub Issues: פתח issue בrepository

---

**נבנה בגאווה עם ❤️**
