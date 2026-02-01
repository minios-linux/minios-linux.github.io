/**
 * Icon map for DynamicIcon component
 * 
 * This file contains a curated subset of lucide-react icons that are used
 * in the application. This allows tree-shaking to work properly instead of
 * importing the entire lucide-react library (~500KB savings).
 * 
 * To add a new icon:
 * 1. Import it from 'lucide-react'
 * 2. Add it to the iconMap object with the same name as the key
 */

import {
  // Navigation & UI
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  ExternalLink,
  GripVertical,
  Maximize2,
  Eye,
  EyeOff,
  Filter,
  Home,
  
  // Actions
  Download,
  Upload,
  Save,
  Copy,
  Trash2,
  Pencil,
  Plus,
  RefreshCw,
  Undo2,
  
  // Status & Feedback
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  
  // Theme & Display
  Sun,
  Moon,
  Languages,
  Globe,
  
  // Content & Media
  Image,
  FileText,
  Newspaper,
  Calendar,
  Clock,
  Tag,
  User,
  
  // Technology & Hardware
  Cpu,
  HardDrive,
  MemoryStick,
  Server,
  Monitor,
  Usb,
  Wifi,
  
  // Development
  Code,
  Terminal,
  Database,
  Cloud,
  Github,
  
  // Communication
  MessageCircle,
  Mail,
  Megaphone,
  
  // Features (from AVAILABLE_ICONS)
  Rocket,
  Gauge,
  PackageOpen,
  Zap,
  Shield,
  Lock,
  BookOpen,
  Star,
  Heart,
  Users,
  Package,
  
  // Formatting
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  
  // Links & Downloads
  Link,
  Link2,
  Magnet,
  FolderOpen,
  ArrowLeft,
  ArrowRight,
  Bug,
  Sparkles,
  
  // Fallback
  HelpCircle,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

/**
 * Map of icon names to icon components.
 * Used by DynamicIcon for runtime icon rendering by name.
 */
export const iconMap: Record<string, LucideIcon> = {
  // Navigation & UI
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  ExternalLink,
  GripVertical,
  Maximize2,
  Eye,
  EyeOff,
  Filter,
  Home,
  
  // Actions
  Download,
  Upload,
  Save,
  Copy,
  Trash2,
  Pencil,
  Plus,
  RefreshCw,
  Undo2,
  
  // Status & Feedback
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  
  // Theme & Display
  Sun,
  Moon,
  Languages,
  Globe,
  
  // Content & Media
  Image,
  FileText,
  Newspaper,
  Calendar,
  Clock,
  Tag,
  User,
  
  // Technology & Hardware
  Cpu,
  HardDrive,
  MemoryStick,
  Server,
  Monitor,
  Usb,
  Wifi,
  
  // Development
  Code,
  Terminal,
  Database,
  Cloud,
  Github,
  
  // Communication
  MessageCircle,
  Mail,
  Megaphone,
  
  // Features (from AVAILABLE_ICONS)
  Rocket,
  Gauge,
  PackageOpen,
  Zap,
  Shield,
  Lock,
  BookOpen,
  Star,
  Heart,
  Users,
  Package,
  
  // Formatting
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  
  // Links & Downloads
  Link,
  Link2,
  Magnet,
  FolderOpen,
  ArrowLeft,
  ArrowRight,
  Bug,
  Sparkles,
  
  // Fallback
  HelpCircle,
};

// Re-export HelpCircle as fallback icon
export { HelpCircle as FallbackIcon };

// Type for valid icon names
export type IconName = keyof typeof iconMap;
