import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useContent } from '@/hooks/use-local-data';
import type { Edition, GalleryImage } from '@/lib/types';

// Helper to get URL from gallery image (string or object)
const getImageUrl = (img: string | GalleryImage): string => {
  return typeof img === 'string' ? img : img.url;
};

// Default slides with translation keys (not hardcoded translations)
const defaultHeroSlides = [
  { 
    id: 'default-0',
    name: "Standard", 
    descriptionKey: "A clean, efficient XFCE desktop for daily tasks. Balanced performance for everyone.",
    colorTheme: "#22d3ee",
    img: "/assets/img/standard_00.jpg",
    themeClass: "theme-standard"
  },
  { 
    id: 'default-1',
    name: "Toolbox", 
    descriptionKey: "The admin's swiss army knife. Diagnostics, recovery, and partitioning tools included.",
    colorTheme: "#fbbf24",
    img: "/assets/img/toolbox_00.jpg",
    themeClass: "theme-toolbox"
  },
  { 
    id: 'default-2',
    name: "Ultra", 
    descriptionKey: "The ultimate portable workstation with Office suite, media editors, and full software set.",
    colorTheme: "#a855f7",
    img: "/assets/img/ultra_00.jpg",
    themeClass: "theme-ultra"
  }
];

interface HeroSlide {
  id: string;
  name: string;
  descriptionKey: string; // Translation key for the description
  colorTheme: string;
  img: string;
  themeClass: string;
}

interface HeroProps {
  onScrollTo: (id: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onScrollTo }) => {
  const { t } = useTranslation();
  const [content] = useContent();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const slideIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Map editions to slides, filtering by showInHero flag (default: true)
  const editions = content.editions;
  const heroEditions = editions?.filter((ed: Edition) => ed.showInHero !== false) || [];
  const slides: HeroSlide[] = (heroEditions.length > 0) 
    ? [...heroEditions].sort((a: Edition, b: Edition) => a.order - b.order).map((ed: Edition) => ({
        id: ed.id,
        name: ed.name,
        descriptionKey: ed.heroDescription || ed.description,
        colorTheme: ed.colorTheme,
        img: ed.heroImage || (ed.galleryImages && ed.galleryImages.length > 0 ? getImageUrl(ed.galleryImages[0]) : null) || defaultHeroSlides.find(d => d.name === ed.name)?.img || "/assets/img/standard_00.jpg",
        themeClass: `theme-${ed.name.toLowerCase()}`
      }))
    : defaultHeroSlides;

  useEffect(() => {
    if (isAutoPlaying) {
      slideIntervalRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 5000);
    }
    return () => {
      if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    };
  }, [isAutoPlaying, slides.length]);

  const manualSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentSlide(index);
    // Restart autoplay after interaction
    if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    slideIntervalRef.current = setInterval(() => {
      setIsAutoPlaying(true); // resume logic
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
  };

  const slide = slides[currentSlide] || slides[0];

  return (
    <section id="home" className={`hero ${slide.themeClass}`} style={{
        // Inject dynamic accent color if it's a custom edition (though CSS classes handle most)
        // We can override CSS var if needed
        // '--accent': slide.colorTheme
    } as React.CSSProperties}>
      <div className="container hero-content">
        <div className="hero-text-wrapper">
          <div id="releaseBadge" className="release-badge">
            <span className="blink-dot" style={{ backgroundColor: slide.colorTheme, boxShadow: `0 0 10px ${slide.colorTheme}` }}></span>
            <span id="releaseText">{t(content.site.heroBadge)}</span>
          </div>
          
          <h1>
            {t('MiniOS is')} <br/>
            <AnimatePresence mode="wait">
              <motion.span
                key={slide.id + '-title'}
                className="hero-title-accent"
                id="heroTitle"
                style={{ color: slide.colorTheme }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {t(slide.name)}
              </motion.span>
            </AnimatePresence>
          </h1>
          <AnimatePresence mode="wait">
            <motion.p
              key={slide.id + '-desc'}
              className="hero-desc"
              id="heroDesc"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {t(slide.descriptionKey)}
            </motion.p>
          </AnimatePresence>

          <div className="btn-group">
            <a href="#download" className="btn btn-primary" onClick={(e) => { e.preventDefault(); onScrollTo('download'); }} style={{ backgroundColor: slide.colorTheme, boxShadow: `0 8px 20px -5px ${slide.colorTheme}66` }}>
              {t('Download')}
            </a>
            <a href="#features" className="btn btn-glass" onClick={(e) => { e.preventDefault(); onScrollTo('features'); }}>
              {t('Learn More')}
            </a>
          </div>
          <div className="indicators">
            {slides.map((s, i) => (
              <div 
                key={s.id} 
                className={`dot ${i === currentSlide ? 'active' : ''}`} 
                onClick={() => manualSlide(i)}
                style={i === currentSlide ? { backgroundColor: s.colorTheme, boxShadow: `0 0 10px ${s.colorTheme}66`, width: '24px' } : {}}
              ></div>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          {slides.map((s, i) => (
            <img 
              key={s.id}
              src={s.img} 
              className={`slide-img ${i === currentSlide ? 'active' : ''}`} 
              alt={s.name} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};


export default Hero;
