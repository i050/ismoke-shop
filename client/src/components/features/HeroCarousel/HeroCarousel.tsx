import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import * as bannerService from '@/services/bannerService';
import type { Banner } from '@/services/bannerService';
import './HeroCarousel.css';

interface HeroCarouselProps {
  autoPlayInterval?: number; // milliseconds
  transitionDuration?: number; // milliseconds
  enableAutoPlay?: boolean;
  pauseOnHover?: boolean;
}

const HeroCarousel: React.FC<HeroCarouselProps> = ({
  autoPlayInterval = 5000,
  transitionDuration = 800,
  enableAutoPlay = true,
  pauseOnHover = true,
}) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // מאחסן ID של ה־timeout (מספר בדפדפן) כדי לאפשר ניהול מבוסס setTimeout
  const autoPlayTimerRef = useRef<number | null>(null);
  const hasTrackedRef = useRef<Set<string>>(new Set());

  // Load banners
  useEffect(() => {
    const loadBanners = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const activeBanners = await bannerService.getActiveBanners();
        
        if (activeBanners.length === 0) {
          setError('No active banners available');
        } else {
          setBanners(activeBanners);
        }
      } catch (err) {
        console.error('Failed to load banners:', err);
        setError('Failed to load banners. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadBanners();
  }, []);

  // Track banner view
  useEffect(() => {
    if (banners.length > 0 && !hasTrackedRef.current.has(banners[currentIndex]._id)) {
      bannerService.trackImpression(banners[currentIndex]._id);
      hasTrackedRef.current.add(banners[currentIndex]._id);
    }
  }, [currentIndex, banners]);

  // Auto-play logic (setTimeout-based, recursive) - יותר יציב מול closures
  useEffect(() => {
    if (!enableAutoPlay || isPaused || banners.length <= 1) return;

    let mounted = true;

    const schedule = () => {
      if (!mounted || isPaused) return;
      // ניקוי timeout קודם אם קיים
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }

      console.debug('[HeroCarousel] scheduling next slide in', autoPlayInterval, 'ms');
      autoPlayTimerRef.current = window.setTimeout(() => {
        // השתמש ב־functional setState כדי להימנע מבעיות closure
        setIsTransitioning(true);
        setCurrentIndex((prev) => (prev + 1) % banners.length);

        // סמן את סוף הטרנזישן
        window.setTimeout(() => {
          setIsTransitioning(false);
        }, transitionDuration);

        // קבע את הסבב הבא
        schedule();
      }, autoPlayInterval) as unknown as number;
    };

    schedule();

    return () => {
      mounted = false;
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
        console.debug('[HeroCarousel] cleared autoplay timeout');
      }
    };
  }, [enableAutoPlay, isPaused, banners.length, autoPlayInterval, transitionDuration]);

  const nextSlide = useCallback(() => {
    if (isTransitioning || banners.length === 0) return;
    
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, transitionDuration);
  }, [isTransitioning, banners.length, transitionDuration]);

  const prevSlide = useCallback(() => {
    if (isTransitioning || banners.length === 0) return;
    
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, transitionDuration);
  }, [isTransitioning, banners.length, transitionDuration]);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || index === currentIndex || banners.length === 0) return;
    
    setIsTransitioning(true);
    setCurrentIndex(index);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, transitionDuration);
  }, [isTransitioning, currentIndex, banners.length, transitionDuration]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) < minSwipeDistance) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }

    if (distance > 0) {
      nextSlide();
    } else {
      prevSlide();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  const handleBannerClick = (banner: Banner) => {
    if (banner.ctaLink) {
      bannerService.trackClick(banner._id);
      
      if (banner.ctaLink.startsWith('http')) {
        window.open(banner.ctaLink, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = banner.ctaLink;
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="hero-carousel-loading">
        <div className="loading-spinner" aria-label="Loading banners"></div>
      </div>
    );
  }

  // Error state
  if (error || banners.length === 0) {
    return (
      <div className="hero-carousel-error" role="alert">
        <p>{error || 'No banners available'}</p>
      </div>
    );
  }

  return (
    <section
      className="hero-carousel"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Hero Carousel"
      aria-live="polite"
    >
      {/* Slides Container */}
      <div className="carousel-slides">
        {banners.map((banner, index) => (
          <div
            key={banner._id}
            className={`carousel-slide ${
              index === currentIndex ? 'active' : ''
            } ${isTransitioning ? 'transitioning' : ''}`}
            // מגדירים CSS variables מקומיים לכל סלייד כדי לאפשר שליטה מלאה בצבעים וגדלי פונט
            // כל שדה צבע יכול להיות hex (לדוגמה '#ffffff') או fallback ל-token גלובלי
            // גדלי פונט מותאמים לבאנר: xs|sm|base|lg (tokens רגילים) / xl|2xl|3xl (מנעד גדול יותר)
            style={{
              '--banner-title-color': banner.titleColor || 'var(--color-heading-inverse)',
              '--banner-description-color': banner.descriptionColor || 'var(--color-text-inverse)',
              '--banner-cta-text-color': banner.ctaTextColor || 'var(--color-text-inverse)',
              '--banner-cta-background-color': banner.ctaBackgroundColor || 'var(--color-accent)',
              // גדלי פונט מותאמים לבאנר - אם מוגדר אז לפי הבחירה, אחרת ברירת מחדל בינונית
              '--banner-title-size': banner.titleFontSize 
                ? (banner.titleFontSize === 'xl' ? '3rem' 
                  : banner.titleFontSize === '2xl' ? '4rem' 
                  : banner.titleFontSize === '3xl' ? '5.5rem'
                  : `var(--font-size-${banner.titleFontSize})`)
                : '2.5rem',
              '--banner-description-size': banner.descriptionFontSize 
                ? (banner.descriptionFontSize === 'xl' ? '1.5rem' 
                  : banner.descriptionFontSize === '2xl' ? '2rem' 
                  : banner.descriptionFontSize === '3xl' ? '3rem'
                  : `var(--font-size-${banner.descriptionFontSize})`)
                : '1.125rem',
              '--banner-cta-size': banner.ctaFontSize 
                ? (banner.ctaFontSize === 'xl' ? '1.25rem' 
                  : banner.ctaFontSize === '2xl' ? '1.5rem' 
                  : banner.ctaFontSize === '3xl' ? '2rem'
                  : `var(--font-size-${banner.ctaFontSize})`)
                : '1rem',
              // overlay opacity נשמר כאחוז (0..100) — המרנו ל-0..1 לשימוש ב-CSS
              '--overlay-opacity': ((banner.overlayOpacity ?? 40) as number) / 100,
            } as React.CSSProperties}
            onClick={() => handleBannerClick(banner)}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${banners.length}`}
            aria-hidden={index !== currentIndex}
          >
            {/* Background Image */}
            <div
              className="slide-background"
              style={{
                backgroundImage: banner.imageUrl
                  ? `url(${banner.imageUrl})`
                  : undefined,
              }}
              aria-label={banner.title}
            />

            {/* Content Overlay */}
            <div className="slide-content">
              <div className="slide-text">
                <h2 className="slide-title">{banner.title}</h2>
                {banner.description && (
                  <p className="slide-description">{banner.description}</p>
                )}
                {banner.ctaLink && banner.ctaText && (
                  <Button
                    size="lg"
                    className="slide-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBannerClick(banner);
                    }}
                    aria-label={`${banner.ctaText} - ${banner.title}`}
                  >
                    {banner.ctaText}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      {banners.length > 1 && (
        <>
          <button
            className="carousel-btn carousel-btn-prev"
            onClick={prevSlide}
            disabled={isTransitioning}
            aria-label="Previous slide"
          >
            <ChevronLeft size={32} />
          </button>

          <button
            className="carousel-btn carousel-btn-next"
            onClick={nextSlide}
            disabled={isTransitioning}
            aria-label="Next slide"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="carousel-dots" role="tablist" aria-label="Banner slides">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Pause/Play button (optional - for accessibility) */}
      {enableAutoPlay && banners.length > 1 && (
        <button
          className="carousel-pause-btn"
          onClick={() => setIsPaused(!isPaused)}
          aria-label={isPaused ? 'Play carousel' : 'Pause carousel'}
          title={isPaused ? 'הפעל' : 'השהה'}
        >
          {/* שימוש באייקונים דקים ועדינים במקום תווים גולמיים */}
          {isPaused ? <Play size={20} /> : <Pause size={20} />}
        </button>
      )}
    </section>
  );
};

export default HeroCarousel;
