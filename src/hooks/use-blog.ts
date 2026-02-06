import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import type { BlogPost } from '@/lib/types';
import { isDev } from './use-local-data';

// Get base URL for assets
const getBaseUrl = () => import.meta.env.BASE_URL || '/';

// List posts with "Load More" pagination
export function useBlogPosts(options?: {
  tag?: string;
  pageSize?: number;
}) {
  const { language } = useTranslation();
  const [posts, setPosts] = useState<Omit<BlogPost, 'content'>[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Omit<BlogPost, 'content'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = options?.pageSize || 9;

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        let data: { posts: BlogPost[] };
        
        if (isDev()) {
          // In dev mode, use API
          const params = new URLSearchParams();
          if (options?.tag) params.append('tag', options.tag);
          params.append('lang', language);
          const response = await fetch(`/api/blog/posts?${params}`);
          if (!response.ok) throw new Error('Failed to fetch posts');
          data = await response.json();
        } else {
          // In production, use static JSON with language suffix
          const langSuffix = language === 'en' ? '' : `.${language}`;
          const response = await fetch(`${getBaseUrl()}data/blog/posts${langSuffix}.json`);
          if (!response.ok) {
            // Fallback to English if translation not available
            const fallbackResponse = await fetch(`${getBaseUrl()}data/blog/posts.json`);
            if (!fallbackResponse.ok) throw new Error('Failed to fetch posts');
            data = await fallbackResponse.json();
          } else {
            data = await response.json();
          }
        }
        
        let filteredPosts = isDev() 
          ? data.posts 
          : data.posts.filter((p: BlogPost) => p.published);
        
        // Filter by tag if specified
        if (options?.tag) {
          filteredPosts = filteredPosts.filter((p: BlogPost) => p.tags?.includes(options.tag!));
        }
        
        setPosts(filteredPosts);
        setDisplayedPosts(filteredPosts.slice(0, pageSize));
        setHasMore(filteredPosts.length > pageSize);
      } catch (error) {
        console.error('Failed to fetch blog posts:', error);
        setPosts([]);
        setDisplayedPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [language, options?.tag, pageSize]);

  const loadMore = useCallback(() => {
    const currentCount = displayedPosts.length;
    const newCount = currentCount + pageSize;
    setDisplayedPosts(posts.slice(0, newCount));
    setHasMore(newCount < posts.length);
  }, [posts, displayedPosts.length, pageSize]);

  return {
    posts: displayedPosts,
    loading,
    hasMore,
    loadMore,
    totalCount: posts.length,
    remainingCount: posts.length - displayedPosts.length
  };
}

// Get single post by slug
export function useBlogPost(slug: string) {
  const { language } = useTranslation();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        let response: Response;
        
        if (isDev()) {
          // In dev mode, use API
          const params = new URLSearchParams({ lang: language });
          response = await fetch(`/api/blog/post/${slug}?${params}`);
        } else {
          // In production, use static JSON with language suffix
          const langSuffix = language === 'en' ? '' : `.${language}`;
          response = await fetch(`${getBaseUrl()}data/blog/post/${slug}${langSuffix}.json`);
          
          // Fallback to English if translation not available
          if (!response.ok && language !== 'en') {
            response = await fetch(`${getBaseUrl()}data/blog/post/${slug}.json`);
          }
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Post not found');
          } else {
            throw new Error('Failed to fetch post');
          }
          return;
        }
        
        const data = await response.json();
        setPost(data);
      } catch (err) {
        console.error('Failed to fetch blog post:', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug, language]);

  return { post, loading, error };
}

// Get all unique tags
export function useBlogTags() {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      try {
        let response: Response;
        
        if (isDev()) {
          response = await fetch('/api/blog/tags');
        } else {
          response = await fetch(`${getBaseUrl()}data/blog/tags.json`);
        }
        
        if (!response.ok) throw new Error('Failed to fetch tags');
        
        const data = await response.json();
        setTags(data.tags || []);
      } catch (error) {
        console.error('Failed to fetch blog tags:', error);
        setTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  return { tags, loading };
}

// Telegram config for publishing
interface TelegramConfig {
  botToken: string;
  chatId: string;
  siteUrl: string;
  publishToTelegram: boolean;
  delayMinutes: number;
}

// Result of save operation with optional Telegram status
interface SaveResult {
  success: boolean;
  telegramPublished?: boolean;
  telegramPostId?: number;
  telegramDiscussion?: string;
  telegramError?: string;
}

// Admin CRUD operations
export function useBlogAdmin() {
  const createPost = async (postData: Partial<BlogPost>, telegramConfig?: TelegramConfig): Promise<SaveResult> => {
    // Generate slug from title if not provided
    const slug = postData.slug || postData.title?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || '';

    const frontmatter = {
      title: postData.title || 'Untitled',
      excerpt: postData.excerpt || '',
      author: postData.author,
      publishedAt: postData.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: postData.tags || [],
      featuredImage: postData.featuredImage,
      published: postData.published !== undefined ? postData.published : false,
      order: postData.order || 0,
      telegramDiscussion: postData.telegramDiscussion,
      telegramPostId: postData.telegramPostId
    };

    const response = await fetch('/__save-blog-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        frontmatter,
        content: postData.content || '',
        telegramConfig: telegramConfig?.publishToTelegram ? telegramConfig : undefined
      })
    });

    if (!response.ok) throw new Error('Failed to create post');
    
    const result = await response.json();
    return {
      success: true,
      telegramPublished: result.telegramPublished,
      telegramPostId: result.telegramPostId,
      telegramDiscussion: result.telegramDiscussion,
      telegramError: result.telegramError
    };
  };

  const updatePost = async (slug: string, postData: Partial<BlogPost>, telegramConfig?: TelegramConfig): Promise<SaveResult> => {
    const frontmatter = {
      title: postData.title,
      excerpt: postData.excerpt,
      author: postData.author,
      publishedAt: postData.publishedAt,
      updatedAt: new Date().toISOString(),
      tags: postData.tags,
      featuredImage: postData.featuredImage,
      published: postData.published,
      order: postData.order,
      telegramDiscussion: postData.telegramDiscussion,
      telegramPostId: postData.telegramPostId
    };

    const response = await fetch('/__save-blog-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        frontmatter,
        content: postData.content || '',
        telegramConfig: telegramConfig?.publishToTelegram ? telegramConfig : undefined
      })
    });

    if (!response.ok) throw new Error('Failed to update post');
    
    const result = await response.json();
    return {
      success: true,
      telegramPublished: result.telegramPublished,
      telegramPostId: result.telegramPostId,
      telegramDiscussion: result.telegramDiscussion,
      telegramError: result.telegramError
    };
  };

  const deletePost = async (slug: string): Promise<void> => {
    const response = await fetch(`/api/blog/posts/${slug}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete post');
  };

  const translatePost = async (slug: string, targetLang: string): Promise<void> => {
    // Fetch the original post
    const response = await fetch(`/api/blog/post/${slug}`);
    if (!response.ok) throw new Error('Failed to fetch post');
    
    const post: BlogPost = await response.json();
    
    // Use AI to translate the post content and metadata
    // For now, we'll implement a basic version that uses the translation API
    const aiResponse = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        headers: {},
        body: {
          contents: [{
            parts: [{
              text: `Translate the following blog post to ${targetLang}. Preserve all Markdown formatting. Return ONLY a JSON object with the following structure (no markdown code blocks):
{
  "title": "translated title",
  "excerpt": "translated excerpt",
  "content": "translated markdown content"
}

Blog post to translate:
Title: ${post.title}
Excerpt: ${post.excerpt}
Content:
${post.content}`
            }]
          }]
        }
      })
    });
    
    if (!aiResponse.ok) throw new Error('Translation failed');
    
    const aiData = await aiResponse.json();
    const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid translation response');
    
    const translated = JSON.parse(jsonMatch[0]);
    
    // Save the translated version
    const translatedFrontmatter = {
      title: translated.title,
      excerpt: translated.excerpt,
      author: post.author,
      publishedAt: post.publishedAt,
      updatedAt: new Date().toISOString(),
      tags: post.tags,
      featuredImage: post.featuredImage,
      published: post.published,
      order: post.order
    };
    
    const saveResponse = await fetch('/__save-blog-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        frontmatter: translatedFrontmatter,
        content: translated.content,
        lang: targetLang
      })
    });
    
    if (!saveResponse.ok) throw new Error('Failed to save translation');
  };

  return {
    createPost,
    updatePost,
    deletePost,
    translatePost
  };
}
