import { Bookmark, Check, Download, Heart, Info, Loader2, Play, X } from 'lucide-react';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import { useTitleDetailEngine } from '../../hooks/useTitleDetailEngine';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';

interface NeonDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (target: ActivePlaybackTarget) => void;
  onSelectRelated: (item: MediaItem) => void;
}

export function NeonDetailModal({
  item,
  onClose,
  onPlay,
  onSelectRelated,
}: NeonDetailModalProps) {
  const {
    detail,
    loading,
    selectedSeason,
    setSelectedSeason,
    seasonEpisodes,
    actionNotice,
    inWatchlist,
    inFavorites,
    isShowbox,
    getWatchProgress,
    toggleWatchlist,
    toggleFavorite,
    handleDownload,
    launchPlay,
  } = useTitleDetailEngine(item, onPlay);

  if (!item || !detail) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#02040a]/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={detail.title}
    >
      <div className="relative w-full max-w-5xl rounded-lg bg-[#070b18] border border-cyan-400/40 shadow-[0_0_50px_-10px_rgba(0,240,255,0.35)] text-sky-50 my-auto max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail dialog"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-md border border-cyan-400/35 bg-[#03050d]/90 text-[#00f0ff] hover:border-[#ff2bd6] hover:text-[#ff2bd6] flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Banner */}
        <div className="relative h-56 sm:h-72 w-full overflow-hidden">
          <img
            src={detail.backdrop || detail.poster || FALLBACK_ART.cinemaHero}
            alt={detail.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b18] via-[#070b18]/55 to-transparent" />
          <div className="absolute bottom-5 left-6 right-14">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[#00f0ff]">
              {[detail.source.toUpperCase(), detail.type.toUpperCase(), detail.year]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <h2 className="font-neon text-3xl sm:text-5xl uppercase text-white leading-none mt-1">
              {detail.title}
            </h2>
          </div>
        </div>

        <div className="p-5 sm:p-8 space-y-7">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <img
              src={detail.poster || detail.backdrop || FALLBACK_ART.cinemaHero}
              alt={detail.title}
              referrerPolicy="no-referrer"
              className="w-28 sm:w-36 aspect-[2/3] rounded-md object-cover border border-cyan-400/30 shrink-0"
            />
            <div className="space-y-4 flex-1">
              <p className="text-sm text-sky-100/85 leading-relaxed">
                {detail.description || detail.overview || 'Description unavailable.'}
              </p>

              <p className="font-mono text-xs text-slate-400">
                {[detail.duration, detail.rating ? `★ ${detail.rating}` : null, detail.genres.join(' / ')]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                {!isShowbox && (
                  <button
                    type="button"
                    onClick={() => {
                      const ep = seasonEpisodes[0];
                      void launchPlay(
                        detail.type === 'series' ? selectedSeason : undefined,
                        ep?.episode || (detail.type === 'series' ? 1 : undefined)
                      );
                    }}
                    className="neon-glow-btn h-10 px-6 rounded-md text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{detail.type === 'series' ? `Play S${selectedSeason} E1` : 'Watch Now'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleWatchlist}
                  className={`h-10 px-4 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    inWatchlist
                      ? 'border-[#00f0ff] bg-[#00f0ff]/15 text-[#00f0ff]'
                      : 'border-cyan-500/30 bg-[#050814] text-sky-100 hover:border-[#00f0ff]'
                  }`}
                >
                  {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span>{inWatchlist ? 'Saved' : 'Watchlist'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-label="Favorite"
                  className={`h-10 w-10 rounded-md border flex items-center justify-center cursor-pointer ${
                    inFavorites
                      ? 'border-[#ff2bd6] bg-[#ff2bd6]/20 text-[#ff8ef0]'
                      : 'border-cyan-500/30 bg-[#050814] text-sky-100'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${inFavorites ? 'fill-current' : ''}`} />
                </button>

                {!isShowbox && (
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    className="h-10 px-4 rounded-md border border-cyan-500/30 bg-[#050814] hover:border-[#00f0ff] text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>MP4</span>
                  </button>
                )}
              </div>

              {actionNotice && (
                <div className="flex items-start gap-2 text-xs text-amber-300 bg-[#0a1024] border border-amber-400/35 rounded-md p-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionNotice}</span>
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#00f0ff]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synchronizing metadata…</span>
            </div>
          )}

          {detail.seasons && detail.seasons.length > 0 && (
            <section className="space-y-4 border-t border-cyan-500/20 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-neon text-2xl uppercase text-white">Episodes</h3>
                <div className="flex flex-wrap gap-1.5">
                  {detail.seasons.map((s) => (
                    <button
                      key={s.season}
                      type="button"
                      onClick={() => setSelectedSeason(s.season)}
                      className={`px-3 py-1 rounded text-xs font-mono cursor-pointer ${
                        selectedSeason === s.season
                          ? 'bg-[#00f0ff] text-[#03050d] font-bold'
                          : 'bg-[#040712] border border-cyan-500/25 text-slate-300'
                      }`}
                    >
                      S{s.season}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {seasonEpisodes.map((ep) => {
                  const prog = getWatchProgress(
                    detail.subjectId || detail.id,
                    selectedSeason,
                    ep.episode
                  );
                  const pct =
                    prog && prog.duration_seconds > 0
                      ? Math.round((prog.position_seconds / prog.duration_seconds) * 100)
                      : 0;
                  return (
                    <button
                      key={`${selectedSeason}-${ep.episode}`}
                      type="button"
                      onClick={() => void launchPlay(selectedSeason, ep.episode)}
                      className="p-3 rounded-md bg-[#040712] border border-cyan-500/25 hover:border-[#00f0ff] text-left flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-[#ff2bd6]">
                          EP {ep.episode} {pct > 0 ? `· ${pct}%` : ''}
                        </p>
                        <p className="text-xs text-white truncate mt-0.5">
                          {ep.title || `Episode ${ep.episode}`}
                        </p>
                      </div>
                      <Play className="w-4 h-4 text-[#00f0ff] shrink-0" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {detail.related && detail.related.length > 0 && (
            <section className="space-y-3 border-t border-cyan-500/20 pt-5">
              <h3 className="font-neon text-2xl uppercase text-white">Related Signals</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {detail.related.slice(0, 6).map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectRelated(rel)}
                    className="rounded-md bg-[#040712] border border-cyan-500/20 hover:border-[#00f0ff] overflow-hidden text-left cursor-pointer"
                  >
                    <img
                      src={rel.poster || FALLBACK_ART.cinemaHero}
                      alt={rel.title}
                      referrerPolicy="no-referrer"
                      className="w-full aspect-[2/3] object-cover"
                    />
                    <p className="p-1.5 text-[11px] font-medium text-white truncate">{rel.title}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
