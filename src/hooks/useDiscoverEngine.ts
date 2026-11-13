import { useCallback, useEffect, useState } from 'react';
import { apiFetch, buildQuery } from '../lib/api';
import { extractArray, normalizeMediaItem } from '../lib/mediaUtils';
import type { MediaItem, SearchV2Metadata } from '../types/framex';

export type CatalogTab =
  | 'trending'
  | 'popular_movies'
  | 'popular_series'
  | 'latest_movies'
  | 'latest_series'
  | 'upcoming';

export const DISCOVER_TABS: Array<{
  id: CatalogTab;
  label: string;
  group: 'movies' | 'series';
}> = [
  { id: 'trending', label: 'Trending', group: 'movies' },
  { id: 'popular_movies', label: 'Popular Movies', group: 'movies' },
  { id: 'popular_series', label: 'Popular Series', group: 'series' },
  { id: 'latest_movies', label: 'Latest Movies', group: 'movies' },
  { id: 'latest_series', label: 'Latest Series', group: 'series' },
  { id: 'upcoming', label: 'Upcoming', group: 'movies' },
];

export function useDiscoverEngine(opts: {
  initialTab?: CatalogTab;
  initialQuery?: string;
  focusType?: 'all' | 'movies' | 'series';
}) {
  const { initialTab = 'trending', initialQuery = '', focusType = 'all' } = opts;

  const [provider, setProvider] = useState<'v1' | 'v2'>('v1');
  const [activeTab, setActiveTab] = useState<CatalogTab>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery.trim());
  const [searchMeta, setSearchMeta] = useState<SearchV2Metadata | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [genres, setGenres] = useState<Array<{ name: string; slug: string }>>([]);
  const [categories, setCategories] = useState<Array<{ name: string; slug: string }>>([]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      setSelectedGenre('');
      setSelectedCategory('');
      setPage(1);
    }
  }, [initialTab]);

  useEffect(() => {
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery.trim());
    setPage(1);
  }, [initialQuery]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 320);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch(`/api/fx/genres${buildQuery({ provider })}`).catch(() => null),
      apiFetch(`/api/fx/categories${buildQuery({ provider })}`).catch(() => null),
    ]).then(([gRes, cRes]) => {
      if (!active) return;
      setGenres(
        extractArray(gRes)
          .map((g) => ({
            name: String(g.name || g.title || g.slug || ''),
            slug: String(g.slug || g.id || g.name || ''),
          }))
          .filter((x) => x.name && x.slug)
      );
      setCategories(
        extractArray(cRes)
          .map((c) => ({
            name: String(c.name || c.title || c.slug || ''),
            slug: String(c.slug || c.id || c.name || ''),
          }))
          .filter((x) => x.name && x.slug)
      );
    });
    return () => {
      active = false;
    };
  }, [provider]);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSearchMeta(null);

    try {
      const defaultSource = provider === 'v2' ? 'showbox' : 'moviebox';
      let url = '';

      if (debouncedQuery) {
        url = `/api/fx/search${buildQuery({
          q: debouncedQuery,
          page,
          mode: 'v2',
        })}`;
      } else if (selectedGenre) {
        url = `/api/fx/genres/${encodeURIComponent(selectedGenre)}${buildQuery({
          provider,
          page,
        })}`;
      } else if (selectedCategory) {
        url = `/api/fx/categories/${encodeURIComponent(selectedCategory)}${buildQuery({
          provider,
          page,
        })}`;
      } else {
        switch (activeTab) {
          case 'trending':
            url = `/api/fx/movies/trending${buildQuery({ provider, page })}`;
            break;
          case 'popular_movies':
            url = `/api/fx/movies/popular${buildQuery({ provider, page })}`;
            break;
          case 'popular_series':
            url = `/api/fx/series/popular${buildQuery({ provider, page })}`;
            break;
          case 'latest_movies':
            url = `/api/fx/movies/latest${buildQuery({ provider, page })}`;
            break;
          case 'latest_series':
            url = `/api/fx/series/latest${buildQuery({ provider, page })}`;
            break;
          case 'upcoming':
            url = `/api/fx/movies/upcoming${buildQuery({ provider })}`;
            break;
        }
      }

      const res = await apiFetch<Record<string, unknown>>(url);
      if (debouncedQuery) {
        setSearchMeta({
          schemaVersion: res.schemaVersion as string | undefined,
          source: res.source as string | undefined,
          fallback: res.fallback as boolean | undefined,
          fallbackReason: res.fallbackReason as string | undefined,
        });
      }

      setItems(extractArray(res).map((r) => normalizeMediaItem(r, defaultSource)));
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedGenre, selectedCategory, activeTab, provider, page]);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  const visibleTabs =
    focusType === 'all' ? DISCOVER_TABS : DISCOVER_TABS.filter((t) => t.group === focusType);

  return {
    provider,
    setProvider,
    activeTab,
    setActiveTab,
    query,
    setQuery,
    debouncedQuery,
    searchMeta,
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
  };
}
