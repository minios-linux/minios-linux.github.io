import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, X, Image as ImageIcon, RefreshCw, Check, Link as LinkIcon, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface ImageUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageSelect: (imagePath: string, altText: string) => void;
}

interface UploadedImage {
  path: string;
  name: string;
}

export function ImageUpload({ open, onOpenChange, onImageSelect }: ImageUploadProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [existingImages, setExistingImages] = useState<UploadedImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [fileName, setFileName] = useState('');
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showGallery, setShowGallery] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<UploadedImage | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load existing images when dialog opens
  useEffect(() => {
    if (open) {
      loadExistingImages();
    }
  }, [open]);

  const loadExistingImages = async () => {
    setLoadingImages(true);
    try {
      const response = await fetch('/api/list-images?folder=img/blog');
      if (response.ok) {
        const data = await response.json();
        setExistingImages(data.images || []);
      } else {
        setExistingImages([]);
      }
    } catch {
      setExistingImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const uploadFile = async (file: File, customFileName?: string): Promise<string | null> => {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('Invalid file type. Please upload an image (JPG, PNG, GIF, WebP, SVG).'));
      return null;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t('File too large. Maximum size is 5MB.'));
      return null;
    }

    const formData = new FormData();
    
    // If custom filename provided, create new file with that name
    if (customFileName) {
      const ext = file.name.split('.').pop();
      const newFileName = customFileName.includes('.') ? customFileName : `${customFileName}.${ext}`;
      const newFile = new File([file], newFileName, { type: file.type });
      formData.append('file', newFile);
    } else {
      formData.append('file', file);
    }
    
    formData.append('subfolder', 'img/blog');

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      return result.path;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('Failed to upload image'));
      return null;
    }
  };

  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    
    setPendingFile(file);
    setFileName(file.name.replace(/\.[^/.]+$/, ''));
    setAltText(baseName);
    setUrlMode(false);
    setShowGallery(false);
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndInsert = async () => {
    if (urlMode && urlInput) {
      onImageSelect(urlInput, altText || 'image');
      handleClose();
      return;
    }

    if (!pendingFile && selectedImage) {
      // Image from gallery - just insert
      onImageSelect(selectedImage, altText || 'image');
      handleClose();
      return;
    }

    if (!pendingFile) {
      toast.error(t('Please select an image'));
      return;
    }

    setUploading(true);
    try {
      const path = await uploadFile(pendingFile, fileName);
      if (path) {
        toast.success(t('Image uploaded successfully'));
        onImageSelect(path, altText || 'image');
        handleClose();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleClose = () => {
    setSelectedImage(null);
    setAltText('');
    setFileName('');
    setUrlInput('');
    setUrlMode(false);
    setShowGallery(false);
    setPendingFile(null);
    onOpenChange(false);
  };

  const handleGallerySelect = (img: UploadedImage) => {
    setSelectedImage(img.path);
    setFileName(img.name.replace(/\.[^/.]+$/, ''));
    setAltText(img.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    setPendingFile(null);
    setShowGallery(false);
    setUrlMode(false);
  };

  const handleUrlModeToggle = () => {
    if (!urlMode) {
      setUrlMode(true);
      setShowGallery(false);
      setSelectedImage(null);
      setPendingFile(null);
    } else {
      setUrlMode(false);
    }
  };

  const clearSelection = () => {
    setSelectedImage(null);
    setPendingFile(null);
    setFileName('');
    setAltText('');
    setUrlInput('');
    setUrlMode(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, img: UploadedImage) => {
    e.stopPropagation(); // Prevent gallery item selection
    setImageToDelete(img);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch('/api/delete-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imagePath: imageToDelete.path }),
      });

      if (response.ok) {
        toast.success(t('Image deleted successfully'));
        // Remove from list
        setExistingImages(prev => prev.filter(img => img.path !== imageToDelete.path));
        // Clear selection if this image was selected
        if (selectedImage === imageToDelete.path) {
          clearSelection();
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('Failed to delete image'));
    } finally {
      setDeleting(false);
      setImageToDelete(null);
    }
  };

  const cancelDelete = () => {
    setImageToDelete(null);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="image-upload-dialog">
        <DialogHeader>
          <DialogTitle className="image-upload-title">
            <span className="image-upload-title-icon">
              <ImageIcon />
            </span>
            {t('Insert Image')}
          </DialogTitle>
          <DialogDescription>
            {t('Upload, paste URL, or select from gallery')}
          </DialogDescription>
        </DialogHeader>

        <div className="image-upload-content">
          {/* Main content area - Drop zone */}
          {!selectedImage && !urlMode && !showGallery && (
            <div
              className={`image-upload-dropzone ${dragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="image-upload-dropzone-icon">
                <Upload />
              </div>
              
              <div className="image-upload-dropzone-text">
                <p>{dragOver ? t('Drop to upload') : t('Drop image here or click to upload')}</p>
                <p>{t('Supports')}: JPG, PNG, GIF, WebP, SVG</p>
                <p>{t('Maximum file size')}: 5MB</p>
              </div>
              
              <Button variant="secondary" style={{ pointerEvents: 'none' }}>
                <Upload style={{ width: 16, height: 16, marginRight: 8 }} />
                {t('Browse Files')}
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>
          )}

          {/* URL input mode */}
          {urlMode && !showGallery && (
            <div className="image-upload-content">
              <div className="image-upload-url-input">
                <span className="url-icon">
                  <LinkIcon />
                </span>
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  style={{ flex: 1 }}
                  autoFocus
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setUrlMode(false)}
                >
                  <X style={{ width: 16, height: 16 }} />
                </Button>
              </div>
              {urlInput && (
                <div className="image-upload-preview">
                  <img
                    src={urlInput}
                    alt="Preview"
                    style={{ maxHeight: 192, margin: '0 auto', display: 'block' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Selected image preview */}
          {selectedImage && !urlMode && !showGallery && (
            <div className="image-upload-content">
              <div className="image-upload-preview">
                <img src={selectedImage} alt={altText} />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="image-upload-preview-close"
                  onClick={clearSelection}
                >
                  <X style={{ width: 16, height: 16 }} />
                </Button>
              </div>
              
              {/* File name input */}
              {pendingFile && (
                <div className="image-upload-input-group">
                  <Label>
                    <span className="label-icon">
                      <Pencil />
                    </span>
                    {t('File name')}
                  </Label>
                  <div className="image-upload-filename-row">
                    <Input
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, '-'))}
                      placeholder="image-name"
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}
                    />
                    <span className="image-upload-filename-ext">
                      .{pendingFile.name.split('.').pop()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gallery view */}
          {showGallery && (
            <div className="image-upload-content">
              <div className="image-upload-gallery-header">
                <div className="image-upload-gallery-header-left">
                  <span className="gallery-icon">
                    <ImageIcon />
                  </span>
                  <span>{t('Gallery')}</span>
                  <span className="image-upload-gallery-badge">
                    {existingImages.length}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowGallery(false)}
                >
                  <X style={{ width: 16, height: 16 }} />
                </Button>
              </div>
              {loadingImages ? (
                <div className="image-upload-gallery-loading">
                  <RefreshCw />
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('Loading images...')}</p>
                </div>
              ) : existingImages.length === 0 ? (
                <div className="image-upload-gallery-empty">
                  <div className="image-upload-gallery-empty-icon">
                    <ImageIcon />
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('No images in gallery yet')}</p>
                </div>
              ) : (
                <ScrollArea style={{ height: 240 }}>
                  <div className="image-upload-gallery-grid">
                    {existingImages.map((img) => (
                      <button
                        key={img.path}
                        type="button"
                        className="image-upload-gallery-item"
                        onClick={() => handleGallerySelect(img)}
                      >
                        <img src={img.path} alt={img.name} />
                        <div className="image-upload-gallery-item-overlay">
                          <span className="image-upload-gallery-item-check">
                            <Check />
                          </span>
                        </div>
                        <div
                          className="image-upload-gallery-item-delete"
                          onClick={(e) => handleDeleteClick(e, img)}
                          role="button"
                          tabIndex={0}
                          title={t('Delete image')}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Quick actions - show when no image selected */}
          {!selectedImage && !urlMode && !showGallery && (
            <div className="image-upload-actions">
              <Button
                variant="outline"
                onClick={handleUrlModeToggle}
              >
                <LinkIcon style={{ width: 16, height: 16, marginRight: 8 }} />
                {t('Paste URL')}
              </Button>
              {existingImages.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowGallery(true)}
                >
                  <ImageIcon style={{ width: 16, height: 16, marginRight: 8 }} />
                  {t('Gallery')}
                  <span className="image-upload-gallery-badge" style={{ marginLeft: 8 }}>
                    {existingImages.length}
                  </span>
                </Button>
              )}
            </div>
          )}

          {/* Alt text - always visible when image selected or URL entered */}
          {(selectedImage || urlInput) && (
            <div className="image-upload-input-group">
              <Label>
                <span className="label-icon">
                  <Pencil />
                </span>
                {t('Alt text')}
                <span className="label-hint">({t('for accessibility')})</span>
              </Label>
              <Input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder={t('Describe the image for accessibility...')}
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="image-upload-footer">
          <Button variant="outline" onClick={handleClose}>
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleUploadAndInsert}
            disabled={uploading || (!selectedImage && !urlInput)}
          >
            {uploading ? (
              <>
                <RefreshCw style={{ width: 16, height: 16, marginRight: 8, animation: 'spin 1s linear infinite' }} />
                {t('Uploading...')}
              </>
            ) : (
              <>
                <Check style={{ width: 16, height: 16, marginRight: 8 }} />
                {t('Insert')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete confirmation dialog */}
    <Dialog open={!!imageToDelete} onOpenChange={(open) => !open && cancelDelete()}>
      <DialogContent className="image-upload-delete-dialog">
        <DialogHeader>
          <DialogTitle className="image-upload-delete-title">
            <span className="image-upload-delete-icon">
              <Trash2 />
            </span>
            {t('Delete Image')}
          </DialogTitle>
          <DialogDescription>
            {t('Are you sure you want to delete this image? This action cannot be undone.')}
          </DialogDescription>
        </DialogHeader>
        
        {imageToDelete && (
          <div className="image-upload-delete-preview">
            <img src={imageToDelete.path} alt={imageToDelete.name} />
            <p className="image-upload-delete-filename">{imageToDelete.name}</p>
          </div>
        )}

        <div className="image-upload-delete-footer">
          <Button variant="outline" onClick={cancelDelete} disabled={deleting}>
            {t('Cancel')}
          </Button>
          <Button 
            variant="destructive" 
            onClick={confirmDelete} 
            disabled={deleting}
            className="image-upload-delete-confirm"
          >
            {deleting ? (
              <>
                <RefreshCw style={{ width: 16, height: 16, marginRight: 8, animation: 'spin 1s linear infinite' }} />
                {t('Deleting...')}
              </>
            ) : (
              <>
                <Trash2 style={{ width: 16, height: 16, marginRight: 8 }} />
                {t('Delete')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
