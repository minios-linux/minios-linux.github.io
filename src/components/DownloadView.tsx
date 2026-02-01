import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useContent } from '@/hooks/use-local-data';
import { MessageCircle, Bug, Star, ArrowRight } from 'lucide-react';

interface DownloadViewProps {
  downloadUrl: string;
}

const DownloadView: React.FC<DownloadViewProps> = ({ downloadUrl }) => {
  const { t } = useTranslation();
  const [content] = useContent();

  const support = content.thankYouPage.support;

  // Derive issues URL from github URL
  const issuesUrl = support.githubUrl ? `${support.githubUrl}/issues` : '';

  return (
    <main id="download-view">
      <div className="container">
        <div className="download-card">
          {/* Success header */}
          <div className="download-success">
            <h1>{t('Thank you for downloading MiniOS!')}</h1>
            <p className="download-subtitle">
              {t('Your download should start automatically.')}
              {' '}
              <a href={downloadUrl} className="link-accent">
                {t('Click here')}
              </a>
              {' '}
              {t('if it does not.')}
            </p>
          </div>
          
          {/* Help section */}
          <div className="download-help">
            <div className="help-card">
              <div className="help-icon help-icon-issues">
                <Bug size={24} />
              </div>
              <div className="help-content">
                <h3>{t('Found a bug?')}</h3>
                <p>{t('Report issues on GitHub to help us improve MiniOS.')}</p>
              </div>
              <a href={issuesUrl} target="_blank" rel="noreferrer" className="help-link">
                {t('Create Issue')} <ArrowRight size={16} />
              </a>
            </div>
            
            <div className="help-card">
              <div className="help-icon help-icon-chat">
                <MessageCircle size={24} />
              </div>
              <div className="help-content">
                <h3>{t('Have questions?')}</h3>
                <p>{t('Join our community chat for help and discussions.')}</p>
              </div>
              <a href={support.telegramUrl} target="_blank" rel="noreferrer" className="help-link">
                {t('Join Chat')} <ArrowRight size={16} />
              </a>
            </div>
            
            <div className="help-card">
              <div className="help-icon help-icon-star">
                <Star size={24} />
              </div>
              <div className="help-content">
                <h3>{t('Like MiniOS?')}</h3>
                <p>{t('Star us on GitHub to show your support.')}</p>
              </div>
              <a href={support.githubUrl} target="_blank" rel="noreferrer" className="help-link">
                {t('Star on GitHub')} <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default DownloadView;
