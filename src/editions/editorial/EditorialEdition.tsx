import { useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Film,
  Home,
  LayoutTemplate,
  Radio,
  Search,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { EditionSection, EditionShellProps } from '../types';
import { EditorialHome } from './EditorialHome';
import { EditorialAnime, EditorialDiscover } from './EditorialPages';
import { LiveSportsPage } from '../../pages/LiveSportsPage';
import { NovelsPage } from '../../pages/NovelsPage';
import { LibraryPage } from '../../pages/LibraryPage';
import { SupportCenterPage } from '../../pages/SupportCenterPage';
import { AboutCreatorPage } from '../../pages/AboutCreatorPage';
import { ContactPage } from '../../pages/ContactPage';

const EDITORIAL_NAV: Array<{ id: EditionSection; label: string }> = [
  { id: 'home', label: 'Front Page' },
  { id: 'discover', label: 'Film Index' },
  { id: 'series', label: 'Series' },
  { id: 'anime', label: 'Anime' },
  { id: 'live', label: 'Live & Sports' },
  { id: 'novels', label: 'Novels' },
  { id: 'support', label: 'Support' },
  { id: 'about', label: 'Creator' },
  { id: 'contact', label: 'Contact' },
];

const EDITORIAL_MOBILE: Array<{ id: EditionSection; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Front', icon: Home },
  { id: 'discover', label: 'Index', icon: Film },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'novels', label: 'Novels', icon: BookOpen },
  { id: 'library', label: 'Folio', icon: Bookmark },
];

export function EditorialEdition({
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
    <div className="editorial-canvas min-h-screen flex flex-col pb-20 md:pb-10">
      {/* Broadsheet Newspaper Masthead */}
      <header className="bg-[#FBF9F5] border-b-2 border-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="hidden md:block text-[11px] font-mono uppercase tracking-widest text-stone-500">
              Editorial Edition · Est. Lupin Starnley
            </div>

            <button
              type="button"
              onClick={() => onNavigateSection('home')}
              className="font-editorial-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-950 whitespace-nowrap cursor-pointer"
            >
              LUPIN CHRONICLE
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Search chronicle"
                className="h-9 w-9 border border-stone-300 bg-white hover:border-stone-900 flex items-center justify-center text-stone-900 cursor-pointer"
              >
                {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setAppearanceModalOpen(true)}
                className="h-9 px-3 border border-stone-300 bg-white hover:border-stone-900 text-xs font-medium text-stone-900 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LayoutTemplate className="w-3.5 h-3.5 text-[#9A3412]" />
                <span className="hidden sm:inline">Editions</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (user) onNavigateSection('library');
                  else setAuthModalOpen(true);
                }}
                className="h-9 px-3.5 bg-stone-950 hover:bg-[#9A3412] text-[#FBF9F5] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>{user ? user.name.split(' ')[0] : 'Sign In'}</span>
              </button>
            </div>
          </div>

          {/* Horizontal Department Bar */}
          <nav
            aria-label="Editorial departments"
            className="hidden md:flex items-center justify-center gap-6 mt-3 pt-2.5 border-t border-stone-300 text-xs font-sans uppercase tracking-wider"
          >
            {EDITORIAL_NAV.map((item) => {
              const active =
                section === item.id ||
                (item.id === 'discover' && section === 'movies') ||
                (item.id === 'live' && section === 'sports');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateSection(item.id)}
                  className={`py-1 whitespace-nowrap cursor-pointer border-b-2 transition-colors ${
                    active
                      ? 'border-[#9A3412] text-[#9A3412] font-bold'
                      : 'border-transparent text-stone-700 hover:text-stone-950'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onNavigateSection('library')}
              className={`py-1 whitespace-nowrap cursor-pointer border-b-2 transition-colors ${
                section === 'library'
                  ? 'border-[#9A3412] text-[#9A3412] font-bold'
                  : 'border-transparent text-stone-700 hover:text-stone-950'
              }`}
            >
              My Folio
            </button>
          </nav>

          {searchOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearchOpen(false);
                onSearchSubmit(draftQuery);
              }}
              className="mt-3 pt-3 border-t border-stone-300 flex gap-2 max-w-2xl mx-auto"
            >
              <input
                type="search"
                autoFocus
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                placeholder="Search archival cinema & series…"
                className="flex-1 h-10 px-3.5 bg-white border border-stone-400 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
              />
              <button
                type="submit"
                className="h-10 px-5 bg-stone-950 text-white text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Search
              </button>
            </form>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {section === 'home' && (
          <EditorialHome
            onSelectTitle={onSelectTitle}
            onPlayTarget={onPlayTarget}
            onNavigateSection={onNavigateSection}
          />
        )}
        {(section === 'discover' || section === 'movies' || section === 'series') && (
          <EditorialDiscover
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
        {section === 'anime' && <EditorialAnime onPlay={onPlayTarget} />}
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

      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t-2 border-stone-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-700">
        <span className="font-editorial-serif text-base font-bold text-stone-950">
          LUPIN MOVIES · Editorial Broadsheet Edition
        </span>
        <div className="flex flex-wrap items-center justify-center gap-4 font-sans">
          <button type="button" onClick={() => onNavigateSection('support')} className="hover:text-[#9A3412] underline cursor-pointer">
            Support Center
          </button>
          <button type="button" onClick={() => onNavigateSection('about')} className="hover:text-[#9A3412] underline cursor-pointer">
            About Lupin Starnley
          </button>
          <button type="button" onClick={() => onNavigateSection('contact')} className="hover:text-[#9A3412] underline cursor-pointer">
            Contact Us
          </button>
          <button
            type="button"
            onClick={() => setAppearanceModalOpen(true)}
            className="px-3 py-1 border border-stone-400 bg-white hover:border-stone-950 text-stone-900 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-[#9A3412]" />
            <span>Switch Edition</span>
          </button>
        </div>
      </footer>

      {/* Mobile Broadsheet Reader Dock */}
      <nav
        aria-label="Editorial mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FBF9F5] border-t border-stone-400"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          {EDITORIAL_MOBILE.map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigateSection(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  active ? 'text-[#9A3412] font-bold' : 'text-stone-600'
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
