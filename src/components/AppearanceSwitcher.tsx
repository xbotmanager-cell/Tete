import { Check, Clapperboard, LayoutTemplate, PanelLeft, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { LayoutMode } from '../types/framex';

interface LayoutOption {
  id: LayoutMode;
  name: string;
  tagline: string;
  description: string;
  icon: typeof LayoutTemplate;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'classic',
    name: 'Classic Edition',
    tagline: 'Signature Burgundy Glass',
    description:
      'Top navigation bar, balanced hero stage, and curated horizontal collections in dark burgundy glassmorphism.',
    icon: LayoutTemplate,
  },
  {
    id: 'sidebar',
    name: 'Sidebar Edition',
    tagline: 'Modern Console Workspace',
    description:
      'Collapsible left navigation rail, persistent top search command bar, and organized high-density shelves.',
    icon: PanelLeft,
  },
  {
    id: 'cinematic',
    name: 'Cinematic Edition',
    tagline: 'Theatrical Full-Bleed Showcase',
    description:
      'Edge-to-edge featured cinema hero with overlay navigation and continuous horizontal poster rails.',
    icon: Clapperboard,
  },
];

function LayoutPreviewDiagram({ id }: { id: LayoutMode }) {
  if (id === 'classic') {
    return (
      <div className="h-24 rounded-xl bg-[#11060a] border border-rose-200/10 p-2 flex flex-col gap-1.5 overflow-hidden">
        <div className="h-3 rounded bg-rose-950/80 border border-rose-200/10 flex items-center justify-between px-1.5">
          <span className="w-6 h-1 rounded bg-rose-400/70" />
          <div className="flex gap-1">
            <span className="w-3 h-1 rounded bg-white/30" />
            <span className="w-3 h-1 rounded bg-white/30" />
            <span className="w-3 h-1 rounded bg-white/30" />
          </div>
          <span className="w-4 h-1.5 rounded bg-rose-500/70" />
        </div>
        <div className="h-8 rounded-lg bg-gradient-to-r from-rose-950/90 to-rose-800/30 border border-rose-200/10" />
        <div className="grid grid-cols-5 gap-1 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded bg-rose-950/50 border border-rose-200/10" />
          ))}
        </div>
      </div>
    );
  }

  if (id === 'sidebar') {
    return (
      <div className="h-24 rounded-xl bg-[#09090b] border border-white/10 p-2 flex gap-1.5 overflow-hidden">
        <div className="w-10 rounded-lg bg-white/[0.04] border border-white/10 p-1.5 flex flex-col gap-1">
          <span className="w-full h-1.5 rounded bg-rose-500/80 mb-0.5" />
          <span className="w-full h-1 rounded bg-white/35" />
          <span className="w-4/5 h-1 rounded bg-white/20" />
          <span className="w-full h-1 rounded bg-white/20" />
          <span className="w-3/5 h-1 rounded bg-white/20" />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-3.5 rounded bg-white/[0.04] border border-white/10 px-1.5 flex items-center justify-between">
            <span className="w-16 h-1.5 rounded bg-white/20" />
            <span className="w-3 h-1.5 rounded bg-rose-500/70" />
          </div>
          <div className="grid grid-cols-4 gap-1 flex-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded bg-white/[0.05] border border-white/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-24 rounded-xl bg-[#050304] border border-rose-200/10 overflow-hidden flex flex-col">
      <div className="h-14 relative bg-gradient-to-b from-rose-900/50 via-[#16070c] to-[#050304] p-2 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="w-6 h-1 rounded bg-rose-500" />
          <div className="flex gap-1">
            <span className="w-3 h-1 rounded bg-white/40" />
            <span className="w-3 h-1 rounded bg-white/40" />
          </div>
        </div>
        <div className="space-y-1">
          <span className="block w-14 h-1.5 rounded bg-white/80" />
          <span className="block w-7 h-2 rounded bg-rose-600" />
        </div>
      </div>
      <div className="px-2 pb-2 grid grid-cols-6 gap-1 flex-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded bg-white/10" />
        ))}
      </div>
    </div>
  );
}

export function AppearanceSection() {
  const { layoutMode, setLayoutMode, user } = useAuth();
  const isSidebar = layoutMode === 'sidebar';
  const isCinematic = layoutMode === 'cinematic';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2
            className={
              isSidebar
                ? 'font-console text-xl font-bold text-white'
                : isCinematic
                  ? 'font-cinema text-3xl uppercase tracking-wide text-white'
                  : 'font-editorial text-3xl font-semibold text-amber-50'
            }
          >
            Interface Website Editions
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Switch between three completely distinct streaming platforms instantly with zero page reload.{' '}
            {user ? 'Synced to your account preferences.' : 'Saved locally in your browser.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {LAYOUT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = layoutMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLayoutMode(opt.id)}
              aria-pressed={active}
              className={`text-left p-4 space-y-3.5 transition-all cursor-pointer border ${
                isSidebar ? 'rounded-lg' : isCinematic ? 'rounded-md' : 'rounded-2xl'
              } ${
                active
                  ? isSidebar
                    ? 'bg-zinc-900 border-cyan-400 ring-1 ring-cyan-400/30'
                    : isCinematic
                      ? 'bg-[#1f1f1f] border-[#e50914] ring-1 ring-[#e50914]/40'
                      : 'glass-surface-elevated border-amber-300/60 ring-1 ring-amber-300/30'
                  : isSidebar
                    ? 'bg-[#09090b] border-zinc-800 hover:border-zinc-600'
                    : isCinematic
                      ? 'bg-[#141414] border-neutral-800 hover:border-neutral-600'
                      : 'glass-surface border-rose-200/10 hover:border-amber-200/30'
              }`}
            >
              <LayoutPreviewDiagram id={opt.id} />

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSidebar
                          ? 'text-cyan-400'
                          : isCinematic
                            ? 'text-[#e50914]'
                            : 'text-amber-300'
                      }`}
                    />
                    <span className="font-display text-sm font-semibold text-white truncate">
                      {opt.name}
                    </span>
                  </div>
                  {active && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium shrink-0 ${
                        isSidebar
                          ? 'text-cyan-400'
                          : isCinematic
                            ? 'text-[#e50914]'
                            : 'text-amber-300'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium text-zinc-300">{opt.tagline}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AppearanceModal() {
  const { appearanceModalOpen, setAppearanceModalOpen, layoutMode } = useAuth();

  if (!appearanceModalOpen) return null;

  const isSidebar = layoutMode === 'sidebar';
  const isCinematic = layoutMode === 'cinematic';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Appearance settings"
    >
      <div
        className={`w-full max-w-4xl p-5 sm:p-8 relative my-auto ${
          isSidebar
            ? 'rounded-lg bg-[#0c0c0f] border border-zinc-800 shadow-2xl'
            : isCinematic
              ? 'rounded-lg bg-[#141414] border border-white/10 shadow-2xl'
              : 'glass-surface-elevated rounded-3xl'
        }`}
      >
        <button
          type="button"
          onClick={() => setAppearanceModalOpen(false)}
          aria-label="Close appearance settings"
          className={`absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-white cursor-pointer ${
            isSidebar
              ? 'rounded border border-zinc-800 bg-zinc-900 hover:border-zinc-600'
              : isCinematic
                ? 'rounded-full bg-neutral-800 hover:bg-neutral-700'
                : 'glass-btn rounded-xl'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        <AppearanceSection />
      </div>
    </div>
  );
}
