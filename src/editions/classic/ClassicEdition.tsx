import { useState } from 'react';
import {
  Bookmark,
  BookOpen,
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
import { ClassicHome } from './ClassicHome';
import { ClassicDiscover } from './ClassicDiscover';
import { AnimePage } from '../../pages/AnimePage';
import { LiveSportsPage } from '../../pages/LiveSportsPage';
import { NovelsPage } from '../../pages/NovelsPage';
import { LibraryPage } from '../../pages/LibraryPage';
import { SupportCenterPage } from '../../pages/SupportCenterPage';
import { AboutCreatorPage } from '../../pages/AboutCreatorPage';
import { ContactPage } from '../../pages/ContactPage';

const CLASSIC_NAV: Array<{ id: EditionSection; label: string }> = [
  { id: 'home', label: 'Salon' },
  { id: 'discover', label: 'Catalog' },
  { id: 'anime', label: 'Anime' },
  { id: 'live', label: 'Live & Sports' },
  { id: 'novels', label: 'Novels' },
  { id: 'support', label: 'Support' },
  { id: 'about', label: 'Creator' },
  { id: 'contact', label: 'Contact' },
];

const CLASSIC_MOBILE: Array<{ id: EditionSection; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Salon', icon: Home },
  { id: 'discover', label: 'Catalog', icon: Film },
  { id: 'anime', label: 'Anime', icon: Sparkles },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'library', label: 'Folio', icon: Bookmark },
];

export function ClassicEdition({
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
  const { user, setAppearanceModalOpen } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState(searchQuery);

  return (
    <div className="lupin-canvas min-h-screen flex flex-col pb-24 md:pb-10">
      {/* Floating Velvet Pill Dock Navbar */}
      <div className="sticky top-0 z-40 px-3 sm:px-6 pt-3">
        <header className="glass-nav max-w-6xl mx-auto rounded-2xl px-4 sm:px-5 h-14 flex items-center justify-between gap-4 shadow-2xl">
          {/* Crest Wordmark */}
          <button
            type="button"
            onClick={() => onNavigateSection('home')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-700 to-[#2b0915] border border-amber-300/40 flex items-center justify-center font-editorial italic font-bold text-lg text-amber-200">
              L
            </span>
            <span className="font-editorial text-xl font-semibold tracking-wide text-amber-50 whitespace-nowrap">
              LUPIN
            </span>
          </button>

          {/* Centered Salon Links */}
          <nav aria-label="Classic navigation" className="hidden md:flex items-center gap-5 text-xs font-medium tracking-wide">
            {CLASSIC_NAV.map((item) => {
              const active =
                section === item.id ||
                (item.id === 'discover' && (section === 'movies' || section === 'series')) ||
                (item.id === 'live' && section === 'sports');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateSection(item.id)}
                  className={`py-1 px-2.5 rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-amber-300/15 text-amber-200 border border-amber-300/35'
                      : 'text-rose-100/70 hover:text-amber-100 border border-transparent'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search salon"
              className="glass-btn w-9 h-9 rounded-full flex items-center justify-center text-amber-100 cursor-pointer"
            >
              {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('novels')}
              aria-label="Novels"
              className="md:hidden glass-btn w-9 h-9 rounded-full flex items-center justify-center text-amber-100"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setAppearanceModalOpen(true)}
              aria-label="Switch Edition"
              className="glass-btn h-9 px-3 rounded-full text-xs text-amber-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Editions</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateSection('library')}
              className={`h-9 px-3.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                section === 'library' ? 'glass-btn-primary text-white' : 'glass-btn text-amber-50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{user ? user.name.split(' ')[0] : 'Library'}</span>
            </button>
          </div>
        </header>

        {/* Inline Dropdown Search Sheet */}
        {searchOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchOpen(false);
              onSearchSubmit(draftQuery);
            }}
            className="max-w-2xl mx-auto mt-2 glass-surface-elevated rounded-2xl p-2 flex items-center gap-2 border border-amber-200/25 shadow-2xl"
          >
            <Search className="w-4 h-4 text-amber-300 ml-3 shrink-0" />
            <input
              type="search"
              autoFocus
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="Search titles across MovieBox & Showbox…"
              className="flex-1 h-10 bg-transparent text-sm text-white placeholder:text-rose-100/45 focus:outline-none"
            />
            <button
              type="submit"
              className="glass-btn-primary h-9 px-4 rounded-xl text-xs font-semibold text-white cursor-pointer"
            >
              Search
            </button>
          </form>
        )}
      </div>

      {/* Main Editorial Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {section === 'home' && (
          <ClassicHome
            onSelectTitle={onSelectTitle}
            onPlayTarget={onPlayTarget}
            onNavigateSection={onNavigateSection}
          />
        )}
        {(section === 'discover' || section === 'movies' || section === 'series') && (
          <ClassicDiscover
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
        {section === 'anime' && <AnimePage onPlay={onPlayTarget} />}
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

      <footer className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-14 pt-6 border-t border-amber-200/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-rose-100/65">
        <span className="font-editorial italic text-base text-amber-100/80">
          LUPIN MOVIES · Classic Editorial Edition
        </span>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => onNavigateSection('support')}
            className="hover:text-amber-200 transition-colors cursor-pointer"
          >
            Support Center
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('about')}
            className="hover:text-amber-200 transition-colors cursor-pointer"
          >
            About Lupin Starnley
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('contact')}
            className="hover:text-amber-200 transition-colors cursor-pointer"
          >
            Contact Us
          </button>
          <button
            type="button"
            onClick={() => setAppearanceModalOpen(true)}
            className="glass-btn px-3.5 py-1.5 rounded-full text-amber-200 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>Switch Website Edition</span>
          </button>
        </div>
      </footer>

      {/* Mobile Velvet Bottom Bar */}
      <nav
        aria-label="Classic mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-nav border-t border-amber-200/15 rounded-t-2xl"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          {CLASSIC_MOBILE.map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigateSection(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  active ? 'text-amber-300' : 'text-rose-100/60'
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
