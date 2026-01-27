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

  // ✅ ניקוי cache בריענון (F5), שמירה בניווט חזרה (Back)
  useEffect(() => {
    // בדוק אם זה הביקור הראשון בטאב או ניווט חזרה
    const isNavigatingBack = sessionStorage.getItem('homePageVisited') === 'true';
    
    if (!isNavigatingBack) {
      // 🔄 ביקור ראשון בטאב (F5 או כניסה חדשה) - נקה cache ישן
      console.log('🔄 ביקור ראשון - מנקה cache ישן');
      sessionStorage.removeItem('recentlyAddedState');
      sessionStorage.removeItem('popularState');
      sessionStorage.removeItem('homePageScrollPosition');
      // סמן שביקרנו בדף
      sessionStorage.setItem('homePageVisited', 'true');
    } else {
      console.log('⬅️ ניווט חזרה - שומר cache');
    }
  }, []);

  // ✅ שחזור גלילה כשחוזרים לדף (לא בריענון)
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('homePageScrollPosition');
    if (savedScrollPosition) {
      const targetScroll = parseInt(savedScrollPosition, 10);
      const maxAttempts = 60; // 60 * 16ms ≈ 1 שנייה
      let attempts = 0;
      
      // 🎯 חכה שהקומפוננטות יסיימו לטעון מ-sessionStorage לפני גלילה
      const waitForContentLoad = () => {
        attempts++;
        const currentHeight = document.documentElement.scrollHeight;
        
        // אם הדף גבוה מספיק (יש תוכן), בצע גלילה
        if (currentHeight > targetScroll || currentHeight > 2000) {
          window.scrollTo(0, targetScroll);
          console.log('🎯 גלילה למיקום שמור:', targetScroll, 'גובה דף:', currentHeight);
        } else if (attempts < maxAttempts) {
          // אחרת, המשך לנסות עד שנייה אחת
          requestAnimationFrame(waitForContentLoad);
        } else {
          console.log('⏱️ timeout - מבטל שחזור גלילה');
        }
      };
      
      // התחל לנסות אחרי 100ms (תן לריאקט להתחיל לרנדר)
      setTimeout(waitForContentLoad, 100);
    }
  }, []);

  // 💾 שמירת מיקום גלילה - בזמן אמת עם debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      // ביטול timeout קודם
      clearTimeout(timeoutId);
      
      // המתנה של 150ms אחרי סיום הגלילה לפני שמירה (debounce)
      timeoutId = setTimeout(() => {
        const currentScroll = window.scrollY;
        sessionStorage.setItem('homePageScrollPosition', currentScroll.toString());
        console.log('💾 שמירת גלילה בזמן אמת:', currentScroll);
      }, 150);
    };
    
    // האזנה לאירוע גלילה
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
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
