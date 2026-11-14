import { useMemo, useState } from 'react';
import { ArrowRight, Info, Play, Sparkles, Tv } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';
import type { EditionSection } from '../types';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';
import { NeonPosterTile, NeonPulseWideCard } from './NeonMediaCard';

interface NeonHomeProps {
  onSelectTitle: (item: MediaItem) => void;
  onPlayTarget: (target: ActivePlaybackTarget) => void;
  onNavigateSection: (section: EditionSection) => void;
}

export function NeonHome({
  onSelectTitle,
  onPlayTarget,
  onNavigateSection,
}: NeonHomeProps) {
  const { watchProgress } = useAuth();
  const {
    trending,
    popularMovies,
    latestMovies,
    upcomingMovies,
    popularSeries,
    topRated,
    recommended,
    genreCollections,
    loading,
    error,
    refresh,
  } = useCatalog();

  const [heroIdx, setHeroIdx] = useState(0);
  const [matrixTab, setMatrixTab] = useState<'popular' | 'latest' | 'series' | 'topRated'>('popular');

  const spotlightPool = useMemo(() => trending.slice(0, 5), [trending]);
  const hero = spotlightPool[heroIdx] || trending[0];

  const continueItems = useMemo(
    () =>
      watchProgress.filter(
        (w) =>
          w.position_seconds > 5 &&
          (!w.duration_seconds || w.position_seconds < w.duration_seconds - 15)
      ),
    [watchProgress]
  );

  const matrixItems = useMemo(() => {
    if (matrixTab === 'latest') return latestMovies.slice(0, 14);
    if (matrixTab === 'series') return popularSeries.slice(0, 14);
    if (matrixTab === 'topRated') return topRated.slice(0, 14);
    return popularMovies.slice(0, 14);
  }, [matrixTab, popularMovies, latestMovies, popularSeries, topRated]);

  return (
    <div className="space-y-9">
      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={refresh} />}

      {/* Panoramic HUD Stage + Signal Queue */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 relative min-h-[380px] sm:min-h-[440px] rounded-lg overflow-hidden border border-cyan-400/35 bg-[#070b18] shadow-[0_0_40px_-14px_rgba(0,240,255,0.35)]">
          {loading && !hero ? (
            <div className="w-full h-full bg-[#091126] animate-pulse" />
          ) : hero ? (
            <>
              <img
                src={hero.backdrop || hero.poster || FALLBACK_ART.cinemaHero}
                alt={hero.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#03050d] via-[#03050d]/75 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#03050d] via-transparent to-transparent" />

              <div className="relative z-10 h-full p-6 sm:p-8 flex flex-col justify-end gap-4 max-w-2xl">
                <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#00f0ff]">
                  <span>Featured Signal</span>
                  <span className="text-[#ff2bd6]">·</span>
                  <span className="text-sky-200">{hero.type === 'series' ? 'TV Series' : 'Movie'}</span>
                  {hero.year && <span className="text-slate-400">· {hero.year}</span>}
                </div>

                <h1 className="font-neon text-4xl sm:text-6xl uppercase tracking-wide text-white leading-[0.95]">
                  {hero.title}
                </h1>

                <p className="text-sm text-sky-100/80 line-clamp-2 leading-relaxed">
                  {hero.description || hero.overview}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectTitle(hero)}
                    className="neon-glow-btn h-11 px-6 rounded-md text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTitle(hero)}
                    className="h-11 px-5 rounded-md border border-cyan-400/40 bg-[#050814]/85 hover:border-[#ff2bd6] text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Info className="w-4 h-4 text-[#00f0ff]" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Right Signal Selector Queue */}
        <div className="lg:col-span-4 neon-panel rounded-lg p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
            <h2 className="font-neon text-xl uppercase tracking-wide text-[#00f0ff]">
              Spotlight Queue
            </h2>
            <span className="font-mono text-[10px] text-[#ff2bd6]">LIVE TRENDING</span>
          </div>

          <div className="space-y-2 flex-1">
            {spotlightPool.map((item, idx) => {
              const active = idx === heroIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setHeroIdx(idx)}
                  onDoubleClick={() => onSelectTitle(item)}
                  className={`w-full p-2.5 rounded-md border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0c1631] border-[#00f0ff] shadow-[0_0_16px_-6px_rgba(0,240,255,0.5)]'
                      : 'bg-[#050814]/70 border-cyan-500/15 hover:border-cyan-400/50'
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-[#ff2bd6] w-5 shrink-0 tabular-nums">
                    0{idx + 1}
                  </span>
                  <img
                    src={item.poster || FALLBACK_ART.cinemaHero}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-9 h-12 rounded object-cover shrink-0 border border-cyan-400/20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-neon text-base text-white truncate">{item.title}</p>
                    <p className="font-mono text-[10px] text-slate-400 truncate">
                      {[item.type === 'series' ? 'SERIES' : 'MOVIE', item.year]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onNavigateSection('anime')}
              className="h-9 rounded-md border border-[#ff2bd6]/40 bg-[#0c0820] hover:border-[#ff2bd6] text-xs font-medium text-pink-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff2bd6]" />
              <span>Anime Pulse</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('live')}
              className="h-9 rounded-md border border-[#00f0ff]/40 bg-[#051226] hover:border-[#00f0ff] text-xs font-medium text-cyan-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Live Feeds</span>
            </button>
          </div>
        </div>
      </section>

      {/* Continue Watching Pulse */}
      {continueItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-neon text-2xl sm:text-3xl uppercase text-white">
              Resume Active Streams
            </h2>
            <span className="font-mono text-xs text-[#00f0ff] tabular-nums">
              {continueItems.length} IN PROGRESS
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {continueItems.slice(0, 5).map((w) => {
              const pct =
                w.duration_seconds > 0
                  ? Math.round((w.position_seconds / w.duration_seconds) * 100)
                  : 15;
              return (
                <NeonPulseWideCard
                  key={`neon-cw-${w.content_id}-${w.season}-${w.episode}`}
                  progressPercent={pct}
                  subtitleOverride={
                    w.season > 0 ? `S${w.season} E${w.episode} · ${pct}%` : `${pct}% COMPLETE`
                  }
                  item={{
                    id: w.content_id,
                    subjectId: w.content_id,
                    slug: w.slug,
                    title: w.title,
                    poster: w.poster,
                    type: w.media_type === 'series' ? 'series' : 'movie',
                    source: w.provider,
                    genres: [],
                  }}
                  onSelect={onSelectTitle}
                  onQuickPlay={() =>
                    onPlayTarget({
                      mode:
                        w.provider === 'animex'
                          ? 'hls'
                          : w.provider === 'gotaku'
                            ? 'embed'
                            : 'direct',
                      title: w.title,
                      poster: w.poster,
                      provider: w.provider as ActivePlaybackTarget['provider'],
                      contentId: w.content_id,
                      slug: w.slug,
                      mediaType: w.media_type as ActivePlaybackTarget['mediaType'],
                      season: w.season || undefined,
                      episode: w.episode || undefined,
                    })
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Segmented Cyber Matrix Collection */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-neon text-2xl sm:text-3xl uppercase text-white">
            Catalog Matrix
          </h2>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'popular', label: 'Popular' },
              { id: 'latest', label: 'Latest' },
              { id: 'series', label: 'TV Series' },
              { id: 'topRated', label: 'Top Rated' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMatrixTab(t.id as typeof matrixTab)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-mono uppercase whitespace-nowrap cursor-pointer transition-all ${
                  matrixTab === t.id
                    ? 'bg-[#00f0ff] text-[#03050d] font-bold shadow-[0_0_16px_-2px_rgba(0,240,255,0.6)]'
                    : 'bg-[#070b18] border border-cyan-500/25 text-slate-300 hover:border-[#00f0ff]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3.5">
          {matrixItems.map((item) => (
            <NeonPosterTile key={item.id} item={item} onSelect={onSelectTitle} />
          ))}
        </div>
      </section>

      {/* Recommended & Upcoming Grids */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-neon text-2xl sm:text-3xl uppercase text-white">
            Recommended For You
          </h2>
          <button
            type="button"
            onClick={() => onNavigateSection('discover')}
            className="font-mono text-xs text-[#00f0ff] hover:text-[#ff2bd6] inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Explore Full Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3.5">
          {recommended.slice(0, 14).map((item) => (
            <NeonPosterTile key={item.id} item={item} onSelect={onSelectTitle} />
          ))}
        </div>
      </section>

      {upcomingMovies.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-neon text-2xl sm:text-3xl uppercase text-[#ff8ef0]">
            Upcoming Releases
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3.5">
            {upcomingMovies.slice(0, 7).map((item) => (
              <NeonPosterTile key={item.id} item={item} onSelect={onSelectTitle} />
            ))}
          </div>
        </section>
      )}

      {/* Genre Channels */}
      {genreCollections.slice(0, 4).map((col) => (
        <section key={col.id} className="space-y-3">
          <h2 className="font-neon text-2xl uppercase text-white">{col.label}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3.5">
            {col.items.slice(0, 7).map((item) => (
              <NeonPosterTile key={`${col.id}-${item.id}`} item={item} onSelect={onSelectTitle} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
