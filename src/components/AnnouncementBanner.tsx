import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Megaphone } from 'lucide-react';
import { useContent } from '@/hooks/use-local-data';
import { useTranslation } from '@/contexts/LanguageContext';

// Check if text contains HTML tags
function isHTML(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

// Check if HTML content is effectively empty (only empty tags)
function isEmptyHTML(text: string): boolean {
  // Remove all HTML tags and check if anything remains
  const stripped = text.replace(/<[^>]*>/g, '').trim();
  return stripped === '';
}

const AnnouncementBanner: React.FC = () => {
  const [content] = useContent();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  const announcement = content.homePage.announcement;
  // Check if announcement has actual content (not just empty HTML tags like <p></p>)
  const hasContent = announcement && announcement.trim() !== '' && !isEmptyHTML(announcement);
  const isVisible = hasContent && !dismissed;

  // Add/remove class on body for styling purposes
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add('has-announcement');
    } else {
      document.body.classList.remove('has-announcement');
    }
    return () => {
      document.body.classList.remove('has-announcement');
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  // Translate and render announcement
  const translatedAnnouncement = t(announcement || '');
  const useHTML = isHTML(translatedAnnouncement);

  return (
    <div className={`announcement-banner announcement-${content.homePage.announcementColor || 'cyan'}`} ref={bannerRef}>
      <div className="announcement-content" style={{ justifyContent: content.homePage.announcementAlign || 'center' }}>
        <Megaphone className="announcement-icon" size={20} />
        {useHTML ? (
          <div 
            className="announcement-text"
            dangerouslySetInnerHTML={{ __html: translatedAnnouncement }}
            style={{ textAlign: content.homePage.announcementAlign || 'center' }}
          />
        ) : (
          <div className="announcement-text markdown-content" style={{ textAlign: content.homePage.announcementAlign || 'center' }}>
            <ReactMarkdown>{translatedAnnouncement}</ReactMarkdown>
          </div>
        )}
      </div>
      <button 
        className="announcement-close"  
        onClick={() => setDismissed(true)}
        aria-label="Close announcement"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default AnnouncementBanner;
