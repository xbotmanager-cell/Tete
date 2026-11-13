import { useCallback, useEffect, useState } from 'react';
import { apiFetch, buildQuery } from '../lib/api';
import { normalizeMediaDetail } from '../lib/mediaUtils';
import { useAuth } from '../context/AuthContext';
import type {
  ActivePlaybackTarget,
  MediaDetail,
  MediaItem,
  PlayerEpisodeOption,
} from '../types/framex';

export function useTitleDetailEngine(
  item: MediaItem | null,
  onPlay: (target: ActivePlaybackTarget) => void
) {
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

  const isShowbox = detail?.source === 'showbox';
  const playId = detail ? resolvedSubjectId || detail.subjectId || detail.id : '';
  const inWatchlist = detail ? isInLibrary(detail.id, 'watchlist', detail.type) : false;
  const inFavorites = detail ? isInLibrary(detail.id, 'favorite', detail.type) : false;

  const currentSeasonObj = detail?.seasons?.find((s) => s.season === selectedSeason);
  const seasonEpisodes = currentSeasonObj?.episodes || [];

  const savedProgress = detail
    ? getWatchProgress(
        playId,
        detail.type === 'series' ? selectedSeason : 0,
        detail.type === 'series' ? selectedEpisode : 0
      )
    : undefined;

  const buildPlayerEpisodes = useCallback(
    (se?: number): PlayerEpisodeOption[] => {
      if (!detail) return [];
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
    },
    [detail, currentSeasonObj]
  );

  const launchPlay = useCallback(
    async (se?: number, ep?: number) => {
      if (!detail) return;
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
    },
    [detail, isShowbox, playId, buildPlayerEpisodes, onPlay]
  );

  const handleDownload = useCallback(async () => {
    if (!detail) return;
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
  }, [detail, isShowbox, playId, selectedSeason, selectedEpisode]);

  const toggleWatchlist = useCallback(() => {
    if (!detail) return;
    void toggleLibraryItem({
      list_type: 'watchlist',
      media_type: detail.type,
      item_id: detail.id,
      slug: detail.slug,
      provider: detail.source,
      title: detail.title,
      poster: detail.poster || null,
      year: detail.year ? String(detail.year) : null,
    });
  }, [detail, toggleLibraryItem]);

  const toggleFavorite = useCallback(() => {
    if (!detail) return;
    void toggleLibraryItem({
      list_type: 'favorite',
      media_type: detail.type,
      item_id: detail.id,
      slug: detail.slug,
      provider: detail.source,
      title: detail.title,
      poster: detail.poster || null,
      year: detail.year ? String(detail.year) : null,
    });
  }, [detail, toggleLibraryItem]);

  return {
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
  };
}
