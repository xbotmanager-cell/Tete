import { useState } from 'react';
import {
  Bookmark,
  Film,
  Home,
  LayoutTemplate,
  Radio,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { EditionSection, EditionShellProps } from '../types';
import { MinimalistHome } from './MinimalistHome';
import { MinimalistAnime, MinimalistDiscover } from './MinimalistPages';
import { LiveSportsPage } from '../../pages/LiveSportsPage';
import { NovelsPage } from '../../pages/NovelsPage';
import { LibraryPage } from '../../pages/LibraryPage';
import { SupportCenterPage } from '../../pages/SupportCenterPage';
import { AboutCreatorPage } from '../../pages/AboutCreatorPage';
import { ContactPage } from '../../pages/ContactPage';

const MINIMALIST_NAV: Array<{ id: EditionSection; label: string }> = [
  { id: 'home', label: 'Index' },
  { id: 'movies', label: 'Movies' },
  { id: 'series', label: 'Series' },
  { id: 'anime', label: 'Anime' },
  { id: 'live', label: 'Live' },
  { id: 'novels', label: 'Novels' },
  { id: 'support', label: 'Support' },
  { id: 'about', label: 'Creator' },
  { id: 'contact', label: 'Contact' },
];

const MINIMALIST_MOBILE: Array<{ id: EditionSection; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Index', icon: Home },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'anime', label: 'Anime', icon: Sparkles },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'library', label: 'Saved', icon: Bookmark },
];

export function MinimalistEdition({
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState(searchQuery);

  return (
    <div className="minimalist-canvas min-h-screen flex flex-col pb-20 md:pb-10">
      {/* Ultra-Clean Swiss Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigateSection('home')}
            className="font-minimal text-xl font-bold tracking-tight text-neutral-950 whitespace-nowrap cursor-pointer shrink-0"
          >
            LUPIN<span className="text-[#2563EB]">.</span>
          </button>

          <nav aria-label="Minimalist navigation" className="hidden lg:flex items-center gap-5 text-xs">
            {MINIMALIST_NAV.map((item) => {
              const active =
                section === item.id ||
                (item.id === 'live' && section === 'sports');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateSection(item.id)}
                  className={`py-5 border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? 'border-[#2563EB] text-neutral-950 font-semibold'
                      : 'border-transparent text-neutral-500 hover:text-neutral-950'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Toggle search"
              className="w-9 h-9 rounded-md border border-neutral-200 bg-white hover:border-neutral-950 flex items-center justify-center text-neutral-900 cursor-pointer"
            >
              {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setAppearanceModalOpen(true)}
              className="h-9 px-3 rounded-md border border-neutral-200 bg-white hover:border-neutral-950 text-xs font-medium text-neutral-900 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="hidden sm:inline">Editions</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (user) onNavigateSection('library');
                else setAuthModalOpen(true);
              }}
              className="h-9 px-3.5 rounded-md bg-neutral-950 hover:bg-[#2563EB] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>{user ? user.name.split(' ')[0] : 'Sign In'}</span>
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-neutral-200 bg-[#FAFAFA] px-4 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearchOpen(false);
                onSearchSubmit(draftQuery);
              }}
              className="max-w-xl mx-auto flex gap-2"
            >
              <input
                type="search"
                autoFocus
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                placeholder="Search movies, series, or genres…"
                className="flex-1 h-10 px-3.5 rounded-md border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-950"
              />
              <button
                type="submit"
                className="h-10 px-5 rounded-md bg-neutral-950 text-white text-xs font-medium cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {section === 'home' && (
          <MinimalistHome
            onSelectTitle={onSelectTitle}
            onPlayTarget={onPlayTarget}
            onNavigateSection={onNavigateSection}
          />
        )}
        {(section === 'discover' || section === 'movies' || section === 'series') && (
          <MinimalistDiscover
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
        {section === 'anime' && <MinimalistAnime onPlay={onPlayTarget} />}
        {(section === 'live' || section === 'sports') && (
          <LiveSportsPage
            onPlay={onPlayTarget}
            initialTab={section === 'sports' ? 'sports' : liveTab}
          />
        )}
        {section === 'novels' && <NovelsPage />}
        {section === 'library' && (
          <LibraryPage
            onSelectTitle={onSelectTitle}
            onPlayTarget={onPlayTarget}
            initialTab={libraryTab}
          />
        )}
        {section === 'support' && <SupportCenterPage onNavigateSection={onNavigateSection} />}
        {section === 'about' && <AboutCreatorPage onNavigateSection={onNavigateSection} />}
        {section === 'contact' && <ContactPage />}
      </main>

      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
        <span className="font-minimal font-semibold text-neutral-900">
          LUPIN MOVIES · Minimalist Edition
        </span>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <button type="button" onClick={() => onNavigateSection('support')} className="hover:text-neutral-950 cursor-pointer">
            Support Center
          </button>
          <button type="button" onClick={() => onNavigateSection('about')} className="hover:text-neutral-950 cursor-pointer">
            About Lupin Starnley
          </button>
          <button type="button" onClick={() => onNavigateSection('contact')} className="hover:text-neutral-950 cursor-pointer">
            Contact Us
          </button>
          <button
            type="button"
            onClick={() => setAppearanceModalOpen(true)}
            className="px-3 py-1.5 rounded-md border border-neutral-200 bg-white text-neutral-900 hover:border-neutral-950 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Switch Edition</span>
          </button>
        </div>
      </footer>

      {/* Mobile Bottom Dock */}
      <nav
        aria-label="Minimalist mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 border-t border-neutral-200 backdrop-blur-sm"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          {MINIMALIST_MOBILE.map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigateSection(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  active ? 'text-[#2563EB] font-semibold' : 'text-neutral-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
