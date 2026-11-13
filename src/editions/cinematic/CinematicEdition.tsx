import { useEffect, useState } from 'react';
import {
  Bookmark,
  Film,
  Home,
  LayoutTemplate,
  Radio,
  Search,
  Sparkles,
  Tv,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { EditionSection, EditionShellProps } from '../types';
import { CinematicHome } from './CinematicHome';
import { CinematicAnime, CinematicDiscover } from './CinematicPages';
import { LiveSportsPage } from '../../pages/LiveSportsPage';
import { NovelsPage } from '../../pages/NovelsPage';
import { LibraryPage } from '../../pages/LibraryPage';

const CINEMATIC_NAV: Array<{ id: EditionSection; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'series', label: 'TV Shows' },
  { id: 'movies', label: 'Movies' },
  { id: 'anime', label: 'Anime' },
  { id: 'live', label: 'Live & Sports' },
  { id: 'novels', label: 'Novels' },
  { id: 'library', label: 'My List' },
];

const CINEMATIC_MOBILE: Array<{ id: EditionSection; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'series', label: 'Series', icon: Tv },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'library', label: 'My List', icon: Bookmark },
];

export function CinematicEdition({
  section,
  searchQuery,
  discoverTab,
  liveTab,
  libraryTab,
  onNavigateSection,
  onSearchSubmit,
  onSelectTitle,
  onPlayTarget,
}: EditionShellProps) {
  const { user, setAppearanceModalOpen, setAuthModalOpen } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [draftQuery, setDraftQuery] = useState(searchQuery);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isOverlayHero = section === 'home' && !scrolled;

  return (
    <div className="cinematic-canvas min-h-screen flex flex-col pb-20 md:pb-8">
      {/* Transparent-to-Solid Fixed Theatrical Header */}
      <header
        className={`fixed top-0 inset-x-0 z-40 h-16 px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-4 transition-colors duration-300 ${
          isOverlayHero
            ? 'bg-gradient-to-b from-black/90 via-black/45 to-transparent'
            : 'bg-[#080808]/95 border-b border-white/10 backdrop-blur-md'
        }`}
      >
        <div className="flex items-center gap-7 min-w-0">
          <button
            type="button"
            onClick={() => onNavigateSection('home')}
            className="font-cinema text-3xl sm:text-4xl tracking-wider text-[#e50914] shrink-0 cursor-pointer leading-none"
          >
            LUPIN
          </button>

          <nav aria-label="Cinematic navigation" className="hidden lg:flex items-center gap-5">
            {CINEMATIC_NAV.map((item) => {
              const active =
                section === item.id ||
                (item.id === 'live' && section === 'sports');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateSection(item.id)}
                  className={`text-xs sm:text-sm whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? 'text-white font-bold'
                      : 'text-neutral-300 hover:text-white font-normal'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Expanding Search + Editions + Square Profile Tile */}
        <div className="flex items-center gap-2.5 shrink-0">
          {searchExpanded ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit(draftQuery);
              }}
              className="flex items-center bg-black/90 border border-white/75 rounded px-2.5 h-9 w-48 sm:w-64"
            >
              <Search className="w-4 h-4 text-white shrink-0 mr-2" />
              <input
                type="search"
                autoFocus
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                placeholder="Titles, genres…"
                className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-neutral-400 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={() => setSearchExpanded(false)}
                className="text-neutral-400 hover:text-white cursor-pointer ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchExpanded(true)}
              aria-label="Open search"
              className="w-9 h-9 rounded hover:bg-white/10 flex items-center justify-center text-white cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigateSection('anime')}
            aria-label="Anime"
            className="lg:hidden w-9 h-9 rounded hover:bg-white/10 flex items-center justify-center text-white"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setAppearanceModalOpen(true)}
            aria-label="Editions"
            className="h-9 px-3 rounded border border-white/25 bg-black/55 hover:border-white text-xs font-medium text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-[#e50914]" />
            <span className="hidden sm:inline">Editions</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (user) onNavigateSection('library');
              else setAuthModalOpen(true);
            }}
            aria-label="Profile & My List"
            className="h-9 px-2.5 rounded bg-[#e50914] hover:bg-[#f40612] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{user ? user.name.split(' ')[0] : 'Sign In'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        {section === 'home' && (
          <CinematicHome
            onSelectTitle={onSelectTitle}
            onPlayTarget={onPlayTarget}
            onNavigateSection={onNavigateSection}
          />
        )}
        {(section === 'discover' || section === 'movies' || section === 'series') && (
          <CinematicDiscover
            onSelectTitle={onSelectTitle}
            initialTab={
              section === 'movies'
                ? 'popular_movies'
                : section === 'series'
                  ? 'popular_series'
                  : discoverTab
            }
            initialQuery={searchQuery}
            focusType={section === 'movies' ? 'movies' : section === 'series' ? 'series' : 'all'}
          />
        )}
        {section === 'anime' && <CinematicAnime onPlay={onPlayTarget} />}
        {(section === 'live' || section === 'sports') && (
          <div className="pt-20 sm:pt-24 pb-12 px-4 sm:px-8 lg:px-12 max-w-[1440px] mx-auto">
            <LiveSportsPage
              onPlay={onPlayTarget}
              initialTab={section === 'sports' ? 'sports' : liveTab}
            />
          </div>
        )}
        {section === 'novels' && (
          <div className="pt-20 sm:pt-24 pb-12 px-4 sm:px-8 lg:px-12 max-w-[1440px] mx-auto">
            <NovelsPage />
          </div>
        )}
        {section === 'library' && (
          <div className="pt-20 sm:pt-24 pb-12 px-4 sm:px-8 lg:px-12 max-w-[1440px] mx-auto">
            <LibraryPage
              onSelectTitle={onSelectTitle}
              onPlayTarget={onPlayTarget}
              initialTab={libraryTab}
            />
          </div>
        )}
      </main>

      <footer className="px-4 sm:px-8 lg:px-12 py-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
        <span className="font-cinema text-lg tracking-wider text-neutral-400">
          LUPIN MOVIES · CINEMATIC THEATER EDITION
        </span>
        <button
          type="button"
          onClick={() => setAppearanceModalOpen(true)}
          className="px-3.5 py-1.5 rounded border border-neutral-700 text-neutral-300 hover:border-white hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-[#e50914]" />
          <span>Switch Website Edition</span>
        </button>
      </footer>

      {/* Mobile Theater Bottom Dock */}
      <nav
        aria-label="Cinematic mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#080808]/95 border-t border-neutral-800 backdrop-blur-md"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          {CINEMATIC_MOBILE.map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigateSection(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  active ? 'text-[#e50914]' : 'text-neutral-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
