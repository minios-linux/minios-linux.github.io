import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Save, X, Eye, FileText, 
  Bold, Italic, Code, Link as LinkIcon, 
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, ImagePlus,
  Globe, EyeOff, Calendar, User, Tag, Strikethrough,
  Check, RefreshCw, AlertCircle, Send, Clock, ChevronDown, ChevronRight, Settings
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ImageUpload } from './ImageUpload';

// Lazy-loaded Mermaid diagram component for preview
// Mermaid is ~1.5MB, so we load it only when needed
const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const mermaidId = `mermaid-preview-${id.replace(/:/g, '-')}`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      if (!chart) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Dynamically import mermaid only when needed
        const mermaid = (await import('mermaid')).default;
        
        if (cancelled) return;
        
        // Initialize with dark theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: 'inherit',
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            padding: 20,
          },
          themeVariables: {
            fontSize: '16px',
          },
        });
        
        // Wait for ref to be available
        if (!containerRef.current) {
          // Retry after a short delay if ref not ready
          await new Promise(resolve => setTimeout(resolve, 50));
          if (cancelled || !containerRef.current) return;
        }
        
        containerRef.current.innerHTML = '';
        const { svg } = await mermaid.render(mermaidId, chart);
        
        if (cancelled) return;
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Mermaid render error:', err);
        setError('Error rendering diagram');
        setLoading(false);
      }
    };
    
    renderDiagram();
    
    return () => {
      cancelled = true;
    };
  }, [chart, mermaidId]);

  if (error) {
    return (
      <div className="mermaid-container mermaid-error">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="mermaid-container">
      {loading && <div className="mermaid-loading"><span>Loading diagram...</span></div>}
      <div ref={containerRef} style={{ display: loading ? 'none' : 'block' }} />
    </div>
  );
};

interface MarkdownEditorProps {
  initialFrontmatter?: {
    title?: string;
    excerpt?: string;
    author?: string;
    publishedAt?: string;
    updatedAt?: string;
    tags?: string[];
    featuredImage?: string;
    published?: boolean;
    telegramDiscussion?: string;
    telegramPostId?: number;
  };
  initialContent?: string;
  initialPreview?: boolean;
  onSave: (frontmatter: Record<string, unknown>, content: string, telegramConfig?: TelegramConfig) => void;
  onCancel: () => void;
  onPreviewChange?: (isPreview: boolean) => void;
}

// Telegram configuration passed to save handler
interface TelegramConfig {
  botToken: string;
  chatId: string;
  siteUrl: string;
  publishToTelegram: boolean;
  delayMinutes: number;
}

export function MarkdownEditor({
  initialFrontmatter,
  initialContent = '',
  initialPreview = false,
  onSave,
  onCancel,
  onPreviewChange
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(initialPreview);

  // Notify parent when preview changes
  useEffect(() => {
    onPreviewChange?.(showPreview);
  }, [showPreview, onPreviewChange]);

  // Helper to get initial values from draft or props
  const getDraftValue = <T,>(propValue: T | undefined, draftKey: string, defaultValue: T): T => {
    if (propValue !== undefined && propValue !== '' && propValue !== null) return propValue;
    if (!initialFrontmatter && !initialContent) {
      try {
        const draft = localStorage.getItem('blog-draft');
        if (draft) {
          const data = JSON.parse(draft);
          return data[draftKey] ?? defaultValue;
        }
      } catch {
        // Ignore parse errors
      }
    }
    return defaultValue;
  };

  // Frontmatter fields - initialize from props or draft
  const [title, setTitle] = useState(() => getDraftValue(initialFrontmatter?.title, 'title', ''));
  const [excerpt, setExcerpt] = useState(() => getDraftValue(initialFrontmatter?.excerpt, 'excerpt', ''));
  const [author, setAuthor] = useState(() => getDraftValue(initialFrontmatter?.author, 'author', ''));
  const [featuredImage, setFeaturedImage] = useState(() => getDraftValue(initialFrontmatter?.featuredImage, 'featuredImage', ''));
  const [tags, setTags] = useState(() => {
    if (initialFrontmatter?.tags) return initialFrontmatter.tags.join(', ');
    return getDraftValue(undefined, 'tags', '');
  });
  const [published, setPublished] = useState(() => getDraftValue(initialFrontmatter?.published, 'published', false));
  
  // Telegram comments field
  const [telegramDiscussion, setTelegramDiscussion] = useState(() => getDraftValue(initialFrontmatter?.telegramDiscussion, 'telegramDiscussion', ''));
  
  // Date fields - store as datetime-local format (YYYY-MM-DDTHH:MM)
  const [publishedAt, setPublishedAt] = useState(() => {
    const initial = initialFrontmatter?.publishedAt;
    if (initial) return initial.slice(0, 16);
    return new Date().toISOString().slice(0, 16);
  });
  const [updatedAt, setUpdatedAt] = useState(() => {
    const initial = initialFrontmatter?.updatedAt;
    if (initial) return initial.slice(0, 16);
    return new Date().toISOString().slice(0, 16);
  });
  
  // Telegram publishing settings (stored in localStorage)
  const [telegramSettingsOpen, setTelegramSettingsOpen] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState(() => localStorage.getItem('telegram-bot-token') || '');
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem('telegram-chat-id') || '');
  const [telegramSiteUrl, setTelegramSiteUrl] = useState(() => localStorage.getItem('telegram-site-url') || 'https://minios.dev');
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [publishToTelegram, setPublishToTelegram] = useState(false);
  const [telegramDelayMinutes, setTelegramDelayMinutes] = useState(0);
  
  // Check if already published to Telegram
  const alreadyPublishedToTelegram = !!initialFrontmatter?.telegramPostId;
  
  // Save Telegram settings to localStorage when they change
  useEffect(() => {
    if (telegramBotToken) localStorage.setItem('telegram-bot-token', telegramBotToken);
    if (telegramChatId) localStorage.setItem('telegram-chat-id', telegramChatId);
    if (telegramSiteUrl) localStorage.setItem('telegram-site-url', telegramSiteUrl);
  }, [telegramBotToken, telegramChatId, telegramSiteUrl]);
  
  // Content
  const [content, setContent] = useState(() => getDraftValue(initialContent || undefined, 'content', ''));

  // Image upload dialog
  const [imageUploadOpen, setImageUploadOpen] = useState(false);

  // Auto-save indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save to localStorage with debounce
  useEffect(() => {
    // Clear any existing timeouts
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

    // Start debounce timer - show "saving" after a brief delay
    const savingTimer = setTimeout(() => {
      setSaveStatus('saving');
    }, 100);

    // Save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(() => {
      clearTimeout(savingTimer);
      localStorage.setItem('blog-draft', JSON.stringify({
        title, excerpt, author, featuredImage, tags, published, content, telegramDiscussion
      }));
      setSaveStatus('saved');
      // Reset to idle after 2 seconds
      idleTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);

    return () => {
      clearTimeout(savingTimer);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [title, excerpt, author, featuredImage, tags, published, content, telegramDiscussion]);

  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    setContent(newText);
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }, [content]);

  // Handle image insertion from upload dialog
  const handleImageInsert = (imagePath: string, altText: string) => {
    const markdownImage = `![${altText}](${imagePath})`;
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const newText = content.substring(0, start) + markdownImage + content.substring(start);
      setContent(newText);
      
      // Move cursor after the inserted image
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + markdownImage.length, start + markdownImage.length);
      }, 0);
    } else {
      // Fallback: append to content
      setContent(prev => prev + '\n' + markdownImage);
    }
  };

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      alert(t('Please enter a title'));
      return;
    }

    const frontmatter: Record<string, unknown> = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      author: author.trim() || undefined,
      publishedAt: new Date(publishedAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      featuredImage: featuredImage.trim() || undefined,
      published,
      // Telegram comments - only include if set
      ...(telegramDiscussion.trim() && { telegramDiscussion: telegramDiscussion.trim() }),
      // Preserve existing telegramPostId
      ...(initialFrontmatter?.telegramPostId && { telegramPostId: initialFrontmatter.telegramPostId })
    };

    // Build Telegram config if publishing is requested
    const telegramConfig: TelegramConfig | undefined = 
      publishToTelegram && published && telegramBotToken && telegramChatId
        ? {
            botToken: telegramBotToken,
            chatId: telegramChatId,
            siteUrl: telegramSiteUrl,
            publishToTelegram: true,
            delayMinutes: telegramDelayMinutes
          }
        : undefined;

    onSave(frontmatter, content, telegramConfig);
    
    // Clear draft
    localStorage.removeItem('blog-draft');
  }, [title, excerpt, author, tags, featuredImage, published, telegramDiscussion, content, initialFrontmatter, onSave, t, publishToTelegram, telegramBotToken, telegramChatId, telegramSiteUrl, telegramDelayMinutes, publishedAt, updatedAt]);

  // Keyboard shortcuts for formatting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts in edit mode when content textarea is focused
      const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
      if (showPreview || document.activeElement !== textarea) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'b': // Bold
            e.preventDefault();
            insertMarkdown('**', '**');
            break;
          case 'i': // Italic
            e.preventDefault();
            insertMarkdown('*', '*');
            break;
          case 'k': // Link
            e.preventDefault();
            insertMarkdown('[', '](url)');
            break;
          case '`': // Inline code
            e.preventDefault();
            insertMarkdown('`', '`');
            break;
          case 's': // Save
            e.preventDefault();
            handleSave();
            break;
        }
      }

      // Shift + Cmd/Ctrl shortcuts
      if (modKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'x': // Strikethrough
            e.preventDefault();
            insertMarkdown('~~', '~~');
            break;
          case 'k': // Code block
            e.preventDefault();
            insertMarkdown('```\n', '\n```');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showPreview, insertMarkdown, handleSave]);

  return (
    <div className="flex flex-col h-full max-h-[calc(95vh-120px)] min-h-[500px]">
      {/* Show Preview button - only in edit mode, positioned next to close button */}
      {!showPreview && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(true)}
          className="gap-2 preview-toggle-btn"
        >
          <Eye className="w-4 h-4" />
          {t('Show Preview')}
        </Button>
      )}

      {/* Toolbar - hidden in preview mode */}
      {!showPreview && (
      <div className="border-b p-4 space-y-4">
        {/* Title & Status */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('Post title...')}
              className="text-xl font-bold border-0 px-0 focus-visible:ring-0"
            />
          </div>
          <Button
            type="button"
            variant={published ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPublished(!published)}
            className="gap-2"
          >
            {published ? (
              <>
                <Globe className="w-4 h-4" />
                {t('Published')}
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                {t('Draft')}
              </>
            )}
          </Button>
        </div>

        {/* Metadata Grid */}
        <div className="space-y-4">
          {/* Excerpt */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('Excerpt')}</Label>
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder={t('Brief description for post cards and SEO...')}
              rows={3}
              className="text-sm min-h-[80px]"
            />
          </div>
          {/* Author, Tags, Featured Image */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('Author')}</Label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={t('Author name')}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('Tags (comma-separated)')}</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="linux, tutorial, guide"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('Featured Image URL')}</Label>
              <Input
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                placeholder="/assets/img/post-image.jpg"
                className="text-sm font-mono"
              />
            </div>
          </div>
          {/* Published At, Updated At */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('Published At')}</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="text-sm"
                  style={{ flex: 1 }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPublishedAt(new Date().toISOString().slice(0, 16))}
                  title={t('Reset to current time')}
                  className="shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('Updated At')}</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Input
                  type="datetime-local"
                  value={updatedAt}
                  onChange={(e) => setUpdatedAt(e.target.value)}
                  className="text-sm"
                  style={{ flex: 1 }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setUpdatedAt(new Date().toISOString().slice(0, 16))}
                  title={t('Reset to current time')}
                  className="shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          {/* Telegram Section */}
          <div className="pt-4 border-t">
              {/* Collapsible Telegram Settings Header */}
              <button
                type="button"
                onClick={() => setTelegramSettingsOpen(!telegramSettingsOpen)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full h-9 pl-2"
              >
                {telegramSettingsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Settings className="w-4 h-4" />
                <span>{t('Telegram Publishing Settings')}</span>
                {telegramBotToken && telegramChatId && (
                  <Check className="w-4 h-4 text-green-500 ml-1" />
                )}
              </button>
              
              {/* Telegram Settings (collapsible) */}
              {telegramSettingsOpen && (
                <div className="grid grid-cols-3 gap-3 pl-5 mt-3 animate-in slide-in-from-top-1">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">{t('Bot Token')}</Label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Input
                        type={showTelegramToken ? 'text' : 'password'}
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        placeholder="123456:ABC-DEF..."
                        style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
                        className="text-sm font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowTelegramToken(!showTelegramToken)}
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flexShrink: 0 }}
                      >
                        {showTelegramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('Chat ID')}</Label>
                    <Input
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="@channel or -100123..."
                      className="text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('Site URL')}</Label>
                    <Input
                      value={telegramSiteUrl}
                      onChange={(e) => setTelegramSiteUrl(e.target.value)}
                      placeholder="https://minios.dev"
                      className="text-sm font-mono"
                    />
                  </div>
                </div>
              )}
              
              {/* Telegram Discussion URL (manual, for existing posts) */}
              <div className="space-y-1 mt-4">
                <Label className="text-xs text-muted-foreground">{t('Telegram Discussion URL')} <span className="opacity-50">({t('auto-filled on publish')})</span></Label>
                <Input
                  value={telegramDiscussion}
                  onChange={(e) => setTelegramDiscussion(e.target.value)}
                  placeholder="https://t.me/channel/123"
                  className="text-sm font-mono"
                />
              </div>
              
              {/* Publish to Telegram checkbox + delay */}
              {published && (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    marginTop: '1rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={publishToTelegram}
                      onChange={(e) => setPublishToTelegram(e.target.checked)}
                      disabled={!telegramBotToken || !telegramChatId}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <Send style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                    <span>{alreadyPublishedToTelegram ? t('Re-publish to Telegram') : t('Publish to Telegram')}</span>
                  </label>
                  
                  {publishToTelegram && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Clock style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                      <input
                        type="number"
                        min="0"
                        max="525600"
                        value={telegramDelayMinutes}
                        onChange={(e) => setTelegramDelayMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        className="telegram-delay-input"
                      />
                      <span>{t('min')}</span>
                    </div>
                  )}
                  
                  {!telegramBotToken && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({t('Configure bot token above')})
                    </span>
                  )}
                </div>
              )}
            </div>
        </div>

        {/* Markdown Toolbar */}
        <div className="markdown-toolbar flex items-center gap-1 pt-2 border-t flex-nowrap overflow-x-auto">
          {/* Headings */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('# ', '')}
            title={t('Heading 1')}
          >
            <Heading1 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('## ', '')}
            title={t('Heading 2')}
          >
            <Heading2 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('### ', '')}
            title={t('Heading 3')}
          >
            <Heading3 className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          {/* Text formatting */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('**', '**')}
            title={`${t('Bold')} (Ctrl+B)`}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('*', '*')}
            title={`${t('Italic')} (Ctrl+I)`}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('~~', '~~')}
            title={`${t('Strikethrough')} (Ctrl+Shift+X)`}
          >
            <Strikethrough className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('`', '`')}
            title={`${t('Inline Code')} (Ctrl+\`)`}
          >
            <Code className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          {/* Links and media */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('[', '](url)')}
            title={`${t('Link')} (Ctrl+K)`}
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setImageUploadOpen(true)}
            title={t('Insert Image')}
          >
            <ImagePlus className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          {/* Lists and blocks */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('- ', '')}
            title={t('Bullet List')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('1. ', '')}
            title={t('Numbered List')}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('> ', '')}
            title={t('Blockquote')}
          >
            <Quote className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => insertMarkdown('```\n', '\n```')}
            title={`${t('Code Block')} (Ctrl+Shift+K)`}
          >
            <FileText className="w-4 h-4" />
          </Button>
        </div>
      </div>
      )}

      {/* Editor / Preview Area */}
      <div className="flex-1 flex overflow-hidden min-h-[300px] mt-2">
        {/* Editor - hidden in preview mode */}
        {!showPreview && (
        <div className="w-full flex flex-col">
          <Textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('Write your blog post in Markdown...')}
            className="flex-1 resize-none border-0 focus-visible:ring-0 font-mono text-sm p-4 rounded-none"
          />
        </div>
        )}

        {/* Preview - full width */}
        {showPreview && (
          <div className="w-full flex flex-col">
            {/* Hide Preview button - positioned next to close button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(false)}
              className="gap-2 preview-toggle-btn"
            >
              <Eye className="w-4 h-4" />
              {t('Hide Preview')}
            </Button>
            {/* Preview content - matches blog post styling exactly */}
            <div className="flex-1 overflow-auto bg-background">
              <div className="container blog-post-container">
                {/* Header */}
                <header className="blog-post-header">
                  <h1 className="blog-post-title">
                    {title || t('Untitled Post')}
                  </h1>
                  
                  <div className="blog-post-meta">
                    <span className="blog-post-date">
                      <Calendar className="w-4 h-4" />
                      {new Date().toLocaleDateString()}
                    </span>
                    {author && (
                      <span className="blog-post-author">
                        <User className="w-4 h-4" />
                        {author}
                      </span>
                    )}
                  </div>

                  {tags && (
                    <div className="blog-post-tags">
                      {tags.split(',').map(tag => tag.trim()).filter(Boolean).map((tag) => (
                        <span key={tag} className="blog-post-tag">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </header>

                {/* Featured Image */}
                {featuredImage && (
                  <div className="blog-post-featured-image">
                    <img src={featuredImage} alt={title} />
                  </div>
                )}

                {/* Content - using blog post styles */}
                <div className="blog-post-content prose">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      code({ className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        const inline = props.inline;
                        const codeString = String(children).replace(/\n$/, '');
                        
                        // Handle Mermaid diagrams
                        if (language === 'mermaid') {
                          return <MermaidDiagram chart={codeString} />;
                        }
                        
                        return !inline && match ? (
                          <div className="code-block">
                            {language && (
                              <span className="code-block-lang">{language}</span>
                            )}
                            <SyntaxHighlighter
                              style={oneDark}
                              language={language}
                              PreTag="div"
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                      table({ children }) {
                        return (
                          <div className="table-wrapper">
                            <table>{children}</table>
                          </div>
                        );
                      }
                    }}
                  >
                    {content || t('*No content yet...*')}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t p-4 flex items-center gap-4 bg-muted/30">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          {t('Cancel')}
        </Button>
        <Button type="button" onClick={handleSave} className="gap-2" title={`${t('Save Post')} (Ctrl+S)`}>
          <Save className="w-4 h-4" />
          {t('Save Post')}
        </Button>
        <span className="text-[10px] flex items-center gap-1 ml-auto" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }}>
          {saveStatus === 'saving' && (
            <>
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              {t('Saving...')}
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check className="w-2.5 h-2.5" />
              {t('Draft saved')}
            </>
          )}
        </span>
      </div>

      {/* Image Upload Dialog */}
      <ImageUpload
        open={imageUploadOpen}
        onOpenChange={setImageUploadOpen}
        onImageSelect={handleImageInsert}
      />
    </div>
  );
}
