import { Play } from 'lucide-react';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import type { MediaItem } from '../../types/framex';

interface NeonCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onQuickPlay?: () => void;
  progressPercent?: number;
  subtitleOverride?: string;
}

export function NeonPosterTile({
  item,
  onSelect,
  onQuickPlay,
  progressPercent,
  subtitleOverride,
}: NeonCardProps) {
  return (
    <div className="group relative rounded-md bg-[#070b18] border border-cyan-400/20 hover:border-[#00f0ff] hover:shadow-[0_0_24px_-6px_rgba(0,240,255,0.45)] transition-all overflow-hidden">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="w-full text-left cursor-pointer block"
      >
        <div className="aspect-[2/3] w-full relative overflow-hidden bg-[#040712]">
          <img
            src={item.poster || item.backdrop || FALLBACK_ART.cinemaHero}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#03050d] via-transparent to-transparent" />

          {item.rating && (
            <span className="absolute top-2 right-2 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-[#03050d]/85 border border-[#ff2bd6]/50 text-[#ff8ef0] rounded-xs tabular-nums">
              {item.rating}
            </span>
          )}

          {progressPercent !== undefined && progressPercent > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-900">
              <div
                className="h-full bg-gradient-to-r from-[#00f0ff] to-[#ff2bd6]"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          )}
        </div>

        <div className="p-2.5 space-y-0.5">
          <h3 className="font-neon text-base tracking-wide text-white truncate group-hover:text-[#00f0ff] transition-colors">
            {item.title}
          </h3>
          <p className="font-mono text-[10px] text-slate-400 truncate tabular-nums">
            {subtitleOverride ||
              [item.type === 'series' ? 'SERIES' : 'MOVIE', item.year].filter(Boolean).join(' · ')}
          </p>
        </div>
      </button>

      {onQuickPlay && (
        <button
          type="button"
          onClick={onQuickPlay}
          aria-label={`Play ${item.title}`}
          className="absolute bottom-14 right-2 w-8 h-8 rounded-md neon-glow-btn flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
        </button>
      )}
    </div>
  );
}

export function NeonPulseWideCard({
  item,
  onSelect,
  onQuickPlay,
  progressPercent,
  subtitleOverride,
}: NeonCardProps) {
  return (
    <div className="group relative rounded-md bg-[#070b18] border border-[#ff2bd6]/25 hover:border-[#00f0ff] overflow-hidden transition-all">
      <button
        type="button"
        onClick={onQuickPlay || (() => onSelect(item))}
        className="w-full text-left cursor-pointer block"
      >
        <div className="aspect-video w-full relative overflow-hidden bg-[#040712]">
          <img
            src={item.backdrop || item.poster || FALLBACK_ART.cinemaHero}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#03050d] via-[#03050d]/25 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-10 h-10 rounded-full bg-[#03050d]/85 border border-[#00f0ff] text-[#00f0ff] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </span>
          </div>
          {progressPercent !== undefined && progressPercent > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-900">
              <div
                className="h-full bg-gradient-to-r from-[#00f0ff] to-[#ff2bd6]"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          )}
        </div>
        <div className="p-3">
          <h4 className="font-neon text-base text-white truncate">{item.title}</h4>
          <p className="font-mono text-[10px] text-[#00f0ff] truncate">
            {subtitleOverride || 'Resume Stream'}
          </p>
        </div>
      </button>
    </div>
  );
}
