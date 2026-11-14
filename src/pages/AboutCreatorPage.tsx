import { ExternalLink, Mail, MessageCircle, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEditionTheme } from '../lib/editionTheme';
import type { EditionSection } from '../editions/types';
import {
  SUPPORT_EMAIL,
  WHATSAPP_CHANNEL_URL,
  WHATSAPP_SUPPORT_URL,
} from './SupportCenterPage';

interface AboutCreatorPageProps {
  onNavigateSection: (section: EditionSection) => void;
}

export function AboutCreatorPage({ onNavigateSection }: AboutCreatorPageProps) {
  const { layoutMode } = useAuth();
  const t = getEditionTheme(layoutMode);

  return (
    <div className={`space-y-8 ${t.pageContainer}`}>
      {/* Creator Identity Hero */}
      <section className={`${t.elevatedPanel} p-6 sm:p-10`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Typographic Monogram Identity Emblem (no invented portrait photo) */}
          <div className="lg:col-span-4 flex flex-col items-start lg:items-center justify-center">
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 ${t.card} flex flex-col items-center justify-center gap-1 select-none`}
            >
              <span className={`${t.heading} text-5xl sm:text-6xl tracking-tight`}>LS</span>
              <span className={`font-mono text-[10px] uppercase tracking-[0.26em] ${t.accentText}`}>
                Creator
              </span>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <p className={t.monoBadge}>Creator & Visionary · LUPIN MOVIES</p>
            <h1 className={`${t.heading} text-4xl sm:text-6xl`}>Lupin Starnley</h1>
            <p className={`text-sm sm:text-base ${t.muted}`}>
              Founder and Architect of the LUPIN MOVIES multi-edition entertainment platform.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigateSection('contact')}
                className={`${t.primaryBtn} h-11 px-5 text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer`}
              >
                <Mail className="w-4 h-4" />
                <span>Contact Lupin Starnley</span>
              </button>
              <a
                href={WHATSAPP_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${t.secondaryBtn} h-11 px-4 text-xs sm:text-sm inline-flex items-center gap-2`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Support</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => onNavigateSection('discover')}
                className={`${t.secondaryBtn} h-11 px-4 text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer`}
              >
                <Compass className="w-4 h-4" />
                <span>Explore Platform</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Creator Biography Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <article className={`lg:col-span-8 ${t.panel} p-6 sm:p-9 space-y-6`}>
          <h2 className={`${t.subHeading} text-2xl sm:text-3xl`}>Vision & Story</h2>
          <div className={`space-y-5 text-base sm:text-lg leading-relaxed ${t.text}`}>
            <p>
              Lupin Starnley is the creator and visionary behind LUPIN MOVIES, an entertainment
              platform built to make discovering and enjoying movies and series easier and more
              accessible.
            </p>
            <p>
              Driven by creativity, technology and a passion for digital experiences, Lupin
              Starnley aims to build innovative entertainment experiences that bring people closer
              to the content they love.
            </p>
            <p>
              LUPIN MOVIES represents a vision of modern entertainment, combining technology,
              creativity and simplicity into one platform.
            </p>
          </div>
        </article>

        <aside className={`lg:col-span-4 ${t.panel} p-6 space-y-5`}>
          <h3 className={`${t.subHeading} text-xl`}>Platform Identity</h3>

          <dl className={`divide-y ${t.divide} text-sm`}>
            <div className="py-3 flex justify-between gap-3">
              <dt className={t.muted}>Creator</dt>
              <dd className="font-semibold text-right">Lupin Starnley</dd>
            </div>
            <div className="py-3 flex justify-between gap-3">
              <dt className={t.muted}>Platform</dt>
              <dd className="font-semibold text-right">LUPIN MOVIES</dd>
            </div>
            <div className="py-3 flex justify-between gap-3">
              <dt className={t.muted}>Focus</dt>
              <dd className="font-medium text-right">Technology, Creativity & Simplicity</dd>
            </div>
            <div className="py-3 space-y-1">
              <dt className={t.muted}>Direct Email</dt>
              <dd>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className={`font-mono text-xs break-all underline ${t.accentText}`}
                >
                  {SUPPORT_EMAIL}
                </a>
              </dd>
            </div>
            <div className="py-3 space-y-1">
              <dt className={t.muted}>Official Channel</dt>
              <dd>
                <a
                  href={WHATSAPP_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs inline-flex items-center gap-1 underline ${t.accentText}`}
                >
                  <span>WhatsApp Official Channel</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </dd>
            </div>
          </dl>
        </aside>
      </section>
    </div>
  );
}
