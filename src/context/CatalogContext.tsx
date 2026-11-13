import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { extractArray, normalizeMediaItem } from '../lib/mediaUtils';
import type { MediaItem } from '../types/framex';

export interface GenreCollection {
  id: string;
  label: string;
  slug: string;
  items: MediaItem[];
}

export interface CatalogCollections {
  trending: MediaItem[];
  popularMovies: MediaItem[];
  latestMovies: MediaItem[];
  upcomingMovies: MediaItem[];
  topRated: MediaItem[];
  popularSeries: MediaItem[];
  recommended: MediaItem[];
  genreCollections: GenreCollection[];
  allGenres: Array<{ name: string; slug: string }>;
  loading: boolean;
  genresLoading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogCollections | null>(null);

const TARGET_GENRES: Array<{ id: string; label: string; aliases: string[] }> = [
  { id: 'action', label: 'Action', aliases: ['action', 'action-adventure'] },
  { id: 'comedy', label: 'Comedy', aliases: ['comedy'] },
  { id: 'horror', label: 'Horror', aliases: ['horror', 'thriller'] },
  { id: 'romance', label: 'Romance', aliases: ['romance'] },
  { id: 'sci-fi', label: 'Sci-Fi', aliases: ['sci-fi', 'science-fiction', 'scifi', 'sci_fi'] },
  { id: 'adventure', label: 'Adventure', aliases: ['adventure'] },
  { id: 'animation', label: 'Animation', aliases: ['animation', 'animated', 'anime'] },
];

function itemKey(item: MediaItem): string {
  return `${item.id.toLowerCase()}::${item.title.toLowerCase().trim()}`;
}

function dedupeList(items: MediaItem[], seen: Set<string>, minKeep = 6): MediaItem[] {
  const unique: MediaItem[] = [];
  const overflow: MediaItem[] = [];
  const localSeen = new Set<string>();

  for (const item of items) {
    const k = itemKey(item);
    if (localSeen.has(k)) continue;
    localSeen.add(k);
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(item);
    } else {
      overflow.push(item);
    }
  }

  if (unique.length < minKeep && overflow.length > 0) {
    for (const item of overflow) {
      if (unique.length >= minKeep) break;
      unique.push(item);
    }
  }

  return unique;
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
  const [latestMovies, setLatestMovies] = useState<MediaItem[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<MediaItem[]>([]);
  const [topRated, setTopRated] = useState<MediaItem[]>([]);
  const [popularSeries, setPopularSeries] = useState<MediaItem[]>([]);
  const [recommended, setRecommended] = useState<MediaItem[]>([]);
  const [genreCollections, setGenreCollections] = useState<GenreCollection[]>([]);
  const [allGenres, setAllGenres] = useState<Array<{ name: string; slug: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [genresLoading, setGenresLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setGenresLoading(true);
    setError(null);

    try {
      const [trRes, pmRes, psRes, lmRes, upRes, gnRes, pm2Res] = await Promise.all([
        apiFetch('/api/fx/movies/trending?provider=v1&page=1'),
        apiFetch('/api/fx/movies/popular?provider=v1&page=1'),
        apiFetch('/api/fx/series/popular?provider=v1&page=1'),
        apiFetch('/api/fx/movies/latest?provider=v1&page=1'),
        apiFetch('/api/fx/movies/upcoming?provider=v1').catch(() => null),
        apiFetch('/api/fx/genres?provider=v1').catch(() => null),
        apiFetch('/api/fx/movies/popular?provider=v1&page=2').catch(() => null),
      ]);

      const rawTrending = extractArray(trRes).map((r) => normalizeMediaItem(r, 'moviebox'));
      const rawPopularMovies = extractArray(pmRes).map((r) => normalizeMediaItem(r, 'moviebox'));
      const rawPopularSeries = extractArray(psRes).map((r) => normalizeMediaItem(r, 'moviebox'));
      const rawLatest = extractArray(lmRes).map((r) => normalizeMediaItem(r, 'moviebox'));
      const rawUpcoming = extractArray(upRes).map((r) => normalizeMediaItem(r, 'moviebox'));
      const rawPage2 = extractArray(pm2Res).map((r) => normalizeMediaItem(r, 'moviebox'));

      const seen = new Set<string>();
      const dedupedTrending = dedupeList(rawTrending, seen, 8);
      const dedupedPopular = dedupeList(rawPopularMovies, seen, 8);
      const dedupedLatest = dedupeList(rawLatest, seen, 8);
      const dedupedUpcoming = dedupeList(rawUpcoming, seen, 6);
      const dedupedSeries = dedupeList(rawPopularSeries, seen, 8);

      // Build Top Rated purely from real rated items in fetched pool
      const combinedPool = [
        ...rawPage2,
        ...rawPopularMovies,
        ...rawTrending,
        ...rawLatest,
        ...rawPopularSeries,
      ];
      const ratedPool = combinedPool
        .filter((item) => {
          const score = Number.parseFloat(String(item.rating || ''));
          return Number.isFinite(score) && score > 0;
        })
        .sort(
          (a, b) =>
            Number.parseFloat(String(b.rating || '0')) -
            Number.parseFloat(String(a.rating || '0'))
        );
      const dedupedTopRated = dedupeList(ratedPool, seen, 8);

      // Recommended For You from unseen page 2 / curated real titles
      const dedupedRecommended = dedupeList(
        rawPage2.length > 0 ? rawPage2 : [...rawTrending.slice(5), ...rawPopularMovies.slice(5)],
        seen,
        8
      );

      setTrending(dedupedTrending);
      setPopularMovies(dedupedPopular);
      setLatestMovies(dedupedLatest);
      setUpcomingMovies(dedupedUpcoming);
      setPopularSeries(dedupedSeries);
      setTopRated(dedupedTopRated);
      setRecommended(dedupedRecommended);

      const gList = extractArray(gnRes)
        .map((g) => ({
          name: String(g.name || g.title || g.slug || ''),
          slug: String(g.slug || g.id || g.name || '').toLowerCase(),
        }))
        .filter((g) => g.name && g.slug);
      setAllGenres(gList);
      setLoading(false);

      // Fetch real genre collections without blocking initial hero/primary shelves
      const resolvedGenreTargets = TARGET_GENRES.map((target) => {
        const matched = gList.find(
          (g) =>
            target.aliases.includes(g.slug) ||
            target.aliases.includes(g.name.toLowerCase())
        );
        return {
          id: target.id,
          label: target.label,
          slug: matched?.slug || target.aliases[0],
        };
      });

      const genreResults = await Promise.all(
        resolvedGenreTargets.map(async (g) => {
          try {
            const res = await apiFetch(
              `/api/fx/genres/${encodeURIComponent(g.slug)}?provider=v1&page=1`
            );
            const rawItems = extractArray(res).map((r) => normalizeMediaItem(r, 'moviebox'));
            const deduped = dedupeList(rawItems, seen, 6);
            return { ...g, items: deduped };
          } catch {
            return { ...g, items: [] };
          }
        })
      );

      setGenreCollections(genreResults.filter((g) => g.items.length > 0));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setGenresLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  return (
    <CatalogContext.Provider
      value={{
        trending,
        popularMovies,
        latestMovies,
        upcomingMovies,
        topRated,
        popularSeries,
        recommended,
        genreCollections,
        allGenres,
        loading,
        genresLoading,
        error,
        refresh: loadCatalog,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogCollections {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider');
  return ctx;
}
