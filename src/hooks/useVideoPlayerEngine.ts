import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { apiFetch, buildQuery } from '../lib/api';
import { normalizeSubtitles } from '../lib/mediaUtils';
import { useAuth } from '../context/AuthContext';
import type {
  ActivePlaybackTarget,
  SignedStreamResponse,
  SubtitleTrack,
} from '../types/framex';

export const PLAYER_RESOLUTIONS = ['1080', '720', '480', '360'];
export const PLAYER_SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function useVideoPlayerEngine(
  target: ActivePlaybackTarget | null,
  onClose: () => void
) {
  const { user, getWatchProgress, saveWatchProgress } = useAuth();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const hideHudTimerRef = useRef<number | null>(null);
  const autoNextTimerRef = useRef<number | null>(null);
  const lastSavedPosRef = useRef<number>(0);

  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [effectiveMode, setEffectiveMode] = useState<'direct' | 'hls' | 'embed'>('direct');
  const [loadingStream, setLoadingStream] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [resolution, setResolution] = useState<string>(user?.preferred_quality || '1080');
  const [audioLang, setAudioLang] = useState<string>(user?.preferred_audio_lang || '');
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [activeSubUrl, setActiveSubUrl] = useState<string>('off');
  const [hlsLevels, setHlsLevels] = useState<Array<{ index: number; label: string }>>([]);
  const [activeHlsLevel, setActiveHlsLevel] = useState<number>(-1);
  const [hlsAudioTracks, setHlsAudioTracks] = useState<
    Array<{ id: number; name: string; lang?: string }>
  >([]);
  const [activeHlsAudio, setActiveHlsAudio] = useState<number>(-1);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const clearAutoNextTimer = useCallback(() => {
    if (autoNextTimerRef.current) {
      window.clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setAutoNextCountdown(null);
  }, []);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    setPipSupported(
      typeof document !== 'undefined' &&
        'pictureInPictureEnabled' in document &&
        Boolean(document.pictureInPictureEnabled)
    );
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnterPip = () => setIsPipActive(true);
    const onLeavePip = () => setIsPipActive(false);
    vid.addEventListener('enterpictureinpicture', onEnterPip);
    vid.addEventListener('leavepictureinpicture', onLeavePip);
    return () => {
      vid.removeEventListener('enterpictureinpicture', onEnterPip);
      vid.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, [streamUrl, effectiveMode]);

  const persistCurrentProgress = useCallback(
    (force = false) => {
      if (!target || target.mediaType === 'live') return;
      const vid = videoRef.current;
      if (!vid || !Number.isFinite(vid.currentTime)) return;
      const pos = vid.currentTime;
      const dur = Number.isFinite(vid.duration) ? vid.duration : 0;
      if (!force && Math.abs(pos - lastSavedPosRef.current) < 4) return;
      lastSavedPosRef.current = pos;
      void saveWatchProgress({
        content_id: target.contentId,
        slug: target.slug || target.contentId,
        provider: target.provider,
        media_type: target.mediaType,
        title: target.title,
        poster: target.poster || null,
        season: target.season || 0,
        episode: target.episode || 0,
        position_seconds: pos,
        duration_seconds: dur,
      });
    },
    [target, saveWatchProgress]
  );

  const scheduleProactiveRefresh = useCallback(
    (expiresInSeconds: number | undefined, renewFn: () => void) => {
      clearRefreshTimer();
      const ttl = expiresInSeconds && expiresInSeconds > 0 ? expiresInSeconds : 600;
      const delaySec = Math.max(30, ttl - 90);
      refreshTimerRef.current = window.setTimeout(() => {
        renewFn();
      }, delaySec * 1000);
    },
    [clearRefreshTimer]
  );

  const fetchAndLoadPlayback = useCallback(
    async (preservePosition = false) => {
      if (!target) return;
      const vid = videoRef.current;
      const savedPos = preservePosition && vid ? vid.currentTime || 0 : 0;
      const wasPlaying = preservePosition && vid ? !vid.paused : true;

      if (!preservePosition) {
        setLoadingStream(true);
        setStreamError(null);
        clearAutoNextTimer();
      }

      try {
        if (target.provider === 'moviebox') {
          const data = await apiFetch<SignedStreamResponse>(
            `/api/fx/stream-url${buildQuery({
              subjectId: target.contentId,
              resolution,
              lang: audioLang || undefined,
              se: target.season || undefined,
              ep: target.episode || undefined,
            })}`
          );

          if (!data?.url) {
            throw new Error('FRAMEX did not return a playable signed stream URL.');
          }

          setEffectiveMode('direct');
          setEmbedUrl(null);
          setStreamUrl(data.url);
          scheduleProactiveRefresh(data.expiresIn, () => {
            void fetchAndLoadPlayback(true);
          });

          if (!preservePosition) {
            apiFetch(
              `/api/fx/captions${buildQuery({
                subjectId: target.contentId,
                detailPath: target.detailPath,
                resolution,
                se: target.season || undefined,
                ep: target.episode || undefined,
              })}`
            )
              .then((capRes) => {
                const tracks = normalizeSubtitles(capRes);
                setSubtitles(tracks);
                if (tracks.length > 0) {
                  const preferred =
                    tracks.find((t) =>
                      t.lang
                        ?.toLowerCase()
                        .includes((user?.preferred_subtitle_lang || 'en').toLowerCase())
                    ) || tracks[0];
                  setActiveSubUrl(preferred.url);
                }
              })
              .catch(() => setSubtitles([]));
          }

          if (preservePosition && vid) {
            vid.src = data.url;
            vid.addEventListener(
              'loadedmetadata',
              () => {
                if (savedPos > 0 && Number.isFinite(vid.duration) && savedPos < vid.duration - 2) {
                  vid.currentTime = savedPos;
                }
                if (wasPlaying) vid.play().catch(() => {});
              },
              { once: true }
            );
            vid.load();
          }
        } else if (target.provider === 'gotaku') {
          const res = await apiFetch<{
            embedUrl?: string;
            proxyUrl?: string;
            url?: string;
            expiresIn?: number;
          }>(
            `/api/fx/anime/gotaku/stream${buildQuery({
              episodeId: target.contentId,
              type: target.animeType || 'hard_sub',
            })}`
          );
          const pageUrl = res.proxyUrl || res.embedUrl || res.url;
          if (!pageUrl) throw new Error('Gotaku did not return an embed player URL.');
          setEffectiveMode('embed');
          setStreamUrl(null);
          setEmbedUrl(pageUrl);
          scheduleProactiveRefresh(res.expiresIn, () => {
            void fetchAndLoadPlayback(true);
          });
        } else if (target.provider === 'animex') {
          try {
            const res = await apiFetch<{
              proxyUrl?: string;
              url?: string;
              expiresIn?: number;
            }>(
              `/api/fx/anime/animex/stream${buildQuery({
                contentId: target.contentId,
                episode: target.episode || 1,
                type: target.animeType === 'dub' ? 'dub' : 'sub',
                providerId: target.animeProviderId,
              })}`
            );
            const hlsUrl = res.proxyUrl || res.url;
            if (!hlsUrl) throw new Error('No direct AnimeX HLS URL');
            setEffectiveMode('hls');
            setEmbedUrl(null);
            setStreamUrl(hlsUrl);
            scheduleProactiveRefresh(res.expiresIn, () => {
              void fetchAndLoadPlayback(true);
            });
          } catch {
            const emb = await apiFetch<{ embedUrl?: string; url?: string }>(
              `/api/fx/anime/animex/embed${buildQuery({
                contentId: target.contentId,
                episode: target.episode || 1,
                type: target.animeType === 'dub' ? 'dub' : 'sub',
                providerId: target.animeProviderId,
              })}`
            );
            const pageUrl = emb.embedUrl || emb.url;
            if (!pageUrl) throw new Error('AnimeX stream and embed fallback are both unavailable.');
            setEffectiveMode('embed');
            setStreamUrl(null);
            setEmbedUrl(pageUrl);
          }
        } else if (target.initialUrl) {
          setEffectiveMode(target.mode);
          if (target.mode === 'embed') {
            setEmbedUrl(target.initialUrl);
            setStreamUrl(null);
          } else {
            setStreamUrl(target.initialUrl);
            setEmbedUrl(null);
          }
        } else {
          throw new Error('Unsupported provider playback configuration.');
        }
      } catch (err) {
        setStreamError(err instanceof Error ? err.message : 'Unable to start playback.');
      } finally {
        setLoadingStream(false);
      }
    },
    [
      target,
      resolution,
      audioLang,
      scheduleProactiveRefresh,
      clearAutoNextTimer,
      user?.preferred_subtitle_lang,
    ]
  );

  useEffect(() => {
    if (!target) return;
    setSubtitles([]);
    setActiveSubUrl('off');
    setResumedFrom(null);
    clearAutoNextTimer();
    void fetchAndLoadPlayback(false);

    return () => {
      persistCurrentProgress(true);
      clearRefreshTimer();
      clearAutoNextTimer();
      destroyHls();
    };
  }, [target, fetchAndLoadPlayback, persistCurrentProgress, clearRefreshTimer, clearAutoNextTimer, destroyHls]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !streamUrl || effectiveMode === 'embed') return;

    destroyHls();
    setHlsLevels([]);
    setActiveHlsLevel(-1);
    setHlsAudioTracks([]);
    setActiveHlsAudio(-1);

    const saved = target
      ? getWatchProgress(target.contentId, target.season || 0, target.episode || 0)
      : undefined;
    const shouldResume =
      saved &&
      saved.position_seconds > 8 &&
      (!saved.duration_seconds || saved.position_seconds < saved.duration_seconds - 15);

    const applySavedPosition = () => {
      if (shouldResume && saved && vid.currentTime < 2) {
        vid.currentTime = saved.position_seconds;
        setResumedFrom(saved.position_seconds);
      }
      vid.playbackRate = playbackRate;
      vid.play().catch(() => {});
    };

    const isHlsSource = effectiveMode === 'hls' || streamUrl.includes('.m3u8');

    if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: target?.mediaType === 'live',
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(vid);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (hls.levels.length > 1) {
          setHlsLevels(
            hls.levels.map((lvl, idx) => ({
              index: idx,
              label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`,
            }))
          );
        }
        applySavedPosition();
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_evt, data) => {
        if (data.audioTracks && data.audioTracks.length > 1) {
          setHlsAudioTracks(
            data.audioTracks.map((t, i) => ({
              id: i,
              name: t.name || t.lang || `Audio ${i + 1}`,
              lang: t.lang,
            }))
          );
          setActiveHlsAudio(hls.audioTrack);
        }
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setStreamError('Live HLS stream disconnected. Try reloading.');
          }
        }
      });
    } else {
      vid.src = streamUrl;
      vid.addEventListener('loadedmetadata', applySavedPosition, { once: true });
      vid.load();
    }

    return () => {
      destroyHls();
    };
  }, [streamUrl, effectiveMode]);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) vid.play().catch(() => {});
    else vid.pause();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    const vid = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!el) return;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        await el.requestFullscreen().catch(() => {
          vid?.webkitEnterFullscreen?.();
        });
      } else {
        vid?.webkitEnterFullscreen?.();
      }
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  }, []);

  const togglePip = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid || !pipSupported) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await vid.requestPictureInPicture();
      }
    } catch {
      // Ignore unsupported PiP errors
    }
  }, [pipSupported]);

  const wakeHud = useCallback(
    (keepOpen = false) => {
      setHudVisible(true);
      if (hideHudTimerRef.current) window.clearTimeout(hideHudTimerRef.current);
      hideHudTimerRef.current = window.setTimeout(() => {
        if (playing && !keepOpen) {
          setHudVisible(false);
        }
      }, 3200);
    },
    [playing]
  );

  const handleVideoEnded = useCallback(() => {
    persistCurrentProgress(true);
    if (!autoNextEnabled || !target?.hasNextEpisode || !target.onNextEpisode) return;

    clearAutoNextTimer();
    setAutoNextCountdown(5);
    let remaining = 5;
    autoNextTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearAutoNextTimer();
        target.onNextEpisode?.();
      } else {
        setAutoNextCountdown(remaining);
      }
    }, 1000);
  }, [autoNextEnabled, clearAutoNextTimer, persistCurrentProgress, target]);

  const handleDownload = useCallback(async () => {
    if (!target || target.provider !== 'moviebox') return;
    setDownloading(true);
    try {
      const res = await apiFetch<SignedStreamResponse>(
        `/api/fx/stream-url${buildQuery({
          subjectId: target.contentId,
          resolution,
          lang: audioLang || undefined,
          se: target.season || undefined,
          ep: target.episode || undefined,
          download: 1,
        })}`
      );
      if (res?.url) {
        const a = document.createElement('a');
        a.href = res.url;
        a.download = `${target.title}.mp4`;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : 'Download link unavailable.');
    } finally {
      setDownloading(false);
    }
  }, [target, resolution, audioLang]);

  const closePlayer = useCallback(() => {
    persistCurrentProgress(true);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    onClose();
  }, [persistCurrentProgress, onClose]);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePlayer();
        return;
      }
      if (effectiveMode === 'embed') return;
      const vid = videoRef.current;
      if (!vid) return;
      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        vid.currentTime = Math.min(vid.duration || Infinity, vid.currentTime + 10);
      } else if (e.key === 'ArrowLeft') {
        vid.currentTime = Math.max(0, vid.currentTime - 10);
      } else if (e.key.toLowerCase() === 'm') {
        vid.muted = !vid.muted;
        setMuted(vid.muted);
      } else if (e.key.toLowerCase() === 'f') {
        void toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, effectiveMode, closePlayer, togglePlay, toggleFullscreen]);

  const seekTo = useCallback((seconds: number) => {
    if (videoRef.current) videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const skipBy = useCallback((delta: number) => {
    if (!videoRef.current) return;
    const next = Math.max(
      0,
      Math.min(videoRef.current.duration || Infinity, videoRef.current.currentTime + delta)
    );
    videoRef.current.currentTime = next;
    setCurrentTime(next);
  }, []);

  const changeVolume = useCallback((v: number) => {
    setVolume(v);
    setMuted(v === 0);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  }, [muted]);

  const changeSpeed = useCallback((spd: number) => {
    setPlaybackRate(spd);
    if (videoRef.current) videoRef.current.playbackRate = spd;
  }, []);

  const changeHlsLevel = useCallback((lvlIndex: number) => {
    setActiveHlsLevel(lvlIndex);
    if (hlsRef.current) hlsRef.current.currentLevel = lvlIndex;
  }, []);

  const changeHlsAudio = useCallback((trackId: number) => {
    setActiveHlsAudio(trackId);
    if (hlsRef.current) hlsRef.current.audioTrack = trackId;
  }, []);

  const changeMovieBoxQuality = useCallback(
    (q: string) => {
      setResolution(q);
      setTimeout(() => void fetchAndLoadPlayback(true), 0);
    },
    [fetchAndLoadPlayback]
  );

  const changeMovieBoxAudio = useCallback(
    (lang: string) => {
      setAudioLang(lang);
      setTimeout(() => void fetchAndLoadPlayback(true), 0);
    },
    [fetchAndLoadPlayback]
  );

  const videoEventHandlers = {
    onPlay: () => {
      setPlaying(true);
      clearAutoNextTimer();
    },
    onPause: () => {
      setPlaying(false);
      persistCurrentProgress(true);
    },
    onEnded: handleVideoEnded,
    onWaiting: () => setBuffering(true),
    onCanPlay: () => setBuffering(false),
    onTimeUpdate: () => {
      const vid = videoRef.current;
      if (!vid) return;
      setCurrentTime(vid.currentTime || 0);
      setDuration(Number.isFinite(vid.duration) ? vid.duration : 0);
      persistCurrentProgress(false);
    },
    onError: () => {
      if (target?.provider === 'moviebox' || target?.provider === 'animex') {
        void fetchAndLoadPlayback(true);
      } else {
        setStreamError('Media stream encountered a network error.');
      }
    },
  };

  const hasAudioOptions =
    hlsAudioTracks.length > 1 ||
    (target?.provider === 'moviebox' &&
      Boolean(target.availableLanguages && target.availableLanguages.length > 1));

  const hasEpisodesList = Boolean(target?.episodes && target.episodes.length > 0);

  return {
    containerRef,
    videoRef,
    streamUrl,
    embedUrl,
    effectiveMode,
    loadingStream,
    streamError,
    resolution,
    audioLang,
    subtitles,
    activeSubUrl,
    setActiveSubUrl,
    hlsLevels,
    activeHlsLevel,
    hlsAudioTracks,
    activeHlsAudio,
    playing,
    buffering,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    isFullscreen,
    isPipActive,
    pipSupported,
    hudVisible,
    setHudVisible,
    autoNextEnabled,
    setAutoNextEnabled,
    autoNextCountdown,
    downloading,
    resumedFrom,
    hasAudioOptions,
    hasEpisodesList,
    getWatchProgress,
    persistCurrentProgress,
    clearAutoNextTimer,
    fetchAndLoadPlayback,
    togglePlay,
    toggleFullscreen,
    togglePip,
    wakeHud,
    handleDownload,
    closePlayer,
    seekTo,
    skipBy,
    changeVolume,
    toggleMute,
    changeSpeed,
    changeHlsLevel,
    changeHlsAudio,
    changeMovieBoxQuality,
    changeMovieBoxAudio,
    videoEventHandlers,
  };
}
