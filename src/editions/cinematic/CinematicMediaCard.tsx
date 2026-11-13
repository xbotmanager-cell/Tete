import { Bookmark, Check, Heart, Info, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import type { MediaItem } from '../../types/framex';

interface CinematicCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onQuickPlay?: (item: MediaItem) => void;
  progressPercent?: number;
  subtitleOverride?: string;
}

export function CinematicPosterCard({
  item,
  onSelect,
  onQuickPlay,
  progressPercent,
  subtitleOverride,
}: CinematicCardProps) {
  const { isInLibrary, toggleLibraryItem } = useAuth();
  const inWatchlist = isInLibrary(item.id, 'watchlist', item.type);
  const inFavorites = isInLibrary(item.id, 'favorite', item.type);

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleLibraryItem({
      list_type: 'watchlist',
      media_type: item.type,
      item_id: item.id,
      slug: item.slug,
      provider: item.source,
      title: item.title,
      poster: item.poster || null,
      year: item.year ? String(item.year) : null,
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleLibraryItem({
      list_type: 'favorite',
      media_type: item.type,
      item_id: item.id,
      slug: item.slug,
      provider: item.source,
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
      role="button"
      tabIndex={0}
      aria-label={item.title}
      className="group relative rounded-md overflow-hidden bg-[#141414] cursor-pointer transition-transform duration-200 hover:scale-[1.06] hover:z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e50914]"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#141414]">
        <img
          src={item.poster || item.backdrop || FALLBACK_ART.cinemaHero}
          alt={item.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />

        {/* Deep Theater Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-60 group-hover:opacity-95 transition-opacity" />

        {/* Subtle Top Crimson N-Mark & Rating */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <span className="font-cinema text-xs tracking-wider text-[#e50914] drop-shadow">
            {item.type === 'series' ? 'SERIES' : 'FILM'}
          </span>
          {item.rating && (
            <span className="font-mono text-[10px] font-semibold text-white bg-black/75 px-1.5 py-0.5 rounded-xs tabular-nums">
              {item.rating}
            </span>
          )}
        </div>

        {/* Hover / Focus Theater Action Bar */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onQuickPlay) onQuickPlay(item);
                else onSelect(item);
              }}
              aria-label={`Play ${item.title}`}
              className="w-7 h-7 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </button>
            <button
              type="button"
              onClick={handleToggleWatchlist}
              aria-label={inWatchlist ? 'Remove from My List' : 'Add to My List'}
              className={`w-7 h-7 rounded-full border flex items-center justify-center cursor-pointer ${
                inWatchlist
                  ? 'bg-[#e50914] border-[#e50914] text-white'
                  : 'bg-black/70 border-white/50 text-white hover:border-white'
              }`}
            >
              {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={inFavorites ? 'Unfavorite' : 'Favorite'}
              className={`w-7 h-7 rounded-full border flex items-center justify-center cursor-pointer ${
                inFavorites
                  ? 'bg-white text-[#e50914] border-white'
                  : 'bg-black/70 border-white/50 text-white hover:border-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${inFavorites ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item);
              }}
              aria-label={`Details for ${item.title}`}
              className="ml-auto w-7 h-7 rounded-full border border-white/50 bg-black/70 text-white hover:border-white flex items-center justify-center cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-white truncate leading-tight">
              {item.title}
            </h3>
            <p className="text-[10px] text-neutral-300 truncate tabular-nums">
              {subtitleOverride ||
                [item.year, item.genres[0]].filter(Boolean).join(' · ') ||
                item.source.toUpperCase()}
            </p>
          </div>
        </div>

        {typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-neutral-800">
            <div
              className="h-full bg-[#e50914]"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        )}
      </div>
    </article>
  );
}

export function CinematicRankCard({
  item,
  rank,
  onSelect,
}: {
  item: MediaItem;
  rank: number;
  onSelect: (item: MediaItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group relative flex items-end cursor-pointer text-left pl-7 sm:pl-9 shrink-0 focus:outline-none"
      aria-label={`#${rank} ${item.title}`}
    >
      {/* Oversized Outlined Theater Rank Numeral */}
      <svg
        viewBox="0 0 110 140"
        className="w-16 sm:w-20 h-28 sm:h-36 absolute left-0 bottom-0 z-10 pointer-events-none select-none"
        aria-hidden="true"
      >
        <text
          x="6"
          y="128"
          fontFamily="'Bebas Neue', sans-serif"
          fontSize="132"
          fontWeight="700"
          fill="#060606"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="3.5"
        >
          {rank}
        </text>
      </svg>

      <div className="relative z-20 w-[108px] sm:w-[126px] aspect-[2/3] rounded-md overflow-hidden bg-[#141414] border border-white/10 group-hover:scale-105 transition-transform duration-200 shadow-2xl">
        <img
          src={item.poster || item.backdrop || FALLBACK_ART.cinemaHero}
          alt={item.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        <div className="absolute bottom-1.5 inset-x-2">
          <p className="text-[11px] font-semibold text-white truncate">{item.title}</p>
        </div>
      </div>
    </button>
  );
}

export function CinematicWideCard({
  item,
  progressPercent,
  subtitle,
  onPlay,
  onSelect,
}: {
  item: MediaItem;
  progressPercent?: number;
  subtitle?: string;
  onPlay: () => void;
  onSelect: (item: MediaItem) => void;
}) {
  return (
    <div className="group relative rounded-md overflow-hidden bg-[#141414] border border-white/10 transition-transform duration-200 hover:scale-[1.04] hover:z-20">
      <button
        type="button"
        onClick={onPlay}
        className="relative aspect-video w-full block overflow-hidden cursor-pointer text-left"
      >
        <img
          src={item.backdrop || item.poster || FALLBACK_ART.cinemaHero}
          alt={item.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-black/75 border border-white/80 text-white flex items-center justify-center group-hover:bg-[#e50914] group-hover:border-[#e50914] transition-colors">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </span>
        </div>
        {typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-neutral-800">
            <div
              className="h-full bg-[#e50914]"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>
        )}
      </button>
      <div className="px-2.5 py-2 flex items-center justify-between gap-2 bg-[#141414]">
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="min-w-0 text-left cursor-pointer flex-1"
        >
          <p className="text-xs font-semibold text-white truncate">{item.title}</p>
          {subtitle && (
            <p className="text-[10px] text-neutral-400 truncate tabular-nums">{subtitle}</p>
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelect(item)}
          aria-label={`More info on ${item.title}`}
          className="w-6 h-6 rounded-full border border-neutral-700 text-neutral-300 hover:border-white hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Info className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
