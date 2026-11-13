import {
  Bookmark,
  Check,
  CheckCircle2,
  Download,
  Heart,
  Info,
  Loader2,
  Play,
  Plus,
  X,
} from 'lucide-react';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import { useTitleDetailEngine } from '../../hooks/useTitleDetailEngine';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';

interface CinematicDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (target: ActivePlaybackTarget) => void;
  onSelectRelated: (item: MediaItem) => void;
}

export function CinematicDetailModal({
  item,
  onClose,
  onPlay,
  onSelectRelated,
}: CinematicDetailModalProps) {
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
      className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={detail.title}
    >
      <div className="fixed inset-0" onClick={onClose} />

      {/* Theatrical Pitch-Black Billboard Modal */}
      <div className="relative z-10 w-full max-w-4xl rounded-xl overflow-hidden bg-[#141414] border border-white/10 shadow-2xl my-auto">
        {/* Hero Billboard Backdrop */}
        <div className="relative h-64 sm:h-[360px] bg-black">
          <img
            src={detail.backdrop || detail.poster || FALLBACK_ART.cinemaHero}
            alt={detail.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/45 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-transparent to-transparent" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#141414]/90 border border-white/25 text-white hover:bg-white hover:text-black flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-6 left-6 right-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#e50914]">
              <span>{detail.type === 'series' ? 'LUPIN SERIES' : 'LUPIN FEATURE'}</span>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
            </div>
            <h2 className="font-cinema text-4xl sm:text-6xl uppercase text-white leading-[0.9] tracking-wide max-w-2xl">
              {detail.title}
            </h2>

            {/* Billboard Primary Action Row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  void launchPlay(
                    detail.type === 'series' ? selectedSeason : undefined,
                    detail.type === 'series' ? selectedEpisode : undefined
                  )
                }
                className="h-10 sm:h-11 px-6 rounded bg-white text-black hover:bg-neutral-200 font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {savedProgress && savedProgress.position_seconds > 10
                    ? detail.type === 'series'
                      ? `Resume S${selectedSeason}:E${selectedEpisode}`
                      : 'Resume'
                    : 'Play'}
                </span>
              </button>

              <button
                type="button"
                onClick={toggleWatchlist}
                aria-label={inWatchlist ? 'Remove from My List' : 'Add to My List'}
                className={`h-10 w-10 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                  inWatchlist
                    ? 'bg-[#e50914] border-[#e50914] text-white'
                    : 'bg-black/60 border-white/60 text-white hover:border-white'
                }`}
              >
                {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={toggleFavorite}
                aria-label={inFavorites ? 'Unfavorite' : 'Favorite'}
                className={`h-10 w-10 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                  inFavorites
                    ? 'bg-white border-white text-[#e50914]'
                    : 'bg-black/60 border-white/60 text-white hover:border-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${inFavorites ? 'fill-current' : ''}`} />
              </button>

              {!isShowbox && (
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  aria-label="Download MP4"
                  className="h-10 px-3.5 rounded-full border border-white/35 bg-black/60 text-white hover:border-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleWatchlist}
                className="sm:hidden h-10 px-3 rounded-full border border-white/35 text-xs text-white inline-flex items-center gap-1"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{inWatchlist ? 'In My List' : 'My List'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Two-Column Billboard Synopsis + Credits */}
        <div className="p-6 sm:p-8 space-y-8">
          {actionNotice && (
            <div className="flex items-start gap-2.5 text-xs text-amber-200 bg-[#1f1610] border border-amber-500/35 rounded-md p-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{actionNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-sm">
            <div className="md:col-span-8 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold tabular-nums">
                {detail.rating && <span className="text-emerald-400">★ {detail.rating} Score</span>}
                {detail.year && <span className="text-neutral-300">{detail.year}</span>}
                {detail.duration && <span className="text-neutral-300">{detail.duration}</span>}
                <span className="border border-neutral-600 px-1.5 py-0.5 rounded-xs text-[10px] text-neutral-300 uppercase">
                  {detail.source}
                </span>
              </div>
              <p className="text-neutral-200 leading-relaxed text-sm sm:text-base">
                {detail.description || 'Featured stream ready in high definition.'}
              </p>
            </div>

            <div className="md:col-span-4 space-y-2 text-xs text-neutral-400">
              {detail.cast && detail.cast.length > 0 && (
                <p>
                  <span className="text-neutral-500">Cast: </span>
                  <span className="text-neutral-200">
                    {detail.cast
                      .slice(0, 5)
                      .map((c) => c.name)
                      .join(', ')}
                  </span>
                </p>
              )}
              {detail.genres.length > 0 && (
                <p>
                  <span className="text-neutral-500">Genres: </span>
                  <span className="text-neutral-200">{detail.genres.join(', ')}</span>
                </p>
              )}
              {detail.languages && detail.languages.length > 0 && (
                <p>
                  <span className="text-neutral-500">Audio: </span>
                  <span className="text-neutral-200 uppercase">
                    {detail.languages.join(', ')}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Netflix-Style Wide Numbered Episode Rows */}
          {detail.type === 'series' && detail.seasons && detail.seasons.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-3">
                <h3 className="font-cinema text-2xl sm:text-3xl tracking-wide text-white uppercase">
                  Episodes
                </h3>
                <select
                  aria-label="Select season"
                  value={selectedSeason}
                  onChange={(e) => {
                    const s = Number(e.target.value);
                    setSelectedSeason(s);
                    const found = detail.seasons?.find((x) => x.season === s);
                    setSelectedEpisode(found?.episodes[0]?.episode || 1);
                  }}
                  className="h-9 px-3 rounded bg-[#242424] border border-neutral-700 text-xs font-semibold text-white"
                >
                  {detail.seasons.map((s) => (
                    <option key={s.season} value={s.season}>
                      Season {s.season}
                    </option>
                  ))}
                </select>
              </div>

              <div className="divide-y divide-neutral-800">
                {seasonEpisodes.map((ep) => {
                  const isCurrent = ep.episode === selectedEpisode;
                  const epProg = getWatchProgress(playId, selectedSeason, ep.episode);
                  const pct =
                    epProg && epProg.duration_seconds > 0
                      ? Math.min(
                          100,
                          Math.round((epProg.position_seconds / epProg.duration_seconds) * 100)
                        )
                      : epProg && epProg.position_seconds > 5
                        ? 15
                        : 0;
                  const isWatched =
                    Boolean(epProg) &&
                    ((epProg!.duration_seconds > 0 &&
                      epProg!.position_seconds >= epProg!.duration_seconds - 15) ||
                      pct >= 90);

                  return (
                    <button
                      key={`${selectedSeason}-${ep.episode}`}
                      type="button"
                      onClick={() => {
                        setSelectedEpisode(ep.episode);
                        void launchPlay(selectedSeason, ep.episode);
                      }}
                      className={`group w-full py-4 px-3 flex items-center gap-4 text-left rounded-md transition-colors cursor-pointer ${
                        isCurrent ? 'bg-[#242424]' : 'hover:bg-[#1d1d1d]'
                      }`}
                    >
                      <span className="font-cinema text-2xl text-neutral-400 w-7 text-center shrink-0 tabular-nums">
                        {ep.episode}
                      </span>

                      <div className="relative w-28 sm:w-36 aspect-video rounded overflow-hidden bg-black shrink-0 border border-neutral-800">
                        <img
                          src={ep.thumbnail || detail.backdrop || detail.poster || FALLBACK_ART.cinemaHero}
                          alt={ep.title || `Episode ${ep.episode}`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="w-8 h-8 rounded-full border border-white bg-black/70 text-white flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </span>
                        </div>
                        {pct > 0 && (
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-neutral-800">
                            <div
                              className={isWatched ? 'h-full bg-emerald-500' : 'h-full bg-[#e50914]'}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {ep.title || `Episode ${ep.episode}`}
                          </h4>
                          <span className="text-xs text-neutral-400 shrink-0 tabular-nums inline-flex items-center gap-1.5">
                            {isWatched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            <span>{ep.duration || ''}</span>
                          </span>
                        </div>
                        {ep.description && (
                          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                            {ep.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 3-Column Widescreen "More Like This" Grid */}
          {detail.related && detail.related.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-cinema text-2xl sm:text-3xl tracking-wide text-white uppercase">
                More Like This
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {detail.related.slice(0, 6).map((rel) => (
                  <button
                    key={`cin-rel-${rel.id}`}
                    type="button"
                    onClick={() => onSelectRelated(rel)}
                    className="group rounded-md overflow-hidden bg-[#1e1e1e] border border-white/5 hover:border-white/25 text-left transition-colors cursor-pointer"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-black">
                      <img
                        src={rel.backdrop || rel.poster || FALLBACK_ART.cinemaHero}
                        alt={rel.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-transparent to-transparent" />
                      {rel.rating && (
                        <span className="absolute top-2 right-2 bg-black/75 px-1.5 py-0.5 rounded-xs font-mono text-[10px] text-white tabular-nums">
                          ★ {rel.rating}
                        </span>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-white truncate">{rel.title}</p>
                      <p className="text-xs text-neutral-400 tabular-nums">
                        {[rel.year, rel.type === 'series' ? 'Series' : 'Movie']
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
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
