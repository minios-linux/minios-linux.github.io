import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Plus, Trash2, X, ChevronLeft, ChevronRight, Maximize2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/LanguageContext';

interface GalleryEditorProps {
  images: string[];
  onChange: (images: string[]) => void;
  editionName?: string;
}

export function GalleryEditor({ images, onChange, editionName }: GalleryEditorProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages = [...images];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} ${t('is not an image')}`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} ${t('is too large (max 5MB)')}`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subfolder', 'img');

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success && result.path) {
          newImages.push(result.path);
          toast.success(`${t('Uploaded')} ${result.filename}`);
        } else {
          toast.error(result.error || t('Upload failed'));
        }
      } catch {
        toast.error(`${t('Failed to upload')} ${file.name}`);
      }
    }

    onChange(newImages);
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addUrlImage = () => {
    if (!urlInput.trim()) return;
    onChange([...images, urlInput.trim()]);
    setUrlInput('');
    setShowUrlInput(false);
    toast.success(t('Image URL added'));
  };

  const deleteImage = async (index: number) => {
    const imagePath = images[index];
    
    // Only delete from disk if it's a local path
    if (imagePath.startsWith('/assets/')) {
      try {
        const response = await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePath })
        });

        const result = await response.json();
        if (!result.success) {
          // File might not exist, just remove from list
          console.warn('File not found on disk, removing from list');
        }
      } catch {
        console.warn('Failed to delete file from disk');
      }
    }

    onChange(images.filter((_, i) => i !== index));
    toast.success(t('Image removed'));
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const nextImage = () => {
    setViewerIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setViewerIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[dragIndex];
    newImages.splice(dragIndex, 1);
    newImages.splice(index, 0, draggedImage);
    onChange(newImages);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <div className="gallery-editor">
      <div className="gallery-editor-header">
        <span className="gallery-editor-title">
          {t('Gallery Images')} {images.length > 0 && <span className="gallery-editor-count">({images.length})</span>}
        </span>
        <div className="gallery-editor-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1"
          >
            <Upload className="w-3 h-3" /> {uploading ? t('Uploading...') : t('Upload')}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="gap-1"
          >
            <Plus className="w-3 h-3" /> {t('URL')}
          </Button>
        </div>
      </div>

      {showUrlInput && (
        <div className="gallery-editor-url-input">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrlImage())}
          />
          <Button type="button" size="sm" onClick={addUrlImage}>{t('Add')}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {images.length === 0 ? (
        <div className="gallery-editor-empty">
          <p>{t('No images yet')}</p>
          <p className="text-muted-foreground">{t('Upload images or add URLs to create a gallery for')} {editionName || t('this edition')}</p>
        </div>
      ) : (
        <div className="gallery-editor-grid">
          {images.map((img, index) => (
            <div 
              key={`${img}-${index}`}
              className={`gallery-editor-item ${dragIndex === index ? 'dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="gallery-editor-drag-handle">
                <GripVertical className="w-4 h-4" />
              </div>
              <img 
                src={img} 
                alt={`Gallery ${index + 1}`} 
                onClick={() => openViewer(index)}
              />
              <div className="gallery-editor-item-overlay">
                <button 
                  type="button" 
                  className="gallery-editor-btn gallery-editor-btn-view"
                  onClick={() => openViewer(index)}
                  title={t('View')}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  className="gallery-editor-btn gallery-editor-btn-delete"
                  onClick={() => deleteImage(index)}
                  title={t('Delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="gallery-editor-item-index">{index + 1}</div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen viewer modal */}
      {viewerOpen && images.length > 0 && (
        <div className="gallery-viewer-overlay" onClick={() => setViewerOpen(false)}>
          <div className="gallery-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="gallery-viewer-close"
              onClick={() => setViewerOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
            
            <img 
              src={images[viewerIndex]} 
              alt={`Gallery ${viewerIndex + 1}`}
              className="gallery-viewer-image"
            />

            {images.length > 1 && (
              <>
                <button 
                  type="button" 
                  className="gallery-viewer-nav gallery-viewer-prev"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button 
                  type="button" 
                  className="gallery-viewer-nav gallery-viewer-next"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            <div className="gallery-viewer-counter">
              {viewerIndex + 1} / {images.length}
            </div>

            <div className="gallery-viewer-path">
              {images[viewerIndex]}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
