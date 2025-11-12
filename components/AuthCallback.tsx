import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthStateChange = () => {
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change:', event, session);
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in successfully, redirecting to dashboard');
          // Redirect to dashboard or member hub
          navigate('/dashboard', { replace: true });
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          navigate('/', { replace: true });
        } else {
          console.log('Other auth event:', event);
          // For other events or if something goes wrong, redirect to home
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 3000);
        }
      });
    };

    handleAuthStateChange();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-light flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-charcoal mb-2">Completing Sign In...</h2>
        <p className="text-gray">Please wait while we log you in to your account.</p>
      </div>
    </div>
  );
};

export default AuthCallback;