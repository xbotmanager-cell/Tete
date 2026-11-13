import { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Clock,
  Heart,
  LayoutTemplate,
  LogIn,
  LogOut,
  Save,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ActivePlaybackTarget, MediaItem } from '../types/framex';
import { ClassicMediaCard } from '../editions/classic/ClassicMediaCard';
import { SidebarGridCard } from '../editions/sidebar/SidebarMediaCard';
import { CinematicPosterCard } from '../editions/cinematic/CinematicMediaCard';
import { AppearanceSection } from '../components/AppearanceSwitcher';

export type LibraryTab = 'watchlist' | 'favorites' | 'history' | 'reading' | 'appearance' | 'settings';

interface LibraryPageProps {
  onSelectTitle: (item: MediaItem) => void;
  onPlayTarget: (target: ActivePlaybackTarget) => void;
  initialTab?: LibraryTab;
}

export function LibraryPage({
  onSelectTitle,
  onPlayTarget,
  initialTab = 'watchlist',
}: LibraryPageProps) {
  const {
    user,
    layoutMode,
    library,
    watchProgress,
    readingProgress,
    setAuthModalOpen,
    logout,
    updateProfile,
  } = useAuth();

  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const [quality, setQuality] = useState(user?.preferred_quality || '1080');
  const [subLang, setSubLang] = useState(user?.preferred_subtitle_lang || 'en');
  const [audioLang, setAudioLang] = useState(user?.preferred_audio_lang || 'en');
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setQuality(user.preferred_quality || '1080');
      setSubLang(user.preferred_subtitle_lang || 'en');
      setAudioLang(user.preferred_audio_lang || 'en');
    }
  }, [user]);

  const watchlistItems = library.filter((x) => x.list_type === 'watchlist');
  const favoriteMovies = library.filter((x) => x.list_type === 'favorite' && x.media_type !== 'series');
  const favoriteSeries = library.filter((x) => x.list_type === 'favorite' && x.media_type === 'series');

  const continueItems = useMemo(
    () =>
      watchProgress.filter(
        (w) =>
          w.position_seconds > 5 &&
          (!w.duration_seconds || w.position_seconds < w.duration_seconds - 15)
      ),
    [watchProgress]
  );

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(null);
    await updateProfile({
      name: displayName || user?.name,
      preferred_quality: quality,
      preferred_subtitle_lang: subLang,
      preferred_audio_lang: audioLang,
    });
    setSavedMsg('Preferences saved to your account.');
  };

  const renderEditionCard = (
    item: MediaItem,
    extra?: { progressPercent?: number; subtitleOverride?: string; onQuickPlay?: () => void }
  ) => {
    if (layoutMode === 'sidebar') {
      return (
        <SidebarGridCard
          item={item}
          onSelect={onSelectTitle}
          onQuickPlay={extra?.onQuickPlay}
          progressPercent={extra?.progressPercent}
          subtitleOverride={extra?.subtitleOverride}
        />
      );
    }
    if (layoutMode === 'cinematic') {
      return (
        <CinematicPosterCard
          item={item}
          onSelect={onSelectTitle}
          onQuickPlay={extra?.onQuickPlay}
          progressPercent={extra?.progressPercent}
          subtitleOverride={extra?.subtitleOverride}
        />
      );
    }
    return (
      <ClassicMediaCard
        item={item}
        onSelect={onSelectTitle}
        onQuickPlay={extra?.onQuickPlay}
        progressPercent={extra?.progressPercent}
        subtitleOverride={extra?.subtitleOverride}
      />
    );
  };

  const isSidebar = layoutMode === 'sidebar';
  const isCinematic = layoutMode === 'cinematic';

  const headerClass = isSidebar
    ? 'rounded-lg border border-zinc-800 bg-[#0c0c0f] p-5 sm:p-6'
    : isCinematic
      ? 'rounded-lg bg-[#141414] border border-white/10 p-6 sm:p-8'
      : 'glass-surface-elevated rounded-3xl p-6 sm:p-8';

  const panelClass = isSidebar
    ? 'rounded-lg border border-zinc-800 bg-[#0c0c0f] p-6'
    : isCinematic
      ? 'rounded-lg bg-[#141414] border border-white/10 p-6'
      : 'glass-surface rounded-3xl p-6';

  const titleClass = isSidebar
    ? 'font-console text-xl sm:text-2xl font-bold text-white'
    : isCinematic
      ? 'font-cinema text-3xl sm:text-5xl uppercase tracking-wide text-white leading-none'
      : 'font-editorial text-3xl sm:text-4xl font-semibold text-amber-50';

  const subTextClass = isSidebar
    ? 'font-mono text-xs text-zinc-400'
    : isCinematic
      ? 'text-xs sm:text-sm text-neutral-400'
      : 'text-sm text-rose-100/70';

  const primaryBtnClass = isSidebar
    ? 'h-9 px-4 rounded-md bg-white text-black hover:bg-cyan-300 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors'
    : isCinematic
      ? 'h-10 px-5 rounded bg-[#e50914] hover:bg-[#f40612] text-xs font-bold text-white inline-flex items-center gap-2 cursor-pointer transition-colors'
      : 'glass-btn-primary h-11 px-5 rounded-full text-sm font-semibold text-white inline-flex items-center gap-2 cursor-pointer';

  const secondaryBtnClass = isSidebar
    ? 'h-9 px-4 rounded-md border border-zinc-700 bg-zinc-900 text-xs font-medium text-zinc-100 hover:border-zinc-500 inline-flex items-center gap-2 cursor-pointer'
    : isCinematic
      ? 'h-10 px-5 rounded border border-neutral-700 bg-[#1c1c1c] text-xs font-semibold text-white hover:border-white inline-flex items-center gap-2 cursor-pointer'
      : 'glass-btn h-11 px-4 rounded-full text-sm font-medium text-amber-100 inline-flex items-center gap-2 cursor-pointer';

  const inputClass = isSidebar
    ? 'w-full h-10 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-white'
    : isCinematic
      ? 'w-full h-10 px-3 rounded bg-black border border-neutral-700 text-sm text-white'
      : 'w-full h-11 px-3.5 rounded-xl bg-black/45 border border-rose-200/15 text-sm text-white';

  return (
    <div className="space-y-6">
      {/* Edition-Matched Header */}
      <section className={`${headerClass} flex flex-col sm:flex-row sm:items-center justify-between gap-5`}>
        <div className="space-y-1">
          {isSidebar && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-cyan-400">
              USER_WORKSPACE · LIBRARY_&_SETTINGS
            </p>
          )}
          {isCinematic && (
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#e50914]">
              PERSONAL PROFILE & LIST
            </p>
          )}
          <h1 className={titleClass}>
            {user
              ? isCinematic
                ? `${user.name}'s My List`
                : `${user.name}'s Library`
              : isCinematic
                ? 'My List & Profile'
                : 'Personal Library'}
          </h1>
          <p className={subTextClass}>
            {user
              ? `${user.email} · Synced across sessions`
              : 'Viewing local guest library. Sign in to persist across devices.'}
          </p>
        </div>

        {user ? (
          <button type="button" onClick={() => void logout()} className={secondaryBtnClass}>
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        ) : (
          <button type="button" onClick={() => setAuthModalOpen(true)} className={primaryBtnClass}>
            <LogIn className="w-4 h-4" />
            <span>Sign In / Register</span>
          </button>
        )}
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'watchlist', label: `${isCinematic ? 'My List' : 'Watchlist'} (${watchlistItems.length})`, icon: Bookmark },
          { id: 'favorites', label: `Favorites (${favoriteMovies.length + favoriteSeries.length})`, icon: Heart },
          { id: 'history', label: `History (${watchProgress.length})`, icon: Clock },
          { id: 'reading', label: `Reading (${readingProgress.length})`, icon: BookOpen },
          { id: 'appearance', label: 'Editions', icon: LayoutTemplate },
          { id: 'settings', label: 'Preferences', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as LibraryTab)}
              className={`px-3.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                isSidebar
                  ? `rounded-md font-mono ${
                      active
                        ? 'bg-white text-black font-semibold'
                        : 'border border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:text-white'
                    }`
                  : isCinematic
                    ? `rounded ${
                        active
                          ? 'bg-[#e50914] text-white font-bold'
                          : 'bg-[#141414] border border-neutral-800 text-neutral-300 hover:text-white'
                      }`
                    : `rounded-full ${
                        active ? 'glass-btn-primary text-white' : 'glass-btn text-amber-100/80'
                      }`
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Watchlist */}
      {tab === 'watchlist' &&
        (watchlistItems.length === 0 ? (
          <div className={`${panelClass} text-center text-sm text-zinc-400 py-12`}>
            Your watchlist is empty. Click the bookmark button on any movie or series to save it here.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3">
            {watchlistItems.map((item) => (
              <div key={`${item.item_id}-${item.media_type}`}>
                {renderEditionCard({
                  id: item.item_id,
                  subjectId: item.item_id,
                  slug: item.slug,
                  title: item.title,
                  poster: item.poster,
                  year: item.year,
                  type: item.media_type === 'series' ? 'series' : 'movie',
                  source: item.provider,
                  genres: [],
                })}
              </div>
            ))}
          </div>
        ))}

      {/* Favorites */}
      {tab === 'favorites' && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className={isCinematic ? 'font-cinema text-2xl uppercase text-white' : isSidebar ? 'font-console text-lg font-semibold text-white' : 'font-editorial text-2xl font-semibold text-amber-50'}>
              Favorite Movies
            </h2>
            {favoriteMovies.length === 0 ? (
              <p className={subTextClass}>No favorite movies added yet.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3">
                {favoriteMovies.map((item) => (
                  <div key={`${item.item_id}-${item.media_type}`}>
                    {renderEditionCard({
                      id: item.item_id,
                      subjectId: item.item_id,
                      slug: item.slug,
                      title: item.title,
                      poster: item.poster,
                      year: item.year,
                      type: 'movie',
                      source: item.provider,
                      genres: [],
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className={isCinematic ? 'font-cinema text-2xl uppercase text-white' : isSidebar ? 'font-console text-lg font-semibold text-white' : 'font-editorial text-2xl font-semibold text-amber-50'}>
              Favorite Series
            </h2>
            {favoriteSeries.length === 0 ? (
              <p className={subTextClass}>No favorite series added yet.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3">
                {favoriteSeries.map((item) => (
                  <div key={`${item.item_id}-${item.media_type}`}>
                    {renderEditionCard({
                      id: item.item_id,
                      subjectId: item.item_id,
                      slug: item.slug,
                      title: item.title,
                      poster: item.poster,
                      year: item.year,
                      type: 'series',
                      source: item.provider,
                      genres: [],
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* History */}
      {tab === 'history' &&
        (watchProgress.length === 0 ? (
          <div className={`${panelClass} text-center text-sm text-zinc-400 py-12`}>
            No watch history recorded yet.
          </div>
        ) : (
          <div className="space-y-8">
            {continueItems.length > 0 && (
              <section className="space-y-3">
                <h2 className={isCinematic ? 'font-cinema text-2xl uppercase text-white' : isSidebar ? 'font-console text-lg font-semibold text-white' : 'font-editorial text-2xl font-semibold text-amber-50'}>
                  Continue Watching
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3">
                  {continueItems.map((w) => {
                    const pct =
                      w.duration_seconds > 0
                        ? Math.round((w.position_seconds / w.duration_seconds) * 100)
                        : 15;
                    return (
                      <div key={`cw-${w.content_id}-${w.season}-${w.episode}`}>
                        {renderEditionCard(
                          {
                            id: w.content_id,
                            subjectId: w.content_id,
                            slug: w.slug,
                            title: w.title,
                            poster: w.poster,
                            type: w.media_type === 'series' ? 'series' : 'movie',
                            source: w.provider,
                            genres: [],
                          },
                          {
                            progressPercent: pct,
                            subtitleOverride:
                              w.season > 0 ? `S${w.season} E${w.episode} · ${pct}%` : `${pct}% watched`,
                            onQuickPlay: () =>
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
                              }),
                          }
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h2 className={isCinematic ? 'font-cinema text-2xl uppercase text-white' : isSidebar ? 'font-console text-lg font-semibold text-white' : 'font-editorial text-2xl font-semibold text-amber-50'}>
                Recently Watched
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3">
                {watchProgress.map((w) => {
                  const pct =
                    w.duration_seconds > 0
                      ? Math.round((w.position_seconds / w.duration_seconds) * 100)
                      : 0;
                  return (
                    <div key={`${w.content_id}-${w.season}-${w.episode}`}>
                      {renderEditionCard(
                        {
                          id: w.content_id,
                          subjectId: w.content_id,
                          slug: w.slug,
                          title: w.title,
                          poster: w.poster,
                          type: w.media_type === 'series' ? 'series' : 'movie',
                          source: w.provider,
                          genres: [],
                        },
                        {
                          progressPercent: pct,
                          subtitleOverride:
                            w.season > 0 ? `S${w.season} E${w.episode} · ${pct}%` : `${pct}% watched`,
                          onQuickPlay: () =>
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
                            }),
                        }
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ))}

      {/* Reading */}
      {tab === 'reading' &&
        (readingProgress.length === 0 ? (
          <div className={`${panelClass} text-center text-sm text-zinc-400 py-12`}>
            No novel reading history yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {readingProgress.map((r) => (
              <div key={r.novel_id} className={`${panelClass} !p-4 space-y-1`}>
                <h3 className="text-sm font-semibold text-white truncate">{r.novel_title}</h3>
                <p className="text-xs text-neutral-400 truncate">{r.chapter_title}</p>
                <p className="font-mono text-[11px] text-cyan-400 tabular-nums">
                  Progress: {Math.round(r.progress_percent)}%
                </p>
              </div>
            ))}
          </div>
        ))}

      {/* Appearance Switcher */}
      {tab === 'appearance' && (
        <section className={panelClass}>
          <AppearanceSection />
        </section>
      )}

      {/* Playback & Account Settings */}
      {tab === 'settings' && (
        <section className={`${panelClass} max-w-xl space-y-5`}>
          <h2 className={isCinematic ? 'font-cinema text-2xl uppercase text-white' : isSidebar ? 'font-console text-lg font-semibold text-white' : 'font-editorial text-2xl font-semibold text-amber-50'}>
            Playback & Account Preferences
          </h2>
          {!user ? (
            <div className="space-y-3">
              <p className={subTextClass}>
                Sign in or create an account to save your default resolution, subtitle language, and audio preferences.
              </p>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className={primaryBtnClass}
              >
                Sign In / Create Account
              </button>
            </div>
          ) : (
            <form onSubmit={handleSavePrefs} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300 block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">Quality</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className={inputClass}
                  >
                    <option value="1080">1080p HD</option>
                    <option value="720">720p HD</option>
                    <option value="480">480p SD</option>
                    <option value="360">360p</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">Subtitles</label>
                  <input
                    type="text"
                    value={subLang}
                    onChange={(e) => setSubLang(e.target.value)}
                    placeholder="en"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">Audio</label>
                  <input
                    type="text"
                    value={audioLang}
                    onChange={(e) => setAudioLang(e.target.value)}
                    placeholder="en"
                    className={inputClass}
                  />
                </div>
              </div>

              {savedMsg && <p className="text-xs text-emerald-400">{savedMsg}</p>}

              <button type="submit" className={primaryBtnClass}>
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
