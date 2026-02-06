import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { Home, Newspaper, ArrowRight, BookOpen } from 'lucide-react';

const NotFound: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <main id="download-view">
            <div className="container">
                <div className="download-card">
                    {/* 404 header */}
                    <div className="download-success">
                        <div className="not-found-code">404</div>
                        <h1>{t('Page Not Found')}</h1>
                        <p className="download-subtitle">
                            {t("The page you're looking for doesn't exist or has been moved.")}
                        </p>
                    </div>

                    {/* Navigation help cards */}
                    <div className="download-help">
                        <div className="help-card">
                            <div className="help-icon help-icon-chat">
                                <Home size={24} />
                            </div>
                            <div className="help-content">
                                <h3>{t('Home')}</h3>
                                <p>{t('Go back to the main page.')}</p>
                            </div>
                            <button onClick={() => navigate('/')} className="help-link">
                                {t('Go Home')} <ArrowRight size={16} />
                            </button>
                        </div>

                        <div className="help-card">
                            <div className="help-icon help-icon-star">
                                <Newspaper size={24} />
                            </div>
                            <div className="help-content">
                                <h3>{t('Blog')}</h3>
                                <p>{t('Read the latest news and updates.')}</p>
                            </div>
                            <button onClick={() => navigate('/blog')} className="help-link">
                                {t('Visit Blog')} <ArrowRight size={16} />
                            </button>
                        </div>

                        <div className="help-card">
                            <div className="help-icon help-icon-issues">
                                <BookOpen size={24} />
                            </div>
                            <div className="help-content">
                                <h3>{t('Documentation')}</h3>
                                <p>{t('Find answers in the documentation.')}</p>
                            </div>
                            <a href="/docs" className="help-link">
                                {t('Open Docs')} <ArrowRight size={16} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default NotFound;
