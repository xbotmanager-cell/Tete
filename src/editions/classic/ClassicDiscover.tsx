import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { DISCOVER_TABS, useDiscoverEngine, type CatalogTab } from '../../hooks/useDiscoverEngine';
import type { MediaItem } from '../../types/framex';
import { ClassicMediaCard } from './ClassicMediaCard';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';

export function ClassicDiscover({
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
  } = useDiscoverEngine({ initialTab, initialQuery, focusType });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setMobileFiltersOpen(false);
  }, [activeTab, provider]);

  return (
    <div className="space-y-6">
      <header className="glass-surface rounded-3xl p-6 sm:p-8 space-y-5 border border-amber-200/20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/85">
              Archive & Screening Index
            </p>
            <h1 className="font-editorial text-3xl sm:text-5xl font-semibold text-amber-50">
              {focusType === 'movies'
                ? 'Cinema Folio'
                : focusType === 'series'
                  ? 'Television Folio'
                  : 'Complete Catalog'}
            </h1>
          </div>

          <div className="inline-flex p-1 rounded-full bg-black/45 border border-amber-200/20 self-start">
            <button
              type="button"
              onClick={() => {
                setProvider('v1');
                setSelectedGenre('');
                setSelectedCategory('');
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                provider === 'v1' ? 'glass-btn-primary text-white' : 'text-amber-100/70'
              }`}
            >
              MovieBox (v1)
            </button>
            <button
              type="button"
              onClick={() => {
                setProvider('v2');
                setSelectedGenre('');
                setSelectedCategory('');
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                provider === 'v2' ? 'glass-btn-primary text-white' : 'text-amber-100/70'
              }`}
            >
              Showbox (v2)
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-amber-200/60 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search films, directors, series…"
            className="w-full h-11 pl-11 pr-11 rounded-full bg-black/45 border border-amber-200/20 text-sm text-white placeholder:text-rose-100/40 focus:outline-none focus:border-amber-300"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-amber-200/70 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!debouncedQuery && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(visibleTabs.length > 0 ? visibleTabs : DISCOVER_TABS).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(t.id);
                      setSelectedGenre('');
                      setSelectedCategory('');
                      setPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                      !selectedGenre && !selectedCategory && activeTab === t.id
                        ? 'glass-btn-primary text-white'
                        : 'glass-btn text-amber-100/75'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                className="sm:hidden glass-btn px-3 py-1.5 rounded-full text-xs text-amber-200 shrink-0"
              >
                Filters
              </button>
            </div>

            {(genres.length > 0 || categories.length > 0) && (
              <div className={`${mobileFiltersOpen ? 'flex' : 'hidden sm:flex'} flex-wrap items-center gap-2`}>
                {genres.length > 0 && (
                  <select
                    aria-label="Filter by genre"
                    value={selectedGenre}
                    onChange={(e) => {
                      setSelectedGenre(e.target.value);
                      setSelectedCategory('');
                      setPage(1);
                    }}
                    className="h-9 px-3.5 rounded-full bg-black/50 border border-amber-200/20 text-xs text-amber-50"
                  >
                    <option value="">All Genres</option>
                    {genres.map((g) => (
                      <option key={g.slug} value={g.slug} className="bg-[#14060b]">
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
                {categories.length > 0 && (
                  <select
                    aria-label="Filter by category"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedGenre('');
                      setPage(1);
                    }}
                    className="h-9 px-3.5 rounded-full bg-black/50 border border-amber-200/20 text-xs text-amber-50"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug} className="bg-[#14060b]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {debouncedQuery && searchMeta && (
          <p className="text-xs text-amber-100/70">
            Results for <strong className="text-white">{debouncedQuery}</strong>
            {searchMeta.source ? ` · ${searchMeta.source}` : ''}
          </p>
        )}
      </header>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void fetchCatalog()} />}

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-2xl bg-rose-950/35 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="glass-surface rounded-3xl p-12 text-center font-editorial text-xl text-amber-100/70">
          No screenings match your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
          {items.map((item) => (
            <ClassicMediaCard
              key={`${item.source}-${item.id}-${item.slug}`}
              item={item}
              onSelect={onSelectTitle}
            />
          ))}
        </div>
      )}

      {activeTab !== 'upcoming' && items.length > 0 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="glass-btn h-10 px-4 rounded-full text-xs text-amber-100 inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <span className="font-mono text-xs text-amber-200/75 tabular-nums">Page {page}</span>
          <button
            type="button"
            disabled={loading || items.length < 10}
            onClick={() => setPage((p) => p + 1)}
            className="glass-btn h-10 px-4 rounded-full text-xs text-amber-100 inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
