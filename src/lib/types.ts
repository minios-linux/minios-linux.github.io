// Gallery image with role and timing settings
export interface GalleryImage {
  url: string;
  role: 'main' | 'slide' | 'hover'; // main: shown first, slide: in slideshow, hover: on mouse hover
  duration?: number; // Display duration in seconds (for slideshow, default: 3)
}

export interface Edition {
  id: string;
  name: string;
  version: string;
  colorTheme: string;
  description: string;
  heroDescription?: string;
  heroImage?: string; // Image for hero carousel and download section (defaults to galleryImages[0])
  // Primary button settings
  primaryButtonType?: 'download' | 'external'; // Type of primary button (default: download)
  primaryButtonText?: string; // Custom button text (default: "Download ISO" or depends on type)
  primaryButtonIcon?: string; // Custom icon name from lucide-react (default: "Download" or "ExternalLink")
  primaryButtonUrl?: string; // URL for external link (when type is 'external')
  downloadUrl?: string; // Download URL template with {version}, {name}, {name_lower}
  // Torrent settings
  showTorrent?: boolean; // Show torrent button (default: true)
  torrentUrl?: string;
  // Image settings
  hoverImage?: string; // Second image for hover effect (legacy, prefer galleryImages with roles)
  showGallery?: boolean; // Show gallery overlay on image (default: true, false for slideshow/hover effect)
  slideshowInterval?: number; // Default slideshow interval in seconds (default: 3)
  // Other
  size: string;
  ram?: string;
  cpu?: string;
  features?: string[];
  includesLabel?: string;
  galleryImages: (string | GalleryImage)[]; // Array of image URLs or objects with roles
  requirements: string;
  order: number;
  showInHero?: boolean; // Show this edition in hero carousel (default: true)
}

// Feature card for "Why MiniOS?" section
export interface Feature {
  id: string;
  icon: string; // Icon name from lucide-react
  title: string;
  description: string;
  bulletPoints: string[];
  order: number;
}

// Navigation link (used in header and footer)
export interface NavLink {
  id: string;
  label: string;
  url: string; // For external: full URL, for internal: route path (e.g., '/', '/blog')
  icon?: string; // Icon name from lucide-react
  type?: 'internal' | 'external'; // internal = React Router Link, external = <a> with target="_blank"
  enabled: boolean;
}

// Header navigation link (alias for NavLink for backward compatibility)
export type HeaderLink = NavLink;

// Footer link group
export interface FooterLinkGroup {
  id: string;
  title: string;
  links: NavLink[];
}

// Torrent item in a group
export interface TorrentItem {
  label: string;
  value: string;
}

// Torrent group (e.g., "Debian 13 (Trixie)")
export interface TorrentGroup {
  header: string;
  items: TorrentItem[];
  mobileDescription: string;
}

// Torrent download option
export interface Torrent {
  id: string;
  title: string;
  size: string;
  url: string;
  groups: TorrentGroup[];
}

// SEO configuration
export interface SEOConfig {
  // Primary meta tags
  title: string;           // <title> and og:title
  description: string;     // meta description and og:description
  keywords: string;        // meta keywords
  author: string;          // meta author
  canonicalUrl: string;    // canonical URL (e.g., "https://minios.dev")
  
  // Open Graph
  ogImage: string;         // og:image URL (1200x630 recommended)
  ogSiteName: string;      // og:site_name
  // Note: og:locale is auto-generated from available translations
  
  // Twitter
  twitterCard: 'summary' | 'summary_large_image';
  twitterImage?: string;   // twitter:image (defaults to ogImage)
  
  // Verification codes
  yandexVerification?: string;
  googleVerification?: string;
  
  // Analytics
  yandexMetrikaId?: string;
  googleAnalyticsId?: string;
  
  // JSON-LD structured data
  structuredData?: {
    softwareVersion?: string;
    ratingValue?: string;
    ratingCount?: string;
  };
  
  // Sitemap settings
  sitemap?: {
    includeExternalLinks: boolean;
    externalLinks?: string[];
  };
}

// Unified site content structure
export interface SiteContent {
  site: {
    title: string;
    description: string;
    favicon: string;
    logo: string;
    logoText: string;
    copyright: string;
    heroBadge: string;
  };
  seo?: SEOConfig;
  aiTranslation?: {
    prompt: string;
  };
  homePage: {
    announcement: string;
    announcementColor?: 'cyan' | 'purple' | 'green' | 'orange' | 'red' | 'blue';
    announcementAlign?: 'left' | 'center' | 'right';
    hero: {
      prefix: string;
      tagline: string;
      primaryButton: string;
      secondaryButton: string;
    };
    features: {
      sectionTitle: string;
      sectionSubtitle: string;
    };
  };
  blog?: {
    columns: {
      desktop: number; // Columns on large screens (≥1200px)
      tablet: number;  // Columns on medium screens (769px-1199px)
      mobile: number;  // Columns on small screens (≤768px)
    };
    postsPerPage: number; // Number of posts to load initially and per "Load More"
  };
  downloadPage: {
    version: string; // Distribution version, used when edition.version is empty
    releaseVersion: string; // Release/tag version (e.g., "v5.1.1" for GitHub release tag)
    downloadUrlTemplate: string; // Global template with {version}, {release}, {name}, {name_lower}
    companion: {
      title: string;
      description: string;
      button: string;
      url: string;
    };
  };
  torrents: Torrent[];
  thankYouPage: {
    support: {
      githubUrl: string;
      telegramUrl: string;
      reviewUrl: string;
    };
  };
  footer: {
    description: string;
  };
  navigation: {
    headerLinks: HeaderLink[];
    footerGroups: FooterLinkGroup[];
  };
  editions: Edition[];
  features: Feature[];
}

export type EditionTheme = {
  name: string;
  color: string;
  colorOklch: string;
}

export const EDITION_THEMES: Record<string, EditionTheme> = {
  'Standard': {
    name: 'Standard',
    color: '#3b82f6',
    colorOklch: 'oklch(0.60 0.20 250)'
  },
  'Flux': {
    name: 'Flux',
    color: '#14b8a6',
    colorOklch: 'oklch(0.65 0.15 180)'
  },
  'Ultra': {
    name: 'Ultra',
    color: '#8b5cf6',
    colorOklch: 'oklch(0.58 0.22 290)'
  },
  'Toolbox': {
    name: 'Toolbox',
    color: '#f97316',
    colorOklch: 'oklch(0.68 0.18 40)'
  }
};

// Available icons for features (subset of lucide-react)
export const AVAILABLE_ICONS = [
  'Rocket', 'Gauge', 'Usb', 'Server', 'Monitor', 'PackageOpen',
  'Zap', 'Shield', 'Cpu', 'HardDrive', 'Wifi', 'Lock',
  'Settings', 'Terminal', 'Code', 'Database', 'Cloud', 'Download',
  'Newspaper', 'MessageCircle', 'BookOpen', 'Github', 'ExternalLink',
  'Star', 'Heart', 'Users', 'Globe', 'Mail'
] as const;

// Blog post with metadata and content
export interface BlogPost {
  slug: string;           // URL identifier (filename without .md)
  title: string;          // Article title
  excerpt: string;        // Short description for cards
  content: string;        // Markdown content
  author?: string;        // Author name
  publishedAt: string;    // Publication date (ISO)
  updatedAt?: string;     // Last update date
  tags?: string[];        // Tags for filtering
  featuredImage?: string; // Preview image URL
  published: boolean;     // Published or draft
  order?: number;         // For manual sorting
  // Telegram integration
  telegramDiscussion?: string; // Telegram channel post URL for discussion widget (e.g., "https://t.me/minios_news/123")
  telegramPostId?: number;     // Telegram message ID (prevents duplicate publishing)
}

// Blog index with metadata (no content)
export interface BlogIndex {
  posts: Omit<BlogPost, 'content'>[]; // Metadata without content
  lastUpdated: string;
}
