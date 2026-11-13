import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, Play, Search, Server } from 'lucide-react';
import { apiFetch, buildQuery } from '../lib/api';
import { extractArray, FALLBACK_ART } from '../lib/mediaUtils';
import { useAuth } from '../context/AuthContext';
import type { ActivePlaybackTarget, PlayerEpisodeOption } from '../types/framex';
import { DomainNoticeBanner } from '../components/DomainNoticeBanner';

interface AnimePageProps {
  onPlay: (target: ActivePlaybackTarget) => void;
}

interface AnimeItem {
  contentId: string;
  title: string;
  poster?: string | null;
  type?: string;
  year?: string | number;
  episodesCount?: number;
  description?: string;
}

interface AnimeEpisode {
  id: string;
  number: number;
  title?: string;
  thumbnail?: string | null;
  duration?: string | null;
  hasSub?: boolean;
  hasDub?: boolean;
}

interface AnimeServer {
  id: string;
  name: string;
  type: 'sub' | 'dub';
}

const FEATURED_QUERIES = ['One Piece', 'Jujutsu Kaisen', 'Solo Leveling', 'Naruto', 'Demon Slayer'];

export function AnimePage({ onPlay }: AnimePageProps) {
  const { getWatchProgress } = useAuth();
  const [engine, setEngine] = useState<'animex' | 'gotaku'>('animex');
  const [query, setQuery] = useState('One Piece');
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [selected, setSelected] = useState<AnimeItem | null>(null);
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // AnimeX specific controls
  const [subOrDub, setSubOrDub] = useState<'sub' | 'dub'>('sub');
  const [servers, setServers] = useState<AnimeServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('');

  const runSearch = useCallback(
    async (q: string) => {
      const term = q.trim();
      if (!term) return;
      setLoadingSearch(true);
      setError(null);
      try {
        const endpoint =
          engine === 'animex' ? '/api/fx/anime/animex/search' : '/api/fx/anime/gotaku/search';
        const res = await apiFetch(
          `${endpoint}${buildQuery({ q: term, limit: 24 })}`
        );
        const list = extractArray(res).map((raw) => ({
          contentId: String(raw.contentId || raw.id || raw.slug || ''),
          title: String(raw.title || raw.name || 'Untitled Anime'),
          poster: (raw.poster || raw.image || raw.cover || null) as string | null,
          type: raw.type ? String(raw.type) : undefined,
          year: raw.year as string | number | undefined,
          episodesCount: typeof raw.episodes === 'number' ? raw.episodes : undefined,
          description: raw.description ? String(raw.description) : undefined,
        }));
        setResults(list.filter((x) => x.contentId));
      } catch (err) {
        setError(err);
        setResults([]);
      } finally {
        setLoadingSearch(false);
      }
    },
    [engine]
  );

  useEffect(() => {
    void runSearch(query);
  }, [engine]); // reload when switching engine

  const loadAnimeXServers = async (contentId: string, epNum: string) => {
    try {
      const res = await apiFetch<Record<string, unknown>>(
        `/api/fx/anime/animex/providers${buildQuery({ contentId, episode: epNum })}`
      );
      const list: AnimeServer[] = [];
      const subArr = Array.isArray(res?.sub) ? res.sub : [];
      const dubArr = Array.isArray(res?.dub) ? res.dub : [];
      for (const s of subArr as Array<Record<string, unknown>>) {
        list.push({
          id: String(s.providerId || s.id || s.name),
          name: String(s.name || s.providerName || s.id || 'Server'),
          type: 'sub',
        });
      }
      for (const d of dubArr as Array<Record<string, unknown>>) {
        list.push({
          id: String(d.providerId || d.id || d.name),
          name: String(d.name || d.providerName || d.id || 'Server'),
          type: 'dub',
        });
      }
      if (list.length === 0) {
        for (const p of extractArray(res)) {
          list.push({
            id: String(p.providerId || p.id || p.name),
            name: String(p.name || p.providerName || p.id || 'Server'),
            type: p.type === 'dub' ? 'dub' : 'sub',
          });
        }
      }
      setServers(list);
      const match = list.find((s) => s.type === subOrDub) || list[0];
      setSelectedServer(match?.id || '');
    } catch {
      setServers([]);
    }
  };

  const openAnime = async (item: AnimeItem) => {
    setSelected(item);
    setEpisodes([]);
    setServers([]);
    setSelectedServer('');
    setLoadingEpisodes(true);

    try {
      if (engine === 'animex') {
        const res = await apiFetch(
          `/api/fx/anime/animex/episodes${buildQuery({ contentId: item.contentId })}`
        );
        const eps: AnimeEpisode[] = extractArray(res).map((ep, idx) => ({
          id: String(ep.episode || ep.number || idx + 1),
          number: Number(ep.number ?? ep.episode ?? idx + 1),
          title: ep.title ? String(ep.title) : `Episode ${ep.number ?? ep.episode ?? idx + 1}`,
          thumbnail: (ep.thumbnail || ep.image || ep.cover || null) as string | null,
          duration: ep.duration ? String(ep.duration) : null,
          hasSub: ep.hasSub !== false,
          hasDub: Boolean(ep.hasDub),
        }));
        setEpisodes(eps);
        if (eps[0]) {
          void loadAnimeXServers(item.contentId, String(eps[0].number));
        }
      } else {
        const [detRes, epRes] = await Promise.all([
          apiFetch(`/api/fx/anime/gotaku/detail${buildQuery({ contentId: item.contentId })}`).catch(
            () => null
          ),
          apiFetch(`/api/fx/anime/gotaku/episodes${buildQuery({ contentId: item.contentId })}`),
        ]);
        if (detRes && typeof detRes === 'object') {
          const d = detRes as Record<string, unknown>;
          if (d.description) {
            setSelected((prev) => (prev ? { ...prev, description: String(d.description) } : prev));
          }
        }
        const eps: AnimeEpisode[] = extractArray(epRes).map((ep, idx) => ({
          id: String(ep.episodeId || ep.id || idx + 1),
          number: Number(ep.number ?? ep.episode ?? idx + 1),
          title: ep.title ? String(ep.title) : `Episode ${ep.number ?? ep.episode ?? idx + 1}`,
          thumbnail: (ep.thumbnail || ep.image || ep.cover || null) as string | null,
          duration: ep.duration ? String(ep.duration) : null,
          hasSub: true,
          hasDub: Boolean(ep.hasDub || ep.dub),
        }));
        setEpisodes(eps);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const launchAnimeEpisode = (
    animeItem: AnimeItem,
    epList: AnimeEpisode[],
    ep: AnimeEpisode,
    activeEngine: 'animex' | 'gotaku',
    activeSubOrDub: 'sub' | 'dub',
    activeServerId: string
  ) => {
    const idx = epList.findIndex((e) => e.id === ep.id && e.number === ep.number);
    const prevEp = idx > 0 ? epList[idx - 1] : null;
    const nextEp = idx >= 0 && idx < epList.length - 1 ? epList[idx + 1] : null;

    const playerEpisodes: PlayerEpisodeOption[] = epList.map((e) => ({
      id: e.id,
      episode: e.number,
      title: e.title,
      thumbnail: e.thumbnail,
      duration: e.duration ?? undefined,
    }));

    if (activeEngine === 'animex') {
      void loadAnimeXServers(animeItem.contentId, String(ep.number));
      onPlay({
        mode: 'hls',
        title: animeItem.title,
        subtitle: `Episode ${ep.number} · ${activeSubOrDub.toUpperCase()} · AnimeX`,
        poster: animeItem.poster,
        provider: 'animex',
        contentId: animeItem.contentId,
        mediaType: 'anime',
        episode: ep.number,
        animeType: activeSubOrDub,
        animeProviderId: activeServerId || undefined,
        episodes: playerEpisodes,
        hasPrevEpisode: Boolean(prevEp),
        onPrevEpisode: prevEp
          ? () => launchAnimeEpisode(animeItem, epList, prevEp, activeEngine, activeSubOrDub, activeServerId)
          : undefined,
        hasNextEpisode: Boolean(nextEp),
        onNextEpisode: nextEp
          ? () => launchAnimeEpisode(animeItem, epList, nextEp, activeEngine, activeSubOrDub, activeServerId)
          : undefined,
        onSelectEpisode: (chosen) => {
          const found = epList.find((x) => x.number === chosen.episode) || epList[0];
          if (found) {
            launchAnimeEpisode(animeItem, epList, found, activeEngine, activeSubOrDub, activeServerId);
          }
        },
      });
    } else {
      onPlay({
        mode: 'embed',
        title: animeItem.title,
        subtitle: `Episode ${ep.number} · Gotaku`,
        poster: animeItem.poster,
        provider: 'gotaku',
        contentId: ep.id,
        mediaType: 'anime',
        episode: ep.number,
        animeType: 'hard_sub',
        episodes: playerEpisodes,
        hasPrevEpisode: Boolean(prevEp),
        onPrevEpisode: prevEp
          ? () => launchAnimeEpisode(animeItem, epList, prevEp, activeEngine, activeSubOrDub, activeServerId)
          : undefined,
        hasNextEpisode: Boolean(nextEp),
        onNextEpisode: nextEp
          ? () => launchAnimeEpisode(animeItem, epList, nextEp, activeEngine, activeSubOrDub, activeServerId)
          : undefined,
        onSelectEpisode: (chosen) => {
          const found = epList.find((x) => x.number === chosen.episode) || epList[0];
          if (found) {
            launchAnimeEpisode(animeItem, epList, found, activeEngine, activeSubOrDub, activeServerId);
          }
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="relative rounded-3xl overflow-hidden glass-surface-elevated p-6 sm:p-8">
        <img
          src={FALLBACK_ART.animeShowcase}
          alt="Anime Center"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080305] via-[#17060c]/85 to-transparent" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-white">
              Anime Center
            </h1>
            <p className="text-sm text-rose-100/75 max-w-xl">
              Stream with AnimeX (relayed HLS with Sub/Dub & server selection) or Gotaku (authenticated player embeds).
            </p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-black/50 border border-rose-200/15 self-start">
            <button
              type="button"
              onClick={() => {
                setEngine('animex');
                setSelected(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                engine === 'animex' ? 'glass-btn-primary text-white' : 'text-rose-100/70'
              }`}
            >
              AnimeX (HLS + Sub/Dub)
            </button>
            <button
              type="button"
              onClick={() => {
                setEngine('gotaku');
                setSelected(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                engine === 'gotaku' ? 'glass-btn-primary text-white' : 'text-rose-100/70'
              }`}
            >
              Gotaku (Embeds)
            </button>
          </div>
        </div>

        {/* Search Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch(query);
          }}
          className="relative z-10 mt-5 flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-rose-200/60 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime titles…"
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-black/55 border border-rose-200/15 text-sm text-white placeholder:text-rose-100/40 focus:outline-none focus:border-rose-400"
            />
          </div>
          <button
            type="submit"
            className="glass-btn-primary h-11 px-6 rounded-xl text-sm font-semibold text-white cursor-pointer whitespace-nowrap"
          >
            Search Anime
          </button>
        </form>

        <div className="relative z-10 flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
          {FEATURED_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setQuery(q);
                void runSearch(q);
              }}
              className="glass-btn px-3 py-1.5 rounded-lg text-xs text-rose-100/80 whitespace-nowrap cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {Boolean(error) && <DomainNoticeBanner error={error} onRetry={() => void runSearch(query)} />}

      {/* Selected Anime Complete Episode Panel */}
      {selected && (
        <section className="glass-surface-elevated rounded-3xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row gap-5 items-start justify-between">
            <div className="flex gap-4 items-start">
              <img
                src={selected.poster || FALLBACK_ART.animeShowcase}
                alt={selected.title}
                referrerPolicy="no-referrer"
                className="w-20 sm:w-24 aspect-[2/3] object-cover rounded-xl border border-rose-200/15 shrink-0"
              />
              <div className="space-y-1.5">
                <p className="text-xs text-rose-200/70 tabular-nums">
                  {engine === 'animex' ? 'AnimeX Provider' : 'Gotaku Provider'}
                  {selected.year ? ` · ${selected.year}` : ''}
                  {episodes.length > 0 ? ` · ${episodes.length} Episodes` : ''}
                </p>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                  {selected.title}
                </h2>
                {selected.description && (
                  <p className="text-xs sm:text-sm text-rose-100/70 line-clamp-2 max-w-2xl">
                    {selected.description}
                  </p>
                )}
              </div>
            </div>

            {engine === 'animex' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex p-1 rounded-xl bg-black/40 border border-rose-200/10">
                  <button
                    type="button"
                    onClick={() => setSubOrDub('sub')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      subOrDub === 'sub' ? 'glass-btn-primary text-white' : 'text-rose-100/70'
                    }`}
                  >
                    SUB
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubOrDub('dub')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      subOrDub === 'dub' ? 'glass-btn-primary text-white' : 'text-rose-100/70'
                    }`}
                  >
                    DUB
                  </button>
                </div>

                {servers.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-rose-300" />
                    <select
                      aria-label="Select AnimeX server"
                      value={selectedServer}
                      onChange={(e) => setSelectedServer(e.target.value)}
                      className="h-9 px-3 rounded-xl bg-black/45 border border-rose-200/15 text-xs text-white"
                    >
                      <option value="" className="bg-[#14060b]">
                        Auto Server Fallback
                      </option>
                      {servers
                        .filter((s) => s.type === subOrDub)
                        .map((s) => (
                          <option key={`${s.type}-${s.id}`} value={s.id} className="bg-[#14060b]">
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {loadingEpisodes ? (
            <div className="flex items-center gap-2 text-sm text-rose-100/70 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              <span>Loading episodes…</span>
            </div>
          ) : episodes.length === 0 ? (
            <p className="text-sm text-rose-100/60">No episodes available for this title.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {episodes.map((ep) => {
                const progKeyId = engine === 'animex' ? selected.contentId : ep.id;
                const prog = getWatchProgress(progKeyId, 0, ep.number);
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
                const isInProgress = Boolean(prog && prog.position_seconds > 5 && !isWatched);

                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() =>
                      launchAnimeEpisode(selected, episodes, ep, engine, subOrDub, selectedServer)
                    }
                    className="relative overflow-hidden glass-btn p-3 rounded-xl text-left flex items-center justify-between gap-2.5 cursor-pointer hover:border-rose-400/50"
                  >
                    {ep.thumbnail && (
                      <img
                        src={ep.thumbnail}
                        alt={ep.title || `Episode ${ep.number}`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-16 aspect-video rounded-md object-cover shrink-0 border border-rose-200/10"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-white tabular-nums">
                          EP {ep.number}
                        </span>
                        {isWatched ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Watched</span>
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-200 tabular-nums">
                            <Clock className="w-3 h-3" />
                            <span>{pct}%</span>
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-rose-100/75 truncate block mt-0.5">
                        {ep.title || `Episode ${ep.number}`}
                      </span>
                      <span className="text-[10px] text-rose-100/50 truncate block">
                        {[ep.hasDub ? 'Sub · Dub' : 'Sub', ep.duration].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <Play className="w-3.5 h-3.5 text-rose-300 shrink-0" />

                    {pct > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                        <div
                          className={`h-full ${
                            isWatched
                              ? 'bg-emerald-400'
                              : 'bg-gradient-to-r from-rose-500 to-amber-300'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Compact Search Results Grid */}
      {loadingSearch ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="glass-surface rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[2/3] bg-rose-950/40" />
              <div className="px-2.5 py-2 space-y-1.5">
                <div className="h-3 bg-rose-900/40 rounded w-4/5" />
                <div className="h-2.5 bg-rose-900/30 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {results.map((item) => (
            <button
              key={item.contentId}
              type="button"
              onClick={() => void openAnime(item)}
              className="group glass-surface rounded-xl overflow-hidden text-left cursor-pointer transition-transform hover:-translate-y-0.5 hover:border-rose-300/25"
            >
              <div className="aspect-[2/3] w-full overflow-hidden bg-[#17080d] relative">
                <img
                  src={item.poster || FALLBACK_ART.animeShowcase}
                  alt={item.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080305] via-transparent to-transparent" />
              </div>
              <div className="px-2.5 py-2 space-y-0.5">
                <h3 className="font-display text-xs sm:text-[13px] font-semibold text-white truncate">
                  {item.title}
                </h3>
                <p className="text-[11px] text-rose-100/60 truncate tabular-nums">
                  {[item.type || 'Anime', item.year].filter(Boolean).join(' · ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
