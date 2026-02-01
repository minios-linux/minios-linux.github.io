import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Image as ImageIcon, RefreshCw, Check, FolderOpen, Link as LinkIcon } from 'lucide-react';
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
  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<string>('upload');

  // Load existing images from /assets/img/blog/
  const loadExistingImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      // Fetch list of images from the blog subfolder
      const response = await fetch('/api/list-images?folder=img/blog');
      if (response.ok) {
        const data = await response.json();
        setExistingImages(data.images || []);
      } else {
        // If no dedicated API, we'll just show the upload tab
        setExistingImages([]);
      }
    } catch {
      // Silently fail - existing images gallery is optional
      setExistingImages([]);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  // Load images when dialog opens and "existing" tab is selected
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'existing' && existingImages.length === 0) {
      loadExistingImages();
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('Invalid file type. Please upload an image (JPG, PNG, GIF, WebP, SVG).'));
      return null;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t('File too large. Maximum size is 5MB.'));
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subfolder', 'img/blog'); // Store in blog-specific folder

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

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const path = await uploadFile(file);
      
      if (path) {
        setSelectedImage(path);
        setAltText(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
        toast.success(t('Image uploaded successfully'));
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

  const handleInsert = () => {
    const imagePath = activeTab === 'url' ? urlInput : selectedImage;
    if (!imagePath) {
      toast.error(t('Please select or enter an image'));
      return;
    }
    onImageSelect(imagePath, altText || 'image');
    handleClose();
  };

  const handleClose = () => {
    setSelectedImage(null);
    setAltText('');
    setUrlInput('');
    setActiveTab('upload');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="image-upload-dialog max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            {t('Insert Image')}
          </DialogTitle>
          <DialogDescription>
            {t('Upload a new image or select from existing images')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              {t('Upload')}
            </TabsTrigger>
            <TabsTrigger value="existing" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              {t('Gallery')}
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <LinkIcon className="w-4 h-4" />
              {t('URL')}
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="mt-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-primary bg-primary/10' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{t('Uploading...')}</p>
                </div>
              ) : selectedImage ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={selectedImage}
                      alt={altText}
                      className="max-h-48 rounded-lg mx-auto"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 w-6 h-6"
                      onClick={() => setSelectedImage(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedImage}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('Drag and drop an image here, or click to browse')}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mb-4">
                    {t('Supports JPG, PNG, GIF, WebP, SVG (max 5MB)')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t('Browse Files')}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </>
              )}
            </div>
          </TabsContent>

          {/* Existing Images Tab */}
          <TabsContent value="existing" className="mt-4">
            {loadingImages ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            ) : existingImages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>{t('No images in gallery yet')}</p>
                <p className="text-sm mt-1">{t('Upload images to see them here')}</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="grid grid-cols-4 gap-3 p-1">
                  {existingImages.map((img) => (
                    <button
                      key={img.path}
                      type="button"
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === img.path
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setSelectedImage(img.path);
                        setAltText(img.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                      }}
                    >
                      <img
                        src={img.path}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedImage === img.path && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value="url" className="mt-4 space-y-4">
            <div>
              <Label>{t('Image URL')}</Label>
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
              />
            </div>
            {urlInput && (
              <div className="border rounded-lg p-4">
                <img
                  src={urlInput}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Alt Text Input */}
        <div className="mt-4">
          <Label>{t('Alt Text (for accessibility)')}</Label>
          <Input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder={t('Describe the image...')}
            className="mt-1"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="ghost" onClick={handleClose}>
            {t('Cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleInsert}
            disabled={activeTab === 'url' ? !urlInput : !selectedImage}
            className="gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            {t('Insert Image')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
