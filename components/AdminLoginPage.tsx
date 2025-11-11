import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await adminLogin(email, password);
      
      if (result.success) {
        // Success - redirect to admin dashboard
        navigate('/admin');
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="login-page-container">
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

      <div className="login-glass-card rounded-3xl p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img 
            src="https://restorationexpertise.com/wp-content/uploads/2025/11/Restorationexpertise_ig_profilepic_2_small.webp" 
            alt="RestorationExpertise Logo" 
            className="w-16 h-16 mx-auto mb-4 rounded-full"
          />
          <h1 className="text-3xl font-bold font-playfair text-white mb-2">Admin Login</h1>
          <p className="text-gray-300">Enter your credentials to access the admin dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 py-3 rounded-xl border bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                error ? 'border-red-400 focus:ring-red-400' : 'border-white/20 focus:ring-gold focus:border-gold'
              }`}
              placeholder="admin@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-4 py-3 rounded-xl border bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                error ? 'border-red-400 focus:ring-red-400' : 'border-white/20 focus:ring-gold focus:border-gold'
              }`}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-400/10 backdrop-blur-sm rounded-lg p-3 border border-red-400/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-charcoal transition-all transform ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gold hover:bg-gold-light hover:scale-105 active:scale-95'
            } shadow-lg`}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleBackToLogin}
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            ← Back to Member Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;