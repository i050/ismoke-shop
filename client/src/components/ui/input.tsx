// wrapper שמפנה למימוש הישן של ה-Input שבתיקייה Input/ (CSS Modules)
// הערה בעברית: הקובץ הזה נועד לשמור על ייבוא אחיד של Input; הוא מייצא את מימוש המבוסס CSS Modules במקום המימוש שהשתמש ב-Tailwind.
import { Input as CSSInput } from './Input/Input';
export { CSSInput as Input };
export type { InputProps } from './Input/Input';

/* אין כאן קוד מבוסס Tailwind - היישום משתמש ב-CSS Modules בתיקיית Input/ */
