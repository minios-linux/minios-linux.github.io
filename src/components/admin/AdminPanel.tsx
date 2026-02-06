import { X, Globe, Sparkles, Package, Download, Languages, Save, RefreshCw, Undo2, Newspaper, Search, Sun, Moon } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ContentManager } from './ContentManager';
import type { ContentManagerHandle } from './ContentManager';

type ContentSection = 'site' | 'features' | 'editions' | 'download' | 'seo' | 'translations' | 'blog';

const SECTIONS: { id: ContentSection; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'site', labelKey: 'Site', icon: <Globe className="w-4 h-4" /> },
  { id: 'features', labelKey: 'Features', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'editions', labelKey: 'Editions', icon: <Package className="w-4 h-4" /> },
  { id: 'download', labelKey: 'Download', icon: <Download className="w-4 h-4" /> },
  { id: 'seo', labelKey: 'SEO', icon: <Search className="w-4 h-4" /> },
  { id: 'blog', labelKey: 'Blog', icon: <Newspaper className="w-4 h-4" /> },
  { id: 'translations', labelKey: 'Translations', icon: <Languages className="w-4 h-4" /> },
];

interface Props {
  onClose: () => void;
}

export function AdminPanel({ onClose }: Props) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<ContentSection>('site');
  const [saveState, setSaveState] = useState({ hasChanges: false, saving: false });
  const contentManagerRef = useRef<ContentManagerHandle>(null);
  
  const handleStateChange = useCallback((state: { hasChanges: boolean; saving: boolean }) => {
    setSaveState(state);
  }, []);
  
  const handleSave = () => {
    contentManagerRef.current?.save();
  };
  
  const handleDiscard = () => {
    contentManagerRef.current?.discard();
  };
  
  // Determine if save button should be shown and enabled
  const showSaveButton = activeSection !== 'translations';
  const canSave = saveState.hasChanges && !saveState.saving;
  
  // Keyboard shortcuts: Ctrl+S to save, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (canSave && showSaveButton) {
          contentManagerRef.current?.save();
        }
      }
      // Escape to close
      if (e.key === 'Escape') {
        // Don't close if there are unsaved changes - let user use discard first
        if (!saveState.hasChanges) {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canSave, showSaveButton, saveState.hasChanges, onClose]);

  return (
    <div className="admin-panel">
      {/* Top Header */}
      <header className="admin-top-header">
        <div className="admin-top-header-inner">
          <div className="admin-logo">
            <img src="/assets/svg/minios_icon.svg" width="28" height="28" alt="Logo" />
          </div>

          {/* Section tabs in header */}
          <nav className="admin-top-nav">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                className={`admin-top-nav-btn ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.icon}
                <span>{t(section.labelKey)}</span>
              </button>
            ))}
          </nav>

          <div className="admin-header-actions">
            {showSaveButton && canSave && (
              <button 
                onClick={handleDiscard} 
                className="admin-discard-btn"
                title={t('Discard Changes')}
              >
                <Undo2 className="w-5 h-5" />
              </button>
            )}
            {showSaveButton && (
              <button 
                onClick={handleSave} 
                disabled={!canSave}
                className={`admin-save-btn ${canSave ? 'has-changes' : ''}`}
                title={t('Save Changes')}
              >
                {saveState.saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              </button>
            )}
            <button 
              onClick={toggleTheme} 
              className="admin-theme-btn"
              title={t('Toggle theme')}
            >
              {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="admin-close-btn" title={t('Close Admin Panel')}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="admin-main-content">
        <div className="container">
          <ContentManager 
            ref={contentManagerRef}
            activeSection={activeSection} 
            onSectionChange={setActiveSection}
            onStateChange={handleStateChange}
          />
        </div>
      </main>
    </div>
  );
}
