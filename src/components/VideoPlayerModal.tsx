import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  AlertCircle,
  Captions,
  CheckCircle2,
  Download,
  ListVideo,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { apiFetch, buildQuery } from '../lib/api';
import { formatTimecode, normalizeSubtitles } from '../lib/mediaUtils';
import { useAuth } from '../context/AuthContext';
import type {
  ActivePlaybackTarget,
  SignedStreamResponse,
  SubtitleTrack,
} from '../types/framex';

interface VideoPlayerModalProps {
  target: ActivePlaybackTarget | null;
  onClose: () => void;
}

const RESOLUTIONS = ['1080', '720', '480', '360'];
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function VideoPlayerModal({ target, onClose }: VideoPlayerModalProps) {
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
  const [hlsAudioTracks, setHlsAudioTracks] = useState<Array<{ id: number; name: string; lang?: string }>>([]);
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
  const [settingsMenu, setSettingsMenu] = useState<'none' | 'quality' | 'subtitles' | 'audio' | 'speed'>('none');
  const [episodesDrawerOpen, setEpisodesDrawerOpen] = useState(false);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const clearAutoNextTimer = () => {
    if (autoNextTimerRef.current) {
      window.clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setAutoNextCountdown(null);
  };

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  // Sync fullscreen & PiP states with browser events
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
      saveWatchProgress({
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

  // Schedule proactive URL renewal ~90s before 10-minute FRAMEX expiration
  const scheduleProactiveRefresh = useCallback(
    (expiresInSeconds: number | undefined, renewFn: () => void) => {
      clearRefreshTimer();
      const ttl = expiresInSeconds && expiresInSeconds > 0 ? expiresInSeconds : 600;
      const delaySec = Math.max(30, ttl - 90);
      refreshTimerRef.current = window.setTimeout(() => {
        renewFn();
      }, delaySec * 1000);
    },
    []
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
                      t.lang?.toLowerCase().includes((user?.preferred_subtitle_lang || 'en').toLowerCase())
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
    [target, resolution, audioLang, scheduleProactiveRefresh, user?.preferred_subtitle_lang]
  );

  useEffect(() => {
    if (!target) return;
    setSubtitles([]);
    setActiveSubUrl('off');
    setResumedFrom(null);
    setEpisodesDrawerOpen(false);
    setSettingsMenu('none');
    clearAutoNextTimer();
    void fetchAndLoadPlayback(false);

    return () => {
      clearRefreshTimer();
      clearAutoNextTimer();
      destroyHls();
    };
  }, [target, fetchAndLoadPlayback]);

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

  // Handle Escape & Keyboard Shortcuts
  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (episodesDrawerOpen) {
          setEpisodesDrawerOpen(false);
          return;
        }
        if (settingsMenu !== 'none') {
          setSettingsMenu('none');
          return;
        }
        persistCurrentProgress(true);
        onClose();
      }
      if (effectiveMode === 'embed') return;
      const vid = videoRef.current;
      if (!vid) return;
      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (vid.paused) vid.play().catch(() => {});
        else vid.pause();
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
  }, [target, effectiveMode, episodesDrawerOpen, settingsMenu, onClose, persistCurrentProgress]);

  const wakeHud = () => {
    setHudVisible(true);
    if (hideHudTimerRef.current) window.clearTimeout(hideHudTimerRef.current);
    hideHudTimerRef.current = window.setTimeout(() => {
      if (playing && settingsMenu === 'none' && !episodesDrawerOpen) {
        setHudVisible(false);
      }
    }, 3200);
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) vid.play().catch(() => {});
    else vid.pause();
  };

  const toggleFullscreen = async () => {
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
  };

  const togglePip = async () => {
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
  };

  const handleVideoEnded = () => {
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
  };

  const handleDownload = async () => {
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
  };

  if (!target) return null;

  const hasAudioOptions =
    hlsAudioTracks.length > 1 ||
    (target.provider === 'moviebox' && Boolean(target.availableLanguages && target.availableLanguages.length > 1));
  const hasEpisodesList = Boolean(target.episodes && target.episodes.length > 0);

  return (
    <div
      ref={containerRef}
      onMouseMove={wakeHud}
      onTouchStart={wakeHud}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${target.title}`}
    >
      {/* Top Glass Header */}
      <div
        className={`absolute top-0 inset-x-0 z-30 p-3 sm:p-5 bg-gradient-to-b from-black/95 via-black/55 to-transparent flex items-center justify-between gap-3 transition-opacity duration-200 ${
          hudVisible || effectiveMode === 'embed' || episodesDrawerOpen
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="min-w-0">
          <h2 className="font-display text-sm sm:text-xl font-semibold text-white truncate">
            {target.title}
          </h2>
          {target.subtitle && (
            <p className="text-xs sm:text-sm text-rose-100/75 truncate">{target.subtitle}</p>
          )}
          {resumedFrom !== null && (
            <p className="text-[11px] text-amber-300 mt-0.5 tabular-nums">
              Resumed from {formatTimecode(resumedFrom)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {hasEpisodesList && (
            <button
              type="button"
              onClick={() => setEpisodesDrawerOpen((o) => !o)}
              className={`glass-btn h-10 sm:h-10 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                episodesDrawerOpen ? 'border-rose-400/60 text-amber-200' : 'text-white'
              }`}
            >
              <ListVideo className="w-4 h-4" />
              <span className="hidden sm:inline">Episodes ({target.episodes!.length})</span>
            </button>
          )}
          {target.provider === 'moviebox' && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              aria-label="Download"
              className="glass-btn h-10 px-3 rounded-xl text-xs font-medium text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden md:inline">Download</span>
            </button>
          )}
          {target.hasPrevEpisode && target.onPrevEpisode && (
            <button
              type="button"
              onClick={() => {
                persistCurrentProgress(true);
                target.onPrevEpisode?.();
              }}
              aria-label="Previous Episode"
              className="glass-btn h-10 px-3 rounded-xl text-xs font-medium text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
              <span className="hidden lg:inline">Prev Ep</span>
            </button>
          )}
          {target.hasNextEpisode && target.onNextEpisode && (
            <button
              type="button"
              onClick={() => {
                persistCurrentProgress(true);
                target.onNextEpisode?.();
              }}
              className="glass-btn-primary h-10 px-3 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span className="hidden sm:inline">Next Ep</span>
              <SkipForward className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              persistCurrentProgress(true);
              if (document.fullscreenElement) {
                void document.exitFullscreen().catch(() => {});
              }
              onClose();
            }}
            aria-label="Close player"
            className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Media Surface */}
      {loadingStream ? (
        <div className="flex flex-col items-center gap-3 text-rose-100/80">
          <Loader2 className="w-9 h-9 animate-spin text-rose-400" />
          <p className="text-sm">Securing playback stream…</p>
        </div>
      ) : streamError ? (
        <div className="glass-surface-elevated max-w-md mx-4 p-6 rounded-3xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="font-display text-lg font-semibold text-white">Playback Interrupted</h3>
            <p className="text-sm text-rose-100/75">{streamError}</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void fetchAndLoadPlayback(false)}
              className="glass-btn-primary px-4 py-2.5 rounded-xl text-sm font-medium text-white inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Stream</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="glass-btn px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      ) : effectiveMode === 'embed' && embedUrl ? (
        <div className="w-full h-full pt-16 sm:pt-20 pb-3 px-2 sm:px-6 flex items-center justify-center">
          <iframe
            src={embedUrl}
            title={target.title}
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            className="w-full h-full max-w-7xl rounded-2xl border border-rose-200/15 bg-black"
          />
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            onClick={() => {
              if (window.matchMedia('(pointer: coarse)').matches) {
                setHudVisible((v) => !v);
              } else {
                togglePlay();
              }
            }}
            onDoubleClick={() => void toggleFullscreen()}
            onPlay={() => {
              setPlaying(true);
              clearAutoNextTimer();
            }}
            onPause={() => {
              setPlaying(false);
              persistCurrentProgress(true);
            }}
            onEnded={handleVideoEnded}
            onWaiting={() => setBuffering(true)}
            onCanPlay={() => setBuffering(false)}
            onTimeUpdate={() => {
              const vid = videoRef.current;
              if (!vid) return;
              setCurrentTime(vid.currentTime || 0);
              setDuration(Number.isFinite(vid.duration) ? vid.duration : 0);
              persistCurrentProgress(false);
            }}
            onError={() => {
              if (target.provider === 'moviebox' || target.provider === 'animex') {
                void fetchAndLoadPlayback(true);
              } else {
                setStreamError('Media stream encountered a network error.');
              }
            }}
            crossOrigin="anonymous"
            playsInline
            className="w-full h-full object-contain bg-black cursor-pointer"
          >
            {activeSubUrl !== 'off' && (
              <track
                key={activeSubUrl}
                kind="subtitles"
                src={`/api/fx/subtitle-proxy?url=${encodeURIComponent(activeSubUrl)}`}
                default
              />
            )}
          </video>

          {buffering && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
              <div className="glass-surface px-4 py-3 rounded-2xl flex items-center gap-2.5">
                <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                <span className="text-xs font-medium text-white">Buffering…</span>
              </div>
            </div>
          )}

          {/* Auto-Next Countdown Card */}
          {autoNextCountdown !== null && target.onNextEpisode && (
            <div className="absolute bottom-28 right-4 sm:right-8 z-40 glass-surface-elevated rounded-2xl p-4 w-72 space-y-3 border border-rose-400/35">
              <div className="space-y-1">
                <p className="text-xs text-amber-300 font-medium tabular-nums">
                  Up Next in {autoNextCountdown}s
                </p>
                <p className="font-display text-sm font-semibold text-white truncate">
                  Episode {(target.episode || 1) + 1}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearAutoNextTimer();
                    target.onNextEpisode?.();
                  }}
                  className="glass-btn-primary flex-1 h-9 rounded-xl text-xs font-semibold text-white cursor-pointer"
                >
                  Play Now
                </button>
                <button
                  type="button"
                  onClick={clearAutoNextTimer}
                  className="glass-btn h-9 px-3 rounded-xl text-xs text-rose-100 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Custom Glass Bottom Controls */}
          <div
            className={`absolute bottom-0 inset-x-0 z-30 p-3 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-200 ${
              hudVisible || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Seek Bar */}
            {target.mediaType !== 'live' && (
              <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
                <span className="font-mono text-[11px] sm:text-xs text-rose-100/85 tabular-nums w-12 sm:w-14">
                  {formatTimecode(currentTime)}
                </span>
                <input
                  type="range"
                  aria-label="Seek position"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={Math.min(currentTime, duration || 100)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (videoRef.current) videoRef.current.currentTime = next;
                    setCurrentTime(next);
                  }}
                  className="flex-1 accent-rose-500 h-2 sm:h-1.5 rounded-full cursor-pointer"
                />
                <span className="font-mono text-[11px] sm:text-xs text-rose-100/65 tabular-nums w-12 sm:w-14 text-right">
                  {formatTimecode(duration)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              {/* Left Playback Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className="glass-btn-primary w-11 h-11 rounded-xl flex items-center justify-center text-white cursor-pointer"
                >
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {target.mediaType !== 'live' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                        }
                      }}
                      aria-label="Rewind 10 seconds"
                      className="glass-btn w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-rose-100 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = Math.min(
                            videoRef.current.duration || Infinity,
                            videoRef.current.currentTime + 10
                          );
                        }
                      }}
                      aria-label="Forward 10 seconds"
                      className="glass-btn w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-rose-100 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Volume */}
                <div className="hidden sm:flex items-center gap-2 ml-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!videoRef.current) return;
                      videoRef.current.muted = !muted;
                      setMuted(!muted);
                    }}
                    aria-label={muted ? 'Unmute' : 'Mute'}
                    className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-rose-100 cursor-pointer"
                  >
                    {muted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    aria-label="Volume"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setVolume(v);
                      setMuted(v === 0);
                      if (videoRef.current) {
                        videoRef.current.volume = v;
                        videoRef.current.muted = v === 0;
                      }
                    }}
                    className="w-20 accent-rose-500 h-1 cursor-pointer"
                  />
                </div>
              </div>

              {/* Right Settings, PiP & Fullscreen */}
              <div className="flex items-center gap-1.5 sm:gap-2 relative">
                {subtitles.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsMenu((m) => (m === 'subtitles' ? 'none' : 'subtitles'))
                    }
                    aria-label="Subtitles"
                    className={`glass-btn h-11 sm:h-10 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                      activeSubUrl !== 'off' ? 'text-amber-300 border-amber-300/30' : 'text-rose-100'
                    }`}
                  >
                    <Captions className="w-4 h-4" />
                    <span className="hidden md:inline">Subtitles</span>
                  </button>
                )}

                {hasAudioOptions && (
                  <button
                    type="button"
                    onClick={() => setSettingsMenu((m) => (m === 'audio' ? 'none' : 'audio'))}
                    className="glass-btn h-11 sm:h-10 px-3 rounded-xl text-xs font-medium text-rose-100 cursor-pointer whitespace-nowrap"
                  >
                    Audio
                  </button>
                )}

                {(target.provider === 'moviebox' || hlsLevels.length > 0) && (
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsMenu((m) => (m === 'quality' ? 'none' : 'quality'))
                    }
                    className="glass-btn h-11 sm:h-10 px-3 rounded-xl text-xs font-medium text-rose-100 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    <span>
                      {target.provider === 'moviebox'
                        ? `${resolution}p`
                        : activeHlsLevel === -1
                          ? 'Auto'
                          : hlsLevels.find((l) => l.index === activeHlsLevel)?.label || 'Auto'}
                    </span>
                  </button>
                )}

                {target.mediaType !== 'live' && (
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsMenu((m) => (m === 'speed' ? 'none' : 'speed'))
                    }
                    className="glass-btn h-11 sm:h-10 px-3 rounded-xl text-xs font-mono text-rose-100 cursor-pointer"
                  >
                    {playbackRate}x
                  </button>
                )}

                {pipSupported && (
                  <button
                    type="button"
                    onClick={() => void togglePip()}
                    aria-label="Picture in Picture"
                    className={`glass-btn w-11 h-11 sm:w-10 sm:h-10 rounded-xl hidden sm:flex items-center justify-center cursor-pointer ${
                      isPipActive ? 'text-amber-300 border-amber-300/40' : 'text-rose-100'
                    }`}
                  >
                    <PictureInPicture2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  className="glass-btn w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-rose-100 cursor-pointer"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>

                {/* Settings Popover */}
                {settingsMenu !== 'none' && (
                  <div className="glass-surface-elevated absolute bottom-13 right-0 w-60 rounded-2xl p-2 space-y-1 z-40 max-h-72 overflow-y-auto">
                    {settingsMenu === 'quality' && (
                      <>
                        {target.provider === 'moviebox'
                          ? RESOLUTIONS.map((q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => {
                                  setResolution(q);
                                  setSettingsMenu('none');
                                  void fetchAndLoadPlayback(true);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                  resolution === q
                                    ? 'bg-rose-600/80 text-white'
                                    : 'text-rose-100/80 hover:bg-white/10'
                                }`}
                              >
                                {q}p HD
                              </button>
                            ))
                          : [{ index: -1, label: 'Auto Adaptive' }, ...hlsLevels].map((lvl) => (
                              <button
                                key={lvl.index}
                                type="button"
                                onClick={() => {
                                  setActiveHlsLevel(lvl.index);
                                  if (hlsRef.current) hlsRef.current.currentLevel = lvl.index;
                                  setSettingsMenu('none');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                  activeHlsLevel === lvl.index
                                    ? 'bg-rose-600/80 text-white'
                                    : 'text-rose-100/80 hover:bg-white/10'
                                }`}
                              >
                                {lvl.label}
                              </button>
                            ))}

                        {target.hasNextEpisode && (
                          <button
                            type="button"
                            onClick={() => setAutoNextEnabled((v) => !v)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-rose-100/85 hover:bg-white/10 border-t border-rose-200/10 mt-1 pt-2 cursor-pointer"
                          >
                            <span>Auto-Next Episode</span>
                            <span className="font-mono text-amber-300">
                              {autoNextEnabled ? 'ON' : 'OFF'}
                            </span>
                          </button>
                        )}
                      </>
                    )}

                    {settingsMenu === 'audio' && (
                      <>
                        {hlsAudioTracks.length > 1
                          ? hlsAudioTracks.map((tr) => (
                              <button
                                key={tr.id}
                                type="button"
                                onClick={() => {
                                  setActiveHlsAudio(tr.id);
                                  if (hlsRef.current) hlsRef.current.audioTrack = tr.id;
                                  setSettingsMenu('none');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                                  activeHlsAudio === tr.id
                                    ? 'bg-rose-600/80 text-white'
                                    : 'text-rose-100/80 hover:bg-white/10'
                                }`}
                              >
                                {tr.name}
                              </button>
                            ))
                          : (target.availableLanguages || []).map((lang) => (
                              <button
                                key={lang}
                                type="button"
                                onClick={() => {
                                  setAudioLang(lang);
                                  setSettingsMenu('none');
                                  void fetchAndLoadPlayback(true);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium uppercase cursor-pointer ${
                                  audioLang === lang
                                    ? 'bg-rose-600/80 text-white'
                                    : 'text-rose-100/80 hover:bg-white/10'
                                }`}
                              >
                                {lang}
                              </button>
                            ))}
                      </>
                    )}

                    {settingsMenu === 'subtitles' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSubUrl('off');
                            setSettingsMenu('none');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium cursor-pointer ${
                            activeSubUrl === 'off'
                              ? 'bg-rose-600/80 text-white'
                              : 'text-rose-100/80 hover:bg-white/10'
                          }`}
                        >
                          Off
                        </button>
                        {subtitles.map((sub, idx) => (
                          <button
                            key={`${sub.url}-${idx}`}
                            type="button"
                            onClick={() => {
                              setActiveSubUrl(sub.url);
                              setSettingsMenu('none');
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium truncate cursor-pointer ${
                              activeSubUrl === sub.url
                                ? 'bg-rose-600/80 text-white'
                                : 'text-rose-100/80 hover:bg-white/10'
                            }`}
                          >
                            {sub.label || sub.lang || `Track ${idx + 1}`}
                          </button>
                        ))}
                      </>
                    )}

                    {settingsMenu === 'speed' &&
                      SPEEDS.map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => {
                            setPlaybackRate(spd);
                            if (videoRef.current) videoRef.current.playbackRate = spd;
                            setSettingsMenu('none');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono cursor-pointer ${
                            playbackRate === spd
                              ? 'bg-rose-600/80 text-white'
                              : 'text-rose-100/80 hover:bg-white/10'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* In-Player Slide-Over Episodes Drawer (works in Fullscreen) */}
      {episodesDrawerOpen && hasEpisodesList && (
        <aside className="absolute top-16 sm:top-20 bottom-4 right-3 sm:right-6 z-40 w-[calc(100%-1.5rem)] sm:w-88 glass-surface-elevated rounded-2xl p-4 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-rose-200/10">
            <div>
              <h3 className="font-display text-sm font-semibold text-white">
                {target.season ? `Season ${target.season} Episodes` : 'Episodes'}
              </h3>
              <p className="text-[11px] text-rose-100/60 tabular-nums">
                {target.episodes!.length} episodes available
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEpisodesDrawerOpen(false)}
              aria-label="Close episodes list"
              className="glass-btn w-8 h-8 rounded-lg flex items-center justify-center text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {target.episodes!.map((ep) => {
              const isCurrent = ep.episode === target.episode;
              const prog = getWatchProgress(
                target.contentId,
                ep.season ?? target.season ?? 0,
                ep.episode
              );
              const isWatched =
                Boolean(prog) &&
                prog!.duration_seconds > 0 &&
                prog!.position_seconds >= prog!.duration_seconds - 15;

              return (
                <button
                  key={`${ep.season ?? 0}-${ep.episode}`}
                  type="button"
                  onClick={() => {
                    persistCurrentProgress(true);
                    setEpisodesDrawerOpen(false);
                    target.onSelectEpisode?.(ep);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-colors flex items-center gap-3 cursor-pointer ${
                    isCurrent
                      ? 'bg-rose-800/45 border-rose-400/50 text-white'
                      : 'glass-surface border-rose-200/10 hover:border-rose-300/30 text-rose-100/85'
                  }`}
                >
                  {ep.thumbnail ? (
                    <img
                      src={ep.thumbnail}
                      alt={ep.title || `Episode ${ep.episode}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-16 aspect-video rounded-md object-cover shrink-0 bg-black/50"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-black/45 border border-rose-200/10 flex items-center justify-center font-mono text-xs text-rose-300 shrink-0 tabular-nums">
                      {ep.episode}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-rose-300 tabular-nums">
                        EP {ep.episode}
                        {ep.duration ? ` · ${ep.duration}` : ''}
                      </span>
                      {isWatched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-xs font-medium text-white truncate">
                      {ep.title || `Episode ${ep.episode}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}
    </div>
  );
}
