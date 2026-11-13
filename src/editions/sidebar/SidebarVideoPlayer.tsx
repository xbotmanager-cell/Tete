import { useState } from 'react';
import {
  AlertCircle,
  Captions,
  CheckCircle2,
  Download,
  Loader2,
  Maximize,
  Minimize,
  PanelRight,
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
import { formatTimecode } from '../../lib/mediaUtils';
import {
  PLAYER_RESOLUTIONS,
  PLAYER_SPEEDS,
  useVideoPlayerEngine,
} from '../../hooks/useVideoPlayerEngine';
import type { ActivePlaybackTarget } from '../../types/framex';

interface SidebarVideoPlayerProps {
  target: ActivePlaybackTarget | null;
  onClose: () => void;
}

export function SidebarVideoPlayer({ target, onClose }: SidebarVideoPlayerProps) {
  const engine = useVideoPlayerEngine(target, onClose);
  const [inspectorOpen, setInspectorOpen] = useState(Boolean(target?.episodes?.length));
  const [menu, setMenu] = useState<'none' | 'quality' | 'subtitles' | 'audio' | 'speed'>('none');

  if (!target) return null;

  return (
    <div
      ref={engine.containerRef}
      onMouseMove={() => engine.wakeHud(menu !== 'none' || inspectorOpen)}
      onTouchStart={() => engine.wakeHud(menu !== 'none' || inspectorOpen)}
      className="fixed inset-0 z-50 bg-[#09090b] flex flex-col select-none overflow-hidden font-console-body"
      role="dialog"
      aria-modal="true"
      aria-label={`Studio Console Playing ${target.title}`}
    >
      {/* Top Studio Console Header */}
      <header className="h-13 px-4 border-b border-zinc-800 bg-[#0c0c0f] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-cyan-400 shrink-0">
            {target.provider} · {engine.effectiveMode}
          </span>
          <h2 className="font-console text-sm sm:text-base font-semibold text-white truncate">
            {target.title}
          </h2>
          {target.subtitle && (
            <span className="hidden md:inline font-mono text-xs text-zinc-400 truncate">
              / {target.subtitle}
            </span>
          )}
          {engine.resumedFrom !== null && (
            <span className="hidden lg:inline font-mono text-[11px] text-cyan-300 tabular-nums">
              @{formatTimecode(engine.resumedFrom)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {target.provider === 'moviebox' && (
            <button
              type="button"
              onClick={() => void engine.handleDownload()}
              disabled={engine.downloading}
              className="h-8 px-2.5 rounded border border-zinc-800 bg-zinc-900 hover:border-zinc-600 text-xs text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {engine.downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setInspectorOpen((v) => !v)}
            className={`h-8 px-2.5 rounded border text-xs inline-flex items-center gap-1.5 cursor-pointer ${
              inspectorOpen
                ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300'
            }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Stream Panel</span>
          </button>
          <button
            type="button"
            onClick={engine.closePlayer}
            aria-label="Close studio player"
            className="h-8 px-2.5 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 inline-flex items-center gap-1 cursor-pointer"
          >
            <span className="hidden sm:inline">ESC</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Split Studio Area */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Video Viewport */}
        <div className="flex-1 min-w-0 bg-black relative flex flex-col justify-center">
          {engine.loadingStream ? (
            <div className="flex flex-col items-center gap-2.5 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="font-mono text-xs uppercase tracking-wider">
                Connecting Stream…
              </span>
            </div>
          ) : engine.streamError ? (
            <div className="max-w-md mx-auto p-6 rounded-lg bg-[#0c0c0f] border border-zinc-800 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="font-console text-base font-semibold text-white">Stream Error</p>
              <p className="text-xs text-zinc-400">{engine.streamError}</p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void engine.fetchAndLoadPlayback(false)}
                  className="h-8 px-3 rounded bg-white text-black text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={engine.closePlayer}
                  className="h-8 px-3 rounded border border-zinc-700 text-xs text-zinc-200 cursor-pointer"
                >
                  Close
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
            <>
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

              {engine.buffering && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="px-3.5 py-2 rounded-md bg-zinc-950/90 border border-zinc-800 flex items-center gap-2 font-mono text-xs text-zinc-200">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>BUFFERING</span>
                  </div>
                </div>
              )}

              {engine.autoNextCountdown !== null && target.onNextEpisode && (
                <div className="absolute bottom-20 right-4 z-30 w-64 rounded-lg bg-[#0c0c0f] border border-cyan-500/40 p-3.5 space-y-2.5 shadow-2xl">
                  <p className="font-mono text-[11px] text-cyan-400 tabular-nums">
                    AUTO_NEXT IN {engine.autoNextCountdown}S
                  </p>
                  <p className="font-console text-sm font-semibold text-white">
                    Episode {(target.episode || 1) + 1}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        engine.clearAutoNextTimer();
                        target.onNextEpisode?.();
                      }}
                      className="flex-1 h-8 rounded bg-white text-black text-xs font-semibold cursor-pointer"
                    >
                      Play Now
                    </button>
                    <button
                      type="button"
                      onClick={engine.clearAutoNextTimer}
                      className="h-8 px-2.5 rounded border border-zinc-700 text-xs text-zinc-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Docked Studio Stream & Episodes Inspector */}
        {inspectorOpen && (
          <aside className="absolute md:static inset-y-0 right-0 z-30 w-80 max-w-full bg-[#0c0c0f] border-l border-zinc-800 flex flex-col">
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Stream & Episodes
              </span>
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                className="w-7 h-7 rounded border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer md:hidden"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 border-b border-zinc-800 grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 block">QUALITY</span>
                <span className="text-zinc-100">
                  {target.provider === 'moviebox' ? `${engine.resolution}p` : 'HLS Auto'}
                </span>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 block">SPEED</span>
                <span className="text-cyan-400">{engine.playbackRate}x</span>
              </div>
            </div>

            {engine.hasEpisodesList ? (
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/70">
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
                        target.onSelectEpisode?.(ep);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 cursor-pointer ${
                        isCurrent ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-900/50 text-zinc-300'
                      }`}
                    >
                      <span
                        className={`font-mono text-[11px] w-7 shrink-0 tabular-nums ${
                          isCurrent ? 'text-cyan-400 font-bold' : 'text-zinc-500'
                        }`}
                      >
                        E{String(ep.episode).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {ep.title || `Episode ${ep.episode}`}
                        </p>
                        {ep.duration && (
                          <p className="font-mono text-[10px] text-zinc-500">{ep.duration}</p>
                        )}
                      </div>
                      {isWatched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-xs text-zinc-500 font-mono">
                Single Feature Stream · No episode index.
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Docked Precision Transport Bar */}
      {engine.effectiveMode !== 'embed' && !engine.loadingStream && !engine.streamError && (
        <footer className="border-t border-zinc-800 bg-[#0c0c0f] px-4 py-2.5 space-y-2 shrink-0 relative">
          {target.mediaType !== 'live' && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-cyan-400 tabular-nums w-12">
                {formatTimecode(engine.currentTime)}
              </span>
              <input
                type="range"
                aria-label="Seek position"
                min={0}
                max={engine.duration || 100}
                step={0.5}
                value={Math.min(engine.currentTime, engine.duration || 100)}
                onChange={(e) => engine.seekTo(Number(e.target.value))}
                className="flex-1 accent-cyan-400 h-1.5 cursor-pointer"
              />
              <span className="font-mono text-[11px] text-zinc-400 tabular-nums w-12 text-right">
                {formatTimecode(engine.duration)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={engine.togglePlay}
                aria-label={engine.playing ? 'Pause' : 'Play'}
                className="w-9 h-9 rounded bg-white text-black hover:bg-cyan-300 flex items-center justify-center cursor-pointer"
              >
                {engine.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              {target.mediaType !== 'live' && (
                <>
                  <button
                    type="button"
                    onClick={() => engine.skipBy(-10)}
                    aria-label="Rewind 10 seconds"
                    className="w-8 h-8 rounded border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => engine.skipBy(10)}
                    aria-label="Forward 10 seconds"
                    className="w-8 h-8 rounded border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {target.hasPrevEpisode && target.onPrevEpisode && (
                <button
                  type="button"
                  onClick={() => {
                    engine.persistCurrentProgress(true);
                    target.onPrevEpisode?.();
                  }}
                  aria-label="Previous Episode"
                  className="w-8 h-8 rounded border border-zinc-800 text-zinc-300 hover:text-white hidden sm:flex items-center justify-center cursor-pointer"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
              )}
              {target.hasNextEpisode && target.onNextEpisode && (
                <button
                  type="button"
                  onClick={() => {
                    engine.persistCurrentProgress(true);
                    target.onNextEpisode?.();
                  }}
                  className="h-8 px-2.5 rounded border border-zinc-800 text-xs font-mono text-zinc-200 hover:text-white hidden sm:inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>NEXT</span>
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="hidden md:flex items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={engine.toggleMute}
                  aria-label={engine.muted ? 'Unmute' : 'Mute'}
                  className="w-8 h-8 rounded border border-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
                >
                  {engine.muted || engine.volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
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
                  className="w-16 accent-cyan-400 h-1 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 relative">
              {engine.subtitles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMenu((m) => (m === 'subtitles' ? 'none' : 'subtitles'))}
                  className={`h-8 px-2.5 rounded border text-xs font-mono inline-flex items-center gap-1 cursor-pointer ${
                    engine.activeSubUrl !== 'off'
                      ? 'border-cyan-500/50 text-cyan-300'
                      : 'border-zinc-800 text-zinc-300'
                  }`}
                >
                  <Captions className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">CC</span>
                </button>
              )}
              {engine.hasAudioOptions && (
                <button
                  type="button"
                  onClick={() => setMenu((m) => (m === 'audio' ? 'none' : 'audio'))}
                  className="h-8 px-2.5 rounded border border-zinc-800 text-xs font-mono text-zinc-300 cursor-pointer"
                >
                  AUDIO
                </button>
              )}
              {(target.provider === 'moviebox' || engine.hlsLevels.length > 0) && (
                <button
                  type="button"
                  onClick={() => setMenu((m) => (m === 'quality' ? 'none' : 'quality'))}
                  className="h-8 px-2.5 rounded border border-zinc-800 text-xs font-mono text-zinc-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>
                    {target.provider === 'moviebox'
                      ? `${engine.resolution}p`
                      : engine.activeHlsLevel === -1
                        ? 'AUTO'
                        : engine.hlsLevels.find((l) => l.index === engine.activeHlsLevel)?.label || 'AUTO'}
                  </span>
                </button>
              )}
              {target.mediaType !== 'live' && (
                <button
                  type="button"
                  onClick={() => setMenu((m) => (m === 'speed' ? 'none' : 'speed'))}
                  className="h-8 px-2 rounded border border-zinc-800 text-xs font-mono text-zinc-300 cursor-pointer"
                >
                  {engine.playbackRate}x
                </button>
              )}
              {engine.pipSupported && (
                <button
                  type="button"
                  onClick={() => void engine.togglePip()}
                  aria-label="Picture in Picture"
                  className="w-8 h-8 rounded border border-zinc-800 text-zinc-300 hidden sm:flex items-center justify-center cursor-pointer"
                >
                  <PictureInPicture2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void engine.toggleFullscreen()}
                aria-label="Fullscreen"
                className="w-8 h-8 rounded border border-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
              >
                {engine.isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              </button>

              {menu !== 'none' && (
                <div className="absolute bottom-11 right-0 w-52 rounded-lg bg-[#0c0c0f] border border-zinc-700 p-1.5 space-y-0.5 z-40 max-h-60 overflow-y-auto shadow-2xl font-mono text-xs">
                  {menu === 'quality' && (
                    <>
                      {target.provider === 'moviebox'
                        ? PLAYER_RESOLUTIONS.map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => {
                                engine.changeMovieBoxQuality(q);
                                setMenu('none');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded cursor-pointer ${
                                engine.resolution === q ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-800'
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
                                setMenu('none');
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded cursor-pointer ${
                                engine.activeHlsLevel === lvl.index
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'text-zinc-300 hover:bg-zinc-800'
                              }`}
                            >
                              {lvl.label}
                            </button>
                          ))}
                      {target.hasNextEpisode && (
                        <button
                          type="button"
                          onClick={() => engine.setAutoNextEnabled((v) => !v)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded border-t border-zinc-800 mt-1 pt-1.5 text-zinc-300 cursor-pointer"
                        >
                          <span>AUTO_NEXT</span>
                          <span className="text-cyan-400">{engine.autoNextEnabled ? 'ON' : 'OFF'}</span>
                        </button>
                      )}
                    </>
                  )}
                  {menu === 'audio' &&
                    (engine.hlsAudioTracks.length > 1
                      ? engine.hlsAudioTracks.map((tr) => (
                          <button
                            key={tr.id}
                            type="button"
                            onClick={() => {
                              engine.changeHlsAudio(tr.id);
                              setMenu('none');
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded cursor-pointer ${
                              engine.activeHlsAudio === tr.id ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-800'
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
                              engine.changeMovieBoxAudio(lang);
                              setMenu('none');
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded uppercase cursor-pointer ${
                              engine.audioLang === lang ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            {lang}
                          </button>
                        )))}
                  {menu === 'subtitles' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          engine.setActiveSubUrl('off');
                          setMenu('none');
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded cursor-pointer ${
                          engine.activeSubUrl === 'off' ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        Off
                      </button>
                      {engine.subtitles.map((sub, idx) => (
                        <button
                          key={`${sub.url}-${idx}`}
                          type="button"
                          onClick={() => {
                            engine.setActiveSubUrl(sub.url);
                            setMenu('none');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded truncate cursor-pointer ${
                            engine.activeSubUrl === sub.url
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          {sub.label || sub.lang || `Track ${idx + 1}`}
                        </button>
                      ))}
                    </>
                  )}
                  {menu === 'speed' &&
                    PLAYER_SPEEDS.map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => {
                          engine.changeSpeed(spd);
                          setMenu('none');
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded cursor-pointer ${
                          engine.playbackRate === spd ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
