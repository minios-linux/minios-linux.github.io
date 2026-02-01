import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, Sparkles, RefreshCw, Languages, FileText, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

type TranslationStatus = 'missing' | 'ok' | 'outdated';

interface BlogPostTranslation {
  slug: string;
  title: string;
  published: boolean;
  updatedAt?: string;
  translations: Record<string, TranslationStatus>;
}

interface LanguageMeta {
  code: string;
  name: string;
  flag: string;
}

interface BlogTranslationEditorProps {
  onTranslatePost: (
    sourceContent: string,
    targetLang: string,
    onProgress?: (progress: string) => void
  ) => Promise<string>;
}

export function BlogTranslationEditor({ 
  onTranslatePost 
}: BlogTranslationEditorProps) {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<BlogPostTranslation[]>([]);
  const [languages, setLanguages] = useState<LanguageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLang, setSelectedLang] = useState<string>('');
  const [translatingSlug, setTranslatingSlug] = useState<string | null>(null);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [translationProgress, setTranslationProgress] = useState('');

  // Load blog translation status
  const loadTranslations = useCallback(async () => {
    try {
      const response = await fetch('/api/blog/translations');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPosts(data.posts || []);
      setLanguages(data.languages || []);
      if (!selectedLang && data.languages?.length > 0) {
        setSelectedLang(data.languages[0].code);
      }
    } catch (error) {
      console.error('Failed to load blog translations:', error);
      toast.error(t('Failed to load blog translations'));
    } finally {
      setLoading(false);
    }
  }, [selectedLang, t]);

  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  // Translate a single post
  const handleTranslatePost = async (slug: string) => {
    if (!selectedLang) {
      toast.error(t('Please select a target language'));
      return;
    }

    setTranslatingSlug(slug);
    setTranslationProgress(t('Loading post...'));

    try {
      // Fetch the original English post
      const postResponse = await fetch(`/api/blog/post/${slug}`);
      if (!postResponse.ok) throw new Error('Failed to fetch post');
      const post = await postResponse.json();

      // Build content to translate (title, excerpt, content)
      const sourceContent = JSON.stringify({
        title: post.title,
        excerpt: post.excerpt,
        content: post.content
      }, null, 2);

      const targetLangName = languages.find(l => l.code === selectedLang)?.name || selectedLang;
      
      setTranslationProgress(t('Translating to {{lang}}...').replace('{{lang}}', targetLangName));

      // Use the parent's translation function
      const translatedContent = await onTranslatePost(
        sourceContent,
        targetLangName,
        setTranslationProgress
      );

      // Parse the translated JSON
      let translated: { title?: string; excerpt?: string; content?: string };
      try {
        // First, try to parse the response directly as JSON
        let jsonStr = translatedContent.trim();
        console.log('[Blog Translate] Raw AI response length:', jsonStr.length);
        console.log('[Blog Translate] Raw AI response start:', jsonStr.substring(0, 300));
        console.log('[Blog Translate] Raw AI response end:', jsonStr.substring(Math.max(0, jsonStr.length - 200)));
        
        // Only try to extract from markdown code blocks if the response STARTS with a code block
        // This prevents matching code blocks that are INSIDE the JSON content
        if (jsonStr.startsWith('```')) {
          const codeBlockMatch = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim();
            console.log('[Blog Translate] Extracted from code block');
          }
        }
        
        // Try direct JSON parse first - this gives better error messages
        try {
          translated = JSON.parse(jsonStr);
          console.log('[Blog Translate] JSON parse succeeded');
        } catch (directParseError) {
          console.log('[Blog Translate] Direct parse failed:', (directParseError as Error).message);
          
          // Try to find JSON object with regex (match from first { to last })
          const jsonMatch = jsonStr.match(/^\s*(\{[\s\S]*\})\s*$/);
          if (jsonMatch) {
            try {
              translated = JSON.parse(jsonMatch[1]);
              console.log('[Blog Translate] Regex extraction succeeded');
            } catch (regexParseError) {
              console.error('[Blog Translate] Regex parse failed:', (regexParseError as Error).message);
              throw regexParseError;
            }
          } else {
            // Check if response looks like incomplete JSON (starts with { but doesn't end with })
            if (jsonStr.startsWith('{') && !jsonStr.endsWith('}')) {
              console.error('[Blog Translate] Response appears truncated');
              throw new Error('AI response appears truncated. Try increasing timeout or the response may exceed token limits.');
            }
            console.error('[Blog Translate] No JSON pattern found in response');
            throw new Error('No JSON found in response');
          }
        }
      } catch (parseError) {
        console.error('Failed to parse translation:', parseError);
        console.error('Full response was:', translatedContent);
        toast.error(t('Failed to parse translation response'));
        return;
      }

      setTranslationProgress(t('Saving translation...'));

      // Save the translated post
      const saveResponse = await fetch('/__save-blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          frontmatter: {
            title: translated.title || post.title,
            excerpt: translated.excerpt || post.excerpt,
            author: post.author,
            publishedAt: post.publishedAt,
            updatedAt: new Date().toISOString(),
            tags: post.tags,
            featuredImage: post.featuredImage,
            published: post.published
          },
          content: translated.content || post.content,
          lang: selectedLang
        })
      });

      if (!saveResponse.ok) throw new Error('Failed to save translation');

      toast.success(t('Post translated to {{lang}}').replace('{{lang}}', targetLangName));
      loadTranslations();
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(t('Translation failed: {{error}}').replace('{{error}}', (error as Error).message));
    } finally {
      setTranslatingSlug(null);
      setTranslationProgress('');
    }
  };

  // Translate all missing posts for selected language
  const handleTranslateAll = async () => {
    if (!selectedLang) {
      toast.error(t('Please select a target language'));
      return;
    }

    const missingPosts = posts.filter(p => !p.translations[selectedLang] && p.published);
    if (missingPosts.length === 0) {
      toast.info(t('All posts are already translated'));
      return;
    }

    setTranslatingAll(true);
    const targetLangName = languages.find(l => l.code === selectedLang)?.name || selectedLang;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < missingPosts.length; i++) {
      const post = missingPosts[i];
      setTranslationProgress(`${targetLangName}: ${i + 1}/${missingPosts.length} - ${post.title.substring(0, 30)}...`);

      try {
        // Fetch the original English post
        const postResponse = await fetch(`/api/blog/post/${post.slug}`);
        if (!postResponse.ok) throw new Error('Failed to fetch post');
        const fullPost = await postResponse.json();

        // Build content to translate
        const sourceContent = JSON.stringify({
          title: fullPost.title,
          excerpt: fullPost.excerpt,
          content: fullPost.content
        }, null, 2);

        // Translate
        const translatedContent = await onTranslatePost(
          sourceContent,
          targetLangName
        );

        // Parse
        let translated: { title?: string; excerpt?: string; content?: string };
        try {
          let jsonStr = translatedContent.trim();
          // Only extract from code blocks if response starts with ```
          if (jsonStr.startsWith('```')) {
            const codeBlockMatch = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
              jsonStr = codeBlockMatch[1].trim();
            }
          }
          // Try direct parse first
          try {
            translated = JSON.parse(jsonStr);
          } catch {
            // Fallback: match from first { to last }
            const jsonMatch = jsonStr.match(/^\s*(\{[\s\S]*\})\s*$/);
            if (jsonMatch) {
              translated = JSON.parse(jsonMatch[1]);
            } else {
              console.error(`[Blog Translate] No JSON for ${post.slug}:`, translatedContent.substring(0, 200));
              throw new Error('No JSON found');
            }
          }
        } catch {
          console.error(`Failed to parse translation for ${post.slug}`);
          failCount++;
          continue;
        }

        // Save
        await fetch('/__save-blog-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: post.slug,
            frontmatter: {
              title: translated.title || fullPost.title,
              excerpt: translated.excerpt || fullPost.excerpt,
              author: fullPost.author,
              publishedAt: fullPost.publishedAt,
              updatedAt: new Date().toISOString(),
              tags: fullPost.tags,
              featuredImage: fullPost.featuredImage,
              published: fullPost.published
            },
            content: translated.content || fullPost.content,
            lang: selectedLang
          })
        });

        successCount++;

        // Small delay between posts
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to translate ${post.slug}:`, error);
        failCount++;
      }
    }

    setTranslatingAll(false);
    setTranslationProgress('');
    loadTranslations();

    if (failCount === 0) {
      toast.success(t('Translated {{count}} posts').replace('{{count}}', String(successCount)));
    } else {
      toast.warning(t('Translated {{success}}, failed {{fail}}')
        .replace('{{success}}', String(successCount))
        .replace('{{fail}}', String(failCount)));
    }
  };

  // Count translations for selected language
  const getStatusCounts = useCallback(() => {
    const published = posts.filter(p => p.published);
    let ok = 0, outdated = 0, missing = 0;
    for (const p of published) {
      const status = p.translations[selectedLang];
      if (status === 'ok') ok++;
      else if (status === 'outdated') outdated++;
      else missing++;
    }
    return { ok, outdated, missing, total: published.length };
  }, [posts, selectedLang]);

  const statusCounts = getStatusCounts();
  const totalPublished = statusCounts.total;
  const translatedCount = statusCounts.ok + statusCounts.outdated;
  const missingCount = statusCounts.missing;
  const outdatedCount = statusCounts.outdated;

  // Calculate per-language stats for dropdown
  const getLanguageStats = useCallback((langCode: string) => {
    const published = posts.filter(p => p.published);
    let ok = 0, outdated = 0;
    for (const p of published) {
      const status = p.translations[langCode];
      if (status === 'ok') ok++;
      else if (status === 'outdated') outdated++;
    }
    return { translated: ok, outdated, total: published.length };
  }, [posts]);

  // Translate all posts to ALL languages
  const handleTranslateAllLanguages = async () => {
    const publishedPosts = posts.filter(p => p.published);
    if (publishedPosts.length === 0) {
      toast.info(t('No published posts to translate'));
      return;
    }

    setTranslatingAll(true);
    let totalSuccess = 0;
    let totalFail = 0;

    for (const lang of languages) {
      const missingForLang = publishedPosts.filter(p => !p.translations[lang.code]);
      if (missingForLang.length === 0) continue;

      for (let i = 0; i < missingForLang.length; i++) {
        const post = missingForLang[i];
        setTranslationProgress(`${lang.name}: ${i + 1}/${missingForLang.length} - ${post.title.substring(0, 25)}...`);

        try {
          const postResponse = await fetch(`/api/blog/post/${post.slug}`);
          if (!postResponse.ok) throw new Error('Failed to fetch post');
          const fullPost = await postResponse.json();

          const sourceContent = JSON.stringify({
            title: fullPost.title,
            excerpt: fullPost.excerpt,
            content: fullPost.content
          }, null, 2);

          const translatedContent = await onTranslatePost(sourceContent, lang.name);

          let translated: { title?: string; excerpt?: string; content?: string };
          try {
            let jsonStr = translatedContent.trim();
            // Only extract from code blocks if response starts with ```
            if (jsonStr.startsWith('```')) {
              const codeBlockMatch = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```/);
              if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
            }
            // Try direct parse first
            try {
              translated = JSON.parse(jsonStr);
            } catch {
              // Fallback: match from first { to last }
              const jsonMatch = jsonStr.match(/^\s*(\{[\s\S]*\})\s*$/);
              if (jsonMatch) {
                translated = JSON.parse(jsonMatch[1]);
              } else {
                console.error(`[Blog Translate] No JSON for ${post.slug} to ${lang.code}:`, translatedContent.substring(0, 200));
                throw new Error('No JSON found');
              }
            }
          } catch {
            console.error(`Failed to parse translation for ${post.slug} to ${lang.code}`);
            totalFail++;
            continue;
          }

          await fetch('/__save-blog-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug: post.slug,
              frontmatter: {
                title: translated.title || fullPost.title,
                excerpt: translated.excerpt || fullPost.excerpt,
                author: fullPost.author,
                publishedAt: fullPost.publishedAt,
                updatedAt: new Date().toISOString(),
                tags: fullPost.tags,
                featuredImage: fullPost.featuredImage,
                published: fullPost.published
              },
              content: translated.content || fullPost.content,
              lang: lang.code
            })
          });

          totalSuccess++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to translate ${post.slug} to ${lang.code}:`, error);
          totalFail++;
        }
      }
    }

    setTranslatingAll(false);
    setTranslationProgress('');
    loadTranslations();

    if (totalFail === 0) {
      toast.success(t('Translated {{count}} posts').replace('{{count}}', String(totalSuccess)));
    } else {
      toast.warning(t('Translated {{success}}, failed {{fail}}')
        .replace('{{success}}', String(totalSuccess))
        .replace('{{fail}}', String(totalFail)));
    }
  };

  // Translation skeleton component
  const TranslationSkeleton = () => (
    <div className="admin-skeleton-content">
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div className="skeleton-box" style={{ width: 256, height: 40, borderRadius: 6 }} />
        <div className="skeleton-box" style={{ width: 120, height: 40, borderRadius: 6 }} />
      </div>
      <div className="admin-skeleton-card">
        <div className="admin-skeleton-card-body">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="skeleton-box" style={{ width: '40%', height: 20, borderRadius: 4 }} />
              <div className="skeleton-box" style={{ width: 80, height: 24, borderRadius: 12 }} />
              <div className="skeleton-box" style={{ width: 100, height: 32, borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (posts.length === 0 && !loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('No blog posts to translate')}</p>
        <p className="text-sm mt-2">{t('Create some blog posts first in the Blog section')}</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <TranslationSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
      {/* Language selector and actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <SearchableSelect
          value={selectedLang}
          onChange={setSelectedLang}
          options={languages.map(lang => {
            const stats = getLanguageStats(lang.code);
            const pct = stats.total > 0 ? Math.round((stats.translated / stats.total) * 100) : 0;
            const outdatedLabel = stats.outdated > 0 ? ` [${stats.outdated} outdated]` : '';
            return {
              value: lang.code,
              label: `${lang.flag} ${lang.name} (${pct}%)${outdatedLabel}`,
            };
          })}
          placeholder={t('Select target language')}
          searchPlaceholder={t('Search languages...')}
          className="w-64"
        />

        <Button
          variant="outline"
          size="icon"
          onClick={loadTranslations}
          title={t('Refresh')}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        <div className="ml-auto text-sm text-muted-foreground">
          {translatedCount}/{totalPublished} {t('translated')}
          {outdatedCount > 0 && (
            <span className="text-orange-500 ml-2">({outdatedCount} {t('outdated')})</span>
          )}
          {missingCount > 0 && (
            <span className="text-yellow-500 ml-2">({missingCount} {t('missing')})</span>
          )}
        </div>
      </div>

      {/* Translate buttons */}
      <div className="flex items-center gap-4 flex-wrap">
        {selectedLang && missingCount > 0 && (
          <button
            type="button"
            onClick={handleTranslateAll}
            disabled={translatingAll || translatingSlug !== null}
            className="ai-translate-btn"
          >
            <Sparkles className="w-4 h-4" />
            {translatingAll 
              ? translationProgress 
              : `${t('Translate')} ${missingCount} ${t('missing posts')}`}
          </button>
        )}

        <button
          type="button"
          onClick={handleTranslateAllLanguages}
          disabled={translatingAll || translatingSlug !== null}
          className="ai-translate-all-btn"
        >
          <Languages className="w-4 h-4" />
          {t('Translate All Languages')}
        </button>
      </div>

      {/* Posts list */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[500px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium w-8"></th>
                <th className="text-left p-3 font-medium">{t('Post Title')}</th>
                <th className="text-left p-3 font-medium w-24">{t('Status')}</th>
                <th className="text-right p-3 font-medium w-32">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(post => {
                const status = post.translations[selectedLang] || 'missing';
                const isTranslating = translatingSlug === post.slug;

                return (
                  <tr key={post.slug} className="border-t">
                    <td className="p-3">
                      {status === 'ok' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : status === 'outdated' ? (
                        <Clock className="w-4 h-4 text-orange-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{post.title}</span>
                        {!post.published && (
                          <Badge variant="secondary" className="text-xs">
                            {t('Draft')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {post.slug}
                      </div>
                    </td>
                    <td className="p-3">
                      {status === 'ok' ? (
                        <Badge variant="default" className="text-xs">
                          {t('Translated')}
                        </Badge>
                      ) : status === 'outdated' ? (
                        <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                          {t('Outdated')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t('Not translated')}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTranslatePost(post.slug)}
                        disabled={isTranslating || translatingAll || !selectedLang}
                        className="gap-2"
                      >
                        {isTranslating ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            {t('Translating...')}
                          </>
                        ) : (
                          <>
                            <Languages className="w-3 h-3" />
                            {status === 'ok' ? t('Re-translate') : status === 'outdated' ? t('Update') : t('Translate')}
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-2 text-center text-xs text-muted-foreground bg-muted/30 border-t">
          {posts.length} {t('blog posts')} | {languages.length} {t('languages')}
        </div>
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
