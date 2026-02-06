import React, { useEffect, useRef, useId, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useBlogPost } from '@/hooks/use-blog';
import { getAssetUrl } from '@/hooks/use-local-data';
import { updateMetaTags, resetMetaTags } from '@/lib/meta';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Tag, AlertCircle, Copy, Check } from 'lucide-react';
import { TelegramComments } from './TelegramComments';
import '@/styles/blog.css';

// Lazy-loaded Mermaid diagram component
// Mermaid is ~1.5MB, so we load it only when needed
const MermaidDiagram: React.FC<{ chart: string }> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const mermaidId = `mermaid-${id.replace(/:/g, '-')}`;
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

// Code block component with copy button
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        {language && <span className="code-block-lang">{language}</span>}
        <button 
          onClick={handleCopy} 
          className="code-block-copy"
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <SyntaxHighlighter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={isDark ? oneDark as any : oneLight as any}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: 'transparent',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { post, loading, error } = useBlogPost(slug || '');

  useEffect(() => {
    if (post) {
      // Update meta tags for SEO and social sharing
      updateMetaTags({
        title: `${post.title} - MiniOS Blog`,
        description: post.excerpt,
        image: post.featuredImage || '/assets/img/og-image.png',
        url: `/blog/${post.slug}`,
        type: 'article',
        author: post.author || 'MiniOS Team',
        publishedTime: post.publishedAt,
        modifiedTime: post.updatedAt,
        tags: post.tags,
      });
    }
    
    // Reset to default meta tags when component unmounts
    return () => {
      resetMetaTags();
    };
  }, [post]);

  // Force scroll to top on mount
  useEffect(() => {
    // Add class to body to disable scroll-snap
    document.body.classList.add('blog-page');
    document.documentElement.classList.add('blog-page');
    
    // Instant scroll to top (bypass smooth scroll)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    return () => {
      document.body.classList.remove('blog-page');
      document.documentElement.classList.remove('blog-page');
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Add/remove loading class on body for header logo animation
  useEffect(() => {
    if (loading) {
      document.body.classList.add('blog-loading-active');
    } else {
      document.body.classList.remove('blog-loading-active');
    }
    return () => {
      document.body.classList.remove('blog-loading-active');
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="blog-post-loading">
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="blog-post-error">
        <AlertCircle size={48} />
        <h2>{t('Post not found')}</h2>
        <p>{error || t('The post you are looking for does not exist.')}</p>
        <Link to="/blog" className="blog-back-btn">
          <ArrowLeft size={20} />
          {t('Back to Blog')}
        </Link>
      </div>
    );
  }

  return (
    <motion.article 
      className="blog-post"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container blog-post-container">
        {/* Back Button */}
        <Link to="/blog" className="blog-back-btn">
          <ArrowLeft size={20} />
          {t('Back to Blog')}
        </Link>

        {/* Header */}
        <header className="blog-post-header">
          <h1 className="blog-post-title">{post.title}</h1>
          
          <div className="blog-post-meta">
            <span className="blog-post-date">
              <Calendar size={16} />
              {formatDate(post.publishedAt)}
            </span>
            
            {post.author && (
              <span className="blog-post-author">
                <User size={16} />
                {post.author}
              </span>
            )}
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="blog-post-tags">
              {post.tags.map(tag => (
                <span key={tag} className="blog-post-tag">
                  <Tag size={14} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="blog-post-featured-image">
            <img src={getAssetUrl(post.featuredImage)} alt={post.title} />
          </div>
        )}

        {/* Content */}
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
                  <CodeBlock language={language} code={codeString} />
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
            {post.content}
          </ReactMarkdown>
        </div>

        {/* Footer - updated date */}
        {post.updatedAt && post.updatedAt !== post.publishedAt && (
          <footer className="blog-post-footer">
            <p className="blog-post-updated">
              {t('Last updated')}: {formatDate(post.updatedAt)}
            </p>
          </footer>
        )}

        {/* Telegram Comments Widget */}
        {post.telegramDiscussion && (
          <TelegramComments discussionUrl={post.telegramDiscussion} />
        )}

        {/* Back to Blog button - always at the bottom */}
        <div className="blog-post-back-bottom">
          <Link to="/blog" className="blog-back-btn-bottom">
            <ArrowLeft size={20} />
            {t('Back to Blog')}
          </Link>
        </div>
      </div>
    </motion.article>
  );
};
