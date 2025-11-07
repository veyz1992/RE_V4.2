import React, {
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useEffect,
} from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import MemberDashboard from './components/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/LoginPage';
import AssessmentTool from './components/AssessmentTool';
import ResultsPage from './components/ResultsPage';
import { ThemeProvider } from './components/ThemeContext';
import { supabase } from '@/lib/supabase';
import {
  User,
  Role,
  Answers,
  ScoreBreakdown,
  StoredAssessmentResult,
  Benefit,
} from './types';

interface AuthContextValue {
  session: Session | null;
  user: SupabaseUser | null;
  isLoading: boolean;
  currentUser: User | null;
  isAdmin: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const LoadingScreen: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] text-[var(--text-muted)]">
    <span className="animate-pulse text-lg">Connecting to Supabase...</span>
  </div>
);

const BASE_BENEFITS: Benefit[] = [
  {
    title: 'SEO Blog Posts',
    description: "Professionally written articles to boost your site's search engine ranking.",
    icon: 'NewspaperIcon',
    quota: 2,
    used: 1,
  },
  {
    title: 'Quarterly Website Review',
    description: 'Our experts will review your site for SEO and conversion improvements.',
    icon: 'ChartBarIcon',
    nextDate: 'August 15, 2024',
  },
  {
    title: 'Trust Badge & Network Listing',
    description: 'Display your verified status and get listed in our trusted network.',
    icon: 'ShieldCheckIcon',
    status: 'Active',
  },
  {
    title: 'Priority Support',
    description: 'Get faster response times from our dedicated member support team.',
    icon: 'ChatBubbleOvalLeftEllipsisIcon',
    isIncluded: true,
  },
];

const createAppUserFromSession = (
  session: Session,
  role: Role,
  previous?: User | null,
): User => {
  const email = session.user.email ?? '';
  const displayName =
    (session.user.user_metadata?.full_name as string | undefined) ||
    email ||
    'Member';

  const existing = previous && previous.email === email ? previous : null;

  return {
    id: existing?.id ?? Date.now(),
    name: displayName,
    email,
    role,
    package: existing?.package ?? 'Gold',
    profile:
      existing?.profile ?? {
        contactNumber: '',
        address: '',
        description: '',
        dbaName: '',
        yearsInBusiness: undefined,
        websiteUrl: '',
        logoUrl: '',
        serviceAreas: [],
        specialties: [],
        socialLinks: {},
      },
    usage: existing?.usage ?? {
      blogPostsUsed: 1,
      blogPostsTotal: 2,
    },
    plan:
      existing?.plan ?? {
        name: 'Gold',
        billingCycle: 'Billed annually',
        price: '$229/month',
        renewalDate: 'Mar 15, 2025',
        rating: 'A+',
      },
    benefits: existing?.benefits ?? BASE_BENEFITS.map((benefit) => ({ ...benefit })),
    billing:
      existing?.billing ?? {
        subscription: {
          planName: 'Gold',
          price: '$229 / month',
          billingCycle: 'Monthly',
          status: 'Active',
          renewalDate: 'Mar 15, 2025',
          startedAt: 'Oct 1, 2024',
        },
        paymentMethod: {
          brand: 'Visa',
          last4: '4242',
          expiry: '04 / 27',
          cardholder: displayName,
        },
        invoices: [],
      },
    account:
      existing?.account ?? {
        ownerName: displayName,
        ownerEmail: email,
        role: role === 'admin' ? 'Administrator' : 'Owner',
        companyName: '',
      },
    notifications:
      existing?.notifications ?? {
        documentStatus: true,
        verificationStatus: true,
        requestUpdates: true,
        benefitDelivery: true,
        billingUpdates: true,
        communityUpdates: true,
        emailFrequency: 'real-time',
      },
  };
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initialiseSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (error) {
        console.error('Failed to fetch Supabase session', error);
        setSession(null);
      } else {
        setSession(data.session ?? null);
      }
      setIsLoading(false);
    };

    initialiseSession().catch((error) => {
      if (!isMounted) {
        return;
      }
      console.error('Unexpected Supabase session error', error);
      setSession(null);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (!isMounted) {
        return;
      }
      setSession(newSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setCurrentUser(null);
      setIsAdmin(false);
      return;
    }

    let isMounted = true;

    const determineAdminStatus = async () => {
      let admin = false;

      try {
        const { data, error } = await supabase
          .from('admin_profiles')
          .select('is_admin')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to determine admin status', error);
        }

        if (data) {
          admin = data.is_admin === undefined ? true : data.is_admin === true;
        }
      } catch (error) {
        console.error('Unexpected error determining admin status', error);
      }

      if (!isMounted) {
        return;
      }

      setIsAdmin(admin);
      setCurrentUser((previous) =>
        createAppUserFromSession(session, admin ? 'admin' : 'member', previous),
      );
    };

    determineAdminStatus().catch((error) => {
      if (!isMounted) {
        return;
      }
      console.error('Unexpected admin status resolution error', error);
      setIsAdmin(false);
      setCurrentUser((previous) =>
        createAppUserFromSession(session, 'member', previous),
      );
    });

    return () => {
      isMounted = false;
    };
  }, [session]);

  const login = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Failed to sign out from Supabase', error);
    }
    setSession(null);
    setCurrentUser(null);
    setIsAdmin(false);
    if (!['#/assessment', '#/results'].includes(window.location.hash)) {
      window.location.hash = '#/';
    }
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      currentUser,
      isAdmin,
      login,
      logout,
      updateUser,
    }),
    [
      session,
      isLoading,
      currentUser,
      isAdmin,
      login,
      logout,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const AppContent: React.FC = () => {
  const { session, currentUser, isAdmin, isLoading } = useAuth();
  const [location, setLocation] = useState<string>(window.location.hash || '#/');
  const [assessmentResult, setAssessmentResult] = useState<
    StoredAssessmentResult | null
  >(null);
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setLocation(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!session || !currentUser) {
      if (!['#/', '#/assessment', '#/results'].includes(location)) {
        window.location.hash = '#/';
      }
      return;
    }

    const expectedPrefix = isAdmin ? '#/admin' : '#/member';
    if (!location.startsWith(expectedPrefix)) {
      window.location.hash = isAdmin ? '#/admin/dashboard' : '#/member/dashboard';
    }
  }, [session, currentUser, location, isAdmin, isLoading]);

  const determineMembershipTier = (
    grade: ScoreBreakdown['grade'],
    isEligible: boolean,
  ) => {
    if (isEligible) {
      return 'Founding Member';
    }

    switch (grade) {
      case 'A+':
      case 'A':
        return 'Gold';
      case 'B+':
        return 'Silver';
      default:
        return 'Bronze';
    }
  };

  const handleAssessmentComplete = async (
    result: ScoreBreakdown & { answers: Answers },
  ) => {
    if (isSavingAssessment) {
      return;
    }

    const scenario = result.isEligibleForCertification
      ? 'eligible'
      : 'not_eligible';
    const intendedMembershipTier = determineMembershipTier(
      result.grade,
      result.isEligibleForCertification,
    );

    let emailEntered: string | null =
      session?.user?.email ?? currentUser?.email ?? null;

    if (!session) {
      emailEntered = emailEntered?.trim() || null;
      if (!emailEntered) {
        const promptValue = window
          .prompt('Where should we send your assessment results?')
          ?.trim();

        if (!promptValue) {
          alert('Please enter an email address to receive your results.');
          return;
        }

        emailEntered = promptValue;
      }
    }

    setIsSavingAssessment(true);

    try {
      const { data, error } = await supabase
        .from('assessments')
        .insert({
          user_id: session?.user?.id ?? null,
          email_entered: emailEntered,
          answers: result.answers,
          total_score: result.total,
          operational_score: result.operational,
          licensing_score: result.licensing,
          feedback_score: result.feedback,
          certifications_score: result.certifications,
          digital_score: result.digital,
          scenario,
          pci_rating: result.grade,
          intended_membership_tier: intendedMembershipTier,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      type SupabaseAssessmentRow = {
        id?: number | string;
        created_at?: string;
        user_id?: string | null;
        email_entered?: string | null;
        answers?: Answers;
        total_score?: number;
        operational_score?: number;
        licensing_score?: number;
        feedback_score?: number;
        certifications_score?: number;
        digital_score?: number;
        scenario?: string | null;
        pci_rating?: string | null;
        intended_membership_tier?: string | null;
      };

      const row = data as SupabaseAssessmentRow;

      const storedResult: StoredAssessmentResult = {
        ...result,
        answers: (row.answers as Answers) ?? result.answers,
        operational: row.operational_score ?? result.operational,
        licensing: row.licensing_score ?? result.licensing,
        feedback: row.feedback_score ?? result.feedback,
        certifications: row.certifications_score ?? result.certifications,
        digital: row.digital_score ?? result.digital,
        total: row.total_score ?? result.total,
        grade:
          (row.pci_rating as ScoreBreakdown['grade']) ?? result.grade,
        isEligibleForCertification: row.scenario
          ? row.scenario === 'eligible'
          : result.isEligibleForCertification,
        scenario: row.scenario ?? scenario,
        pciRating: row.pci_rating ?? result.grade,
        intendedMembershipTier:
          row.intended_membership_tier ?? intendedMembershipTier,
        id: row.id,
        createdAt: row.created_at,
        userId: row.user_id ?? session?.user?.id ?? null,
        emailEntered: row.email_entered ?? emailEntered,
      };

      setAssessmentResult(storedResult);
      window.location.hash = '#/results';
    } catch (err) {
      console.error('Failed to save assessment result', err);
      alert('We had trouble saving your assessment. Please try again.');
    } finally {
      setIsSavingAssessment(false);
    }
  };

  const handleRetakeAssessment = () => {
    setAssessmentResult(null);
    window.location.hash = '#/assessment';
  };

  const handleJoin = () => {
    window.location.hash = '#/';
  };

  const renderContent = () => {
    if (location === '#/assessment') {
      return <AssessmentTool onComplete={handleAssessmentComplete} />;
    }

    if (location === '#/results') {
      if (!assessmentResult) {
        window.location.hash = '#/assessment';
        return null;
      }
      return (
        <ResultsPage
          result={assessmentResult}
          onRetake={handleRetakeAssessment}
          onJoin={handleJoin}
        />
      );
    }

    if (isLoading) {
      return <LoadingScreen />;
    }

    if (!session || !currentUser) {
      return <LoginPage />;
    }

    if (isAdmin) {
      if (location.startsWith('#/admin')) {
        return <AdminDashboard />;
      }
      return null;
    }

    if (currentUser.role === 'member') {
      if (location.startsWith('#/member')) {
        return <MemberDashboard />;
      }
      return null;
    }

    return <LoginPage />;
  };

  return (
    <div className="bg-[var(--bg-main)] min-h-screen font-inter">
      {renderContent()}
    </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </ThemeProvider>
);

export default App;
