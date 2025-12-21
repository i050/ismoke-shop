// Custom Hooks לRedux - כלים מותאמים אישית לגישה נוחה ובטוחה ל-Store
// הקובץ הזה מכיל hooks מיוחדים שמפשטים את השימוש ב-Redux ומוסיפים type safety

import { useDispatch, useSelector } from 'react-redux'
// ייבוא הטיפוסים שיצרנו ב-store הראשי
import type { RootState, AppDispatch } from '../store'

// useAppSelector - Hook לקריאת מידע מה-Store בצורה בטוחה
// זהו חלופה מושכלת ל-useSelector הרגיל עם TypeScript מובנה
// 
// איך זה עובד:
// 1. מקבל פונקציה שבוחרת איזה חלק מהמצב אנחנו רוצים
// 2. מחזיר בדיוק את המידע שבחרנו
// 3. TypeScript יודע בדיוק מה הטיפוסים - אין צורך לציין ידנית!
//
// דוגמת שימוש:
// const user = useAppSelector(state => state.auth.user)
// const isLoading = useAppSelector(state => state.auth.isLoading)
export const useAppSelector = useSelector.withTypes<RootState>()

// useAppDispatch - Hook לשליחת פעולות (actions) לStore בצורה בטוחה  
// זהו חלופה מושכלת ל-useDispatch הרגיל עם TypeScript מובנה
//
// איך זה עובד:
// 1. מחזיר פונקציית dispatch מוקלדת נכון
// 2. TypeScript יודע איזה actions אפשר לשלוח
// 3. ייתן השלמה אוטומטית ויזהה שגיאות!
//
// דוגמת שימוש:
// const dispatch = useAppDispatch()
// dispatch(loginStart())           // ✅ TypeScript יודע שזה חוקי
// dispatch(someWrongAction())      // ❌ TypeScript יזהה שגיאה!
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()

// הסבר נוסף על היתרונות:
//
// 🎯 לפני ה-Hooks המותאמים (הדרך הישנה):
// const user = useSelector((state: RootState) => state.auth.user)  // הרבה typing!
// const dispatch = useDispatch() as AppDispatch                    // casting מסוכן!
//
// ✨ עם ה-Hooks החדשים (הדרך החכמה):
// const user = useAppSelector(state => state.auth.user)            // פשוט וברור!
// const dispatch = useAppDispatch()                                // type-safe אוטומטית!
//
// 🚀 יתרונות:
// - פחות קוד לכתיבה
// - פחות שגיאות
// - השלמה אוטומטית מעולה
// - בדיקות TypeScript חזקות יותר
// - קל יותר לתחזוקה