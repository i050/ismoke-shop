import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
// ייבוא Redux Hooks המותאמים שלנו
// import { useAppSelector } from '../../hooks/reduxHooks'

import { Button } from '@ui'
import HeroCarousel from '../../components/features/HeroCarousel';
import RecentlyAddedGrid from '../../components/features/products/RecentlyAddedGrid/RecentlyAddedGrid';
import PopularGrid from '../../components/features/products/PopularGrid/PopularGrid';
// ייבוא hook ל-WebSocket לעדכון מחירים בזמן אמת
import { useSocket } from '../../hooks/useSocket';
import styles from './HomePage.module.css'

const HomePage = () => {
  const [refreshKey, setRefreshKey] = useState(0); // מפתח לרענון הקרוסלות

  // ניווט - קריאת hook במקום מובטח (לפני כל return) כדי לשמור על סדר ה-Hooks
  const navigate = useNavigate()

  // ✅ שחזור גלילה כשחוזרים לדף (לא בריענון)
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('homePageScrollPosition');
    if (savedScrollPosition) {
      // השתמש בסדרה של callbacks כדי להמתין שה-DOM יהיה זמין לחלוטין
      const scrollPosition = parseInt(savedScrollPosition, 10);
      
      // ניסיון ראשון - after rendering
      setTimeout(() => {
        if (document.readyState === 'complete') {
          window.scrollTo(0, scrollPosition);
          console.log('🎯 גלילה למיקום שמור (rendering complete):', scrollPosition);
        } else {
          // אם עדיין טוען, חכה עוד
          window.addEventListener('load', () => {
            requestAnimationFrame(() => {
              window.scrollTo(0, scrollPosition);
              console.log('🎯 גלילה למיקום שמור (after load):', scrollPosition);
            });
          }, { once: true });
        }
      }, 100);
    }
  }, []);

  // שמירת מיקום גלילה לפני שעוזבים את הדף
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('homePageScrollPosition', window.scrollY.toString());
    };

    // שמירה בעת גלילה (עם throttle קל)
    let scrollTimeout: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', throttledHandleScroll);
    
    // שמירה גם לפני unmount
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      handleScroll(); // שמירה אחרונה
    };
  }, []);

  // האזנה לעדכוני מחירים בזמן אמת
  // useSocket('groupUpdated', () => {
  //   // כאשר יש עדכון בקבוצות לקוחות, נרענן את הקרוסלות
  //   setRefreshKey(prev => prev + 1);
  // });
  
  console.log('HomePage Rendered');
  
  // קריאת מצב Authentication מ-Redux Store
  // const authState = useAppSelector((state) => state.auth)

  return (
    <main className={styles.homePage}>
      {/* Hero Carousel - בראש הדף */}
      <HeroCarousel 
        autoPlayInterval={5000}
        transitionDuration={800}
        enableAutoPlay={true}
        pauseOnHover={true}
      />
      
      {/* גריד של מוצרים שנוספו לאחרונה */}
      <RecentlyAddedGrid key={`recent-${refreshKey}`} />
      
      {/* גריד של מוצרים פופולריים */}
      <PopularGrid key={`popular-${refreshKey}`} />
      <div className={styles.linksContainer}>
        {/* שימוש ב-Button מהערכת ה-UI במקום קישור גלמי */}
        <Button variant="primary" size="lg" onClick={() => navigate('/products')}>לכל המוצרים</Button>
      </div>
    </main>
  )
}

export default HomePage;
