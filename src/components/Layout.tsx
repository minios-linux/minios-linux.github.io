import React from 'react';
import Header from './Header';
import Footer from './Footer';
import AnnouncementBanner from './AnnouncementBanner';
import TelegramButton from './TelegramButton';

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
      <TelegramButton />
      <Footer />
    </>
  );
};

export default Layout;
