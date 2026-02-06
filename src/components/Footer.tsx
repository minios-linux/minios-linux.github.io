import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useContent } from '@/hooks/use-local-data';
import { DynamicIcon } from '@/components/DynamicIcon';
import type { FooterLinkGroup, NavLink } from '@/lib/types';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const [content] = useContent();

  // Default footer groups for fallback
  const defaultGroups: FooterLinkGroup[] = [
    {
      id: 'project',
      title: 'Project',
      links: [
        { id: 'home', label: 'Home', url: '/', type: 'internal', enabled: true },
        { id: 'blog', label: 'Blog', url: '/blog', type: 'internal', enabled: true },
        { id: 'releases', label: 'Releases', url: 'https://github.com/minios-linux/minios-live/releases', type: 'external', enabled: true }
      ]
    },
    {
      id: 'community',
      title: 'Community',
      links: [
        { id: 'github', label: 'GitHub Org', url: 'https://github.com/minios-linux', type: 'external', enabled: true },
        { id: 'telegram', label: 'Telegram Chat', url: 'https://t.me/minios_chat', type: 'external', enabled: true },
        { id: 'news', label: 'News Channel', url: 'https://t.me/s/minios_news', type: 'external', enabled: true },
        { id: 'distrowatch', label: 'DistroWatch', url: 'https://distrowatch.com/table.php?distribution=minios', type: 'external', enabled: true }
      ]
    }
  ];

  const footerGroups = content.navigation.footerGroups?.length > 0 ? content.navigation.footerGroups : defaultGroups;
  const footerDescription = content.footer.description || 'Lightweight, portable, and modular Linux distribution based on Debian.';

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/assets/svg/minios_icon.svg" alt="MiniOS Logo" />
              MiniOS
            </div>
            <p>{t(footerDescription)}</p>
            <div className="copyright">© {t(content.site.copyright || '2020-2026 MiniOS Linux')}.</div>
          </div>
          
          {footerGroups.map((group: FooterLinkGroup) => (
            <div key={group.id} className="footer-links">
              <h4>{t(group.title)}</h4>
              {group.links.filter((link: NavLink) => link.enabled !== false).map((link: NavLink) => (
                link.type === 'internal' ? (
                  <Link key={link.id} to={link.url} className={link.icon ? 'footer-link-with-icon' : undefined}>
                    {link.icon && <DynamicIcon name={link.icon} size={16} />}
                    {t(link.label)}
                  </Link>
                ) : (
                  <a 
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className={link.icon ? 'footer-link-with-icon' : undefined}
                  >
                    {link.icon && <DynamicIcon name={link.icon} size={16} />}
                    {t(link.label)}
                  </a>
                )
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
