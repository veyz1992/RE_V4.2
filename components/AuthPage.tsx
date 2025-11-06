import React from 'react';

// NOTE: This component is currently not used in the main application flow
// as Supabase has been temporarily disabled for UI testing.

const AuthPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-light p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-border">
        <div className="text-center mb-8">
            <img src="https://restorationexpertise.com/wp-content/uploads/2025/11/Restorationexpertise_ig_profilepic_2_small.webp" alt="RestorationExpertise Logo" className="w-16 h-16 mx-auto mb-4"/>
            <h1 className="font-sora text-3xl font-bold text-charcoal">Secure Login</h1>
            <p className="text-gray mt-2">Authentication is currently bypassed for testing.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;