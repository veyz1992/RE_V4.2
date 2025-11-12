import React, { useState } from 'react';
import { useAppContext } from '../App';
import { CheckCircleIcon } from './icons';

const LoginPage: React.FC = () => {
  const { login } = useAppContext();
  const [email, setEmail] = useState('');
  const [loginState, setLoginState] = useState<'form' | 'confirming' | 'confirmed'>('form');
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setLoginState('confirming');
      setTimeout(() => {
        setLoginState('confirmed');
        setTimeout(() => {
          login(isAdminLogin ? 'admin' : 'member', email);
        }, 1500);
      }, 1000);
    }
  };

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
      <div className="w-full max-w-md mx-auto relative z-10">
        <div className="text-center mb-8 animate-fade-in">
            <img src="https://restorationexpertise.com/wp-content/uploads/2025/11/restorationexpertisecom2_logo3D.webp" alt="Restoration Expertise Logo" className="w-40 h-40 md:w-52 md:h-52 mx-auto mb-4 animate-float-logo"/>
            <h1 className="font-playfair text-xl font-bold text-white">Restoration Expertise</h1>
            <p className="text-lg text-gray-300 mt-2">The national trust network for professionals.</p>
        </div>

        <div className="login-glass-card p-8 rounded-2xl transition-all duration-500">
          {loginState === 'form' && (
            <div className="animate-fade-in">
              <form onSubmit={handleSubmit}>
                <p className="text-gray-300 mb-6 text-center">Enter your email to receive a magic login link.</p>
                
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 sr-only">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="mt-1 block w-full px-4 py-3 border border-white/20 rounded-lg shadow-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] transition-shadow bg-white/10 text-white placeholder:text-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[var(--accent)] text-[var(--accent-text)] font-bold text-lg rounded-lg shadow-lg hover:bg-[var(--accent-dark)] transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/50 disabled:opacity-50"
                  disabled={!email}
                >
                  Send Magic Link
                </button>
              </form>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[rgba(28,28,28,0.2)] px-2 text-sm text-gray-400">Or</span>
                </div>
              </div>

              <button
                onClick={() => window.location.hash = '#/assessment'}
                className="w-full py-3 px-4 bg-white/10 text-white font-bold rounded-lg shadow-md border border-white/20 hover:bg-white/20 transition-all transform hover:scale-105"
              >
                Take Free Credibility Assessment
              </button>
              
              <div className="mt-6 text-center">
                <label htmlFor="admin-toggle" className="flex items-center justify-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    id="admin-toggle"
                    type="checkbox"
                    checked={isAdminLogin}
                    onChange={() => setIsAdminLogin(!isAdminLogin)}
                    className="h-4 w-4 rounded border-white/30 text-[var(--accent)] focus:ring-[var(--accent)] bg-transparent focus:ring-offset-0"
                  />
                  Login as Admin (for testing)
                </label>
              </div>

            </div>
          )}

          {(loginState === 'confirming' || loginState === 'confirmed') && (
            <div className="text-center animate-fade-in">
                <CheckCircleIcon className="w-16 h-16 text-success mx-auto mb-4" />
                <h2 className="font-playfair text-3xl font-bold text-white">Magic link sent!</h2>
                <p className="text-gray-300 mt-2 mb-6">Check your email to continue. You will be redirected shortly...</p>
                <div className="w-full bg-white/20 rounded-full h-2.5">
                    <div className="bg-[var(--accent)] h-2.5 rounded-full animate-pulse"></div>
                </div>
            </div>
          )}
        </div>
      </div>
      <footer className="absolute bottom-4 text-center text-gray-400 z-10">
        <p>&copy; {new Date().getFullYear()} RestorationExpertise. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default LoginPage;