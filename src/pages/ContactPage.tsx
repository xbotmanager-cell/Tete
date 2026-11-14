import { useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Info,
  Mail,
  MessageCircle,
  Send,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEditionTheme } from '../lib/editionTheme';
import {
  SUPPORT_EMAIL,
  WHATSAPP_CHANNEL_URL,
  WHATSAPP_SUPPORT_URL,
} from './SupportCenterPage';

interface ComposeLinks {
  gmailUrl: string;
  mailtoUrl: string;
}

function buildComposeLinks(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): ComposeLinks {
  const formattedBody = [
    `Name: ${params.name}`,
    `Email: ${params.email}`,
    '',
    'Message:',
    params.message,
  ].join('\n');

  const query = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: SUPPORT_EMAIL,
    su: params.subject,
    body: formattedBody,
  });

  const gmailUrl = `https://mail.google.com/mail/?${query.toString()}`;
  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    params.subject
  )}&body=${encodeURIComponent(formattedBody)}`;

  return { gmailUrl, mailtoUrl };
}

function triggerComposeLink(url: string, newTab: boolean): boolean {
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    if (newTab) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return true;
  } catch {
    return false;
  }
}

export function ContactPage() {
  const { layoutMode, user } = useAuth();
  const t = getEditionTheme(layoutMode);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [composeLinks, setComposeLinks] = useState<ComposeLinks | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2) {
      setValidationError('Please enter your name (at least 2 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (trimmedSubject.length < 3) {
      setValidationError('Please enter a subject (at least 3 characters).');
      return;
    }
    if (trimmedMessage.length < 10) {
      setValidationError('Please enter a message (at least 10 characters).');
      return;
    }

    const links = buildComposeLinks({
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    setComposeLinks(links);

    const openedGmail = triggerComposeLink(links.gmailUrl, true);
    if (!openedGmail) {
      triggerComposeLink(links.mailtoUrl, false);
    }
  };

  return (
    <div className={`space-y-8 ${t.pageContainer}`}>
      {/* Header */}
      <section className={`${t.elevatedPanel} p-6 sm:p-8 space-y-3`}>
        <p className={t.monoBadge}>Direct Contact · LUPIN MOVIES</p>
        <h1 className={`${t.heading} text-3xl sm:text-5xl`}>Contact Us</h1>
        <p className={`text-sm sm:text-base ${t.muted} max-w-2xl leading-relaxed`}>
          Reach out directly to creator Lupin Starnley via email, WhatsApp Support, the official
          WhatsApp Channel, or the pre-filled email composer below.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Direct Contact Directory */}
        <aside className={`lg:col-span-5 ${t.panel} p-6 space-y-6`}>
          <h2 className={`${t.subHeading} text-2xl`}>Direct Channels</h2>

          <dl className={`divide-y ${t.divide} text-sm`}>
            <div className="py-3 flex justify-between gap-3">
              <dt className={t.muted}>Creator</dt>
              <dd className="font-semibold text-right">Lupin Starnley</dd>
            </div>
            <div className="py-3 space-y-1">
              <dt className={t.muted}>Email</dt>
              <dd className="font-mono text-xs sm:text-sm break-all">{SUPPORT_EMAIL}</dd>
            </div>
            <div className="py-3 flex justify-between gap-3">
              <dt className={t.muted}>WhatsApp Support</dt>
              <dd className="font-mono text-xs sm:text-sm">+255 780 470 905</dd>
            </div>
            <div className="py-3 space-y-1">
              <dt className={t.muted}>WhatsApp Channel</dt>
              <dd className="font-mono text-xs break-all opacity-90">{WHATSAPP_CHANNEL_URL}</dd>
            </div>
          </dl>

          <div className="space-y-2.5 pt-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className={`${t.primaryBtn} w-full h-11 px-4 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap`}
            >
              <Mail className="w-4 h-4" />
              <span>Send Email</span>
            </a>

            <a
              href={WHATSAPP_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${t.secondaryBtn} w-full h-11 px-4 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contact via WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href={WHATSAPP_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`${t.secondaryBtn} w-full h-11 px-4 text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap`}
            >
              <Users className="w-4 h-4" />
              <span>Join Official Channel</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </aside>

        {/* Gmail / Email Client Compose Form */}
        <section className={`lg:col-span-7 ${t.panel} p-6 sm:p-8 space-y-5`}>
          <div className="space-y-1">
            <h2 className={`${t.subHeading} text-2xl`}>Send a Message</h2>
            <p className={`text-xs sm:text-sm ${t.muted}`}>
              Fill in your details to open Gmail (or your default email app) with a pre-filled draft
              addressed to <span className="font-mono">{SUPPORT_EMAIL}</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="block text-xs font-medium">
                  Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className={`w-full h-11 px-3.5 text-sm ${t.input}`}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-email" className="block text-xs font-medium">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full h-11 px-3.5 text-sm ${t.input}`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-subject" className="block text-xs font-medium">
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                required
                minLength={3}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Playback feedback, partnership, or support question"
                className={`w-full h-11 px-3.5 text-sm ${t.input}`}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-message" className="block text-xs font-medium">
                Message
              </label>
              <textarea
                id="contact-message"
                required
                minLength={10}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message here (at least 10 characters)…"
                className={`w-full p-3.5 text-sm resize-y ${t.input}`}
              />
            </div>

            {composeLinks && (
              <div
                role="status"
                className={`${t.card} p-4 border-sky-500/40 bg-sky-500/10 space-y-3 text-xs sm:text-sm`}
              >
                <div className="flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                  <p className="leading-relaxed">
                    Your email application has opened with your message pre-filled for{' '}
                    <span className="font-mono">{SUPPORT_EMAIL}</span>. Please review the details
                    and press <span className="font-semibold">Send</span> to complete your message.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pl-6">
                  <a
                    href={composeLinks.gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${t.primaryBtn} h-9 px-3.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Gmail</span>
                  </a>
                  <a
                    href={composeLinks.mailtoUrl}
                    className={`${t.secondaryBtn} h-9 px-3.5 text-xs inline-flex items-center gap-1.5 whitespace-nowrap`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open Default Email App</span>
                  </a>
                </div>
              </div>
            )}

            {validationError && (
              <div
                role="alert"
                className="p-3.5 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs sm:text-sm flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            <button
              type="submit"
              className={`${t.primaryBtn} w-full sm:w-auto h-11 px-6 text-sm inline-flex items-center justify-center gap-2 cursor-pointer`}
            >
              <Send className="w-4 h-4" />
              <span>Compose in Gmail</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
