import { useCallback, useEffect, useState } from 'react';
import { Loader2, Play, Search } from 'lucide-react';
import { apiFetch, buildQuery } from '../../lib/api';
import { extractArray, FALLBACK_ART } from '../../lib/mediaUtils';
import { useDiscoverEngine, type CatalogTab } from '../../hooks/useDiscoverEngine';
import type { ActivePlaybackTarget, MediaItem, PlayerEpisodeOption } from '../../types/framex';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';
import { EditorialFigureCard } from './EditorialMediaCard';

export function EditorialDiscover({
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
    <div className="space-y-6 text-stone-900">
      <section className="bg-[#FBF9F5] border border-stone-300 p-5 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-300 pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A3412]">
              Catalog Archive
            </p>
            <h1 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-stone-950">
              {debouncedQuery
                ? `Archive Search: “${debouncedQuery}”`
                : selectedGenre
                  ? `${activeGenreName} Index`
                  : 'Complete Film & Series Index'}
            </h1>
          </div>

          <div className="inline-flex border border-stone-400 bg-white">
            <button
              type="button"
              onClick={() => setProvider('v1')}
              className={`px-3.5 py-1.5 text-xs font-mono cursor-pointer ${
                provider === 'v1' ? 'bg-stone-950 text-white' : 'text-stone-700'
              }`}
            >
              MovieBox v1
            </button>
            <button
              type="button"
              onClick={() => setProvider('v2')}
              className={`px-3.5 py-1.5 text-xs font-mono cursor-pointer ${
                provider === 'v2' ? 'bg-stone-950 text-white' : 'text-stone-700'
              }`}
            >
              Showbox v2
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void fetchCatalog();
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles in archival catalog…"
              className="w-full h-11 pl-10 pr-4 bg-white border border-stone-300 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
            />
          </div>
          <button
            type="submit"
            className="h-11 px-6 bg-stone-950 hover:bg-[#9A3412] text-white text-xs font-semibold uppercase tracking-widest cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {[
            { id: 'trending', label: 'Trending' },
            { id: 'popular_movies', label: 'Popular Films' },
            { id: 'latest_movies', label: 'Latest Films' },
            { id: 'popular_series', label: 'Series' },
            { id: 'upcoming', label: 'Forthcoming' },
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
              className={`px-3.5 py-1.5 text-xs border whitespace-nowrap cursor-pointer ${
                !debouncedQuery && !selectedGenre && activeTab === t.id
                  ? 'bg-stone-950 text-white border-stone-950'
                  : 'bg-white text-stone-700 border-stone-300 hover:border-stone-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {genres.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {genres.slice(0, 16).map((g) => (
              <button
                key={g.slug}
                type="button"
                onClick={() => {
                  setSelectedGenre(g.slug);
                  setQuery('');
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-mono border whitespace-nowrap cursor-pointer ${
                  selectedGenre === g.slug
                    ? 'bg-[#9A3412] text-white border-[#9A3412]'
                    : 'bg-[#F7F4EE] text-stone-700 border-stone-300 hover:border-stone-800'
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
        <div className="flex items-center gap-2 text-sm text-stone-600 py-10">
          <Loader2 className="w-5 h-5 animate-spin text-[#9A3412]" />
          <span>Indexing catalog entries…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((item, idx) => (
            <EditorialFigureCard
              key={`${item.source}-${item.id}`}
              item={item}
              index={idx}
              onSelect={onSelectTitle}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="h-9 px-4 border border-stone-400 bg-white text-xs font-mono disabled:opacity-40 cursor-pointer"
        >
          Previous
        </button>
        <span className="font-mono text-xs text-stone-600 tabular-nums">Page {page}</span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="h-9 px-4 border border-stone-400 bg-white text-xs font-mono cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function EditorialAnime({ onPlay }: { onPlay: (target: ActivePlaybackTarget) => void }) {
  const [engine, setEngine] = useState<'animex' | 'gotaku'>('animex');
  const [query, setQuery] = useState('One Piece');
  const [results, setResults] = useState<Array<{ contentId: string; title: string; poster?: string | null; year?: string | number }>>([]);
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
              year: raw.year as string | number | undefined,
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
    <div className="space-y-6 text-stone-900">
      <section className="bg-[#FBF9F5] border border-stone-300 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-300 pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A3412]">
              Animation Monograph
            </p>
            <h1 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-stone-950">
              Anime Gazette
            </h1>
          </div>
          <div className="inline-flex border border-stone-400 bg-white">
            <button
              type="button"
              onClick={() => {
                setEngine('animex');
                setSelected(null);
              }}
              className={`px-3.5 py-1.5 text-xs font-mono cursor-pointer ${
                engine === 'animex' ? 'bg-stone-950 text-white' : 'text-stone-700'
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
              className={`px-3.5 py-1.5 text-xs font-mono cursor-pointer ${
                engine === 'gotaku' ? 'bg-stone-950 text-white' : 'text-stone-700'
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
            placeholder="Search anime works…"
            className="flex-1 h-10 px-3.5 bg-white border border-stone-300 text-sm text-stone-900"
          />
          <button
            type="submit"
            className="h-10 px-5 bg-stone-950 text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            Find
          </button>
        </form>
      </section>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void searchAnime(query)} />}

      {selected && (
        <section className="bg-[#FBF9F5] border border-stone-400 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-300 pb-3">
            <h2 className="font-editorial-serif text-2xl font-bold">{selected.title}</h2>
            <span className="font-mono text-xs text-[#9A3412]">{episodes.length} chapters</span>
          </div>
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
                  className="p-2.5 border border-stone-300 bg-white hover:border-stone-950 text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="font-mono text-xs text-stone-900 truncate">EP {ep.number}</span>
                  <Play className="w-3.5 h-3.5 text-[#9A3412] shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-stone-600 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#9A3412]" />
          <span>Loading Anime Gazette…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {results.map((item) => (
            <button
              key={item.contentId}
              type="button"
              onClick={() => void openTitle(item)}
              className="border border-stone-300 bg-[#FBF9F5] p-2 text-left hover:border-stone-900 cursor-pointer"
            >
              <img
                src={item.poster || FALLBACK_ART.animeShowcase}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full aspect-[2/3] object-cover"
              />
              <h3 className="font-editorial-serif text-sm font-semibold text-stone-950 truncate mt-2">
                {item.title}
              </h3>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
