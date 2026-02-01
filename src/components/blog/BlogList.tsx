import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/contexts/LanguageContext';
import { useBlogPosts, useBlogTags } from '@/hooks/use-blog';
import { useContent } from '@/hooks/use-local-data';
import { resetMetaTags } from '@/lib/meta';
import { BlogCard } from './BlogCard';
import { Filter } from 'lucide-react';
import '@/styles/blog.css';

export const BlogList: React.FC = () => {
  const { t } = useTranslation();
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [content] = useContent();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Get blog settings with defaults
  const blogSettings = content?.blog ?? {
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    postsPerPage: 6
  };

  const { posts, loading, hasMore, loadMore } = useBlogPosts({ 
    tag: selectedTag,
    pageSize: blogSettings.postsPerPage
  });
  const { tags, loading: tagsLoading } = useBlogTags();

  // Infinite scroll with Intersection Observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  // Force scroll to top on mount and reset meta tags
  useEffect(() => {
    // Add class to body to disable scroll-snap
    document.body.classList.add('blog-page');
    document.documentElement.classList.add('blog-page');
    
    // Instant scroll to top (bypass smooth scroll)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Reset meta tags to default (blog list doesn't need custom OG tags)
    resetMetaTags();
    
    return () => {
      document.body.classList.remove('blog-page');
      document.documentElement.classList.remove('blog-page');
    };
  }, []);

  // Show minimal loading indicator while fetching
  const isLoading = (loading || tagsLoading) && posts.length === 0;
  
  // Add/remove loading class on body for header logo animation
  useEffect(() => {
    if (isLoading) {
      document.body.classList.add('blog-loading-active');
    } else {
      document.body.classList.remove('blog-loading-active');
    }
    return () => {
      document.body.classList.remove('blog-loading-active');
    };
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="blog-container" style={{ minHeight: '80vh' }}>
        <div className="blog-loading">
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="blog-container"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '80vh' }}
    >
      {/* Tags Filter */}
      {tags.length > 0 && (
        <section className="blog-filters">
          <div className="container">
            <div className="blog-filters-header">
              <Filter size={20} />
              <span>{t('Filter by tag')}</span>
            </div>
            <div className="blog-tags-list">
              <button
                className={`blog-tag-filter ${!selectedTag ? 'active' : ''}`}
                onClick={() => setSelectedTag(undefined)}
              >
                {t('All')}
              </button>
              {tags.map(tag => (
                <button
                  key={tag}
                  className={`blog-tag-filter ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Posts Grid */}
      <section className="blog-posts">
        <div className="container">
          {posts.length === 0 ? (
            <div className="blog-empty">
              <p>{t('No posts found')}</p>
            </div>
          ) : (
            <>
              <div
                className="blog-grid"
                style={{
                  '--blog-cols-desktop': blogSettings.columns.desktop,
                  '--blog-cols-tablet': blogSettings.columns.tablet,
                  '--blog-cols-mobile': blogSettings.columns.mobile,
                } as React.CSSProperties}
              >
                {posts.map(post => (
                  <BlogCard key={post.slug} post={post} />
                ))}
              </div>

              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="blog-load-more-trigger">
                {loading && posts.length > 0 && (
                  <div className="blog-loading-more">
                    <div className="blog-loading-spinner" />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </motion.div>
  );
};
