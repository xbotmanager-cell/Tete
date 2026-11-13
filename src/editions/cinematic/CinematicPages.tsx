import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Play,
  Search,
  Server,
  X,
} from 'lucide-react';
import { apiFetch, buildQuery } from '../../lib/api';
import { extractArray, FALLBACK_ART } from '../../lib/mediaUtils';
import { DISCOVER_TABS, useDiscoverEngine, type CatalogTab } from '../../hooks/useDiscoverEngine';
import { useAuth } from '../../context/AuthContext';
import type { ActivePlaybackTarget, MediaItem, PlayerEpisodeOption } from '../../types/framex';
import { CinematicPosterCard } from './CinematicMediaCard';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';

export function CinematicDiscover({
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

  return (
    <div className="pt-20 sm:pt-24 pb-12 px-4 sm:px-8 lg:px-12 space-y-6">
      {/* Theatrical Billboard Filter Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-neutral-800 pb-5">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#e50914]">
            {provider === 'v1' ? 'MOVIEBOX ARCHIVE' : 'SHOWBOX ARCHIVE'}
          </p>
          <h1 className="font-cinema text-4xl sm:text-6xl uppercase tracking-wide text-white leading-none">
            {focusType === 'movies'
              ? 'Movies'
              : focusType === 'series'
                ? 'TV Shows'
                : 'Explore Catalog'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titles, genres, cast…"
              className="w-full h-9 pl-9 pr-8 rounded bg-[#141414] border border-neutral-700 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            aria-label="Filter by genre"
            value={selectedGenre}
            onChange={(e) => {
              setSelectedGenre(e.target.value);
              setSelectedCategory('');
              setPage(1);
            }}
            className="h-9 px-3 rounded bg-[#141414] border border-neutral-700 text-xs text-white"
          >
            <option value="">Genres</option>
            {genres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by category"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedGenre('');
              setPage(1);
            }}
            className="h-9 px-3 rounded bg-[#141414] border border-neutral-700 text-xs text-white"
          >
            <option value="">Categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded bg-[#141414] border border-neutral-700 p-0.5">
            <button
              type="button"
              onClick={() => {
                setProvider('v1');
                setSelectedGenre('');
                setSelectedCategory('');
                setPage(1);
              }}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                provider === 'v1' ? 'bg-[#e50914] text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              MovieBox
            </button>
            <button
              type="button"
              onClick={() => {
                setProvider('v2');
                setSelectedGenre('');
                setSelectedCategory('');
                setPage(1);
              }}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                provider === 'v2' ? 'bg-[#e50914] text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Showbox
            </button>
          </div>
        </div>
      </div>

      {!debouncedQuery && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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
              className={`px-4 py-1.5 rounded text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                !selectedGenre && !selectedCategory && activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'bg-[#141414] text-neutral-300 border border-neutral-800 hover:border-neutral-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void fetchCatalog()} />}

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-md bg-neutral-900 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg bg-[#141414] border border-neutral-800 p-14 text-center text-sm text-neutral-400">
          No titles matched this filter.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5">
          {items.map((item) => (
            <CinematicPosterCard
              key={`${item.source}-${item.id}-${item.slug}`}
              item={item}
              onSelect={onSelectTitle}
            />
          ))}
        </div>
      )}

      {activeTab !== 'upcoming' && items.length > 0 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-9 px-4 rounded bg-[#141414] border border-neutral-700 text-xs font-semibold text-white inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <span className="font-mono text-xs text-neutral-400 tabular-nums">Page {page}</span>
          <button
            type="button"
            disabled={loading || items.length < 10}
            onClick={() => setPage((p) => p + 1)}
            className="h-9 px-4 rounded bg-[#141414] border border-neutral-700 text-xs font-semibold text-white inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

const ANIME_PRESETS = ['One Piece', 'Jujutsu Kaisen', 'Solo Leveling', 'Demon Slayer', 'Naruto'];

export function CinematicAnime({ onPlay }: { onPlay: (target: ActivePlaybackTarget) => void }) {
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

  const openAnime = async (item: NonNullable<typeof selected>) => {
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
      subtitle: `Episode ${ep.number} · ${engine === 'animex' ? subOrDub.toUpperCase() : 'Gotaku'}`,
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
    <div className="pt-20 sm:pt-24 pb-12 px-4 sm:px-8 lg:px-12 space-y-6">
      {/* Theatrical Anime Banner */}
      <section className="relative rounded-lg overflow-hidden bg-[#141414] border border-white/10 p-6 sm:p-8">
        <img
          src={FALLBACK_ART.animeShowcase}
          alt="Anime Theater"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040404] via-[#040404]/85 to-transparent" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e50914]">
                ANIME THEATER · {engine.toUpperCase()}
              </p>
              <h1 className="font-cinema text-4xl sm:text-6xl uppercase tracking-wide text-white leading-none">
                Anime Collection
              </h1>
            </div>
            <div className="inline-flex rounded bg-black/80 border border-neutral-700 p-0.5 self-start">
              {(['animex', 'gotaku'] as const).map((eng) => (
                <button
                  key={eng}
                  type="button"
                  onClick={() => {
                    setEngine(eng);
                    setSelected(null);
                  }}
                  className={`px-4 py-1.5 rounded text-xs font-bold uppercase cursor-pointer ${
                    engine === eng ? 'bg-[#e50914] text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {eng === 'animex' ? 'AnimeX (Sub/Dub)' : 'Gotaku'}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void searchAnime(query);
            }}
            className="flex flex-col sm:flex-row gap-2 max-w-2xl"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anime series…"
                className="w-full h-10 pl-9 pr-3 rounded bg-black/85 border border-neutral-700 text-sm text-white placeholder:text-neutral-500"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-6 rounded bg-[#e50914] hover:bg-[#f40612] text-sm font-bold text-white cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {ANIME_PRESETS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQuery(q);
                  void searchAnime(q);
                }}
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white whitespace-nowrap cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void searchAnime(query)} />}

      {/* Selected Anime Episode Shelf */}
      {selected && (
        <section className="rounded-lg bg-[#141414] border border-white/10 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-4">
              <img
                src={selected.poster || FALLBACK_ART.animeShowcase}
                alt={selected.title}
                referrerPolicy="no-referrer"
                className="w-16 aspect-[2/3] rounded object-cover shrink-0"
              />
              <div>
                <h2 className="font-cinema text-3xl uppercase tracking-wide text-white">
                  {selected.title}
                </h2>
                <p className="text-xs text-neutral-400 tabular-nums">
                  {episodes.length} Episodes · {engine.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {engine === 'animex' && (
                <>
                  <div className="inline-flex rounded bg-black border border-neutral-700 p-0.5">
                    {(['sub', 'dub'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSubOrDub(t)}
                        className={`px-3 py-1 rounded text-xs font-bold uppercase cursor-pointer ${
                          subOrDub === t ? 'bg-white text-black' : 'text-neutral-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {servers.length > 0 && (
                    <div className="inline-flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-[#e50914]" />
                      <select
                        value={selectedServer}
                        onChange={(e) => setSelectedServer(e.target.value)}
                        className="h-8 px-2.5 rounded bg-black border border-neutral-700 text-xs text-white"
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
                    </div>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded bg-neutral-800 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loadingEps ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#e50914]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {episodes.map((ep) => {
                const prog = getWatchProgress(
                  engine === 'animex' ? selected.contentId : ep.id,
                  0,
                  ep.number
                );
                const pct =
                  prog && prog.duration_seconds > 0
                    ? Math.min(100, Math.round((prog.position_seconds / prog.duration_seconds) * 100))
                    : prog && prog.position_seconds > 5
                      ? 15
                      : 0;
                const isWatched =
                  Boolean(prog) &&
                  ((prog!.duration_seconds > 0 &&
                    prog!.position_seconds >= prog!.duration_seconds - 15) ||
                    pct >= 90);
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => playEp(selected, episodes, ep)}
                    className="relative overflow-hidden rounded bg-[#1c1c1c] hover:bg-[#262626] border border-white/5 p-3 flex items-center justify-between gap-2 text-left cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="font-cinema text-lg text-[#e50914] tabular-nums">
                        EP {ep.number}
                      </span>
                      <p className="text-xs font-medium text-white truncate">
                        {ep.title || `Episode ${ep.number}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isWatched ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : pct > 0 ? (
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      ) : null}
                      <Play className="w-4 h-4 text-white fill-current" />
                    </div>
                    {pct > 0 && (
                      <div className="absolute bottom-0 inset-x-0 h-0.5 bg-neutral-800">
                        <div className="h-full bg-[#e50914]" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Results Poster Grid */}
      {loadingList ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-md bg-neutral-900 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2.5">
          {results.map((item) => (
            <button
              key={item.contentId}
              type="button"
              onClick={() => void openAnime(item)}
              className="group relative rounded-md overflow-hidden bg-[#141414] text-left cursor-pointer transition-transform duration-200 hover:scale-[1.05] hover:z-10"
            >
              <div className="aspect-[2/3] w-full overflow-hidden">
                <img
                  src={item.poster || FALLBACK_ART.animeShowcase}
                  alt={item.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                <p className="text-[10px] text-neutral-400 tabular-nums">
                  {item.year || 'ANIME'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
