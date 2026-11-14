import { Play } from 'lucide-react';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import type { MediaItem } from '../../types/framex';

interface MinimalistCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onQuickPlay?: () => void;
  progressPercent?: number;
  subtitleOverride?: string;
}

export function MinimalistPosterCard({
  item,
  onSelect,
  onQuickPlay,
  progressPercent,
  subtitleOverride,
}: MinimalistCardProps) {
  const meta =
    subtitleOverride ||
    [item.year, item.type === 'series' ? 'Series' : 'Film'].filter(Boolean).join(' · ');

  return (
    <article className="group flex flex-col">
      <button
        type="button"
        onClick={() => (onQuickPlay ? onQuickPlay() : onSelect(item))}
        className="text-left focus:outline-none cursor-pointer"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-neutral-100 border border-neutral-200 group-hover:border-neutral-900 transition-colors">
          <img
            src={item.poster || item.backdrop || FALLBACK_ART.cinemaHero}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />

          {progressPercent !== undefined && progressPercent > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-neutral-200">
              <div
                className="h-full bg-[#2563EB]"
                style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
              />
            </div>
          )}
        </div>

        <div className="pt-2 space-y-0.5">
          <h3 className="font-minimal text-xs sm:text-sm font-medium text-neutral-950 truncate group-hover:text-[#2563EB] transition-colors">
            {item.title}
          </h3>
          <p className="font-mono text-[11px] text-neutral-500 truncate tabular-nums">
            {meta || 'Catalog'}
          </p>
        </div>
      </button>
    </article>
  );
}

export function MinimalistWideCard({
  item,
  onSelect,
  onQuickPlay,
  progressPercent,
  subtitleOverride,
}: MinimalistCardProps) {
  return (
    <article className="group border border-neutral-200 bg-white rounded-md overflow-hidden hover:border-neutral-900 transition-colors">
      <button
        type="button"
        onClick={() => (onQuickPlay ? onQuickPlay() : onSelect(item))}
        className="w-full text-left cursor-pointer"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
          <img
            src={item.poster || item.backdrop || FALLBACK_ART.cinemaHero}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/95 text-neutral-950 flex items-center justify-center shadow-sm">
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </span>
          {progressPercent !== undefined && progressPercent > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-neutral-200">
              <div
                className="h-full bg-[#2563EB]"
                style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
              />
            </div>
          )}
        </div>

        <div className="p-3 space-y-0.5">
          <h3 className="font-minimal text-sm font-medium text-neutral-950 truncate">
            {item.title}
          </h3>
          <p className="font-mono text-[11px] text-neutral-500 truncate tabular-nums">
            {subtitleOverride || 'Resume Playback'}
          </p>
        </div>
      </button>
    </article>
  );
}
