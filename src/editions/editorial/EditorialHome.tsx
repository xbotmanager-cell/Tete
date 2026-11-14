import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Compass, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { FALLBACK_ART } from '../../lib/mediaUtils';
import type { ActivePlaybackTarget, MediaItem } from '../../types/framex';
import type { EditionSection } from '../types';
import { DomainNoticeBanner } from '../../components/DomainNoticeBanner';
import { EditorialDispatchRow, EditorialFigureCard } from './EditorialMediaCard';

interface EditorialHomeProps {
  onSelectTitle: (item: MediaItem) => void;
  onPlayTarget: (target: ActivePlaybackTarget) => void;
  onNavigateSection: (section: EditionSection) => void;
}

export function EditorialHome({
  onSelectTitle,
  onPlayTarget,
  onNavigateSection,
}: EditorialHomeProps) {
  const { watchProgress } = useAuth();
  const {
    trending,
    popularMovies,
    latestMovies,
    upcomingMovies,
    popularSeries,
    topRated,
    recommended,
    allGenres,
    genreCollections,
    loading,
    error,
    refresh,
  } = useCatalog();

  const [leadIdx, setLeadIdx] = useState(0);
  const [selectedShelf, setSelectedShelf] = useState<'popular' | 'latest' | 'series' | 'topRated'>(
    'popular'
  );

  const featuredPool = useMemo(() => trending.slice(0, 4), [trending]);
  const lead = featuredPool[leadIdx] || trending[0];

  const continueItems = useMemo(
    () =>
      watchProgress.filter(
        (w) =>
          w.position_seconds > 5 &&
          (!w.duration_seconds || w.position_seconds < w.duration_seconds - 15)
      ),
    [watchProgress]
  );

  const shelfItems = useMemo(() => {
    if (selectedShelf === 'latest') return latestMovies.slice(0, 12);
    if (selectedShelf === 'series') return popularSeries.slice(0, 12);
    if (selectedShelf === 'topRated') return topRated.slice(0, 12);
    return popularMovies.slice(0, 12);
  }, [selectedShelf, popularMovies, latestMovies, popularSeries, topRated]);

  return (
    <div className="space-y-10 text-stone-900">
      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={refresh} />}

      {/* Front-Page 3-Tier Lead Story & Dispatches Split */}
      <section className="border-b-2 border-stone-900 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Lead Essay Story (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            {loading && !lead ? (
              <div className="h-[420px] bg-stone-200 animate-pulse border border-stone-300" />
            ) : lead ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-stone-600 border-b border-stone-300 pb-2">
                  <span>Lead Screening Review</span>
                  <span className="text-[#9A3412]">
                    {lead.type === 'series' ? 'Serialized Edition' : 'Feature Cinema'} ·{' '}
                    {lead.year || 'Current'}
                  </span>
                </div>

                <h1
                  className="font-editorial-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-stone-950 leading-[1.06]"
                  style={{ textWrap: 'balance' }}
                >
                  {lead.title}
                </h1>

                <div className="aspect-[16/9] w-full overflow-hidden border border-stone-400 bg-stone-200">
                  <img
                    src={lead.backdrop || lead.poster || FALLBACK_ART.cinemaHero}
                    alt={lead.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-editorial-prose italic text-stone-600 -mt-3">
                  Fig. 01 — Archival frame from {lead.title}
                  {lead.genres.length > 0 ? ` (${lead.genres.slice(0, 3).join(', ')})` : ''}.
                </p>

                <p className="font-editorial-prose text-base sm:text-lg text-stone-800 leading-relaxed max-w-prose first-letter:text-5xl first-letter:font-editorial-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-[#9A3412]">
                  {lead.description ||
                    lead.overview ||
                    'Explore full cast notes, multi-language captioning, and instant high-definition streaming inside the LUPIN MOVIES archive.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectTitle(lead)}
                    className="h-11 px-6 bg-stone-950 hover:bg-[#9A3412] text-[#FBF9F5] text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Open Dossier & Screen</span>
                  </button>
                  {featuredPool.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {featuredPool.map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setLeadIdx(idx)}
                          className={`h-9 px-3 border text-xs font-mono cursor-pointer transition-colors ${
                            idx === leadIdx
                              ? 'border-stone-950 bg-[#EBE6DF] text-stone-950 font-bold'
                              : 'border-stone-300 bg-[#FBF9F5] text-stone-600 hover:border-stone-800'
                          }`}
                        >
                          0{idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Column: Dispatches & Trending Index (5 cols) */}
          <aside className="lg:col-span-5 lg:border-l lg:border-stone-300 lg:pl-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-stone-900 pb-2 mb-2">
                <h2 className="font-editorial-serif text-xl font-bold text-stone-950">
                  Critical Index · Trending
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigateSection('discover')}
                  className="text-xs font-mono uppercase tracking-wider text-[#9A3412] hover:underline cursor-pointer"
                >
                  Full Archive
                </button>
              </div>
              <div>
                {trending.slice(0, 7).map((item, idx) => (
                  <EditorialDispatchRow
                    key={item.id}
                    item={item}
                    rank={idx + 1}
                    onSelect={onSelectTitle}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 bg-[#EBE6DF] border border-stone-300 p-4 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A3412]">
                Literary & Live Editions
              </p>
              <p className="font-editorial-prose text-sm text-stone-800 leading-relaxed">
                Read serialized chapters in the Novel Reader or tune into GoalNivo live sports and
                TVGarden global feeds.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateSection('novels')}
                  className="px-3 py-1.5 bg-stone-900 text-[#FBF9F5] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Novels</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateSection('live')}
                  className="px-3 py-1.5 border border-stone-500 text-stone-900 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Live & Sports</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Active Screening Bookmark (Continue Watching) */}
      {continueItems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-stone-300 pb-2">
            <h2 className="font-editorial-serif text-2xl font-bold text-stone-950">
              Screening Bookmark · Continue Watching
            </h2>
            <span className="font-mono text-xs text-stone-600 tabular-nums">
              {continueItems.length} saved
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {continueItems.slice(0, 6).map((w, idx) => {
              const pct =
                w.duration_seconds > 0
                  ? Math.round((w.position_seconds / w.duration_seconds) * 100)
                  : 15;
              return (
                <EditorialFigureCard
                  key={`ed-cw-${w.content_id}-${w.season}-${w.episode}`}
                  index={idx}
                  progressPercent={pct}
                  subtitleOverride={
                    w.season > 0 ? `S${w.season} E${w.episode} · ${pct}%` : `${pct}% read`
                  }
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

      {/* Curated Film Folios (Tabbed Monograph Grid) */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-stone-900 pb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#9A3412]">
              Archival Folio Plates
            </p>
            <h2 className="font-editorial-serif text-3xl font-bold text-stone-950">
              Curated Screenings
            </h2>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'popular', label: 'Popular Cinema' },
              { id: 'latest', label: 'Latest Issues' },
              { id: 'series', label: 'Television Series' },
              { id: 'topRated', label: 'Critics Choice' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedShelf(tab.id as typeof selectedShelf)}
                className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap border cursor-pointer transition-colors ${
                  selectedShelf === tab.id
                    ? 'bg-stone-950 text-[#FBF9F5] border-stone-950'
                    : 'bg-[#FBF9F5] text-stone-700 border-stone-300 hover:border-stone-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {shelfItems.map((item, idx) => (
            <EditorialFigureCard
              key={item.id}
              item={item}
              index={idx}
              onSelect={onSelectTitle}
            />
          ))}
        </div>
      </section>

      {/* Recommended & Upcoming Two-Column Broadsheet Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-stone-300 pt-8">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-300 pb-2">
            <h2 className="font-editorial-serif text-2xl font-bold text-stone-950">
              Editors' Recommendations
            </h2>
            <button
              type="button"
              onClick={() => onNavigateSection('movies')}
              className="text-xs font-mono text-[#9A3412] inline-flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Browse Films</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recommended.slice(0, 6).map((item, idx) => (
              <EditorialFigureCard
                key={item.id}
                item={item}
                index={idx}
                onSelect={onSelectTitle}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-300 pb-2">
            <h2 className="font-editorial-serif text-2xl font-bold text-stone-950">
              Forthcoming Releases
            </h2>
            <span className="font-mono text-xs text-stone-500">Calendar</span>
          </div>
          <div className="bg-[#FBF9F5] border border-stone-300 p-2">
            {upcomingMovies.slice(0, 8).map((item, idx) => (
              <EditorialDispatchRow
                key={item.id}
                item={item}
                rank={idx + 1}
                onSelect={onSelectTitle}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Genre Departments */}
      {genreCollections.length > 0 && (
        <section className="space-y-6 border-t-2 border-stone-900 pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-editorial-serif text-3xl font-bold text-stone-950">
              Departmental Genre Archive
            </h2>
            <span className="font-mono text-xs text-stone-600">
              {allGenres.length} catalog classifications
            </span>
          </div>

          <div className="space-y-8">
            {genreCollections.slice(0, 4).map((col) => (
              <div key={col.id} className="space-y-3">
                <h3 className="font-editorial-serif text-xl font-semibold text-[#9A3412] border-b border-stone-300 pb-1.5">
                  {col.label}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {col.items.slice(0, 6).map((item, idx) => (
                    <EditorialFigureCard
                      key={`${col.id}-${item.id}`}
                      item={item}
                      index={idx}
                      onSelect={onSelectTitle}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
