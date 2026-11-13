import { useState } from 'react';
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
import { formatTimecode } from '../../lib/mediaUtils';
import {
  PLAYER_RESOLUTIONS,
  PLAYER_SPEEDS,
  useVideoPlayerEngine,
} from '../../hooks/useVideoPlayerEngine';
import type { ActivePlaybackTarget } from '../../types/framex';

interface ClassicVideoPlayerProps {
  target: ActivePlaybackTarget | null;
  onClose: () => void;
}

export function ClassicVideoPlayer({ target, onClose }: ClassicVideoPlayerProps) {
  const engine = useVideoPlayerEngine(target, onClose);
  const [settingsMenu, setSettingsMenu] = useState<'none' | 'quality' | 'subtitles' | 'audio' | 'speed'>('none');
  const [episodesOpen, setEpisodesOpen] = useState(false);

  if (!target) return null;

  return (
    <div
      ref={engine.containerRef}
      onMouseMove={() => engine.wakeHud(settingsMenu !== 'none' || episodesOpen)}
      onTouchStart={() => engine.wakeHud(settingsMenu !== 'none' || episodesOpen)}
      className="fixed inset-0 z-50 bg-[#070204]/95 backdrop-blur-xl flex flex-col p-2 sm:p-5 select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${target.title}`}
    >
      {/* Velvet Salon Header Bar */}
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-3 pb-3 shrink-0">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300/85">
            Screening Room{engine.resumedFrom !== null ? ` · Resumed ${formatTimecode(engine.resumedFrom)}` : ''}
          </p>
          <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-amber-50 truncate">
            {target.title}
            {target.subtitle ? (
              <span className="text-sm font-sans font-normal text-rose-100/70 ml-2.5">
                {target.subtitle}
              </span>
            ) : null}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {engine.hasEpisodesList && (
            <button
              type="button"
              onClick={() => setEpisodesOpen((o) => !o)}
              className={`glass-btn h-10 px-3.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                episodesOpen ? 'border-amber-300/60 text-amber-200' : 'text-amber-50'
              }`}
            >
              <ListVideo className="w-4 h-4" />
              <span className="hidden sm:inline">Episodes ({target.episodes!.length})</span>
            </button>
          )}

          {target.provider === 'moviebox' && (
            <button
              type="button"
              onClick={() => void engine.handleDownload()}
              disabled={engine.downloading}
              className="glass-btn h-10 px-3.5 rounded-full text-xs font-medium text-amber-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {engine.downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden md:inline">Save Copy</span>
            </button>
          )}

          <button
            type="button"
            onClick={engine.closePlayer}
            aria-label="Close screening room"
            className="glass-btn w-10 h-10 rounded-full flex items-center justify-center text-amber-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Framed Cinema Stage + Optional Velvet Episode Tray */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto flex gap-4 relative">
        <div className="flex-1 min-w-0 rounded-3xl overflow-hidden border border-amber-200/20 bg-black relative flex items-center justify-center shadow-2xl">
          {engine.loadingStream ? (
            <div className="flex flex-col items-center gap-3 text-amber-100/80">
              <Loader2 className="w-9 h-9 animate-spin text-amber-300" />
              <p className="font-editorial italic text-lg">Preparing your screening…</p>
            </div>
          ) : engine.streamError ? (
            <div className="glass-surface-elevated max-w-md mx-4 p-6 rounded-3xl text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="font-editorial text-xl text-white">Screening Interrupted</p>
              <p className="text-xs text-rose-100/75">{engine.streamError}</p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void engine.fetchAndLoadPlayback(false)}
                  className="glass-btn-primary px-4 py-2 rounded-full text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={engine.closePlayer}
                  className="glass-btn px-4 py-2 rounded-full text-xs text-amber-100 cursor-pointer"
                >
                  Exit
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
                  <div className="glass-surface px-4 py-2.5 rounded-full flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span className="text-xs text-amber-100">Buffering…</span>
                  </div>
                </div>
              )}

              {/* Auto-Next Velvet Card */}
              {engine.autoNextCountdown !== null && target.onNextEpisode && (
                <div className="absolute bottom-24 right-5 z-30 glass-surface-elevated rounded-2xl p-4 w-64 space-y-2.5 border border-amber-300/35">
                  <p className="font-mono text-[11px] text-amber-300 tabular-nums">
                    Next Screening in {engine.autoNextCountdown}s
                  </p>
                  <p className="font-editorial text-lg font-semibold text-white">
                    Episode {(target.episode || 1) + 1}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        engine.clearAutoNextTimer();
                        target.onNextEpisode?.();
                      }}
                      className="glass-btn-primary flex-1 h-8 rounded-full text-xs font-semibold text-white cursor-pointer"
                    >
                      Play Next
                    </button>
                    <button
                      type="button"
                      onClick={engine.clearAutoNextTimer}
                      className="glass-btn h-8 px-3 rounded-full text-xs text-amber-100 cursor-pointer"
                    >
                      Hold
                    </button>
                  </div>
                </div>
              )}

              {/* Classic Velvet Control Overlay */}
              <div
                className={`absolute bottom-0 inset-x-0 z-20 p-3 sm:p-5 bg-gradient-to-t from-[#090306] via-[#090306]/75 to-transparent transition-opacity duration-200 ${
                  engine.hudVisible || !engine.playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {target.mediaType !== 'live' && (
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="font-mono text-[11px] text-amber-200/85 tabular-nums w-12">
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
                      className="flex-1 accent-amber-300 h-1.5 cursor-pointer"
                    />
                    <span className="font-mono text-[11px] text-rose-100/65 tabular-nums w-12 text-right">
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
                      className="glass-btn-primary w-10 h-10 rounded-full flex items-center justify-center text-white cursor-pointer"
                    >
                      {engine.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                    {target.mediaType !== 'live' && (
                      <>
                        <button
                          type="button"
                          onClick={() => engine.skipBy(-10)}
                          aria-label="Rewind 10 seconds"
                          className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-amber-100 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => engine.skipBy(10)}
                          aria-label="Forward 10 seconds"
                          className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-amber-100 cursor-pointer"
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
                        className="glass-btn w-9 h-9 rounded-full hidden sm:flex items-center justify-center text-amber-100 cursor-pointer"
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
                        aria-label="Next Episode"
                        className="glass-btn h-9 px-3 rounded-full hidden sm:inline-flex items-center gap-1 text-xs text-amber-100 cursor-pointer"
                      >
                        <span>Next</span>
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="hidden md:flex items-center gap-1.5 ml-1">
                      <button
                        type="button"
                        onClick={engine.toggleMute}
                        aria-label={engine.muted ? 'Unmute' : 'Mute'}
                        className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-amber-100 cursor-pointer"
                      >
                        {engine.muted || engine.volume === 0 ? (
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
                        value={engine.muted ? 0 : engine.volume}
                        onChange={(e) => engine.changeVolume(Number(e.target.value))}
                        className="w-16 accent-amber-300 h-1 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Right Menu Controls */}
                  <div className="flex items-center gap-1.5 relative">
                    {engine.subtitles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSettingsMenu((m) => (m === 'subtitles' ? 'none' : 'subtitles'))}
                        className={`glass-btn h-9 px-3 rounded-full text-xs inline-flex items-center gap-1 cursor-pointer ${
                          engine.activeSubUrl !== 'off' ? 'text-amber-300 border-amber-300/45' : 'text-amber-100'
                        }`}
                      >
                        <Captions className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Subs</span>
                      </button>
                    )}
                    {engine.hasAudioOptions && (
                      <button
                        type="button"
                        onClick={() => setSettingsMenu((m) => (m === 'audio' ? 'none' : 'audio'))}
                        className="glass-btn h-9 px-3 rounded-full text-xs text-amber-100 cursor-pointer"
                      >
                        Audio
                      </button>
                    )}
                    {(target.provider === 'moviebox' || engine.hlsLevels.length > 0) && (
                      <button
                        type="button"
                        onClick={() => setSettingsMenu((m) => (m === 'quality' ? 'none' : 'quality'))}
                        className="glass-btn h-9 px-3 rounded-full text-xs text-amber-100 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>
                          {target.provider === 'moviebox'
                            ? `${engine.resolution}p`
                            : engine.activeHlsLevel === -1
                              ? 'Auto'
                              : engine.hlsLevels.find((l) => l.index === engine.activeHlsLevel)?.label || 'Auto'}
                        </span>
                      </button>
                    )}
                    {target.mediaType !== 'live' && (
                      <button
                        type="button"
                        onClick={() => setSettingsMenu((m) => (m === 'speed' ? 'none' : 'speed'))}
                        className="glass-btn h-9 px-2.5 rounded-full text-xs font-mono text-amber-100 cursor-pointer"
                      >
                        {engine.playbackRate}x
                      </button>
                    )}
                    {engine.pipSupported && (
                      <button
                        type="button"
                        onClick={() => void engine.togglePip()}
                        aria-label="Picture in Picture"
                        className={`glass-btn w-9 h-9 rounded-full hidden sm:flex items-center justify-center cursor-pointer ${
                          engine.isPipActive ? 'text-amber-300' : 'text-amber-100'
                        }`}
                      >
                        <PictureInPicture2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void engine.toggleFullscreen()}
                      aria-label={engine.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                      className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-amber-100 cursor-pointer"
                    >
                      {engine.isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>

                    {settingsMenu !== 'none' && (
                      <div className="glass-surface-elevated absolute bottom-12 right-0 w-56 rounded-2xl p-2 space-y-1 z-40 max-h-64 overflow-y-auto">
                        {settingsMenu === 'quality' && (
                          <>
                            {target.provider === 'moviebox'
                              ? PLAYER_RESOLUTIONS.map((q) => (
                                  <button
                                    key={q}
                                    type="button"
                                    onClick={() => {
                                      engine.changeMovieBoxQuality(q);
                                      setSettingsMenu('none');
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer ${
                                      engine.resolution === q ? 'bg-rose-700 text-white' : 'text-amber-100/80 hover:bg-white/10'
                                    }`}
                                  >
                                    {q}p HD
                                  </button>
                                ))
                              : [{ index: -1, label: 'Auto Adaptive' }, ...engine.hlsLevels].map((lvl) => (
                                  <button
                                    key={lvl.index}
                                    type="button"
                                    onClick={() => {
                                      engine.changeHlsLevel(lvl.index);
                                      setSettingsMenu('none');
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer ${
                                      engine.activeHlsLevel === lvl.index
                                        ? 'bg-rose-700 text-white'
                                        : 'text-amber-100/80 hover:bg-white/10'
                                    }`}
                                  >
                                    {lvl.label}
                                  </button>
                                ))}
                            {target.hasNextEpisode && (
                              <button
                                type="button"
                                onClick={() => engine.setAutoNextEnabled((v) => !v)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-amber-100 border-t border-amber-200/15 mt-1 pt-2 cursor-pointer"
                              >
                                <span>Auto-Next</span>
                                <span className="font-mono text-amber-300">
                                  {engine.autoNextEnabled ? 'ON' : 'OFF'}
                                </span>
                              </button>
                            )}
                          </>
                        )}
                        {settingsMenu === 'audio' &&
                          (engine.hlsAudioTracks.length > 1
                            ? engine.hlsAudioTracks.map((tr) => (
                                <button
                                  key={tr.id}
                                  type="button"
                                  onClick={() => {
                                    engine.changeHlsAudio(tr.id);
                                    setSettingsMenu('none');
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer ${
                                    engine.activeHlsAudio === tr.id ? 'bg-rose-700 text-white' : 'text-amber-100/80 hover:bg-white/10'
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
                                    setSettingsMenu('none');
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs uppercase cursor-pointer ${
                                    engine.audioLang === lang ? 'bg-rose-700 text-white' : 'text-amber-100/80 hover:bg-white/10'
                                  }`}
                                >
                                  {lang}
                                </button>
                              )))}
                        {settingsMenu === 'subtitles' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                engine.setActiveSubUrl('off');
                                setSettingsMenu('none');
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer ${
                                engine.activeSubUrl === 'off' ? 'bg-rose-700 text-white' : 'text-amber-100/80 hover:bg-white/10'
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
                                  setSettingsMenu('none');
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs truncate cursor-pointer ${
                                  engine.activeSubUrl === sub.url
                                    ? 'bg-rose-700 text-white'
                                    : 'text-amber-100/80 hover:bg-white/10'
                                }`}
                              >
                                {sub.label || sub.lang || `Track ${idx + 1}`}
                              </button>
                            ))}
                          </>
                        )}
                        {settingsMenu === 'speed' &&
                          PLAYER_SPEEDS.map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => {
                                engine.changeSpeed(spd);
                                setSettingsMenu('none');
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono cursor-pointer ${
                                engine.playbackRate === spd ? 'bg-rose-700 text-white' : 'text-amber-100/80 hover:bg-white/10'
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
        </div>

        {/* Velvet Screening Room Side Episodes Drawer */}
        {episodesOpen && engine.hasEpisodesList && (
          <aside className="absolute md:static inset-y-0 right-0 z-40 w-80 max-w-full glass-surface-elevated rounded-3xl p-4 flex flex-col gap-3 border border-amber-200/20">
            <div className="flex items-center justify-between border-b border-amber-200/15 pb-2.5">
              <div>
                <h3 className="font-editorial text-xl font-semibold text-amber-50">
                  {target.season ? `Season ${target.season}` : 'Episodes'}
                </h3>
                <p className="text-[11px] text-rose-100/60 tabular-nums">
                  {target.episodes!.length} episodes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEpisodesOpen(false)}
                className="glass-btn w-8 h-8 rounded-full flex items-center justify-center text-amber-100 cursor-pointer"
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
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-center gap-2.5 cursor-pointer ${
                      isCurrent
                        ? 'bg-rose-900/45 border-amber-300/50 text-white'
                        : 'bg-black/30 border-amber-200/10 hover:border-amber-200/35 text-rose-100/80'
                    }`}
                  >
                    <span className="font-editorial italic text-base text-amber-300 w-6 text-center shrink-0 tabular-nums">
                      {ep.episode}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-editorial text-sm font-semibold text-white truncate">
                        {ep.title || `Episode ${ep.episode}`}
                      </p>
                      {ep.duration && (
                        <p className="font-mono text-[10px] text-rose-100/55">{ep.duration}</p>
                      )}
                    </div>
                    {isWatched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
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
