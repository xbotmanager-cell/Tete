import { useEffect, useState } from 'react';
import { ArrowRight, Film, LayoutTemplate, Loader2, Search, X } from 'lucide-react';
import { apiFetch, buildQuery } from '../../lib/api';
import { extractArray, normalizeMediaItem } from '../../lib/mediaUtils';
import type { MediaItem } from '../../types/framex';
import type { EditionSection } from '../types';

interface SidebarCommandSearchProps {
  open: boolean;
  onClose: () => void;
  onSelectTitle: (item: MediaItem) => void;
  onNavigateSection: (section: EditionSection) => void;
  onOpenAppearance: () => void;
  onFullSearch: (query: string) => void;
}

export function SidebarCommandSearch({
  open,
  onClose,
  onSelectTitle,
  onNavigateSection,
  onOpenAppearance,
  onFullSearch,
}: SidebarCommandSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await apiFetch<Record<string, unknown>>(
          `/api/fx/search${buildQuery({ q: trimmed, page: 1, mode: 'v2' })}`
        );
        if (!active) return;
        setResults(
          extractArray(res)
            .slice(0, 8)
            .map((r) => normalizeMediaItem(r, 'moviebox'))
        );
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 280);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [open, query]);

  if (!open) return null;

  const quickCommands: Array<{ label: string; hint: string; action: () => void }> = [
    { label: 'Navigate to Movies Catalog', hint: 'Route', action: () => onNavigateSection('movies') },
    { label: 'Navigate to TV Series', hint: 'Route', action: () => onNavigateSection('series') },
    { label: 'Open Anime Studio', hint: 'Route', action: () => onNavigateSection('anime') },
    { label: 'Open Live TV & Sports', hint: 'Route', action: () => onNavigateSection('live') },
    { label: 'Switch Website Edition', hint: 'Appearance', action: onOpenAppearance },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm p-4 sm:pt-20 flex items-start justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette search"
    >
      <div className="w-full max-w-xl rounded-xl bg-[#0c0c0f] border border-zinc-800 shadow-2xl overflow-hidden">
        {/* Command Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) {
              onFullSearch(query.trim());
              onClose();
            }
          }}
          className="flex items-center gap-2.5 px-4 h-12 border-b border-zinc-800"
        >
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a movie, series, or command…"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="w-7 h-7 rounded border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {query.trim() ? (
            <>
              {results.length > 0 ? (
                <>
                  <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    FRAMEX Search Matches
                  </p>
                  {results.map((item) => (
                    <button
                      key={`cmd-${item.source}-${item.id}`}
                      type="button"
                      onClick={() => {
                        onSelectTitle(item);
                        onClose();
                      }}
                      className="w-full px-2.5 py-2 rounded-lg hover:bg-zinc-900 flex items-center justify-between gap-3 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.poster || ''}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-8 h-11 rounded object-cover bg-zinc-900 border border-zinc-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-100 truncate">{item.title}</p>
                          <p className="font-mono text-[10px] text-zinc-500 tabular-nums">
                            {[item.type.toUpperCase(), item.year, item.rating ? `★ ${item.rating}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      onFullSearch(query.trim());
                      onClose();
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-cyan-400 hover:text-cyan-300 text-left flex items-center justify-between cursor-pointer"
                  >
                    <span>View all search results for “{query.trim()}”</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : !loading ? (
                <p className="px-3 py-6 text-center text-xs text-zinc-500">
                  No direct matches found. Press Enter to run full catalog search.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Quick Commands
              </p>
              {quickCommands.map((cmd) => (
                <button
                  key={cmd.label}
                  type="button"
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className="w-full px-3 py-2 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="text-xs text-zinc-200 flex items-center gap-2">
                    {cmd.hint === 'Appearance' ? (
                      <LayoutTemplate className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Film className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    {cmd.label}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">{cmd.hint}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
