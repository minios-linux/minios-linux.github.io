import { useState, useEffect, useCallback } from 'react';

// Check if we're in development mode (localhost)
export const isDev = () => 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Generic hook for reading and writing JSON data
export function useLocalData<T>(filename: string, defaultValue: T): [T, (value: T) => Promise<void>, boolean] {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/data/${filename}`);
        if (response.ok) {
          const json = await response.json();
          setData(json);
        }
      } catch (error) {
        console.error(`Failed to load ${filename}:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filename]);

  // Save data (only works in dev mode)
  const saveData = useCallback(async (newData: T) => {
    if (!isDev()) {
      console.warn('Saving is only available in development mode');
      return;
    }

    try {
      const response = await fetch(`/__save-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          data: newData,
        }),
      });

      if (response.ok) {
        setData(newData);
      } else {
        throw new Error('Failed to save data');
      }
    } catch (error) {
      console.error(`Failed to save ${filename}:`, error);
      throw error;
    }
  }, [filename]);

  return [data, saveData, loading];
}

// Typed hooks for specific data
import type { SiteContent } from '@/lib/types';

// Default content structure
const defaultContent: SiteContent = {
  site: {
    title: 'MiniOS',
    description: 'Lightweight, portable, and modular Linux distribution based on Debian.',
    favicon: '/assets/svg/minios_icon.svg',
    logo: '/assets/svg/minios_icon.svg',
    logoText: 'MiniOS',
    copyright: '2020-2026 MiniOS Team',
    heroBadge: ''
  },
  homePage: {
    announcement: '',
    hero: {
      prefix: 'MiniOS is',
      tagline: 'Engineered for speed, designed for you.',
      primaryButton: 'Get MiniOS',
      secondaryButton: 'Why MiniOS?'
    },
    features: {
      sectionTitle: 'Why MiniOS?',
      sectionSubtitle: 'Engineered for speed, designed for you.'
    }
  },
  blog: {
    columns: {
      desktop: 3,
      tablet: 2,
      mobile: 1
    },
    postsPerPage: 6
  },
  downloadPage: {
    version: '',
    releaseVersion: '',
    downloadUrlTemplate: '',
    companion: {
      title: 'Companion Project',
      description: '',
      button: 'Visit Project',
      url: ''
    }
  },
  torrents: [],
  thankYouPage: {
    support: {
      githubUrl: 'https://github.com/minios-linux/minios-live',
      telegramUrl: 'https://t.me/minios_chat',
      reviewUrl: 'https://distrowatch.com/table.php?distribution=minios'
    }
  },
  footer: {
    description: 'Lightweight, portable, and modular Linux distribution.'
  },
  navigation: {
    headerLinks: [],
    footerGroups: []
  },
  editions: [],
  features: []
};

export function useContent() {
  return useLocalData<SiteContent>('content.json', defaultContent);
}
