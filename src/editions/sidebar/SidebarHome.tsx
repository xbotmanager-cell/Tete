import { useMemo, useState } from 'react';
import {
  LayoutGrid,
  Play,
  Table as TableIcon,
  Info,
  ChevronRight,
  Film,
  Bookmark,
  Clock,
  Sparkles,
} from 'lucide-react';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';
import type { EditionShellProps } from '../types';
import { SidebarGridCard, SidebarTableRow } from './SidebarMediaCard';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';

type CollectionKey =
  | 'trending'
  | 'popular'
  | 'latest'
  | 'upcoming'
  | 'top_rated'
  | 'series'
  | 'recommended'
  | 'recent';

export function SidebarHome({
  onSelectTitle,
  onPlayTarget,
  onNavigateSection,
}: Pick<EditionShellProps, 'onSelectTitle' | 'onPlayTarget' | 'onNavigateSection'>) {
  const { watchProgress, library } = useAuth();
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

  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [activeCollection, setActiveCollection] = useState<CollectionKey>('trending');
  const [selectedGenreId, setSelectedGenreId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const spotlightPool = trending.slice(0, 6);
  const heroItem = spotlightPool[spotlightIdx] || null;

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
      if (list.length >= 14) break;
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

  const collectionMap: Record<CollectionKey, { label: string; items: MediaItem[] }> = {
    trending: { label: 'Trending Movies', items: trending },
    popular: { label: 'Popular Movies', items: popularMovies },
    latest: { label: 'Latest Releases', items: latestMovies },
    upcoming: { label: 'Upcoming Movies', items: upcomingMovies },
    top_rated: { label: 'Top Rated', items: topRated },
    series: { label: 'Popular TV Series', items: popularSeries },
    recommended: { label: 'Recommended For You', items: recommendedForYou },
    recent: { label: 'Recently Watched', items: recentlyWatchedItems },
  };

  const activeGenre = genreCollections.find((g) => g.id === selectedGenreId);
  const displayedItems = activeGenre
    ? activeGenre.items
    : collectionMap[activeCollection].items;
  const displayedHeading = activeGenre
    ? `${activeGenre.label} Collection`
    : collectionMap[activeCollection].label;

  return (
    <div className="space-y-6">
      {/* Top Workspace Metric Tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigateSection('movies')}
          className="sidebar-card rounded-lg p-3.5 text-left flex items-center justify-between cursor-pointer"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Catalog Feed
            </p>
            <p className="font-console text-xl font-bold text-white tabular-nums mt-0.5">
              {trending.length + popularMovies.length + popularSeries.length}
            </p>
          </div>
          <Film className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('library')}
          className="sidebar-card rounded-lg p-3.5 text-left flex items-center justify-between cursor-pointer"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Saved Watchlist
            </p>
            <p className="font-console text-xl font-bold text-white tabular-nums mt-0.5">
              {library.filter((x) => x.list_type === 'watchlist').length}
            </p>
          </div>
          <Bookmark className="w-4 h-4 text-zinc-400" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('library', { libraryTab: 'history' })}
          className="sidebar-card rounded-lg p-3.5 text-left flex items-center justify-between cursor-pointer"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              In Progress
            </p>
            <p className="font-console text-xl font-bold text-white tabular-nums mt-0.5">
              {resumeItems.length}
            </p>
          </div>
          <Clock className="w-4 h-4 text-zinc-400" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateSection('anime')}
          className="sidebar-card rounded-lg p-3.5 text-left flex items-center justify-between cursor-pointer"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              Genre Streams
            </p>
            <p className="font-console text-xl font-bold text-white tabular-nums mt-0.5">
              {genreCollections.length}
            </p>
          </div>
          <Sparkles className="w-4 h-4 text-zinc-400" />
        </button>
      </section>

      {/* Split Console Spotlight + Index Table */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 relative rounded-lg overflow-hidden border border-zinc-800 bg-[#0d0d10] min-h-[280px] flex items-end">
          <img
            src={heroItem?.backdrop || heroItem?.poster || FALLBACK_ART.cinemaHero}
            alt={heroItem?.title || 'Spotlight'}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/70 to-transparent" />
          <div className="relative z-10 p-5 sm:p-6 space-y-2.5 w-full">
            <p className="font-mono text-[11px] uppercase tracking-wider text-cyan-400 tabular-nums">
              {heroItem
                ? [
                    'FEATURED STREAM',
                    heroItem.type === 'series' ? 'SERIES' : 'MOVIE',
                    heroItem.year,
                    heroItem.rating ? `★ ${heroItem.rating}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'CONSOLE READY'}
            </p>
            <h1 className="font-console text-2xl sm:text-4xl font-bold text-white leading-tight">
              {heroItem ? heroItem.title : 'Media Operations & Streaming Console'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 max-w-xl">
              {heroItem?.description ||
                'High-density catalog workbench for browsing cinema, series episodes, anime, live TV, and sports telemetry.'}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {heroItem && (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectTitle(heroItem)}
                    className="h-9 px-4 rounded-md bg-white text-black hover:bg-cyan-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Stream</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTitle(heroItem)}
                    className="h-9 px-3.5 rounded-md border border-zinc-700 bg-zinc-900/90 hover:border-zinc-500 text-xs font-medium text-zinc-100 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Open Inspector</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Structured Index List */}
        <div className="xl:col-span-5 rounded-lg border border-zinc-800 bg-[#0d0d10] flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              Top Trending Index
            </span>
            <button
              type="button"
              onClick={() => onNavigateSection('movies')}
              className="font-mono text-[11px] text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-zinc-800/80 flex-1">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 px-4 flex items-center animate-pulse">
                    <div className="h-3 bg-zinc-800 rounded w-2/3" />
                  </div>
                ))
              : spotlightPool.slice(0, 5).map((item, idx) => (
                  <button
                    key={`idx-${item.id}`}
                    type="button"
                    onClick={() => {
                      setSpotlightIdx(idx);
                      onSelectTitle(item);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      idx === spotlightIdx ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] text-zinc-500 w-4 tabular-nums">
                        0{idx + 1}
                      </span>
                      <span className="text-xs font-medium text-zinc-100 truncate">
                        {item.title}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-cyan-400 shrink-0 tabular-nums">
                      {item.rating ? `★ ${item.rating}` : item.year || 'VIEW'}
                    </span>
                  </button>
                ))}
          </div>
        </div>
      </section>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void refresh()} />}

      {/* Horizontal Landscape Resume Queue */}
      {resumeItems.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-400">
            Resume Playback Queue
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {resumeItems.slice(0, 5).map((w) => {
              const pct =
                w.duration_seconds > 0
                  ? Math.round((w.position_seconds / w.duration_seconds) * 100)
                  : 20;
              return (
                <button
                  key={`sb-res-${w.content_id}-${w.season}-${w.episode}`}
                  type="button"
                  onClick={() =>
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
                  className="sidebar-card rounded-lg overflow-hidden text-left cursor-pointer group"
                >
                  <div className="relative aspect-video w-full bg-zinc-950">
                    <img
                      src={w.poster || FALLBACK_ART.cinemaHero}
                      alt={w.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </span>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-900">
                      <div className="h-full bg-cyan-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="font-console text-xs font-semibold text-zinc-100 truncate">
                      {w.title}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-400 tabular-nums mt-0.5">
                      {w.season > 0 ? `S${w.season} E${w.episode} · ${pct}%` : `${pct}% watched`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Tabbed Collection Workbench (with Grid / Table View Switcher) */}
      <section className="rounded-lg border border-zinc-800 bg-[#0c0c0f] overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(Object.keys(collectionMap) as CollectionKey[]).map((key) => {
              if (key === 'recent' && recentlyWatchedItems.length === 0) return null;
              const active = !selectedGenreId && activeCollection === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedGenreId('');
                    setActiveCollection(key);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? 'bg-white text-black font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/70'
                  }`}
                >
                  {collectionMap[key].label}
                </button>
              );
            })}
          </div>

          {/* Grid vs Data Table Mode Toggle */}
          <div className="inline-flex items-center p-0.5 rounded-md bg-zinc-950 border border-zinc-800 self-start">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`px-2.5 py-1 rounded text-xs inline-flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              className={`px-2.5 py-1 rounded text-xs inline-flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Genre Quick Filter Strip */}
        {genreCollections.length > 0 && (
          <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="font-mono text-[10px] uppercase text-zinc-500 shrink-0">Genres:</span>
            {genreCollections.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGenreId((prev) => (prev === g.id ? '' : g.id))}
                className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap cursor-pointer border ${
                  selectedGenreId === g.id
                    ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                    : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-console text-base font-semibold text-white">
              {displayedHeading}
            </h2>
            <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
              {displayedItems.length} items
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-lg bg-zinc-900 animate-pulse" />
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5">
              {displayedItems.map((item) => (
                <SidebarGridCard
                  key={`sb-wb-${displayedHeading}-${item.id}-${item.slug}`}
                  item={item}
                  onSelect={onSelectTitle}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-950 border-b border-zinc-800 font-mono text-[10px] uppercase text-zinc-500">
                  <tr>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3 hidden sm:table-cell">Type</th>
                    <th className="py-2.5 px-3">Year</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">Source</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedItems.map((item) => (
                    <SidebarTableRow
                      key={`sb-tbl-${displayedHeading}-${item.id}-${item.slug}`}
                      item={item}
                      onSelect={onSelectTitle}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
