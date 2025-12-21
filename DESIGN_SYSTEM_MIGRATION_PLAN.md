# 🎨 תכנית מעבר למערכת עיצוב משותפת (Design System)

---

## 🎯 מטרה

יצירת מערכת עיצוב אחידה (Design System) שתשמש את כל האתר - אזור ניהול ואזור לקוחות.

### מה נרוויח?
- **שליטה מרכזית**: שינוי צבע/פונט/אייקון במקום אחד ← משפיע על כל האתר
- **עקביות מלאה**: כל הדפים נראים ומרגישים אותו דבר
- **תחזוקה קלה**: קוד נקי, ברור וקל להבנה
- **פיתוח מהיר יותר**: מפתחים חדשים מבינים מהר יותר את המבנה

### ⚠️ הערות חשובות
- **ביצועים**: יש לבצע `npm run build` אחרי שלבים 2, 5 ו-8 ולבדוק גודל bundle
- **סדר יישום**: מומלץ לבצע שלב אחר שלב ולא לשנות הכל בבת אחת
- **גיבויים**: עשה commit לפני כל שלב משמעותי

---

## 📋 שלב 1: הקמת תשתית Design Tokens

### 1.1 יצירת תיקיית styles
```bash
mkdir -p client/src/styles
```

### 1.2 יצירת קובץ design-tokens.css

**צור קובץ חדש:** `client/src/styles/design-tokens.css`

```css
/* ========================================
   Design Tokens - מערכת עיצוב משותפת
   ======================================== */

:root {
  /* ==================== Typography ==================== */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  /* Font Sizes */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* ==================== Colors - Neutral ==================== */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  --color-bg-elevated: #ffffff;
  --color-bg-hover: #f3f4f6;
  
  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-text-tertiary: #9ca3af;
  --color-text-muted: #d1d5db;

  /* ==================== Colors - Brand ==================== */
  --color-brand-blue: #3b82f6;
  --color-brand-cyan: #06b6d4;
  --color-brand-emerald: #10b981;
  --color-brand-orange: #f59e0b;
  --color-brand-red: #ef4444;
  --color-brand-purple: #8b5cf6;
  --color-brand-pink: #ec4899;

  /* ==================== Borders ==================== */
  --border-light: #e5e7eb;
  --border-medium: #d1d5db;
  --border-dark: #9ca3af;

  /* ==================== Shadows ==================== */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);

  /* ==================== Spacing ==================== */
  --spacing-xs: 0.25rem;    /* 4px */
  --spacing-sm: 0.5rem;     /* 8px */
  --spacing-md: 1rem;       /* 16px */
  --spacing-lg: 1.5rem;     /* 24px */
  --spacing-xl: 2rem;       /* 32px */
  --spacing-2xl: 3rem;      /* 48px */
  --spacing-3xl: 4rem;      /* 64px */

  /* ==================== Border Radius ==================== */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* ==================== Transitions ==================== */
  --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1);

  /* ==================== Z-Index Scale ==================== */
  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-fixed: 1200;
  --z-modal-backdrop: 1300;
  --z-modal: 1400;
  --z-popover: 1500;
  --z-tooltip: 1600;
}

/* ========================================
   Animations
   ======================================== */

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ========================================
   Utility Classes
   ======================================== */

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}

.animate-slideInRight {
  animation: slideInRight 0.5s ease-out;
}

.animate-pulse {
  animation: pulse 2s infinite;
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

### 1.3 עדכון admin-variables.css לשימוש ב-tokens

**ערוך:** `client/src/pages/Admin/styles/admin-variables.css`

החלף את כל התוכן ב:

```css
/* ========================================
   Admin Variables - Aliases to Design Tokens
   קובץ זה מספק תאימות לאחור לקוד קיים
   ======================================== */

:root {
  /* Typography Aliases */
  --admin-font-family: var(--font-family);
  --admin-text-xs: var(--text-xs);
  --admin-text-sm: var(--text-sm);
  --admin-text-base: var(--text-base);
  --admin-text-lg: var(--text-lg);
  --admin-text-xl: var(--text-xl);
  --admin-text-2xl: var(--text-2xl);
  --admin-text-3xl: var(--text-3xl);
  
  --admin-font-normal: var(--font-normal);
  --admin-font-medium: var(--font-medium);
  --admin-font-semibold: var(--font-semibold);
  --admin-font-bold: var(--font-bold);

  /* Color Aliases */
  --admin-bg-primary: var(--color-bg-primary);
  --admin-bg-secondary: var(--color-bg-secondary);
  --admin-bg-tertiary: var(--color-bg-tertiary);
  --admin-bg-elevated: var(--color-bg-elevated);
  --admin-bg-hover: var(--color-bg-hover);
  
  --admin-text-primary: var(--color-text-primary);
  --admin-text-secondary: var(--color-text-secondary);
  --admin-text-tertiary: var(--color-text-tertiary);
  --admin-text-muted: var(--color-text-muted);
  
  --admin-accent-blue: var(--color-brand-blue);
  --admin-accent-cyan: var(--color-brand-cyan);
  --admin-accent-emerald: var(--color-brand-emerald);
  --admin-accent-orange: var(--color-brand-orange);
  --admin-accent-red: var(--color-brand-red);
  --admin-accent-purple: var(--color-brand-purple);
  --admin-accent-pink: var(--color-brand-pink);
  
  /* Border Aliases */
  --admin-border-light: var(--border-light);
  --admin-border-medium: var(--border-medium);
  --admin-border-dark: var(--border-dark);
  
  /* Shadow Aliases */
  --admin-shadow-xs: var(--shadow-xs);
  --admin-shadow-sm: var(--shadow-sm);
  --admin-shadow-md: var(--shadow-md);
  --admin-shadow-lg: var(--shadow-lg);
  --admin-shadow-xl: var(--shadow-xl);
  
  /* Spacing Aliases */
  --admin-spacing-xs: var(--spacing-xs);
  --admin-spacing-sm: var(--spacing-sm);
  --admin-spacing-md: var(--spacing-md);
  --admin-spacing-lg: var(--spacing-lg);
  --admin-spacing-xl: var(--spacing-xl);
  --admin-spacing-2xl: var(--spacing-2xl);
  
  /* Radius Aliases */
  --admin-radius-sm: var(--radius-sm);
  --admin-radius-md: var(--radius-md);
  --admin-radius-lg: var(--radius-lg);
  --admin-radius-xl: var(--radius-xl);
  
  /* Transition Aliases */
  --admin-transition-fast: var(--transition-fast);
  --admin-transition-normal: var(--transition-normal);
  --admin-transition-slow: var(--transition-slow);
  
  /* Admin Specific */
  --admin-nav-width: 260px;
  --admin-header-height: 70px;
  --admin-topbar-height: 60px;
  
  /* Glass Effects */
  --admin-bg-glass: rgba(255, 255, 255, 0.85);
  --admin-glass-border: rgba(0, 0, 0, 0.08);
  --admin-glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  --admin-blur-bg: blur(12px);
  --admin-blur-subtle: blur(8px);
}

/* Global Utility Classes */
.titleIconSquare {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-cyan));
  color: #ffffff;
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.titleWithBadge {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.devBadge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  background: rgba(59,130,246,0.07);
  color: var(--color-brand-blue);
  border: 1px solid rgba(59,130,246,0.12);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}
```

### 1.4 ייבוא גלובלי של design-tokens

**ערוך:** `client/src/main.tsx`

הוסף את הייבוא בראש הקובץ (לפני כל ייבוא CSS אחר):

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { store } from './store';

// ייבוא גלובלי של Design Tokens - חייב להיות ראשון!
import './styles/design-tokens.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
```

### 1.5 בדיקה

```bash
npm run dev
```

וודא שהאתר עולה בלי שגיאות.

---

## 🎨 שלב 2: יצירת UI Components Library

### 2.1 יצירת Icon Component

#### 2.1.1 צור תיקייה
```bash
mkdir -p client/src/components/ui/Icon
```

#### 2.1.2 צור קובץ Icon.tsx

**צור:** `client/src/components/ui/Icon/Icon.tsx`

```tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * רשימת האייקונים הנתמכים
 * הוספת אייקון חדש: רק הוסף את שמו כאן (לא צריך לייבא!)
 * 
 * יתרון: Vite/Rollup יבצעו tree-shaking אוטומטי - רק אייקונים בשימוש יכנסו ל-bundle
 */
export type IconName =
  // Navigation
  | 'LayoutDashboard' | 'ShoppingCart' | 'Package' | 'Users'
  | 'UsersRound' | 'Shield' | 'BarChart3' | 'Settings' | 'Store'
  // Actions
  | 'Search' | 'Bell' | 'HelpCircle' | 'Check' | 'CheckCircle2'
  | 'Clock' | 'Plus' | 'Edit' | 'Trash2' | 'Download' | 'Upload' | 'Filter'
  // Status
  | 'AlertCircle' | 'AlertTriangle' | 'CheckCheck' | 'XCircle'
  // Business
  | 'DollarSign' | 'TrendingUp' | 'TrendingDown' | 'CreditCard' | 'Receipt'
  // UI Elements
  | 'ChevronDown' | 'ChevronUp' | 'ChevronLeft' | 'ChevronRight' | 'X' | 'Menu'
  // Content
  | 'Image' | 'File' | 'Folder' | 'FolderTree' | 'Calendar' | 'Mail' | 'MessageCircle'
  // Tech
  | 'Database' | 'Key' | 'Palette' | 'Truck' | 'Archive' | 'Target' | 'Flame' | 'Gem' | 'Construction'
  // Charts
  | 'PieChart' | 'LineChart' | 'User';

/**
 * Props של רכיב האייקון
 */
interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  onClick?: () => void;
}

/**
 * Icon Component - מעטפת אחידה לכל האייקונים באתר
 * 
 * דוגמאות שימוש:
 * <Icon name="ShoppingCart" size={20} />
 * <Icon name="Users" size={24} strokeWidth={2} />
 * <Icon name="Settings" className="text-blue-500" />
 * 
 * ביצועים: משתמש ב-dynamic import מ-lucide-react - tree-shaking אוטומטי
 */
export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 20, 
  className = '', 
  strokeWidth = 2,
  onClick
}) => {
  // @ts-ignore - dynamic access to lucide-react icons
  const IconComponent = LucideIcons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }
  
  return (
    <IconComponent 
      size={size} 
      strokeWidth={strokeWidth}
      className={className}
      onClick={onClick}
      style={{ stroke: 'currentColor', display: 'block' }}
    />
  );
};
```

#### 2.1.3 צור index.ts

**צור:** `client/src/components/ui/Icon/index.ts`

```tsx
export { Icon } from './Icon';
export type { IconName } from './Icon';
```

---

### 2.2 יצירת TitleWithIcon Component

#### 2.2.1 צור תיקייה
```bash
mkdir -p client/src/components/ui/Title
```

#### 2.2.2 צור קובץ TitleWithIcon.tsx

**צור:** `client/src/components/ui/Title/TitleWithIcon.tsx`

```tsx
import React from 'react';
import { Icon, IconName } from '../Icon';
import styles from './TitleWithIcon.module.css';

interface TitleWithIconProps {
  /** טקסט הכותרת */
  title: string;
  /** תת-כותרת אופציונלית */
  subtitle?: string;
  /** שם האייקון מתוך lucide-react */
  icon: IconName;
  /** האם להציג תג "בפיתוח" */
  isDev?: boolean;
}

/**
 * TitleWithIcon - כותרת אחידה עם אייקון בריבוע ותג אופציונלי
 * 
 * משמש בכל דפי הניהול ודפי תוכן כדי לשמור על עיצוב אחיד
 * 
 * דוגמאות שימוש:
 * <TitleWithIcon title="ניהול הזמנות" icon="ShoppingCart" />
 * <TitleWithIcon title="דוחות" icon="BarChart3" subtitle="ניתוח מכירות" />
 * <TitleWithIcon title="מוצרים" icon="Package" isDev={true} />
 */
export const TitleWithIcon: React.FC<TitleWithIconProps> = ({
  title,
  subtitle,
  icon,
  isDev = false,
}) => {
  return (
    <div className={styles.header}>
      <div className={styles.titleWrapper}>
        {/* ריבוע האייקון */}
        <div className={styles.iconSquare}>
          <Icon name={icon} size={24} strokeWidth={2} />
        </div>
        
        {/* תוכן הכותרת */}
        <div className={styles.content}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{title}</h1>
            {isDev && <span className={styles.devBadge}>בפיתוח</span>}
          </div>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};
```

#### 2.2.3 צור קובץ CSS

**צור:** `client/src/components/ui/Title/TitleWithIcon.module.css`

```css
.header {
  margin-bottom: var(--spacing-2xl);
}

.titleWrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.iconSquare {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--color-brand-blue), var(--color-brand-cyan));
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: var(--shadow-lg);
  flex-shrink: 0;
}

.content {
  flex: 1;
}

.titleRow {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.subtitle {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin: var(--spacing-xs) 0 0 0;
}

.devBadge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .titleWrapper {
    gap: var(--spacing-md);
  }

  .iconSquare {
    width: 48px;
    height: 48px;
  }

  .title {
    font-size: var(--text-xl);
  }

  .subtitle {
    font-size: var(--text-sm);
  }
}
```

#### 2.2.4 צור index.ts

**צור:** `client/src/components/ui/Title/index.ts`

```tsx
export { TitleWithIcon } from './TitleWithIcon';
```

---

### 2.3 יצירת PlaceholderPage Component

#### 2.3.1 צור תיקייה
```bash
mkdir -p client/src/components/ui/Placeholder
```

#### 2.3.2 צור קובץ PlaceholderPage.tsx

**צור:** `client/src/components/ui/Placeholder/PlaceholderPage.tsx`

```tsx
import React from 'react';
import { Icon, IconName } from '../Icon';
import styles from './PlaceholderPage.module.css';

interface Feature {
  text: string;
  icon?: IconName;
}

interface PlaceholderPageProps {
  /** אייקון מרכזי */
  icon: IconName;
  /** כותרת הדף */
  title: string;
  /** תיאור קצר */
  description: string;
  /** רשימת תכונות עתידיות */
  features: Feature[];
  /** טקסט מותאם אישית לתג "בקרוב" */
  comingSoonText?: string;
}

/**
 * PlaceholderPage - דף placeholder אחיד לדפים בפיתוח
 * 
 * משמש להצגת דפים שעדיין לא מוכנים באופן אחיד ומקצועי
 * 
 * דוגמת שימוש:
 * <PlaceholderPage
 *   icon="Package"
 *   title="דף הזמנות בפיתוח"
 *   description="כאן יוצג מערכת ניהול הזמנות מתקדמת"
 *   features={[
 *     { icon: 'Check', text: 'טבלת הזמנות עם סינון' },
 *     { icon: 'Check', text: 'מעקב סטטוס בזמן אמת' }
 *   ]}
 * />
 */
export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  icon,
  title,
  description,
  features,
  comingSoonText = 'בקרוב יהיה זמין'
}) => {
  return (
    <div className={styles.container}>
      {/* אייקון מרכזי */}
      <div className={styles.iconWrapper}>
        <Icon name={icon} size={64} strokeWidth={1.5} />
      </div>
      
      {/* כותרת */}
      <h2 className={styles.title}>{title}</h2>
      
      {/* תיאור */}
      <p className={styles.description}>{description}</p>
      
      {/* תג "בקרוב" */}
      <div className={styles.comingSoon}>
        <Icon name="Clock" size={16} />
        <span>{comingSoonText}</span>
      </div>
      
      {/* תיבת תכונות */}
      <div className={styles.featuresBox}>
        <h3 className={styles.featuresTitle}>מה יכלול הדף:</h3>
        <ul className={styles.featureList}>
          {features.map((feature, index) => (
            <li key={index} className={styles.featureItem}>
              {feature.icon && <Icon name={feature.icon} size={16} />}
              <span>{feature.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
```

#### 2.3.3 צור קובץ CSS

**צור:** `client/src/components/ui/Placeholder/PlaceholderPage.module.css`

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  text-align: center;
  min-height: 400px;
  animation: fadeIn 0.5s ease-out;
}

.iconWrapper {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1));
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-brand-blue);
  margin-bottom: var(--spacing-xl);
}

.title {
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-md) 0;
}

.description {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-xl) 0;
  max-width: 600px;
  line-height: 1.6;
}

.comingSoon {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: rgba(59, 130, 246, 0.1);
  color: var(--color-brand-blue);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-xl);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.featuresBox {
  background: var(--color-bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  max-width: 600px;
  width: 100%;
  text-align: right;
  box-shadow: var(--shadow-sm);
}

.featuresTitle {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-md) 0;
}

.featureList {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.featureItem {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  padding: var(--spacing-xs) 0;
}

@media (max-width: 768px) {
  .container {
    padding: var(--spacing-xl);
  }

  .iconWrapper {
    width: 96px;
    height: 96px;
  }

  .title {
    font-size: var(--text-2xl);
  }

  .description {
    font-size: var(--text-base);
  }

  .featuresBox {
    padding: var(--spacing-lg);
  }
}
```

#### 2.3.4 צור index.ts

**צור:** `client/src/components/ui/Placeholder/index.ts`

```tsx
export { PlaceholderPage } from './PlaceholderPage';
```

### ✅ נקודת ביקורת - סיום שלב 2

לפני שממשיכים, בדוק:

```bash
npm run build
```

וודא:
- ✅ Build עובר בלי שגיאות
- ✅ לא יותר מ-10% הגדלה בגודל bundle (בדוק ב-dist/)
- ✅ האייקונים נטענים נכון (פתח דף כלשהו ובדוק ב-DevTools)

אם הכל תקין ← המשך לשלב 3.

---

### 2.4 יצירת index.ts מרכזי

**צור:** `client/src/components/ui/index.ts`

```tsx
// Icons
export { Icon } from './Icon';
export type { IconName } from './Icon';

// Typography
export { TitleWithIcon } from './Title';

// Placeholder
export { PlaceholderPage } from './Placeholder';
```

---

## 🔄 שלב 3: Migration של NavigationPanel

### 3.1 עדכון NavigationPanel.tsx

**ערוך:** `client/src/pages/Admin/components/NavigationPanel/NavigationPanel.tsx`

החלף את כל התוכן ב:

```tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon, IconName } from '../../../../components/ui';
import styles from './NavigationPanel.module.css';

interface NavLinkItem {
  path: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

/**
 * רשימת קישורי הניווט בפאנל
 */
const navigationLinks: NavLinkItem[] = [
  { path: '/admin', label: 'דשבורד', icon: 'LayoutDashboard', end: true },
  { path: '/admin/orders', label: 'הזמנות', icon: 'ShoppingCart' },
  { path: '/admin/products', label: 'מוצרים', icon: 'Package' },
  { path: '/admin/customers', label: 'לקוחות', icon: 'Users' },
  { path: '/admin/customer-groups', label: 'קבוצות לקוח', icon: 'UsersRound' },
  { path: '/admin/user-management', label: 'ניהול משתמשים', icon: 'Shield' },
  { path: '/admin/reports', label: 'דוחות', icon: 'BarChart3' },
  { path: '/admin/settings', label: 'הגדרות', icon: 'Settings' },
];

/**
 * NavigationPanel - פאנל ניווט צדדי ימני לאזור הניהול
 */
const NavigationPanel: React.FC = () => {
  return (
    <aside className={styles.navigationPanel}>
      {/* כותרת + לוגו */}
      <div className={styles.header}>
        <div className={styles.logoIcon}>
          <Icon name="Store" size={28} strokeWidth={2} />
        </div>
        <h1 className={styles.title}>לוח ניהול</h1>
      </div>

      {/* רשימת קישורי ניווט */}
      <nav className={styles.navigation}>
        <ul className={styles.navList}>
          {navigationLinks.map((link) => (
            <li key={link.path} className={styles.navItem}>
              <NavLink
                to={link.path}
                end={link.end}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.icon}>
                  <Icon name={link.icon} size={20} strokeWidth={2} />
                </span>
                <span className={styles.label}>{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* פוטר */}
      <div className={styles.footer}>
        <div className={styles.version}>גרסה 1.0.0</div>
      </div>
    </aside>
  );
};

export default NavigationPanel;
```

### 3.2 בדיקה

```bash
npm run dev
```

בדוק שהניווט עובד תקין ושכל האייקונים נראים.

---

## 🔄 שלב 4: Migration של דפי Placeholder

### 4.1 עדכון OrdersPage

**ערוך:** `client/src/pages/Admin/Orders/OrdersPage.tsx`

```tsx
import React from 'react';
import { TitleWithIcon, PlaceholderPage } from '../../../components/ui';
import styles from './OrdersPage.module.css';

const OrdersPage: React.FC = () => {
  return (
    <div className={styles.ordersPage}>
      <TitleWithIcon 
        title="ניהול הזמנות" 
        icon="ShoppingCart"
        subtitle="ניהול כל ההזמנות במערכת"
        isDev={true}
      />
      
      <PlaceholderPage
        icon="Package"
        title="דף הזמנות בפיתוח"
        description="כאן יוצג מערכת ניהול הזמנות מתקדמת עם כל הכלים הנדרשים"
        features={[
          { icon: 'Check', text: 'טבלת הזמנות עם סינון וחיפוש מתקדם' },
          { icon: 'Check', text: 'מעקב סטטוס הזמנה בזמן אמת' },
          { icon: 'Check', text: 'פרטי הזמנה מלאים ותקשורת עם לקוח' },
          { icon: 'Check', text: 'ניהול מלאי ותשלומים' },
          { icon: 'Check', text: 'הדפסת תעודות משלוח וחשבוניות' },
          { icon: 'Check', text: 'יצוא נתונים ל-Excel/PDF' },
        ]}
      />
    </div>
  );
};

export default OrdersPage;
```

**פשט את ה-CSS:** `client/src/pages/Admin/Orders/OrdersPage.module.css`

```css
.ordersPage {
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.5s ease-out;
}
```

### 4.2 עדכון ProductsManagementPage

**ערוך:** `client/src/pages/Admin/Products/ProductsManagementPage.tsx`

```tsx
import React from 'react';
import { TitleWithIcon, PlaceholderPage } from '../../../components/ui';
import styles from './ProductsManagementPage.module.css';

const ProductsManagementPage: React.FC = () => {
  return (
    <div className={styles.productsPage}>
      <TitleWithIcon 
        title="ניהול מוצרים" 
        icon="Package"
        subtitle="ניהול קטלוג המוצרים והמלאי"
        isDev={true}
      />
      
      <PlaceholderPage
        icon="Construction"
        title="דף מוצרים בפיתוח"
        description="כאן יוצג מערכת ניהול מוצרים מתקדמת"
        features={[
          { icon: 'Check', text: 'רשימת מוצרים עם תמונות ופילטרים' },
          { icon: 'Check', text: 'הוספה ועריכה של מוצרים' },
          { icon: 'Check', text: 'ניהול מלאי בזמן אמת' },
          { icon: 'Check', text: 'קטגוריות ותגיות' },
          { icon: 'Check', text: 'העלאת תמונות מרובות' },
          { icon: 'Check', text: 'ניהול מחירים ומבצעים' },
          { icon: 'Check', text: 'ייבוא ויצוא מוצרים' },
        ]}
      />
    </div>
  );
};

export default ProductsManagementPage;
```

**פשט את ה-CSS:** `client/src/pages/Admin/Products/ProductsManagementPage.module.css`

```css
.productsPage {
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.5s ease-out;
}
```

### 4.3 עדכון CustomersPage

**ערוך:** `client/src/pages/Admin/Customers/CustomersPage.tsx`

```tsx
import React from 'react';
import { TitleWithIcon, PlaceholderPage } from '../../../components/ui';
import styles from './CustomersPage.module.css';

const CustomersPage: React.FC = () => {
  return (
    <div className={styles.customersPage}>
      <TitleWithIcon 
        title="ניהול לקוחות" 
        icon="Users"
        subtitle="ניהול כל פרטי הלקוחות והתקשורת"
        isDev={true}
      />
      
      <PlaceholderPage
        icon="Users"
        title="דף לקוחות בפיתוח"
        description="כאן יוצג מערכת ניהול לקוחות מתקדמת"
        features={[
          { icon: 'Check', text: 'רשימת לקוחות עם פרטי קשר מלאים' },
          { icon: 'Check', text: 'היסטוריית רכישות ופעילות' },
          { icon: 'Check', text: 'פרופיל לקוח מפורט' },
          { icon: 'Check', text: 'סטטיסטיקות ואנליטיקה' },
          { icon: 'Check', text: 'שיוך לקבוצות לקוח' },
          { icon: 'Check', text: 'ניהול הרשאות' },
          { icon: 'Check', text: 'תקשורת ישירה עם לקוחות' },
        ]}
      />
    </div>
  );
};

export default CustomersPage;
```

**פשט את ה-CSS:** `client/src/pages/Admin/Customers/CustomersPage.module.css`

```css
.customersPage {
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.5s ease-out;
}
```

### 4.4 עדכון ReportsPage

**ערוך:** `client/src/pages/Admin/Reports/ReportsPage.tsx`

```tsx
import React from 'react';
import { TitleWithIcon, PlaceholderPage } from '../../../components/ui';
import styles from './ReportsPage.module.css';

const ReportsPage: React.FC = () => {
  return (
    <div className={styles.reportsPage}>
      <TitleWithIcon 
        title="דוחות ואנליטיקה" 
        icon="BarChart3"
        subtitle="ניתוח נתונים ודוחות עסקיים"
        isDev={true}
      />
      
      <PlaceholderPage
        icon="Construction"
        title="דף דוחות בפיתוח"
        description="כאן יוצג מערכת דוחות ואנליטיקה מתקדמת"
        features={[
          { icon: 'Check', text: 'דוחות מכירות (יומי, שבועי, חודשי)' },
          { icon: 'Check', text: 'ניתוח מוצרים נמכרים ומגמות' },
          { icon: 'Check', text: 'דוחות לקוחות ומעקב התנהגות' },
          { icon: 'Check', text: 'גרפים אינטראקטיביים ותרשימים' },
          { icon: 'Check', text: 'השוואת תקופות זמן' },
          { icon: 'Check', text: 'ייצוא דוחות ל-Excel/PDF' },
          { icon: 'Check', text: 'תחזיות מכירות וניתוח רווחיות' },
        ]}
      />
    </div>
  );
};

export default ReportsPage;
```

**פשט את ה-CSS:** `client/src/pages/Admin/Reports/ReportsPage.module.css`

```css
.reportsPage {
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.5s ease-out;
}
```

### 4.5 עדכון AdminSettingsPage

**ערוך:** `client/src/pages/Admin/Settings/AdminSettingsPage.tsx`

```tsx
import React from 'react';
import { TitleWithIcon, PlaceholderPage } from '../../../components/ui';
import styles from './AdminSettingsPage.module.css';

const AdminSettingsPage: React.FC = () => {
  return (
    <div className={styles.settingsPage}>
      <TitleWithIcon 
        title="הגדרות מערכת" 
        icon="Settings"
        subtitle="תצורה והגדרות כלליות של המערכת"
        isDev={true}
      />
      
      <PlaceholderPage
        icon="Settings"
        title="דף הגדרות בפיתוח"
        description="כאן יוצג מערכת הגדרות מקיפה"
        features={[
          { icon: 'Check', text: 'הגדרות חנות כלליות ומידע עסקי' },
          { icon: 'Check', text: 'הגדרות תשלום ואמצעי תשלום' },
          { icon: 'Check', text: 'הגדרות משלוח וזמני אספקה' },
          { icon: 'Check', text: 'ניהול API keys ואינטגרציות' },
          { icon: 'Check', text: 'הגדרות מייל והתראות' },
          { icon: 'Check', text: 'תצורת מס ועמלות' },
          { icon: 'Check', text: 'עיצוב ונושא האתר' },
          { icon: 'Check', text: 'גיבוי ושחזור מידע' },
        ]}
      />
    </div>
  );
};

export default AdminSettingsPage;
```

**פשט את ה-CSS:** `client/src/pages/Admin/Settings/AdminSettingsPage.module.css`

```css
.settingsPage {
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.5s ease-out;
}
```

---

## 🔄 שלב 5: Migration של Dashboard Components

### 5.1 עדכון HeroSection

**ערוך:** `client/src/pages/Admin/Dashboard/components/HeroSection/HeroSection.tsx`

החלף את כל הייבואים:

```tsx
import React from 'react';
import { Icon } from '../../../../../components/ui';
import styles from './HeroSection.module.css';
```

החלף את כל השימושים באייקונים:

```tsx
// לפני:
// <DollarSign size={24} strokeWidth={2} />

// אחרי:
<Icon name="DollarSign" size={24} />
```

עשה זאת לכל האייקונים בקומפוננטה.

### 5.2 עדכון TasksSection

**ערוך:** `client/src/pages/Admin/Dashboard/components/TasksSection/TasksSection.tsx`

החלף את הייבואים והאייקונים באותה דרך:

```tsx
import { Icon } from '../../../../../components/ui';

// החלף:
<Icon name="CheckCircle2" size={24} />
<Icon name="Check" size={16} />
```

### 5.3 עדכון InsightsSection

**ערוך:** `client/src/pages/Admin/Dashboard/components/InsightsSection/InsightsSection.tsx`

החלף את הייבואים והאייקונים:

```tsx
import { Icon } from '../../../../../components/ui';

// החלף:
<Icon name="Flame" size={24} />
<Icon name="Gem" size={24} />
<Icon name="AlertTriangle" size={24} />
```

### ✅ בדיקה מהירה

```bash
npm run dev
```

בדוק שכל הרכיבים של Dashboard מציגים אייקונים נכון.

---

## 🔄 שלב 6: Migration של TopBar (אופציונלי)

### 6.1 עדכון TopBar

**ערוך:** `client/src/pages/Admin/components/TopBar/TopBar.tsx`

החלף את הייבואים:

```tsx
import { Icon } from '../../../../components/ui';
```

החלף את כל האייקונים:

```tsx
<Icon name="Search" size={18} />
<Icon name="Bell" size={18} />
<Icon name="HelpCircle" size={18} />
<Icon name="Settings" size={18} />
```

---

## 🔄 שלב 7: Migration של Header (צד לקוחות)

### 7.1 עדכון Header

**ערוך:** `client/src/components/layout/Header/Header.tsx`

החלף את הייבואים:

```tsx
import { Icon } from '../../ui';
```

החלף את כל האייקונים:

```tsx
<Icon name="Search" size={18} />
<Icon name="User" size={20} />
<Icon name="ShoppingCart" size={20} />
<Icon name="LayoutDashboard" size={16} />
```

---

## 🛍️ שלב 8: רכיבי מוצרים ופילטרים (חנות)

### מטרה
שילוב מלא של דפי המוצרים, פאנל הסינון והרכיבים הנלווים במערכת העיצוב המשותפת.

### 8.1 מצב קיים (קבצים שכבר יש)

**קבצים קיימים:**
- דף מוצרים לקוח: `client/src/pages/ProductsPage/ProductsPage.tsx`
- דף פרטי מוצר: `client/src/pages/ProductDetailPage/ProductDetailPage.tsx`
- כרטיס מוצר: `client/src/components/features/products/ProductCard/ProductCard.tsx`
- פאנל סינון: `client/src/components/features/filters/panel/FilterPanel/FilterPanel.tsx`
- תוצאות: `client/src/components/features/filters/results/ProductsResults.tsx`
- Hook סינון: `client/src/components/features/filters/hooks/useFilteredProducts.ts`
- שירות API: `client/src/services/productService.ts` (מתודות: `getFilteredProducts`, `getAllProducts`, `getProductById`)
- טיפוסים: `client/src/types/Product.ts`

**מה צריך להוסיף/לשדרג:**
- ✅ ProductGrid component משותף
- ✅ Toolbar component (מיון, חיפוש, תצוגה)
- ✅ Pagination component משותף
- ✅ שדרוג FilterPanel לשימוש ברכיבי UI
- ✅ שדרוג ProductCard ל-Design System
- ✅ Admin CRUD מלא (ProductsManagementPage)

---

### 8.2 יצירת ProductGrid Component

#### 8.2.1 צור תיקייה
```bash
mkdir -p client/src/components/features/products/ProductGrid
```

#### 8.2.2 צור ProductGrid.tsx

**צור:** `client/src/components/features/products/ProductGrid/ProductGrid.tsx`

```tsx
import React from 'react';
import { ProductCard } from '../ProductCard';
import type { Product } from '../../../../types/Product';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  /** רשימת מוצרים להצגה */
  products: Product[];
  /** סוג תצוגה - grid או list */
  variant?: 'grid' | 'list';
  /** טוען */
  isLoading?: boolean;
  /** callback בלחיצה על מוצר */
  onProductClick?: (productId: string) => void;
}

/**
 * ProductGrid - תצוגת רשת מוצרים responsive
 * 
 * תומך בשני מצבי תצוגה: grid (כרטיסים) ו-list (שורות)
 */
export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  variant = 'grid',
  isLoading = false,
  onProductClick,
}) => {
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}>טוען מוצרים...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <p>לא נמצאו מוצרים</p>
      </div>
    );
  }

  return (
    <div className={`${styles.grid} ${styles[variant]}`}>
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          onClick={() => onProductClick?.(product._id)}
        />
      ))}
    </div>
  );
};
```

#### 8.2.3 צור ProductGrid.module.css

**צור:** `client/src/components/features/products/ProductGrid/ProductGrid.module.css`

```css
.grid {
  display: grid;
  gap: var(--spacing-lg);
  animation: fadeIn 0.3s ease-out;
}

/* Grid view - 4 columns */
.grid.grid {
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

/* List view - single column */
.grid.list {
  grid-template-columns: 1fr;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.spinner {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

.empty {
  text-align: center;
  padding: var(--spacing-3xl);
  color: var(--color-text-secondary);
  font-size: var(--text-lg);
}

/* Responsive */
@media (max-width: 1200px) {
  .grid.grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (max-width: 768px) {
  .grid.grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--spacing-md);
  }
}

@media (max-width: 480px) {
  .grid.grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

#### 8.2.4 צור index.ts

**צור:** `client/src/components/features/products/ProductGrid/index.ts`

```tsx
export { ProductGrid } from './ProductGrid';
```

---

### 8.3 יצירת Toolbar Component

#### 8.3.1 צור תיקייה
```bash
mkdir -p client/src/components/ui/Toolbar
```

#### 8.3.2 צור Toolbar.tsx

**צור:** `client/src/components/ui/Toolbar/Toolbar.tsx`

```tsx
import React from 'react';
import { Icon } from '../Icon';
import styles from './Toolbar.module.css';

type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'name-asc' | 'newest';
type ViewMode = 'grid' | 'list';

interface ToolbarProps {
  /** ערך חיפוש נוכחי */
  searchQuery?: string;
  /** callback לשינוי חיפוש */
  onSearchChange?: (query: string) => void;
  /** אפשרות מיון נוכחית */
  sortBy?: SortOption;
  /** callback לשינוי מיון */
  onSortChange?: (sort: SortOption) => void;
  /** מצב תצוגה */
  viewMode?: ViewMode;
  /** callback לשינוי תצוגה */
  onViewModeChange?: (mode: ViewMode) => void;
  /** מספר תוצאות */
  resultsCount?: number;
}

/**
 * Toolbar - סרגל כלים למוצרים
 * כולל: חיפוש, מיון, החלפת תצוגה
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  searchQuery = '',
  onSearchChange,
  sortBy = 'relevance',
  onSortChange,
  viewMode = 'grid',
  onViewModeChange,
  resultsCount = 0,
}) => {
  return (
    <div className={styles.toolbar}>
      {/* חיפוש */}
      <div className={styles.searchBox}>
        <Icon name="Search" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="חפש מוצרים..."
          className={styles.searchInput}
        />
      </div>

      {/* תוצאות */}
      <div className={styles.results}>
        {resultsCount} מוצרים
      </div>

      {/* מיון */}
      <div className={styles.sortBox}>
        <label htmlFor="sort">מיין לפי:</label>
        <select
          id="sort"
          value={sortBy}
          onChange={(e) => onSortChange?.(e.target.value as SortOption)}
          className={styles.sortSelect}
        >
          <option value="relevance">רלוונטיות</option>
          <option value="price-asc">מחיר: נמוך לגבוה</option>
          <option value="price-desc">מחיר: גבוה לנמוך</option>
          <option value="name-asc">שם: א-ת</option>
          <option value="newest">הכי חדש</option>
        </select>
      </div>

      {/* תצוגה */}
      <div className={styles.viewToggle}>
        <button
          onClick={() => onViewModeChange?.('grid')}
          className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
          aria-label="תצוגת רשת"
        >
          <Icon name="LayoutDashboard" size={20} />
        </button>
        <button
          onClick={() => onViewModeChange?.('list')}
          className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
          aria-label="תצוגת רשימה"
        >
          <Icon name="Menu" size={20} />
        </button>
      </div>
    </div>
  );
};
```

#### 8.3.3 צור Toolbar.module.css

**צור:** `client/src/components/ui/Toolbar/Toolbar.module.css`

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--color-bg-elevated);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-xl);
}

.searchBox {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
}

.searchInput {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: var(--text-base);
  color: var(--color-text-primary);
}

.searchInput::placeholder {
  color: var(--color-text-tertiary);
}

.results {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.sortBox {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.sortBox label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.sortSelect {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  cursor: pointer;
}

.viewToggle {
  display: flex;
  gap: var(--spacing-xs);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  padding: 2px;
  background: var(--color-bg-secondary);
}

.viewBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: var(--transition-fast);
}

.viewBtn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.viewBtn.active {
  background: var(--color-brand-blue);
  color: white;
}

@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .searchBox {
    flex: 1 1 100%;
  }

  .results {
    order: 3;
    flex: 1;
  }
}
```

#### 8.3.4 צור index.ts

**צור:** `client/src/components/ui/Toolbar/index.ts`

```tsx
export { Toolbar } from './Toolbar';
```

---

### 8.4 יצירת Pagination Component

#### 8.4.1 צור תיקייה
```bash
mkdir -p client/src/components/ui/Pagination
```

#### 8.4.2 צור Pagination.tsx

**צור:** `client/src/components/ui/Pagination/Pagination.tsx`

```tsx
import React from 'react';
import { Icon } from '../Icon';
import styles from './Pagination.module.css';

interface PaginationProps {
  /** עמוד נוכחי (1-based) */
  currentPage: number;
  /** סה"כ עמודים */
  totalPages: number;
  /** callback לשינוי עמוד */
  onPageChange: (page: number) => void;
  /** מצב compact (פחות כפתורים) */
  compact?: boolean;
}

/**
 * Pagination - ניווט בין עמודים
 * תומך ב-RTL, accessible, responsive
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  compact = false,
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = compact ? 3 : 5;
    const halfShow = Math.floor(showPages / 2);

    let startPage = Math.max(1, currentPage - halfShow);
    let endPage = Math.min(totalPages, currentPage + halfShow);

    // התאמה אם אנחנו בקצה
    if (currentPage <= halfShow) {
      endPage = Math.min(totalPages, showPages);
    }
    if (currentPage > totalPages - halfShow) {
      startPage = Math.max(1, totalPages - showPages + 1);
    }

    // עמוד ראשון
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    // עמודים באמצע
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // עמוד אחרון
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className={styles.pagination}>
      {/* כפתור קודם */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={styles.navBtn}
        aria-label="עמוד קודם"
      >
        <Icon name="ChevronRight" size={20} />
      </button>

      {/* מספרי עמודים */}
      <div className={styles.pages}>
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`${styles.pageBtn} ${
                page === currentPage ? styles.active : ''
              }`}
              aria-label={`עמוד ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* כפתור הבא */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={styles.navBtn}
        aria-label="עמוד הבא"
      >
        <Icon name="ChevronLeft" size={20} />
      </button>
    </div>
  );
};
```

#### 8.4.3 צור Pagination.module.css

**צור:** `client/src/components/ui/Pagination/Pagination.module.css`

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl) 0;
}

.navBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.navBtn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--border-medium);
  color: var(--color-text-primary);
}

.navBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pages {
  display: flex;
  gap: var(--spacing-xs);
}

.pageBtn {
  min-width: 40px;
  height: 40px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: var(--transition-fast);
}

.pageBtn:hover {
  background: var(--color-bg-hover);
  border-color: var(--border-medium);
  color: var(--color-text-primary);
}

.pageBtn.active {
  background: var(--color-brand-blue);
  border-color: var(--color-brand-blue);
  color: white;
  font-weight: var(--font-semibold);
}

.ellipsis {
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-sm);
  color: var(--color-text-tertiary);
}

@media (max-width: 480px) {
  .pagination {
    gap: 4px;
  }

  .navBtn,
  .pageBtn {
    min-width: 36px;
    height: 36px;
  }
}
```

#### 8.4.4 צור index.ts

**צור:** `client/src/components/ui/Pagination/index.ts`

```tsx
export { Pagination } from './Pagination';
```

---

### 8.5 שדרוג ProductCard ל-Design System

**ערוך:** `client/src/components/features/products/ProductCard/ProductCard.tsx`

עדכן את הרכיב לשימוש ב:
- `Icon` wrapper במקום ייבוא ישיר
- CSS variables במקום hard-coded values
- accessibility improvements

```tsx
import React from 'react';
import { Icon } from '../../../ui';
import type { Product } from '../../../../types/Product';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const { name, price, image, inStock } = product;

  return (
    <article 
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`מוצר: ${name}`}
    >
      {/* תמונה */}
      <div className={styles.imageWrapper}>
        <img 
          src={image || '/placeholder.png'} 
          alt={name}
          loading="lazy"
          className={styles.image}
        />
        {!inStock && (
          <div className={styles.outOfStock}>
            <Icon name="XCircle" size={16} />
            <span>אזל המלאי</span>
          </div>
        )}
      </div>

      {/* פרטים */}
      <div className={styles.details}>
        <h3 className={styles.name}>{name}</h3>
        <div className={styles.priceRow}>
          <span className={styles.price}>₪{price}</span>
          {inStock ? (
            <button className={styles.addBtn} aria-label="הוסף לעגלה">
              <Icon name="ShoppingCart" size={18} />
            </button>
          ) : (
            <span className={styles.unavailable}>לא זמין</span>
          )}
        </div>
      </div>
    </article>
  );
};
```

**עדכן CSS:** `client/src/components/features/products/ProductCard/ProductCard.module.css`

```css
.card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: var(--transition-normal);
  box-shadow: var(--shadow-sm);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--border-medium);
}

.imageWrapper {
  position: relative;
  width: 100%;
  padding-top: 100%; /* 1:1 ratio */
  background: var(--color-bg-secondary);
  overflow: hidden;
}

.image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.outOfStock {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.details {
  padding: var(--spacing-md);
}

.name {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.priceRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-brand-blue);
}

.addBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-brand-blue);
  color: white;
  cursor: pointer;
  transition: var(--transition-fast);
}

.addBtn:hover {
  background: var(--color-brand-cyan);
  transform: scale(1.05);
}

.unavailable {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  font-style: italic;
}
```

---

### 8.6 עדכון ProductsPage

**ערוך:** `client/src/pages/ProductsPage/ProductsPage.tsx`

שלב את הרכיבים החדשים:

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductGrid } from '../../components/features/products/ProductGrid';
import { Toolbar } from '../../components/ui/Toolbar';
import { Pagination } from '../../components/ui/Pagination';
import { FilterPanel } from '../../components/features/filters/panel/FilterPanel';
import { useFilteredProducts } from '../../components/features/filters/hooks/useFilteredProducts';
import styles from './ProductsPage.module.css';

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const {
    products,
    filters,
    setFilters,
    isLoading,
    pagination,
    handlePageChange,
  } = useFilteredProducts();

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  return (
    <div className={styles.productsPage}>
      <div className={styles.container}>
        {/* Sidebar - פאנל סינון */}
        <aside className={styles.sidebar}>
          <FilterPanel filters={filters} onChange={setFilters} />
        </aside>

        {/* Main - תוצאות */}
        <main className={styles.main}>
          {/* Toolbar */}
          <Toolbar
            searchQuery={filters.query}
            onSearchChange={(query) => setFilters({ ...filters, query })}
            sortBy={filters.sortBy}
            onSortChange={(sortBy) => setFilters({ ...filters, sortBy })}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            resultsCount={pagination.total}
          />

          {/* Grid/List */}
          <ProductGrid
            products={products}
            variant={viewMode}
            isLoading={isLoading}
            onProductClick={handleProductClick}
          />

          {/* Pagination */}
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </main>
      </div>
    </div>
  );
};

export default ProductsPage;
```

---

### 8.7 עדכון index.ts מרכזי

**עדכן:** `client/src/components/ui/index.ts`

הוסף את הרכיבים החדשים:

```tsx
// Icons
export { Icon } from './Icon';
export type { IconName } from './Icon';

// Typography
export { TitleWithIcon } from './Title';

// Placeholder
export { PlaceholderPage } from './Placeholder';

// Products
export { Toolbar } from './Toolbar';
export { Pagination } from './Pagination';
```

---

### 8.8 בדיקות

```bash
npm run dev
```

בדוק:
- ✅ דף מוצרים עובד עם הרכיבים החדשים
- ✅ פילטרים פועלים ומעדכנים את התוצאות
- ✅ מיון עובד
- ✅ Pagination עובד
- ✅ החלפת תצוגה grid/list עובדת
- ✅ כרטיסי מוצר נראים טוב
- ✅ Responsive - בדוק במסכים שונים
- ✅ RTL - כיוון נכון

### ✅ נקודת ביקורת - סיום שלב 8

```bash
npm run build
```

בדיקות ביצועים:
- ✅ גודל bundle לא גדל ביותר מ-15%
- ✅ דף מוצרים נטען תוך פחות מ-2 שניות
- ✅ פילטור עובד חלק (אין קפיאות)

---

## 🏠 שלב 9: דף הבית והקרוסלות

### מטרה
שילוב דף הבית, הקרוסלות ורכיב ProductCard בגרסת carousel במערכת העיצוב.

### 9.1 מצב קיים

**קבצים קיימים:**
- דף הבית: `client/src/pages/HomePage/HomePage.tsx`
- קרוסלה חדשים: `client/src/components/features/products/RecentlyAddedCarousel/RecentlyAddedCarousel.tsx`
- קרוסלה פופולריים: `client/src/components/features/products/PopularCarousel/PopularCarousel.tsx`
- רכיב Carousel: `client/src/components/ui/Carousel` (כבר קיים)
- ProductCard: `client/src/components/features/products/ProductCard/ProductCard.tsx` (תומך ב-variant="carousel")

**מה צריך לשדרג:**
- ✅ HomePage - שימוש ב-Design Tokens
- ✅ RecentlyAddedCarousel - עדכון ל-tokens + Typography
- ✅ PopularCarousel - עדכון ל-tokens + Typography
- ✅ loading/error states משותפים

---

### 9.2 עדכון HomePage

**ערוך:** `client/src/pages/HomePage/HomePage.tsx`

החלף imports והוסף Icon:

```tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ProductService } from '../../services/productService'
import { Typography } from '@ui'
import { Icon } from '../../components/ui'
import RecentlyAddedCarousel from '../../components/features/products/RecentlyAddedCarousel/RecentlyAddedCarousel'
import PopularCarousel from '../../components/features/products/PopularCarousel/PopularCarousel'
import { useSocket } from '../../hooks/useSocket'
import styles from './HomePage.module.css'
```

עדכן את ה-loading state:

```tsx
if (loading) {
  return (
    <div className={styles.loadingContainer}>
      <Icon name="Package" size={48} className={styles.loadingIcon} />
      <Typography variant="h2" align="center">טוען מוצרים...</Typography>
    </div>
  )
}
```

עדכן את ה-error state:

```tsx
if (error) {
  return (
    <div className={styles.errorContainer}>
      <Icon name="AlertCircle" size={48} className={styles.errorIcon} />
      <Typography variant="h2" color="error" align="center">{error}</Typography>
    </div>
  )
}
```

---

### 9.3 עדכון HomePage.module.css

**ערוך:** `client/src/pages/HomePage/HomePage.module.css`

החלף את כל התוכן ב:

```css
.homePage {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.loadingContainer,
.errorContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  min-height: 400px;
  padding: var(--spacing-3xl);
}

.loadingIcon {
  color: var(--color-brand-blue);
  animation: pulse 2s infinite;
}

.errorIcon {
  color: var(--color-brand-red);
}

.linksContainer {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-3xl);
  padding: var(--spacing-xl) 0;
}

.homeLink {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-xl);
  background: var(--color-brand-blue);
  color: white;
  text-decoration: none;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-md);
  transition: var(--transition-normal);
  box-shadow: var(--shadow-md);
}

.homeLink:hover {
  background: var(--color-brand-cyan);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

@media (max-width: 768px) {
  .homePage {
    padding: var(--spacing-lg) var(--spacing-md);
  }
}
```

---

### 9.4 עדכון RecentlyAddedCarousel

**ערוך:** `client/src/components/features/products/RecentlyAddedCarousel/RecentlyAddedCarousel.tsx`

החלף את ה-loading/error states:

```tsx
import React, { useEffect, useState } from 'react';
import ProductCard from '../ProductCard/ProductCard';
import { Typography, Carousel } from '../../../ui';
import { Icon } from '../../../ui';
import styles from './RecentlyAddedCarousel.module.css';
import type { Product } from '../../../../types/Product';

const RecentlyAddedCarousel: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        const res = await fetch('/api/products/by-date', { headers });
        if (!res.ok) throw new Error('שגיאה בטעינת מוצרים');
        const data = await res.json();
        setProducts(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message || 'שגיאה לא ידועה');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Icon name="Clock" size={32} />
        <Typography variant="body1">טוען מוצרים חדשים...</Typography>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.errorState}>
        <Icon name="AlertCircle" size={32} />
        <Typography variant="body1" color="error">{error}</Typography>
      </div>
    );
  }
  
  if (!products.length) {
    return (
      <div className={styles.emptyState}>
        <Icon name="Package" size={32} />
        <Typography variant="body1">לא נמצאו מוצרים חדשים</Typography>
      </div>
    );
  }

  return (
    <section className={styles.carouselSection}>
      <Typography variant="h5" align="center" className={styles.carouselTitle}>
        נוספו לאחרונה
      </Typography>
      <Carousel
        itemsToShow={3}
        itemsToScroll={1}
        showArrows={false}
        showDots={false}
        infinite={false}
        swipeEnabled={true}
        responsive={true}
        rows={2}
      >
        {products.map((product) => (
          <ProductCard
            key={product._id}
            variant="carousel"
            product={product}
          />
        ))}
      </Carousel>
    </section>
  );
};

export default RecentlyAddedCarousel;
```

---

### 9.5 עדכון RecentlyAddedCarousel.module.css

**ערוך:** `client/src/components/features/products/RecentlyAddedCarousel/RecentlyAddedCarousel.module.css`

```css
.carouselSection {
  margin: var(--spacing-3xl) 0;
  padding: var(--spacing-xl) 0;
}

.carouselTitle {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2xl);
}

.loadingState,
.errorState,
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  text-align: center;
  color: var(--color-text-secondary);
}

.loadingState {
  animation: fadeIn 0.3s ease-out;
}

.errorState {
  color: var(--color-brand-red);
}

@media (max-width: 768px) {
  .carouselTitle {
    font-size: var(--text-2xl);
  }
}
```

---

### 9.6 עדכון PopularCarousel

**ערוך:** `client/src/components/features/products/PopularCarousel/PopularCarousel.tsx`

החלף בדיוק כמו RecentlyAddedCarousel (רק שנה את ה-endpoint ל`/api/products/popular` ואת הכותרת ל"פופולרי"):

```tsx
import React, { useEffect, useState } from 'react';
import ProductCard from '../ProductCard/ProductCard';
import { Typography, Carousel } from '../../../ui';
import { Icon } from '../../../ui';
import styles from './PopularCarousel.module.css';
import type { Product } from '../../../../types/Product';

const PopularCarousel: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        const res = await fetch('/api/products/popular', { headers });
        if (!res.ok) throw new Error('שגיאה בטעינת המוצרים הפופולריים');
        const data = await res.json();
        setProducts(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Error loading popular products:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Icon name="TrendingUp" size={32} />
        <Typography variant="body1">טוען מוצרים פופולריים...</Typography>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.errorState}>
        <Icon name="AlertCircle" size={32} />
        <Typography variant="body1" color="error">{error}</Typography>
      </div>
    );
  }
  
  if (!products.length) {
    return (
      <div className={styles.emptyState}>
        <Icon name="Star" size={32} />
        <Typography variant="body1">לא נמצאו מוצרים פופולריים</Typography>
      </div>
    );
  }

  return (
    <section className={styles.carouselSection}>
      <Typography variant="h5" align="center" className={styles.carouselTitle}>
        פופולרי
      </Typography>
      <Carousel
        itemsToShow={3}
        itemsToScroll={1}
        showArrows={false}
        showDots={false}
        infinite={false}
        swipeEnabled={true}
        responsive={true}
        rows={2}
      >
        {products.map((product) => (
          <ProductCard
            key={product._id}
            variant="carousel"
            product={product}
          />
        ))}
      </Carousel>
    </section>
  );
};

export default PopularCarousel;
```

---

### 9.7 עדכון PopularCarousel.module.css

**צור:** `client/src/components/features/products/PopularCarousel/PopularCarousel.module.css`

(זהה ל-RecentlyAddedCarousel.module.css)

```css
.carouselSection {
  margin: var(--spacing-3xl) 0;
  padding: var(--spacing-xl) 0;
}

.carouselTitle {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2xl);
}

.loadingState,
.errorState,
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  text-align: center;
  color: var(--color-text-secondary);
}

.loadingState {
  animation: fadeIn 0.3s ease-out;
}

.errorState {
  color: var(--color-brand-red);
}

@media (max-width: 768px) {
  .carouselTitle {
    font-size: var(--text-2xl);
  }
}
```

---

### 9.8 בדיקות

```bash
npm run dev
```

בדוק:
- ✅ דף הבית נטען נכון
- ✅ שתי הקרוסלות מציגות מוצרים
- ✅ כרטיסי המוצרים נראים טוב
- ✅ מצבי loading/error נראים טוב עם אייקונים
- ✅ הקישור "לכל המוצרים" עובד
- ✅ Responsive - הקרוסלות מתכווצות נכון
- ✅ RTL - כל הטקסטים והקרוסלה בכיוון נכון

---

## 📱 שלב 10: דף פרטי מוצר (ProductDetailPage)

### מטרה
שדרוג דף פרטי המוצר לשימוש מלא ב-Design System.

### 10.1 מצב קיים

**קבצים קיימים:**
- דף המוצר: `client/src/pages/ProductDetailPage/ProductDetailPage.tsx`
- רכיב פרטים: `client/src/components/features/products/ProductDetail/ProductDetail.tsx`
- גלריה: `client/src/components/features/products/ProductGallery/ProductGallery.tsx`
- טאבים: `client/src/components/features/products/ProductTabs/ProductTabs.tsx`
- מוצרים קשורים: `client/src/components/features/products/RelatedProducts/RelatedProducts.tsx`
- בורר וריאנטים: `client/src/components/features/products/VariantSelector/VariantSelector.tsx`
- מחיר: `client/src/components/features/products/ProductPrice/ProductPrice.tsx`

**מה צריך לשדרג:**
- ✅ ProductDetail - כפתורים, אייקונים, tokens
- ✅ ProductGallery - ניווט עם Icon component
- ✅ ProductTabs - אייקונים לכרטיסיות
- ✅ RelatedProducts - שימוש ב-ProductGrid
- ✅ VariantSelector - עיצוב משודרג

---

### 10.2 עדכון ProductDetail

**ערוך:** `client/src/components/features/products/ProductDetail/ProductDetail.tsx`

הוסף imports:

```tsx
import React, { useState, useEffect } from 'react';
import { Typography, Breadcrumbs } from '@ui';
import { Icon } from '../../../ui';
import ProductGallery from '../ProductGallery';
import ProductTabs from '../ProductTabs';
import RelatedProducts from '../RelatedProducts';
import VariantSelector from '../VariantSelector';
import ProductPrice from '../ProductPrice';
import type { Product } from '../../../../types';
import { ProductService } from '../../../../services/productService';
import styles from './ProductDetail.module.css';
```

עדכן את ה-loading state:

```tsx
// מצב טעינה
if (loading) {
  return (
    <div className={styles.container}>
      <div className={styles.loading}>
        <Icon name="Package" size={48} className={styles.loadingIcon} />
        <Typography variant="h2" align="center">טוען פרטי מוצר...</Typography>
      </div>
    </div>
  );
}
```

עדכן את ה-error state:

```tsx
// מצב שגיאה
if (error || !product) {
  return (
    <div className={styles.container}>
      <div className={styles.error}>
        <Icon name="AlertCircle" size={48} className={styles.errorIcon} />
        <Typography variant="h2" color="error" align="center">
          {error || 'מוצר לא נמצא'}
        </Typography>
      </div>
    </div>
  );
}
```

החלף את ה-rating stars בכוכבים עם Icon:

```tsx
<div className={styles.rating}>
  <div className={styles.stars}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Icon
        key={star}
        name="Star"
        size={20}
        className={`${styles.star} ${star <= 4 ? styles.filled : ''}`}
      />
    ))}
  </div>
  <span className={styles.reviewCount}>(42 ביקורות)</span>
</div>
```

החלף את הכפתורים המשניים:

```tsx
<div className={styles.secondaryActions}>
  <button className={styles.actionButton} onClick={handleAddToFavorites}>
    <Icon name="Heart" size={20} />
    הוסף למועדפים
  </button>
  <button className={styles.actionButton} onClick={handleShare}>
    <Icon name="Share2" size={20} />
    שתף
  </button>
</div>
```

---

### 10.3 עדכון ProductDetail.module.css

**ערוך:** `client/src/components/features/products/ProductDetail/ProductDetail.module.css`

החלף את התוכן הרלוונטי (דוגמה לחלקים עיקריים):

```css
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.loading,
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-lg);
  min-height: 400px;
  padding: var(--spacing-3xl);
}

.loadingIcon {
  color: var(--color-brand-blue);
  animation: pulse 2s infinite;
}

.errorIcon {
  color: var(--color-brand-red);
}

.breadcrumb {
  margin-bottom: var(--spacing-xl);
}

.productHeader {
  margin-bottom: var(--spacing-2xl);
}

.productTitle {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.productMeta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
  flex-wrap: wrap;
}

.rating {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.stars {
  display: flex;
  gap: 4px;
}

.star {
  color: var(--color-text-tertiary);
  transition: var(--transition-fast);
}

.star.filled {
  color: var(--color-brand-orange);
}

.reviewCount {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.productSku {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-family: monospace;
}

.productMain {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3xl);
  margin-bottom: var(--spacing-3xl);
}

.priceSection {
  padding: var(--spacing-lg) 0;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: var(--spacing-lg);
}

.quantitySection {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin: var(--spacing-lg) 0;
}

.quantityLabel {
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.quantitySelector {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.quantityButton {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: var(--transition-fast);
}

.quantityButton:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.quantityButton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.quantityValue {
  min-width: 60px;
  padding: 0 var(--spacing-md);
  text-align: center;
  font-weight: var(--font-medium);
  font-size: var(--text-base);
}

.stockStatus {
  margin: var(--spacing-md) 0;
}

.inStock {
  color: var(--color-brand-emerald);
  font-weight: var(--font-semibold);
}

.outOfStock {
  color: var(--color-brand-red);
  font-weight: var(--font-semibold);
}

.actionButtons {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin: var(--spacing-xl) 0;
}

.addToCartButton,
.buyNowButton {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-normal);
  box-shadow: var(--shadow-sm);
}

.addToCartButton {
  background: var(--color-brand-blue);
  color: white;
}

.addToCartButton:hover:not(.disabled) {
  background: var(--color-brand-cyan);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.addToCartButton.disabled {
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
  cursor: not-allowed;
}

.buyNowButton {
  background: var(--color-brand-emerald);
  color: white;
}

.buyNowButton:hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.secondaryActions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.actionButton {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.actionButton:hover {
  background: var(--color-bg-hover);
  border-color: var(--border-medium);
  color: var(--color-text-primary);
}

.productTabs,
.relatedProducts {
  margin-top: var(--spacing-3xl);
}

@media (max-width: 1024px) {
  .productMain {
    grid-template-columns: 1fr;
    gap: var(--spacing-2xl);
  }
}

@media (max-width: 768px) {
  .container {
    padding: var(--spacing-lg) var(--spacing-md);
  }

  .productTitle {
    font-size: var(--text-2xl);
  }

  .secondaryActions {
    flex-direction: column;
  }
}
```

---

### 10.4 בדיקות

```bash
npm run dev
```

בדוק:
- ✅ דף מוצר נטען נכון
- ✅ כוכבי הדירוג נראים טוב
- ✅ כפתורי פעולה עובדים ונראים טוב
- ✅ בורר כמות עובד
- ✅ כפתורים משניים (לב, שיתוף) עם אייקונים
- ✅ Responsive - הכל עובד במסכים קטנים
- ✅ RTL - כיוון נכון

---

## ✅ שלב 11: בדיקות וולידציה

### 8.1 בדיקות פיתוח

```bash
npm run dev
```

בדוק את הדברים הבאים:

- ✅ כל האייקונים נראים בכל הדפים
- ✅ הצבעים עקביים בכל האתר
- ✅ הפונטים אחידים
- ✅ ה-spacing עקבי
- ✅ התגים "בפיתוח" מופיעים נכון
- ✅ Responsive - בדוק במסכים שונים

### 8.2 בדיקת Build

```bash
npm run build
```

וודא שאין שגיאות ושהגודל הסופי סביר.

### 8.3 בדיקה ויזואלית מקיפה

עבור על כל דף ובדוק:

**אזור ניהול:**
- ✅ NavigationPanel - אייקונים, hover states
- ✅ AdminDashboard - כל הסקשנים
- ✅ OrdersPage - כותרת ו-placeholder
- ✅ ProductsPage - כותרת ו-placeholder
- ✅ CustomersPage - כותרת ו-placeholder
- ✅ ReportsPage - כותרת ו-placeholder
- ✅ SettingsPage - כותרת ו-placeholder
- ✅ CustomerGroupsPage - עובד תקין
- ✅ UserManagementPage - עובד תקין

**אזור לקוחות:**
- ✅ Header - חיפוש, אייקונים
- ✅ Footer
- ✅ כל דפי התוכן

---

## 📚 שלב 9: תיעוד

### 9.1 יצירת מסמך תיעוד

**צור:** `client/docs/DESIGN_SYSTEM.md`

```markdown
# מערכת העיצוב - Design System

## מבוא

מערכת עיצוב משותפת לכל האתר המבוססת על Design Tokens ורכיבי UI משותפים.

## Design Tokens

כל המשתנים נמצאים ב: `client/src/styles/design-tokens.css`

### טיפוגרפיה

\`\`\`css
--font-family: 'Inter', sans-serif;
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
\`\`\`

### צבעים

\`\`\`css
/* Neutral */
--color-bg-primary: #ffffff;
--color-text-primary: #111827;

/* Brand */
--color-brand-blue: #3b82f6;
--color-brand-cyan: #06b6d4;
\`\`\`

## רכיבי UI

### Icon

\`\`\`tsx
import { Icon } from 'components/ui';

<Icon name="ShoppingCart" size={20} />
<Icon name="Users" size={24} strokeWidth={2} />
\`\`\`

**Props:**
- `name`: שם האייקון מתוך lucide-react
- `size`: גודל (ברירת מחדל: 20)
- `strokeWidth`: עובי קו (ברירת מחדל: 2)
- `className`: CSS class נוסף

### TitleWithIcon

\`\`\`tsx
import { TitleWithIcon } from 'components/ui';

<TitleWithIcon 
  title="ניהול הזמנות" 
  icon="ShoppingCart"
  subtitle="ניהול כל ההזמנות במערכת"
  isDev={true}
/>
\`\`\`

**Props:**
- `title`: טקסט הכותרת (חובה)
- `icon`: שם האייקון (חובה)
- `subtitle`: תת-כותרת (אופציונלי)
- `isDev`: האם להציג תג "בפיתוח" (אופציונלי)

### PlaceholderPage

\`\`\`tsx
import { PlaceholderPage } from 'components/ui';

<PlaceholderPage
  icon="Package"
  title="דף בפיתוח"
  description="תיאור קצר"
  features={[
    { icon: 'Check', text: 'תכונה 1' },
    { icon: 'Check', text: 'תכונה 2' }
  ]}
/>
\`\`\`

## הוספת אייקון חדש

1. פתח: `client/src/components/ui/Icon/Icon.tsx`
2. ייבא את האייקון מ-lucide-react
3. הוסף למילון ICONS
4. השתמש בו: `<Icon name="NewIcon" />`

## שינוי צבעים/פונטים

ערוך: `client/src/styles/design-tokens.css`

כל השינויים ישפיעו מיידית על כל האתר.
```

### 9.2 יצירת README לתיקיית UI

**צור:** `client/src/components/ui/README.md`

```markdown
# UI Components Library

ספריית רכיבי UI משותפים לכל האתר.

## מבנה

\`\`\`
ui/
├── Icon/           # אייקונים
├── Title/          # כותרות
├── Placeholder/    # דפי placeholder
└── index.ts        # ייצוא מרכזי
\`\`\`

## שימוש

\`\`\`tsx
import { Icon, TitleWithIcon, PlaceholderPage } from 'components/ui';
\`\`\`

## עקרונות

1. כל רכיב עצמאי עם CSS Modules משלו
2. TypeScript מלא עם interfaces מפורשים
3. תיעוד בקוד עם JSDoc
4. Responsive ונגיש
5. Performance מיטבי (tree-shaking)
```

---

## 🎯 סיכום והמשך

### מה עשינו?

✅ **תשתית Design Tokens** - כל הערכים במקום אחד  
✅ **Icon Wrapper** - ניהול מרכזי של אייקונים  
✅ **TitleWithIcon** - כותרות אחידות  
✅ **PlaceholderPage** - דפי placeholder מקצועיים  
✅ **Migration** - כל הדפים עברו למערכת החדשה  
✅ **תיעוד** - מסמכים ברורים לשימוש עתידי  

### יתרונות שהושגו

🎨 **עקביות מלאה** - כל האתר נראה ומרגיש אותו דבר  
⚡ **שינויים מהירים** - צבע/פונט/אייקון במקום אחד  
📦 **קוד נקי** - פחות חזרות, יותר בהירות  
🚀 **פיתוח מהיר** - רכיבים מוכנים לשימוש מיידי  
🔧 **תחזוקה קלה** - קל למצוא ולתקן בעיות  

### צעדים הבאים (המשך פיתוח)

1. **הוסף רכיבים נוספים**:
   - Button component משותף
   - Card component
   - Modal component
   - Form components (Input, Select, Checkbox)

2. **Dark Mode**:
   - הוסף משתנים ל-dark mode ב-design-tokens.css
   - הוסף logic להחלפת תמה

3. **Storybook**:
   - התקן Storybook
   - צור stories לכל רכיב
   - תיעוד ויזואלי אינטראקטיבי

4. **בדיקות**:
   - בדיקות unit עם Vitest/Jest
   - בדיקות ויזואליות עם Chromatic
   - בדיקות נגישות

---

## 📞 שאלות נפוצות

### איך מוסיפים אייקון חדש?

1. פתח `client/src/components/ui/Icon/Icon.tsx`
2. ייבא: `import { NewIcon } from 'lucide-react';`
3. הוסף למילון: `const ICONS = { ...existing, NewIcon }`
4. השתמש: `<Icon name="NewIcon" />`

### איך משנים צבע גלובלי?

ערוך `client/src/styles/design-tokens.css`:
```css
--color-brand-blue: #your-new-color;
```

### איך יוצרים רכיב UI חדש?

1. צור תיקייה: `client/src/components/ui/NewComponent/`
2. צור קבצים:
   - `NewComponent.tsx` - הרכיב
   - `NewComponent.module.css` - סטיילים
   - `index.ts` - ייצוא
3. הוסף ל-`client/src/components/ui/index.ts`

---

**סיום המיגרציה! 🎉**

כעת יש לך מערכת עיצוב מסודרת, מקצועית וקלה לתחזוקה.
