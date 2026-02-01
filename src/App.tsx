import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider, useTranslation } from './contexts/LanguageContext';
import Layout from './components/Layout';
import Hero from './components/Hero';
import Features from './components/Features';
import DownloadTabs from './components/DownloadTabs';
import DownloadView from './components/DownloadView';
import PageIndicators from './components/PageIndicators';
import { isDev } from './hooks/use-local-data';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Loader2 } from 'lucide-react';
import './styles/fonts.css';
import './styles/style.css';

// Lazy load heavy components for code splitting
const BlogList = lazy(() => import('./components/blog/BlogList').then(m => ({ default: m.BlogList })));
const BlogPost = lazy(() => import('./components/blog/BlogPost').then(m => ({ default: m.BlogPost })));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
import { AdminPanelSkeleton } from './components/admin/AdminPanelSkeleton';

// Loading fallback component - must reserve enough height to prevent footer from jumping
const LoadingFallback = () => (
  <div className="flex items-center justify-center" style={{ minHeight: '80vh' }}>
    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
  </div>
);

function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('home');

  // Update document title with translation
  useEffect(() => {
    document.title = `MiniOS - ${t('Fast. Simple. Reliable.')}`;
  }, [t]);

  // Intersection Observer for active section
  useEffect(() => {
    const sections = ['home', 'features', 'download'];
    const observerOptions = {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const initiateDownload = (url: string) => {
    navigate('/download', { state: { downloadUrl: url } });
  };

  const initiateDownloadTorrent = (url: string) => {
    navigate('/download', { state: { downloadUrl: url } });
  };

  return (
    <motion.div
      key="landing"
      id="landing-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      <Hero onScrollTo={handleScrollTo} />
      <Features />
      <DownloadTabs onDownload={initiateDownload} onDownloadTorrent={initiateDownloadTorrent} />
      <PageIndicators activeSection={activeSection} onScrollTo={handleScrollTo} />
    </motion.div>
  );
}

function DownloadPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const downloadUrl = (location.state as { downloadUrl?: string })?.downloadUrl || '';

  useEffect(() => {
    document.title = `${t('Downloading')} - MiniOS`;
  }, [t]);

  useEffect(() => {
    if (downloadUrl) {
      setTimeout(() => {
        window.location.href = downloadUrl;
      }, 2500);
    }
  }, [downloadUrl]);

  return (
    <motion.div
      key="download"
      id="download-view"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '80vh', display: 'flex' }}
    >
      <DownloadView downloadUrl={downloadUrl} />
    </motion.div>
  );
}

function AppContent() {
  const [isLocalhost] = useState(() => isDev());
  const [showAdmin, setShowAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle SPA redirect from 404.html (GitHub Pages)
  useEffect(() => {
    const redirectPath = sessionStorage.getItem('spa-redirect-path');
    if (redirectPath) {
      sessionStorage.removeItem('spa-redirect-path');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);

  // Scroll to top on route change
  useEffect(() => {
    // Always scroll to top when route changes, unless we're on landing page
    // This prevents the browser from auto-restoring scroll position
    if (location.pathname !== '/') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.key]); // Include location.key to trigger on all navigations

  return (
    <>
      {/* Admin Panel - rendered outside Layout to avoid header/footer interference */}
      {showAdmin && (
        <Suspense fallback={<AdminPanelSkeleton />}>
          <AdminPanel onClose={() => setShowAdmin(false)} />
        </Suspense>
      )}
      
      {!showAdmin && (
        <Layout onShowLanding={() => navigate('/')}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/blog" element={
                <Suspense fallback={<LoadingFallback />}>
                  <BlogList />
                </Suspense>
              } />
              <Route path="/blog/:slug" element={
                <Suspense fallback={<LoadingFallback />}>
                  <BlogPost />
                </Suspense>
              } />
            </Routes>
          </AnimatePresence>
        </Layout>
      )}
      
      {/* Admin Toggle - only visible on localhost */}
      {isLocalhost && (
        <button 
          className="admin-toggle-btn"
          onClick={() => setShowAdmin(!showAdmin)}
          title={showAdmin ? 'Back to site' : 'Admin Panel (localhost only)'}
        >
          <Settings size={24} />
        </button>
      )}
    </>
  );
}

function App() {
  // Disable browser's automatic scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
