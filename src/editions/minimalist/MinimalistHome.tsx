import { useMemo, useState } from 'react';
import { ArrowRight, Play, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';
import type { EditionSection } from '../types';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';
import { MinimalistPosterCard, MinimalistWideCard } from './MinimalistMediaCard';

interface MinimalistHomeProps {
  onSelectTitle: (item: MediaItem) => void;
  onPlayTarget: (target: ActivePlaybackTarget) => void;
  onNavigateSection: (section: EditionSection) => void;
}

export function MinimalistHome({
  onSelectTitle,
  onPlayTarget,
  onNavigateSection,
}: MinimalistHomeProps) {
  const { watchProgress } = useAuth();
  const {
    trending,
    popularMovies,
    latestMovies,
    upcomingMovies,
    popularSeries,
    topRated,
    recommended,
    allGenres,
    genreCollections,
    loading,
    error,
    refresh,
  } = useCatalog();

  const [heroIdx, setHeroIdx] = useState(0);
  const [activeShelf, setActiveShelf] = useState<'popular' | 'latest' | 'series' | 'topRated'>(
    'popular'
  );

  const heroPool = useMemo(() => trending.slice(0, 4), [trending]);
  const featured = heroPool[heroIdx] || trending[0];

  const continueItems = useMemo(
    () =>
      watchProgress.filter(
        (w) =>
          w.position_seconds > 5 &&
          (!w.duration_seconds || w.position_seconds < w.duration_seconds - 15)
      ),
    [watchProgress]
  );

  const shelfItems = useMemo(() => {
    if (activeShelf === 'latest') return latestMovies.slice(0, 12);
    if (activeShelf === 'series') return popularSeries.slice(0, 12);
    if (activeShelf === 'topRated') return topRated.slice(0, 12);
    return popularMovies.slice(0, 12);
  }, [activeShelf, popularMovies, latestMovies, popularSeries, topRated]);

  return (
    <div className="space-y-14 text-neutral-900">
      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={refresh} />}

      {/* 50/50 Swiss Gallery Split Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center border-b border-neutral-200 pb-12">
        <div className="lg:col-span-6 space-y-6">
          {loading && !featured ? (
            <div className="space-y-4">
              <div className="h-4 w-32 bg-neutral-100 rounded animate-pulse" />
              <div className="h-14 w-3/4 bg-neutral-100 rounded animate-pulse" />
              <div className="h-20 w-full bg-neutral-100 rounded animate-pulse" />
            </div>
          ) : featured ? (
            <>
              <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-[#2563EB]">
                <span>0{heroIdx + 1} / Selected Screening</span>
                <span className="text-neutral-300">·</span>
                <span className="text-neutral-500">
                  {featured.type === 'series' ? 'Series' : 'Feature Film'}
                </span>
              </div>

              <h1
                className="font-minimal text-4xl sm:text-5xl lg:text-6xl font-semibold text-neutral-950 leading-[1.04] tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {featured.title}
              </h1>

              <p className="font-mono text-xs text-neutral-500 tabular-nums">
                {[
                  featured.year,
                  featured.rating ? `Rating ${featured.rating}` : null,
                  featured.genres.slice(0, 3).join(' · '),
                ]
                  .filter(Boolean)
                  .join('  /  ')}
              </p>

              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-lg line-clamp-3">
                {featured.description ||
                  featured.overview ||
                  'Stream with adaptive resolution, multi-language subtitles, and clean minimalist controls.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectTitle(featured)}
                  className="h-11 px-6 rounded-md bg-neutral-950 hover:bg-[#2563EB] text-white text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Watch Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateSection('discover')}
                  className="h-11 px-5 rounded-md border border-neutral-300 bg-white hover:border-neutral-950 text-xs sm:text-sm font-medium text-neutral-900 inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Browse Index</span>
                </button>
              </div>

              {heroPool.length > 1 && (
                <div className="flex items-center gap-1.5 pt-2">
                  {heroPool.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setHeroIdx(idx)}
                      aria-label={`Show ${item.title}`}
                      className={`h-8 px-3 rounded-md font-mono text-xs border cursor-pointer transition-colors ${
                        idx === heroIdx
                          ? 'border-neutral-950 bg-neutral-950 text-white'
                          : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-950'
                      }`}
                    >
                      0{idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="lg:col-span-6">
          {featured ? (
            <button
              type="button"
              onClick={() => onSelectTitle(featured)}
              className="block w-full aspect-[16/10] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 cursor-pointer group"
            >
              <img
                src={featured.backdrop || featured.poster || FALLBACK_ART.cinemaHero}
                alt={featured.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </button>
          ) : (
            <div className="aspect-[16/10] rounded-lg bg-neutral-100 border border-neutral-200 animate-pulse" />
          )}
        </div>
      </section>

      {/* Compact 4-Cell Catalog Summary Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 border border-neutral-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-neutral-200 bg-[#FAFAFA]">
        <div className="p-4 sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Trending</p>
          <p className="font-minimal text-2xl font-semibold text-neutral-950 mt-1 tabular-nums">
            {trending.length}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Films</p>
          <p className="font-minimal text-2xl font-semibold text-neutral-950 mt-1 tabular-nums">
            {popularMovies.length + latestMovies.length}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Series</p>
          <p className="font-minimal text-2xl font-semibold text-neutral-950 mt-1 tabular-nums">
            {popularSeries.length}
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Genres</p>
          <p className="font-minimal text-2xl font-semibold text-[#2563EB] mt-1 tabular-nums">
            {allGenres.length}
          </p>
        </div>
      </section>

      {/* Continue Watching */}
      {continueItems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-minimal text-xl font-semibold text-neutral-950">
              Continue Watching
            </h2>
            <span className="font-mono text-xs text-neutral-500 tabular-nums">
              {continueItems.length} in progress
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {continueItems.slice(0, 4).map((w) => {
              const pct =
                w.duration_seconds > 0
                  ? Math.round((w.position_seconds / w.duration_seconds) * 100)
                  : 15;
              return (
                <MinimalistWideCard
                  key={`min-cw-${w.content_id}-${w.season}-${w.episode}`}
                  progressPercent={pct}
                  subtitleOverride={
                    w.season > 0 ? `S${w.season} E${w.episode} · ${pct}%` : `${pct}% watched`
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

      {/* Tabbed Compact Gallery Collection */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
          <h2 className="font-minimal text-xl sm:text-2xl font-semibold text-neutral-950">
            Selected Collection
          </h2>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'popular', label: 'Popular' },
              { id: 'latest', label: 'Latest' },
              { id: 'series', label: 'Series' },
              { id: 'topRated', label: 'Top Rated' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveShelf(tab.id as typeof activeShelf)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  activeShelf === tab.id
                    ? 'bg-neutral-950 text-white'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-950'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {shelfItems.map((item) => (
            <MinimalistPosterCard key={item.id} item={item} onSelect={onSelectTitle} />
          ))}
        </div>
      </section>

      {/* Recommended & Upcoming Clean Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 border-t border-neutral-200 pt-10">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-minimal text-xl font-semibold text-neutral-950">Recommended</h2>
            <button
              type="button"
              onClick={() => onNavigateSection('movies')}
              className="text-xs font-medium text-[#2563EB] inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>All Films</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {recommended.slice(0, 8).map((item) => (
              <MinimalistPosterCard key={item.id} item={item} onSelect={onSelectTitle} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <h2 className="font-minimal text-xl font-semibold text-neutral-950">Upcoming Releases</h2>
          <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-200 bg-[#FAFAFA]">
            {upcomingMovies.slice(0, 8).map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTitle(item)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-[11px] text-neutral-400 tabular-nums shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-medium text-neutral-900 truncate">{item.title}</span>
                </div>
                <span className="font-mono text-[11px] text-neutral-500 shrink-0 tabular-nums">
                  {item.year || 'Soon'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Minimal Genre Index */}
      {genreCollections.length > 0 && (
        <section className="space-y-8 border-t border-neutral-200 pt-10">
          <h2 className="font-minimal text-xl font-semibold text-neutral-950">By Genre</h2>
          <div className="space-y-8">
            {genreCollections.slice(0, 3).map((col) => (
              <div key={col.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900">{col.label}</h3>
                  <button
                    type="button"
                    onClick={() => onNavigateSection('discover')}
                    className="font-mono text-[11px] text-neutral-500 hover:text-neutral-950 cursor-pointer"
                  >
                    Explore
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
                  {col.items.slice(0, 6).map((item) => (
                    <MinimalistPosterCard
                      key={`${col.id}-${item.id}`}
                      item={item}
                      onSelect={onSelectTitle}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
