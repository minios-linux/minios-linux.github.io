import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye, Calendar, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useBlogPosts, useBlogAdmin } from '@/hooks/use-blog';
import { useTranslation } from '@/contexts/LanguageContext';
import { MarkdownEditor } from './MarkdownEditor';
import type { BlogPost } from '@/lib/types';

export function BlogManager() {
  const { t } = useTranslation();
  const { posts, loading } = useBlogPosts({});
  const { createPost, updatePost, deletePost } = useBlogAdmin();
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [openInPreview, setOpenInPreview] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handleNewPost = () => {
    setEditingPost(null);
    setOpenInPreview(false);
    setIsPreviewMode(false);
    setEditorOpen(true);
  };

  const handleEditPost = async (post: Omit<BlogPost, 'content'>) => {
    // Fetch full post with content
    try {
      const response = await fetch(`/api/blog/post/${post.slug}`);
      if (!response.ok) throw new Error('Failed to fetch post');
      const fullPost = await response.json();
      setEditingPost(fullPost);
      setOpenInPreview(false);
      setEditorOpen(true);
    } catch (error) {
      console.error('Failed to load post for editing:', error);
      toast.error(t('Failed to load post'));
    }
  };

  const handlePreviewPost = async (post: Omit<BlogPost, 'content'>) => {
    // Fetch full post with content and open in preview mode
    try {
      const response = await fetch(`/api/blog/post/${post.slug}`);
      if (!response.ok) throw new Error('Failed to fetch post');
      const fullPost = await response.json();
      setEditingPost(fullPost);
      setOpenInPreview(true);
      setEditorOpen(true);
    } catch (error) {
      console.error('Failed to load post for preview:', error);
      toast.error(t('Failed to load post'));
    }
  };

  const handleDeletePost = async (slug: string, title: string) => {
    if (!confirm(t(`Delete post "${title}"? This action cannot be undone.`))) {
      return;
    }

    try {
      await deletePost(slug);
      toast.success(t('Post deleted'));
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error(t('Failed to delete post'));
    }
  };

  const handleSavePost = async (frontmatter: Record<string, unknown>, content: string) => {
    try {
      if (editingPost) {
        // Update existing post
        await updatePost(editingPost.slug, {
          ...frontmatter,
          content
        } as Partial<BlogPost>);
        toast.success(t('Post updated'));
      } else {
        // Create new post
        await createPost({
          ...frontmatter,
          content
        } as Partial<BlogPost>);
        toast.success(t('Post created'));
      }
      setEditorOpen(false);
      setEditingPost(null);
    } catch (error) {
      console.error('Failed to save post:', error);
      toast.error(t('Failed to save post'));
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Blog skeleton component
  const BlogSkeleton = () => (
    <div className="admin-skeleton-content">
      <div className="admin-skeleton-card">
        <div className="admin-skeleton-card-header">
          <div className="skeleton-box" style={{ width: 120, height: 20, borderRadius: 4 }} />
          <div className="skeleton-box" style={{ width: 180, height: 14, borderRadius: 4, opacity: 0.5 }} />
        </div>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="admin-skeleton-card">
          <div className="admin-skeleton-card-body" style={{ flexDirection: 'row', gap: 16 }}>
            <div className="skeleton-box" style={{ width: 128, height: 128, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton-box" style={{ width: '60%', height: 20, borderRadius: 4 }} />
              <div className="skeleton-box" style={{ width: '100%', height: 14, borderRadius: 4 }} />
              <div className="skeleton-box" style={{ width: '40%', height: 14, borderRadius: 4 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

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
          <BlogSkeleton />
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
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('Blog Posts')}</CardTitle>
              <CardDescription>{t('Manage your blog content')}</CardDescription>
            </div>
            <Button onClick={handleNewPost} className="gap-2">
              <Plus className="w-4 h-4" />
              {t('New Post')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {t('No blog posts yet. Create your first post!')}
                </p>
                <Button onClick={handleNewPost} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t('Create First Post')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.slug} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Featured Image Thumbnail */}
                  {post.featuredImage && (
                    <div 
                      className="rounded-lg overflow-hidden bg-muted shrink-0"
                      style={{ width: '128px', height: '128px' }}
                    >
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1 line-clamp-1">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.excerpt}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Badge variant={post.published ? 'default' : 'secondary'}>
                          {post.published ? t('Published') : t('Draft')}
                        </Badge>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                      {post.author && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{post.author}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                      {post.updatedAt && post.updatedAt !== post.publishedAt && (
                        <span className="text-muted-foreground/60">
                          {t('Updated')}: {formatDate(post.updatedAt)}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPost(post)}
                        className="gap-2"
                      >
                        <Pencil className="w-3 h-3" />
                        {t('Edit')}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreviewPost(post)}
                        className="gap-2"
                      >
                        <Eye className="w-3 h-3" />
                        {t('Preview')}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePost(post.slug, post.title)}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                        {t('Delete')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className={`blog-editor-dialog w-full max-h-[95vh] p-0 ${isPreviewMode ? 'blog-preview-mode' : ''}`}>
          <VisuallyHidden>
            <DialogTitle>{editingPost ? t('Edit Post') : t('New Post')}</DialogTitle>
            <DialogDescription>{t('Create or edit a blog post')}</DialogDescription>
          </VisuallyHidden>
          <MarkdownEditor
            initialFrontmatter={editingPost ? {
              title: editingPost.title,
              excerpt: editingPost.excerpt,
              author: editingPost.author,
              publishedAt: editingPost.publishedAt,
              updatedAt: editingPost.updatedAt,
              tags: editingPost.tags,
              featuredImage: editingPost.featuredImage,
              published: editingPost.published,
              telegramDiscussion: editingPost.telegramDiscussion
            } : undefined}
            initialContent={editingPost?.content || ''}
            initialPreview={openInPreview}
            onSave={handleSavePost}
            onCancel={() => {
              setEditorOpen(false);
              setEditingPost(null);
              setOpenInPreview(false);
              setIsPreviewMode(false);
            }}
            onPreviewChange={setIsPreviewMode}
          />
        </DialogContent>
      </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
