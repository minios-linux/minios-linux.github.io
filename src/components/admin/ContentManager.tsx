import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, GripVertical, ExternalLink, Upload, Sparkles, Package, Link2, Copy, Bold, Italic, Code, AlignLeft, AlignCenter, AlignRight, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useContent } from '@/hooks/use-local-data';
import { useTranslation } from '@/contexts/LanguageContext';
import { DynamicIcon } from '@/components/DynamicIcon';
import { IconPicker } from '@/components/admin/IconPicker';
import { TranslationEditor } from '@/components/admin/TranslationEditor';
import { BlogManager } from '@/components/admin/BlogManager';
import type { SiteContent, Edition, Feature, HeaderLink, FooterLinkGroup, NavLink, Torrent, TorrentGroup, TorrentItem, GalleryImage } from '@/lib/types';

// Helper to get URL from gallery image (string or object)
const getImageUrl = (img: string | GalleryImage): string => {
  return typeof img === 'string' ? img : img.url;
};
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export type ContentSection = 'site' | 'features' | 'editions' | 'download' | 'seo' | 'translations' | 'blog';

export interface ContentManagerHandle {
  save: () => Promise<void>;
  discard: () => void;
  hasChanges: boolean;
  saving: boolean;
}

interface ContentManagerProps {
  activeSection: ContentSection;
  onSectionChange: (section: ContentSection) => void;
  onStateChange?: (state: { hasChanges: boolean; saving: boolean }) => void;
}

export const ContentManager = forwardRef<ContentManagerHandle, ContentManagerProps>(
  function ContentManager({ activeSection, onSectionChange: _onSectionChange, onStateChange }, ref) {
    void _onSectionChange; // Reserved for future navigation
    const { t } = useTranslation();
    const [content, saveContent, loading] = useContent();
    const [formData, setFormData] = useState<SiteContent | null>(null);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const announcementRef = useRef<HTMLTextAreaElement>(null);

    // Notify parent of state changes
    useEffect(() => {
      onStateChange?.({ hasChanges, saving });
    }, [hasChanges, saving, onStateChange]);

    // Dialog states
    const [editionDialogOpen, setEditionDialogOpen] = useState(false);
    const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
    const [editingEdition, setEditingEdition] = useState<Edition | null>(null);
    const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

    useEffect(() => {
      if (!loading && content) {
        setFormData(content);
      }
    }, [content, loading]);

    // Shared DnD sensors - defined at component level to follow React hooks rules
    const dndSensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleSave = useCallback(async () => {
      if (!formData) return;

      setSaving(true);
      try {
        await saveContent(formData);
        setHasChanges(false);
        toast.success('Content saved successfully');
      } catch (error) {
        toast.error('Failed to save content');
        console.error(error);
      } finally {
        setSaving(false);
      }
    }, [formData, saveContent]);

    const handleDiscard = useCallback(() => {
      if (content) {
        setFormData(content);
        setHasChanges(false);
        toast.info('Changes discarded');
      }
    }, [content]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      save: handleSave,
      discard: handleDiscard,
      hasChanges,
      saving
    }), [handleSave, handleDiscard, hasChanges, saving]);

    // Generic field update for nested objects
    const updateField = (path: string, value: string | boolean | string[]) => {
      if (!formData) return;

      const keys = path.split('.');
      const newData = { ...formData };
      let current: Record<string, unknown> = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
        current = current[keys[i]] as Record<string, unknown>;
      }

      current[keys[keys.length - 1]] = value;
      setFormData(newData as SiteContent);
      setHasChanges(true);
    };

    // Edition CRUD
    const saveEdition = (edition: Partial<Edition>) => {
      if (!formData) return;

      if (editingEdition) {
        // Update existing
        const newEditions = formData.editions.map(e =>
          e.id === editingEdition.id ? { ...editingEdition, ...edition } : e
        );
        setFormData({ ...formData, editions: newEditions });
      } else {
        // Add new - calculate max order and add 1
        const maxOrder = formData.editions.reduce((max, e) => Math.max(max, e.order || 0), -1);
        const newEdition: Edition = {
          id: Date.now().toString(),
          name: edition.name || 'New Edition',
          version: edition.version || 'v1.0.0',
          colorTheme: edition.colorTheme || '#3b82f6',
          description: edition.description || '',
          downloadUrl: edition.downloadUrl || '',
          galleryImages: edition.galleryImages || [],
          size: edition.size || '',
          requirements: edition.requirements || 'CPU x64',
          ...edition,
          order: maxOrder + 1  // Always set order last to ensure it's at the end
        } as Edition;
        setFormData({ ...formData, editions: [...formData.editions, newEdition] });
      }

      setHasChanges(true);
      setEditionDialogOpen(false);
      setEditingEdition(null);
      toast.success(editingEdition ? 'Edition updated' : 'Edition added');
    };

    const deleteEdition = (id: string) => {
      if (!formData) return;
      setFormData({ ...formData, editions: formData.editions.filter(e => e.id !== id) });
      setHasChanges(true);
      toast.success('Edition deleted');
    };

    const reorderEditions = (reorderedEditions: Edition[]) => {
      if (!formData) return;
      // Update order values based on new position
      const withNewOrder = reorderedEditions.map((e, i) => ({ ...e, order: i }));
      setFormData({ ...formData, editions: withNewOrder });
      setHasChanges(true);
    };

    // Feature CRUD
    const saveFeature = (feature: Partial<Feature>) => {
      if (!formData) return;

      if (editingFeature) {
        const newFeatures = formData.features.map(f =>
          f.id === editingFeature.id ? { ...editingFeature, ...feature } : f
        );
        setFormData({ ...formData, features: newFeatures });
      } else {
        const maxOrder = formData.features.reduce((max, f) => Math.max(max, f.order || 0), -1);
        const newFeature: Feature = {
          id: Date.now().toString(),
          icon: feature.icon || 'Rocket',
          title: feature.title || 'New Feature',
          description: feature.description || '',
          bulletPoints: feature.bulletPoints || [],
          ...feature,
          order: maxOrder + 1  // Always set order last to ensure it's at the end
        } as Feature;
        setFormData({ ...formData, features: [...formData.features, newFeature] });
      }

      setHasChanges(true);
      setFeatureDialogOpen(false);
      setEditingFeature(null);
      toast.success(editingFeature ? 'Feature updated' : 'Feature added');
    };

    const deleteFeature = (id: string) => {
      if (!formData) return;
      setFormData({ ...formData, features: formData.features.filter(f => f.id !== id) });
      setHasChanges(true);
      toast.success('Feature deleted');
    };

    const reorderFeatures = (reorderedFeatures: Feature[]) => {
      if (!formData) return;
      const withNewOrder = reorderedFeatures.map((f, i) => ({ ...f, order: i }));
      setFormData({ ...formData, features: withNewOrder });
      setHasChanges(true);
    };

    // Navigation helpers
    const addHeaderLink = () => {
      if (!formData) return;
      const newLink: HeaderLink = {
        id: Date.now().toString(),
        label: 'New Link',
        url: 'https://',
        icon: 'ExternalLink',
        enabled: true
      };
      setFormData({
        ...formData,
        navigation: {
          ...formData.navigation,
          headerLinks: [...formData.navigation.headerLinks, newLink]
        }
      });
      setHasChanges(true);
    };

    const updateHeaderLink = (id: string, updates: Partial<HeaderLink>) => {
      if (!formData) return;
      setFormData({
        ...formData,
        navigation: {
          ...formData.navigation,
          headerLinks: formData.navigation.headerLinks.map(l =>
            l.id === id ? { ...l, ...updates } : l
          )
        }
      });
      setHasChanges(true);
    };

    const reorderHeaderLinks = (newLinks: HeaderLink[]) => {
      if (!formData) return;
      setFormData({ ...formData, navigation: { ...formData.navigation, headerLinks: newLinks } });
      setHasChanges(true);
    };

    const deleteHeaderLink = (id: string) => {
      if (!formData) return;
      setFormData({
        ...formData,
        navigation: {
          ...formData.navigation,
          headerLinks: formData.navigation.headerLinks.filter(l => l.id !== id)
        }
      });
      setHasChanges(true);
    };

    const addFooterGroup = () => {
      if (!formData) return;
      const newGroup: FooterLinkGroup = {
        id: Date.now().toString(),
        title: 'New Section',
        links: []
      };
      setFormData({
        ...formData,
        navigation: {
          ...formData.navigation,
          footerGroups: [...formData.navigation.footerGroups, newGroup]
        }
      });
      setHasChanges(true);
    };

    const updateFooterGroup = (id: string, updates: Partial<FooterLinkGroup>) => {
      if (!formData) return;
      setFormData({
        ...formData,
        navigation: {
          ...formData.navigation,
          footerGroups: formData.navigation.footerGroups.map(g =>
            g.id === id ? { ...g, ...updates } : g
          )
        }
      });
      setHasChanges(true);
    };

    const deleteFooterGroup = (id: string) => {
      if (!formData) return;
      setFormData({
        ...formData,
        navigation: {
          ...formData.navigation,
          footerGroups: formData.navigation.footerGroups.filter(g => g.id !== id)
        }
      });
      setHasChanges(true);
    };

    const addFooterLink = (groupId: string) => {
      if (!formData) return;
      const newLink: NavLink = {
        id: Date.now().toString(),
        label: 'New Link',
        url: '#',
        type: 'external',
        enabled: true
      };
      setFormData({
        ...formData,
        navigation: {
          ...formData.navigation,
          footerGroups: formData.navigation.footerGroups.map(g => {
            if (g.id === groupId) {
              return { ...g, links: [...g.links, newLink] };
            }
            return g;
          })
        }
      });
      setHasChanges(true);
    };

    const updateFooterLink = (groupId: string, linkIndex: number, updates: Partial<NavLink>) => {
      if (!formData) return;
      setFormData({
        ...formData,
        navigation: {
          ...formData.navigation,
          footerGroups: formData.navigation.footerGroups.map(g => {
            if (g.id === groupId) {
              const newLinks = [...g.links];
              newLinks[linkIndex] = { ...newLinks[linkIndex], ...updates };
              return { ...g, links: newLinks };
            }
            return g;
          })
        }
      });
      setHasChanges(true);
    };

    const deleteFooterLink = (groupId: string, linkIndex: number) => {
      if (!formData) return;
      setFormData({
        ...formData,
        navigation: {
          ...formData.navigation,
          footerGroups: formData.navigation.footerGroups.map(g => {
            if (g.id === groupId) {
              return { ...g, links: g.links.filter((_, i) => i !== linkIndex) };
            }
            return g;
          })
        }
      });
      setHasChanges(true);
    };

    const reorderFooterGroups = (newGroups: FooterLinkGroup[]) => {
      if (!formData) return;
      setFormData({ ...formData, navigation: { ...formData.navigation, footerGroups: newGroups } });
      setHasChanges(true);
    };

    const reorderFooterLinks = (groupId: string, newLinks: NavLink[]) => {
      if (!formData) return;
      setFormData({
        ...formData,
        navigation: {
          ...formData.navigation,
          footerGroups: formData.navigation.footerGroups.map(g =>
            g.id === groupId ? { ...g, links: newLinks } : g
          )
        }
      });
      setHasChanges(true);
    };

    // Torrent CRUD helpers
    const addTorrent = () => {
      if (!formData) return;
      const newTorrent: Torrent = {
        id: Date.now().toString(),
        title: 'New Torrent',
        size: '0 GB',
        url: '',
        groups: []
      };
      setFormData({
        ...formData,
        torrents: [...(formData.torrents || []), newTorrent]
      });
      setHasChanges(true);
    };

    const updateTorrent = (id: string, updates: Partial<Torrent>) => {
      if (!formData) return;
      setFormData({
        ...formData,
        torrents: (formData.torrents || []).map(t =>
          t.id === id ? { ...t, ...updates } : t
        )
      });
      setHasChanges(true);
    };

    const deleteTorrent = (id: string) => {
      if (!formData) return;
      setFormData({
        ...formData,
        torrents: (formData.torrents || []).filter(t => t.id !== id)
      });
      setHasChanges(true);
    };

    const reorderTorrents = (newTorrents: Torrent[]) => {
      if (!formData) return;
      setFormData({ ...formData, torrents: newTorrents });
      setHasChanges(true);
    };

    const addTorrentGroup = (torrentId: string) => {
      if (!formData) return;
      const newGroup: TorrentGroup = {
        header: 'New Group',
        items: [],
        mobileDescription: ''
      };
      setFormData({
        ...formData,
        torrents: (formData.torrents || []).map(t =>
          t.id === torrentId ? { ...t, groups: [...t.groups, newGroup] } : t
        )
      });
      setHasChanges(true);
    };

    const updateTorrentGroup = (torrentId: string, groupIndex: number, updates: Partial<TorrentGroup>) => {
      if (!formData) return;
      setFormData({
        ...formData,
        torrents: (formData.torrents || []).map(t => {
          if (t.id === torrentId) {
            const newGroups = [...t.groups];
            newGroups[groupIndex] = { ...newGroups[groupIndex], ...updates };
            return { ...t, groups: newGroups };
          }
          return t;
        })
      });
      setHasChanges(true);
    };

    const deleteTorrentGroup = (torrentId: string, groupIndex: number) => {
      if (!formData) return;
      setFormData({
        ...formData,
        torrents: (formData.torrents || []).map(t =>
          t.id === torrentId ? { ...t, groups: t.groups.filter((_, i) => i !== groupIndex) } : t
        )
      });
      setHasChanges(true);
    };

    const addTorrentItem = (torrentId: string, groupIndex: number) => {
      if (!formData) return;
      const newItem: TorrentItem = { label: '', value: '' };
      setFormData({
        ...formData,
        torrents: (formData.torrents || []).map(t => {
          if (t.id === torrentId) {
            const newGroups = [...t.groups];
            newGroups[groupIndex] = {
              ...newGroups[groupIndex],
              items: [...newGroups[groupIndex].items, newItem]
            };
            return { ...t, groups: newGroups };
          }
          return t;
        })
      });
      setHasChanges(true);
    };

    const updateTorrentItem = (torrentId: string, groupIndex: number, itemIndex: number, updates: Partial<TorrentItem>) => {
      if (!formData) return;
      setFormData({
        ...formData,
        torrents: (formData.torrents || []).map(t => {
          if (t.id === torrentId) {
            const newGroups = [...t.groups];
            const newItems = [...newGroups[groupIndex].items];
            newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
            newGroups[groupIndex] = { ...newGroups[groupIndex], items: newItems };
            return { ...t, groups: newGroups };
          }
          return t;
        })
      });
      setHasChanges(true);
    };

    const deleteTorrentItem = (torrentId: string, groupIndex: number, itemIndex: number) => {
      if (!formData) return;
      setFormData({
        ...formData,
        torrents: (formData.torrents || []).map(t => {
          if (t.id === torrentId) {
            const newGroups = [...t.groups];
            newGroups[groupIndex] = {
              ...newGroups[groupIndex],
              items: newGroups[groupIndex].items.filter((_, i) => i !== itemIndex)
            };
            return { ...t, groups: newGroups };
          }
          return t;
        })
      });
      setHasChanges(true);
    };

    const insertMarkdown = (prefix: string, suffix: string) => {
      if (!announcementRef.current || !formData) return;

      const textarea = announcementRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const selection = text.substring(start, end);
      const after = text.substring(end);

      const newText = `${before}${prefix}${selection}${suffix}${after}`;

      // Update form data
      updateField('homePage.announcement', newText);

      // Restore focus and selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    };

    // Content skeleton component
    const ContentSkeleton = () => (
      <div className="admin-skeleton-content">
        {[1, 2, 3].map(i => (
          <div key={i} className="admin-skeleton-card">
            <div className="admin-skeleton-card-header">
              <div className="skeleton-box" style={{ width: 120 + i * 30, height: 20, borderRadius: 4 }} />
              <div className="skeleton-box" style={{ width: 180, height: 14, borderRadius: 4, opacity: 0.5 }} />
            </div>
            <div className="admin-skeleton-card-body">
              {[1, 2, 3].map(j => (
                <div key={j} className="admin-skeleton-field">
                  <div className="skeleton-box" style={{ width: 80, height: 14, borderRadius: 4 }} />
                  <div className="skeleton-box" style={{ width: '100%', height: 40, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );

    const renderField = (path: string, label: string, multiline = false, type = 'text') => {
      const keys = path.split('.');
      let value: unknown = formData;
      for (const key of keys) {
        value = (value as Record<string, unknown>)?.[key];
      }
      const strValue = (value as string) || '';
      const id = path.replace(/\./g, '-');

      return (
        <div key={id} className="space-y-1">
          <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
            {label}
          </label>
          {multiline ? (
            <Textarea
              id={id}
              value={strValue}
              onChange={(e) => updateField(path, e.target.value)}
              rows={3}
            />
          ) : type === 'color' ? (
            <div className="flex gap-2">
              <Input
                id={id}
                type="color"
                value={strValue}
                onChange={(e) => updateField(path, e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={strValue}
                onChange={(e) => updateField(path, e.target.value)}
                className="flex-1"
              />
            </div>
          ) : (
            <Input
              id={id}
              type={type}
              value={strValue}
              onChange={(e) => updateField(path, e.target.value)}
            />
          )}
        </div>
      );
    };

    return (
      <AnimatePresence mode="wait">
        {(loading || !formData) ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ContentSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            className="content-manager"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
        {/* Site section */}
        {/* Site section - Copyright, Latest Release, Announcement, Header, Footer */}
        {activeSection === 'site' && (
          <div className="space-y-6">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{t('General')}</CardTitle>
                <CardDescription>{t('Site-wide settings')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderField('site.copyright', t('Copyright Text'))}
                {renderField('site.heroBadge', t('Hero Badge Text'))}
              </CardContent>
            </Card>

            {/* Announcement Banner */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Announcement Banner')}</CardTitle>
                <CardDescription>{t('Top banner message with formatting (leave empty to hide)')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Color Picker */}
                    <div className="flex items-center gap-2 px-1 h-9">
                      {[
                        { id: 'cyan', label: 'Cyan', colors: ['#22d3ee', '#06b6d4'] },
                        { id: 'purple', label: 'Purple', colors: ['#8b5cf6', '#a855f7'] },
                        { id: 'blue', label: 'Blue', colors: ['#3b82f6', '#2563eb'] },
                        { id: 'green', label: 'Green', colors: ['#22c55e', '#10b981'] },
                        { id: 'orange', label: 'Orange', colors: ['#f97316', '#f59e0b'] },
                        { id: 'red', label: 'Red', colors: ['#ef4444', '#dc2626'] },
                      ].map((color) => {
                        const isActive = (formData.homePage?.announcementColor || 'cyan') === color.id;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            className={`relative w-5 h-5 rounded-full transition-all color-btn ${isActive ? 'color-btn-active' : ''}`}
                            onClick={() => updateField('homePage.announcementColor', color.id)}
                            title={color.label}
                            style={{
                              background: `linear-gradient(135deg, ${color.colors[0]}, ${color.colors[1]})`,
                            }}
                          />
                        );
                      })}
                    </div>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Alignment controls */}
                    <div className="flex items-center gap-0.5">
                      {[
                        { id: 'left', icon: AlignLeft },
                        { id: 'center', icon: AlignCenter },
                        { id: 'right', icon: AlignRight },
                      ].map((align) => {
                        const currentAlign = formData.homePage?.announcementAlign || 'center';
                        const isActive = currentAlign === align.id;
                        const Icon = align.icon;
                        return (
                          <button
                            key={align.id}
                            type="button"
                            className={`h-7 w-7 rounded-md flex items-center justify-center transition-all border align-btn ${isActive ? 'align-btn-active' : ''}`}
                            onClick={() => updateField('homePage.announcementAlign', align.id)}
                            title={t(`Align ${align.id.charAt(0).toUpperCase() + align.id.slice(1)}`)}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>

                    {/* Formatting controls */}
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => insertMarkdown('**', '**')}
                        title={t('Bold')}
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => insertMarkdown('*', '*')}
                        title={t('Italic')}
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => insertMarkdown('`', '`')}
                        title={t('Code')}
                      >
                        <Code className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => insertMarkdown('[', '](url)')}
                        title={t('Link')}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    ref={announcementRef}
                    value={formData.homePage?.announcement || ''}
                    onChange={(e) => updateField('homePage.announcement', e.target.value)}
                    placeholder={t('Enter announcement text (Markdown supported)...')}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Header Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {t('Header Links')}
                  <Button type="button" variant="outline" size="sm" onClick={addHeaderLink} className="gap-1">
                    <Plus className="w-4 h-4" /> {t('Add')}
                  </Button>
                </CardTitle>
                <CardDescription>{t('Navigation links in the header')}</CardDescription>
              </CardHeader>
              <CardContent className="header-links-list">
                {formData.navigation.headerLinks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('No links yet')}</p>
                ) : (
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id) {
                        const links = formData.navigation.headerLinks;
                        const oldIndex = links.findIndex(l => l.id === active.id);
                        const newIndex = links.findIndex(l => l.id === over.id);
                        reorderHeaderLinks(arrayMove(links, oldIndex, newIndex));
                      }
                    }}
                  >
                    <SortableContext
                      items={formData.navigation.headerLinks.map(l => l.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {formData.navigation.headerLinks.map((link, index) => (
                        <SortableListItem key={link.id} id={link.id}>
                          {(dragHandleProps) => (
                            <div className="header-link-row">
                              <div
                                className="admin-drag-handle"
                                {...dragHandleProps}
                              >
                                <GripVertical size={16} />
                                <span>{index + 1}</span>
                              </div>
                              <Input
                                value={link.label}
                                onChange={(e) => updateHeaderLink(link.id, { label: e.target.value })}
                                placeholder={t('Label')}
                                className="header-link-label"
                              />
                              <Input
                                value={link.url}
                                onChange={(e) => updateHeaderLink(link.id, { url: e.target.value })}
                                placeholder={t('URL')}
                                className="header-link-url"
                              />
                              <div className="header-link-icon">
                                <IconPicker
                                  value={link.icon || ''}
                                  onChange={(icon) => updateHeaderLink(link.id, { icon })}
                                />
                              </div>
                              <label className="header-link-external" title={t('External link (opens in new tab)')}>
                                <input
                                  type="checkbox"
                                  checked={link.type === 'external'}
                                  onChange={(e) => updateHeaderLink(link.id, { type: e.target.checked ? 'external' : 'internal' })}
                                />
                                <ExternalLink className="w-4 h-4" />
                              </label>
                              <label className="header-link-toggle" title={t('Show in header')}>
                                <input
                                  type="checkbox"
                                  checked={link.enabled}
                                  onChange={(e) => updateHeaderLink(link.id, { enabled: e.target.checked })}
                                />
                                <Eye className="w-4 h-4" />
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => deleteHeaderLink(link.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </SortableListItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>

            {/* Footer */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Footer Description')}</CardTitle>
                <CardDescription>{t('Footer description text')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderField('footer.description', t('Footer Description'), true)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {t('Footer Link Sections')}
                  <Button type="button" variant="outline" size="sm" onClick={addFooterGroup} className="gap-1">
                    <Plus className="w-4 h-4" /> {t('Add Section')}
                  </Button>
                </CardTitle>
                <CardDescription>{t('Link groups in the footer')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.navigation.footerGroups.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('No sections yet')}</p>
                ) : (
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id) {
                        const groups = formData.navigation.footerGroups;
                        const oldIndex = groups.findIndex(g => g.id === active.id);
                        const newIndex = groups.findIndex(g => g.id === over.id);
                        reorderFooterGroups(arrayMove(groups, oldIndex, newIndex));
                      }
                    }}
                  >
                    <SortableContext
                      items={formData.navigation.footerGroups.map(g => g.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {formData.navigation.footerGroups.map((group, groupIndex) => (
                        <SortableListItem key={group.id} id={group.id}>
                          {(dragHandleProps) => (
                            <div className="footer-section-card">
                              <div className="footer-section-header">
                                <div
                                  className="admin-drag-handle"
                                  {...dragHandleProps}
                                >
                                  <GripVertical size={16} />
                                  <span>{groupIndex + 1}</span>
                                </div>
                                <Input
                                  value={group.title}
                                  onChange={(e) => updateFooterGroup(group.id, { title: e.target.value })}
                                  placeholder={t('Section title')}
                                  className="font-medium flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteFooterGroup(group.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>

                              <div className="footer-section-links">
                                <DndContext
                                  sensors={dndSensors}
                                  collisionDetection={closestCenter}
                                  onDragEnd={(event: DragEndEvent) => {
                                    const { active, over } = event;
                                    if (over && active.id !== over.id) {
                                      const oldIndex = parseInt(String(active.id).split('-link-')[1]);
                                      const newIndex = parseInt(String(over.id).split('-link-')[1]);
                                      reorderFooterLinks(group.id, arrayMove(group.links, oldIndex, newIndex));
                                    }
                                  }}
                                >
                                  <SortableContext
                                    items={group.links.map((_, i) => `${group.id}-link-${i}`)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {group.links.map((link, i) => (
                                      <SortableListItem key={`${group.id}-link-${i}`} id={`${group.id}-link-${i}`}>
                                        {(linkDragHandleProps) => (
                                          <div className="footer-link-row">
                                            <div
                                              className="admin-drag-handle admin-drag-handle-sm"
                                              {...linkDragHandleProps}
                                            >
                                              <GripVertical size={14} />
                                              <span>{i + 1}</span>
                                            </div>
                                            <Input
                                              value={link.label}
                                              onChange={(e) => updateFooterLink(group.id, i, { label: e.target.value })}
                                              placeholder={t('Label')}
                                              className="flex-1"
                                            />
                                            <Input
                                              value={link.url}
                                              onChange={(e) => updateFooterLink(group.id, i, { url: e.target.value })}
                                              placeholder={t('URL')}
                                              className="flex-1"
                                            />
                                            <div className="footer-link-icon">
                                              <IconPicker
                                                value={link.icon || ''}
                                                onChange={(icon) => updateFooterLink(group.id, i, { icon })}
                                              />
                                            </div>
                                            <label className="footer-link-external" title={t('External link (opens in new tab)')}>
                                              <input
                                                type="checkbox"
                                                checked={link.type === 'external'}
                                                onChange={(e) => updateFooterLink(group.id, i, { type: e.target.checked ? 'external' : 'internal' })}
                                              />
                                              <ExternalLink className="w-4 h-4" />
                                            </label>
                                            <label className="footer-link-toggle" title={t('Show link')}>
                                              <input
                                                type="checkbox"
                                                checked={link.enabled}
                                                onChange={(e) => updateFooterLink(group.id, i, { enabled: e.target.checked })}
                                              />
                                              <Eye className="w-4 h-4" />
                                            </label>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8"
                                              onClick={() => deleteFooterLink(group.id, i)}
                                            >
                                              <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                          </div>
                                        )}
                                      </SortableListItem>
                                    ))}
                                  </SortableContext>
                                </DndContext>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addFooterLink(group.id)}
                                  className="footer-add-link-btn"
                                >
                                  <Plus className="w-3 h-3" /> {t('Add Link')}
                                </Button>
                              </div>
                            </div>
                          )}
                        </SortableListItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features section */}
        {activeSection === 'features' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('Section Header')}</CardTitle>
                <CardDescription>{t('"Why MiniOS?" section title')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {renderField('homePage.features.sectionTitle', t('Section Title'))}
                {renderField('homePage.features.sectionSubtitle', t('Section Subtitle'))}
              </CardContent>
            </Card>

            <div className="space-y-2">
              {formData.features.length === 0 ? (
                <div className="admin-empty-card">
                  <p>{t('No features yet. Click "Add Feature" to create one.')}</p>
                </div>
              ) : (
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      const sorted = [...formData.features].sort((a, b) => a.order - b.order);
                      const oldIndex = sorted.findIndex(f => f.id === active.id);
                      const newIndex = sorted.findIndex(f => f.id === over.id);
                      reorderFeatures(arrayMove(sorted, oldIndex, newIndex));
                    }
                  }}
                >
                  <SortableContext
                    items={[...formData.features].sort((a, b) => a.order - b.order).map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {[...formData.features].sort((a, b) => a.order - b.order).map((feature, index) => (
                      <SortableListItem key={feature.id} id={feature.id}>
                        {(dragHandleProps) => (
                          <div className="feature-admin-card">
                            <div
                              className="admin-drag-handle"
                              {...dragHandleProps}
                            >
                              <GripVertical size={16} />
                              <span>{index + 1}</span>
                            </div>
                            <div className="feature-admin-content">
                              <div className="feature-admin-header">
                                <span className="feature-admin-icon">
                                  <DynamicIcon name={feature.icon} size={16} />
                                </span>
                                <span className="feature-admin-title">{feature.title}</span>
                              </div>
                              <p className="feature-admin-desc">{feature.description}</p>
                            </div>
                            <div className="feature-admin-actions">
                              <button
                                type="button"
                                className="edition-btn"
                                onClick={() => {
                                  setEditingFeature(feature);
                                  setFeatureDialogOpen(true);
                                }}
                                title={t('Edit')}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                className="edition-btn edition-btn-danger"
                                onClick={() => deleteFeature(feature.id)}
                                title={t('Delete')}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                      </SortableListItem>
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Add Feature button */}
            <Dialog open={featureDialogOpen} onOpenChange={(open) => {
              setFeatureDialogOpen(open);
              if (!open) setEditingFeature(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full" variant="outline">
                  <Plus className="w-4 h-4" />
                  {t('Add Feature')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {editingFeature ? t('Edit Feature') : t('Add New Feature')}
                  </DialogTitle>
                  <DialogDescription>{t('Configure feature card')}</DialogDescription>
                </DialogHeader>
                <FeatureForm
                  key={editingFeature?.title ?? 'new-feature'}
                  feature={editingFeature}
                  onSave={saveFeature}
                  onCancel={() => {
                    setFeatureDialogOpen(false);
                    setEditingFeature(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Editions section */}
        {activeSection === 'editions' && (
          <div className="space-y-6">
            <div className="editions-grid">
              {formData.editions.length === 0 ? (
                <div className="admin-empty-card">
                  <p>{t('No editions yet. Click "Add Edition" to create one.')}</p>
                </div>
              ) : (
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      const sorted = [...formData.editions].sort((a, b) => a.order - b.order);
                      const oldIndex = sorted.findIndex(e => e.id === active.id);
                      const newIndex = sorted.findIndex(e => e.id === over.id);
                      reorderEditions(arrayMove(sorted, oldIndex, newIndex));
                    }
                  }}
                >
                  <SortableContext
                    items={[...formData.editions].sort((a, b) => a.order - b.order).map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {[...formData.editions].sort((a, b) => a.order - b.order).map((edition, index) => (
                      <SortableListItem key={edition.id} id={edition.id}>
                        {(dragHandleProps) => (
                          <div className="edition-card">
                            <div className="edition-card-header">
                              <div className="edition-card-title">
                                <div
                                  className="admin-drag-handle"
                                  {...dragHandleProps}
                                >
                                  <GripVertical size={16} />
                                  <span>{index + 1}</span>
                                </div>
                                <span className="edition-color-dot" style={{ backgroundColor: edition.colorTheme }} />
                                <span className="edition-name">{edition.name}</span>
                              </div>
                              <div className="edition-card-actions">
                                <button
                                  type="button"
                                  className="edition-btn"
                                  onClick={() => {
                                    setEditingEdition(edition);
                                    setEditionDialogOpen(true);
                                  }}
                                  title={t('Edit')}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="edition-btn edition-btn-danger"
                                  onClick={() => deleteEdition(edition.id)}
                                  title={t('Delete')}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <p className="edition-card-desc">{edition.description}</p>
                            <div className="edition-card-specs">
                              <div className="edition-spec">
                                <span>{t('Size:')}</span>
                                <span>{edition.size}</span>
                              </div>
                              <div className="edition-spec">
                                <span>{t('Requirements:')}</span>
                                <span>{edition.requirements}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </SortableListItem>
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Add Edition button */}
            <Dialog open={editionDialogOpen} onOpenChange={(open) => {
              setEditionDialogOpen(open);
              if (!open) setEditingEdition(null);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full" variant="outline">
                  <Plus className="w-4 h-4" />
                  {t('Add Edition')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    {editingEdition ? t('Edit Edition') : t('Add New Edition')}
                  </DialogTitle>
                  <DialogDescription>{t('Configure edition details')}</DialogDescription>
                </DialogHeader>
                <EditionForm
                  key={editingEdition?.name ?? 'new-edition'}
                  edition={editingEdition}
                  onSave={saveEdition}
                  onCancel={() => {
                    setEditionDialogOpen(false);
                    setEditingEdition(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Download section - versions, URLs, torrents, support links */}
        {activeSection === 'download' && (
          <div className="space-y-6">
            {/* URL Template & Editions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Link2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('Download URLs')}</CardTitle>
                    <CardDescription>{t('Configure download URLs for each edition')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Global Settings Row */}
                <div className="download-global-settings">
                  <div className="download-global-field">
                    <Label>{t('Release Version')}</Label>
                    <Input
                      value={formData.downloadPage?.releaseVersion || ''}
                      onChange={(e) => updateField('downloadPage.releaseVersion', e.target.value)}
                      placeholder="v5.1.1"
                      className="download-version-input"
                    />
                  </div>
                  <div className="download-global-field">
                    <Label>{t('Distribution Version')}</Label>
                    <Input
                      value={formData.downloadPage?.version || ''}
                      onChange={(e) => updateField('downloadPage.version', e.target.value)}
                      placeholder="5.1.1"
                      className="download-version-input"
                    />
                  </div>
                  <div className="download-global-field flex-1">
                    <Label>{t('URL Template')}</Label>
                    <Input
                      value={formData.downloadPage?.downloadUrlTemplate || ''}
                      onChange={(e) => updateField('downloadPage.downloadUrlTemplate', e.target.value)}
                      placeholder="https://github.com/.../download/{release}/app-{name_lower}-{version}.iso"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="download-variables">
                  <span className="download-variables-label">{t('Variables:')}</span>
                  <div className="download-variable-item">
                    <code className="download-variable-tag">&#123;release&#125;</code>
                    <span className="download-variable-hint">{t('Release version (tag)')}</span>
                  </div>
                  <div className="download-variable-item">
                    <code className="download-variable-tag">&#123;version&#125;</code>
                    <span className="download-variable-hint">{t('Distribution version')}</span>
                  </div>
                  <div className="download-variable-item">
                    <code className="download-variable-tag">&#123;name&#125;</code>
                    <span className="download-variable-hint">{t('Edition name')}</span>
                  </div>
                  <div className="download-variable-item">
                    <code className="download-variable-tag">&#123;name_lower&#125;</code>
                    <span className="download-variable-hint">{t('Edition name (lowercase)')}</span>
                  </div>
                </div>

                {/* Editions Table */}
                {formData.editions.length > 0 && (
                  <div className="download-editions-table">
                    <div className="download-editions-header">
                      <span className="col-edition">{t('Edition')}</span>
                      <span className="col-version">{t('Version')}</span>
                      <span className="col-url">{t('Custom URL')}</span>
                      <span className="col-preview">{t('Result')}</span>
                    </div>
                    {[...formData.editions].sort((a, b) => a.order - b.order).map((edition, idx) => {
                      const effectiveVersion = edition.version || formData.downloadPage?.version || '';
                      const releaseVersion = formData.downloadPage?.releaseVersion || '';
                      const resolvedUrl = (edition.downloadUrl || formData.downloadPage?.downloadUrlTemplate || '')
                        .replace(/{version}/g, effectiveVersion)
                        .replace(/{release}/g, releaseVersion)
                        .replace(/{name}/g, edition.name)
                        .replace(/{name_lower}/g, edition.name.toLowerCase());

                      return (
                        <div key={edition.id} className="download-editions-row">
                          <div className="col-edition">
                            <span className="edition-dot" style={{ backgroundColor: edition.colorTheme }} />
                            <span>{edition.name}</span>
                          </div>
                          <div className="col-version">
                            <Input
                              value={edition.version || ''}
                              onChange={(e) => {
                                const newEditions = [...formData.editions];
                                newEditions[idx] = { ...edition, version: e.target.value };
                                setFormData({ ...formData, editions: newEditions });
                                setHasChanges(true);
                              }}
                              placeholder={formData.downloadPage?.version || t('Version')}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="col-url">
                            <Input
                              value={edition.downloadUrl || ''}
                              onChange={(e) => {
                                const newEditions = [...formData.editions];
                                newEditions[idx] = { ...edition, downloadUrl: e.target.value };
                                setFormData({ ...formData, editions: newEditions });
                                setHasChanges(true);
                              }}
                              placeholder={t('Use template')}
                              className="h-8 text-sm font-mono"
                            />
                          </div>
                          <div className="col-preview">
                            <button
                              type="button"
                              className="download-preview-url"
                              onClick={() => {
                                navigator.clipboard.writeText(resolvedUrl);
                                toast.success(t('Copied!'));
                              }}
                              title={resolvedUrl}
                            >
                              <span className="url-text">{resolvedUrl || '—'}</span>
                              <Copy className="w-3 h-3 copy-icon" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Torrents - Collapsible Cards */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t('Torrent Downloads')}</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addTorrent} className="h-8 gap-1">
                    <Plus className="w-3 h-3" /> {t('Add')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(formData.torrents || []).length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-lg">
                    <p className="text-muted-foreground text-sm">{t('No torrents configured')}</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id) {
                        const torrents = formData.torrents || [];
                        const oldIndex = torrents.findIndex(t => t.id === active.id);
                        const newIndex = torrents.findIndex(t => t.id === over.id);
                        reorderTorrents(arrayMove(torrents, oldIndex, newIndex));
                      }
                    }}
                  >
                    <SortableContext
                      items={(formData.torrents || []).map(t => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {(formData.torrents || []).map((torrent, tIdx) => (
                        <SortableListItem key={torrent.id} id={torrent.id}>
                          {(dragHandleProps) => (
                            <details className="torrent-accordion">
                              <summary className="torrent-accordion-header">
                                <div className="torrent-accordion-title">
                                  <div
                                    className="admin-drag-handle"
                                    onClick={(e) => e.preventDefault()}
                                    {...dragHandleProps}
                                  >
                                    <GripVertical size={16} />
                                    <span>{tIdx + 1}</span>
                                  </div>
                                  <span className="torrent-name">{torrent.title || t('Untitled')}</span>
                                  <span className="torrent-size-badge">{torrent.size}</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => { e.preventDefault(); deleteTorrent(torrent.id); }}
                                >
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </summary>
                              <div className="torrent-accordion-content">
                                <div className="torrent-basic-fields">
                                  <div className="field">
                                    <Label className="text-xs">{t('Title')}</Label>
                                    <Input
                                      value={torrent.title}
                                      onChange={(e) => updateTorrent(torrent.id, { title: e.target.value })}
                                      className="h-8"
                                    />
                                  </div>
                                  <div className="field">
                                    <Label className="text-xs">{t('Size')}</Label>
                                    <Input
                                      value={torrent.size}
                                      onChange={(e) => updateTorrent(torrent.id, { size: e.target.value })}
                                      className="h-8 w-28"
                                    />
                                  </div>
                                  <div className="field flex-1">
                                    <Label className="text-xs">{t('Download URL')}</Label>
                                    <Input
                                      value={torrent.url || ''}
                                      onChange={(e) => updateTorrent(torrent.id, { url: e.target.value })}
                                      placeholder="https://..."
                                      className="h-8"
                                    />
                                  </div>
                                </div>

                                <div className="torrent-groups-section">
                                  <div className="torrent-groups-header">
                                    <span className="text-xs font-medium text-muted-foreground">{t('Content Groups')}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => addTorrentGroup(torrent.id)}
                                      className="h-6 text-xs gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> {t('Group')}
                                    </Button>
                                  </div>

                                  {torrent.groups.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2">{t('No groups')}</p>
                                  ) : (
                                    <div className="torrent-groups-list">
                                      {torrent.groups.map((group, gIdx) => (
                                        <div key={gIdx} className="torrent-group">
                                          <div className="torrent-group-top">
                                            <Input
                                              value={group.header}
                                              onChange={(e) => updateTorrentGroup(torrent.id, gIdx, { header: e.target.value })}
                                              placeholder={t('Header (e.g. Debian 13)')}
                                              className="h-7 text-sm font-medium"
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => deleteTorrentGroup(torrent.id, gIdx)}
                                              className="h-7 w-7 shrink-0"
                                            >
                                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                                            </Button>
                                          </div>

                                          <div className="torrent-items">
                                            {group.items.map((item, iIdx) => (
                                              <div key={iIdx} className="torrent-item">
                                                <Input
                                                  value={item.label}
                                                  onChange={(e) => updateTorrentItem(torrent.id, gIdx, iIdx, { label: e.target.value })}
                                                  placeholder={t('Label')}
                                                  className="h-6 text-xs"
                                                />
                                                <Input
                                                  value={item.value}
                                                  onChange={(e) => updateTorrentItem(torrent.id, gIdx, iIdx, { value: e.target.value })}
                                                  placeholder={t('Value')}
                                                  className="h-6 text-xs flex-1"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => deleteTorrentItem(torrent.id, gIdx, iIdx)}
                                                  className="text-muted-foreground hover:text-destructive p-1"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            ))}
                                            <button
                                              type="button"
                                              onClick={() => addTorrentItem(torrent.id, gIdx)}
                                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 py-1"
                                            >
                                              <Plus className="w-3 h-3" /> {t('Item')}
                                            </button>
                                          </div>

                                          <div className="torrent-mobile">
                                            <Input
                                              value={group.mobileDescription}
                                              onChange={(e) => updateTorrentGroup(torrent.id, gIdx, { mobileDescription: e.target.value })}
                                              placeholder={t('Mobile summary')}
                                              className="h-6 text-xs"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </details>
                          )}
                        </SortableListItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>

            {/* Support Links - Compact */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('Support Links')}</CardTitle>
                <CardDescription className="text-xs">{t('Shown on Thank You page')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="support-links-grid">
                  <div className="support-link-field">
                    <Label className="text-xs">GitHub</Label>
                    <Input
                      value={formData.thankYouPage?.support?.githubUrl || ''}
                      onChange={(e) => updateField('thankYouPage.support.githubUrl', e.target.value)}
                      placeholder="https://github.com/..."
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="support-link-field">
                    <Label className="text-xs">Telegram</Label>
                    <Input
                      value={formData.thankYouPage?.support?.telegramUrl || ''}
                      onChange={(e) => updateField('thankYouPage.support.telegramUrl', e.target.value)}
                      placeholder="https://t.me/..."
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="support-link-field">
                    <Label className="text-xs">{t('Review')}</Label>
                    <Input
                      value={formData.thankYouPage?.support?.reviewUrl || ''}
                      onChange={(e) => updateField('thankYouPage.support.reviewUrl', e.target.value)}
                      placeholder="https://..."
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SEO section */}
        {activeSection === 'seo' && (
          <div className="space-y-6">
            {/* Primary Meta Tags */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Meta Tags')}</CardTitle>
                <CardDescription>{t('Primary SEO meta tags for search engines')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderField('seo.title', t('Title'))}
                {renderField('seo.description', t('Description'), true)}
                {renderField('seo.keywords', t('Keywords'))}
                {renderField('seo.author', t('Author'))}
                {renderField('seo.canonicalUrl', t('Canonical URL'))}
              </CardContent>
            </Card>

            {/* Open Graph */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Open Graph')}</CardTitle>
                <CardDescription>{t('Social media sharing preview (Facebook, LinkedIn, etc.)')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderField('seo.ogImage', t('OG Image URL'))}
                <p className="text-xs text-muted-foreground">{t('Recommended size: 1200×630px')}</p>
                {renderField('seo.ogSiteName', t('Site Name'))}
                <p className="text-xs text-muted-foreground">{t('og:locale is auto-generated from available translations')}</p>
              </CardContent>
            </Card>

            {/* Twitter */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Twitter')}</CardTitle>
                <CardDescription>{t('Twitter card settings')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t('Card Type')}</Label>
                  <Select
                    value={formData.seo?.twitterCard || 'summary_large_image'}
                    onValueChange={(value) => updateField('seo.twitterCard', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">{t('Summary')}</SelectItem>
                      <SelectItem value="summary_large_image">{t('Summary Large Image')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {renderField('seo.twitterImage', t('Twitter Image URL (optional)'))}
                <p className="text-xs text-muted-foreground">{t('Falls back to OG Image if empty')}</p>
              </CardContent>
            </Card>

            {/* Verification & Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Verification & Analytics')}</CardTitle>
                <CardDescription>{t('Search engine verification and analytics codes')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{t('Yandex Verification')}</Label>
                    <Input
                      value={formData.seo?.yandexVerification || ''}
                      onChange={(e) => updateField('seo.yandexVerification', e.target.value)}
                      placeholder="112ea334e65fa41b"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('Google Verification')}</Label>
                    <Input
                      value={formData.seo?.googleVerification || ''}
                      onChange={(e) => updateField('seo.googleVerification', e.target.value)}
                      placeholder="..."
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>{t('Yandex Metrika ID')}</Label>
                    <Input
                      value={formData.seo?.yandexMetrikaId || ''}
                      onChange={(e) => updateField('seo.yandexMetrikaId', e.target.value)}
                      placeholder="91951521"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('Google Analytics ID')}</Label>
                    <Input
                      value={formData.seo?.googleAnalyticsId || ''}
                      onChange={(e) => updateField('seo.googleAnalyticsId', e.target.value)}
                      placeholder="G-XXXXXXXXXX"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Structured Data */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Structured Data')}</CardTitle>
                <CardDescription>{t('JSON-LD schema for rich search results')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>{t('Software Version')}</Label>
                    <Input
                      value={formData.seo?.structuredData?.softwareVersion || ''}
                      onChange={(e) => updateField('seo.structuredData.softwareVersion', e.target.value)}
                      placeholder="4.0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('Rating Value')}</Label>
                    <Input
                      value={formData.seo?.structuredData?.ratingValue || ''}
                      onChange={(e) => updateField('seo.structuredData.ratingValue', e.target.value)}
                      placeholder="4.8"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('Rating Count')}</Label>
                    <Input
                      value={formData.seo?.structuredData?.ratingCount || ''}
                      onChange={(e) => updateField('seo.structuredData.ratingCount', e.target.value)}
                      placeholder="150"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sitemap Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Sitemap')}</CardTitle>
                <CardDescription>{t('External links to include in sitemap.xml')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t('External Links')}</Label>
                  <Textarea
                    value={(formData.seo?.sitemap?.externalLinks || []).join('\n')}
                    onChange={(e) => {
                      const links = e.target.value.split('\n').filter(l => l.trim());
                      setFormData({
                        ...formData,
                        seo: {
                          ...formData.seo!,
                          sitemap: {
                            includeExternalLinks: true,
                            externalLinks: links
                          }
                        }
                      });
                      setHasChanges(true);
                    }}
                    placeholder="https://minios.dev/docs&#10;https://t.me/s/minios_news&#10;https://github.com/minios-linux/minios-live"
                    className="font-mono text-xs h-32"
                  />
                  <p className="text-xs text-muted-foreground">{t('One URL per line')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Translations section */}
        {activeSection === 'translations' && (
          <TranslationEditor />
        )}

        {/* Blog section */}
        {activeSection === 'blog' && (
          <div className="space-y-6">
            {/* Blog Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Blog Settings')}</CardTitle>
                <CardDescription>{t('Configure blog grid layout and pagination')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="blog-cols-desktop">{t('Desktop Columns')}</Label>
                    <Input
                      id="blog-cols-desktop"
                      type="number"
                      min={1}
                      max={6}
                      value={formData.blog?.columns?.desktop ?? 3}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 3;
                        setFormData({
                          ...formData,
                          blog: {
                            ...formData.blog,
                            columns: {
                              desktop: value,
                              tablet: formData.blog?.columns?.tablet ?? 2,
                              mobile: formData.blog?.columns?.mobile ?? 1
                            },
                            postsPerPage: formData.blog?.postsPerPage ?? 6
                          }
                        });
                        setHasChanges(true);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{t('≥1200px')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="blog-cols-tablet">{t('Tablet Columns')}</Label>
                    <Input
                      id="blog-cols-tablet"
                      type="number"
                      min={1}
                      max={4}
                      value={formData.blog?.columns?.tablet ?? 2}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 2;
                        setFormData({
                          ...formData,
                          blog: {
                            ...formData.blog,
                            columns: {
                              desktop: formData.blog?.columns?.desktop ?? 3,
                              tablet: value,
                              mobile: formData.blog?.columns?.mobile ?? 1
                            },
                            postsPerPage: formData.blog?.postsPerPage ?? 6
                          }
                        });
                        setHasChanges(true);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{t('769px-1199px')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="blog-cols-mobile">{t('Mobile Columns')}</Label>
                    <Input
                      id="blog-cols-mobile"
                      type="number"
                      min={1}
                      max={2}
                      value={formData.blog?.columns?.mobile ?? 1}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setFormData({
                          ...formData,
                          blog: {
                            ...formData.blog,
                            columns: {
                              desktop: formData.blog?.columns?.desktop ?? 3,
                              tablet: formData.blog?.columns?.tablet ?? 2,
                              mobile: value
                            },
                            postsPerPage: formData.blog?.postsPerPage ?? 6
                          }
                        });
                        setHasChanges(true);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{t('≤768px')}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="blog-posts-per-page">{t('Posts Per Page')}</Label>
                  <Input
                    id="blog-posts-per-page"
                    type="number"
                    min={1}
                    max={24}
                    value={formData.blog?.postsPerPage ?? 6}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 6;
                      setFormData({
                        ...formData,
                        blog: {
                          ...formData.blog,
                          columns: formData.blog?.columns ?? { desktop: 3, tablet: 2, mobile: 1 },
                          postsPerPage: value
                        }
                      });
                      setHasChanges(true);
                    }}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">{t('Initial posts loaded and "Load More" batch size')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Blog Posts Manager */}
            <BlogManager />
          </div>
        )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  });

// Generic Sortable Item wrapper for vertical lists
function SortableListItem({
  id,
  children
}: {
  id: string;
  children: (dragHandleProps: React.HTMLAttributes<HTMLDivElement>) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

// Sortable wrapper for gallery items
function SortableGalleryItem({
  id,
  img,
  index,
  isHero,
  onDelete,
  onUpdate,
  onSetHero,
  t
}: {
  id: string;
  img: string;
  index: number;
  isHero: boolean;
  onDelete: () => void;
  onUpdate: (value: string) => void;
  onSetHero: () => void;
  t: (key: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <GalleryImageItem
        key={`${id}-${img}`}
        img={img}
        index={index}
        isHero={isHero}
        onDelete={onDelete}
        onUpdate={onUpdate}
        onSetHero={onSetHero}
        dragHandleProps={{ ...attributes, ...listeners }}
        t={t}
      />
    </div>
  );
}

// Gallery Grid with DnD support
function GalleryGrid({
  images,
  heroImage,
  onReorder,
  onDelete,
  onUpdate,
  onSetHero,
  t
}: {
  images: string[];
  heroImage?: string;
  onReorder: (images: string[]) => void;
  onDelete: (imagePath: string, index: number) => void;
  onUpdate: (index: number, value: string) => void;
  onSetHero: (img: string) => void;
  t: (key: string) => string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((_, i) => `gallery-${i}` === active.id);
      const newIndex = images.findIndex((_, i) => `gallery-${i}` === over.id);
      onReorder(arrayMove(images, oldIndex, newIndex));
    }
  };

  const effectiveHeroImage = heroImage || images[0];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={images.map((_, i) => `gallery-${i}`)}
        strategy={rectSortingStrategy}
      >
        <div className="edition-gallery-grid">
          {images.map((img, index) => {
            const isHero = img === effectiveHeroImage && img !== '';
            return (
              <SortableGalleryItem
                key={`gallery-${index}`}
                id={`gallery-${index}`}
                img={img}
                index={index}
                isHero={isHero}
                onDelete={() => onDelete(img, index)}
                onUpdate={(value) => onUpdate(index, value)}
                onSetHero={() => onSetHero(img)}
                t={t}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Gallery Image Item Component - handles missing images gracefully
function GalleryImageItem({
  img,
  index,
  isHero,
  onDelete,
  onUpdate,
  onSetHero,
  dragHandleProps,
  t
}: {
  img: string;
  index: number;
  isHero: boolean;
  onDelete: () => void;
  onUpdate: (value: string) => void;
  onSetHero: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  t: (key: string) => string;
}) {
  // hasError state is reset when component remounts (via key prop)
  const [hasError, setHasError] = useState(false);

  // Show placeholder if no image URL or error loading
  const showPlaceholder = hasError || !img || img.trim() === '';

  return (
    <div className={`edition-gallery-item ${isHero ? 'is-hero' : ''}`}>
      <div className="edition-gallery-thumb" onClick={onSetHero} title={isHero ? t('Current hero image') : t('Click to set as hero image')}>
        {showPlaceholder ? (
          <div className="edition-gallery-placeholder">
            <div className="placeholder-content">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{!img ? t('Enter image URL') : t('Image not found')}</span>
            </div>
          </div>
        ) : (
          <img
            src={img}
            alt={`Gallery ${index + 1}`}
            className="edition-gallery-img"
            onError={() => setHasError(true)}
          />
        )}
        {/* Hero badge */}
        {isHero && (
          <div className="edition-gallery-hero-badge" title={t('Hero image')}>
            <Sparkles className="w-3 h-3" />
          </div>
        )}
        {/* Position indicator */}
        <div className="edition-gallery-index">{index + 1}</div>
        {/* Drag handle */}
        {dragHandleProps && (
          <div
            className="edition-gallery-drag"
            onClick={(e) => e.stopPropagation()}
            {...dragHandleProps}
          >
            <GripVertical className="w-3 h-3" />
          </div>
        )}
        {/* Delete button */}
        <button
          type="button"
          className="edition-gallery-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title={t('Delete image')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <Input
        value={img}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder={t('Image URL or path')}
        className="edition-gallery-url"
      />
    </div>
  );
}

// Edition Form Component
function EditionForm({ edition, onSave, onCancel }: {
  edition: Edition | null;
  onSave: (data: Partial<Edition>) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  
  const getDefaultFormData = (ed: Edition | null): Partial<Edition> => {
    if (ed) {
      return {
        ...ed,
        galleryImages: ed.galleryImages || [],
        features: ed.features || [],
        heroImage: ed.heroImage || ''
      };
    }
    return {
      name: '',
      version: '',
      colorTheme: '#3b82f6',
      description: '',
      heroDescription: '',
      heroImage: '',
      downloadUrl: '',
      primaryButtonType: 'download',
      primaryButtonText: '',
      primaryButtonIcon: '',
      primaryButtonUrl: '',
      showTorrent: true,
      hoverImage: '',
      showGallery: true,
      size: '',
      requirements: 'CPU x64',
      ram: '',
      cpu: '',
      galleryImages: [],
      features: [],
      order: 0,
      showInHero: true
    };
  };

  // formData is initialized from edition prop; component remounts via key prop when edition changes
  const [formData, setFormData] = useState<Partial<Edition>>(() => getDefaultFormData(edition));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error(t('Name is required'));
      return;
    }
    // Filter out empty images before saving
    const cleanedData = {
      ...formData,
      galleryImages: [...(formData.galleryImages || [])].filter(img => {
        if (typeof img === 'string') return img.trim() !== '';
        return img.url?.trim() !== '';
      })
    };
    onSave(cleanedData);
  };

  // Gallery images management
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation dialog state removed - images are never physically deleted

  const addGalleryImage = () => {
    setFormData({
      ...formData,
      galleryImages: [...(formData.galleryImages || []), '']
    });
  };

  const updateGalleryImage = (index: number, value: string) => {
    const newImages = [...(formData.galleryImages || [])];
    newImages[index] = value;
    setFormData({ ...formData, galleryImages: newImages });
  };

  const removeGalleryImage = (index: number) => {
    const newImages = (formData.galleryImages || []).filter((_, i) => i !== index);
    setFormData({ ...formData, galleryImages: newImages });
  };

  const reorderGalleryImages = (newImages: string[]) => {
    setFormData({ ...formData, galleryImages: newImages });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newImages = [...(formData.galleryImages || [])];

    for (const file of Array.from(files)) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      try {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('subfolder', 'img');

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formDataUpload
        });

        const result = await response.json();

        if (result.success && result.path) {
          newImages.push(result.path);
          toast.success(`Uploaded ${result.filename}`);
        } else {
          toast.error(result.error || 'Upload failed');
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setFormData({ ...formData, galleryImages: newImages });
    setUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const deleteImageFile = async (_imagePath: string, index: number) => {
    // Just remove from gallery list, never delete files physically
    removeGalleryImage(index);
  };

  // Preview URL with variable substitution (for edition-specific URL override)
  const previewDownloadUrl = formData.downloadUrl
    ?.replace(/{version}/g, formData.version || 'VERSION')
    .replace(/{name}/g, formData.name || 'NAME')
    .replace(/{name_lower}/g, (formData.name || 'name').toLowerCase())
    .replace(/{id}/g, edition?.id || 'ID') || '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label>{t('Name')} *</Label>
        <Input
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('e.g., Standard')}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('Color Theme')}</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={formData.colorTheme || '#3b82f6'}
            onChange={(e) => setFormData({ ...formData, colorTheme: e.target.value })}
            className="w-20 h-10"
          />
          <Input
            value={formData.colorTheme || ''}
            onChange={(e) => setFormData({ ...formData, colorTheme: e.target.value })}
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('Description')}</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('Hero Description (for slider)')}</Label>
        <Textarea
          value={formData.heroDescription || ''}
          onChange={(e) => setFormData({ ...formData, heroDescription: e.target.value })}
          rows={2}
        />
      </div>

      {/* Display Options */}
      <div className="space-y-1.5">
        <Label>{t('Display Options')}</Label>
        <div className="edition-toggles">
          <label className="edition-toggle-wrapper">
            <input
              type="checkbox"
              checked={formData.showInHero !== false}
              onChange={(e) => setFormData({ ...formData, showInHero: e.target.checked })}
            />
            <span className="toggle-label">{t('Carousel')}</span>
            <span className="toggle-switch"></span>
          </label>
          <label className="edition-toggle-wrapper">
            <input
              type="checkbox"
              checked={formData.showTorrent !== false}
              onChange={(e) => setFormData({ ...formData, showTorrent: e.target.checked })}
            />
            <span className="toggle-label">{t('Torrent')}</span>
            <span className="toggle-switch"></span>
          </label>
          <label className="edition-toggle-wrapper">
            <input
              type="checkbox"
              checked={formData.showGallery !== false}
              onChange={(e) => setFormData({ ...formData, showGallery: e.target.checked })}
            />
            <span className="toggle-label">{t('Gallery')}</span>
            <span className="toggle-switch"></span>
          </label>
        </div>
      </div>

      {/* Primary Button */}
      <div className="space-y-1.5">
        <Label>{t('Button Type')}</Label>
        <Select
          value={formData.primaryButtonType || 'download'}
          onValueChange={(value) => setFormData({ ...formData, primaryButtonType: value as 'download' | 'external' })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('Select type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="download">{t('Download')}</SelectItem>
            <SelectItem value="external">{t('External Link')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t('Button Text')}</Label>
        <Input
          value={formData.primaryButtonText || ''}
          onChange={(e) => setFormData({ ...formData, primaryButtonText: e.target.value })}
          placeholder={formData.primaryButtonType === 'external' ? 'Visit Website' : 'Download ISO'}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('Button Icon')}</Label>
        <IconPicker
          value={formData.primaryButtonIcon || (formData.primaryButtonType === 'external' ? 'ExternalLink' : 'Download')}
          onChange={(icon) => setFormData({ ...formData, primaryButtonIcon: icon })}
        />
      </div>

      {formData.primaryButtonType === 'external' && (
        <div className="space-y-1.5">
          <Label>{t('External URL')}</Label>
          <Input
            value={formData.primaryButtonUrl || ''}
            onChange={(e) => setFormData({ ...formData, primaryButtonUrl: e.target.value })}
            placeholder="https://example.com"
          />
        </div>
      )}

      {/* Hover Image */}
      <div className="space-y-1.5">
        <Label>{t('Hover Image')} <span className="text-muted-foreground text-xs">({t('optional')})</span></Label>
        <Input
          value={formData.hoverImage || ''}
          onChange={(e) => setFormData({ ...formData, hoverImage: e.target.value })}
          placeholder="/assets/img/edition_hover.jpg"
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('Download URL')} <span className="text-muted-foreground text-xs">({t('optional, overrides global template')})</span></Label>
        <Input
          value={formData.downloadUrl || ''}
          onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
          placeholder={t('Leave empty to use global template')}
        />
        {formData.downloadUrl && (
          <>
            <p className="text-xs text-muted-foreground">
              {t('Variables:')} <code className="bg-muted px-1 rounded">{'{version}'}</code> <code className="bg-muted px-1 rounded">{'{name}'}</code> <code className="bg-muted px-1 rounded">{'{name_lower}'}</code>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('Preview:')} <span className="text-accent break-all">{previewDownloadUrl || '—'}</span>
            </p>
          </>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{t('Size')}</Label>
        <Input
          value={formData.size || ''}
          onChange={(e) => setFormData({ ...formData, size: e.target.value })}
          placeholder={t('e.g., 1.2 GB')}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('Order')}</Label>
        <Input
          type="number"
          value={formData.order ?? 0}
          onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('RAM')}</Label>
        <Input
          value={formData.ram || ''}
          onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
          placeholder={t('e.g., 768 MB')}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('CPU')}</Label>
        <Input
          value={formData.cpu || ''}
          onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
          placeholder={t('e.g., 1 GHz')}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('Requirements')}</Label>
        <Input
          value={formData.requirements || ''}
          onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
          placeholder={t('e.g., CPU x64')}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div>
            <Label>{t('Gallery Images')}</Label>
            <p className="text-xs text-muted-foreground mt-1">{t('Click on image to set as hero (for carousel)')}</p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              style={{ display: 'none' }}
              id="gallery-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-1"
            >
              <Upload className="w-4 h-4" /> {uploading ? t('Uploading...') : t('Upload')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addGalleryImage} className="gap-1">
              <Plus className="w-4 h-4" /> {t('Add URL')}
            </Button>
          </div>
        </div>
        {(formData.galleryImages?.length || 0) === 0 ? (
          <p className="text-sm text-muted-foreground">{t('No images. Upload files or add URLs manually.')}</p>
        ) : (
          <GalleryGrid
            images={(formData.galleryImages || []).map(getImageUrl)}
            heroImage={formData.heroImage}
            onReorder={reorderGalleryImages}
            onDelete={deleteImageFile}
            onUpdate={updateGalleryImage}
            onSetHero={(img) => setFormData({ ...formData, heroImage: img })}
            t={t}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{t('Features (comma separated)')}</Label>
        <Textarea
          value={formData.features?.join(', ') || ''}
          onChange={(e) => setFormData({ ...formData, features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>{t('Cancel')}</Button>
        <Button type="submit">{edition ? t('Update') : t('Create')}</Button>
      </div>
    </form>
  );
}

// Feature Form Component
function FeatureForm({ feature, onSave, onCancel }: {
  feature: Feature | null;
  onSave: (data: Partial<Feature>) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  
  const getDefaultFormData = (feat: Feature | null): Partial<Feature> => {
    if (feat) {
      return {
        ...feat,
        bulletPoints: feat.bulletPoints || []
      };
    }
    return {
      icon: 'Rocket',
      title: '',
      description: '',
      bulletPoints: [],
      order: 0
    };
  };

  // formData is initialized from feature prop; component remounts via key prop when feature changes
  const [formData, setFormData] = useState<Partial<Feature>>(() => getDefaultFormData(feature));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error(t('Title and description are required'));
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label>{t('Icon')}</Label>
        <IconPicker
          value={formData.icon || ''}
          onChange={(icon) => setFormData({ ...formData, icon })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('Title')} *</Label>
        <Input
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={t('e.g., Live Boot System')}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('Description')} *</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('Bullet Points (one per line)')}</Label>
        <Textarea
          value={formData.bulletPoints?.join('\n') || ''}
          onChange={(e) => setFormData({ ...formData, bulletPoints: e.target.value.split('\n').filter(Boolean) })}
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('Order')}</Label>
        <Input
          type="number"
          value={formData.order ?? 0}
          onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>{t('Cancel')}</Button>
        <Button type="submit">{feature ? t('Update') : t('Create')}</Button>
      </div>
    </form>
  );
}
