import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { CheckCircleIcon } from './icons';

const PLAN_STORAGE_KEY = 'restorationexpertise:last-plan';
const EMAIL_STORAGE_KEY = 'restorationexpertise:last-email';

const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [loginState, setLoginState] = useState<'form' | 'confirming' | 'confirmed'>('form');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY);
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkoutStatus = params.get('checkout');

    if (checkoutStatus === 'success') {
      const storedPlan = typeof window !== 'undefined' ? window.localStorage.getItem(PLAN_STORAGE_KEY) : null;
      const slug = (storedPlan ?? 'founding-member').toLowerCase().replace(/\s+/g, '-');
      navigate(`/success/${slug}`, { replace: true });
    } else if (checkoutStatus === 'cancelled') {
      setError('Checkout was cancelled. You can try again when you are ready.');
    }
  }, [location.search, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || loginState !== 'form') {
      return;
    }

    const trimmedEmail = email.trim();
    setError(null);
    setLoginState('confirming');

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(EMAIL_STORAGE_KEY, trimmedEmail);
      }
      await login(trimmedEmail);
      setLoginState('confirmed');
    } catch (err) {
      console.error('Failed to initiate login flow', err);
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setLoginState('form');
    }
  };

  const isSubmitDisabled = !email || loginState !== 'form';

  return (
    <div className="login-page-container font-inter">
      <div className="login-animation-bg">
        <div className="aurora-layer layer-1"></div>
        <div className="aurora-layer layer-2"></div>
        <div className="login-particle-container">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="login-particle"></div>
          ))}
        </div>
        <div className="light-streak"></div>
      </div>
      <div className="w-full max-w-lg mx-auto relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <img
            src="https://restorationexpertise.com/wp-content/uploads/2025/11/restorationexpertisecom2_logo3D.webp"
            alt="Restoration Expertise Logo"
            className="w-40 h-40 md:w-52 md:h-52 mx-auto mb-4 animate-float-logo"
          />
          <h1 className="font-playfair text-xl md:text-2xl font-bold text-white">Restoration Expertise</h1>
          <p className="text-lg text-gray-300 mt-2">The Restoration Network Homeowners Trust.</p>
        </div>

        <div className="login-glass-card p-8 rounded-2xl transition-all duration-500">
          {loginState === 'form' && (
            <div className="animate-fade-in space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <p className="text-gray-300">Enter your email to receive a secure magic link.</p>
                  <p className="text-sm text-gray-400 mt-2">Members only. Use the email you joined with.</p>
                </div>

                {isLoading && (
                  <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-gray-300">Connecting to Supabase…</p>
                )}

                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="your@email.com"
                    required
                    className="mt-1 block w-full px-4 py-3 border border-white/20 rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] bg-white/10 text-white placeholder:text-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="magic-link-button w-full py-3 px-4 bg-[var(--accent)] text-[var(--accent-text)] font-bold text-lg rounded-lg shadow-lg hover:bg-[var(--accent-dark)] transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/50 disabled:opacity-50"
                >
                  Send Magic Link
                </button>
              </form>

              {error && (
                <p className="rounded-lg border border-error/40 bg-error/10 p-3 text-sm text-error">{error}</p>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[rgba(28,28,28,0.2)] px-2 text-sm text-gray-400">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/assessment')}
                className="w-full py-3 px-4 bg-white/10 text-white font-bold rounded-lg shadow-md border border-white/20 hover:bg-white/20 transition-all transform hover:scale-105"
              >
                Take Free Credibility Assessment
              </button>
            </div>
          )}

          {loginState === 'confirming' && (
            <div className="text-center animate-fade-in space-y-4">
              <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
              <h2 className="font-playfair text-3xl font-bold text-white">Sending magic link…</h2>
              <p className="text-gray-300">We're sending a secure link to {email}. Follow the instructions in your inbox to continue.</p>
            </div>
          )}

          {loginState === 'confirmed' && (
            <div className="text-center animate-fade-in space-y-4">
              <CheckCircleIcon className="mx-auto h-16 w-16 text-success" />
              <h2 className="font-playfair text-3xl font-bold text-white">Magic link sent!</h2>
              <p className="text-gray-300">
                Check your inbox for your secure login link.
              </p>
              <div className="h-2.5 w-full rounded-full bg-white/10">
                <div className="h-2.5 animate-pulse rounded-full bg-[var(--accent)]" />
              </div>
            </div>
          )}
        </div>
      </div>
      <footer className="absolute bottom-4 text-center text-gray-400 z-10">
        <p>&copy; {new Date().getFullYear()} RestorationExpertise. All Rights Reserved.</p>
        <button
          onClick={() => navigate('/admin/login')}
          className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors underline"
        >
          Admin Login
        </button>
      </footer>
    </div>
  );
};

export default LoginPage;
