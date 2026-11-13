import { useState } from 'react';
import { Bookmark, Check, Film, Play } from 'lucide-react';
import type { MediaItem } from '../types/framex';
import { useAuth } from '../context/AuthContext';

interface MediaCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onQuickPlay?: (item: MediaItem) => void;
  progressPercent?: number;
  subtitleOverride?: string;
}

export function MediaCard({
  item,
  onSelect,
  onQuickPlay,
  progressPercent,
  subtitleOverride,
}: MediaCardProps) {
  const { isInLibrary, toggleLibraryItem } = useAuth();
  const [imgError, setImgError] = useState(false);

  const saved = isInLibrary(item.id, 'watchlist', item.type);

  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleLibraryItem({
      list_type: 'watchlist',
      media_type: item.type || 'movie',
      item_id: item.id,
      slug: item.slug,
      provider: item.source || 'moviebox',
      title: item.title,
      poster: item.poster || null,
      year: item.year ? String(item.year) : null,
    });
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickPlay) {
      onQuickPlay(item);
    } else {
      onSelect(item);
    }
  };

  const metaParts: string[] = [];
  if (item.year) metaParts.push(String(item.year));
  if (item.rating) metaParts.push(`★ ${item.rating}`);
  else if (item.type) metaParts.push(item.type === 'series' ? 'Series' : 'Movie');

  return (
    <article
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open ${item.title}`}
      className="group relative flex flex-col glass-surface rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 hover:border-rose-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
    >
      {/* Compact Portrait Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#15070c]">
        {item.poster && !imgError ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#2a0b16] via-[#16070c] to-[#0b0406]">
            <Film className="w-6 h-6 text-rose-300/40 mb-1.5" />
            <span className="font-display text-[11px] font-medium text-rose-100/75 line-clamp-3">
              {item.title}
            </span>
          </div>
        )}

        {/* Measured Contrast Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080305]/95 via-transparent to-black/15 opacity-75 group-hover:opacity-95 transition-opacity" />

        {/* Desktop Hover Actions (Touch-friendly tap opens detail modal) */}
        <div className="hidden sm:flex absolute inset-x-2 bottom-2 items-center justify-between gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            onClick={handlePlay}
            aria-label={`Play ${item.title}`}
            className="glass-btn-primary h-7 px-2.5 rounded-lg text-[11px] font-semibold text-white inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Play</span>
          </button>
          <button
            type="button"
            onClick={handleToggleWatchlist}
            aria-label={saved ? `Remove ${item.title} from watchlist` : `Add ${item.title} to watchlist`}
            className={`h-7 w-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              saved
                ? 'bg-rose-600 text-white border border-rose-300/30'
                : 'glass-btn text-white'
            }`}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Continue Watching Progress Bar */}
        {typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-amber-300"
              style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
            />
          </div>
        )}
      </div>

      {/* Compact Unboxed Metadata */}
      <div className="px-2.5 py-2 flex flex-col gap-0.5">
        <h3 className="font-display text-xs sm:text-[13px] font-semibold text-white truncate leading-snug">
          {item.title}
        </h3>
        <p className="text-[11px] text-rose-100/60 truncate tabular-nums">
          {subtitleOverride || metaParts.join(' · ') || 'Streaming'}
        </p>
      </div>
    </article>
  );
}
