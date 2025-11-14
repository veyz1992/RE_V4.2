import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  PLAN_STORAGE_KEY,
  EMAIL_STORAGE_KEY,
  CHECKOUT_SESSION_STORAGE_KEY,
  normalizePlan,
  type Plan,
} from '../src/shared/config';
import { FUNCTION_ENDPOINTS } from '../src/lib/functions';
import {
  AnimatedCheckmarkIcon,
  UsersIcon,
  NewspaperIcon,
  ListBulletIcon,
  ClipboardDocumentCheckIcon,
  TrophyIcon,
  ShieldCheckIcon,
  UploadIcon,
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
  
  // Safely read session_id to prevent TDZ issues
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const params = new URLSearchParams(search || '');
  const sessionIdFromUrl = params.get('session_id');
  const checkoutStatusFromUrl = params.get('checkout');
  
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

  // All state declarations first to prevent TDZ
  const [sessionId, setSessionId] = useState<string | null>(sessionIdFromUrl);
  const [isLoadingSuccessData, setIsLoadingSuccessData] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [actionState, setActionState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [actionMessage, setActionMessage] = useState<string>('');
  const [cachedEmail, setCachedEmail] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [magicLinkSent, setMagicLinkSent] = useState<boolean>(false);
  const [storedSessionId, setStoredSessionId] = useState<string | null>(null);
  const [metadataSummary, setMetadataSummary] = useState<{
    email: string | null;
    email_entered: string | null;
    full_name_entered: string | null;
    plan: string | null;
  } | null>(null);
  const [checkoutState, setCheckoutState] = useState<'success' | 'cancelled' | null>(() => {
    if (checkoutStatusFromUrl === 'success') return 'success';
    if (checkoutStatusFromUrl === 'cancelled') return 'cancelled';
    return null;
  });

  // State for success summary data
  const [successData, setSuccessData] = useState<{
    success: boolean;
    email: string | null;
    business: string | null;
    name: string | null;
    plan: string | null;
  } | null>(null);

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
  const hasCheckoutSuccessFlag = checkoutState === 'success';

  // Display variables - bind directly to API response
  const displayBusinessName = useMemo(() => {
    if (successData?.business) {
      return successData.business;
    }
    if (metadataSummary?.email_entered) {
      return metadataSummary.email_entered;
    }
    if (sessionId && isLoadingSuccessData) {
      return '—';
    }
    if (metadataSummary?.email) {
      return metadataSummary.email;
    }
    return currentUser?.name || '—';
  }, [successData, metadataSummary, sessionId, isLoadingSuccessData, currentUser?.name]);

  const displayContactName = useMemo(() => {
    if (successData?.name) {
      return successData.name;
    }
    if (metadataSummary?.full_name_entered) {
      return metadataSummary.full_name_entered;
    }
    if (sessionId && isLoadingSuccessData) {
      return '—';
    }
    return currentUser?.account?.ownerName || currentUser?.name || '—';
  }, [successData, metadataSummary, sessionId, isLoadingSuccessData, currentUser?.account?.ownerName, currentUser?.name]);

  // Compute display email based on session_id presence
  const displayEmail = useMemo(() => {
    if (sessionId) {
      return successData?.email || metadataSummary?.email || null;
    }
    return successData?.email || metadataSummary?.email || currentUser?.email || cachedEmail;
  }, [sessionId, successData?.email, metadataSummary?.email, currentUser?.email, cachedEmail]);

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

  // Initialize session_id and clear localStorage if session_id present
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSessionId = urlParams.get('session_id');
      const urlCheckoutStatus = urlParams.get('checkout');

      setSessionId(urlSessionId);
      console.log('[SuccessPage] session_id from URL:', urlSessionId);
      setCheckoutState(() => {
        if (urlCheckoutStatus === 'success') {
          return 'success';
        }
        if (urlCheckoutStatus === 'cancelled') {
          return 'cancelled';
        }
        return null;
      });
      if (urlCheckoutStatus && urlCheckoutStatus !== 'success') {
        console.warn('[SuccessPage] Unexpected checkout status flag:', urlCheckoutStatus);
      }

      if (urlSessionId) {
        // Clear localStorage when session_id is present - we want fresh data
        console.log('[SuccessPage] session_id present - clearing localStorage');
        window.localStorage.removeItem(EMAIL_STORAGE_KEY);
        window.localStorage.removeItem(PLAN_STORAGE_KEY);
        window.localStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
        setCachedEmail('');
        setStoredSessionId(null);
        setMetadataSummary(null);
      } else {
        // Load cached email only when no session_id
        const storedEmail = window.localStorage.getItem(EMAIL_STORAGE_KEY);
        if (storedEmail) {
          setCachedEmail(storedEmail);
        }
        const storedCheckoutSession = window.localStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);
        if (storedCheckoutSession) {
          setStoredSessionId(storedCheckoutSession);
        }
      }
    } catch (error) {
      console.error('[SuccessPage] Error initializing session:', error);
      setActionState('error');
      setActionMessage('Unable to initialize session properly');
    }
  }, []);

  // Fetch success summary data if session_id is provided
  useEffect(() => {
    const fetchSuccessData = async () => {
      if (!sessionId || successData) return;
      
      try {
        setIsLoadingSuccessData(true);
        console.log(`[SuccessPage] Fetching success summary: ${sessionId}`);
        
        const response = await fetch(`${FUNCTION_ENDPOINTS.SUCCESS_SUMMARY}?session_id=${sessionId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('success-summary', data);
          console.log('[SuccessPage] ===== API RESPONSE =====');
          console.log('[SuccessPage] Raw response:', data);
          console.log('[SuccessPage] data.success:', data.success);
          console.log('[SuccessPage] data.email:', data.email);
          console.log('[SuccessPage] data.business:', data.business);
          console.log('[SuccessPage] data.name:', data.name);
          console.log('[SuccessPage] data.plan:', data.plan);
          console.log('[SuccessPage] =======================');
          setSuccessData(data);
          console.log(`[SuccessPage] ✅ Success! Data loaded:`, data);
        } else {
          console.error('[SuccessPage] ❌ Failed to fetch success summary:', response.status, response.statusText);
          // Set fallback data even on error to prevent loading forever
          setSuccessData({
            success: false,
            email: null,
            business: null,
            name: null,
            plan: 'Founding Member'
          });
        }
      } catch (error) {
        console.error('[SuccessPage] ❌ Error fetching success summary:', error);
        // Set fallback data on error
        setSuccessData({
          success: false,
          email: null,
          business: null,
          name: null,
          plan: 'Founding Member'
        });
      } finally {
        setIsLoadingSuccessData(false);
      }
    };
    
    fetchSuccessData();
  }, [sessionId, successData]);

  useEffect(() => {
    if (sessionId || !storedSessionId || metadataSummary) {
      return;
    }

    let isCancelled = false;

    const fetchCheckoutMetadata = async () => {
      try {
        const response = await fetch(`${FUNCTION_ENDPOINTS.STRIPE_SESSION}?session_id=${storedSessionId}`);
        if (!response.ok) {
          console.error('[SuccessPage] ❌ Failed to fetch checkout session metadata:', response.status, response.statusText);
          return;
        }

        const data = await response.json();
        if (isCancelled) return;

        const summary = {
          email: data.email ?? null,
          email_entered: data.email_entered ?? null,
          full_name_entered: data.full_name_entered ?? null,
          plan: data.plan ?? null,
        } as const;

        setMetadataSummary(summary);

        if (!successData) {
          setSuccessData({
            success: true,
            email: summary.email,
            business: summary.email_entered,
            name: summary.full_name_entered,
            plan: summary.plan ?? 'founding-member',
          });
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[SuccessPage] ❌ Error loading checkout metadata:', error);
        }
      }
    };

    fetchCheckoutMetadata();

    return () => {
      isCancelled = true;
    };
  }, [sessionId, storedSessionId, metadataSummary, successData]);

  // Define triggerMagicLink before its first use to prevent TDZ issues
  const triggerMagicLink = async (targetEmail?: string, isManualRetry = false) => {
    // Single-run guard: only call once per page load unless manual retry
    if (magicLinkSent && !isManualRetry) {
      console.log('[SuccessPage] Magic link already sent on this page load, skipping automatic send');
      return;
    }

    // Determine the email to use based on context
    let emailToUse = targetEmail;
    
    if (sessionId) {
      // If session_id present: only use success data email, never cached
      emailToUse = successData?.email || null;
      if (!emailToUse && !isLoadingSuccessData) {
        setActionState('error');
        setActionMessage('We\'re still loading your account information. Please wait a moment.');
        return;
      }
    } else {
      // If session_id missing: use provided email or fallback hierarchy
      emailToUse = targetEmail || currentUser?.email || cachedEmail;
    }
    
    if (!emailToUse) {
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
        email: emailToUse,
        options: { 
          emailRedirectTo: `${window.location.origin}/auth/callback` 
        }
      });

      if (error) {
        if (error.message.includes('redirect_to not allowed')) {
          setActionState('error');
          setActionMessage('⚠️ Dev Configuration: Please add this domain to Supabase Auth → URL Configuration → Redirect URLs');
          console.error('Supabase Auth redirect URL not configured:', `${window.location.origin}/auth/callback`);
        } else if (error.message.includes('rate') || error.message.includes('429')) {
          setActionState('error');
          setActionMessage('Too many requests, please wait a minute');
          setResendCooldown(60);
        } else {
          setActionState('error');
          setActionMessage(error.message);
        }
        console.error('Magic link error:', error);
        return;
      }

      setActionState('sent');
      setActionMessage(`Magic link sent to ${emailToUse}. Check your inbox and Spam/Promotions folder if you don't see it.`);
      setResendCooldown(60); // Start 60-second cooldown
      setMagicLinkSent(true); // Mark as sent to prevent automatic retries
      
      // Update localStorage only if we're not in session mode and email changed
      if (typeof window !== 'undefined' && !sessionId) {
        window.localStorage.setItem(EMAIL_STORAGE_KEY, emailToUse);
        setCachedEmail(emailToUse);
      }
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
      if (sessionId) {
        if (!hasCheckoutSuccessFlag) {
          console.warn('[SuccessPage] Checkout flag did not indicate success – postponing magic link send.');
          return;
        }
        // If session_id present: only trigger after successData is loaded
        if (successData?.email && actionState === 'idle') {
          triggerMagicLink();
        }
      } else {
        // If session_id missing: use fallback behavior
        const urlParams = new URLSearchParams(window.location.search);
        const emailFromUrl = urlParams.get('email');
        const targetEmail = emailFromUrl || cachedEmail || displayEmail;
        
        if (targetEmail && actionState === 'idle') {
          triggerMagicLink(targetEmail);
        }
      }
    } catch (error) {
      console.error('Error in magic link auto-trigger:', error);
    }
  }, [sessionId, successData?.email, cachedEmail, displayEmail, actionState, hasCheckoutSuccessFlag]); // eslint-disable-line react-hooks/exhaustive-deps

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
              📧 Sent to: <strong>
                {sessionId ? (
                  displayEmail || (isLoadingSuccessData ? 'checking...' : 
                    (successData?.success === false ? 'We couldn\'t load your data yet. Please contact support.' : 'We\'re preparing your access email...'))
                ) : sessionId === null ? (
                  <span className="text-yellow-400">Missing session id</span>
                ) : (
                  displayEmail || 'checking...'
                )}
              </strong>
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
                  onClick={() => triggerMagicLink(undefined, true)} 
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

        <div className="mt-16 text-center text-gray-300">
          <div className="w-full max-w-md mx-auto p-6 rounded-2xl shadow-xl fm-glass-card border border-gold/20">
            <h3 className="font-bold text-lg text-white mb-3">Need Help?</h3>
            <p className="text-sm text-gray-300 mb-4">
              Our support team is here to help you get started with your new membership.
            </p>
            <a 
              href="mailto:hi@restorationexpertise.com" 
              className="inline-block px-6 py-3 rounded-lg bg-gold text-charcoal font-semibold hover:bg-gold-light transition-colors"
            >
              Contact Support
            </a>
          </div>
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
