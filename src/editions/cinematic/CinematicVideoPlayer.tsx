import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Captions,
  Check,
  CheckCircle2,
  Download,
  Gauge,
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
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { FALLBACK_ART, formatTimecode } from '../../lib/mediaUtils';
import {
  PLAYER_RESOLUTIONS,
  PLAYER_SPEEDS,
  useVideoPlayerEngine,
} from '../../hooks/useVideoPlayerEngine';
import type { ActivePlaybackTarget } from '../../types/framex';

interface CinematicVideoPlayerProps {
  target: ActivePlaybackTarget | null;
  onClose: () => void;
}

export function CinematicVideoPlayer({ target, onClose }: CinematicVideoPlayerProps) {
  const engine = useVideoPlayerEngine(target, onClose);
  const [popover, setPopover] = useState<'none' | 'tracks' | 'quality' | 'speed'>('none');
  const [episodesOpen, setEpisodesOpen] = useState(false);

  if (!target) return null;

  return (
    <div
      ref={engine.containerRef}
      onMouseMove={() => engine.wakeHud(popover !== 'none' || episodesOpen)}
      onTouchStart={() => engine.wakeHud(popover !== 'none' || episodesOpen)}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${target.title}`}
    >
      {/* Pure Theater Stage */}
      {engine.loadingStream ? (
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 className="w-11 h-11 animate-spin text-[#e50914]" />
          <p className="font-cinema text-2xl tracking-widest uppercase">Loading Feature</p>
        </div>
      ) : engine.streamError ? (
        <div className="max-w-md mx-4 rounded-xl bg-[#141414] border border-white/10 p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-[#e50914] mx-auto" />
          <h3 className="font-cinema text-2xl uppercase tracking-wide text-white">
            Playback Error
          </h3>
          <p className="text-xs text-neutral-300">{engine.streamError}</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => void engine.fetchAndLoadPlayback(false)}
              className="px-5 py-2 rounded bg-[#e50914] hover:bg-[#f40612] text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={engine.closePlayer}
              className="px-5 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white cursor-pointer"
            >
              Back to Browse
            </button>
          </div>
        </div>
      ) : engine.effectiveMode === 'embed' && engine.embedUrl ? (
        <iframe
          src={engine.embedUrl}
          title={target.title}
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer"
          className="w-full h-full bg-black"
        />
      ) : (
        <video
          ref={engine.videoRef}
          onClick={() => {
            if (window.matchMedia('(pointer: coarse)').matches) {
              engine.setHudVisible((v) => !v);
            } else {
              engine.togglePlay();
            }
          }}
          onDoubleClick={() => void engine.toggleFullscreen()}
          {...engine.videoEventHandlers}
          crossOrigin="anonymous"
          playsInline
          className="w-full h-full object-contain bg-black cursor-pointer"
        >
          {engine.activeSubUrl !== 'off' && (
            <track
              key={engine.activeSubUrl}
              kind="subtitles"
              src={`/api/fx/subtitle-proxy?url=${encodeURIComponent(engine.activeSubUrl)}`}
              default
            />
          )}
        </video>
      )}

      {/* Top Back Bar */}
      <div
        className={`absolute top-0 inset-x-0 z-30 px-4 sm:px-8 py-5 bg-gradient-to-b from-black/90 via-black/45 to-transparent flex items-center justify-between gap-4 transition-opacity duration-200 ${
          engine.hudVisible || !engine.playing || engine.effectiveMode === 'embed'
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={engine.closePlayer}
          className="inline-flex items-center gap-2 text-white hover:text-[#e50914] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="font-semibold text-sm hidden sm:inline">Back to Browse</span>
        </button>

        <div className="text-center min-w-0 flex-1 pointer-events-none">
          <p className="font-cinema text-2xl sm:text-3xl tracking-wider uppercase text-white truncate">
            {target.title}
          </p>
          {(target.subtitle || engine.resumedFrom !== null) && (
            <p className="text-xs text-neutral-300 truncate tabular-nums">
              {[
                target.subtitle,
                engine.resumedFrom !== null
                  ? `Resumed at ${formatTimecode(engine.resumedFrom)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {target.provider === 'moviebox' && (
            <button
              type="button"
              onClick={() => void engine.handleDownload()}
              disabled={engine.downloading}
              aria-label="Download MP4"
              className="h-9 px-3 rounded bg-black/70 border border-white/25 text-xs text-white hover:border-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              {engine.downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">Save</span>
            </button>
          )}
        </div>
      </div>

      {/* Center Buffering Indicator */}
      {engine.buffering && !engine.loadingStream && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#e50914]" />
        </div>
      )}

      {/* Theatrical Up-Next Card */}
      {engine.autoNextCountdown !== null && target.onNextEpisode && (
        <div className="absolute bottom-28 right-6 z-40 w-80 rounded-lg bg-[#141414]/95 border border-white/15 p-4 space-y-3 shadow-2xl">
          <div className="flex items-center gap-3">
            <img
              src={target.poster || FALLBACK_ART.cinemaHero}
              alt={target.title}
              className="w-16 aspect-video rounded object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 tabular-nums">
                Next Episode in {engine.autoNextCountdown}s
              </p>
              <p className="font-cinema text-xl tracking-wide text-white truncate">
                Episode {(target.episode || 1) + 1}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                engine.clearAutoNextTimer();
                target.onNextEpisode?.();
              }}
              className="flex-1 h-9 rounded bg-white text-black hover:bg-neutral-200 font-bold text-xs cursor-pointer"
            >
              Play Next Episode
            </button>
            <button
              type="button"
              onClick={engine.clearAutoNextTimer}
              className="h-9 px-3 rounded bg-neutral-800 text-xs text-white hover:bg-neutral-700 cursor-pointer"
            >
              Watch Credits
            </button>
          </div>
        </div>
      )}

      {/* Theater Bottom Scrubber & Controls */}
      {engine.effectiveMode !== 'embed' && !engine.loadingStream && !engine.streamError && (
        <div
          className={`absolute bottom-0 inset-x-0 z-30 px-4 sm:px-8 pb-5 pt-14 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-200 ${
            engine.hudVisible || !engine.playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Giant Crimson Progress Bar */}
          {target.mediaType !== 'live' && (
            <div className="flex items-center gap-3 mb-3">
              <input
                type="range"
                aria-label="Seek timeline"
                min={0}
                max={engine.duration || 100}
                step={0.5}
                value={Math.min(engine.currentTime, engine.duration || 100)}
                onChange={(e) => engine.seekTo(Number(e.target.value))}
                className="flex-1 accent-[#e50914] h-1.5 cursor-pointer"
              />
              <span className="font-mono text-xs text-neutral-200 tabular-nums shrink-0">
                {formatTimecode(engine.currentTime)} / {formatTimecode(engine.duration)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            {/* Left Transport Cluster */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={engine.togglePlay}
                aria-label={engine.playing ? 'Pause' : 'Play'}
                className="w-10 h-10 flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer"
              >
                {engine.playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-current" />}
              </button>

              {target.mediaType !== 'live' && (
                <>
                  <button
                    type="button"
                    onClick={() => engine.skipBy(-10)}
                    aria-label="Rewind 10s"
                    className="w-9 h-9 flex items-center justify-center text-neutral-200 hover:text-white cursor-pointer"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => engine.skipBy(10)}
                    aria-label="Forward 10s"
                    className="w-9 h-9 flex items-center justify-center text-neutral-200 hover:text-white cursor-pointer"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                </>
              )}

              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={engine.toggleMute}
                  aria-label={engine.muted ? 'Unmute' : 'Mute'}
                  className="w-9 h-9 flex items-center justify-center text-neutral-200 hover:text-white cursor-pointer"
                >
                  {engine.muted || engine.volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  aria-label="Volume"
                  min={0}
                  max={1}
                  step={0.05}
                  value={engine.muted ? 0 : engine.volume}
                  onChange={(e) => engine.changeVolume(Number(e.target.value))}
                  className="w-20 accent-[#e50914] h-1 cursor-pointer"
                />
              </div>

              {target.hasNextEpisode && target.onNextEpisode && (
                <button
                  type="button"
                  onClick={() => {
                    engine.persistCurrentProgress(true);
                    target.onNextEpisode?.();
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 text-xs font-semibold text-white cursor-pointer"
                >
                  <span>Next Episode</span>
                  <SkipForward className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Right Popover Controls */}
            <div className="flex items-center gap-2 sm:gap-3 relative">
              {engine.hasEpisodesList && (
                <button
                  type="button"
                  onClick={() => {
                    setPopover('none');
                    setEpisodesOpen((o) => !o);
                  }}
                  aria-label="Episodes"
                  className="h-9 px-2.5 rounded hover:bg-white/10 text-white inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                >
                  <ListVideo className="w-5 h-5" />
                  <span className="hidden md:inline">Episodes</span>
                </button>
              )}

              {(engine.subtitles.length > 0 || engine.hasAudioOptions) && (
                <button
                  type="button"
                  onClick={() => {
                    setEpisodesOpen(false);
                    setPopover((p) => (p === 'tracks' ? 'none' : 'tracks'));
                  }}
                  aria-label="Audio & Subtitles"
                  className={`h-9 px-2.5 rounded hover:bg-white/10 inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                    engine.activeSubUrl !== 'off' ? 'text-[#e50914]' : 'text-white'
                  }`}
                >
                  <Captions className="w-5 h-5" />
                  <span className="hidden md:inline">Audio & Subtitles</span>
                </button>
              )}

              {target.mediaType !== 'live' && (
                <button
                  type="button"
                  onClick={() => {
                    setEpisodesOpen(false);
                    setPopover((p) => (p === 'speed' ? 'none' : 'speed'));
                  }}
                  aria-label="Speed"
                  className="h-9 px-2.5 rounded hover:bg-white/10 text-white inline-flex items-center gap-1 text-xs font-mono cursor-pointer"
                >
                  <Gauge className="w-4 h-4" />
                  <span>{engine.playbackRate}x</span>
                </button>
              )}

              {(target.provider === 'moviebox' || engine.hlsLevels.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setEpisodesOpen(false);
                    setPopover((p) => (p === 'quality' ? 'none' : 'quality'));
                  }}
                  aria-label="Video Quality"
                  className="h-9 px-2.5 rounded hover:bg-white/10 text-white inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  <span>
                    {target.provider === 'moviebox'
                      ? `${engine.resolution}p`
                      : engine.activeHlsLevel === -1
                        ? 'Auto'
                        : engine.hlsLevels.find((l) => l.index === engine.activeHlsLevel)?.label || 'Auto'}
                  </span>
                </button>
              )}

              {engine.pipSupported && (
                <button
                  type="button"
                  onClick={() => void engine.togglePip()}
                  aria-label="Picture in Picture"
                  className={`w-9 h-9 hidden sm:flex items-center justify-center rounded hover:bg-white/10 cursor-pointer ${
                    engine.isPipActive ? 'text-[#e50914]' : 'text-white'
                  }`}
                >
                  <PictureInPicture2 className="w-5 h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => void engine.toggleFullscreen()}
                aria-label={engine.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                className="w-9 h-9 flex items-center justify-center rounded hover:bg-white/10 text-white cursor-pointer"
              >
                {engine.isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>

              {/* Netflix Dual-Column Audio & Subtitles Popover */}
              {popover === 'tracks' && (
                <div className="absolute bottom-12 right-0 w-[340px] max-w-[90vw] rounded-lg bg-[#181818] border border-white/15 p-4 grid grid-cols-2 gap-4 shadow-2xl z-40">
                  <div>
                    <p className="font-cinema text-lg tracking-wide text-white uppercase mb-2">
                      Audio
                    </p>
                    <div className="space-y-1 max-h-52 overflow-y-auto">
                      {engine.hlsAudioTracks.length > 1 ? (
                        engine.hlsAudioTracks.map((tr) => (
                          <button
                            key={tr.id}
                            type="button"
                            onClick={() => engine.changeHlsAudio(tr.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer ${
                              engine.activeHlsAudio === tr.id
                                ? 'text-white font-semibold bg-white/10'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            {engine.activeHlsAudio === tr.id && (
                              <Check className="w-3.5 h-3.5 text-[#e50914] shrink-0" />
                            )}
                            <span className="truncate">{tr.name}</span>
                          </button>
                        ))
                      ) : target.availableLanguages && target.availableLanguages.length > 1 ? (
                        target.availableLanguages.map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => engine.changeMovieBoxAudio(lang)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs uppercase flex items-center gap-1.5 cursor-pointer ${
                              engine.audioLang === lang
                                ? 'text-white font-semibold bg-white/10'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            {engine.audioLang === lang && (
                              <Check className="w-3.5 h-3.5 text-[#e50914] shrink-0" />
                            )}
                            <span>{lang}</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-neutral-400 px-2 py-1">Original</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="font-cinema text-lg tracking-wide text-white uppercase mb-2">
                      Subtitles
                    </p>
                    <div className="space-y-1 max-h-52 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => engine.setActiveSubUrl('off')}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer ${
                          engine.activeSubUrl === 'off'
                            ? 'text-white font-semibold bg-white/10'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {engine.activeSubUrl === 'off' && (
                          <Check className="w-3.5 h-3.5 text-[#e50914] shrink-0" />
                        )}
                        <span>Off</span>
                      </button>
                      {engine.subtitles.map((sub, idx) => (
                        <button
                          key={`${sub.url}-${idx}`}
                          type="button"
                          onClick={() => engine.setActiveSubUrl(sub.url)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer ${
                            engine.activeSubUrl === sub.url
                              ? 'text-white font-semibold bg-white/10'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {engine.activeSubUrl === sub.url && (
                            <Check className="w-3.5 h-3.5 text-[#e50914] shrink-0" />
                          )}
                          <span className="truncate">
                            {sub.label || sub.lang || `Track ${idx + 1}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {popover === 'quality' && (
                <div className="absolute bottom-12 right-0 w-48 rounded-lg bg-[#181818] border border-white/15 p-2 space-y-1 shadow-2xl z-40">
                  {target.provider === 'moviebox'
                    ? PLAYER_RESOLUTIONS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            engine.changeMovieBoxQuality(q);
                            setPopover('none');
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded text-xs cursor-pointer ${
                            engine.resolution === q
                              ? 'bg-[#e50914] text-white font-semibold'
                              : 'text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          {q}p
                        </button>
                      ))
                    : [{ index: -1, label: 'Auto' }, ...engine.hlsLevels].map((lvl) => (
                        <button
                          key={lvl.index}
                          type="button"
                          onClick={() => {
                            engine.changeHlsLevel(lvl.index);
                            setPopover('none');
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded text-xs cursor-pointer ${
                            engine.activeHlsLevel === lvl.index
                              ? 'bg-[#e50914] text-white font-semibold'
                              : 'text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      ))}
                </div>
              )}

              {popover === 'speed' && (
                <div className="absolute bottom-12 right-0 w-36 rounded-lg bg-[#181818] border border-white/15 p-2 space-y-1 shadow-2xl z-40">
                  {PLAYER_SPEEDS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        engine.changeSpeed(spd);
                        setPopover('none');
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded text-xs font-mono cursor-pointer ${
                        engine.playbackRate === spd
                          ? 'bg-[#e50914] text-white font-semibold'
                          : 'text-neutral-300 hover:bg-white/10'
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
      )}

      {/* Theatrical Episodes Slide-Over Drawer */}
      {episodesOpen && engine.hasEpisodesList && (
        <div className="absolute inset-y-0 right-0 z-40 w-96 max-w-full bg-[#141414]/95 border-l border-white/10 p-5 flex flex-col gap-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="font-cinema text-2xl tracking-wide uppercase text-white">
              {target.season ? `Season ${target.season}` : 'Episodes'}
            </h3>
            <button
              type="button"
              onClick={() => setEpisodesOpen(false)}
              className="w-8 h-8 rounded-full bg-neutral-800 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {target.episodes!.map((ep) => {
              const isCurrent = ep.episode === target.episode;
              const prog = engine.getWatchProgress(
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
                    engine.persistCurrentProgress(true);
                    setEpisodesOpen(false);
                    target.onSelectEpisode?.(ep);
                  }}
                  className={`w-full p-2.5 rounded-md flex items-center gap-3 text-left cursor-pointer border ${
                    isCurrent
                      ? 'bg-[#262626] border-[#e50914] text-white'
                      : 'bg-[#1a1a1a] border-transparent hover:bg-[#222] text-neutral-300'
                  }`}
                >
                  <span className="font-cinema text-xl text-neutral-400 w-6 text-center shrink-0 tabular-nums">
                    {ep.episode}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {ep.title || `Episode ${ep.episode}`}
                    </p>
                    {ep.duration && (
                      <p className="text-[10px] text-neutral-400">{ep.duration}</p>
                    )}
                  </div>
                  {isWatched && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
