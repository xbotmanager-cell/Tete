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
import { getEditionTheme } from '../lib/editionTheme';
import type { ActivePlaybackTarget, MediaItem } from '../types/framex';
import { ClassicMediaCard } from '../editions/classic/ClassicMediaCard';
import { SidebarGridCard } from '../editions/sidebar/SidebarMediaCard';
import { CinematicPosterCard } from '../editions/cinematic/CinematicMediaCard';
import { EditorialFigureCard } from '../editions/editorial/EditorialMediaCard';
import { NeonPosterTile } from '../editions/neon/NeonMediaCard';
import { MinimalistPosterCard } from '../editions/minimalist/MinimalistMediaCard';
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

  const t = getEditionTheme(layoutMode);

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
    if (layoutMode === 'editorial') {
      return (
        <EditorialFigureCard
          item={item}
          onSelect={onSelectTitle}
          onQuickPlay={extra?.onQuickPlay}
          progressPercent={extra?.progressPercent}
          subtitleOverride={extra?.subtitleOverride}
        />
      );
    }
    if (layoutMode === 'neon') {
      return (
        <NeonPosterTile
          item={item}
          onSelect={onSelectTitle}
          onQuickPlay={extra?.onQuickPlay}
          progressPercent={extra?.progressPercent}
          subtitleOverride={extra?.subtitleOverride}
        />
      );
    }
    if (layoutMode === 'minimalist') {
      return (
        <MinimalistPosterCard
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

  const headerTitleClass = `${t.heading} text-2xl sm:text-4xl`;
  const sectionHeadingClass = `${t.subHeading} text-xl sm:text-2xl`;

  return (
    <div className={`space-y-6 ${t.pageContainer}`}>
      {/* Edition-Matched Header */}
      <section className={`${t.elevatedPanel} p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5`}>
        <div className="space-y-1">
          <p className={t.monoBadge}>
            {isSidebar
              ? 'USER_WORKSPACE · LIBRARY_&_SETTINGS'
              : isCinematic
                ? 'PERSONAL PROFILE & LIST'
                : 'PERSONAL COLLECTION & SETTINGS'}
          </p>
          <h1 className={headerTitleClass}>
            {user
              ? isCinematic
                ? `${user.name}'s My List`
                : `${user.name}'s Library`
              : isCinematic
                ? 'My List & Profile'
                : 'Personal Library'}
          </h1>
          <p className={`text-xs sm:text-sm ${t.muted}`}>
            {user
              ? `${user.email} · Synced across sessions`
              : 'Viewing local guest library. Sign in to persist across devices.'}
          </p>
        </div>

        {user ? (
          <button
            type="button"
            onClick={() => void logout()}
            className={`${t.secondaryBtn} h-10 px-4 text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer`}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className={`${t.primaryBtn} h-10 px-5 text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer`}
          >
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
        ].map((itemTab) => {
          const Icon = itemTab.icon;
          const active = tab === itemTab.id;
          return (
            <button
              key={itemTab.id}
              type="button"
              onClick={() => setTab(itemTab.id as LibraryTab)}
              className={`px-3.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                active ? t.tabActive : t.tabIdle
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{itemTab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Watchlist */}
      {tab === 'watchlist' &&
        (watchlistItems.length === 0 ? (
          <div className={`${t.panel} text-center text-sm ${t.muted} py-12 px-4`}>
            Your watchlist is empty. Click the bookmark button on any movie or series to save it here.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
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
            <h2 className={sectionHeadingClass}>Favorite Movies</h2>
            {favoriteMovies.length === 0 ? (
              <p className={`text-sm ${t.muted}`}>No favorite movies added yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
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
            <h2 className={sectionHeadingClass}>Favorite Series</h2>
            {favoriteSeries.length === 0 ? (
              <p className={`text-sm ${t.muted}`}>No favorite series added yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
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
          <div className={`${t.panel} text-center text-sm ${t.muted} py-12 px-4`}>
            No watch history recorded yet.
          </div>
        ) : (
          <div className="space-y-8">
            {continueItems.length > 0 && (
              <section className="space-y-3">
                <h2 className={sectionHeadingClass}>Continue Watching</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
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
              <h2 className={sectionHeadingClass}>Recently Watched</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
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
          <div className={`${t.panel} text-center text-sm ${t.muted} py-12 px-4`}>
            No novel reading history yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {readingProgress.map((r) => (
              <div key={r.novel_id} className={`${t.card} p-4 space-y-1`}>
                <h3 className="text-sm font-semibold truncate">{r.novel_title}</h3>
                <p className={`text-xs ${t.muted} truncate`}>{r.chapter_title}</p>
                <p className={`font-mono text-[11px] ${t.accentText} tabular-nums`}>
                  Progress: {Math.round(r.progress_percent)}%
                </p>
              </div>
            ))}
          </div>
        ))}

      {/* Appearance Switcher */}
      {tab === 'appearance' && (
        <section className={`${t.panel} p-6`}>
          <AppearanceSection />
        </section>
      )}

      {/* Playback & Account Settings */}
      {tab === 'settings' && (
        <section className={`${t.panel} p-6 max-w-xl space-y-5`}>
          <h2 className={sectionHeadingClass}>Playback & Account Preferences</h2>
          {!user ? (
            <div className="space-y-3">
              <p className={`text-sm ${t.muted}`}>
                Sign in or create an account to save your default resolution, subtitle language, and audio preferences.
              </p>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className={`${t.primaryBtn} h-10 px-5 text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer`}
              >
                Sign In / Create Account
              </button>
            </div>
          ) : (
            <form onSubmit={handleSavePrefs} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full h-10 px-3 text-sm ${t.input}`}
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium block">Quality</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className={`w-full h-10 px-3 text-sm ${t.input}`}
                  >
                    <option value="1080">1080p HD</option>
                    <option value="720">720p HD</option>
                    <option value="480">480p SD</option>
                    <option value="360">360p</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium block">Subtitles</label>
                  <input
                    type="text"
                    value={subLang}
                    onChange={(e) => setSubLang(e.target.value)}
                    placeholder="en"
                    className={`w-full h-10 px-3 text-sm ${t.input}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium block">Audio</label>
                  <input
                    type="text"
                    value={audioLang}
                    onChange={(e) => setAudioLang(e.target.value)}
                    placeholder="en"
                    className={`w-full h-10 px-3 text-sm ${t.input}`}
                  />
                </div>
              </div>

              {savedMsg && <p className="text-xs text-emerald-500">{savedMsg}</p>}

              <button
                type="submit"
                className={`${t.primaryBtn} h-10 px-5 text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer`}
              >
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
