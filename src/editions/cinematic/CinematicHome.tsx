import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Info, Play, Plus } from 'lucide-react';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';
import type { EditionShellProps } from '../types';
import { CinematicPosterCard, CinematicRankCard, CinematicWideCard } from './CinematicMediaCard';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';

function CinematicRail({
  title,
  items,
  loading,
  onSelect,
}: {
  title: string;
  items: MediaItem[];
  loading?: boolean;
  onSelect: (item: MediaItem) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!loading && items.length === 0) return null;

  const scroll = (dir: -1 | 1) => {
    ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.85), behavior: 'smooth' });
  };

  return (
    <section className="space-y-2.5 group/rail">
      <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12">
        <h2 className="font-cinema text-2xl sm:text-3xl tracking-wide uppercase text-white">
          {title}
        </h2>
        <div className="hidden sm:flex items-center gap-1 opacity-70 group-hover/rail:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${title} left`}
            className="w-8 h-8 rounded-full bg-black/70 border border-white/15 hover:border-white text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={`Scroll ${title} right`}
            className="w-8 h-8 rounded-full bg-black/70 border border-white/15 hover:border-white text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={ref}
        className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 sm:px-8 lg:px-12 py-2 snap-x"
      >
        {loading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="w-[126px] sm:w-[146px] lg:w-[162px] aspect-[2/3] shrink-0 rounded-md bg-neutral-900 animate-pulse"
              />
            ))
          : items.map((item) => (
              <div
                key={`${title}-${item.source}-${item.id}-${item.slug}`}
                className="w-[126px] sm:w-[146px] lg:w-[162px] shrink-0 snap-start"
              >
                <CinematicPosterCard item={item} onSelect={onSelect} />
              </div>
            ))}
      </div>
    </section>
  );
}

export function CinematicHome({
  onSelectTitle,
  onPlayTarget,
  onNavigateSection,
}: Pick<EditionShellProps, 'onSelectTitle' | 'onPlayTarget' | 'onNavigateSection'>) {
  const { watchProgress, library, isInLibrary, toggleLibraryItem } = useAuth();
  const {
    trending,
    popularMovies,
    latestMovies,
    upcomingMovies,
    topRated,
    popularSeries,
    recommended,
    genreCollections,
    loading,
    error,
    refresh,
  } = useCatalog();

  const [heroIdx, setHeroIdx] = useState(0);
  const featuredPool = trending.slice(0, 5);
  const heroItem = featuredPool[heroIdx] || null;

  useEffect(() => {
    if (featuredPool.length <= 1) return;
    const t = window.setInterval(() => {
      setHeroIdx((i) => (i + 1) % featuredPool.length);
    }, 9000);
    return () => window.clearInterval(t);
  }, [featuredPool.length]);

  const heroInList = heroItem
    ? isInLibrary(heroItem.id, 'watchlist', heroItem.type)
    : false;

  const resumeItems = useMemo(
    () =>
      watchProgress.filter(
        (w) =>
          w.position_seconds > 5 &&
          (!w.duration_seconds || w.position_seconds < w.duration_seconds - 15)
      ),
    [watchProgress]
  );

  const recentlyWatchedItems = useMemo(() => {
    const seen = new Set<string>();
    const list: MediaItem[] = [];
    for (const w of watchProgress) {
      if (seen.has(w.content_id)) continue;
      seen.add(w.content_id);
      list.push({
        id: w.content_id,
        subjectId: w.content_id,
        slug: w.slug,
        title: w.title,
        poster: w.poster,
        type: w.media_type === 'series' ? 'series' : 'movie',
        source: w.provider,
        genres: [],
      });
      if (list.length >= 12) break;
    }
    return list;
  }, [watchProgress]);

  const recommendedForYou = useMemo(() => {
    if (library.length === 0 && watchProgress.length === 0) return recommended;
    const seenIds = new Set([
      ...watchProgress.map((w) => w.content_id),
      ...library.map((l) => l.item_id),
    ]);
    const filtered = recommended.filter((item) => !seenIds.has(item.id));
    return filtered.length >= 6 ? filtered : recommended;
  }, [recommended, library, watchProgress]);

  return (
    <div className="pb-12">
      {/* Full-Bleed Edge-to-Edge Theatrical Billboard Hero */}
      <section className="relative w-full h-[74vh] min-h-[480px] max-h-[780px] overflow-hidden bg-black">
        <img
          src={heroItem?.backdrop || heroItem?.poster || FALLBACK_ART.cinemaHero}
          alt={heroItem?.title || 'Featured Cinema'}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040404] via-[#040404]/45 to-black/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040404]/95 via-[#040404]/55 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end px-4 sm:px-8 lg:px-12 pb-24 sm:pb-28 max-w-4xl space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.26em] text-[#e50914]">
            <span>{heroItem?.type === 'series' ? 'LUPIN SERIES' : 'LUPIN FEATURE'}</span>
            {heroItem?.year && (
              <span className="text-neutral-300 font-mono font-normal tracking-normal tabular-nums">
                · {heroItem.year}
              </span>
            )}
            {heroItem?.rating && (
              <span className="text-emerald-400 font-mono font-semibold tracking-normal tabular-nums">
                · ★ {heroItem.rating}
              </span>
            )}
          </div>

          <h1 className="font-cinema text-5xl sm:text-7xl lg:text-8xl uppercase text-white leading-[0.88] tracking-wide drop-shadow-2xl">
            {heroItem ? heroItem.title : 'UNLIMITED CINEMA & SERIES'}
          </h1>

          <p className="text-sm sm:text-base text-neutral-200 line-clamp-3 max-w-xl leading-relaxed">
            {heroItem?.description ||
              'Stream blockbuster films, prestige series, anime hits, live television broadcasts, and sports in theater-grade high definition.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {heroItem ? (
              <>
                <button
                  type="button"
                  onClick={() => onSelectTitle(heroItem)}
                  className="h-11 px-7 rounded bg-white text-black hover:bg-neutral-200 font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTitle(heroItem)}
                  className="h-11 px-6 rounded bg-neutral-500/45 hover:bg-neutral-500/65 backdrop-blur-md text-white font-semibold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Info className="w-4 h-4" />
                  <span>More Info</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void toggleLibraryItem({
                      list_type: 'watchlist',
                      media_type: heroItem.type,
                      item_id: heroItem.id,
                      slug: heroItem.slug,
                      provider: heroItem.source,
                      title: heroItem.title,
                      poster: heroItem.poster || null,
                      year: heroItem.year ? String(heroItem.year) : null,
                    })
                  }
                  aria-label={heroInList ? 'Remove from My List' : 'Add to My List'}
                  className={`h-11 w-11 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                    heroInList
                      ? 'bg-[#e50914] border-[#e50914] text-white'
                      : 'bg-black/50 border-white/60 text-white hover:border-white'
                  }`}
                >
                  {heroInList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateSection('discover')}
                className="h-11 px-7 rounded bg-[#e50914] hover:bg-[#f40612] text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Explore Catalog</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom-right Billboard Slide Indicators */}
        {featuredPool.length > 1 && (
          <div className="absolute bottom-24 right-4 sm:right-8 lg:right-12 z-20 flex items-center gap-1.5">
            {featuredPool.map((item, idx) => (
              <button
                key={`slide-${item.id}`}
                type="button"
                aria-label={`Spotlight ${item.title}`}
                onClick={() => setHeroIdx(idx)}
                className={`h-1 rounded-full transition-all cursor-pointer ${
                  idx === heroIdx ? 'w-7 bg-[#e50914]' : 'w-3 bg-white/35 hover:bg-white/65'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Overlapping Negative-Margin Poster Rails */}
      <div className="-mt-14 relative z-20 space-y-9">
        {Boolean(error) && (
          <div className="px-4 sm:px-8 lg:px-12">
            <DomainNoticeBanner error={error} onRetry={() => void refresh()} />
          </div>
        )}

        {/* Continue Watching Widescreen Cards */}
        {resumeItems.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="font-cinema text-2xl sm:text-3xl tracking-wide uppercase text-white px-4 sm:px-8 lg:px-12">
              Continue Watching
            </h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 sm:px-8 lg:px-12 py-1">
              {resumeItems.slice(0, 10).map((w) => {
                const pct =
                  w.duration_seconds > 0
                    ? Math.round((w.position_seconds / w.duration_seconds) * 100)
                    : 20;
                const item: MediaItem = {
                  id: w.content_id,
                  subjectId: w.content_id,
                  slug: w.slug,
                  title: w.title,
                  poster: w.poster,
                  type: w.media_type === 'series' ? 'series' : 'movie',
                  source: w.provider,
                  genres: [],
                };
                return (
                  <div
                    key={`cin-cw-${w.content_id}-${w.season}-${w.episode}`}
                    className="w-[230px] sm:w-[260px] shrink-0"
                  >
                    <CinematicWideCard
                      item={item}
                      progressPercent={pct}
                      subtitle={
                        w.season > 0 ? `S${w.season}:E${w.episode} · ${pct}%` : `${pct}% watched`
                      }
                      onSelect={onSelectTitle}
                      onPlay={() =>
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
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Top 10 Trending Numbered Rail */}
        {trending.length > 0 && (
          <section className="space-y-2.5">
            <h2 className="font-cinema text-2xl sm:text-3xl tracking-wide uppercase text-white px-4 sm:px-8 lg:px-12">
              Top 10 Trending Today
            </h2>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar px-4 sm:px-8 lg:px-12 py-2">
              {trending.slice(0, 10).map((item, idx) => (
                <CinematicRankCard
                  key={`top10-${item.id}`}
                  item={item}
                  rank={idx + 1}
                  onSelect={onSelectTitle}
                />
              ))}
            </div>
          </section>
        )}

        <CinematicRail
          title="Popular on LUPIN"
          items={popularMovies}
          loading={loading}
          onSelect={onSelectTitle}
        />

        <CinematicRail
          title="New Releases"
          items={latestMovies}
          loading={loading}
          onSelect={onSelectTitle}
        />

        <CinematicRail
          title="Recommended For You"
          items={recommendedForYou}
          loading={loading}
          onSelect={onSelectTitle}
        />

        <CinematicRail
          title="Critically Acclaimed"
          items={topRated}
          loading={loading}
          onSelect={onSelectTitle}
        />

        <CinematicRail
          title="Binge-Worthy TV Series"
          items={popularSeries}
          loading={loading}
          onSelect={onSelectTitle}
        />

        <CinematicRail
          title="Upcoming Releases"
          items={upcomingMovies}
          loading={loading}
          onSelect={onSelectTitle}
        />

        {recentlyWatchedItems.length > 0 && (
          <CinematicRail
            title="Watch It Again"
            items={recentlyWatchedItems}
            onSelect={onSelectTitle}
          />
        )}

        {genreCollections.map((g) => (
          <CinematicRail
            key={`cin-g-${g.id}`}
            title={g.label}
            items={g.items}
            onSelect={onSelectTitle}
          />
        ))}
      </div>
    </div>
  );
}
