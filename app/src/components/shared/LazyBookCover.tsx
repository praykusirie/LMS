import { useState, useRef, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LazyBookCoverProps {
  src: string | null;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export function LazyBookCover({
  src,
  fallbackSrc,
  alt,
  className,
  containerClassName,
}: LazyBookCoverProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const imageSrc = src || fallbackSrc;

  useEffect(() => {
    if (!isInView || !imageSrc) return;

    setStatus('loading');
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => setStatus('loaded');
    img.onerror = () => setStatus('error');
  }, [isInView, imageSrc]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-secondary flex items-center justify-center',
        containerClassName
      )}
    >
      {/* Placeholder / skeleton */}
      {(status === 'idle' || status === 'loading') && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary animate-pulse">
          <BookOpen className="h-4 w-4 text-muted-foreground/40" />
        </div>
      )}

      {/* Loaded image */}
      {status === 'loaded' && imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            className
          )}
        />
      )}

      {/* Error fallback */}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <BookOpen className="h-4 w-4 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}
