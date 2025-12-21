import { clsx, type ClassValue } from "clsx"

// הערה בעברית: הסרנו את התלות ב-tailwind-merge מכיוון שאנו מבטלים את השימוש ב-Tailwind
// הפונקציה cn תחזיר עתה רק את השילוב של הקלאסים באמצעות clsx.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
