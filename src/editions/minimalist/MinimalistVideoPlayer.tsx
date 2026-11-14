import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Subtitles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatTimecode } from '../../lib/mediaUtils';
import {
  PLAYER_RESOLUTIONS,
  PLAYER_SPEEDS,
  useVideoPlayerEngine,
} from '../../hooks/useVideoPlayerEngine';
import type { ActivePlaybackTarget } from '../../types/framex';

interface MinimalistVideoPlayerProps {
  target: ActivePlaybackTarget | null;
  onClose: () => void;
}

export function MinimalistVideoPlayer({ target, onClose }: MinimalistVideoPlayerProps) {
  const {
    containerRef,
    videoRef,
    streamUrl,
    embedUrl,
    effectiveMode,
    loadingStream,
    streamError,
    resolution,
    subtitles,
    activeSubUrl,
    setActiveSubUrl,
    playing,
    buffering,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    isFullscreen,
    pipSupported,
    autoNextCountdown,
    downloading,
    hasEpisodesList,
    clearAutoNextTimer,
    fetchAndLoadPlayback,
    togglePlay,
    toggleFullscreen,
    togglePip,
    handleDownload,
    closePlayer,
    seekTo,
    skipBy,
    changeVolume,
    toggleMute,
    changeSpeed,
    changeMovieBoxQuality,
    videoEventHandlers,
  } = useVideoPlayerEngine(target, onClose);

  const [subsOpen, setSubsOpen] = useState(false);

  if (!target) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-white text-neutral-900 flex flex-col overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${target.title}`}
    >
      {/* Ultra-Clean Top Header */}
      <header className="h-14 border-b border-neutral-200 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={closePlayer}
            className="h-9 px-3 rounded-md border border-neutral-200 hover:border-neutral-950 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div className="min-w-0">
            <h2 className="font-minimal text-sm sm:text-base font-semibold text-neutral-950 truncate">
              {target.title}
            </h2>
            {target.subtitle && (
              <p className="font-mono text-[11px] text-neutral-500 truncate">{target.subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {target.provider === 'moviebox' && effectiveMode !== 'embed' && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="h-9 px-3 rounded-md border border-neutral-200 hover:border-neutral-950 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      </header>

      {/* Studio Screening Container */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={hasEpisodesList ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
          <div className="relative aspect-video w-full bg-[#0B0B0B] rounded-lg overflow-hidden border border-neutral-200 shadow-sm">
            {loadingStream && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
                <span className="font-mono text-xs text-neutral-300">Loading stream…</span>
              </div>
            )}

            {streamError && !loadingStream && (
              <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
                <div className="max-w-sm bg-white border border-neutral-200 rounded-lg p-5 text-center space-y-3">
                  <AlertCircle className="w-7 h-7 text-[#2563EB] mx-auto" />
                  <p className="text-sm font-medium text-neutral-900">{streamError}</p>
                  <button
                    type="button"
                    onClick={() => void fetchAndLoadPlayback(false)}
                    className="h-9 px-4 rounded-md bg-neutral-950 text-white text-xs font-medium cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {effectiveMode === 'embed' && embedUrl && (
              <iframe
                src={embedUrl}
                title={target.title}
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            )}

            {effectiveMode !== 'embed' && streamUrl && (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  crossOrigin="anonymous"
                  onClick={togglePlay}
                  {...videoEventHandlers}
                  className="w-full h-full object-contain cursor-pointer"
                >
                  {subtitles.map((sub) => (
                    <track
                      key={sub.url}
                      kind="subtitles"
                      label={sub.label || sub.lang || 'Subtitle'}
                      srcLang={sub.lang || 'en'}
                      src={sub.url}
                      default={activeSubUrl === sub.url}
                    />
                  ))}
                </video>

                {buffering && !loadingStream && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Loader2 className="w-10 h-10 animate-spin text-white" />
                  </div>
                )}

                {autoNextCountdown !== null && target.onNextEpisode && (
                  <div className="absolute bottom-4 right-4 bg-white border border-neutral-200 rounded-lg p-4 space-y-2 shadow-xl">
                    <p className="text-sm font-medium text-neutral-950">
                      Next episode in {autoNextCountdown}s
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={clearAutoNextTimer}
                        className="px-3 py-1 rounded-md border border-neutral-300 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearAutoNextTimer();
                          target.onNextEpisode?.();
                        }}
                        className="px-3 py-1 rounded-md bg-neutral-950 text-white text-xs font-medium cursor-pointer"
                      >
                        Play Now
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Crisp Monochrome Studio Controls */}
          {effectiveMode !== 'embed' && (
            <div className="bg-[#FAFAFA] border border-neutral-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-neutral-600 w-12 tabular-nums">
                  {formatTimecode(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={Math.min(currentTime, duration || 100)}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  aria-label="Seek timeline"
                  className="flex-1 h-1.5 accent-[#2563EB] cursor-pointer"
                />
                <span className="font-mono text-xs text-neutral-600 w-12 text-right tabular-nums">
                  {formatTimecode(duration)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="h-9 px-4 rounded-md bg-neutral-950 hover:bg-[#2563EB] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{playing ? 'Pause' : 'Play'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => skipBy(-10)}
                    aria-label="Back 10s"
                    className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white hover:border-neutral-900 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => skipBy(10)}
                    aria-label="Forward 10s"
                    className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white hover:border-neutral-900 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label="Mute"
                    className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white hover:border-neutral-900 cursor-pointer"
                  >
                    {muted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    aria-label="Volume"
                    className="hidden sm:block w-20 h-1 accent-[#2563EB]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 relative">
                  {target.provider === 'moviebox' && (
                    <select
                      aria-label="Quality"
                      value={resolution}
                      onChange={(e) => changeMovieBoxQuality(e.target.value)}
                      className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-xs font-mono"
                    >
                      {PLAYER_RESOLUTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}p
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    aria-label="Speed"
                    value={playbackRate}
                    onChange={(e) => changeSpeed(Number(e.target.value))}
                    className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-xs font-mono"
                  >
                    {PLAYER_SPEEDS.map((s) => (
                      <option key={s} value={s}>
                        {s}x
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setSubsOpen((v) => !v)}
                    className={`h-9 px-3 rounded-md border text-xs inline-flex items-center gap-1 cursor-pointer ${
                      activeSubUrl !== 'off'
                        ? 'border-[#2563EB] bg-[#2563EB] text-white'
                        : 'border-neutral-200 bg-white text-neutral-900'
                    }`}
                  >
                    <Subtitles className="w-3.5 h-3.5" />
                    <span>CC</span>
                  </button>

                  {subsOpen && (
                    <div className="absolute right-0 bottom-11 w-52 bg-white border border-neutral-200 rounded-lg shadow-xl p-1.5 z-30 max-h-56 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSubUrl('off');
                          setSubsOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-neutral-100 cursor-pointer"
                      >
                        Off
                      </button>
                      {subtitles.map((sub) => (
                        <button
                          key={sub.url}
                          type="button"
                          onClick={() => {
                            setActiveSubUrl(sub.url);
                            setSubsOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-neutral-100 cursor-pointer ${
                            activeSubUrl === sub.url ? 'font-semibold text-[#2563EB]' : ''
                          }`}
                        >
                          {sub.label || sub.lang || 'Track'}
                        </button>
                      ))}
                    </div>
                  )}

                  {pipSupported && (
                    <button
                      type="button"
                      onClick={() => void togglePip()}
                      aria-label="Picture in Picture"
                      className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white hover:border-neutral-900 cursor-pointer"
                    >
                      <PictureInPicture2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void toggleFullscreen()}
                    aria-label="Fullscreen"
                    className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white hover:border-neutral-900 cursor-pointer"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {hasEpisodesList && target.episodes && (
          <aside className="lg:col-span-4 border border-neutral-200 rounded-lg bg-[#FAFAFA] p-4 space-y-3 max-h-[580px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
              <h3 className="font-minimal text-sm font-semibold text-neutral-950">Episodes</h3>
              {target.hasNextEpisode && target.onNextEpisode && (
                <button
                  type="button"
                  onClick={target.onNextEpisode}
                  className="text-xs font-medium text-[#2563EB] inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="divide-y divide-neutral-200">
              {target.episodes.map((ep) => {
                const active = ep.episode === target.episode;
                return (
                  <button
                    key={ep.episode}
                    type="button"
                    onClick={() => target.onSelectEpisode?.(ep)}
                    className={`w-full py-2.5 px-2.5 rounded text-left flex items-center justify-between gap-2 cursor-pointer ${
                      active ? 'bg-white font-semibold border border-neutral-200' : 'hover:bg-white'
                    }`}
                  >
                    <span className="font-mono text-xs text-[#2563EB] shrink-0 tabular-nums">
                      E{String(ep.episode).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-neutral-900 truncate flex-1">
                      {ep.title || `Episode ${ep.episode}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
