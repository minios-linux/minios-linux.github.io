import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/contexts/LanguageContext';
import { useBlogPosts, useBlogTags } from '@/hooks/use-blog';
import { useContent } from '@/hooks/use-local-data';
import { resetMetaTags } from '@/lib/meta';
import { BlogCard } from './BlogCard';
import { Search, Tag, ChevronDown, Check, X } from 'lucide-react';
import '@/styles/blog.css';

export const BlogList: React.FC = () => {
  const { t } = useTranslation();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [content] = useContent();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Get blog settings with defaults
  const blogSettings = content?.blog ?? {
    columns: { desktop: 3, tablet: 2, mobile: 1 },
    postsPerPage: 6
  };

  // Use first selected tag for API filter (or undefined for all)
  const { posts, loading, hasMore, loadMore } = useBlogPosts({
    tag: selectedTags.length === 1 ? selectedTags[0] : undefined,
    pageSize: blogSettings.postsPerPage
  });
  const { tags, loading: tagsLoading } = useBlogTags();

  // Filter posts by search query and multiple tags
  const filteredPosts = posts.filter(post => {
    // Filter by search
    const matchesSearch = !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    // Filter by selected tags (post must have ALL selected tags)
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.every(selectedTag => post.tags?.includes(selectedTag));

    return matchesSearch && matchesTags;
  });

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Clear all selected tags
  const clearTags = () => {
    setSelectedTags([]);
  };

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

  // Close tag dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Force scroll to top on mount and reset meta tags
  useEffect(() => {
    // Instant scroll to top (bypass smooth scroll)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Reset meta tags to default (blog list doesn't need custom OG tags)
    resetMetaTags();
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
      {/* Search and Tag Filter Bar */}
      <section className="blog-filters">
        <div className="container">
          <div className="blog-toolbar">
            {/* Search Input */}
            <div className="blog-search">
              <Search size={18} className="blog-search-icon" />
              <input
                type="text"
                placeholder={t('Search posts...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="blog-search-input"
              />
              {searchQuery && (
                <button
                  className="blog-search-clear"
                  onClick={() => setSearchQuery('')}
                  title={t('Clear search')}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Tag Selector Dropdown */}
            {tags.length > 0 && (
              <div className="blog-tag-selector" ref={tagDropdownRef}>
                <button
                  className={`blog-tag-trigger ${tagDropdownOpen ? 'open' : ''} ${selectedTags.length > 0 ? 'has-value' : ''}`}
                  onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                >
                  <Tag size={16} />
                  <span>
                    {selectedTags.length === 0
                      ? t('All tags')
                      : selectedTags.length === 1
                        ? selectedTags[0]
                        : `${selectedTags.length} ${t('tags')}`}
                  </span>
                  <ChevronDown size={16} className={`blog-tag-chevron ${tagDropdownOpen ? 'open' : ''}`} />
                </button>

                {tagDropdownOpen && (
                  <div className="blog-tag-dropdown">
                    {selectedTags.length > 0 && (
                      <button
                        className="blog-tag-option blog-tag-clear"
                        onClick={clearTags}
                      >
                        <span>{t('Clear all')}</span>
                        <X size={16} />
                      </button>
                    )}
                    {tags.map(tag => (
                      <button
                        key={tag}
                        className={`blog-tag-option ${selectedTags.includes(tag) ? 'active' : ''}`}
                        onClick={() => toggleTag(tag)}
                      >
                        <span>{tag}</span>
                        {selectedTags.includes(tag) && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Tags Pills */}
          {selectedTags.length > 0 && (
            <div className="blog-selected-tags">
              {selectedTags.map(tag => (
                <button
                  key={tag}
                  className="blog-selected-tag"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  <X size={14} />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Posts Grid */}
      <section className="blog-posts">
        <div className="container">
          {filteredPosts.length === 0 ? (
            <div className="blog-empty">
              <p>{searchQuery || selectedTags.length > 0 ? t('No posts match your filters') : t('No posts found')}</p>
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
                {filteredPosts.map(post => (
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
