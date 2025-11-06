import React, { useState } from 'react';
import { useAppContext } from '../App';
import { CheckCircleIcon } from './icons';

const LoginPage: React.FC = () => {
  const { login, isSupabaseEnabled, isSupabaseReady } = useAppContext();
  const [email, setEmail] = useState('');
  const [loginState, setLoginState] = useState<'form' | 'confirming' | 'confirmed'>('form');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoginMode, setLastLoginMode] = useState<'magicLink' | 'mock' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loginState !== 'form') {
      return;
    }

    setError(null);
    setLoginState('confirming');

    try {
      const result = await login(isAdminLogin ? 'admin' : 'member', email);
      setLastLoginMode(result.mode);
      setLoginState('confirmed');
    } catch (err) {
      console.error('Failed to initiate login flow', err);
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setLoginState('form');
    }
  };

  const isSubmitDisabled = !email || (isSupabaseEnabled && !isSupabaseReady) || loginState !== 'form';

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-inter flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
            <img src="https://restorationexpertise.com/wp-content/uploads/2025/11/Restorationexpertise_ig_profilepic_2_small.webp" alt="Restoration Expertise Logo" className="w-24 h-24 mx-auto mb-4"/>
            <h1 className="font-playfair text-5xl font-bold text-[var(--text-main)]">Restoration Expertise</h1>
            <p className="text-lg text-[var(--text-muted)] mt-2">The national trust network for professionals.</p>
        </div>

        <div className="bg-[var(--bg-card)] p-8 rounded-2xl shadow-xl border border-[var(--border-subtle)] transition-all duration-500">
          {loginState === 'form' && (
            <div className="animate-fade-in">
              <form onSubmit={handleSubmit}>
                <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)] mb-2">Welcome</h2>
                <p className="text-[var(--text-muted)] mb-6">
                  Enter your email to {isSupabaseEnabled ? 'receive a magic login link.' : 'log in to the interactive demo.'}
                </p>

                {isSupabaseEnabled && !isSupabaseReady && (
                  <p className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-sm text-[var(--text-muted)]">
                    Connecting to Supabase...
                  </p>
                )}
                
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text-muted)] sr-only">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1 block w-full px-4 py-3 border border-[var(--border-subtle)] rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-shadow bg-[var(--bg-input)] text-[var(--text-main)]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[var(--accent)] text-[var(--accent-text)] font-bold text-lg rounded-lg shadow-lg hover:bg-[var(--accent-dark)] transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/50 disabled:opacity-50"
                  disabled={isSubmitDisabled}
                >
                  {isSupabaseEnabled ? 'Send Magic Link' : 'Log In'}
                </button>
              </form>

              {error && (
                <p className="mt-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</p>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[var(--border-subtle)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[var(--bg-card)] px-2 text-sm text-[var(--text-muted)]">Or</span>
                </div>
              </div>

              <button
                onClick={() => window.location.hash = '#/assessment'}
                className="w-full py-3 px-4 bg-[var(--bg-card)] text-[var(--text-main)] font-bold rounded-lg shadow-md border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-all transform hover:scale-105"
              >
                Take Free Credibility Assessment
              </button>
              
              {!isSupabaseEnabled && (
                <div className="mt-6 text-center">
                  <label htmlFor="admin-toggle" className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer">
                    <input
                      id="admin-toggle"
                      type="checkbox"
                      checked={isAdminLogin}
                      onChange={() => setIsAdminLogin(!isAdminLogin)}
                      className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    Login as Admin (demo mode)
                  </label>
                </div>
              )}

            </div>
          )}

          {(loginState === 'confirming' || loginState === 'confirmed') && (
            <div className="text-center animate-fade-in">
                <CheckCircleIcon className="w-16 h-16 text-success mx-auto mb-4" />
                <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)]">
                  {lastLoginMode === 'magicLink' ? 'Magic link sent!' : 'Logging you in...'}
                </h2>
                <p className="text-[var(--text-muted)] mt-2 mb-6">
                  {lastLoginMode === 'magicLink'
                    ? `Check your email to continue. The link will bring you back to ${window.location.origin}.`
                    : 'Sit tight, we are preparing your dashboard.'}
                </p>
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2.5">
                    <div className="bg-[var(--accent)] h-2.5 rounded-full animate-pulse"></div>
                </div>
            </div>
          )}
        </div>
      </div>
      <footer className="absolute bottom-4 text-center text-[var(--text-muted)]">
        <p>&copy; {new Date().getFullYear()} RestorationExpertise. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default LoginPage;