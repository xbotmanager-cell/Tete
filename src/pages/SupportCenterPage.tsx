import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Mail,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Tv,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEditionTheme } from '../lib/editionTheme';
import type { EditionSection } from '../editions/types';

export const WHATSAPP_SUPPORT_URL = 'https://wa.me/255780470905';
export const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0';
export const SUPPORT_EMAIL = 'lupinstarnley009@gmail.com';

interface SupportCenterPageProps {
  onNavigateSection: (section: EditionSection) => void;
}

interface FaqItem {
  category: 'streaming' | 'account' | 'discovery';
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    category: 'streaming',
    question: 'Why does a movie or episode pause or fail after several minutes?',
    answer:
      'Signed FRAMEX streaming links expire automatically after 10 minutes for security. LUPIN MOVIES refreshes signed playback URLs proactively before expiration, and if your network drops, clicking Reload Stream inside the player fetches a fresh link at your current timestamp.',
  },
  {
    category: 'streaming',
    question: 'Subtitles are not appearing or look out of sync.',
    answer:
      'Open the Subtitles menu inside the video player and choose your preferred language. All SRT captions are converted on the fly to WebVTT via the built-in subtitle proxy so they render cleanly across desktop and mobile browsers.',
  },
  {
    category: 'streaming',
    question: 'How do I switch between MovieBox, Showbox, AnimeX, or Gotaku?',
    answer:
      'In Discover & Catalog you can switch between MovieBox (v1) and Showbox (v2) at the top toolbar. Inside the Anime hub you can toggle between AnimeX (HLS streams with SUB/DUB servers) and Gotaku (authenticated player embeds).',
  },
  {
    category: 'account',
    question: 'How are my watchlist, continue watching, and Edition choice saved?',
    answer:
      'When signed in, your watchlist, favorites, watch progress, reading history, and selected Website Edition are persisted to the PostgreSQL database. As a guest, preferences and lists are stored securely in your browser via localStorage.',
  },
  {
    category: 'account',
    question: 'Can I switch between the six Website Editions while watching?',
    answer:
      'Yes. Open Appearance Settings from any header or footer to switch instantly between Cinematic, Classic, Sidebar, Editorial, Neon, and Minimalist Editions without reloading the page or losing saved playback progress.',
  },
  {
    category: 'discovery',
    question: 'Live TV or Sports channels are buffering or offline.',
    answer:
      'Live broadcasts come from external HLS relays and YouTube Live feeds. Use the Live & Sports hub to pick an alternate country channel under TVGarden or switch to an active live match feed.',
  },
];

export function SupportCenterPage({ onNavigateSection }: SupportCenterPageProps) {
  const { layoutMode } = useAuth();
  const t = getEditionTheme(layoutMode);

  const [faqFilter, setFaqFilter] = useState<'all' | 'streaming' | 'account' | 'discovery'>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) => faqFilter === 'all' || item.category === faqFilter
  );

  return (
    <div className={`space-y-8 ${t.pageContainer}`}>
      {/* Header */}
      <section className={`${t.elevatedPanel} p-6 sm:p-8 space-y-3`}>
        <p className={t.monoBadge}>Support Center · Direct Help & Channels</p>
        <h1 className={`${t.heading} text-3xl sm:text-5xl`}>LUPIN MOVIES Support Center</h1>
        <p className={`text-sm sm:text-base ${t.muted} max-w-2xl leading-relaxed`}>
          Get direct assistance with streaming playback, account synchronization, title discovery,
          and platform updates from Lupin Starnley and the official WhatsApp channels.
        </p>
      </section>

      {/* Primary Support & Community Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={`${t.panel} p-6 flex flex-col justify-between gap-5`}>
          <div className="space-y-2.5">
            <MessageCircle className={`w-6 h-6 ${t.accentText}`} />
            <h2 className={`${t.subHeading} text-xl`}>WhatsApp Support</h2>
            <p className={`text-sm ${t.muted} leading-relaxed`}>
              Chat directly on WhatsApp for streaming troubleshooting, broken link reports, or
              account guidance.
            </p>
            <p className={`font-mono text-xs ${t.text} pt-1`}>+255 780 470 905</p>
          </div>
          <a
            href={WHATSAPP_SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${t.primaryBtn} h-11 px-4 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Open WhatsApp Support</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className={`${t.panel} p-6 flex flex-col justify-between gap-5`}>
          <div className="space-y-2.5">
            <Users className={`w-6 h-6 ${t.accentText}`} />
            <h2 className={`${t.subHeading} text-xl`}>Official WhatsApp Channel</h2>
            <p className={`text-sm ${t.muted} leading-relaxed`}>
              Follow release announcements, platform updates, newly indexed editions, and
              service notices on the official channel.
            </p>
            <p className={`font-mono text-xs ${t.muted} truncate pt-1`}>
              whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0
            </p>
          </div>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${t.secondaryBtn} h-11 px-4 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap`}
          >
            <Users className="w-4 h-4" />
            <span>Join WhatsApp Channel</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className={`${t.panel} p-6 flex flex-col justify-between gap-5`}>
          <div className="space-y-2.5">
            <Mail className={`w-6 h-6 ${t.accentText}`} />
            <h2 className={`${t.subHeading} text-xl`}>Email & Contact Form</h2>
            <p className={`text-sm ${t.muted} leading-relaxed`}>
              Reach creator Lupin Starnley directly by email or submit a structured inquiry via the
              Contact page.
            </p>
            <p className={`font-mono text-xs ${t.text} break-all pt-1`}>{SUPPORT_EMAIL}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className={`${t.secondaryBtn} flex-1 h-11 px-3 text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Email</span>
            </a>
            <button
              type="button"
              onClick={() => onNavigateSection('contact')}
              className={`${t.primaryBtn} flex-1 h-11 px-3 text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer`}
            >
              <span>Contact Form</span>
            </button>
          </div>
        </div>
      </section>

      {/* Topic Help Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={`${t.card} p-5 space-y-2.5`}>
          <div className="flex items-center gap-2">
            <PlayCircle className={`w-5 h-5 ${t.accentText}`} />
            <h3 className="text-base font-semibold">Streaming Problems</h3>
          </div>
          <p className={`text-xs sm:text-sm ${t.muted} leading-relaxed`}>
            If a stream fails to load, try switching resolution (1080p to 720p), toggling AnimeX vs
            Gotaku for anime, or refreshing the signed playback session in the player controls.
          </p>
        </div>

        <div className={`${t.card} p-5 space-y-2.5`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-5 h-5 ${t.accentText}`} />
            <h3 className="text-base font-semibold">Account Issues</h3>
          </div>
          <p className={`text-xs sm:text-sm ${t.muted} leading-relaxed`}>
            Accounts use HTTP-only signed session cookies and synchronize watchlists, continue
            watching progress, and edition preferences across devices once logged in.
          </p>
        </div>

        <div className={`${t.card} p-5 space-y-2.5`}>
          <div className="flex items-center gap-2">
            <Tv className={`w-5 h-5 ${t.accentText}`} />
            <h3 className="text-base font-semibold">Movie Discovery & Playback</h3>
          </div>
          <p className={`text-xs sm:text-sm ${t.muted} leading-relaxed`}>
            Browse Trending, Popular, Latest, Upcoming, Genre collections, Live TV, GoalNivo
            Sports, and Novel Reader sections from any of the six Website Editions.
          </p>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className={`${t.panel} p-6 sm:p-8 space-y-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <HelpCircle className={`w-5 h-5 ${t.accentText}`} />
            <h2 className={`${t.subHeading} text-2xl`}>Frequently Asked Questions</h2>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'streaming', label: 'Streaming' },
              { id: 'account', label: 'Accounts' },
              { id: 'discovery', label: 'Discovery' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFaqFilter(f.id as typeof faqFilter);
                  setOpenIndex(0);
                }}
                className={`px-3.5 py-1.5 text-xs whitespace-nowrap cursor-pointer ${
                  faqFilter === f.id ? t.tabActive : t.tabIdle
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`divide-y ${t.divide} border-t ${t.border}`}>
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={faq.question} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-semibold">{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className={`w-4 h-4 shrink-0 ${t.accentText}`} />
                  ) : (
                    <ChevronDown className={`w-4 h-4 shrink-0 ${t.muted}`} />
                  )}
                </button>
                {isOpen && (
                  <p className={`mt-2.5 text-xs sm:text-sm ${t.muted} leading-relaxed max-w-3xl`}>
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
