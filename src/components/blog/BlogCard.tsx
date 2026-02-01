import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, Tag, FileText } from 'lucide-react';
import type { BlogPost } from '@/lib/types';

interface BlogCardProps {
  post: Omit<BlogPost, 'content'>;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Link to={`/blog/${post.slug}`} className="blog-card">
        <div className="blog-card-image">
          {post.featuredImage ? (
            <img 
              src={post.featuredImage} 
              alt={post.title}
              loading="lazy"
            />
          ) : (
            <div className="blog-card-placeholder">
              <FileText size={48} />
            </div>
          )}
        </div>
        
        <div className="blog-card-content">
          <h3 className="blog-card-title">{post.title}</h3>
          
          <p className="blog-card-excerpt">{post.excerpt}</p>
          
          <div className="blog-card-meta">
            <div className="blog-card-info">
              <span className="blog-card-date">
                <Calendar size={14} />
                {formatDate(post.publishedAt)}
              </span>
              
              {post.author && (
                <span className="blog-card-author">
                  <User size={14} />
                  {post.author}
                </span>
              )}
            </div>
            
            {post.tags && post.tags.length > 0 && (
              <div className="blog-card-tags">
                {post.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="blog-card-tag">
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
  );
};
