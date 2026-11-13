import { useState } from 'react';
import { Bookmark, Check, Film, Play } from 'lucide-react';
import type { MediaItem } from '../../types/framex';
import { useAuth } from '../../context/AuthContext';

interface ClassicMediaCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onQuickPlay?: (item: MediaItem) => void;
  progressPercent?: number;
  subtitleOverride?: string;
}

export function ClassicMediaCard({
  item,
  onSelect,
  onQuickPlay,
  progressPercent,
  subtitleOverride,
}: ClassicMediaCardProps) {
  const { isInLibrary, toggleLibraryItem } = useAuth();
  const [imgError, setImgError] = useState(false);
  const saved = isInLibrary(item.id, 'watchlist', item.type);

  const handleWatchlist = async (e: React.MouseEvent) => {
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
      className="group p-1.5 rounded-2xl bg-[#16060c]/85 border border-amber-200/15 hover:border-amber-200/40 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
    >
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#220a13]">
        {item.poster && !imgError ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#2d0c18] to-[#0d0407]">
            <Film className="w-5 h-5 text-amber-200/50 mb-1.5" />
            <span className="font-editorial text-sm italic text-amber-100/85 line-clamp-3">
              {item.title}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#090306] via-transparent to-black/25 opacity-70 group-hover:opacity-95 transition-opacity" />

        {/* Corner champagne year/rating line */}
        {(item.rating || item.year) && (
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-amber-100/90 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded bg-black/65 border border-amber-200/15 tabular-nums">
              {item.year || (item.type === 'series' ? 'TV' : 'FILM')}
            </span>
            {item.rating && (
              <span className="px-1.5 py-0.5 rounded bg-black/65 border border-amber-200/15 text-amber-300 tabular-nums">
                ★ {item.rating}
              </span>
            )}
          </div>
        )}

        {/* Hover Actions */}
        <div className="hidden sm:flex absolute inset-x-2 bottom-2 items-center justify-between gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onQuickPlay) onQuickPlay(item);
              else onSelect(item);
            }}
            aria-label={`Play ${item.title}`}
            className="glass-btn-primary h-7 px-2.5 rounded-lg text-[11px] font-medium text-white inline-flex items-center gap-1 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Screen</span>
          </button>
          <button
            type="button"
            onClick={handleWatchlist}
            aria-label={saved ? 'Remove from Watchlist' : 'Add to Watchlist'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border ${
              saved
                ? 'bg-amber-300/20 border-amber-300/50 text-amber-200'
                : 'bg-black/65 border-amber-200/20 text-white hover:bg-black/85'
            }`}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        {typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/60">
            <div
              className="h-full bg-gradient-to-r from-amber-300 to-rose-500"
              style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
            />
          </div>
        )}
      </div>

      <div className="px-1.5 pt-2 pb-1 space-y-0.5">
        <h3 className="font-editorial text-[15px] font-semibold text-amber-50 truncate leading-tight">
          {item.title}
        </h3>
        <p className="text-[11px] text-rose-100/60 truncate tabular-nums">
          {subtitleOverride ||
            [item.type === 'series' ? 'Series' : 'Feature', item.genres[0]]
              .filter(Boolean)
              .join(' · ') ||
            'Curated'}
        </p>
      </div>
    </article>
  );
}
