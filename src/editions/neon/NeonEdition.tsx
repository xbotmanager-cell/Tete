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
import { NeonHome } from './NeonHome';
import { NeonAnime, NeonDiscover } from './NeonPages';
import { LiveSportsPage } from '../../pages/LiveSportsPage';
import { NovelsPage } from '../../pages/NovelsPage';
import { LibraryPage } from '../../pages/LibraryPage';
import { SupportCenterPage } from '../../pages/SupportCenterPage';
import { AboutCreatorPage } from '../../pages/AboutCreatorPage';
import { ContactPage } from '../../pages/ContactPage';

const NEON_NAV: Array<{ id: EditionSection; label: string }> = [
  { id: 'home', label: 'Stage' },
  { id: 'movies', label: 'Movies' },
  { id: 'series', label: 'Series' },
  { id: 'anime', label: 'Anime' },
  { id: 'live', label: 'Live' },
  { id: 'novels', label: 'Novels' },
  { id: 'support', label: 'Support' },
  { id: 'about', label: 'Creator' },
  { id: 'contact', label: 'Contact' },
];

const NEON_MOBILE: Array<{ id: EditionSection; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Stage', icon: Home },
  { id: 'discover', label: 'Matrix', icon: Film },
  { id: 'anime', label: 'Anime', icon: Sparkles },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'library', label: 'Vault', icon: Bookmark },
];

export function NeonEdition({
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
    <div className="neon-canvas min-h-screen flex flex-col pb-20 md:pb-8">
      {/* Futuristic Suspended HUD Header */}
      <header className="sticky top-0 z-40 bg-[#03050d]/90 backdrop-blur-md border-b border-cyan-500/25">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigateSection('home')}
            className="font-neon text-3xl uppercase tracking-wider text-white flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span className="w-2.5 h-6 bg-gradient-to-b from-[#00f0ff] to-[#ff2bd6] rounded-xs" />
            <span>
              LUPIN <span className="text-[#00f0ff]">NEON</span>
            </span>
          </button>

          <nav aria-label="Neon HUD navigation" className="hidden lg:flex items-center gap-5">
            {NEON_NAV.map((item) => {
              const active =
                section === item.id ||
                (item.id === 'live' && section === 'sports') ||
                (item.id === 'movies' && section === 'discover');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateSection(item.id)}
                  className={`py-1.5 text-xs font-mono uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'border-[#00f0ff] text-[#00f0ff] font-bold'
                      : 'border-transparent text-slate-300 hover:text-white'
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
              aria-label="Search matrix"
              className="h-9 w-9 rounded-md border border-cyan-500/30 bg-[#070b18] text-[#00f0ff] hover:border-[#00f0ff] flex items-center justify-center cursor-pointer"
            >
              {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setAppearanceModalOpen(true)}
              className="h-9 px-3 rounded-md border border-cyan-500/30 bg-[#070b18] hover:border-[#ff2bd6] text-xs font-mono text-cyan-100 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-[#ff2bd6]" />
              <span className="hidden sm:inline">Editions</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (user) onNavigateSection('library');
                else setAuthModalOpen(true);
              }}
              className="neon-glow-btn h-9 px-3.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>{user ? user.name.split(' ')[0] : 'Sign In'}</span>
            </button>
          </div>
        </div>

        {searchOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchOpen(false);
              onSearchSubmit(draftQuery);
            }}
            className="max-w-3xl mx-auto px-4 pb-3 flex gap-2"
          >
            <input
              type="search"
              autoFocus
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="Search titles across FRAMEX…"
              className="flex-1 h-10 px-3.5 rounded-md bg-[#070b18] border border-[#00f0ff]/60 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              className="neon-glow-btn h-10 px-5 rounded-md text-xs font-bold cursor-pointer"
            >
              Execute
            </button>
          </form>
        )}
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {section === 'home' && (
          <NeonHome
            onSelectTitle={onSelectTitle}
            onPlayTarget={onPlayTarget}
            onNavigateSection={onNavigateSection}
          />
        )}
        {(section === 'discover' || section === 'movies' || section === 'series') && (
          <NeonDiscover
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
        {section === 'anime' && <NeonAnime onPlay={onPlayTarget} />}
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

      <footer className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <span className="font-neon text-lg uppercase tracking-wider text-cyan-200">
          LUPIN MOVIES · NEON EDITION
        </span>
        <div className="flex flex-wrap items-center justify-center gap-4 font-mono">
          <button type="button" onClick={() => onNavigateSection('support')} className="hover:text-[#00f0ff] cursor-pointer">
            Support
          </button>
          <button type="button" onClick={() => onNavigateSection('about')} className="hover:text-[#00f0ff] cursor-pointer">
            Lupin Starnley
          </button>
          <button type="button" onClick={() => onNavigateSection('contact')} className="hover:text-[#00f0ff] cursor-pointer">
            Contact
          </button>
          <button
            type="button"
            onClick={() => setAppearanceModalOpen(true)}
            className="px-3 py-1 rounded border border-cyan-500/35 text-cyan-200 hover:border-[#ff2bd6] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-[#ff2bd6]" />
            <span>Editions</span>
          </button>
        </div>
      </footer>

      <nav
        aria-label="Neon mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#03050d]/95 border-t border-cyan-500/30 backdrop-blur-md"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          {NEON_MOBILE.map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigateSection(tab.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  active ? 'text-[#00f0ff]' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-mono mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
