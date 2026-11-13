import { useState } from 'react';
import { Bookmark, Check, Film, Play } from 'lucide-react';
import type { MediaItem } from '../../types/framex';
import { useAuth } from '../../context/AuthContext';

interface SidebarCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onQuickPlay?: (item: MediaItem) => void;
  progressPercent?: number;
  subtitleOverride?: string;
}

export function SidebarGridCard({
  item,
  onSelect,
  onQuickPlay,
  progressPercent,
  subtitleOverride,
}: SidebarCardProps) {
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
      aria-label={`Inspect ${item.title}`}
      className="group sidebar-card rounded-lg overflow-hidden cursor-pointer flex flex-col focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
    >
      {/* Top Monospace Spec Strip */}
      <div className="px-2 py-1.5 border-b border-zinc-800/90 bg-[#0d0d10] flex items-center justify-between gap-1 font-mono text-[10px] text-zinc-400 tabular-nums">
        <span className="truncate uppercase">
          {item.type === 'series' ? 'SER' : 'MOV'}
          {item.year ? ` · ${item.year}` : ''}
        </span>
        {item.rating ? (
          <span className="text-cyan-400 shrink-0">★ {item.rating}</span>
        ) : (
          <span className="text-zinc-500 uppercase shrink-0">
            {item.source === 'showbox' ? 'V2' : 'V1'}
          </span>
        )}
      </div>

      {/* Sharp Framed Poster */}
      <div className="relative aspect-[2/3] w-full bg-zinc-950 overflow-hidden">
        {item.poster && !imgError ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-80"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2.5 text-center bg-zinc-900">
            <Film className="w-5 h-5 text-zinc-600 mb-1" />
            <span className="font-console text-xs text-zinc-400 line-clamp-2">{item.title}</span>
          </div>
        )}

        {/* Sharp Hover Action Bar */}
        <div className="hidden sm:flex absolute inset-x-1.5 bottom-1.5 items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onQuickPlay) onQuickPlay(item);
              else onSelect(item);
            }}
            className="h-7 px-2.5 rounded bg-white text-black hover:bg-cyan-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Open</span>
          </button>
          <button
            type="button"
            onClick={handleWatchlist}
            aria-label={saved ? 'Remove from watchlist' : 'Save to watchlist'}
            className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${
              saved
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-zinc-950/90 border-zinc-700 text-zinc-200 hover:border-zinc-500'
            }`}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        {typeof progressPercent === 'number' && progressPercent > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-900">
            <div
              className="h-full bg-cyan-400"
              style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
            />
          </div>
        )}
      </div>

      {/* Title Footer */}
      <div className="px-2.5 py-2 flex items-center justify-between gap-1.5 border-t border-zinc-800/80">
        <div className="min-w-0">
          <h3 className="font-console text-xs font-semibold text-zinc-100 truncate">
            {item.title}
          </h3>
          {subtitleOverride && (
            <p className="font-mono text-[10px] text-zinc-400 truncate tabular-nums">
              {subtitleOverride}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function SidebarTableRow({
  item,
  onSelect,
}: {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
}) {
  const { isInLibrary, toggleLibraryItem } = useAuth();
  const saved = isInLibrary(item.id, 'watchlist', item.type);

  return (
    <tr
      onClick={() => onSelect(item)}
      className="border-b border-zinc-800/80 hover:bg-zinc-900/70 transition-colors cursor-pointer text-xs"
    >
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={item.poster || ''}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-8 h-11 rounded object-cover bg-zinc-900 border border-zinc-800 shrink-0"
          />
          <div className="min-w-0">
            <p className="font-console font-medium text-zinc-100 truncate max-w-[240px] sm:max-w-sm">
              {item.title}
            </p>
            {item.genres.length > 0 && (
              <p className="text-[11px] text-zinc-500 truncate">
                {item.genres.slice(0, 2).join(', ')}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="py-2.5 px-3 font-mono text-[11px] uppercase text-zinc-400 hidden sm:table-cell">
        {item.type === 'series' ? 'SERIES' : 'MOVIE'}
      </td>
      <td className="py-2.5 px-3 font-mono text-zinc-300 tabular-nums">
        {item.year || '—'}
      </td>
      <td className="py-2.5 px-3 font-mono text-cyan-400 tabular-nums">
        {item.rating ? `★ ${item.rating}` : '—'}
      </td>
      <td className="py-2.5 px-3 font-mono text-[11px] uppercase text-zinc-500 hidden md:table-cell">
        {item.source === 'showbox' ? 'Showbox' : 'MovieBox'}
      </td>
      <td className="py-2.5 px-3 text-right">
        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() =>
              void toggleLibraryItem({
                list_type: 'watchlist',
                media_type: item.type || 'movie',
                item_id: item.id,
                slug: item.slug,
                provider: item.source || 'moviebox',
                title: item.title,
                poster: item.poster || null,
                year: item.year ? String(item.year) : null,
              })
            }
            aria-label="Toggle watchlist"
            className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${
              saved
                ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300'
                : 'border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="h-7 px-2.5 rounded border border-zinc-700 bg-zinc-900 hover:bg-white hover:text-black text-zinc-200 font-mono text-[11px] cursor-pointer transition-colors"
          >
            Inspect
          </button>
        </div>
      </td>
    </tr>
  );
}
