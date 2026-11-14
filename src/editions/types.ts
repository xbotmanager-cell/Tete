import type { CatalogTab } from '../hooks/useDiscoverEngine';
import type { ActivePlaybackTarget, MediaItem } from '../types/framex';

export type EditionSection =
  | 'home'
  | 'discover'
  | 'movies'
  | 'series'
  | 'anime'
  | 'live'
  | 'sports'
  | 'novels'
  | 'library'
  | 'support'
  | 'about'
  | 'contact';

export type LibrarySectionTab =
  | 'watchlist'
  | 'favorites'
  | 'history'
  | 'reading'
  | 'appearance'
  | 'settings';

export type LiveSectionTab = 'tv' | 'sports' | 'wrestling';

export interface EditionShellProps {
  section: EditionSection;
  searchQuery: string;
  discoverTab: CatalogTab;
  liveTab: LiveSectionTab;
  libraryTab: LibrarySectionTab;
  onNavigateSection: (
    section: EditionSection,
    opts?: { search?: string; libraryTab?: LibrarySectionTab; liveTab?: LiveSectionTab }
  ) => void;
  onSearchSubmit: (query: string) => void;
  onSelectTitle: (item: MediaItem) => void;
  onPlayTarget: (target: ActivePlaybackTarget) => void;
}
