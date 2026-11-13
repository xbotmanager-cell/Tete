import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Loader2,
  Play,
  Search,
  Table as TableIcon,
  X,
} from 'lucide-react';
import { apiFetch, buildQuery } from '../../lib/api';
import { extractArray, FALLBACK_ART } from '../../lib/mediaUtils';
import { DISCOVER_TABS, useDiscoverEngine, type CatalogTab } from '../../hooks/useDiscoverEngine';
import { useAuth } from '../../context/AuthContext';
import type { ActivePlaybackTarget, MediaItem, PlayerEpisodeOption } from '../../types/framex';
import { SidebarGridCard, SidebarTableRow } from './SidebarMediaCard';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';

export function SidebarDiscover({
  onSelectTitle,
  initialTab = 'trending',
  initialQuery = '',
  focusType = 'all',
}: {
  onSelectTitle: (item: MediaItem) => void;
  initialTab?: CatalogTab;
  initialQuery?: string;
  focusType?: 'all' | 'movies' | 'series';
}) {
  const {
    provider,
    setProvider,
    activeTab,
    setActiveTab,
    query,
    setQuery,
    debouncedQuery,
    selectedGenre,
    setSelectedGenre,
    selectedCategory,
    setSelectedCategory,
    genres,
    categories,
    page,
    setPage,
    items,
    loading,
    error,
    visibleTabs,
    fetchCatalog,
  } = useDiscoverEngine({ initialTab, initialQuery, focusType });

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-zinc-800 bg-[#0c0c0f] p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-400">
              CATALOG_INDEX · {provider === 'v1' ? 'MOVIEBOX_V1' : 'SHOWBOX_V2'}
            </p>
            <h1 className="font-console text-xl sm:text-2xl font-bold text-white">
              {focusType === 'movies'
                ? 'Movies Repository'
                : focusType === 'series'
                  ? 'TV Series Repository'
                  : 'Unified Media Catalog'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 rounded-md bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setProvider('v1');
                  setSelectedGenre('');
                  setSelectedCategory('');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-xs font-mono cursor-pointer ${
                  provider === 'v1' ? 'bg-white text-black font-semibold' : 'text-zinc-400'
                }`}
              >
                v1 MovieBox
              </button>
              <button
                type="button"
                onClick={() => {
                  setProvider('v2');
                  setSelectedGenre('');
                  setSelectedCategory('');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-xs font-mono cursor-pointer ${
                  provider === 'v2' ? 'bg-white text-black font-semibold' : 'text-zinc-400'
                }`}
              >
                v2 Showbox
              </button>
            </div>

            <div className="inline-flex p-0.5 rounded-md bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`p-1.5 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label="Table view"
                className={`p-1.5 rounded cursor-pointer ${viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Inline Query + Filter Strip */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter or search catalog…"
              className="w-full h-9 pl-9 pr-8 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by genre"
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                setSelectedCategory('');
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
            >
              <option value="">All Genres</option>
              {genres.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by category"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedGenre('');
                setPage(1);
              }}
              className="w-full h-9 px-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!debouncedQuery && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(visibleTabs.length > 0 ? visibleTabs : DISCOVER_TABS).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedGenre('');
                  setSelectedCategory('');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-xs font-mono whitespace-nowrap cursor-pointer ${
                  !selectedGenre && !selectedCategory && activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-white border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void fetchCatalog()} />}

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-lg bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5">
          {items.map((item) => (
            <SidebarGridCard
              key={`${item.source}-${item.id}-${item.slug}`}
              item={item}
              onSelect={onSelectTitle}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-[#0c0c0f] overflow-x-auto">
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
              {items.map((item) => (
                <SidebarTableRow
                  key={`tbl-${item.source}-${item.id}-${item.slug}`}
                  item={item}
                  onSelect={onSelectTitle}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab !== 'upcoming' && items.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 px-3 rounded border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-200 inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>
          <span className="font-mono text-xs text-zinc-400 px-2 tabular-nums">PAGE {page}</span>
          <button
            type="button"
            disabled={loading || items.length < 10}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 px-3 rounded border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-200 inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* Split Master-Detail Anime Studio Console */
export function SidebarAnime({ onPlay }: { onPlay: (target: ActivePlaybackTarget) => void }) {
  const { getWatchProgress } = useAuth();
  const [engine, setEngine] = useState<'animex' | 'gotaku'>('animex');
  const [query, setQuery] = useState('One Piece');
  const [results, setResults] = useState<
    Array<{ contentId: string; title: string; poster?: string | null; year?: string | number; description?: string }>
  >([]);
  const [selected, setSelected] = useState<{
    contentId: string;
    title: string;
    poster?: string | null;
    year?: string | number;
    description?: string;
  } | null>(null);
  const [episodes, setEpisodes] = useState<
    Array<{ id: string; number: number; title?: string; thumbnail?: string | null; duration?: string | null; hasDub?: boolean }>
  >([]);
  const [subOrDub, setSubOrDub] = useState<'sub' | 'dub'>('sub');
  const [servers, setServers] = useState<Array<{ id: string; name: string; type: 'sub' | 'dub' }>>([]);
  const [selectedServer, setSelectedServer] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingEps, setLoadingEps] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const searchAnime = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setLoadingList(true);
      setError(null);
      try {
        const endpoint =
          engine === 'animex' ? '/api/fx/anime/animex/search' : '/api/fx/anime/gotaku/search';
        const res = await apiFetch(`${endpoint}${buildQuery({ q: q.trim(), limit: 24 })}`);
        const list = extractArray(res)
          .map((raw) => ({
            contentId: String(raw.contentId || raw.id || raw.slug || ''),
            title: String(raw.title || raw.name || 'Untitled Anime'),
            poster: (raw.poster || raw.image || raw.cover || null) as string | null,
            year: raw.year as string | number | undefined,
            description: raw.description ? String(raw.description) : undefined,
          }))
          .filter((x) => x.contentId);
        setResults(list);
        if (list[0] && !selected) {
          void openAnime(list[0]);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoadingList(false);
      }
    },
    [engine]
  );

  useEffect(() => {
    void searchAnime(query);
  }, [engine]);

  const loadServers = async (contentId: string, epNum: string) => {
    try {
      const res = await apiFetch<Record<string, unknown>>(
        `/api/fx/anime/animex/providers${buildQuery({ contentId, episode: epNum })}`
      );
      const list: Array<{ id: string; name: string; type: 'sub' | 'dub' }> = [];
      for (const s of (Array.isArray(res?.sub) ? res.sub : []) as Array<Record<string, unknown>>) {
        list.push({ id: String(s.providerId || s.id || s.name), name: String(s.name || s.id || 'Server'), type: 'sub' });
      }
      for (const d of (Array.isArray(res?.dub) ? res.dub : []) as Array<Record<string, unknown>>) {
        list.push({ id: String(d.providerId || d.id || d.name), name: String(d.name || d.id || 'Server'), type: 'dub' });
      }
      setServers(list);
      const match = list.find((s) => s.type === subOrDub) || list[0];
      setSelectedServer(match?.id || '');
    } catch {
      setServers([]);
    }
  };

  const openAnime = async (item: typeof selected) => {
    if (!item) return;
    setSelected(item);
    setEpisodes([]);
    setLoadingEps(true);
    try {
      const url =
        engine === 'animex'
          ? `/api/fx/anime/animex/episodes${buildQuery({ contentId: item.contentId })}`
          : `/api/fx/anime/gotaku/episodes${buildQuery({ contentId: item.contentId })}`;
      const res = await apiFetch(url);
      const eps = extractArray(res).map((ep, idx) => ({
        id: String(ep.episodeId || ep.episode || ep.id || idx + 1),
        number: Number(ep.number ?? ep.episode ?? idx + 1),
        title: ep.title ? String(ep.title) : `Episode ${ep.number ?? ep.episode ?? idx + 1}`,
        thumbnail: (ep.thumbnail || ep.image || ep.cover || null) as string | null,
        duration: ep.duration ? String(ep.duration) : null,
        hasDub: Boolean(ep.hasDub || ep.dub),
      }));
      setEpisodes(eps);
      if (engine === 'animex' && eps[0]) {
        void loadServers(item.contentId, String(eps[0].number));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoadingEps(false);
    }
  };

  const playEp = (
    anime: NonNullable<typeof selected>,
    epList: typeof episodes,
    ep: (typeof episodes)[number]
  ) => {
    const idx = epList.findIndex((x) => x.number === ep.number);
    const prev = idx > 0 ? epList[idx - 1] : null;
    const next = idx >= 0 && idx < epList.length - 1 ? epList[idx + 1] : null;
    const playerEps: PlayerEpisodeOption[] = epList.map((e) => ({
      id: e.id,
      episode: e.number,
      title: e.title,
      thumbnail: e.thumbnail,
      duration: e.duration ?? undefined,
    }));

    onPlay({
      mode: engine === 'animex' ? 'hls' : 'embed',
      title: anime.title,
      subtitle: `EP ${ep.number} · ${engine === 'animex' ? subOrDub.toUpperCase() : 'Gotaku'}`,
      poster: anime.poster,
      provider: engine,
      contentId: engine === 'animex' ? anime.contentId : ep.id,
      mediaType: 'anime',
      episode: ep.number,
      animeType: engine === 'animex' ? subOrDub : 'hard_sub',
      animeProviderId: selectedServer || undefined,
      episodes: playerEps,
      hasPrevEpisode: Boolean(prev),
      onPrevEpisode: prev ? () => playEp(anime, epList, prev) : undefined,
      hasNextEpisode: Boolean(next),
      onNextEpisode: next ? () => playEp(anime, epList, next) : undefined,
      onSelectEpisode: (chosen) => {
        const found = epList.find((x) => x.number === chosen.episode) || epList[0];
        if (found) playEp(anime, epList, found);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800 bg-[#0c0c0f] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-400">
            ANIME_STUDIO · SPLIT_CONSOLE
          </p>
          <h1 className="font-console text-xl font-bold text-white">Anime Directory & Episodes</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-0.5 rounded bg-zinc-950 border border-zinc-800">
            {(['animex', 'gotaku'] as const).map((eng) => (
              <button
                key={eng}
                type="button"
                onClick={() => {
                  setEngine(eng);
                  setSelected(null);
                }}
                className={`px-3 py-1 rounded text-xs font-mono uppercase cursor-pointer ${
                  engine === eng ? 'bg-white text-black font-semibold' : 'text-zinc-400'
                }`}
              >
                {eng}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void searchAnime(query);
            }}
            className="flex gap-1.5"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime…"
              className="h-8 px-3 rounded bg-zinc-950 border border-zinc-800 text-xs text-white"
            />
            <button
              type="submit"
              className="h-8 px-3 rounded bg-white text-black text-xs font-semibold cursor-pointer"
            >
              Find
            </button>
          </form>
        </div>
      </div>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void searchAnime(query)} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Master List */}
        <div className="lg:col-span-5 rounded-lg border border-zinc-800 bg-[#0c0c0f] divide-y divide-zinc-800/80 max-h-[680px] overflow-y-auto">
          {loadingList ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.contentId}
                type="button"
                onClick={() => void openAnime(item)}
                className={`w-full p-3 flex items-center gap-3 text-left cursor-pointer transition-colors ${
                  selected?.contentId === item.contentId ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'
                }`}
              >
                <img
                  src={item.poster || FALLBACK_ART.animeShowcase}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-10 h-14 rounded object-cover bg-zinc-950 border border-zinc-800 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-console text-xs font-semibold text-white truncate">
                    {item.title}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                    {item.year || 'ANIME'} · ID {item.contentId}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right Detail & Episodes Matrix */}
        <div className="lg:col-span-7 rounded-lg border border-zinc-800 bg-[#0c0c0f] p-4 space-y-4">
          {!selected ? (
            <p className="text-xs font-mono text-zinc-500 py-12 text-center">
              Select an anime title from the left index to load its episodes.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div>
                  <h2 className="font-console text-lg font-bold text-white">{selected.title}</h2>
                  <p className="font-mono text-[11px] text-zinc-400 tabular-nums">
                    {episodes.length} episodes indexed
                  </p>
                </div>
                {engine === 'animex' && (
                  <div className="flex items-center gap-2">
                    <div className="inline-flex p-0.5 rounded bg-zinc-950 border border-zinc-800">
                      {(['sub', 'dub'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSubOrDub(t)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase cursor-pointer ${
                            subOrDub === t ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-400'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {servers.length > 0 && (
                      <select
                        value={selectedServer}
                        onChange={(e) => setSelectedServer(e.target.value)}
                        className="h-8 px-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-200"
                      >
                        <option value="">Auto Server</option>
                        {servers
                          .filter((s) => s.type === subOrDub)
                          .map((s) => (
                            <option key={`${s.type}-${s.id}`} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {loadingEps ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[540px] overflow-y-auto pr-1">
                  {episodes.map((ep) => {
                    const prog = getWatchProgress(
                      engine === 'animex' ? selected.contentId : ep.id,
                      0,
                      ep.number
                    );
                    const watched =
                      Boolean(prog) &&
                      prog!.duration_seconds > 0 &&
                      prog!.position_seconds >= prog!.duration_seconds - 15;
                    return (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => playEp(selected, episodes, ep)}
                        className="sidebar-card p-2.5 rounded-md flex items-center justify-between gap-2 text-left cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-xs text-cyan-400 block tabular-nums">
                            EP {ep.number}
                          </span>
                          <span className="text-xs text-zinc-200 truncate block">
                            {ep.title || `Episode ${ep.number}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {watched && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          <Play className="w-3.5 h-3.5 text-zinc-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
