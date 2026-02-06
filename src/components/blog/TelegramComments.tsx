import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { MessageCircle, ExternalLink } from 'lucide-react';

interface TelegramCommentsProps {
  /**
   * URL to a Telegram post with comments enabled.
   * Example: "https://t.me/minios_news/123" or just "minios_news/123"
   */
  discussionUrl: string;
  /**
   * Optional comments limit (default: no limit)
   */
  commentsLimit?: number;
  /**
   * Optional fixed height in pixels
   */
  height?: number;
}

/**
 * Telegram Discussion Widget Component
 * 
 * Embeds Telegram comments/discussion widget for blog posts.
 * 
 * @see https://core.telegram.org/widgets/discussion
 */
export const TelegramComments: React.FC<TelegramCommentsProps> = ({
  discussionUrl,
  commentsLimit,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  // Normalize URL: remove https://t.me/ prefix if present
  const normalizedUrl = useMemo(() =>
    discussionUrl.replace(/^https?:\/\/t\.me\//, ''),
    [discussionUrl]
  );

  // Determine initial loading state based on whether we have a URL
  const [loading, setLoading] = useState(!!normalizedUrl);

  useEffect(() => {
    // Capture current ref value for cleanup
    const container = containerRef.current;

    if (!normalizedUrl || !container) {
      return;
    }

    // Clear previous widget
    container.innerHTML = '';

    // Create script element for Telegram widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;

    // Set data attributes
    script.setAttribute('data-telegram-discussion', normalizedUrl);

    // Theme-aware colors matching site design
    // Note: Telegram widget has limited customization options
    if (theme === 'dark') {
      script.setAttribute('data-dark', '1');
      // Cyan accent color matching MiniOS theme
      script.setAttribute('data-color', '22D3EE'); // cyan-400
    } else {
      // Light theme - slightly darker cyan for better contrast
      script.setAttribute('data-color', '0891B2'); // cyan-600
    }

    // Different colors for usernames
    script.setAttribute('data-colorful', '1');

    // Optional: limit comments
    if (commentsLimit && commentsLimit > 0) {
      script.setAttribute('data-comments-limit', String(commentsLimit));
    }

    // Optional: fixed height
    if (height && height > 0) {
      script.setAttribute('data-height', String(height));
    }

    // Handle load events
    script.onload = () => {
      setLoading(false);
    };

    script.onerror = () => {
      setError(t('Failed to load Telegram comments widget'));
      setLoading(false);
    };

    container.appendChild(script);

    // Give the widget some time to render
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      clearTimeout(timeout);
      container.innerHTML = '';
    };
  }, [normalizedUrl, theme, commentsLimit, height, t]);

  // Build full Telegram URL for "View on Telegram" link
  const fullTelegramUrl = discussionUrl.startsWith('http')
    ? discussionUrl
    : `https://t.me/${normalizedUrl}`;

  // Early return if no URL provided
  if (!normalizedUrl) {
    return null;
  }

  return (
    <section className="telegram-comments">
      <div className="telegram-comments-header">
        <h3 className="telegram-comments-title">
          <MessageCircle className="w-5 h-5" />
          {t('Comments')}
        </h3>
        <a
          href={fullTelegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="telegram-comments-link"
        >
          {t('View on Telegram')}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {error && (
        <div className="telegram-comments-error">
          <p>{error}</p>
          <a
            href={fullTelegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="telegram-comments-fallback-link"
          >
            {t('Join discussion on Telegram')}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      <div
        ref={containerRef}
        className={`telegram-comments-widget ${loading ? 'loading' : ''}`}
      />

      {loading && (
        <div className="telegram-comments-loading">
          <div className="telegram-comments-spinner" />
          <span>{t('Loading comments...')}</span>
        </div>
      )}
    </section>
  );
};

export default TelegramComments;
