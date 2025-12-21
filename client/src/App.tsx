import { useEffect } from 'react'
import { Header, Footer } from '@layout'
import AppRoutes from './routes/AppRoutes'
import MiniCart from './components/features/cart/MiniCart'
import { useAppDispatch } from './hooks/reduxHooks'
import { fetchCart } from './store/slices/cartSlice'
import './App.css'

function App() {
  const dispatch = useAppDispatch()

  // טעינת הסל בטעינה ראשונית של האפליקציה
  useEffect(() => {
    dispatch(fetchCart())
  }, [dispatch])

  return (
    <div className="app">
      {/* Header מקצועי - על כל הרוחב */}
      <Header />
      
      {/* MiniCart - מגירה הזזה */}
      <MiniCart />

      {/* container ממורכז לתוכן */}
      <div className="app-container">
        {/* Layout מרכזי */}
        <div className="app-layout">
  {/* FiltersPanel במובייל ייטען בעתיד כ-Drawer (ללא שימוש במונח האסור) */}

          {/* תוכן ראשי - כל הדפים דרך Routes */}
          <AppRoutes />
        </div>

        {/* Footer */}
        <Footer 
          companyName="החנות שלי"
          showNewsletter={true}
          onNewsletterSubmit={(email: string) => {
            console.log('Newsletter subscription:', email);
            // כאן נוסיף לוגיקה אמיתית בעתיד
          }}
        />
      </div>
    </div>
  )
}

export default App
