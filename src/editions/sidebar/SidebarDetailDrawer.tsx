import {
  Bookmark,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Heart,
  Info,
  Loader2,
  Play,
  X,
} from 'lucide-react';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import { useTitleDetailEngine } from '../../hooks/useTitleDetailEngine';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';
import { SidebarGridCard } from './SidebarMediaCard';

interface SidebarDetailDrawerProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (target: ActivePlaybackTarget) => void;
  onSelectRelated: (item: MediaItem) => void;
}

export function SidebarDetailDrawer({
  item,
  onClose,
  onPlay,
  onSelectRelated,
}: SidebarDetailDrawerProps) {
  const {
    detail,
    loading,
    selectedSeason,
    setSelectedSeason,
    selectedEpisode,
    setSelectedEpisode,
    playId,
    isShowbox,
    inWatchlist,
    inFavorites,
    seasonEpisodes,
    savedProgress,
    actionNotice,
    getWatchProgress,
    launchPlay,
    handleDownload,
    toggleWatchlist,
    toggleFavorite,
  } = useTitleDetailEngine(item, onPlay);

  if (!item || !detail) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`Inspector for ${detail.title}`}
    >
      <div className="fixed inset-0" onClick={onClose} />

      {/* Right-Edge Slide-Over Inspector Panel */}
      <aside className="relative z-10 w-full max-w-2xl h-full bg-[#0c0c0f] border-l border-zinc-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Top Inspector Bar */}
        <div className="h-14 px-5 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-[#09090b]">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 truncate">
            <span>INSPECTOR</span>
            <span>/</span>
            <span className="text-zinc-100 truncate">{detail.title}</span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 ml-1" />}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="h-8 px-2.5 rounded border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
          >
            <span>ESC</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row gap-5">
            <img
              src={detail.poster || FALLBACK_ART.cinemaHero}
              alt={detail.title}
              referrerPolicy="no-referrer"
              className="w-28 sm:w-32 aspect-[2/3] object-cover rounded-lg border border-zinc-800 shrink-0 bg-zinc-950"
            />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h2 className="font-console text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {detail.title}
                </h2>
                {detail.genres.length > 0 && (
                  <p className="font-mono text-[11px] text-zinc-400 mt-1">
                    {detail.genres.join(' · ')}
                  </p>
                )}
              </div>

              {detail.description && (
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {detail.description}
                </p>
              )}

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    void launchPlay(
                      detail.type === 'series' ? selectedSeason : undefined,
                      detail.type === 'series' ? selectedEpisode : undefined
                    )
                  }
                  className="h-9 px-4 rounded-md bg-white text-black hover:bg-cyan-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {savedProgress && savedProgress.position_seconds > 10
                      ? detail.type === 'series'
                        ? `Resume S${selectedSeason}E${selectedEpisode}`
                        : 'Resume'
                      : detail.type === 'series'
                        ? `Play S${selectedSeason}E${selectedEpisode}`
                        : 'Play Stream'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleWatchlist}
                  className={`h-9 px-3 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    inWatchlist
                      ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
                  }`}
                >
                  {inWatchlist ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  <span>{inWatchlist ? 'Saved' : 'Watchlist'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-label="Favorite"
                  className={`h-9 w-9 rounded-md border flex items-center justify-center cursor-pointer ${
                    inFavorites
                      ? 'border-rose-400/60 bg-rose-500/15 text-rose-400'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-200'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${inFavorites ? 'fill-current' : ''}`} />
                </button>

                {!isShowbox && (
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    className="h-9 px-3 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>MP4</span>
                  </button>
                )}
              </div>

              {actionNotice && (
                <div className="flex items-start gap-2 text-xs text-amber-300 bg-zinc-900 border border-amber-500/30 rounded-md p-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionNotice}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4-Cell Spec Sheet */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border border-zinc-800 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 bg-zinc-950/60">
            <div className="p-3">
              <p className="font-mono text-[10px] text-zinc-500 uppercase">Type</p>
              <p className="font-mono text-xs text-zinc-100 mt-0.5 uppercase">
                {detail.type === 'series' ? 'TV Series' : 'Movie'}
              </p>
            </div>
            <div className="p-3">
              <p className="font-mono text-[10px] text-zinc-500 uppercase">Release</p>
              <p className="font-mono text-xs text-zinc-100 mt-0.5 tabular-nums">
                {detail.year || '—'}
              </p>
            </div>
            <div className="p-3">
              <p className="font-mono text-[10px] text-zinc-500 uppercase">Rating</p>
              <p className="font-mono text-xs text-cyan-400 mt-0.5 tabular-nums">
                {detail.rating ? `★ ${detail.rating}` : '—'}
              </p>
            </div>
            <div className="p-3">
              <p className="font-mono text-[10px] text-zinc-500 uppercase">Provider</p>
              <p className="font-mono text-xs text-zinc-100 mt-0.5 uppercase">
                {detail.source}
              </p>
            </div>
          </div>

          {/* Tabular Seasons & Episodes Section */}
          {detail.type === 'series' && detail.seasons && detail.seasons.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  Episodes Directory ({seasonEpisodes.length})
                </h3>
                <select
                  aria-label="Select Season"
                  value={selectedSeason}
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    setSelectedSeason(s);
                    const found = detail.seasons?.find((x) => x.season === s);
                    setSelectedEpisode(found?.episodes[0]?.episode || 1);
                  }}
                  className="h-8 px-2.5 rounded-md bg-zinc-900 border border-zinc-700 font-mono text-xs text-white"
                >
                  {detail.seasons.map((s) => (
                    <option key={s.season} value={s.season}>
                      Season {s.season} ({s.episodes.length} ep)
                    </option>
                  ))}
                </select>
              </div>

              <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800/80 overflow-hidden bg-zinc-950/40">
                {seasonEpisodes.map((ep) => {
                  const isSelected = ep.episode === selectedEpisode;
                  const epProg = getWatchProgress(playId, selectedSeason, ep.episode);
                  const pct =
                    epProg && epProg.duration_seconds > 0
                      ? Math.min(100, Math.round((epProg.position_seconds / epProg.duration_seconds) * 100))
                      : epProg && epProg.position_seconds > 5
                        ? 15
                        : 0;
                  const isWatched =
                    Boolean(epProg) &&
                    ((epProg!.duration_seconds > 0 &&
                      epProg!.position_seconds >= epProg!.duration_seconds - 15) ||
                      pct >= 90);
                  const isInProgress = Boolean(epProg && epProg.position_seconds > 5 && !isWatched);

                  return (
                    <button
                      key={`${selectedSeason}-${ep.episode}`}
                      type="button"
                      onClick={() => {
                        setSelectedEpisode(ep.episode);
                        void launchPlay(selectedSeason, ep.episode);
                      }}
                      className={`w-full p-3 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'
                      }`}
                    >
                      {ep.thumbnail ? (
                        <img
                          src={ep.thumbnail}
                          alt={ep.title || `Episode ${ep.episode}`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-24 aspect-video rounded object-cover border border-zinc-800 shrink-0"
                        />
                      ) : (
                        <span className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 font-mono text-xs text-cyan-400 flex items-center justify-center shrink-0 tabular-nums">
                          E{String(ep.episode).padStart(2, '0')}
                        </span>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-100 truncate">
                            {ep.episode}. {ep.title || `Episode ${ep.episode}`}
                          </span>
                          <span className="font-mono text-[10px] shrink-0 inline-flex items-center gap-1 tabular-nums">
                            {isWatched ? (
                              <span className="text-emerald-400 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> WATCHED
                              </span>
                            ) : isInProgress ? (
                              <span className="text-cyan-400 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {pct}%
                              </span>
                            ) : (
                              <span className="text-zinc-500">UNWATCHED</span>
                            )}
                          </span>
                        </div>
                        {ep.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2">{ep.description}</p>
                        )}
                        <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-zinc-500">
                          <span>{ep.duration || 'Stream Ready'}</span>
                          {pct > 0 && (
                            <div className="w-24 h-1 bg-zinc-800 rounded overflow-hidden">
                              <div
                                className={isWatched ? 'h-full bg-emerald-400' : 'h-full bg-cyan-400'}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Related Compact Grid */}
          {detail.related && detail.related.length > 0 && (
            <section className="space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                Related Catalog
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {detail.related.slice(0, 8).map((rel) => (
                  <SidebarGridCard
                    key={`sb-rel-${rel.id}`}
                    item={rel}
                    onSelect={onSelectRelated}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
