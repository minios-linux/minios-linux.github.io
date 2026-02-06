import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Check, AlertTriangle, Languages } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface TranslationStats {
  [langCode: string]: {
    total: number;
    translated: number;
    missing: string[];
  };
}

interface SyncResult {
  added: number;
  total: number;
  files: string[];
}

export function TranslationsManager() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<TranslationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedLang, setExpandedLang] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/translations/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch translation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/translations/sync', { method: 'POST' });
      if (response.ok) {
        const result: SyncResult = await response.json();
        if (result.added > 0) {
          toast.success(`${t('Added')} ${result.added} ${t('new keys to translation files')}`, {
            description: result.files.join(', ')
          });
        } else {
          toast.info(t('All translation keys are already present'));
        }
        // Refresh stats
        await fetchStats();
      } else {
        toast.error(t('Failed to sync translations'));
      }
    } catch {
      toast.error('Failed to sync translations');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="p-4">{t('Loading translation stats...')}</div>;
  }

  const languages = stats ? Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0])) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('Translations')}</h2>
          <p className="text-muted-foreground">
            {t('Sync and manage translation keys across all languages')}
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? t('Syncing...') : t('Sync Translations')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
                        {t('How it works')}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>{t('Sync Translations')}</strong> {t('scans all data files (editions, features, config) and extracts translatable strings.')}
          </p>
          <p>
            {t('Missing keys are added to each translation file:')}
          </p>
          <ul className="list-disc list-inside ml-2">
            <li><code>en.json</code> — {t('key value equals the key itself')}</li>
            <li>{t('Other languages')} — {t('marked as')} <code>""</code> ({t('empty string')})</li>
          </ul>
          <p>
            {t('After syncing, edit the translation files in')} <code>public/translations/</code> {t('to add actual translations.')}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {languages.map(([langCode, langStats]) => {
          const percentage = langStats.total > 0 
            ? Math.round((langStats.translated / langStats.total) * 100) 
            : 100;
          const isComplete = percentage === 100;
          const isExpanded = expandedLang === langCode;
          
          return (
            <div key={langCode} className={`translation-card ${isComplete ? 'complete' : 'incomplete'}`}>
              <div className="translation-card-header">
                <div className="translation-card-title">
                  {isComplete ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                  {langCode.toUpperCase()}
                </div>
                <div className="translation-card-stats">
                  {langStats.translated} / {langStats.total} ({percentage}%)
                </div>
              </div>
              
              <div className="translation-progress">
                <div 
                  className={`translation-progress-bar ${isComplete ? 'complete' : 'incomplete'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              {langStats.missing.length > 0 && (
                <>
                  <button 
                    onClick={() => setExpandedLang(isExpanded ? null : langCode)}
                    className="translation-missing-btn"
                  >
                    {isExpanded ? '▼' : '▶'} {langStats.missing.length} {t('missing translations')}
                  </button>
                  
                  {isExpanded && (
                    <div className="translation-missing-list">
                      <ul>
                        {langStats.missing.map((key, i) => (
                          <li key={i} title={key}>
                            {key}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
