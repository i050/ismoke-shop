// index.ts - ייצוא מרכזי לרכיבי Authentication
// קובץ זה מאפשר ייבוא נוח של כל רכיבי ה-auth ממקום אחד

// ייצוא AuthCard - רכיב עטיפה עיצובי לטפסי התחברות
export { default as AuthCard } from './AuthCard';

// ייצוא SocialLoginButtons - כפתורי התחברות חברתית
export { default as SocialLoginButtons } from './SocialLoginButtons';

// ייצוא LoginForm - טופס התחברות עם ולידציה
export { default as LoginForm } from './LoginForm';

// ייצוא RegisterForm - טופס הרשמה עם ולידציה מקיפה
export { default as RegisterForm } from './RegisterForm';

// ייצוא AuthDivider - רכיב מפריד עם טקסט
export { default as AuthDivider } from './AuthDivider';

// ייצוא UserProfile - רכיב פרופיל משתמש
export { default as UserProfile } from './UserProfile';

// ייצוא UserSettings - רכיב הגדרות משתמש
export { default as UserSettings } from './UserSettings';

// ייצוא PasswordReset - רכיב שחזור סיסמה
export { default as PasswordReset } from './PasswordReset';

// ייצוא EmailVerification - רכיב אימות אימייל
export { default as EmailVerification } from './EmailVerification';