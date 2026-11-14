import {
  BookOpenCheck,
  Check,
  Clapperboard,
  LayoutTemplate,
  Minimize2,
  PanelLeft,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEditionTheme } from '../lib/editionTheme';
import type { LayoutMode } from '../types/framex';

interface LayoutOption {
  id: LayoutMode;
  name: string;
  tagline: string;
  description: string;
  isDefault?: boolean;
  icon: typeof LayoutTemplate;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'cinematic',
    name: 'Cinematic Edition',
    tagline: 'Pitch-Black Theatrical Streaming (Default)',
    description:
      'Auto-rotating full-bleed cinema hero, overlay navigation, Top 10 rank rails, and crimson theater controls.',
    isDefault: true,
    icon: Clapperboard,
  },
  {
    id: 'classic',
    name: 'Classic Edition',
    tagline: 'Signature Burgundy & Gold Salon',
    description:
      'Floating velvet pill dock, asymmetric screening program, editorial serif titles, and warm gold accents.',
    icon: LayoutTemplate,
  },
  {
    id: 'sidebar',
    name: 'Sidebar Edition',
    tagline: 'Monochrome Console Workspace',
    description:
      'Collapsible left navigation rail, ⌘K command palette, dense Grid/Table toggle, and split playback console.',
    icon: PanelLeft,
  },
  {
    id: 'editorial',
    name: 'Editorial Edition',
    tagline: 'Archival Film Broadsheet & Magazine',
    description:
      'Warm paper newsprint canvas, Playfair Display serif essays, accession plates, and curated monograph shelves.',
    icon: BookOpenCheck,
  },
  {
    id: 'neon',
    name: 'Neon Edition',
    tagline: 'Futuristic HUD & Electric Matrix',
    description:
      'Deep cosmos grid, electric cyan & ultraviolet magenta lighting, panoramic spotlight stage, and deck player.',
    icon: Sparkles,
  },
  {
    id: 'minimalist',
    name: 'Minimalist Edition',
    tagline: 'Swiss Gallery White & Cobalt',
    description:
      'Generous gallery whitespace, zero visual clutter, crisp geometric typography, and distraction-free screening.',
    icon: Minimize2,
  },
];

function LayoutPreviewDiagram({ id }: { id: LayoutMode }) {
  if (id === 'classic') {
    return (
      <div className="h-24 rounded-md bg-[#11060a] border border-amber-200/20 p-2 flex flex-col gap-1.5 overflow-hidden">
        <div className="h-3 rounded bg-rose-950/80 border border-amber-200/20 flex items-center justify-between px-1.5">
          <span className="w-6 h-1 rounded bg-amber-300/80" />
          <div className="flex gap-1">
            <span className="w-3 h-1 rounded bg-white/30" />
            <span className="w-3 h-1 rounded bg-white/30" />
          </div>
          <span className="w-4 h-1.5 rounded bg-rose-500/80" />
        </div>
        <div className="h-8 rounded bg-gradient-to-r from-rose-950/90 to-amber-900/30 border border-amber-200/15" />
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
      <div className="h-24 rounded-md bg-[#09090b] border border-zinc-800 p-2 flex gap-1.5 overflow-hidden">
        <div className="w-9 rounded bg-zinc-900 border border-zinc-800 p-1.5 flex flex-col gap-1">
          <span className="w-full h-1.5 rounded bg-cyan-400/85 mb-0.5" />
          <span className="w-full h-1 rounded bg-white/35" />
          <span className="w-4/5 h-1 rounded bg-white/20" />
          <span className="w-full h-1 rounded bg-white/20" />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-3.5 rounded bg-zinc-900 border border-zinc-800 px-1.5 flex items-center justify-between">
            <span className="w-16 h-1.5 rounded bg-white/20" />
            <span className="w-3 h-1.5 rounded bg-cyan-400/75" />
          </div>
          <div className="grid grid-cols-4 gap-1 flex-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded bg-zinc-900 border border-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (id === 'editorial') {
    return (
      <div className="h-24 rounded-sm bg-[#F7F4EE] border border-stone-300 p-2 flex flex-col gap-1.5 overflow-hidden">
        <div className="h-3 border-b border-stone-400 flex items-center justify-between px-1">
          <span className="w-10 h-1.5 bg-stone-900" />
          <span className="w-6 h-1 bg-[#9A3412]" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 flex-1">
          <div className="col-span-2 bg-[#EBE6DF] border border-stone-300 p-1 flex flex-col justify-between">
            <span className="w-12 h-1.5 bg-stone-900" />
            <span className="w-8 h-1 bg-[#9A3412]" />
          </div>
          <div className="col-span-1 flex flex-col gap-1">
            <div className="flex-1 border border-stone-300 bg-white" />
            <div className="flex-1 border border-stone-300 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (id === 'neon') {
    return (
      <div className="h-24 rounded-md bg-[#03050d] border border-cyan-400/40 p-2 flex flex-col gap-1.5 overflow-hidden">
        <div className="h-3 rounded-sm bg-[#091126] border border-cyan-400/35 flex items-center justify-between px-1.5">
          <span className="w-6 h-1.5 rounded-full bg-[#00f0ff]" />
          <span className="w-5 h-1.5 rounded-full bg-[#ff2bd6]" />
        </div>
        <div className="h-9 rounded-sm bg-gradient-to-r from-[#00f0ff]/20 via-[#7c3aed]/20 to-[#ff2bd6]/25 border border-cyan-400/30" />
        <div className="grid grid-cols-5 gap-1 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-sm bg-[#070b18] border border-cyan-400/30" />
          ))}
        </div>
      </div>
    );
  }

  if (id === 'minimalist') {
    return (
      <div className="h-24 rounded-md bg-white border border-neutral-200 p-2 flex flex-col gap-2 overflow-hidden">
        <div className="h-2.5 border-b border-neutral-200 flex items-center justify-between">
          <span className="w-6 h-1 bg-neutral-900" />
          <span className="w-4 h-1 bg-[#2563EB]" />
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1">
          <div className="flex flex-col justify-center gap-1">
            <span className="w-10 h-1.5 bg-neutral-900" />
            <span className="w-6 h-1 bg-neutral-400" />
          </div>
          <div className="bg-neutral-100 border border-neutral-200 rounded-xs" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-24 rounded-md bg-[#040404] border border-white/15 overflow-hidden flex flex-col">
      <div className="h-14 relative bg-gradient-to-b from-[#e50914]/45 via-[#180709] to-[#040404] p-2 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="w-6 h-1 rounded bg-[#e50914]" />
          <div className="flex gap-1">
            <span className="w-3 h-1 rounded bg-white/40" />
            <span className="w-3 h-1 rounded bg-white/40" />
          </div>
        </div>
        <div className="space-y-1">
          <span className="block w-14 h-1.5 rounded bg-white/85" />
          <span className="block w-7 h-2 rounded bg-[#e50914]" />
        </div>
      </div>
      <div className="px-2 pb-2 grid grid-cols-6 gap-1 flex-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded bg-white/15" />
        ))}
      </div>
    </div>
  );
}

export function AppearanceSection() {
  const { layoutMode, setLayoutMode, user } = useAuth();
  const t = getEditionTheme(layoutMode);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className={`${t.heading} text-2xl sm:text-3xl`}>Website Editions (6 Experiences)</h2>
          <p className={`text-xs sm:text-sm ${t.muted} mt-1`}>
            Switch between all six completely distinct platforms instantly without interrupting playback.{' '}
            {user ? 'Synced to your account.' : 'Saved locally in your browser.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LAYOUT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = layoutMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLayoutMode(opt.id)}
              aria-pressed={active}
              className={`text-left p-4 space-y-3 transition-all cursor-pointer ${
                active ? `${t.elevatedPanel} ring-2 ring-current` : `${t.panel} hover:opacity-95`
              }`}
            >
              <LayoutPreviewDiagram id={opt.id} />

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${t.accentText}`} />
                    <span className="font-display text-sm font-semibold truncate">{opt.name}</span>
                  </div>
                  {active ? (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 ${t.accentText}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </span>
                  ) : opt.isDefault ? (
                    <span className={`text-[10px] font-mono uppercase ${t.muted}`}>Default</span>
                  ) : null}
                </div>
                <p className={`text-[11px] font-medium ${t.text}`}>{opt.tagline}</p>
                <p className={`text-xs ${t.muted} leading-relaxed`}>{opt.description}</p>
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

  const t = getEditionTheme(layoutMode);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Appearance settings"
    >
      <div className={`w-full max-w-5xl p-5 sm:p-8 relative my-auto ${t.elevatedPanel}`}>
        <button
          type="button"
          onClick={() => setAppearanceModalOpen(false)}
          aria-label="Close appearance settings"
          className={`absolute top-4 right-4 w-9 h-9 flex items-center justify-center cursor-pointer ${t.secondaryBtn}`}
        >
          <X className="w-4 h-4" />
        </button>

        <AppearanceSection />
      </div>
    </div>
  );
}
