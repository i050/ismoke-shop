// wrapper שמפנה למימוש הכפתור הישן שמבוסס על CSS Modules
// הערה בעברית: כאן אנחנו מייבאים את הכפתור מהתיקייה Button/ (למדויקת לקובץ Button/Button.tsx) ומייצאים אותו כדי שכל הייבואים ישארו תקינים.
import { Button as CSSButton } from './Button/Button';
export { CSSButton as Button };
export type { ButtonProps } from './Button/Button';

/* אין כאן יותר קוד מבוסס Tailwind או CVA - כל השימושים מיועדים עכשיו למימוש הישן ב-Button/ */
