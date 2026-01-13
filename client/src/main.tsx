import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
// ייבוא Provider מ-react-redux - זה מה שמחבר את כל האפליקציה ל-Redux Store
// Provider הוא רכיב "עוטף" שנותן לכל הרכיבים בעץ גישה למידע ב-Store
import { Provider } from 'react-redux'
// ייבוא ה-Store שיצרנו - זה המקום שבו כל המידע של האפליקציה נשמר
import { store } from './store'
// ייבוא ה-router החדש שמבוסס על Data Router
import { router } from './routes/router'
// ייבוא ה-SiteStatusProvider לניהול מצב האתר (תחזוקה)
import { SiteStatusProvider } from './contexts/SiteStatusContext'
// ייבוא ה-ConfirmProvider לניהול מודאלי אישור גלובליים
import { ConfirmProvider } from './hooks/useConfirm'

// ========================================
// ייבוא CSS - סדר חשוב!
// ========================================

// 1. Design Tokens - חייב להיות ראשון (משתני CSS)
import './styles/design-tokens.css'

// 2. Animations - אנימציות גלובליות
import './styles/animations.css'

// 3. Utilities - כיתות עזר
import './styles/utilities.css'

// 4. Global Styles - סגנונות גלובליים
import './styles/global-styles.css'

// 5. Rubik fonts - ממש לפני index.css כדי למנוע Layout Shift
import '@fontsource/rubik/300.css'
import '@fontsource/rubik/400.css'
import '@fontsource/rubik/500.css'
import '@fontsource/rubik/600.css'
import '@fontsource/rubik/700.css'
import '@fontsource/rubik/800.css'

// 6. Index CSS - אחרון (סגנונות ספציפיים + font-family declaration)
import './index.css'

// ========================================

// ייבוא HTTP Interceptor - מוסיף Authorization header לכל בקשה
import './utils/httpInterceptor'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Provider הוא הרכיב העליון ביותר שמאפשר לכל הרכיבים לגשת ל-Redux */}
    {/* store={store} - מעביר את ה-Store שיצרנו לכל האפליקציה */}
    <Provider store={store}>
      {/* SiteStatusProvider - מנהל את מצב האתר (תחזוקה) ברמה גלובלית */}
      <SiteStatusProvider>
        {/* ConfirmProvider - מנהל מודאלי אישור (החלפה ל-window.confirm) */}
        <ConfirmProvider>
          {/* RouterProvider מחליף את BrowserRouter ומספק Data Router */}
          {/* router={router} - מעביר את הגדרת הנתיבים שיצרנו */}
          <RouterProvider router={router} />
        </ConfirmProvider>
      </SiteStatusProvider>
    </Provider>
  </StrictMode>,
)
