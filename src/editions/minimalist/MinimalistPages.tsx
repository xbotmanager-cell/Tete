import { useCallback, useEffect, useState } from 'react';
import { Loader2, Play, Search } from 'lucide-react';
import { apiFetch, buildQuery } from '../../lib/api';
import { extractArray, FALLBACK_ART } from '../../lib/mediaUtils';
import { useDiscoverEngine, type CatalogTab } from '../../hooks/useDiscoverEngine';
import type { ActivePlaybackTarget, MediaItem, PlayerEpisodeOption } from '../../types/framex';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';
import { MinimalistPosterCard } from './MinimalistMediaCard';

export function MinimalistDiscover({
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
    <div className="space-y-8 text-neutral-900">
      <section className="border-b border-neutral-200 pb-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#2563EB]">
              Catalog Index
            </p>
            <h1 className="font-minimal text-3xl sm:text-4xl font-semibold text-neutral-950 tracking-tight">
              {debouncedQuery
                ? `Search: “${debouncedQuery}”`
                : selectedGenre
                  ? activeGenreName
                  : 'All Movies & Series'}
            </h1>
          </div>

          <div className="inline-flex rounded-md border border-neutral-200 bg-[#FAFAFA] p-0.5">
            <button
              type="button"
              onClick={() => setProvider('v1')}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                provider === 'v1' ? 'bg-neutral-950 text-white' : 'text-neutral-600'
              }`}
            >
              MovieBox
            </button>
            <button
              type="button"
              onClick={() => setProvider('v2')}
              className={`px-3 py-1.5 rounded text-xs font-medium cursor-pointer ${
                provider === 'v2' ? 'bg-neutral-950 text-white' : 'text-neutral-600'
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
          className="flex gap-2.5 max-w-2xl"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles…"
              className="w-full h-10 pl-10 pr-4 rounded-md border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950"
            />
          </div>
          <button
            type="submit"
            className="h-10 px-5 rounded-md bg-neutral-950 hover:bg-[#2563EB] text-white text-xs font-medium cursor-pointer transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'trending', label: 'Trending' },
            { id: 'popular_movies', label: 'Popular Films' },
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
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                !debouncedQuery && !selectedGenre && activeTab === t.id
                  ? 'bg-neutral-950 text-white'
                  : 'border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-950'
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
                className={`px-2.5 py-1 rounded text-[11px] font-mono border whitespace-nowrap cursor-pointer ${
                  selectedGenre === g.slug
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-[#FAFAFA] text-neutral-600 border-neutral-200 hover:border-neutral-900'
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
        <div className="flex items-center gap-2 text-sm text-neutral-500 py-10">
          <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
          <span>Loading catalog…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {items.map((item) => (
            <MinimalistPosterCard
              key={`${item.source}-${item.id}`}
              item={item}
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
          className="h-9 px-4 rounded-md border border-neutral-200 bg-white text-xs font-medium disabled:opacity-40 cursor-pointer"
        >
          Previous
        </button>
        <span className="font-mono text-xs text-neutral-500 tabular-nums">Page {page}</span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="h-9 px-4 rounded-md border border-neutral-200 bg-white text-xs font-medium cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function MinimalistAnime({ onPlay }: { onPlay: (target: ActivePlaybackTarget) => void }) {
  const [engine, setEngine] = useState<'animex' | 'gotaku'>('animex');
  const [query, setQuery] = useState('One Piece');
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
    <div className="space-y-8 text-neutral-900">
      <section className="border-b border-neutral-200 pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#2563EB]">
              Animation
            </p>
            <h1 className="font-minimal text-3xl sm:text-4xl font-semibold text-neutral-950">
              Anime Catalog
            </h1>
          </div>
          <div className="inline-flex rounded-md border border-neutral-200 bg-[#FAFAFA] p-0.5">
            <button
              type="button"
              onClick={() => {
                setEngine('animex');
                setSelected(null);
              }}
              className={`px-3.5 py-1.5 rounded text-xs font-medium cursor-pointer ${
                engine === 'animex' ? 'bg-neutral-950 text-white' : 'text-neutral-600'
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
              className={`px-3.5 py-1.5 rounded text-xs font-medium cursor-pointer ${
                engine === 'gotaku' ? 'bg-neutral-950 text-white' : 'text-neutral-600'
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
          className="flex gap-2 max-w-xl"
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime…"
            className="flex-1 h-10 px-3.5 rounded-md border border-neutral-300 bg-white text-sm text-neutral-900"
          />
          <button
            type="submit"
            className="h-10 px-5 rounded-md bg-neutral-950 text-white text-xs font-medium cursor-pointer"
          >
            Search
          </button>
        </form>
      </section>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void searchAnime(query)} />}

      {selected && (
        <section className="border border-neutral-200 rounded-lg bg-[#FAFAFA] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-minimal text-xl font-semibold text-neutral-950">{selected.title}</h2>
            <span className="font-mono text-xs text-neutral-500">{episodes.length} episodes</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto">
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
                  className="p-2.5 rounded-md border border-neutral-200 bg-white hover:border-neutral-950 text-left flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="font-mono text-xs text-neutral-900 truncate">EP {ep.number}</span>
                  <Play className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
          <span>Loading anime…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-5">
          {results.map((item) => (
            <button
              key={item.contentId}
              type="button"
              onClick={() => void openTitle(item)}
              className="text-left group cursor-pointer"
            >
              <img
                src={item.poster || FALLBACK_ART.animeShowcase}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full aspect-[2/3] object-cover rounded-md border border-neutral-200"
              />
              <h3 className="text-xs sm:text-sm font-medium text-neutral-950 truncate mt-2 group-hover:text-[#2563EB]">
                {item.title}
              </h3>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
