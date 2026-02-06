import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { Cpu, MemoryStick, HardDrive, Magnet, Image as ImageIcon, ExternalLink } from 'lucide-react';
import GalleryModal from './GalleryModal';
import { useContent, getAssetUrl } from '@/hooks/use-local-data';
import { DynamicIcon } from './DynamicIcon';
import type { Edition, Torrent, TorrentGroup, GalleryImage } from '@/lib/types';

interface DownloadTabsProps {
  onDownload: (url: string) => void;
  onDownloadTorrent: (url: string) => void;
}

// Default editions fallback
const defaultEditions: Edition[] = [
  {
    id: 'def-std', name: 'Standard', version: '', colorTheme: '#22d3ee',
    description: 'Minimal system with basic functionality. Compact and efficient Xfce desktop for everyday computing.',
    downloadUrl: '',
    size: '812 MB', requirements: 'CPU x64', ram: '768 MB', cpu: '1 GHz', order: 0,
    features: ['Desktop environment', 'Web browser', 'Graphics system', 'Networking tools', 'Disk management utilities', 'Compression utilities', 'System firmware packages'],
    galleryImages: ['/assets/img/standard_00.jpg', '/assets/img/standard_01.jpg', '/assets/img/standard_02.jpg', '/assets/img/standard_03.jpg']
  },
  {
    id: 'def-tool', name: 'Toolbox', version: '', colorTheme: '#fbbf24',
    description: "The admin's swiss army knife. Diagnostics, recovery, and partitioning tools included.",
    downloadUrl: '',
    size: '1.16 GB', requirements: 'CPU x64', ram: '768 MB', cpu: '1 GHz', order: 1,
    features: ['Advanced networking tools', 'Data recovery utilities', 'Virtualization support', 'Remote desktop access', 'Partition editor', 'Disk usage analyzer', 'System monitoring tools'],
    galleryImages: ['/assets/img/toolbox_00.jpg', '/assets/img/toolbox_01.jpg', '/assets/img/toolbox_02.jpg']
  },
  {
    id: 'def-ultra', name: 'Ultra', version: '', colorTheme: '#a855f7',
    description: 'The ultimate portable workstation with Office suite, media editors, and full software set.',
    downloadUrl: '',
    size: '1.69 GB', requirements: 'CPU x64', ram: '768 MB', cpu: '1 GHz', order: 2,
    features: ['Full office suite', 'Graphics editors', 'Video production tools', 'Audio editor', '3D modeling tools', 'Development IDE', 'Container platform'],
    galleryImages: ['/assets/img/ultra_00.jpg', '/assets/img/ultra_01.jpg', '/assets/img/ultra_02.jpg', '/assets/img/ultra_03.jpg']
  },
  {
    id: 'def-flux', name: 'Flux', version: '', colorTheme: '#34d399',
    description: 'Ultra-lightweight Fluxbox edition. Breathes new life into ancient hardware with minimal resource usage.',
    downloadUrl: '',
    size: '500 MB', requirements: 'CPU x32/x64', ram: '512 MB', cpu: '1 GHz', order: 3,
    features: ['Minimalist window manager', 'Lightweight file manager', 'Web browser', 'Text editor', 'Terminal emulator', 'System monitoring', 'Network management'],
    galleryImages: ['/assets/img/flux_00.jpg', '/assets/img/flux_01.jpg']
  }
];

// Helper to get download URL from template
// Supported variables: {version}, {release}, {name}, {name_lower}, {id}
const getDownloadUrl = (edition: Edition, globalVersion: string, releaseVersion: string, globalTemplate: string): string => {
  // Use edition's custom URL if set, otherwise use global template
  const template = edition.downloadUrl || globalTemplate || '';
  // Use edition's version if set, otherwise use global version
  const version = edition.version || globalVersion || '';
  
  return template
    .replace(/{version}/g, version)
    .replace(/{release}/g, releaseVersion)
    .replace(/{name}/g, edition.name)
    .replace(/{name_lower}/g, edition.name.toLowerCase())
    .replace(/{id}/g, edition.id);
};

// Helper to normalize gallery image to string URL
const getImageUrl = (img: string | GalleryImage): string => {
  const url = typeof img === 'string' ? img : img.url;
  return getAssetUrl(url);
};

// Helper to get gallery images as URLs (use edition's or fallback)
const getGalleryImages = (edition: Edition): string[] => {
  if (edition.galleryImages && edition.galleryImages.length > 0) {
    return edition.galleryImages.map(getImageUrl);
  }
  // Fallback to default based on name
  const defaultGalleries: Record<string, string[]> = {
    'standard': ['/assets/img/standard_00.jpg', '/assets/img/standard_01.jpg', '/assets/img/standard_02.jpg', '/assets/img/standard_03.jpg'],
    'toolbox': ['/assets/img/toolbox_00.jpg', '/assets/img/toolbox_01.jpg', '/assets/img/toolbox_02.jpg'],
    'ultra': ['/assets/img/ultra_00.jpg', '/assets/img/ultra_01.jpg', '/assets/img/ultra_02.jpg', '/assets/img/ultra_03.jpg'],
    'flux': ['/assets/img/flux_00.jpg', '/assets/img/flux_01.jpg']
  };
  return defaultGalleries[edition.name.toLowerCase()] || [];
};

// Helper to get normalized gallery images with roles
const getGalleryImagesWithRoles = (edition: Edition): GalleryImage[] => {
  const urls = getGalleryImages(edition);
  const raw = edition.galleryImages && edition.galleryImages.length > 0
    ? edition.galleryImages
    : urls.map(u => u as string | GalleryImage);

  const images = raw.map((img, i) => {
    if (typeof img === 'string') {
      return {
        url: img,
        role: i === 0 ? 'main' as const : 'slide' as const,
        duration: edition.slideshowInterval || 3
      };
    }
    return {
      ...img,
      duration: img.duration || edition.slideshowInterval || 3
    };
  });

  // If no explicit roles were set (all strings) and gallery is disabled,
  // auto-assign: first = main, second = hover, rest = slide
  const hasExplicitRoles = raw.some(img => typeof img !== 'string');
  if (!hasExplicitRoles && edition.showGallery === false && images.length >= 2) {
    images[1].role = 'hover';
  }

  return images;
};

// Get images by their roles for slideshow/hover behavior
const getImagesByRole = (edition: Edition): { 
  main: GalleryImage | null; 
  slides: GalleryImage[]; 
  hover: GalleryImage | null 
} => {
  const images = getGalleryImagesWithRoles(edition);
  const main = images.find(img => img.role === 'main') || images[0] || null;
  const slides = images.filter(img => img.role === 'slide');
  const hover = images.find(img => img.role === 'hover') || null;
  return { main, slides, hover };
};

// Slideshow component for edition images (simplified to hover effect only)
const EditionSlideshow: React.FC<{
  edition: Edition;
  onGalleryOpen?: () => void;
  showGalleryOverlay: boolean;
  galleryButtonText: string;
  includesLabel: string;
  features: string[];
  standardFeaturesLabel: string;
  t: (key: string) => string;
}> = ({ edition, onGalleryOpen, showGalleryOverlay, galleryButtonText, includesLabel, features, standardFeaturesLabel, t }) => {
  const { main, hover } = getImagesByRole(edition);
  
  const hasHoverEffect = !showGalleryOverlay && hover !== null;
  
  return (
    <div 
      className={`edition-image-container ${hasHoverEffect ? 'has-hover' : ''} ${showGalleryOverlay ? 'gallery-trigger' : ''}`}
      onClick={showGalleryOverlay ? onGalleryOpen : undefined}
    >
      {/* Main image */}
      {main && (
        <img 
          src={getAssetUrl(main.url)} 
          alt={`${edition.name} Screen`}
          className="edition-img-main"
        />
      )}
      
      {/* Hover image - controlled purely by CSS :hover */}
      {hover && (
        <img 
          src={getAssetUrl(hover.url)} 
          alt={`${edition.name} Screen Hover`}
          className="edition-img-hover"
        />
      )}
      
      {/* Includes overlay */}
      <div className="edition-includes">
        <p className="edition-includes-title">{t(includesLabel)}</p>
        <ul className="edition-includes-list">
          {features.length > 0 ? (
            features.map((feature: string, i: number) => <li key={i}>{t(feature)}</li>)
          ) : (
            <li>{t(standardFeaturesLabel)}</li>
          )}
        </ul>
      </div>
      
      {/* Gallery overlay */}
      {showGalleryOverlay && (
        <div className="gallery-overlay">
          <span className="view-btn"><ImageIcon size={20} /> {t(galleryButtonText)}</span>
        </div>
      )}
    </div>
  );
};

const DownloadTabs: React.FC<DownloadTabsProps> = ({ onDownload, onDownloadTorrent }) => {
  const { t } = useTranslation();
  const [content] = useContent();
  const [activeTab, setActiveTab] = useState<string>('standard');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [torrentMenuOpen, setTorrentMenuOpen] = useState<string | null>(null);

  const openGallery = (edition: Edition) => {
    const images = getGalleryImages(edition);
    if (images.length > 0) {
      setGalleryImages(images);
      setCurrentImageIndex(0);
      setGalleryOpen(true);
      requestAnimationFrame(() => {
        document.body.style.overflow = 'hidden';
        document.body.classList.add('gallery-open');
      });
    }
  };

  const closeGallery = () => {
    setGalleryOpen(false);
    requestAnimationFrame(() => {
      document.body.style.overflow = '';
      document.body.classList.remove('gallery-open');
    });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const toggleTorrentMenu = (e: React.MouseEvent, tab: string) => {
    e.preventDefault();
    e.stopPropagation();
    setTorrentMenuOpen(torrentMenuOpen === tab ? null : tab);
  };

  // Close torrent menu on outside click
  React.useEffect(() => {
    const handleClickOutside = () => setTorrentMenuOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Use content editions or defaults
  const editions = content.editions?.length > 0 ? content.editions : defaultEditions;
  const displayEditions = [...editions].sort((a: Edition, b: Edition) => a.order - b.order);

  // Sync active tab with first edition if not set correctly
  React.useEffect(() => {
    if (displayEditions.length > 0 && !displayEditions.find((e: Edition) => e.name.toLowerCase() === activeTab)) {
      setActiveTab(displayEditions[0].name.toLowerCase());
    }
  }, [displayEditions, activeTab]);

  const dp = content.downloadPage;
  const companion = dp.companion;

  // Hardcoded labels (translatable via t())
  const labels = {
    sectionTitle: 'Get MiniOS',
    sectionDescription: 'Choose your perfect edition.',
    isoButton: 'Download ISO',
    galleryButton: 'View Gallery',
    sizeLabel: 'Size',
    ramLabel: 'RAM',
    standardFeaturesLabel: 'Standard features',
  };

  return (
    <section id="download" className={`download-section theme-${activeTab}`}>
      <div className="container">
        <div className="section-header">
          <h2>{t(labels.sectionTitle)}</h2>
          <p className="text-muted">{t(labels.sectionDescription)}</p>
        </div>

        <div className="tabs-nav">
          {displayEditions.map((edition: Edition) => (
            <button 
              key={edition.id}
              className={`tab-btn ${activeTab === edition.name.toLowerCase() ? 'active' : ''}`} 
              onClick={() => setActiveTab(edition.name.toLowerCase())}
              style={{ '--tab-color': edition.colorTheme } as React.CSSProperties}
            >
              {t(edition.name)}
            </button>
          ))}
        </div>

        <div className="tabs-wrapper">
          {displayEditions.map((edition: Edition) => {
            const isActive = activeTab === edition.name.toLowerCase();
            const downloadUrl = getDownloadUrl(edition, dp.version || '', dp.releaseVersion || '', dp.downloadUrlTemplate || '');
            
            return (
              <div key={edition.id} id={edition.name.toLowerCase()} className={`tab-content ${isActive ? 'active' : ''}`}>
                <div>
                  <h3 className="tab-title" style={{ color: edition.colorTheme }}>{t(edition.name)}</h3>
                  <p className="tab-desc">{t(edition.description)}</p>
                  <div className="specs">
                    <div className="spec-item">
                      <Cpu className="spec-icon" />
                      <span className="spec-val">{edition.cpu ? t(edition.cpu) : ''}</span>
                      <span className="spec-label">{edition.requirements ? t(edition.requirements) : ''}</span>
                    </div>
                    <div className="spec-item">
                      <MemoryStick className="spec-icon" />
                      <span className="spec-val">{edition.ram ? t(edition.ram) : ''}</span>
                      <span className="spec-label">{t(labels.ramLabel)}</span>
                    </div>
                    <div className="spec-item">
                      <HardDrive className="spec-icon" />
                      <span className="spec-val">{edition.size ? t(edition.size) : ''}</span>
                      <span className="spec-label">{t(labels.sizeLabel)}</span>
                    </div>
                  </div>
                  <div className="buttons-wrapper tab-buttons">
                  {/* Primary button - download or external link */}
                  {edition.primaryButtonType === 'external' ? (
                    <a 
                      href={edition.primaryButtonUrl || '#'} 
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ backgroundColor: edition.colorTheme, boxShadow: `0 8px 20px -5px ${edition.colorTheme}66` }}
                    >
                      <DynamicIcon name={edition.primaryButtonIcon || 'ExternalLink'} size={20} /> {t(edition.primaryButtonText || 'Visit Website')}
                    </a>
                  ) : (
                    <a 
                      href={downloadUrl} 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        onDownload(downloadUrl); 
                      }} 
                      className="btn btn-primary"
                      style={{ backgroundColor: edition.colorTheme, boxShadow: `0 8px 20px -5px ${edition.colorTheme}66` }}
                    >
                      <DynamicIcon name={edition.primaryButtonIcon || 'Download'} size={20} /> {t(edition.primaryButtonText || labels.isoButton)}
                    </a>
                  )}
                  
                  {/* Torrent button - optional */}
                  {edition.showTorrent !== false && (
                    <div className={`torrent-dropdown ${torrentMenuOpen === edition.name.toLowerCase() ? 'active' : ''}`}>
                      <a 
                        href="#" 
                        className="btn-torrent" 
                        title="Download Torrent" 
                        onClick={(e) => toggleTorrentMenu(e, edition.name.toLowerCase())}
                        style={{ color: edition.colorTheme }}
                      >
                        <Magnet size={24} />
                      </a>
                      <div className="torrent-menu">
                        {(content.torrents || [])
                          .filter((torrent: Torrent) => torrent.title && torrent.url)
                          .map((torrent: Torrent) => (
                          <a 
                            key={torrent.id} 
                            href={torrent.url}
                            onClick={(e) => { 
                              e.preventDefault(); 
                              onDownloadTorrent(torrent.url);
                            }}
                          >
                            <div className="torrent-header">
                              <span className="t-name">{t(torrent.title)}</span>
                              <span className="t-size">{torrent.size}</span>
                            </div>
                            <div className="torrent-details">
                              <div className="t-grid t-desktop">
                                {torrent.groups.map((group: TorrentGroup, gIdx: number) => (
                                  <div className="t-group" key={gIdx}>
                                    <div className="t-group-header">{t(group.header)}</div>
                                    {group.items.map((item, iIdx) => (
                                      <div className="t-item" key={iIdx}>
                                        <span className="t-ver">{t(item.label)}</span>{' '}
                                        <span className="t-desc">{t(item.value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                              <div className="t-grid t-mobile">
                                {torrent.groups.map((group: TorrentGroup, gIdx: number) => (
                                  <div className="t-group" key={gIdx}>
                                    <div className="t-group-header">{t(group.header)}</div>
                                    <div className="t-simple-desc">
                                      {t(group.mobileDescription)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                  
                  {/* Companion project promo for Toolbox */}
                  {edition.name === 'Toolbox' && companion.url && (
                    <div className="phb-wrapper">
                      <p className="phb-title">
                        {t(companion.title)}
                      </p>
                      <p className="phb-desc">
                        {t(companion.description)}
                      </p>
                      <a href={companion.url} target="_blank" className="phb-link" rel="noreferrer">
                        {t(companion.button)}
                        <ExternalLink className="phb-icon" />
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Image section - with gallery, slideshow, or hover effect */}
                <EditionSlideshow
                  edition={edition}
                  onGalleryOpen={() => openGallery(edition)}
                  showGalleryOverlay={edition.showGallery !== false}
                  galleryButtonText={labels.galleryButton}
                  includesLabel={edition.includesLabel || 'Includes:'}
                  features={edition.features || []}
                  standardFeaturesLabel={labels.standardFeaturesLabel}
                  t={t}
                />
              </div>
            );
          })}
        </div>
      </div>

      <GalleryModal 
        isOpen={galleryOpen} 
        onClose={closeGallery} 
        images={galleryImages}
        currentIndex={currentImageIndex}
        onNext={nextImage}
        onPrev={prevImage}
      />
    </section>
  );
};

export default DownloadTabs;
