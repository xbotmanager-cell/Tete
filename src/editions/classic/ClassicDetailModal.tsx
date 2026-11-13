import { useState } from 'react';
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
import { ClassicMediaCard } from './ClassicMediaCard';

interface ClassicDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (target: ActivePlaybackTarget) => void;
  onSelectRelated: (item: MediaItem) => void;
}

export function ClassicDetailModal({
  item,
  onClose,
  onPlay,
  onSelectRelated,
}: ClassicDetailModalProps) {
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

  const [tab, setTab] = useState<'episodes' | 'cast' | 'related'>('episodes');

  if (!item || !detail) return null;

  const hasSeasons = detail.type === 'series' && Boolean(detail.seasons && detail.seasons.length > 0);
  const effectiveTab =
    tab === 'episodes' && !hasSeasons
      ? detail.cast && detail.cast.length > 0
        ? 'cast'
        : 'related'
      : tab;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex items-start justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={detail.title}
    >
      <div className="glass-surface-elevated w-full max-w-5xl rounded-3xl overflow-hidden my-auto relative border border-amber-200/20">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dossier"
          className="glass-btn absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center text-amber-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Velvet Backdrop Header */}
        <div className="relative h-52 sm:h-72 w-full overflow-hidden bg-[#14050a]">
          <img
            src={detail.backdrop || detail.poster || FALLBACK_ART.cinemaHero}
            alt={detail.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#13060a] via-[#13060a]/60 to-transparent" />
        </div>

        {/* Main Editorial Dossier Body */}
        <div className="px-5 sm:px-8 pb-8 -mt-20 sm:-mt-28 relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="p-1.5 rounded-2xl bg-[#18070d] border border-amber-200/25 shadow-2xl shrink-0">
              <img
                src={detail.poster || FALLBACK_ART.cinemaHero}
                alt={detail.title}
                referrerPolicy="no-referrer"
                className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-xl"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-3.5 pt-1 sm:pt-10">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300/90 tabular-nums">
                {[
                  detail.type === 'series' ? 'Television Series' : 'Feature Film',
                  detail.year ? String(detail.year) : null,
                  detail.duration ? String(detail.duration) : null,
                  detail.rating ? `★ ${detail.rating}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <h2 className="font-editorial text-3xl sm:text-5xl font-semibold text-amber-50 leading-none text-balance">
                {detail.title}
              </h2>

              {detail.genres.length > 0 && (
                <p className="text-xs italic font-editorial text-rose-100/70">
                  {detail.genres.join(' · ')}
                </p>
              )}

              {detail.description && (
                <p className="text-sm text-rose-50/80 leading-relaxed max-w-2xl">
                  {detail.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    void launchPlay(
                      detail.type === 'series' ? selectedSeason : undefined,
                      detail.type === 'series' ? selectedEpisode : undefined
                    )
                  }
                  className="glass-btn-primary h-11 px-6 rounded-full text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {savedProgress && savedProgress.position_seconds > 10
                      ? detail.type === 'series'
                        ? `Resume S${selectedSeason} E${selectedEpisode}`
                        : 'Resume Screening'
                      : detail.type === 'series'
                        ? `Play S${selectedSeason} E${selectedEpisode}`
                        : 'Begin Screening'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleWatchlist}
                  className={`glass-btn h-11 px-4 rounded-full text-sm font-medium inline-flex items-center gap-2 cursor-pointer ${
                    inWatchlist ? 'text-amber-300 border-amber-300/45' : 'text-white'
                  }`}
                >
                  {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span>{inWatchlist ? 'In Folio' : 'Save'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFavorite}
                  aria-label="Favorite"
                  className={`glass-btn h-11 w-11 rounded-full flex items-center justify-center cursor-pointer ${
                    inFavorites ? 'text-rose-400 border-rose-400/45' : 'text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${inFavorites ? 'fill-current' : ''}`} />
                </button>

                {!isShowbox && (
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    className="glass-btn h-11 px-4 rounded-full text-sm font-medium text-amber-100 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                )}

                {loading && <Loader2 className="w-4 h-4 animate-spin text-amber-300 ml-1" />}
              </div>

              {actionNotice && (
                <div className="flex items-start gap-2 text-xs text-amber-200 bg-amber-950/40 border border-amber-400/25 rounded-2xl px-3.5 py-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionNotice}</span>
                </div>
              )}
            </div>
          </div>

          {/* Editorial Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-amber-200/15 pb-3 pt-2">
            {hasSeasons && (
              <button
                type="button"
                onClick={() => setTab('episodes')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                  effectiveTab === 'episodes' ? 'glass-btn-primary text-white' : 'glass-btn text-amber-100/75'
                }`}
              >
                Episodes & Seasons ({detail.seasons!.length})
              </button>
            )}
            {detail.cast && detail.cast.length > 0 && (
              <button
                type="button"
                onClick={() => setTab('cast')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                  effectiveTab === 'cast' ? 'glass-btn-primary text-white' : 'glass-btn text-amber-100/75'
                }`}
              >
                Cast & Credits ({detail.cast.length})
              </button>
            )}
            {detail.related && detail.related.length > 0 && (
              <button
                type="button"
                onClick={() => setTab('related')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                  effectiveTab === 'related' ? 'glass-btn-primary text-white' : 'glass-btn text-amber-100/75'
                }`}
              >
                Related Screening
              </button>
            )}
          </div>

          {/* Tab 1: Seasons & Episodes */}
          {effectiveTab === 'episodes' && hasSeasons && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-editorial italic text-lg text-amber-100">
                  Season {selectedSeason} · {seasonEpisodes.length} Episodes
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {detail.seasons!.map((s) => (
                    <button
                      key={s.season}
                      type="button"
                      onClick={() => {
                        setSelectedSeason(s.season);
                        setSelectedEpisode(s.episodes[0]?.episode || 1);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                        selectedSeason === s.season
                          ? 'bg-amber-300/20 text-amber-200 border border-amber-300/45'
                          : 'glass-btn text-rose-100/70'
                      }`}
                    >
                      Season {s.season}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
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
                      className={`relative overflow-hidden text-left p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-rose-900/35 border-amber-300/45 text-white'
                          : 'bg-black/30 border-amber-200/15 hover:border-amber-200/35 text-rose-100/85'
                      }`}
                    >
                      {ep.thumbnail ? (
                        <img
                          src={ep.thumbnail}
                          alt={ep.title || `Episode ${ep.episode}`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-24 aspect-video rounded-lg object-cover shrink-0 border border-amber-200/15"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-[#1f0a12] border border-amber-200/20 flex items-center justify-center font-editorial italic text-base text-amber-200 shrink-0 tabular-nums">
                          {ep.episode}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-amber-300/85 tabular-nums">
                            EP {ep.episode}
                            {ep.duration ? ` · ${ep.duration}` : ''}
                          </span>
                          <span className="text-[11px] inline-flex items-center gap-1 shrink-0">
                            {isWatched ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300">Watched</span>
                              </>
                            ) : isInProgress ? (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-300" />
                                <span className="text-amber-200 tabular-nums">{pct}%</span>
                              </>
                            ) : (
                              <span className="text-rose-100/45">Unwatched</span>
                            )}
                          </span>
                        </div>
                        <h4 className="font-editorial text-base font-semibold text-white truncate">
                          {ep.title || `Episode ${ep.episode}`}
                        </h4>
                        {ep.description && (
                          <p className="text-xs text-rose-100/65 line-clamp-2">{ep.description}</p>
                        )}
                      </div>
                      {pct > 0 && (
                        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/10">
                          <div
                            className={isWatched ? 'h-full bg-emerald-400' : 'h-full bg-amber-300'}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tab 2: Cast */}
          {effectiveTab === 'cast' && detail.cast && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {detail.cast.slice(0, 12).map((member, idx) => (
                <div
                  key={`${member.name}-${idx}`}
                  className="bg-black/30 border border-amber-200/15 rounded-2xl p-2.5 flex items-center gap-2.5"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-rose-950/60 shrink-0 flex items-center justify-center text-xs font-semibold text-amber-200 border border-amber-200/20">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      member.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{member.name}</p>
                    {member.role && (
                      <p className="text-[11px] text-rose-100/55 truncate">{member.role}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Related */}
          {effectiveTab === 'related' && detail.related && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {detail.related.slice(0, 6).map((rel) => (
                <ClassicMediaCard
                  key={`${rel.id}-${rel.slug}`}
                  item={rel}
                  onSelect={onSelectRelated}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
