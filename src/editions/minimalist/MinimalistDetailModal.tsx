import { Bookmark, Check, Download, Heart, Info, Loader2, Play, X } from 'lucide-react';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import { useTitleDetailEngine } from '../../hooks/useTitleDetailEngine';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';

interface MinimalistDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (target: ActivePlaybackTarget) => void;
  onSelectRelated: (item: MediaItem) => void;
}

export function MinimalistDetailModal({
  item,
  onClose,
  onPlay,
  onSelectRelated,
}: MinimalistDetailModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={detail.title}
    >
      <div className="relative w-full max-w-4xl bg-white border border-neutral-200 rounded-xl text-neutral-900 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-neutral-200 px-6 py-3.5 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
            {detail.type === 'series' ? 'Series' : 'Film'} · {detail.year || 'Catalog'}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="w-8 h-8 rounded-md border border-neutral-200 bg-white hover:border-neutral-900 flex items-center justify-center text-neutral-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4">
              <img
                src={detail.poster || detail.backdrop || FALLBACK_ART.cinemaHero}
                alt={detail.title}
                referrerPolicy="no-referrer"
                className="w-full aspect-[2/3] object-cover rounded-lg border border-neutral-200 bg-neutral-100"
              />
            </div>

            <div className="md:col-span-8 space-y-5">
              <div className="space-y-2">
                <h2 className="font-minimal text-3xl sm:text-4xl font-semibold text-neutral-950 tracking-tight">
                  {detail.title}
                </h2>
                <p className="font-mono text-xs text-neutral-500 tabular-nums">
                  {[
                    detail.year,
                    detail.duration,
                    detail.rating ? `Rating ${detail.rating}` : null,
                    detail.genres.join(', '),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                {detail.description || detail.overview || 'Synopsis unavailable.'}
              </p>

              <dl className="grid grid-cols-2 sm:grid-cols-4 border border-neutral-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 bg-[#FAFAFA]">
                <div className="p-3">
                  <dt className="font-mono text-[10px] uppercase text-neutral-500">Provider</dt>
                  <dd className="font-mono text-xs font-medium text-neutral-950 mt-0.5 uppercase">
                    {detail.source}
                  </dd>
                </div>
                <div className="p-3">
                  <dt className="font-mono text-[10px] uppercase text-neutral-500">Format</dt>
                  <dd className="font-mono text-xs font-medium text-neutral-950 mt-0.5 uppercase">
                    {detail.type}
                  </dd>
                </div>
                <div className="p-3">
                  <dt className="font-mono text-[10px] uppercase text-neutral-500">Audio</dt>
                  <dd className="font-mono text-xs font-medium text-neutral-950 mt-0.5 truncate">
                    {detail.languages?.join(', ') || 'Original'}
                  </dd>
                </div>
                <div className="p-3">
                  <dt className="font-mono text-[10px] uppercase text-neutral-500">ID</dt>
                  <dd className="font-mono text-xs font-medium text-neutral-950 mt-0.5 truncate">
                    {detail.subjectId || detail.id}
                  </dd>
                </div>
              </dl>

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
                    className="h-10 px-5 rounded-md bg-neutral-950 hover:bg-[#2563EB] text-white text-xs sm:text-sm font-medium inline-flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{detail.type === 'series' ? `Play S${selectedSeason} E1` : 'Play Now'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleWatchlist}
                  className={`h-10 px-4 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    inWatchlist
                      ? 'border-[#2563EB] bg-[#2563EB] text-white'
                      : 'border-neutral-300 bg-white text-neutral-900 hover:border-neutral-900'
                  }`}
                >
                  {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span>{inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-label="Favorite"
                  className={`h-10 px-4 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    inFavorites
                      ? 'border-neutral-950 bg-neutral-950 text-white'
                      : 'border-neutral-300 bg-white text-neutral-900 hover:border-neutral-900'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${inFavorites ? 'fill-current' : ''}`} />
                  <span>Favorite</span>
                </button>

                {!isShowbox && (
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    className="h-10 px-4 rounded-md border border-neutral-300 bg-white hover:border-neutral-900 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>MP4</span>
                  </button>
                )}
              </div>

              {actionNotice && (
                <div className="flex items-start gap-2 text-xs text-[#2563EB] bg-blue-50 border border-blue-200 rounded-md p-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionNotice}</span>
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
              <span>Loading details…</span>
            </div>
          )}

          {detail.cast && detail.cast.length > 0 && (
            <section className="space-y-3 border-t border-neutral-200 pt-6">
              <h3 className="font-minimal text-base font-semibold text-neutral-950">Cast</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {detail.cast.slice(0, 8).map((c, idx) => (
                  <div key={`${c.name}-${idx}`} className="border border-neutral-200 rounded-md p-3 bg-[#FAFAFA]">
                    <p className="text-xs font-semibold text-neutral-900 truncate">{c.name}</p>
                    {c.role && <p className="text-[11px] text-neutral-500 truncate">{c.role}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {detail.seasons && detail.seasons.length > 0 && (
            <section className="space-y-4 border-t border-neutral-200 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-minimal text-base font-semibold text-neutral-950">Episodes</h3>
                <div className="flex flex-wrap gap-1.5">
                  {detail.seasons.map((s) => (
                    <button
                      key={s.season}
                      type="button"
                      onClick={() => setSelectedSeason(s.season)}
                      className={`px-3 py-1 rounded-md text-xs font-mono border cursor-pointer ${
                        selectedSeason === s.season
                          ? 'bg-neutral-950 text-white border-neutral-950'
                          : 'bg-white text-neutral-600 border-neutral-200'
                      }`}
                    >
                      S{s.season}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-200 bg-white">
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
                      className="w-full p-3.5 flex items-center justify-between gap-4 text-left hover:bg-[#FAFAFA] cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-[#2563EB] w-9 shrink-0 tabular-nums">
                          E{String(ep.episode).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {ep.title || `Episode ${ep.episode}`}
                          </p>
                          {ep.description && (
                            <p className="text-xs text-neutral-500 line-clamp-1">{ep.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {pct > 0 && (
                          <span className="font-mono text-[11px] text-[#2563EB] tabular-nums">
                            {pct}%
                          </span>
                        )}
                        <Play className="w-4 h-4 text-neutral-900" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {detail.related && detail.related.length > 0 && (
            <section className="space-y-3 border-t border-neutral-200 pt-6">
              <h3 className="font-minimal text-base font-semibold text-neutral-950">Related</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {detail.related.slice(0, 6).map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectRelated(rel)}
                    className="text-left group cursor-pointer"
                  >
                    <img
                      src={rel.poster || FALLBACK_ART.cinemaHero}
                      alt={rel.title}
                      referrerPolicy="no-referrer"
                      className="w-full aspect-[2/3] object-cover rounded-md border border-neutral-200"
                    />
                    <p className="text-xs font-medium text-neutral-900 truncate mt-1.5 group-hover:text-[#2563EB]">
                      {rel.title}
                    </p>
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
