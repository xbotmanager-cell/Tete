import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AuthModal() {
  const { authModalOpen, setAuthModalOpen, login, register, layoutMode } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const isSidebar = layoutMode === 'sidebar';
  const isCinematic = layoutMode === 'cinematic';

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
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className={`w-full max-w-md p-6 sm:p-8 relative ${
          isSidebar
            ? 'rounded-lg bg-[#0c0c0f] border border-zinc-800 shadow-2xl'
            : isCinematic
              ? 'rounded-lg bg-[#141414] border border-white/10 shadow-2xl'
              : 'glass-surface-elevated rounded-3xl'
        }`}
      >
        <button
          type="button"
          onClick={() => setAuthModalOpen(false)}
          aria-label="Close authentication modal"
          className={`absolute top-5 right-5 w-9 h-9 flex items-center justify-center cursor-pointer ${
            isSidebar
              ? 'rounded border border-zinc-800 bg-zinc-900 text-zinc-300'
              : isCinematic
                ? 'rounded-full bg-neutral-800 text-white'
                : 'glass-btn rounded-xl text-rose-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1.5 mb-6">
          <h2
            id="auth-modal-title"
            className={
              isSidebar
                ? 'font-console text-xl font-bold text-white'
                : isCinematic
                  ? 'font-cinema text-3xl uppercase tracking-wide text-white'
                  : 'font-editorial text-3xl font-semibold text-white'
            }
          >
            {mode === 'login' ? 'Sign In to LUPIN MOVIES' : 'Create Your Account'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Sync your watchlist, favorites, watch progress, and reading history.
          </p>
        </div>

        {/* Segmented Tab */}
        <div
          className={`grid grid-cols-2 gap-1 p-1 mb-5 border ${
            isSidebar
              ? 'rounded-md bg-zinc-950 border-zinc-800'
              : isCinematic
                ? 'rounded bg-black border-neutral-800'
                : 'rounded-xl bg-black/35 border-rose-200/10'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              isSidebar ? 'rounded' : isCinematic ? 'rounded-xs' : 'rounded-lg'
            } ${
              mode === 'login'
                ? isSidebar
                  ? 'bg-white text-black font-semibold'
                  : isCinematic
                    ? 'bg-[#e50914] text-white font-bold'
                    : 'bg-rose-700/80 text-white'
                : 'text-zinc-400 hover:text-white'
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
            className={`py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              isSidebar ? 'rounded' : isCinematic ? 'rounded-xs' : 'rounded-lg'
            } ${
              mode === 'register'
                ? isSidebar
                  ? 'bg-white text-black font-semibold'
                  : isCinematic
                    ? 'bg-[#e50914] text-white font-bold'
                    : 'bg-rose-700/80 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label htmlFor="auth-name" className="block text-xs font-medium text-zinc-300">
                Display Name
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Arsène Lupin"
                required
                className="w-full h-11 px-3.5 rounded-lg bg-black/55 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/50"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="block text-xs font-medium text-zinc-300">
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
              className="w-full h-11 px-3.5 rounded-lg bg-black/55 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-300">
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
              className="w-full h-11 px-3.5 rounded-lg bg-black/55 border border-white/15 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/50"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-300 bg-rose-950/60 border border-rose-500/30 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full h-11 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
              isSidebar
                ? 'rounded-md bg-white text-black hover:bg-cyan-300'
                : isCinematic
                  ? 'rounded bg-[#e50914] hover:bg-[#f40612] text-white'
                  : 'glass-btn-primary rounded-xl text-white'
            }`}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
