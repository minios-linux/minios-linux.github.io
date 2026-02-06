import { useState } from 'react';
import { ImageUpload } from './components/admin/ImageUpload';
import { Button } from './components/ui/button';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

export function TestPage() {
  const [open, setOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{path: string, alt: string}>>([]);

  const handleImageSelect = (path: string, alt: string) => {
    setSelectedImages(prev => [...prev, { path, alt }]);
  };

  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="min-h-screen bg-background p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">Image Upload Component Test</h1>
              <p className="text-muted-foreground">
                This page allows you to test the ImageUpload component in isolation.
              </p>
            </div>

            <div className="space-y-4">
              <Button onClick={() => setOpen(true)} size="lg">
                Open Image Upload Dialog
              </Button>

              <ImageUpload
                open={open}
                onOpenChange={setOpen}
                onImageSelect={handleImageSelect}
              />
            </div>

            {selectedImages.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Selected Images</h2>
                <div className="grid grid-cols-2 gap-4">
                  {selectedImages.map((img, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-2">
                      <img src={img.path} alt={img.alt} className="w-full h-48 object-cover rounded" />
                      <p className="text-sm text-muted-foreground">Alt: {img.alt}</p>
                      <p className="text-xs text-muted-foreground break-all">Path: {img.path}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 border-t pt-8">
              <h2 className="text-2xl font-semibold">Test Instructions</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Click the button above to open the image upload dialog</li>
                <li>Test drag-and-drop functionality</li>
                <li>Test file browsing</li>
                <li>Test URL pasting</li>
                <li>Test gallery selection</li>
                <li>Verify alt text input</li>
                <li>Check hover states and animations</li>
                <li>Test in both light and dark modes</li>
              </ul>
            </div>
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}
