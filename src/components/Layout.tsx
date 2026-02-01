import React from 'react';
import Header from './Header';
import Footer from './Footer';
import AnnouncementBanner from './AnnouncementBanner';

interface LayoutProps {
  children: React.ReactNode;
  onShowLanding: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onShowLanding }) => {
  return (
    <>
      <div className="bg-mesh"></div>
      <div className="bg-noise"></div>
      <Header onShowLanding={onShowLanding} />
      <AnnouncementBanner />
      {children}
      <Footer />
    </>
  );
};

export default Layout;
