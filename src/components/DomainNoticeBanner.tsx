import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';
import { ApiClientError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getEditionTheme } from '../lib/editionTheme';

interface DomainNoticeBannerProps {
  error: unknown;
  onRetry?: () => void;
}

export function DomainNoticeBanner({ error, onRetry }: DomainNoticeBannerProps) {
  const { layoutMode } = useAuth();
  if (!error) return null;

  const t = getEditionTheme(layoutMode);
  const isApiErr = error instanceof ApiClientError;
  const isDomain = isApiErr && error.isDomainRestriction;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unable to reach media catalog.';
  const originHost =
    (isApiErr && error.detectedOrigin) ||
    (typeof window !== 'undefined' ? window.location.hostname : '');

  return (
    <div role="alert" className={`${t.elevatedPanel} p-5 sm:p-6 border-rose-500/35 text-left`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-500">
            {isDomain ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="min-w-0 space-y-1.5">
            <h3 className={`${t.subHeading} text-base font-semibold`}>
              {isDomain
                ? 'FRAMEX API Key Domain Authorization Required'
                : 'Media Service Temporarily Unavailable'}
            </h3>
            <p className={`text-sm ${t.muted} leading-relaxed`}>{message}</p>
            {isDomain && originHost && (
              <p className={`text-xs ${t.muted} leading-relaxed pt-1`}>
                Authorize{' '}
                <code className="font-mono px-1.5 py-0.5 rounded border border-current/20">
                  {originHost}
                </code>{' '}
                in your FRAMEX API key settings under Allowed Domains, then retry.
              </p>
            )}
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={`${t.secondaryBtn} inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm shrink-0 min-h-[44px] whitespace-nowrap cursor-pointer`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
}
