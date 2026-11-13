import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Info,
  LayoutTemplate,
  Play,
  Radio,
  Sparkles,
} from 'lucide-react';
import { FALLBACK_ART } from '../lib/mediaUtils';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import type { AppRoute } from '../components/Navbar';
import type { ActivePlaybackTarget, MediaItem } from '../types/framex';
import { MediaCarousel } from '../components/MediaCarousel';
import { MediaCard } from '../components/MediaCard';
import { DomainNoticeBanner } from '../components/DomainNoticeBanner';

interface HomePageProps {
  onSelectTitle: (item: MediaItem) => void;
  onPlayTarget: (target: ActivePlaybackTarget) => void;
  onNavigate: (route: AppRoute) => void;
}

export function HomePage({ onSelectTitle, onPlayTarget, onNavigate }: HomePageProps) {
  const { watchProgress, library, setAppearanceModalOpen } = useAuth();
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
    genresLoading,
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
    }, 7500);
    return () => window.clearInterval(t);
  }, [featuredPool.length]);

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
    const list: Array<{ item: MediaItem; pct: number; subtitle: string }> = [];
    for (const w of watchProgress) {
      if (seen.has(w.content_id)) continue;
      seen.add(w.content_id);
      const pct =
        w.duration_seconds > 0
          ? Math.min(100, Math.round((w.position_seconds / w.duration_seconds) * 100))
          : 15;
      list.push({
        item: {
          id: w.content_id,
          subjectId: w.content_id,
          slug: w.slug,
          title: w.title,
          poster: w.poster,
          type: w.media_type === 'series' ? 'series' : 'movie',
          source: w.provider,
          genres: [],
        },
        pct,
        subtitle: w.season > 0 ? `S${w.season} E${w.episode} · ${pct}%` : `${pct}% watched`,
      });
      if (list.length >= 10) break;
    }
    return list;
  }, [watchProgress]);

  const recommendedForYou = useMemo(() => {
    if (library.length === 0 && watchProgress.length === 0) return recommended;
    const watchedIds = new Set([
      ...watchProgress.map((w) => w.content_id),
      ...library.map((l) => l.item_id),
    ]);
    const filtered = recommended.filter((item) => !watchedIds.has(item.id));
    return filtered.length >= 6 ? filtered : recommended;
  }, [recommended, library, watchProgress]);

  return (
    <div className="space-y-9 sm:space-y-11">
      {/* Classic Edition Featured Hero */}
      <section className="relative rounded-3xl overflow-hidden glass-surface-elevated min-h-[360px] sm:min-h-[430px] lg:min-h-[480px] flex items-end">
        <img
          src={heroItem?.backdrop || heroItem?.poster || FALLBACK_ART.cinemaHero}
          alt={heroItem?.title || 'LUPIN MOVIES Featured Cinema'}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080305] via-[#080305]/65 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080305]/95 via-[#18070d]/55 to-transparent" />

        <div className="relative z-10 w-full p-6 sm:p-10 lg:p-11 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs sm:text-sm font-medium text-amber-200/90 tracking-wide">
              {heroItem
                ? [
                    'Featured Premiere',
                    heroItem.year ? String(heroItem.year) : null,
                    heroItem.type === 'series' ? 'TV Series' : 'Movie',
                    heroItem.rating ? `★ ${heroItem.rating}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'LUPIN MOVIES · Curated Cinema & Live Entertainment'}
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-white leading-[1.08] text-balance">
              {heroItem ? heroItem.title : 'Cinema, Anime, Live Broadcasts & Stories'}
            </h1>
            <p className="text-sm sm:text-base text-rose-100/75 line-clamp-3 max-w-xl leading-relaxed">
              {heroItem?.description ||
                'Stream trending films, multi-season series, subbed and dubbed anime, live international television, football analytics, and serialized fiction from one obsidian-burgundy interface.'}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {heroItem ? (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectTitle(heroItem)}
                    className="glass-btn-primary h-11 px-6 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTitle(heroItem)}
                    className="glass-btn h-11 px-5 rounded-xl text-sm font-medium text-white inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <Info className="w-4 h-4" />
                    <span>Details</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('discover')}
                  className="glass-btn-primary h-11 px-6 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Compass className="w-4 h-4" />
                  <span>Explore Catalog</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setAppearanceModalOpen(true)}
                className="glass-btn h-11 px-4 rounded-xl text-sm font-medium text-rose-100 hover:text-white inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <LayoutTemplate className="w-4 h-4" />
                <span>Switch Layout</span>
              </button>
            </div>
          </div>

          {/* Hero Carousel Controls */}
          {featuredPool.length > 1 && (
            <div className="flex items-center gap-2 self-start md:self-end shrink-0">
              <button
                type="button"
                onClick={() =>
                  setHeroIdx((i) => (i - 1 + featuredPool.length) % featuredPool.length)
                }
                aria-label="Previous featured title"
                className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                {featuredPool.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setHeroIdx(i)}
                    aria-label={`Select featured slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === heroIdx ? 'w-7 bg-rose-500' : 'w-2 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setHeroIdx((i) => (i + 1) % featuredPool.length)}
                aria-label="Next featured title"
                className="glass-btn w-10 h-10 rounded-xl flex items-center justify-center text-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void refresh()} />}

      {/* Continue Watching */}
      {resumeItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg sm:text-xl font-semibold text-white">
            Continue Watching
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
            {resumeItems.slice(0, 7).map((w) => {
              const pct =
                w.duration_seconds > 0
                  ? Math.round((w.position_seconds / w.duration_seconds) * 100)
                  : 20;
              return (
                <MediaCard
                  key={`${w.content_id}-${w.season}-${w.episode}`}
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
                  progressPercent={pct}
                  subtitleOverride={
                    w.season > 0 ? `S${w.season} E${w.episode} · ${pct}%` : `${pct}% watched`
                  }
                  onSelect={(item) => onSelectTitle(item)}
                  onQuickPlay={() =>
                    onPlayTarget({
                      mode:
                        w.provider === 'animex'
                          ? 'hls'
                          : w.provider === 'gotaku'
                            ? 'embed'
                            : 'direct',
                      title: w.title,
                      subtitle: w.season > 0 ? `Season ${w.season} · Episode ${w.episode}` : undefined,
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

      {/* Organized Primary Collections */}
      <MediaCarousel
        title="Trending Movies"
        subtitle="Most watched titles right now"
        items={trending}
        loading={loading}
        onSelect={onSelectTitle}
        actionLabel="Explore all"
        onAction={() => onNavigate('discover')}
      />

      <MediaCarousel
        title="Popular Movies"
        items={popularMovies}
        loading={loading}
        onSelect={onSelectTitle}
      />

      <MediaCarousel
        title="Latest Releases"
        items={latestMovies}
        loading={loading}
        onSelect={onSelectTitle}
      />

      {upcomingMovies.length > 0 && (
        <MediaCarousel
          title="Upcoming Movies"
          items={upcomingMovies}
          loading={loading}
          onSelect={onSelectTitle}
        />
      )}

      {topRated.length > 0 && (
        <MediaCarousel
          title="Top Rated"
          items={topRated}
          loading={loading}
          onSelect={onSelectTitle}
        />
      )}

      <MediaCarousel
        title="Popular TV Series"
        items={popularSeries}
        loading={loading}
        onSelect={onSelectTitle}
      />

      {recommendedForYou.length > 0 && (
        <MediaCarousel
          title="Recommended For You"
          subtitle="Curated picks tailored for your screening queue"
          items={recommendedForYou}
          loading={loading}
          onSelect={onSelectTitle}
        />
      )}

      {recentlyWatchedItems.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="font-display text-lg sm:text-xl font-semibold text-white">
            Recently Watched
          </h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1.5">
            {recentlyWatchedItems.map(({ item, pct, subtitle }) => (
              <div
                key={`recent-${item.id}-${subtitle}`}
                className="w-[126px] sm:w-[144px] lg:w-[156px] xl:w-[164px] shrink-0"
              >
                <MediaCard
                  item={item}
                  progressPercent={pct}
                  subtitleOverride={subtitle}
                  onSelect={onSelectTitle}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Portals: Anime, Live & Sports, Novels */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('anime')}
          className="group relative h-40 rounded-2xl overflow-hidden glass-surface text-left p-5 flex flex-col justify-end cursor-pointer"
        >
          <img
            src={FALLBACK_ART.animeShowcase}
            alt="Anime Center"
            className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080305] via-[#080305]/60 to-transparent" />
          <div className="relative z-10 space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300">
              <Sparkles className="w-3.5 h-3.5" />
              Gotaku & AnimeX
            </span>
            <h3 className="font-display text-lg font-bold text-white">Anime Center</h3>
            <p className="text-xs text-rose-100/70">Sub, Dub & Multi-Server Playback</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('live')}
          className="group relative h-40 rounded-2xl overflow-hidden glass-surface text-left p-5 flex flex-col justify-end cursor-pointer"
        >
          <img
            src={FALLBACK_ART.sportsArena}
            alt="Live TV and Sports"
            className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080305] via-[#080305]/60 to-transparent" />
          <div className="relative z-10 space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-200">
              <Radio className="w-3.5 h-3.5" />
              TVGarden · GoalNivo · Wrestling
            </span>
            <h3 className="font-display text-lg font-bold text-white">Live TV & Sports</h3>
            <p className="text-xs text-rose-100/70">Global Channels, Live Matches & Replays</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('novels')}
          className="group relative h-40 rounded-2xl overflow-hidden glass-surface text-left p-5 flex flex-col justify-end cursor-pointer"
        >
          <img
            src={FALLBACK_ART.novelCover}
            alt="Novel Library"
            className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080305] via-[#080305]/60 to-transparent" />
          <div className="relative z-10 space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-300">
              <BookOpen className="w-3.5 h-3.5" />
              NovelHub & NovelStore
            </span>
            <h3 className="font-display text-lg font-bold text-white">Novel Library</h3>
            <p className="text-xs text-rose-100/70">Chapters, Rankings & Reading Sync</p>
          </div>
        </button>
      </section>

      {/* Genre Collections: Action, Comedy, Horror, Romance, Sci-Fi, Adventure, Animation */}
      {genresLoading && genreCollections.length === 0 ? (
        <MediaCarousel
          title="Genre Collections"
          items={[]}
          loading={true}
          onSelect={onSelectTitle}
        />
      ) : (
        genreCollections.map((genre) => (
          <MediaCarousel
            key={genre.id}
            title={genre.label}
            items={genre.items}
            onSelect={onSelectTitle}
          />
        ))
      )}
    </div>
  );
}
