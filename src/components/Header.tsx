import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useContent } from '@/hooks/use-local-data';
import type { HeaderLink } from '@/lib/types';
import { DynamicIcon } from '@/components/DynamicIcon';
import { Sun, Moon, Languages, Menu, ChevronDown, Search } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onShowLanding: () => void;
}



const Header: React.FC<HeaderProps> = () => {
  const { t, language, changeLanguage, availableLanguages } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [content] = useContent();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Use content navigation links (only enabled ones)
  const headerLinks = (content.navigation.headerLinks || []).filter((l: HeaderLink) => l.enabled);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (window.innerWidth > 900) {
        const target = e.target as HTMLElement;
        if (!target.closest('.lang-selector')) {
          setLangMenuOpen(false);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleChangeLanguage = (lang: string) => {
    changeLanguage(lang);
    setLangMenuOpen(false);
    setMobileMenuOpen(false);
  };

  // Filter languages by name or code (metadata comes directly from translation files)
  const filteredLanguages = availableLanguages.filter(l => 
    l.name.toLowerCase().includes(langSearch.toLowerCase()) || 
    l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    if (!mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    document.body.style.overflow = '';
  };

  const smoothScrollTo = (id: string) => {
    // If not on landing page, navigate there first
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    closeMobileMenu();
  };

  return (
    <>
      <header>
        <div className="container nav-wrapper">
          <a href="#" className="logo" onClick={(e) => { e.preventDefault(); smoothScrollTo('home'); }}>
            <img src="/assets/svg/minios_icon.svg" width="28" height="28" alt="Logo" />
            MiniOS
          </a>

          <div className="mobile-buttons">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button className="mobile-menu-btn" onClick={() => setLangMenuOpen(!langMenuOpen)} title="Language">
              <Languages size={24} />
            </button>
            <button className="mobile-menu-btn" onClick={toggleMobileMenu} title="Menu">
              <Menu size={24} />
            </button>
          </div>

          <nav className="nav-links">
            {headerLinks.map((link: HeaderLink) => (
              link.type === 'internal' ? (
                <Link 
                  key={link.id}
                  to={link.url}
                  className={link.icon ? 'nav-with-icon' : undefined}
                  onClick={link.url === '/' ? () => smoothScrollTo('home') : undefined}
                >
                  {link.icon && <DynamicIcon name={link.icon} size={24} />}
                  {t(link.label)}
                </Link>
              ) : (
                <a 
                  key={link.id}
                  href={link.url} 
                  target="_blank" 
                  className="nav-with-icon" 
                  rel="noreferrer"
                >
                  <DynamicIcon name={link.icon || 'ExternalLink'} size={24} />
                  {t(link.label)}
                </a>
              )
            ))}

            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? <Sun size={24} className="theme-icon-light" /> : <Moon size={24} className="theme-icon-dark" />}
            </button>

            <div className={`lang-selector ${langMenuOpen ? 'active' : ''}`}>
              <button className="lang-btn" onClick={(e) => { e.stopPropagation(); setLangMenuOpen(!langMenuOpen); }}>
                <Languages size={24} />
                <span id="currentLang">{language.toUpperCase().substring(0, 2)}</span>
                <ChevronDown size={24} />
              </button>
              <div className="lang-dropdown">
                <div className="lang-search-wrapper">
                  <Search size={16} className="lang-search-icon" />
                  <input 
                    type="text" 
                    className="lang-search" 
                    placeholder="Search..." 
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="lang-list">
                  {filteredLanguages.map(lang => (
                    <a 
                      key={lang.code}
                      href="#"
                      onClick={(e) => { e.preventDefault(); handleChangeLanguage(lang.code); }}
                      className={language === lang.code || language.startsWith(lang.code + '-') ? 'active' : ''}
                    >
                      {lang.flag} {lang.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <div className={`mobile-overlay ${mobileMenuOpen || (window.innerWidth <= 900 && langMenuOpen) ? 'active' : ''}`} onClick={() => { setMobileMenuOpen(false); setLangMenuOpen(false); }}></div>
      
      <nav className={`mobile-nav ${mobileMenuOpen ? 'active' : ''}`}>
        {headerLinks.map((link: HeaderLink) => (
          link.type === 'internal' ? (
            <Link 
              key={link.id}
              to={link.url}
              className={link.icon ? 'social-link' : undefined}
              onClick={() => { 
                if (link.url === '/') smoothScrollTo('home'); 
                closeMobileMenu(); 
              }}
            >
              {link.icon && <DynamicIcon name={link.icon} size={24} />}
              {t(link.label)}
            </Link>
          ) : (
            <a 
              key={link.id}
              href={link.url} 
              target="_blank" 
              className="social-link" 
              rel="noreferrer"
            >
              <DynamicIcon name={link.icon || 'ExternalLink'} size={24} />
              {t(link.label)}
            </a>
          )
        ))}
      </nav>

      {/* Mobile Language Menu */}
      <nav className={`mobile-lang-menu ${langMenuOpen && window.innerWidth <= 900 ? 'active' : ''}`}>
        <div className="lang-search-wrapper mobile-search">
          <Search size={16} className="lang-search-icon" />
          <input 
            type="text" 
            className="lang-search" 
            placeholder="Search..." 
            value={langSearch}
            onChange={(e) => setLangSearch(e.target.value)}
          />
        </div>
        <div className="lang-list">
          {filteredLanguages.map(lang => (
            <a 
              key={lang.code}
              href="#"
              onClick={(e) => { e.preventDefault(); handleChangeLanguage(lang.code); }}
              className={language === lang.code || language.startsWith(lang.code + '-') ? 'active' : ''}
            >
              {lang.flag} {lang.name}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
};

export default Header;
