import { useEffect, useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Clapperboard,
  Film,
  Home,
  LayoutTemplate,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  Trophy,
  Tv,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { EditionSection, EditionShellProps } from '../types';
import { SidebarHome } from './SidebarHome';
import { SidebarCommandSearch } from './SidebarCommandSearch';
import { SidebarAnime, SidebarDiscover } from './SidebarPages';
import { LiveSportsPage } from '../../pages/LiveSportsPage';
import { NovelsPage } from '../../pages/NovelsPage';
import { LibraryPage } from '../../pages/LibraryPage';

const NAV_GROUPS: Array<{
  group: string;
  items: Array<{ id: EditionSection; label: string; icon: typeof Home }>;
}> = [
  {
    group: 'CATALOG',
    items: [
      { id: 'home', label: 'Overview', icon: Home },
      { id: 'movies', label: 'Movies', icon: Film },
      { id: 'series', label: 'TV Series', icon: Clapperboard },
      { id: 'discover', label: 'Explore All', icon: Search },
    ],
  },
  {
    group: 'CHANNELS',
    items: [
      { id: 'anime', label: 'Anime Studio', icon: Sparkles },
      { id: 'live', label: 'Live TV', icon: Tv },
      { id: 'sports', label: 'Sports Telemetry', icon: Trophy },
      { id: 'novels', label: 'Novel Reader', icon: BookOpen },
    ],
  },
  {
    group: 'PERSONAL',
    items: [{ id: 'library', label: 'My Library', icon: Bookmark }],
  },
];

const SECTION_PATH: Record<EditionSection, string> = {
  home: 'overview',
  discover: 'catalog',
  movies: 'movies',
  series: 'series',
  anime: 'anime',
  live: 'live-tv',
  sports: 'sports',
  novels: 'novels',
  library: 'library',
};

export function SidebarEdition({
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  // Keyboard shortcut Cmd/Ctrl + K opens command search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleNav = (next: EditionSection) => {
    setMobileOpen(false);
    onNavigateSection(next);
  };

  return (
    <div className="sidebar-canvas min-h-screen flex">
      {/* Permanent Collapsible Left Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen sidebar-panel border-r transition-[width] duration-150 z-30 ${
          collapsed ? 'w-[64px]' : 'w-60'
        }`}
      >
        <div className="h-14 px-3.5 border-b border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          >
            <span className="w-7 h-7 rounded-md bg-white text-black font-console font-bold text-sm flex items-center justify-center shrink-0">
              L
            </span>
            {!collapsed && (
              <div className="min-w-0 text-left">
                <span className="font-console text-sm font-bold text-white block truncate">
                  LUPIN OS
                </span>
                <span className="font-mono text-[9px] text-cyan-400 block truncate">
                  SIDEBAR EDITION
                </span>
              </div>
            )}
          </button>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="w-7 h-7 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav aria-label="Sidebar console navigation" className="flex-1 overflow-y-auto p-2.5 space-y-5">
          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="w-full h-9 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {NAV_GROUPS.map((grp) => (
            <div key={grp.group} className="space-y-1">
              {!collapsed && (
                <p className="px-2.5 font-mono text-[10px] tracking-wider text-zinc-500">
                  {grp.group}
                </p>
              )}
              {grp.items.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full h-9 px-2.5 rounded-md flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-zinc-800/90 text-white border border-zinc-700'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-400' : ''}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-2.5 border-t border-zinc-800 space-y-1">
          <button
            type="button"
            onClick={() => setAppearanceModalOpen(true)}
            title="Appearance Settings"
            className={`w-full h-9 px-2.5 rounded-md flex items-center gap-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <LayoutTemplate className="w-4 h-4 text-cyan-400 shrink-0" />
            {!collapsed && <span className="truncate">Appearance</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              if (user) onNavigateSection('library', { libraryTab: 'settings' });
              else setAuthModalOpen(true);
            }}
            title={user ? user.name : 'Sign In'}
            className={`w-full h-9 px-2.5 rounded-md flex items-center gap-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer ${
              collapsed ? 'justify-center px-0' : ''
            }`}
          >
            <Settings className="w-4 h-4 text-zinc-400 shrink-0" />
            {!collapsed && (
              <span className="truncate">{user ? user.name : 'Account & Settings'}</span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/75" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-68 max-w-[82vw] h-full sidebar-panel border-r border-zinc-800 flex flex-col">
            <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="font-console text-sm font-bold text-white">LUPIN OS</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close drawer"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              {NAV_GROUPS.map((grp) => (
                <div key={grp.group} className="space-y-1">
                  <p className="px-2 font-mono text-[10px] text-zinc-500">{grp.group}</p>
                  {grp.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNav(item.id)}
                        className={`w-full min-h-[42px] px-3 rounded-md flex items-center gap-2.5 text-xs font-medium ${
                          section === item.id
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-300 hover:bg-zinc-900'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-cyan-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="p-3 border-t border-zinc-800 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setAppearanceModalOpen(true);
                }}
                className="w-full min-h-[42px] px-3 rounded-md flex items-center gap-2.5 text-xs text-zinc-200 hover:bg-zinc-900"
              >
                <LayoutTemplate className="w-4 h-4 text-cyan-400" />
                <span>Appearance Settings</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Workspace Container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Command Header */}
        <header className="sticky top-0 z-20 h-14 sidebar-panel border-b px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="md:hidden min-w-[40px] min-h-[40px] rounded-md border border-zinc-800 bg-zinc-900 flex items-center justify-center text-white"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500 truncate">
              <span className="hidden sm:inline">lupin-os</span>
              <span className="hidden sm:inline">/</span>
              <span className="text-zinc-100 font-medium">{SECTION_PATH[section]}</span>
            </div>
          </div>

          {/* ⌘K Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="flex-1 max-w-sm h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between gap-2 text-xs text-zinc-400 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate">Search movies, series, commands…</span>
            </span>
            <kbd className="hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAppearanceModalOpen(true)}
              className="h-9 px-3 rounded-md border border-zinc-800 bg-zinc-900 hover:border-zinc-600 text-xs font-mono text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">Editions</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (user) onNavigateSection('library', { libraryTab: 'settings' });
                else setAuthModalOpen(true);
              }}
              className="h-9 px-3 rounded-md bg-white text-black hover:bg-cyan-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{user ? user.name.split(' ')[0] : 'Sign In'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {section === 'home' && (
            <SidebarHome
              onSelectTitle={onSelectTitle}
              onPlayTarget={onPlayTarget}
              onNavigateSection={onNavigateSection}
            />
          )}
          {(section === 'discover' || section === 'movies' || section === 'series') && (
            <SidebarDiscover
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
          {section === 'anime' && <SidebarAnime onPlay={onPlayTarget} />}
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
        </main>
      </div>

      <SidebarCommandSearch
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelectTitle={onSelectTitle}
        onNavigateSection={handleNav}
        onOpenAppearance={() => setAppearanceModalOpen(true)}
        onFullSearch={onSearchSubmit}
      />
    </div>
  );
}
