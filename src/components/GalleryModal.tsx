import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, images, currentIndex, onNext, onPrev }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrev, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`modal ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <button className="modal-close" onClick={onClose}><X size={32} /></button>
      <button className="modal-nav prev" onClick={(e) => { e.stopPropagation(); onPrev(); }}><ChevronLeft size={32} /></button>
      <img 
        src={images[currentIndex]} 
        className="modal-img" 
        alt="Gallery" 
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
      />
      <button className="modal-nav next" onClick={(e) => { e.stopPropagation(); onNext(); }}><ChevronRight size={32} /></button>
    </div>
  );
};

export default GalleryModal;
