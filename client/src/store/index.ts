// קונפיגורציה של Redux Store - הקובץ הראשי לניהול המצב
// כאן אנחנו יוצרים את ה-Store המרכזי של האפליקציה שיחזיק את כל המידע

import { configureStore } from '@reduxjs/toolkit'
// ייבוא ה-AuthSlice שיצרנו - הוא יטפל בכל מה שקשור לאימות משתמשים
import authReducer from './slices/authSlice'
// ייבוא ה-CustomerGroupsSlice לניהול קבוצות לקוח
import customerGroupsReducer from './slices/customerGroupsSlice'
// ייבוא ה-UserManagementSlice לניהול משתמשים ושיוך לקבוצות
import userManagementReducer from './slices/userManagementSlice'
// ייבוא ה-CategoriesSlice לניהול קטגוריות מוצרים
import categoriesReducer from './slices/categoriesSlice'
// ייבוא ה-CartSlice לניהול סל הקניות
import cartReducer from './slices/cartSlice'
// ייבוא ה-ProductsManagementSlice לניהול מוצרים בדף הניהול
import productsManagementReducer from './slices/productsManagementSlice'
// ייבוא ה-BannerManagementSlice לניהול באנרים
import bannerManagementReducer from './slices/bannerManagementSlice'
// ייבוא ה-AdminDashboardSlice לניהול התראות דשבורד
import adminDashboardReducer from './slices/adminDashboardSlice'

// configureStore הוא הפונקציה המעודכנת של Redux Toolkit
// היא מחליפה את createStore הישן ומוסיפה יכולות מתקדמות:
// 1. Redux DevTools אוטומטי לדיבוג
// 2. Redux Thunk מובנה לפעולות אסינכרוניות  
// 3. Immutability checks אוטומטיים
// 4. Serializable checks למניעת שגיאות
export const store = configureStore({
  // כרגע יש לנו את ה-authSlice, אז נחבר אותו ל-store
  // מאוחר יותר נוסיף כאן את כל ה-slices הנוספים (cart, products וכו')
  reducer: {
    // auth: השם שבו נשתמש ברכיבי React לגישה למצב האימות
    // authReducer: הפונקציה שמטפלת בשינויי מצב האימות
    auth: authReducer,
    // customerGroups: ניהול קבוצות לקוח
    customerGroups: customerGroupsReducer,
    // userManagement: ניהול משתמשים ושיוך לקבוצות
    userManagement: userManagementReducer,
    // categories: ניהול קטגוריות מוצרים
    categories: categoriesReducer,
    // cart: ניהול סל הקניות
    cart: cartReducer,
    // productsManagement: ניהול מוצרים בדף הניהול
    productsManagement: productsManagementReducer,
    // bannerManagement: ניהול באנרים
    bannerManagement: bannerManagementReducer,
    // adminDashboard: ניהול התראות ודשבורד מנהלים
    adminDashboard: adminDashboardReducer,
    // כאן יבואו כל ה-slices הנוספים בעתיד:
    // products: productsSlice.reducer
  },
})

// יצירת טיפוסים עבור TypeScript
// RootState מייצג את כל המצב של האפליקציה
// זה מאפשר לנו לקבל type safety כשאנחנו ניגשים למידע מה-store
export type RootState = ReturnType<typeof store.getState>

// AppDispatch מייצג את הפונקציה לשליחת פעולות
// זה מאפשר type safety כשאנחנו שולחים actions
export type AppDispatch = typeof store.dispatch

// חשיפה זמנית ל־window רק בסביבת פיתוח — מועילה לבדיקה אוטומטית
if (process.env.NODE_ENV === 'development') {
  try {
    (window as any).__APP_STORE__ = store;
  } catch (e) {
    // אין צורך להפריע אם הגישה ל-window חסומה בסביבה מסוימת
  }
}

// לצורכי דיבוג בפיתוח בלבד: חשיפת ה-store ב-window
// מאפשר להריץ ב־Console של הדפדפן: __APP_STORE__.getState().userManagement
// (חשיפה זמנית ל־window הוסרה) — לא נחשוף את ה-store ל‑window בסביבת הפיתוח