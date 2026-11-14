import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Download,
  List,
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

export function NeonVideoPlayer({
  target,
  onClose,
}: {
  target: ActivePlaybackTarget | null;
  onClose: () => void;
}) {
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

  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showSubs, setShowSubs] = useState(false);

  if (!target) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#03050d] text-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${target.title}`}
    >
      {/* Top HUD Bar */}
      <header className="h-14 px-4 sm:px-6 border-b border-cyan-500/25 bg-[#050814]/95 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={closePlayer}
            className="h-9 px-3 rounded-md border border-cyan-400/35 text-[#00f0ff] hover:border-[#ff2bd6] text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Deck</span>
          </button>
          <div className="min-w-0">
            <h2 className="font-neon text-xl uppercase tracking-wide text-white truncate">
              {target.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {target.provider === 'moviebox' && effectiveMode !== 'embed' && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="h-9 px-3 rounded-md border border-cyan-500/30 text-xs font-mono text-cyan-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
          {hasEpisodesList && (
            <button
              type="button"
              onClick={() => setShowEpisodes((v) => !v)}
              className={`h-9 px-3 rounded-md border text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer ${
                showEpisodes
                  ? 'border-[#ff2bd6] bg-[#ff2bd6]/20 text-[#ff8ef0]'
                  : 'border-cyan-500/30 text-cyan-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Episodes</span>
            </button>
          )}
        </div>
      </header>

      {/* Stage */}
      <div className="flex-1 min-h-0 flex relative">
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {loadingStream && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#00f0ff]" />
              <span className="font-mono text-xs text-cyan-200">Connecting stream…</span>
            </div>
          )}

          {streamError && !loadingStream && (
            <div className="z-20 max-w-sm neon-panel rounded-lg p-6 text-center space-y-3">
              <AlertCircle className="w-7 h-7 text-[#ff2bd6] mx-auto" />
              <p className="text-sm text-sky-100">{streamError}</p>
              <button
                type="button"
                onClick={() => void fetchAndLoadPlayback(false)}
                className="neon-glow-btn h-9 px-4 rounded-md text-xs font-bold cursor-pointer"
              >
                Retry Stream
              </button>
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
                  <Loader2 className="w-10 h-10 animate-spin text-[#00f0ff]" />
                </div>
              )}

              {autoNextCountdown !== null && target.onNextEpisode && (
                <div className="absolute bottom-4 right-4 neon-panel rounded-lg p-4 space-y-2 z-20">
                  <p className="font-mono text-xs text-[#00f0ff]">
                    Next Episode in {autoNextCountdown}s
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={clearAutoNextTimer}
                      className="px-3 py-1 rounded border border-cyan-500/30 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearAutoNextTimer();
                        target.onNextEpisode?.();
                      }}
                      className="neon-glow-btn px-3 py-1 rounded text-xs font-bold cursor-pointer"
                    >
                      Play Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {showEpisodes && hasEpisodesList && target.episodes && (
          <aside className="w-72 border-l border-cyan-500/25 bg-[#050814] p-3 overflow-y-auto shrink-0 space-y-2">
            <p className="font-mono text-xs text-[#00f0ff] uppercase px-1">Episode Matrix</p>
            {target.episodes.map((ep) => {
              const active = ep.episode === target.episode;
              return (
                <button
                  key={ep.episode}
                  type="button"
                  onClick={() => target.onSelectEpisode?.(ep)}
                  className={`w-full p-2.5 rounded-md border text-left cursor-pointer ${
                    active
                      ? 'bg-[#0c1631] border-[#00f0ff] text-white'
                      : 'bg-[#03050d] border-cyan-500/20 text-slate-300 hover:border-cyan-400'
                  }`}
                >
                  <p className="font-mono text-[11px] text-[#ff2bd6]">EP {ep.episode}</p>
                  <p className="text-xs truncate">{ep.title || `Episode ${ep.episode}`}</p>
                </button>
              );
            })}
          </aside>
        )}
      </div>

      {/* Bottom Neon Transport Deck */}
      {effectiveMode !== 'embed' && (
        <footer className="border-t border-cyan-500/25 bg-[#050814]/95 px-4 sm:px-6 py-3 space-y-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#00f0ff] tabular-nums">
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
              className="flex-1 h-1.5 accent-[#00f0ff] cursor-pointer"
            />
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {formatTimecode(duration)}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="neon-glow-btn h-9 px-4 rounded-md text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{playing ? 'Pause' : 'Play'}</span>
              </button>
              <button
                type="button"
                onClick={() => skipBy(-10)}
                aria-label="Rewind 10s"
                className="h-9 px-2.5 rounded-md border border-cyan-500/30 text-cyan-200 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => skipBy(10)}
                aria-label="Forward 10s"
                className="h-9 px-2.5 rounded-md border border-cyan-500/30 text-cyan-200 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={toggleMute}
                aria-label="Toggle Mute"
                className="h-9 px-2.5 rounded-md border border-cyan-500/30 text-cyan-200 cursor-pointer"
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
                className="hidden sm:block w-20 h-1 accent-[#ff2bd6]"
              />
            </div>

            <div className="flex items-center gap-2 relative">
              {target.provider === 'moviebox' && (
                <select
                  aria-label="Resolution"
                  value={resolution}
                  onChange={(e) => changeMovieBoxQuality(e.target.value)}
                  className="h-9 px-2 rounded-md bg-[#03050d] border border-cyan-500/30 text-xs font-mono text-cyan-100"
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
                className="h-9 px-2 rounded-md bg-[#03050d] border border-cyan-500/30 text-xs font-mono text-cyan-100"
              >
                {PLAYER_SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}x
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowSubs((v) => !v)}
                className={`h-9 px-3 rounded-md border text-xs font-mono inline-flex items-center gap-1 cursor-pointer ${
                  activeSubUrl !== 'off'
                    ? 'border-[#00f0ff] bg-[#00f0ff]/15 text-[#00f0ff]'
                    : 'border-cyan-500/30 text-cyan-100'
                }`}
              >
                <Subtitles className="w-3.5 h-3.5" />
                <span>Subs</span>
              </button>

              {showSubs && (
                <div className="absolute right-0 bottom-11 w-52 neon-panel rounded-md p-1.5 z-30 max-h-56 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubUrl('off');
                      setShowSubs(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-cyan-500/15 rounded cursor-pointer"
                  >
                    Off
                  </button>
                  {subtitles.map((sub) => (
                    <button
                      key={sub.url}
                      type="button"
                      onClick={() => {
                        setActiveSubUrl(sub.url);
                        setShowSubs(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-cyan-500/15 rounded cursor-pointer ${
                        activeSubUrl === sub.url ? 'text-[#00f0ff] font-bold' : ''
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
                  className="h-9 px-2.5 rounded-md border border-cyan-500/30 text-cyan-200 cursor-pointer"
                >
                  <PictureInPicture2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                aria-label="Fullscreen"
                className="h-9 px-2.5 rounded-md border border-cyan-500/30 text-cyan-200 cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5" />
                ) : (
                  <Maximize className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
