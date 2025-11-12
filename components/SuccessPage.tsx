import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PLAN_STORAGE_KEY, EMAIL_STORAGE_KEY, normalizePlan, type Plan } from '../src/shared/config';
import {
  AnimatedCheckmarkIcon,
  UsersIcon,
  UserCircleIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  NewspaperIcon,
  ListBulletIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ClipboardDocumentCheckIcon,
  LightBulbIcon,
  TrophyIcon,
  ShieldCheckIcon,
  UploadIcon,
  PhoneIcon,
} from './icons';


type PlanDetails = {
  badgeText: string;
  badgeClass: string;
  ratingText: string;
  benefits: { icon: React.FC<{ className?: string }>; title: string; description: string }[];
};

const planDetails: Record<Plan, PlanDetails> = {
  bronze: {
    badgeText: 'Bronze Member',
    badgeClass: 'bg-yellow-900/50 text-[#CD7F32] border border-[#CD7F32]/50',
    ratingText: 'B+ Restoration Professional',
    benefits: [
      { icon: UploadIcon, title: 'Upload Your Documents', description: 'Submit required documents for account verification and badge approval.' },
      { icon: UsersIcon, title: 'Join the Community', description: 'Access our private community for networking and support.' },
      { icon: ShieldCheckIcon, title: 'Claim Your Badge', description: 'Download your verified badge once your account is approved.' },
      { icon: ListBulletIcon, title: 'Explore Resources', description: 'Check out the member resources to get started.' },
    ],
  },
  silver: {
    badgeText: 'Silver Member',
    badgeClass: 'bg-gray-500/50 text-[#C0C0C0] border border-[#C0C0C0]/50',
    ratingText: 'A- Restoration Specialist',
    benefits: [
      { icon: UploadIcon, title: 'Upload Your Documents', description: 'Submit required documents for account verification and badge approval.' },
      { icon: UsersIcon, title: "Join the Community", description: 'Access our private community for networking and support.' },
      { icon: ShieldCheckIcon, title: 'Claim Your Enhanced Badge', description: 'Download your verified badge once your account is approved.' },
      { icon: NewspaperIcon, title: 'Explore Premium Resources', description: 'Access the resource library and request your first SEO post.' },
    ],
  },
  gold: {
    badgeText: 'Gold Member',
    badgeClass: 'bg-gold/30 text-gold-light border border-gold/50',
    ratingText: 'A Elite Restoration Expert',
    benefits: [
      { icon: UploadIcon, title: 'Upload Your Documents', description: 'Submit required documents for account verification and badge approval.' },
      { icon: UsersIcon, title: "Join the Member's Circle", description: 'Get access to our exclusive circle for Gold members.' },
      { icon: ShieldCheckIcon, title: 'Claim Your Premium Badge', description: 'Download your verified badge once your account is approved.' },
      { icon: ClipboardDocumentCheckIcon, title: 'Access the 99-Steps Blueprint', description: 'Start your journey to mastery with our exclusive blueprint dashboard.' },
    ],
  },
  'founding-member': {
    badgeText: '⭐ Founding Member',
    badgeClass: 'fm-metallic-shine !text-transparent !bg-clip-text',
    ratingText: 'A+ Founding Elite - Restoration Pioneer',
    benefits: [
      { icon: UploadIcon, title: 'Upload Your Documents', description: 'Submit required documents for account verification and badge approval.' },
      { icon: UsersIcon, title: "Join the Founder's Circle", description: 'Access our private community for direct communication and networking.' },
      { icon: ShieldCheckIcon, title: 'Claim Your Exclusive Badge', description: 'Download your verified badge once your account is approved.' },
      { icon: TrophyIcon, title: 'Explore Premium Resources', description: 'Access lifetime tools, exclusive content, and early feature releases.' },
    ],
  },
};


const ParticleEffects: React.FC = () => (
  <div className="success-particles">
    {Array.from({ length: 30 }).map((_, i) => (
      <div
        key={i}
        className="success-particle"
        style={{
          left: `${Math.random() * 100}%`,
          width: `${Math.random() * 3 + 1}px`,
          height: `${Math.random() * 3 + 1}px`,
          animationDelay: `${Math.random() * 20}s`,
          animationDuration: `${Math.random() * 15 + 10}s`,
        }}
      />
    ))}
  </div>
);

const SuccessPage: React.FC = () => {
  const { plan: planSlug } = useParams<{ plan: string }>();
  const navigate = useNavigate();
  
  // Safe param access with defaults
  const plan = planSlug ?? 'founding-member';
  
  // Safely access auth context with fallback
  let currentUser: any = null;
  let login: any = null;
  try {
    const auth = useAuth();
    currentUser = auth.currentUser;
    login = auth.login;
  } catch (error) {
    console.warn('Auth context not available:', error);
  }

  // State for email from Stripe session
  const [stripeEmail, setStripeEmail] = useState<string>('');

  const resolvedPlan = useMemo(() => {
    try {
      return normalizePlan(plan);
    } catch (error) {
      console.error('Error normalizing plan:', error);
      return 'founding-member';
    }
  }, [plan]);
  
  const planConfig = planDetails[resolvedPlan];
  const isFounding = resolvedPlan === 'founding-member';

  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [actionState, setActionState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [actionMessage, setActionMessage] = useState<string>('');
  const [cachedEmail, setCachedEmail] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Move display variables above their first use to prevent TDZ issues
  const displayBusinessName = currentUser?.name ?? 'Your Business';
  const displayContactName = currentUser?.account?.ownerName ?? currentUser?.name ?? 'Your Name';
  const displayEmail = stripeEmail || currentUser?.email || cachedEmail;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedPlan = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!planSlug && storedPlan) {
      const redirectPlan = normalizePlan(storedPlan);
      navigate(`/success/${redirectPlan}`, { replace: true });
      return;
    }
    window.localStorage.removeItem(PLAN_STORAGE_KEY);
  }, [navigate, planSlug]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY);
    if (storedEmail) {
      setCachedEmail(storedEmail);
    }
  }, []);

  // Fetch email from Stripe session if session_id is provided
  useEffect(() => {
    const fetchStripeSessionEmail = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        
        if (sessionId && !stripeEmail) {
          console.log(`Fetching email from Stripe session: ${sessionId}`);
          
          const response = await fetch(`/.netlify/functions/get-stripe-session?session_id=${sessionId}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.email) {
              setStripeEmail(data.email);
              console.log(`Success page email from Stripe: ${data.email}`);
            }
          } else {
            console.error('Failed to fetch session email:', response.statusText);
          }
        }
      } catch (error) {
        console.error('Error fetching Stripe session email:', error);
      }
    };
    
    fetchStripeSessionEmail();
  }, [stripeEmail]);

  // Define triggerMagicLink before its first use to prevent TDZ issues
  const triggerMagicLink = async (targetEmail: string) => {
    if (!targetEmail) {
      setActionState('error');
      setActionMessage('Please provide an email address to resend your login link.');
      return;
    }

    if (resendCooldown > 0) {
      setActionState('error');
      setActionMessage(`Please wait ${resendCooldown} seconds before resending.`);
      return;
    }

    try {
      setActionState('sending');
      setActionMessage('Sending a fresh magic link…');
      
      // Check if supabase is available
      if (!supabase || !supabase.auth) {
        throw new Error('Supabase client not available');
      }
      
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: { 
          emailRedirectTo: `${window.location.origin}/auth/callback` 
        }
      });

      if (error) {
        if (error.message.includes('redirect_to not allowed')) {
          setActionState('error');
          setActionMessage('⚠️ Dev Configuration: Please add this domain to Supabase Auth → URL Configuration → Redirect URLs');
          console.error('Supabase Auth redirect URL not configured:', `${window.location.origin}/auth/callback`);
        } else if (error.message.includes('rate')) {
          setActionState('error');
          setActionMessage('Rate limit reached. Please wait a moment before trying again.');
          setResendCooldown(60);
        } else {
          setActionState('error');
          setActionMessage(error.message);
        }
        console.error('Magic link error:', error);
        return;
      }

      setActionState('sent');
      setActionMessage(`Magic link sent to ${targetEmail}. Check your inbox and Spam/Promotions folder if you don't see it.`);
      setResendCooldown(60); // Start 60-second cooldown
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(EMAIL_STORAGE_KEY, targetEmail);
      }
      setCachedEmail(targetEmail);
    } catch (error) {
      setActionState('error');
      const message = error instanceof Error ? error.message : 'Unable to send a magic link right now. Please try again later.';
      setActionMessage(message);
      console.error('Magic link error:', error);
    }
  };

  // Automatically send magic link on mount if we have an email
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const emailFromUrl = urlParams.get('email');
      const targetEmail = emailFromUrl || cachedEmail || displayEmail;
      
      if (targetEmail && actionState === 'idle') {
        // Automatically trigger magic link on first load
        triggerMagicLink(targetEmail);
      }
    } catch (error) {
      console.error('Error in magic link auto-trigger:', error);
    }
  }, [cachedEmail, displayEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.dataset.plan = resolvedPlan;
    return () => {
      delete document.body.dataset.plan;
    };
  }, [resolvedPlan]);

  // Start cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const handleUpdateEmail = async () => {
    if (!newEmail) {
      setActionState('error');
      setActionMessage('Enter the new email address you would like to use.');
      return;
    }
    await triggerMagicLink(newEmail.trim());
    setIsUpdatingEmail(false);
    setNewEmail('');
  };

  const title = 'Welcome to the Biggest Restoration Community Homeowners Trust';

  // Minimal fallback content for critical errors
  const renderFallbackContent = (error?: string) => (
    <div className="success-page-container">
      <main className="relative z-10 w-full max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="font-bold text-2xl md:text-3xl max-w-2xl mx-auto text-white">
            Welcome to the Biggest Restoration Community Homeowners Trust
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-300">
            Your payment was successful. You're officially a member!
          </p>
        </div>
        
        <div className="mb-8">
          <div className="w-full max-w-xl mx-auto p-6 rounded-2xl shadow-xl bg-black/20 border border-white/20">
            <h2 className="font-bold text-xl text-white mb-3">Check Your Email to Log In</h2>
            <p className="text-gray-300 mb-4">
              We've sent a magic login link to your email. Please check your inbox and click the link to access your account.
            </p>
            <div className="text-center">
              <a 
                href="/login" 
                className="inline-block px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Go to Login Page
              </a>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-300">
          <p>
            Need help? <a className="text-blue-400 hover:underline" href="mailto:support@restorationexpertise.com">Contact support</a>
          </p>
          {error && (
            <div className="mt-4 p-3 bg-red-900/50 text-red-200 text-sm rounded border border-red-500/50">
              Debug: {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );

  try {
    return (
      <div className="success-page-container">
        <ParticleEffects />
        {isFounding && <div className="fm-light-ray"></div>}
        <main className="relative z-10 w-full max-w-4xl mx-auto animate-fade-in-up">
        <div className="mb-8">
          <AnimatedCheckmarkIcon className="text-gold" />
          {isFounding ? (
            <h1 className="font-playfair text-2xl md:text-3xl font-bold max-w-2xl mx-auto fm-h1">
              {title.split('').map((char, i) => (
                <span key={i} className="fm-metallic-shine" style={{ animationDelay: `${0.5 + i * 0.02}s`, transform: 'translateY(20px)' }}>
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
            </h1>
          ) : (
            <h1 className="font-playfair text-2xl md:text-3xl font-bold max-w-2xl mx-auto text-white">{title}</h1>
          )}
          <p className="mt-4 text-lg md:text-xl text-gray-300">
            Your payment was successful. You're officially a member!
          </p>
        </div>

        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '1.2s' }}>
          <div className="w-full max-w-xl mx-auto p-6 rounded-2xl shadow-xl fm-glass-card border border-gold/20">
            <h2 className="font-bold text-lg text-white mb-4">✓ Your Plan Summary</h2>
            <div className="space-y-2 text-left text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Plan:</span> <span className={`font-semibold ${isFounding ? 'fm-metallic-shine !text-transparent !bg-clip-text' : 'text-white'}`}>{planConfig.badgeText}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Rating:</span> <span className="font-semibold text-white">{planConfig.ratingText}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Business:</span> <span className="font-semibold text-white">{displayBusinessName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Contact:</span> <span className="font-semibold text-white">{displayContactName}</span></div>
            </div>
          </div>
        </div>

        <div className="mb-16 animate-fade-in-up" style={{ animationDelay: '1.4s' }}>
          <div className="w-full max-w-xl mx-auto p-6 md:p-8 rounded-2xl shadow-xl fm-glass-card border border-gold/20">
            <h2 className="font-bold text-xl text-white mb-3">Check Your Email to Log In</h2>
            <p className="text-gray-300">
              We've sent a magic login link to your personal dashboard. Please check your inbox and click the link to access your account.
            </p>
            <div className="mt-4 bg-black/20 p-3 rounded-lg text-center text-white">
              📧 Sent to: <strong>{displayEmail || 'your email'}</strong>
            </div>

            {isUpdatingEmail ? (
              <div className="mt-4 space-y-2 animate-fade-in">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  className="w-full p-2 rounded bg-white/10 text-white border border-gray-500 focus:ring-gold focus:border-gold"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsUpdatingEmail(false)} className="py-1 px-3 text-xs rounded bg-gray-600 hover:bg-gray-500 text-white">
                    Cancel
                  </button>
                  <button onClick={handleUpdateEmail} className="py-1 px-3 text-xs rounded bg-gold text-charcoal font-semibold hover:bg-gold-light">
                    Update Email
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-center text-sm space-x-4">
                <button onClick={() => setIsUpdatingEmail(true)} className="font-semibold text-gray-400 hover:text-white hover:underline">
                  Wrong email? Update it here
                </button>
                <button 
                  onClick={() => triggerMagicLink(displayEmail)} 
                  disabled={resendCooldown > 0}
                  className={`font-semibold ${resendCooldown > 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:underline'}`}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend login link'}
                </button>
              </div>
            )}

            {actionState !== 'idle' && (
              <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${actionState === 'sent' ? 'border-success/40 bg-success/10 text-success' : actionState === 'error' ? 'border-error/40 bg-error/10 text-error' : 'border-white/30 bg-white/10 text-white'}`}>
                {actionMessage}
              </div>
            )}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="font-playfair text-3xl font-bold mb-8 text-white">What's Next?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-in">
            {planConfig.benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="p-6 rounded-2xl shadow-lg transition-transform transform hover:-translate-y-1 fm-glass-card" style={{ animationDelay: `${1.6 + i * 0.15}s` }}>
                  <div className="inline-block p-3 rounded-full mb-4 bg-white/10 text-gold">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-white">{benefit.title}</h3>
                  <p className="text-sm text-gray-300">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="font-playfair text-3xl font-bold mb-6 text-white">Need a Quick Start?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="fm-glass-card p-6 rounded-2xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <UserCircleIcon className="w-10 h-10 text-gold" />
                <div>
                  <h3 className="font-semibold">Complete Your Profile</h3>
                  <p className="text-sm text-gray-300">Upload your logo, service areas, and certifications.</p>
                </div>
              </div>
              <button onClick={() => navigate('/login')} className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold">
                Go to login
              </button>
            </div>
            <div className="fm-glass-card p-6 rounded-2xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <ArrowDownTrayIcon className="w-10 h-10 text-gold" />
                <div>
                  <h3 className="font-semibold">Download Your Badge</h3>
                  <p className="text-sm text-gray-300">Showcase your verified status across your channels.</p>
                </div>
              </div>
              <button onClick={() => navigate('/login')} className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold">
                Access badge library
              </button>
            </div>
            <div className="fm-glass-card p-6 rounded-2xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <PhoneIcon className="w-10 h-10 text-gold" />
                <div>
                  <h3 className="font-semibold">Schedule Onboarding</h3>
                  <p className="text-sm text-gray-300">Book time with our team to map your first 30 days.</p>
                </div>
              </div>
              <button onClick={() => window.open('mailto:support@restorationexpertise.com', '_blank')} className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold">
                Email support
              </button>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center space-y-4 text-gray-300">
          <div className="flex flex-col items-center gap-3 md:flex-row md:justify-center">
            <div className="flex items-center gap-3">
              <PencilSquareIcon className="w-6 h-6 text-gold" />
              <span>Finish your onboarding checklist inside the dashboard.</span>
            </div>
            <div className="flex items-center gap-3">
              <ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6 text-gold" />
              <span>Join the private member community for weekly live sessions.</span>
            </div>
            <div className="flex items-center gap-3">
              <LightBulbIcon className="w-6 h-6 text-gold" />
              <span>Track your credibility goals with the 99-Step Blueprint.</span>
            </div>
          </div>
          <p className="text-sm">
            Need help? <a className="text-gold hover:underline" href="mailto:support@restorationexpertise.com">Contact support</a>
          </p>
        </div>
      </main>
    </div>
    );
  } catch (error) {
    console.error('Critical error in SuccessPage:', error);
    return renderFallbackContent(error instanceof Error ? error.message : 'Unknown rendering error');
  }
};

export default SuccessPage;
