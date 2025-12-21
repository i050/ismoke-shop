// wrapper שמפנה למימוש הישן של ה-Card שבתיקייה Card/ (CSS Modules)
// הערה בעברית: הקובץ הזה נועד לשמור על ייבוא אחיד של Card; הוא מייצא את מימוש המבוסס CSS Modules במקום המימוש שהשתמש ב-Tailwind.
import { Card as CSSCard } from './Card/Card';
export { CSSCard as Card };

/* אין כאן קוד מבוסס Tailwind - היישום משתמש ב-CSS Modules בתיקיית Card/ */
