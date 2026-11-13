import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MediaItem } from '../types/framex';
import { MediaCard } from './MediaCard';

interface MediaCarouselProps {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  loading?: boolean;
  onSelect: (item: MediaItem) => void;
  onQuickPlay?: (item: MediaItem) => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function MediaCarousel({
  title,
  subtitle,
  items,
  loading = false,
  onSelect,
  onQuickPlay,
  actionLabel,
  onAction,
}: MediaCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.82, behavior: 'smooth' });
  };

  if (!loading && items.length === 0) return null;

  return (
    <section className="space-y-2.5">
      {(title || actionLabel) && (
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-lg sm:text-xl font-semibold text-white truncate">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-rose-100/60 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {actionLabel && onAction && (
              <button
                type="button"
                onClick={onAction}
                className="text-xs font-medium text-rose-300 hover:text-white transition-colors px-2 py-1 whitespace-nowrap cursor-pointer"
              >
                {actionLabel}
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label={`Scroll ${title || 'carousel'} left`}
                className="glass-btn w-8 h-8 rounded-lg flex items-center justify-center text-rose-100 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label={`Scroll ${title || 'carousel'} right`}
                className="glass-btn w-8 h-8 rounded-lg flex items-center justify-center text-rose-100 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto no-scrollbar pb-1.5 snap-x snap-mandatory scroll-smooth"
      >
        {loading
          ? Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={idx}
                className="w-[126px] sm:w-[144px] lg:w-[156px] xl:w-[164px] shrink-0 snap-start glass-surface rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[2/3] bg-rose-950/40" />
                <div className="px-2.5 py-2 space-y-1.5">
                  <div className="h-3 bg-rose-900/40 rounded w-4/5" />
                  <div className="h-2.5 bg-rose-900/30 rounded w-1/2" />
                </div>
              </div>
            ))
          : items.map((item) => (
              <div
                key={`${item.source}-${item.id}-${item.slug}`}
                className="w-[126px] sm:w-[144px] lg:w-[156px] xl:w-[164px] shrink-0 snap-start"
              >
                <MediaCard item={item} onSelect={onSelect} onQuickPlay={onQuickPlay} />
              </div>
            ))}
      </div>
    </section>
  );
}
