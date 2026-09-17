import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const TelegramButton: React.FC = () => {
  const { t } = useTranslation();
  const label = t('View on Telegram');

  return (
    <a
      className="telegram-fab"
      href="https://t.me/minios_news"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
    >
      <svg
        className="telegram-fab-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M21.6 2.4 2.9 9.7c-1.3.5-1.3 1.3-.2 1.6l4.8 1.5 1.8 5.5c.2.6.1.8.8.8.5 0 .8-.2 1-.4l2.3-2.2 4.8 3.5c.9.5 1.5.3 1.8-.8l3.1-14.7c.4-1.5-.5-2.2-1.5-1.7ZM9.3 12.5l9.4-5.9c.5-.3.9-.1.6.2l-7.7 7-0.3 3.3-2-4.6Z" />
      </svg>
    </a>
  );
};

export default TelegramButton;
