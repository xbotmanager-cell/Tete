import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEditionTheme } from '../lib/editionTheme';

export function AuthModal() {
  const { authModalOpen, setAuthModalOpen, login, register, layoutMode } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const t = getEditionTheme(layoutMode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className={`w-full max-w-md p-6 sm:p-8 relative ${t.elevatedPanel}`}>
        <button
          type="button"
          onClick={() => setAuthModalOpen(false)}
          aria-label="Close authentication modal"
          className={`absolute top-5 right-5 w-9 h-9 flex items-center justify-center cursor-pointer ${t.secondaryBtn}`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1.5 mb-6 pr-10">
          <h2 id="auth-modal-title" className={`${t.heading} text-2xl sm:text-3xl`}>
            {mode === 'login' ? 'Sign In to LUPIN MOVIES' : 'Create Your Account'}
          </h2>
          <p className={`text-xs sm:text-sm ${t.muted}`}>
            Sync your watchlist, favorites, watch progress, reading history, and edition preference.
          </p>
        </div>

        <div className={`grid grid-cols-2 gap-1 p-1 mb-5 border ${t.border} ${t.card}`}>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs sm:text-sm cursor-pointer ${
              mode === 'login' ? t.tabActive : t.tabIdle
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs sm:text-sm cursor-pointer ${
              mode === 'register' ? t.tabActive : t.tabIdle
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-name" className="block text-xs font-medium">
                Display Name
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className={`w-full h-11 px-3.5 text-sm ${t.input}`}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="block text-xs font-medium">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="viewer@lupinmovies.com"
              required
              autoComplete="email"
              className={`w-full h-11 px-3.5 text-sm ${t.input}`}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="block text-xs font-medium">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={`w-full h-11 px-3.5 text-sm ${t.input}`}
            />
          </div>

          {error && (
            <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/35 rounded-md px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`${t.primaryBtn} w-full h-11 text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60`}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
