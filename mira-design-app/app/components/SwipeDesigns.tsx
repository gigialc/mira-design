'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface SwipeDesignsProps {
  prompt: string;
}

interface DesignCard {
  id: number;
  imageUrl: string;
  title: string;
  description: string;
}

// Mock design data - will fetch from database later
const mockDesigns: DesignCard[] = [
  {
    id: 1,
    imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=800&fit=crop',
    title: 'Modern Minimalist',
    description: 'Clean and simple design with bold typography',
  },
  {
    id: 2,
    imageUrl: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=1200&h=800&fit=crop',
    title: 'Vibrant Colors',
    description: 'Bold and energetic color palette',
  },
  {
    id: 3,
    imageUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1200&h=800&fit=crop',
    title: 'Elegant Typography',
    description: 'Sophisticated font choices and spacing',
  },
  {
    id: 4,
    imageUrl: 'https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=1200&h=800&fit=crop',
    title: 'Geometric Patterns',
    description: 'Structured shapes and clean lines',
  },
  {
    id: 5,
    imageUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200&h=800&fit=crop',
    title: 'Organic Flow',
    description: 'Natural curves and fluid movements',
  },
];

export default function SwipeDesigns({ prompt }: SwipeDesignsProps) {
  const [designs] = useState<DesignCard[]>(mockDesigns);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSwipe = useCallback((_direction: 'left' | 'right') => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex >= designs.length - 1) {
        // All designs swiped - stay on last design
        return prevIndex;
      }
      return prevIndex + 1;
    });
  }, [designs.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartPos({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    setDragOffset({
      x: currentX - startPos.x,
      y: currentY - startPos.y,
    });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0) {
        handleSwipe('right');
      } else {
        handleSwipe('left');
      }
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (isDragging) {
      const handleDocumentMouseMove = (e: MouseEvent) => {
        setDragOffset({
          x: e.clientX - startPos.x,
          y: e.clientY - startPos.y,
        });
      };

      const handleDocumentMouseUp = () => {
        const threshold = 100;
        setDragOffset((currentOffset) => {
          if (Math.abs(currentOffset.x) > threshold) {
            if (currentOffset.x > 0) {
              handleSwipe('right');
            } else {
              handleSwipe('left');
            }
          }
          return { x: 0, y: 0 };
        });
        
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleDocumentMouseMove);
      document.addEventListener('mouseup', handleDocumentMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleDocumentMouseMove);
        document.removeEventListener('mouseup', handleDocumentMouseUp);
      };
    }
  }, [isDragging, startPos, handleSwipe]);

  const rotation = dragOffset.x * 0.1;
  const opacity = 1 - Math.abs(dragOffset.x) / 300;

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-end z-10">
        <div className="px-4 py-2 rounded-full text-sm font-medium text-neutral-700 bg-white/70 backdrop-blur-md border border-white/60">
          {currentIndex + 1} / {designs.length}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-center z-10">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          Swipe to curate your design
        </h2>
        <p className="text-sm text-neutral-600 mb-0">
          Swipe right to like, left to pass
        </p>
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-2xl aspect-[4/3] mt-8">
        {designs.slice(currentIndex, currentIndex + 3).map((design, index) => {
          const isCurrent = index === 0;
          const scale = isCurrent ? 1 : 1 - index * 0.05;
          const yOffset = index * 10;
          
          return (
            <div
              key={design.id}
              ref={isCurrent ? cardRef : null}
              className="absolute inset-0 transition-all duration-300 ease-out"
              style={{
                transform: isCurrent
                  ? `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg) scale(${scale})`
                  : `translateY(${yOffset}px) scale(${scale})`,
                opacity: isCurrent ? opacity : 1 - index * 0.3,
                zIndex: designs.length - index,
                cursor: isCurrent ? 'grab' : 'default',
              }}
              onTouchStart={isCurrent ? handleTouchStart : undefined}
              onTouchMove={isCurrent ? handleTouchMove : undefined}
              onTouchEnd={isCurrent ? handleTouchEnd : undefined}
              onMouseDown={isCurrent ? (e: React.MouseEvent) => {
                setIsDragging(true);
                setStartPos({
                  x: e.clientX,
                  y: e.clientY,
                });
              } : undefined}
            >
              <div className="relative w-full h-full rounded-3xl overflow-hidden">
                <img
                  src={design.imageUrl}
                  alt={design.title}
                  className="w-full h-full object-cover rounded-3xl"
                />
                {/* Swipe indicators */}
                {isCurrent && Math.abs(dragOffset.x) > 50 && (
                  <div
                    className={`absolute top-4 ${
                      dragOffset.x > 0 ? 'right-4' : 'left-4'
                    } px-4 py-2 rounded-full bg-white/90 backdrop-blur-md font-bold text-lg shadow-lg`}
                  >
                    <span className="text-black">{dragOffset.x > 0 ? '✓' : '✕'}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-6">
        <button
          onClick={() => handleSwipe('left')}
          className="w-16 h-16 rounded-full bg-white/70 backdrop-blur-md border-4 border-black flex items-center justify-center shadow-lg hover:bg-black-50 transition-all"
          disabled={currentIndex >= designs.length}
        >
          <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>   
        <button
          onClick={() => handleSwipe('right')}
          className="w-16 h-16 rounded-full bg-white/70 backdrop-blur-md border-4 border-black flex items-center justify-center shadow-lg hover:bg-black-50 transition-all"
          disabled={currentIndex >= designs.length}
        >
          <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

