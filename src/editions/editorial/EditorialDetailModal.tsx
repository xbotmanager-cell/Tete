import { Bookmark, Check, Download, Heart, Info, Loader2, Play, X } from 'lucide-react';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import { useTitleDetailEngine } from '../../hooks/useTitleDetailEngine';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';

interface EditorialDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (target: ActivePlaybackTarget) => void;
  onSelectRelated: (item: MediaItem) => void;
}

export function EditorialDetailModal({
  item,
  onClose,
  onPlay,
  onSelectRelated,
}: EditorialDetailModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/75 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={detail.title}
    >
      <div className="relative w-full max-w-5xl bg-[#FBF9F5] border border-stone-400 text-stone-900 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-20 bg-[#FBF9F5]/95 border-b border-stone-300 px-5 sm:px-8 py-3 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#9A3412]">
            LUPIN ARCHIVE MONOGRAPH · {detail.type === 'series' ? 'SERIES DOSSIER' : 'FEATURE FILM'}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close monograph"
            className="w-9 h-9 border border-stone-400 bg-[#F7F4EE] hover:border-stone-950 flex items-center justify-center text-stone-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-4 border border-stone-300 bg-white p-2">
              <img
                src={detail.poster || detail.backdrop || FALLBACK_ART.cinemaHero}
                alt={detail.title}
                referrerPolicy="no-referrer"
                className="w-full aspect-[2/3] object-cover"
              />
            </div>

            <div className="md:col-span-8 space-y-5">
              <div className="space-y-2 border-b border-stone-300 pb-4">
                <h2 className="font-editorial-serif text-3xl sm:text-5xl font-semibold text-stone-950 leading-tight">
                  {detail.title}
                </h2>
                <p className="text-xs font-mono uppercase tracking-wider text-stone-600 tabular-nums">
                  {[
                    detail.year,
                    detail.duration,
                    detail.rating ? `★ ${detail.rating}` : null,
                    detail.genres.join(' · '),
                  ]
                    .filter(Boolean)
                    .join(' / ')}
                </p>
              </div>

              <p className="font-editorial-prose text-base text-stone-800 leading-relaxed">
                {detail.description || detail.overview || 'Full synopsis unavailable.'}
              </p>

              {/* Museum Accession Metadata Table */}
              <dl className="grid grid-cols-2 sm:grid-cols-4 border border-stone-300 divide-y sm:divide-y-0 sm:divide-x divide-stone-300 bg-[#F7F4EE]">
                <div className="p-3">
                  <dt className="font-mono text-[10px] uppercase text-stone-500">Catalog ID</dt>
                  <dd className="font-mono text-xs font-semibold text-stone-900 mt-0.5 truncate">
                    {detail.subjectId || detail.id}
                  </dd>
                </div>
                <div className="p-3">
                  <dt className="font-mono text-[10px] uppercase text-stone-500">Provider</dt>
                  <dd className="font-mono text-xs font-semibold text-stone-900 mt-0.5 uppercase">
                    {detail.source}
                  </dd>
                </div>
                <div className="p-3">
                  <dt className="font-mono text-[10px] uppercase text-stone-500">Classification</dt>
                  <dd className="font-mono text-xs font-semibold text-stone-900 mt-0.5 uppercase">
                    {detail.type}
                  </dd>
                </div>
                <div className="p-3">
                  <dt className="font-mono text-[10px] uppercase text-stone-500">Audio</dt>
                  <dd className="font-mono text-xs font-semibold text-stone-900 mt-0.5 truncate">
                    {detail.languages?.join(', ') || 'Original'}
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
                    className="h-11 px-6 bg-stone-950 hover:bg-[#9A3412] text-[#FBF9F5] text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{detail.type === 'series' ? `Screen S${selectedSeason} E1` : 'Screen Feature'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={toggleWatchlist}
                  className={`h-11 px-4 border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    inWatchlist
                      ? 'border-[#9A3412] bg-[#9A3412] text-white'
                      : 'border-stone-400 bg-[#F7F4EE] text-stone-900 hover:border-stone-950'
                  }`}
                >
                  {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span>{inWatchlist ? 'Saved in Folio' : 'Save to Folio'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-label="Favorite"
                  className={`h-11 px-4 border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    inFavorites
                      ? 'border-stone-950 bg-stone-950 text-white'
                      : 'border-stone-400 bg-[#F7F4EE] text-stone-900'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${inFavorites ? 'fill-current' : ''}`} />
                  <span>Favorite</span>
                </button>

                {!isShowbox && (
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    className="h-11 px-4 border border-stone-400 bg-[#F7F4EE] hover:border-stone-950 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                )}
              </div>

              {actionNotice && (
                <div className="flex items-start gap-2 text-xs text-[#9A3412] bg-[#EBE6DF] border border-stone-400 p-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionNotice}</span>
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-xs font-mono text-stone-600">
              <Loader2 className="w-4 h-4 animate-spin text-[#9A3412]" />
              <span>Consulting catalog dossier…</span>
            </div>
          )}

          {/* Cast Credits */}
          {detail.cast && detail.cast.length > 0 && (
            <section className="space-y-3 border-t border-stone-300 pt-6">
              <h3 className="font-editorial-serif text-xl font-bold text-stone-950">
                Principal Cast
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {detail.cast.slice(0, 8).map((c, idx) => (
                  <div key={`${c.name}-${idx}`} className="border border-stone-300 bg-[#F7F4EE] p-3">
                    <p className="text-sm font-semibold text-stone-900 truncate">{c.name}</p>
                    {c.role && <p className="text-xs text-stone-600 truncate italic">{c.role}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Episode Syllabus */}
          {detail.seasons && detail.seasons.length > 0 && (
            <section className="space-y-4 border-t border-stone-300 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-editorial-serif text-xl font-bold text-stone-950">
                  Episode Syllabus
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {detail.seasons.map((s) => (
                    <button
                      key={s.season}
                      type="button"
                      onClick={() => setSelectedSeason(s.season)}
                      className={`px-3 py-1.5 text-xs font-mono border cursor-pointer ${
                        selectedSeason === s.season
                          ? 'bg-stone-950 text-white border-stone-950'
                          : 'bg-white text-stone-700 border-stone-300'
                      }`}
                    >
                      Season {s.season}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-stone-300 border border-stone-300 bg-white">
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
                      className="w-full p-3.5 flex items-center justify-between gap-4 text-left hover:bg-[#EBE6DF]/60 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-bold text-[#9A3412] w-10 shrink-0 tabular-nums">
                          E{String(ep.episode).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p className="font-editorial-serif text-base font-semibold text-stone-900 truncate">
                            {ep.title || `Episode ${ep.episode}`}
                          </p>
                          {ep.description && (
                            <p className="text-xs text-stone-600 line-clamp-1">{ep.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {pct > 0 && (
                          <span className="font-mono text-[11px] text-[#9A3412] tabular-nums">
                            {pct}%
                          </span>
                        )}
                        <Play className="w-4 h-4 text-stone-900" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Related */}
          {detail.related && detail.related.length > 0 && (
            <section className="space-y-3 border-t border-stone-300 pt-6">
              <h3 className="font-editorial-serif text-xl font-bold text-stone-950">
                Cross-Referenced Titles
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {detail.related.slice(0, 6).map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onSelectRelated(rel)}
                    className="text-left border border-stone-300 bg-white p-1.5 hover:border-stone-900 cursor-pointer"
                  >
                    <img
                      src={rel.poster || FALLBACK_ART.cinemaHero}
                      alt={rel.title}
                      referrerPolicy="no-referrer"
                      className="w-full aspect-[2/3] object-cover"
                    />
                    <p className="font-editorial-serif text-xs font-semibold text-stone-900 truncate mt-1.5">
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
