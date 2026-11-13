import { useCallback, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { AuthModal } from './components/AuthModal';
import { AppearanceModal } from './components/AppearanceSwitcher';
import { ClassicEdition } from './editions/classic/ClassicEdition';
import { ClassicDetailModal } from './editions/classic/ClassicDetailModal';
import { ClassicVideoPlayer } from './editions/classic/ClassicVideoPlayer';
import { SidebarEdition } from './editions/sidebar/SidebarEdition';
import { SidebarDetailDrawer } from './editions/sidebar/SidebarDetailDrawer';
import { SidebarVideoPlayer } from './editions/sidebar/SidebarVideoPlayer';
import { CinematicEdition } from './editions/cinematic/CinematicEdition';
import { CinematicDetailModal } from './editions/cinematic/CinematicDetailModal';
import { CinematicVideoPlayer } from './editions/cinematic/CinematicVideoPlayer';
import type {
  EditionSection,
  LibrarySectionTab,
  LiveSectionTab,
} from './editions/types';
import type { CatalogTab } from './hooks/useDiscoverEngine';
import type { ActivePlaybackTarget, MediaItem } from './types/framex';

function LupinShell() {
  const { layoutMode } = useAuth();

  const [section, setSection] = useState<EditionSection>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [discoverTab, setDiscoverTab] = useState<CatalogTab>('trending');
  const [liveTab, setLiveTab] = useState<LiveSectionTab>('tv');
  const [libraryTab, setLibraryTab] = useState<LibrarySectionTab>('watchlist');

  const [selectedTitle, setSelectedTitle] = useState<MediaItem | null>(null);
  const [playbackTarget, setPlaybackTarget] = useState<ActivePlaybackTarget | null>(null);

  const handleNavigateSection = useCallback(
    (
      next: EditionSection,
      opts?: { search?: string; libraryTab?: LibrarySectionTab; liveTab?: LiveSectionTab }
    ) => {
      setSection(next);
      if (next === 'movies') setDiscoverTab('popular_movies');
      else if (next === 'series') setDiscoverTab('popular_series');
      else if (next === 'discover' && opts?.search === undefined) {
        setSearchQuery('');
      }

      if (opts?.liveTab) setLiveTab(opts.liveTab);
      else if (next === 'live') setLiveTab('tv');
      else if (next === 'sports') setLiveTab('sports');

      if (opts?.search !== undefined) setSearchQuery(opts.search);
      if (opts?.libraryTab) setLibraryTab(opts.libraryTab);
      else if (next === 'library') setLibraryTab('watchlist');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleSearchSubmit = useCallback((query: string) => {
    setSearchQuery(query);
    setSection('discover');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const sharedProps = {
    section,
    searchQuery,
    discoverTab,
    liveTab,
    libraryTab,
    onNavigateSection: handleNavigateSection,
    onSearchSubmit: handleSearchSubmit,
    onSelectTitle: setSelectedTitle,
    onPlayTarget: setPlaybackTarget,
  };

  const handlePlayFromDetail = useCallback((target: ActivePlaybackTarget) => {
    setSelectedTitle(null);
    setPlaybackTarget(target);
  }, []);

  return (
    <>
      {layoutMode === 'classic' && (
        <>
          <ClassicEdition {...sharedProps} />
          <ClassicDetailModal
            item={selectedTitle}
            onClose={() => setSelectedTitle(null)}
            onPlay={handlePlayFromDetail}
            onSelectRelated={(item) => setSelectedTitle(item)}
          />
          <ClassicVideoPlayer
            target={playbackTarget}
            onClose={() => setPlaybackTarget(null)}
          />
        </>
      )}

      {layoutMode === 'sidebar' && (
        <>
          <SidebarEdition {...sharedProps} />
          <SidebarDetailDrawer
            item={selectedTitle}
            onClose={() => setSelectedTitle(null)}
            onPlay={handlePlayFromDetail}
            onSelectRelated={(item) => setSelectedTitle(item)}
          />
          <SidebarVideoPlayer
            target={playbackTarget}
            onClose={() => setPlaybackTarget(null)}
          />
        </>
      )}

      {layoutMode === 'cinematic' && (
        <>
          <CinematicEdition {...sharedProps} />
          <CinematicDetailModal
            item={selectedTitle}
            onClose={() => setSelectedTitle(null)}
            onPlay={handlePlayFromDetail}
            onSelectRelated={(item) => setSelectedTitle(item)}
          />
          <CinematicVideoPlayer
            target={playbackTarget}
            onClose={() => setPlaybackTarget(null)}
          />
        </>
      )}

      <AuthModal />
      <AppearanceModal />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CatalogProvider>
        <LupinShell />
      </CatalogProvider>
    </AuthProvider>
  );
}
