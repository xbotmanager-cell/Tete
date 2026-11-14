import type { LayoutMode } from '../types/framex';

export interface EditionThemeTokens {
  isLight: boolean;
  pageContainer: string;
  panel: string;
  elevatedPanel: string;
  card: string;
  heading: string;
  subHeading: string;
  text: string;
  muted: string;
  accentText: string;
  border: string;
  divide: string;
  primaryBtn: string;
  secondaryBtn: string;
  input: string;
  tabActive: string;
  tabIdle: string;
  monoBadge: string;
}

export function getEditionTheme(mode: LayoutMode): EditionThemeTokens {
  switch (mode) {
    case 'editorial':
      return {
        isLight: true,
        pageContainer: 'text-stone-900',
        panel: 'bg-[#FBF9F5] border border-stone-300 rounded-sm text-stone-900',
        elevatedPanel: 'bg-[#FFFFFF] border border-stone-300 rounded-sm text-stone-900 shadow-sm',
        card: 'bg-[#FBF9F5] border border-stone-300 rounded-sm text-stone-900',
        heading: 'font-editorial-serif text-stone-900 tracking-tight',
        subHeading: 'font-editorial-serif text-stone-900',
        text: 'text-stone-800',
        muted: 'text-stone-600',
        accentText: 'text-[#9A3412]',
        border: 'border-stone-300',
        divide: 'divide-stone-300',
        primaryBtn:
          'bg-stone-900 text-[#FBF9F5] hover:bg-[#9A3412] rounded-sm font-semibold transition-colors',
        secondaryBtn:
          'border border-stone-400 bg-[#F7F4EE] text-stone-900 hover:border-stone-900 rounded-sm font-medium transition-colors',
        input:
          'bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 rounded-sm focus:outline-none focus:border-stone-900',
        tabActive: 'bg-stone-900 text-[#FBF9F5] rounded-sm font-semibold',
        tabIdle: 'border border-stone-300 bg-[#FBF9F5] text-stone-700 hover:text-stone-900 rounded-sm',
        monoBadge: 'font-mono text-xs uppercase tracking-widest text-[#9A3412]',
      };

    case 'minimalist':
      return {
        isLight: true,
        pageContainer: 'text-neutral-900',
        panel: 'bg-[#FAFAFA] border border-neutral-200 rounded-lg text-neutral-900',
        elevatedPanel: 'bg-white border border-neutral-200 rounded-lg text-neutral-900 shadow-xs',
        card: 'bg-white border border-neutral-200 rounded-lg text-neutral-900',
        heading: 'font-minimal text-neutral-950 tracking-tight font-semibold',
        subHeading: 'font-minimal text-neutral-900 font-semibold',
        text: 'text-neutral-800',
        muted: 'text-neutral-500',
        accentText: 'text-[#2563EB]',
        border: 'border-neutral-200',
        divide: 'divide-neutral-200',
        primaryBtn:
          'bg-neutral-950 text-white hover:bg-[#2563EB] rounded-md font-medium transition-colors',
        secondaryBtn:
          'border border-neutral-300 bg-white text-neutral-900 hover:border-neutral-900 rounded-md font-medium transition-colors',
        input:
          'bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 rounded-md focus:outline-none focus:border-neutral-900',
        tabActive: 'bg-neutral-950 text-white rounded-md font-medium',
        tabIdle: 'border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-950 rounded-md',
        monoBadge: 'font-mono text-xs uppercase tracking-wider text-[#2563EB]',
      };

    case 'neon':
      return {
        isLight: false,
        pageContainer: 'text-sky-50',
        panel: 'neon-panel rounded-lg text-sky-50',
        elevatedPanel:
          'bg-[#080d1e]/95 border border-cyan-400/35 rounded-lg text-sky-50 shadow-[0_0_32px_-12px_rgba(0,240,255,0.35)]',
        card: 'bg-[#070b18]/90 border border-cyan-400/25 rounded-lg text-sky-50',
        heading: 'font-neon uppercase tracking-wide text-white',
        subHeading: 'font-neon uppercase tracking-wide text-cyan-100',
        text: 'text-sky-100/90',
        muted: 'text-slate-400',
        accentText: 'text-[#00f0ff]',
        border: 'border-cyan-500/25',
        divide: 'divide-cyan-500/20',
        primaryBtn:
          'neon-glow-btn font-bold rounded-md hover:brightness-110 transition-all',
        secondaryBtn:
          'border border-cyan-400/35 bg-[#091126] text-cyan-200 hover:border-[#ff2bd6] hover:text-white rounded-md font-medium transition-colors',
        input:
          'bg-[#040712] border border-cyan-500/30 text-white placeholder:text-slate-500 rounded-md focus:outline-none focus:border-[#00f0ff]',
        tabActive: 'bg-[#00f0ff] text-[#03050d] rounded-md font-bold',
        tabIdle: 'border border-cyan-500/25 bg-[#070b18] text-slate-300 hover:text-white rounded-md',
        monoBadge: 'font-mono text-xs uppercase tracking-widest text-[#ff2bd6]',
      };

    case 'sidebar':
      return {
        isLight: false,
        pageContainer: 'text-zinc-100',
        panel: 'rounded-lg border border-zinc-800 bg-[#0c0c0f] text-zinc-100',
        elevatedPanel: 'rounded-lg border border-zinc-800 bg-[#0c0c0f] text-zinc-100 shadow-2xl',
        card: 'rounded-lg border border-zinc-800 bg-[#111114] text-zinc-100',
        heading: 'font-console font-bold text-white',
        subHeading: 'font-console font-semibold text-white',
        text: 'text-zinc-200',
        muted: 'text-zinc-400',
        accentText: 'text-cyan-400',
        border: 'border-zinc-800',
        divide: 'divide-zinc-800',
        primaryBtn:
          'bg-white text-black hover:bg-cyan-300 font-semibold rounded-md transition-colors',
        secondaryBtn:
          'border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 rounded-md font-medium transition-colors',
        input:
          'bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-500 rounded-md focus:outline-none focus:border-cyan-400',
        tabActive: 'bg-white text-black font-semibold rounded-md font-mono',
        tabIdle: 'border border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:text-white rounded-md font-mono',
        monoBadge: 'font-mono text-[11px] uppercase tracking-wider text-cyan-400',
      };

    case 'classic':
      return {
        isLight: false,
        pageContainer: 'text-rose-50',
        panel: 'glass-surface rounded-3xl text-rose-50',
        elevatedPanel: 'glass-surface-elevated rounded-3xl text-rose-50',
        card: 'glass-surface rounded-2xl text-rose-50',
        heading: 'font-editorial font-semibold text-amber-50',
        subHeading: 'font-editorial font-semibold text-amber-50',
        text: 'text-rose-50/90',
        muted: 'text-rose-100/65',
        accentText: 'text-amber-300',
        border: 'border-amber-200/15',
        divide: 'divide-rose-200/10',
        primaryBtn:
          'glass-btn-primary text-white font-semibold rounded-xl',
        secondaryBtn:
          'glass-btn text-amber-100 rounded-xl font-medium',
        input:
          'bg-black/45 border border-rose-200/15 text-white placeholder:text-rose-100/40 rounded-xl focus:outline-none focus:border-amber-300/60',
        tabActive: 'glass-btn-primary text-white rounded-full',
        tabIdle: 'glass-btn text-amber-100/80 rounded-full',
        monoBadge: 'font-mono text-xs uppercase tracking-widest text-amber-300',
      };

    case 'cinematic':
    default:
      return {
        isLight: false,
        pageContainer: 'text-white',
        panel: 'rounded-lg bg-[#141414] border border-white/10 text-white',
        elevatedPanel: 'rounded-lg bg-[#141414] border border-white/15 text-white shadow-2xl',
        card: 'rounded-md bg-[#181818] border border-white/10 text-white',
        heading: 'font-cinema uppercase tracking-wide text-white leading-none',
        subHeading: 'font-cinema uppercase tracking-wide text-white',
        text: 'text-neutral-200',
        muted: 'text-neutral-400',
        accentText: 'text-[#e50914]',
        border: 'border-white/10',
        divide: 'divide-neutral-800',
        primaryBtn:
          'bg-[#e50914] hover:bg-[#f40612] text-white font-bold rounded transition-colors',
        secondaryBtn:
          'border border-neutral-700 bg-[#1c1c1c] text-white hover:border-white rounded font-semibold transition-colors',
        input:
          'bg-black border border-neutral-700 text-white placeholder:text-neutral-500 rounded focus:outline-none focus:border-white',
        tabActive: 'bg-[#e50914] text-white font-bold rounded',
        tabIdle: 'bg-[#141414] border border-neutral-800 text-neutral-300 hover:text-white rounded',
        monoBadge: 'text-xs font-bold uppercase tracking-[0.22em] text-[#e50914]',
      };
  }
}
