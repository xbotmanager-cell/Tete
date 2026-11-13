import { useEffect, useState } from 'react';
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
import { apiFetch, buildQuery } from '../lib/api';
import { FALLBACK_ART, normalizeMediaDetail } from '../lib/mediaUtils';
import { useAuth } from '../context/AuthContext';
import type {
  ActivePlaybackTarget,
  MediaDetail,
  MediaItem,
  PlayerEpisodeOption,
} from '../types/framex';
import { MediaCard } from './MediaCard';

interface TitleDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay: (target: ActivePlaybackTarget) => void;
  onSelectRelated: (item: MediaItem) => void;
}

export function TitleDetailModal({
  item,
  onClose,
  onPlay,
  onSelectRelated,
}: TitleDetailModalProps) {
  const { isInLibrary, toggleLibraryItem, getWatchProgress } = useAuth();
  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [resolvedSubjectId, setResolvedSubjectId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    let active = true;
    setLoading(true);
    setActionNotice(null);
    setResolvedSubjectId(null);
    setDetail(normalizeMediaDetail(item.raw || item, item));

    const prefixParam = item.source === 'showbox' ? 'v2' : 'v1';

    (async () => {
      try {
        const res = await apiFetch(
          `/api/fx/movies/${encodeURIComponent(item.slug)}${buildQuery({
            provider: prefixParam,
            type: item.type,
          })}`
        );
        if (!active) return;
        const norm = normalizeMediaDetail(res, item);
        setDetail(norm);

        if (norm.seasons && norm.seasons.length > 0) {
          setSelectedSeason(norm.seasons[0].season);
          setSelectedEpisode(norm.seasons[0].episodes[0]?.episode || 1);
        }

        if (norm.source !== 'showbox') {
          if (/^\d+$/.test(norm.subjectId || '')) {
            setResolvedSubjectId(norm.subjectId!);
          } else if (norm.detailPath || norm.slug) {
            try {
              const idRes = await apiFetch<{ subjectId?: string; id?: string }>(
                `/api/fx/ids/lookup${buildQuery({ detailPath: norm.detailPath || norm.slug })}`
              );
              if (active && (idRes?.subjectId || idRes?.id)) {
                setResolvedSubjectId(String(idRes.subjectId || idRes.id));
              }
            } catch {
              setResolvedSubjectId(norm.id);
            }
          }
        }
      } catch {
        // Retain base item info if detail fetch fails
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [item]);

  if (!item || !detail) return null;

  const isShowbox = detail.source === 'showbox';
  const playId = resolvedSubjectId || detail.subjectId || detail.id;
  const inWatchlist = isInLibrary(detail.id, 'watchlist', detail.type);
  const inFavorites = isInLibrary(detail.id, 'favorite', detail.type);

  const currentSeasonObj = detail.seasons?.find((s) => s.season === selectedSeason);
  const seasonEpisodes = currentSeasonObj?.episodes || [];
  const savedProgress = getWatchProgress(
    playId,
    detail.type === 'series' ? selectedSeason : 0,
    detail.type === 'series' ? selectedEpisode : 0
  );

  const buildPlayerEpisodes = (se?: number): PlayerEpisodeOption[] => {
    const targetSeason = detail.seasons?.find((s) => s.season === se) || currentSeasonObj;
    return (targetSeason?.episodes || []).map((ep) => ({
      id: ep.id,
      season: ep.season,
      episode: ep.episode,
      title: ep.title,
      thumbnail: ep.thumbnail,
      duration: ep.duration,
      description: ep.description,
    }));
  };

  const launchPlay = async (se?: number, ep?: number) => {
    setActionNotice(null);
    const episodesForSeason = buildPlayerEpisodes(se);
    const currentIdx = episodesForSeason.findIndex((x) => x.episode === ep);
    const prevEpObj = currentIdx > 0 ? episodesForSeason[currentIdx - 1] : null;
    const nextEpObj =
      currentIdx >= 0 && currentIdx < episodesForSeason.length - 1
        ? episodesForSeason[currentIdx + 1]
        : null;

    if (isShowbox) {
      try {
        const sources = await apiFetch<{
          sources?: Array<{ url?: string; type?: string }>;
          url?: string;
        }>(
          `/api/fx/proxy/sources/${encodeURIComponent(detail.slug)}${buildQuery({
            type: detail.type,
            imdb: detail.imdbId || undefined,
            season: se,
            episode: ep,
          })}`
        );
        const firstUrl = sources?.url || sources?.sources?.[0]?.url;
        if (!firstUrl) {
          setActionNotice(
            'This Showbox discovery title does not currently have a playable proxy stream source.'
          );
          return;
        }
        onPlay({
          mode: firstUrl.includes('.m3u8') ? 'hls' : 'direct',
          title: detail.title,
          subtitle: se && ep ? `Season ${se} · Episode ${ep}` : undefined,
          poster: detail.poster,
          provider: 'proxy',
          contentId: playId,
          slug: detail.slug,
          mediaType: detail.type === 'series' ? 'series' : 'movie',
          season: se,
          episode: ep,
          episodes: episodesForSeason.length > 0 ? episodesForSeason : undefined,
          initialUrl: firstUrl,
          hasPrevEpisode: Boolean(prevEpObj),
          onPrevEpisode: prevEpObj ? () => void launchPlay(se, prevEpObj.episode) : undefined,
          hasNextEpisode: Boolean(nextEpObj),
          onNextEpisode: nextEpObj ? () => void launchPlay(se, nextEpObj.episode) : undefined,
          onSelectEpisode: (chosen) => void launchPlay(chosen.season ?? se, chosen.episode),
        });
      } catch {
        setActionNotice(
          'Playback routes support MovieBox titles directly; no active proxy stream was found for this Showbox title.'
        );
      }
      return;
    }

    onPlay({
      mode: 'direct',
      title: detail.title,
      subtitle:
        se && ep
          ? `Season ${se} · Episode ${ep}`
          : detail.year
            ? String(detail.year)
            : undefined,
      poster: detail.poster,
      provider: 'moviebox',
      contentId: playId,
      slug: detail.slug,
      detailPath: detail.detailPath || detail.slug,
      mediaType: detail.type === 'series' ? 'series' : 'movie',
      season: se,
      episode: ep,
      episodes: episodesForSeason.length > 0 ? episodesForSeason : undefined,
      availableLanguages: detail.languages,
      hasPrevEpisode: Boolean(prevEpObj),
      onPrevEpisode: prevEpObj ? () => void launchPlay(se, prevEpObj.episode) : undefined,
      hasNextEpisode: Boolean(nextEpObj),
      onNextEpisode: nextEpObj ? () => void launchPlay(se, nextEpObj.episode) : undefined,
      onSelectEpisode: (chosen) => void launchPlay(chosen.season ?? se, chosen.episode),
    });
  };

  const handleDownload = async () => {
    if (isShowbox) {
      setActionNotice('Direct downloads are available for MovieBox titles.');
      return;
    }
    try {
      const res = await apiFetch<{ url?: string }>(
        `/api/fx/stream-url${buildQuery({
          subjectId: playId,
          resolution: '1080',
          se: detail.type === 'series' ? selectedSeason : undefined,
          ep: detail.type === 'series' ? selectedEpisode : undefined,
          download: 1,
        })}`
      );
      if (res?.url) {
        const a = document.createElement('a');
        a.href = res.url;
        a.download = `${detail.title}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : 'Download unavailable.');
    }
  };

  const metaLine = [
    detail.year ? String(detail.year) : null,
    detail.type === 'series'
      ? detail.seasons?.length
        ? `TV Series · ${detail.seasons.length} Season${detail.seasons.length > 1 ? 's' : ''}`
        : 'TV Series'
      : 'Feature Film',
    detail.duration ? String(detail.duration) : null,
    detail.rating ? `★ ${detail.rating}` : null,
    detail.source === 'showbox' ? 'Showbox' : 'MovieBox',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-6 flex items-start justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={detail.title}
    >
      <div className="glass-surface-elevated w-full max-w-5xl rounded-3xl overflow-hidden my-auto relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="glass-btn absolute top-4 right-4 z-20 w-11 h-11 rounded-xl flex items-center justify-center text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cinematic Backdrop */}
        <div className="relative h-56 sm:h-80 w-full overflow-hidden bg-[#16060b]">
          <img
            src={detail.backdrop || detail.poster || FALLBACK_ART.cinemaHero}
            alt={detail.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12060a] via-[#12060a]/55 to-transparent" />
        </div>

        {/* Main Content */}
        <div className="px-5 sm:px-8 pb-8 -mt-24 sm:-mt-32 relative z-10 space-y-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <img
              src={detail.poster || FALLBACK_ART.cinemaHero}
              alt={detail.title}
              referrerPolicy="no-referrer"
              className="w-28 sm:w-40 aspect-[2/3] object-cover rounded-2xl border border-rose-200/15 shadow-2xl shrink-0 bg-[#1a080e]"
            />

            <div className="flex-1 min-w-0 space-y-4 pt-2 sm:pt-12">
              <div>
                <p className="text-xs sm:text-sm text-rose-200/75 mb-1.5">{metaLine}</p>
                <h2 className="font-display text-2xl sm:text-4xl font-bold text-white leading-tight text-balance">
                  {detail.title}
                </h2>
                {detail.genres.length > 0 && (
                  <p className="text-xs sm:text-sm text-rose-100/60 mt-1.5">
                    {detail.genres.join(' · ')}
                  </p>
                )}
              </div>

              {detail.description && (
                <p className="text-sm sm:text-base text-rose-50/80 leading-relaxed max-w-2xl">
                  {detail.description}
                </p>
              )}

              {/* Action Bar */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    void launchPlay(
                      detail.type === 'series' ? selectedSeason : undefined,
                      detail.type === 'series' ? selectedEpisode : undefined
                    )
                  }
                  className="glass-btn-primary h-11 px-6 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {savedProgress && savedProgress.position_seconds > 10
                      ? detail.type === 'series'
                        ? `Resume S${selectedSeason} E${selectedEpisode}`
                        : 'Resume Playback'
                      : detail.type === 'series'
                        ? `Play S${selectedSeason} E${selectedEpisode}`
                        : 'Play Now'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void toggleLibraryItem({
                      list_type: 'watchlist',
                      media_type: detail.type,
                      item_id: detail.id,
                      slug: detail.slug,
                      provider: detail.source,
                      title: detail.title,
                      poster: detail.poster || null,
                      year: detail.year ? String(detail.year) : null,
                    })
                  }
                  className={`glass-btn h-11 px-4 rounded-xl text-sm font-medium inline-flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    inWatchlist ? 'text-amber-300 border-amber-300/35' : 'text-white'
                  }`}
                >
                  {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span>{inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void toggleLibraryItem({
                      list_type: 'favorite',
                      media_type: detail.type,
                      item_id: detail.id,
                      slug: detail.slug,
                      provider: detail.source,
                      title: detail.title,
                      poster: detail.poster || null,
                      year: detail.year ? String(detail.year) : null,
                    })
                  }
                  aria-label="Favorite"
                  className={`glass-btn h-11 w-11 rounded-xl flex items-center justify-center cursor-pointer ${
                    inFavorites ? 'text-rose-400 border-rose-400/40' : 'text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${inFavorites ? 'fill-current' : ''}`} />
                </button>

                {!isShowbox && (
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    aria-label="Download title"
                    className="glass-btn h-11 px-4 rounded-xl text-sm font-medium text-white inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                )}

                {loading && <Loader2 className="w-4 h-4 animate-spin text-rose-300 ml-1" />}
              </div>

              {actionNotice && (
                <div className="flex items-start gap-2 text-xs text-amber-200 bg-amber-950/40 border border-amber-400/25 rounded-xl px-3.5 py-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionNotice}</span>
                </div>
              )}
            </div>
          </div>

          {/* Complete Series & Episode Browser */}
          {detail.type === 'series' && detail.seasons && detail.seasons.length > 0 && (
            <section className="space-y-4 pt-4 border-t border-rose-200/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">
                    Seasons & Episodes
                  </h3>
                  <p className="text-xs text-rose-100/60 mt-0.5 tabular-nums">
                    Season {selectedSeason} · {seasonEpisodes.length} Episode
                    {seasonEpisodes.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {detail.seasons.map((s) => (
                    <button
                      key={s.season}
                      type="button"
                      onClick={() => {
                        setSelectedSeason(s.season);
                        setSelectedEpisode(s.episodes[0]?.episode || 1);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                        selectedSeason === s.season
                          ? 'glass-btn-primary text-white'
                          : 'glass-btn text-rose-100/75'
                      }`}
                    >
                      Season {s.season}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
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
                      className={`relative overflow-hidden text-left p-3 rounded-2xl border transition-colors flex items-start gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'bg-rose-900/35 border-rose-400/45 text-white'
                          : 'glass-surface border-rose-200/10 text-rose-100/85 hover:border-rose-300/35'
                      }`}
                    >
                      {/* Render genuine API episode thumbnail when provided; clean episode number tile otherwise */}
                      {ep.thumbnail ? (
                        <div className="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden bg-black/40 shrink-0 border border-rose-200/10">
                          <img
                            src={ep.thumbnail}
                            alt={ep.title || `Episode ${ep.episode}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white fill-current opacity-90" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-black/40 border border-rose-200/10 flex flex-col items-center justify-center shrink-0">
                          <span className="font-mono text-xs font-semibold text-rose-300 tabular-nums">
                            E{String(ep.episode).padStart(2, '0')}
                          </span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-rose-300 tabular-nums">
                            Episode {ep.episode}
                            {ep.duration ? ` · ${ep.duration}` : ''}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium shrink-0">
                            {isWatched ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300">Watched</span>
                              </>
                            ) : isInProgress ? (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-300" />
                                <span className="text-amber-200 tabular-nums">Resume · {pct}%</span>
                              </>
                            ) : (
                              <span className="text-rose-100/50">Unwatched</span>
                            )}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-white truncate">
                          {ep.title || `Episode ${ep.episode}`}
                        </h4>

                        {ep.description && (
                          <p className="text-xs text-rose-100/65 line-clamp-2 leading-relaxed">
                            {ep.description}
                          </p>
                        )}
                      </div>

                      {pct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                          <div
                            className={`h-full ${
                              isWatched
                                ? 'bg-emerald-400'
                                : 'bg-gradient-to-r from-rose-500 to-amber-300'
                            }`}
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

          {/* Cast */}
          {detail.cast && detail.cast.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-rose-200/10">
              <h3 className="font-display text-lg font-semibold text-white">Cast</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {detail.cast.slice(0, 12).map((member, idx) => (
                  <div
                    key={`${member.name}-${idx}`}
                    className="glass-surface rounded-xl p-2.5 flex items-center gap-2.5"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-rose-950/60 shrink-0 flex items-center justify-center text-xs font-semibold text-rose-200">
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
            </section>
          )}

          {/* Related Content */}
          {detail.related && detail.related.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-rose-200/10">
              <h3 className="font-display text-lg font-semibold text-white">Related Titles</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {detail.related.slice(0, 6).map((rel) => (
                  <MediaCard
                    key={`${rel.id}-${rel.slug}`}
                    item={rel}
                    onSelect={onSelectRelated}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
