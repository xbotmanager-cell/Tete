import { useCallback, useEffect, useState } from 'react';
import { Loader2, Play, Search } from 'lucide-react';
import { apiFetch, buildQuery } from '../../lib/api';
import { extractArray, FALLBACK_ART } from '../../lib/mediaUtils';
import { useDiscoverEngine, type CatalogTab } from '../../hooks/useDiscoverEngine';
import type { ActivePlaybackTarget, MediaItem, PlayerEpisodeOption } from '../../types/framex';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';
import { NeonPosterTile } from './NeonMediaCard';

export function NeonDiscover({
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
    genres,
    items,
    loading,
    error,
    page,
    setPage,
    fetchCatalog,
  } = useDiscoverEngine({ initialTab, initialQuery, focusType });

  const activeGenreName = genres.find((g) => g.slug === selectedGenre)?.name || selectedGenre;

  return (
    <div className="space-y-6">
      <section className="neon-panel rounded-lg p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#ff2bd6]">
              Neon Explorer Matrix
            </p>
            <h1 className="font-neon text-3xl sm:text-4xl uppercase text-white">
              {debouncedQuery
                ? `Results: "${debouncedQuery}"`
                : selectedGenre
                  ? activeGenreName
                  : 'Discover Catalog'}
            </h1>
          </div>

          <div className="inline-flex rounded-md border border-cyan-500/30 bg-[#03050d] p-1">
            <button
              type="button"
              onClick={() => setProvider('v1')}
              className={`px-3 py-1 rounded text-xs font-mono cursor-pointer ${
                provider === 'v1' ? 'bg-[#00f0ff] text-[#03050d] font-bold' : 'text-slate-300'
              }`}
            >
              MovieBox
            </button>
            <button
              type="button"
              onClick={() => setProvider('v2')}
              className={`px-3 py-1 rounded text-xs font-mono cursor-pointer ${
                provider === 'v2' ? 'bg-[#00f0ff] text-[#03050d] font-bold' : 'text-slate-300'
              }`}
            >
              Showbox
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void fetchCatalog();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#00f0ff] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, series, anime…"
              className="w-full h-11 pl-10 pr-4 rounded-md bg-[#03050d] border border-cyan-500/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00f0ff]"
            />
          </div>
          <button type="submit" className="neon-glow-btn h-11 px-5 rounded-md text-xs font-bold cursor-pointer">
            Search
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'trending', label: 'Trending' },
            { id: 'popular_movies', label: 'Movies' },
            { id: 'latest_movies', label: 'Latest' },
            { id: 'popular_series', label: 'Series' },
            { id: 'upcoming', label: 'Upcoming' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id as CatalogTab);
                setSelectedGenre('');
                setQuery('');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap cursor-pointer ${
                !debouncedQuery && !selectedGenre && activeTab === t.id
                  ? 'bg-[#00f0ff] text-[#03050d] font-bold'
                  : 'border border-cyan-500/25 bg-[#03050d] text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {genres.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {genres.slice(0, 14).map((g) => (
              <button
                key={g.slug}
                type="button"
                onClick={() => {
                  setSelectedGenre(g.slug);
                  setQuery('');
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap cursor-pointer ${
                  selectedGenre === g.slug
                    ? 'bg-[#ff2bd6] text-white font-bold'
                    : 'bg-[#03050d] border border-cyan-500/20 text-slate-300'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={fetchCatalog} />}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#00f0ff] py-10">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading matrix…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3.5">
          {items.map((item) => (
            <NeonPosterTile key={`${item.source}-${item.id}`} item={item} onSelect={onSelectTitle} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="h-9 px-4 rounded-md border border-cyan-500/30 bg-[#050814] text-xs font-mono disabled:opacity-40 cursor-pointer"
        >
          Prev
        </button>
        <span className="font-mono text-xs text-[#00f0ff] tabular-nums">Page {page}</span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="h-9 px-4 rounded-md border border-cyan-500/30 bg-[#050814] text-xs font-mono cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function NeonAnime({ onPlay }: { onPlay: (target: ActivePlaybackTarget) => void }) {
  const [engine, setEngine] = useState<'animex' | 'gotaku'>('animex');
  const [query, setQuery] = useState('Solo Leveling');
  const [results, setResults] = useState<Array<{ contentId: string; title: string; poster?: string | null }>>([]);
  const [selected, setSelected] = useState<{ contentId: string; title: string; poster?: string | null } | null>(null);
  const [episodes, setEpisodes] = useState<Array<{ id: string; number: number; title?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const searchAnime = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      try {
        const ep = engine === 'animex' ? '/api/fx/anime/animex/search' : '/api/fx/anime/gotaku/search';
        const res = await apiFetch(`${ep}${buildQuery({ q, limit: 24 })}`);
        setResults(
          extractArray(res)
            .map((raw) => ({
              contentId: String(raw.contentId || raw.id || ''),
              title: String(raw.title || raw.name || 'Anime'),
              poster: (raw.poster || raw.image || null) as string | null,
            }))
            .filter((x) => x.contentId)
        );
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [engine]
  );

  useEffect(() => {
    void searchAnime(query);
  }, [engine]);

  const openTitle = async (item: { contentId: string; title: string; poster?: string | null }) => {
    setSelected(item);
    try {
      const ep = engine === 'animex' ? '/api/fx/anime/animex/episodes' : '/api/fx/anime/gotaku/episodes';
      const res = await apiFetch(`${ep}${buildQuery({ contentId: item.contentId })}`);
      setEpisodes(
        extractArray(res).map((e, i) => ({
          id: String(e.episodeId || e.episode || e.id || i + 1),
          number: Number(e.number ?? e.episode ?? i + 1),
          title: e.title ? String(e.title) : `Episode ${e.number ?? e.episode ?? i + 1}`,
        }))
      );
    } catch {
      setEpisodes([]);
    }
  };

  return (
    <div className="space-y-6">
      <section className="neon-panel rounded-lg p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-neon text-3xl sm:text-4xl uppercase text-white">Anime Pulse</h1>
          <div className="inline-flex rounded-md border border-cyan-500/30 bg-[#03050d] p-1">
            <button
              type="button"
              onClick={() => {
                setEngine('animex');
                setSelected(null);
              }}
              className={`px-3 py-1 rounded text-xs font-mono cursor-pointer ${
                engine === 'animex' ? 'bg-[#00f0ff] text-[#03050d] font-bold' : 'text-slate-300'
              }`}
            >
              AnimeX
            </button>
            <button
              type="button"
              onClick={() => {
                setEngine('gotaku');
                setSelected(null);
              }}
              className={`px-3 py-1 rounded text-xs font-mono cursor-pointer ${
                engine === 'gotaku' ? 'bg-[#ff2bd6] text-white font-bold' : 'text-slate-300'
              }`}
            >
              Gotaku
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void searchAnime(query);
          }}
          className="flex gap-2"
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime…"
            className="flex-1 h-10 px-3.5 rounded-md bg-[#03050d] border border-cyan-500/30 text-sm text-white"
          />
          <button type="submit" className="neon-glow-btn h-10 px-5 rounded-md text-xs font-bold cursor-pointer">
            Search
          </button>
        </form>
      </section>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void searchAnime(query)} />}

      {selected && (
        <section className="neon-panel rounded-lg p-5 space-y-3">
          <h2 className="font-neon text-2xl uppercase text-[#00f0ff]">{selected.title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {episodes.map((ep) => {
              const opts: PlayerEpisodeOption[] = episodes.map((x) => ({
                id: x.id,
                episode: x.number,
                title: x.title,
              }));
              return (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() =>
                    onPlay({
                      mode: engine === 'animex' ? 'hls' : 'embed',
                      title: selected.title,
                      subtitle: `Episode ${ep.number}`,
                      poster: selected.poster,
                      provider: engine,
                      contentId: engine === 'animex' ? selected.contentId : ep.id,
                      mediaType: 'anime',
                      episode: ep.number,
                      episodes: opts,
                    })
                  }
                  className="p-2.5 rounded-md bg-[#03050d] border border-cyan-500/25 hover:border-[#00f0ff] flex items-center justify-between text-xs font-mono cursor-pointer"
                >
                  <span>EP {ep.number}</span>
                  <Play className="w-3.5 h-3.5 text-[#00f0ff]" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#00f0ff] py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Scanning anime catalog…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3.5">
          {results.map((item) => (
            <button
              key={item.contentId}
              type="button"
              onClick={() => void openTitle(item)}
              className="rounded-md bg-[#070b18] border border-cyan-500/20 hover:border-[#00f0ff] overflow-hidden text-left cursor-pointer"
            >
              <img
                src={item.poster || FALLBACK_ART.animeShowcase}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full aspect-[2/3] object-cover"
              />
              <p className="p-2 font-neon text-sm text-white truncate">{item.title}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
