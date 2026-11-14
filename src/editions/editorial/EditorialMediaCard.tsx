import { Play } from 'lucide-react';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import type { MediaItem } from '../../types/framex';

interface EditorialCardProps {
  item: MediaItem;
  index?: number;
  onSelect: (item: MediaItem) => void;
  onQuickPlay?: () => void;
  progressPercent?: number;
  subtitleOverride?: string;
}

export function EditorialFigureCard({
  item,
  index,
  onSelect,
  onQuickPlay,
  progressPercent,
  subtitleOverride,
}: EditorialCardProps) {
  const figNum = index !== undefined ? `FIG. ${String(index + 1).padStart(2, '0')}` : 'ARCHIVE';

  return (
    <article className="group bg-[#FBF9F5] border border-stone-300 p-2.5 flex flex-col justify-between transition-colors hover:border-stone-800">
      <div>
        <button
          type="button"
          onClick={() => onSelect(item)}
          className="w-full text-left cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-stone-500 pb-1.5 border-b border-stone-200 mb-2">
            <span>{figNum}</span>
            <span className="text-[#9A3412] uppercase">
              {item.type === 'series' ? 'Series' : 'Film'}
            </span>
          </div>

          <div className="aspect-[3/4] w-full overflow-hidden bg-stone-200 relative">
            <img
              src={item.poster || item.backdrop || FALLBACK_ART.cinemaHero}
              alt={item.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {progressPercent !== undefined && progressPercent > 0 && (
              <div className="absolute bottom-0 inset-x-0 h-1 bg-stone-900/25">
                <div
                  className="h-full bg-[#9A3412]"
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
            )}
          </div>

          <h3 className="font-editorial-serif text-base font-semibold text-stone-900 mt-2.5 line-clamp-1 group-hover:text-[#9A3412] transition-colors">
            {item.title}
          </h3>
        </button>
      </div>

      <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between gap-2 text-[11px] text-stone-600 tabular-nums">
        <span className="truncate">
          {subtitleOverride ||
            [item.year, item.rating ? `★ ${item.rating}` : null].filter(Boolean).join(' · ') ||
            'Catalog Plate'}
        </span>
        {onQuickPlay && (
          <button
            type="button"
            onClick={onQuickPlay}
            aria-label={`Play ${item.title}`}
            className="text-[#9A3412] hover:text-stone-900 inline-flex items-center gap-1 font-sans text-[10px] font-semibold uppercase tracking-wider shrink-0 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Screen</span>
          </button>
        )}
      </div>
    </article>
  );
}

export function EditorialDispatchRow({
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
      className="w-full py-3 flex items-start gap-3 text-left border-b border-stone-300 last:border-b-0 hover:bg-[#EBE6DF]/60 px-2 transition-colors cursor-pointer group"
    >
      <span className="font-editorial-serif italic text-xl font-bold text-[#9A3412] w-7 shrink-0 tabular-nums leading-tight">
        {String(rank).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="font-editorial-serif text-base font-semibold text-stone-900 truncate group-hover:text-[#9A3412]">
          {item.title}
        </h4>
        <p className="text-xs text-stone-600 truncate mt-0.5 tabular-nums">
          {[
            item.type === 'series' ? 'Television' : 'Feature Film',
            item.year,
            item.genres.slice(0, 2).join(', '),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {item.rating && (
        <span className="font-mono text-xs text-stone-700 shrink-0 tabular-nums">
          ★ {item.rating}
        </span>
      )}
    </button>
  );
}
