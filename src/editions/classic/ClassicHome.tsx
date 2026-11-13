import { useEffect, useMemo, useRef, useState } from 'react';
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
import { FALLBACK_ART } from '../../lib/mediaUtils';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';
import type { EditionShellProps } from '../types';
import { ClassicMediaCard } from './ClassicMediaCard';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';

function ClassicShelf({
  title,
  eyebrow,
  items,
  loading,
  onSelect,
  onQuickPlay,
}: {
  title: string;
  eyebrow?: string;
  items: MediaItem[];
  loading?: boolean;
  onSelect: (item: MediaItem) => void;
  onQuickPlay?: (item: MediaItem) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!loading && items.length === 0) return null;

  const scroll = (dir: -1 | 1) => {
    ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 border-b border-amber-200/10 pb-2">
        <div>
          {eyebrow && (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
              {eyebrow}
            </p>
          )}
          <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-amber-50">
            {title}
          </h2>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={`Scroll ${title} left`}
            className="glass-btn w-8 h-8 rounded-full flex items-center justify-center text-amber-100 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={`Scroll ${title} right`}
            className="glass-btn w-8 h-8 rounded-full flex items-center justify-center text-amber-100 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={ref} className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-[132px] sm:w-[150px] lg:w-[162px] shrink-0 rounded-2xl bg-[#16060c]/85 border border-amber-200/10 p-1.5 animate-pulse"
              >
                <div className="aspect-[2/3] rounded-xl bg-rose-950/40" />
                <div className="p-2 space-y-1.5">
                  <div className="h-3.5 bg-rose-900/40 rounded w-4/5" />
                  <div className="h-2.5 bg-rose-900/30 rounded w-1/2" />
                </div>
              </div>
            ))
          : items.map((item) => (
              <div
                key={`${item.source}-${item.id}-${item.slug}`}
                className="w-[132px] sm:w-[150px] lg:w-[162px] shrink-0 snap-start"
              >
                <ClassicMediaCard item={item} onSelect={onSelect} onQuickPlay={onQuickPlay} />
              </div>
            ))}
      </div>
    </section>
  );
}

export function ClassicHome({
  onSelectTitle,
  onPlayTarget,
  onNavigateSection,
}: Pick<EditionShellProps, 'onSelectTitle' | 'onPlayTarget' | 'onNavigateSection'>) {
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
  const [editorialTab, setEditorialTab] = useState<
    'popular' | 'latest' | 'series' | 'top_rated' | 'upcoming' | 'recommended'
  >('popular');
  const [activeGenreId, setActiveGenreId] = useState<string>('');

  const featuredPool = trending.slice(0, 5);
  const heroItem = featuredPool[heroIdx] || null;

  useEffect(() => {
    if (!activeGenreId && genreCollections[0]) {
      setActiveGenreId(genreCollections[0].id);
    }
  }, [genreCollections, activeGenreId]);

  useEffect(() => {
    if (featuredPool.length <= 1) return;
    const t = window.setInterval(() => {
      setHeroIdx((i) => (i + 1) % featuredPool.length);
    }, 8000);
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
    const seenIds = new Set([
      ...watchProgress.map((w) => w.content_id),
      ...library.map((l) => l.item_id),
    ]);
    const filtered = recommended.filter((item) => !seenIds.has(item.id));
    return filtered.length >= 6 ? filtered : recommended;
  }, [recommended, library, watchProgress]);

  const editorialItems =
    editorialTab === 'popular'
      ? popularMovies
      : editorialTab === 'latest'
        ? latestMovies
        : editorialTab === 'series'
          ? popularSeries
          : editorialTab === 'top_rated'
            ? topRated
            : editorialTab === 'upcoming'
              ? upcomingMovies
              : recommendedForYou;

  const activeGenre = genreCollections.find((g) => g.id === activeGenreId) || genreCollections[0];

  return (
    <div className="space-y-12">
      {/* Asymmetric Velvet Salon Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 relative rounded-3xl overflow-hidden glass-surface-elevated min-h-[380px] sm:min-h-[450px] flex items-end">
          <img
            src={heroItem?.backdrop || heroItem?.poster || FALLBACK_ART.cinemaHero}
            alt={heroItem?.title || 'Editorial Premiere'}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090306] via-[#090306]/60 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090306]/95 via-[#18070d]/55 to-transparent" />

          <div className="relative z-10 w-full p-6 sm:p-9 space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-300/90 tabular-nums">
              {heroItem
                ? [
                    'Premiere Folio',
                    heroItem.year ? String(heroItem.year) : null,
                    heroItem.type === 'series' ? 'Limited & Multi-Season' : 'Feature Cinema',
                    heroItem.rating ? `★ ${heroItem.rating}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'LUPIN SALON · CURATED SCREENINGS'}
            </p>
            <h1 className="font-editorial text-4xl sm:text-6xl font-semibold text-amber-50 leading-[0.98] text-balance">
              {heroItem ? heroItem.title : 'Evening Screenings & Rare Stories'}
            </h1>
            <p className="text-sm text-rose-100/75 line-clamp-2 max-w-xl leading-relaxed">
              {heroItem?.description ||
                'An editorial screening room uniting feature cinema, episodic television, anime reels, live broadcasts, and literary serials.'}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {heroItem ? (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectTitle(heroItem)}
                    className="glass-btn-primary h-11 px-6 rounded-full text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Enter Screening</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTitle(heroItem)}
                    className="glass-btn h-11 px-5 rounded-full text-sm font-medium text-amber-100 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Info className="w-4 h-4" />
                    <span>Dossier</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateSection('discover')}
                  className="glass-btn-primary h-11 px-6 rounded-full text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Browse Folio</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setAppearanceModalOpen(true)}
                className="glass-btn h-11 px-4 rounded-full text-xs font-medium text-amber-200/90 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>Editions</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Editorial Screening Program */}
        <aside className="lg:col-span-4 glass-surface rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="border-b border-amber-200/15 pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
              Program Notes
            </p>
            <h2 className="font-editorial text-2xl font-semibold italic text-amber-50 mt-0.5">
              Tonight’s Screening Room
            </h2>
          </div>

          <div className="space-y-2.5 flex-1">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-rose-950/35 animate-pulse" />
              ))
            ) : (
              featuredPool.slice(0, 4).map((item, idx) => (
                <button
                  key={`ed-prog-${item.id}`}
                  type="button"
                  onClick={() => {
                    setHeroIdx(idx);
                    onSelectTitle(item);
                  }}
                  className={`w-full p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                    idx === heroIdx
                      ? 'bg-rose-950/45 border-amber-300/45'
                      : 'bg-black/25 border-amber-200/10 hover:border-amber-200/30'
                  }`}
                >
                  <span className="font-editorial italic text-xl font-semibold text-amber-300/85 w-6 text-center shrink-0 tabular-nums">
                    {idx + 1}.
                  </span>
                  <img
                    src={item.poster || FALLBACK_ART.cinemaHero}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-9 h-12 rounded-lg object-cover shrink-0 border border-amber-200/15"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-editorial text-base font-semibold text-amber-50 truncate leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-rose-100/60 truncate tabular-nums">
                      {[item.year, item.rating ? `★ ${item.rating}` : null].filter(Boolean).join(' · ') || 'Premiere'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          <p className="text-[11px] text-rose-100/55 italic font-editorial text-right">
            Curated live from FRAMEX collections
          </p>
        </aside>
      </section>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void refresh()} />}

      {/* Continue Watching */}
      {resumeItems.length > 0 && (
        <section className="space-y-3">
          <div className="border-b border-amber-200/10 pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
              In Progress
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-amber-50">
              Continue Your Screening
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
            {resumeItems.slice(0, 7).map((w) => {
              const pct =
                w.duration_seconds > 0
                  ? Math.round((w.position_seconds / w.duration_seconds) * 100)
                  : 20;
              return (
                <ClassicMediaCard
                  key={`cl-cw-${w.content_id}-${w.season}-${w.episode}`}
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

      {/* Trending Shelf */}
      <ClassicShelf
        eyebrow="Box Office & Buzz"
        title="Trending Cinema"
        items={trending}
        loading={loading}
        onSelect={onSelectTitle}
      />

      {/* Interactive Salon Archive Switcher (Grid Showcase) */}
      <section className="glass-surface rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-amber-200/15 pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
              Curated Folio
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-amber-50">
              Editorial Selections
            </h2>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'popular', label: 'Popular' },
              { id: 'latest', label: 'Latest' },
              { id: 'series', label: 'TV Series' },
              { id: 'top_rated', label: 'Top Rated' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'recommended', label: 'Recommended' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEditorialTab(t.id as typeof editorialTab)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  editorialTab === t.id
                    ? 'glass-btn-primary text-white'
                    : 'glass-btn text-amber-100/75'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
          {loading
            ? Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl bg-rose-950/35 animate-pulse" />
              ))
            : editorialItems.slice(0, 14).map((item) => (
                <ClassicMediaCard
                  key={`ed-grid-${editorialTab}-${item.id}-${item.slug}`}
                  item={item}
                  onSelect={onSelectTitle}
                />
              ))}
        </div>
      </section>

      {/* Portals Trio */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigateSection('anime')}
          className="group relative h-44 rounded-3xl overflow-hidden border border-amber-200/20 text-left p-6 flex flex-col justify-end cursor-pointer"
        >
          <img
            src={FALLBACK_ART.animeShowcase}
            alt="Anime Salon"
            className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090306] via-[#090306]/55 to-transparent" />
          <div className="relative z-10 space-y-1">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              AnimeX & Gotaku
            </span>
            <h3 className="font-editorial text-2xl font-semibold text-white">Anime Salon</h3>
            <p className="text-xs text-rose-100/70">Sub, Dub & Multi-Server Streams</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('live')}
          className="group relative h-44 rounded-3xl overflow-hidden border border-amber-200/20 text-left p-6 flex flex-col justify-end cursor-pointer"
        >
          <img
            src={FALLBACK_ART.sportsArena}
            alt="Live Broadcasts"
            className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090306] via-[#090306]/55 to-transparent" />
          <div className="relative z-10 space-y-1">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-300">
              <Radio className="w-3.5 h-3.5" />
              TVGarden & GoalNivo
            </span>
            <h3 className="font-editorial text-2xl font-semibold text-white">Live & Sports</h3>
            <p className="text-xs text-rose-100/70">Global Channels, Matches & Wrestling</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('novels')}
          className="group relative h-44 rounded-3xl overflow-hidden border border-amber-200/20 text-left p-6 flex flex-col justify-end cursor-pointer"
        >
          <img
            src={FALLBACK_ART.novelCover}
            alt="Literary Novels"
            className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090306] via-[#090306]/55 to-transparent" />
          <div className="relative z-10 space-y-1">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-300">
              <BookOpen className="w-3.5 h-3.5" />
              NovelHub & Store
            </span>
            <h3 className="font-editorial text-2xl font-semibold text-white">Literary Folio</h3>
            <p className="text-xs text-rose-100/70">Chapters, Rankings & Synced Reading</p>
          </div>
        </button>
      </section>

      {/* Recently Watched */}
      {recentlyWatchedItems.length > 0 && (
        <section className="space-y-3">
          <div className="border-b border-amber-200/10 pb-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
              History
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-amber-50">
              Recently Watched
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {recentlyWatchedItems.map(({ item, pct, subtitle }) => (
              <div
                key={`cl-rec-${item.id}-${subtitle}`}
                className="w-[132px] sm:w-[150px] lg:w-[162px] shrink-0"
              >
                <ClassicMediaCard
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

      {/* Interactive Genre Salon */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-amber-200/15 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
              Genre Index
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-amber-50">
              Curated by Mood & Genre
            </h2>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {genreCollections.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGenreId(g.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                  activeGenre?.id === g.id
                    ? 'glass-btn-primary text-white'
                    : 'glass-btn text-amber-100/75'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {genresLoading && genreCollections.length === 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-rose-950/35 animate-pulse" />
            ))}
          </div>
        ) : activeGenre ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
            {activeGenre.items.slice(0, 14).map((item) => (
              <ClassicMediaCard
                key={`cl-genre-${activeGenre.id}-${item.id}`}
                item={item}
                onSelect={onSelectTitle}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
