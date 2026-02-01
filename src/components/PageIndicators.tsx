import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

interface PageIndicatorsProps {
  activeSection: string;
  onScrollTo: (id: string) => void;
}

const PageIndicators: React.FC<PageIndicatorsProps> = ({ activeSection, onScrollTo }) => {
  const { t } = useTranslation();
  
  return (
    <div className="page-indicators">
      <a 
        href="#home" 
        className={`indicator-dot ${activeSection === 'home' ? 'active' : ''}`} 
        aria-label="Home"
        onClick={(e) => { e.preventDefault(); onScrollTo('home'); }}
      >
        <span className="indicator-label">{t('Home')}</span>
      </a>
      <a 
        href="#features" 
        className={`indicator-dot ${activeSection === 'features' ? 'active' : ''}`} 
        aria-label="Features"
        onClick={(e) => { e.preventDefault(); onScrollTo('features'); }}
      >
        <span className="indicator-label">{t('Features')}</span>
      </a>
      <a 
        href="#download" 
        className={`indicator-dot ${activeSection === 'download' ? 'active' : ''}`} 
        aria-label="Download"
        onClick={(e) => { e.preventDefault(); onScrollTo('download'); }}
      >
        <span className="indicator-label">{t('Download')}</span>
      </a>
    </div>
  );
};

export default PageIndicators;
