import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Benefit, Role, User } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: SupabaseUser | null;
  isAdmin: boolean;
  loading: boolean;
  isLoading: boolean;
  currentUser: User | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

type AuthState = {
  session: Session | null;
  user: SupabaseUser | null;
  isAdmin: boolean;
  loading: boolean;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isAdmin: false,
    loading: true,
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const { session, user, isAdmin, loading } = authState;

  useEffect(() => {
    let isMounted = true;

    const initialiseSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (error) {
        console.error('Failed to fetch Supabase session', error);
        setAuthState({
          session: null,
          user: null,
          isAdmin: false,
          loading: false,
        });
        return;
      }

      setAuthState((previous) => ({
        ...previous,
        session: data.session ?? null,
        user: data.session?.user ?? null,
        loading: data.session ? true : false,
      }));
    };

    initialiseSession().catch((error) => {
      if (!isMounted) {
        return;
      }
      console.error('Unexpected Supabase session error', error);
      setAuthState({
        session: null,
        user: null,
        isAdmin: false,
        loading: false,
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) {
        return;
      }

      setAuthState({
        session: newSession ?? null,
        user: newSession?.user ?? null,
        isAdmin: false,
        loading: newSession !== null,
      });
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !user) {
      setCurrentUser(null);
      setAuthState((previous) => ({
        ...previous,
        isAdmin: false,
        loading: false,
      }));
      return;
    }

    let isMounted = true;
    setAuthState((previous) => ({ ...previous, loading: true }));

    const determineAdminStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_profiles')
          .select('id')
          .eq('id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to determine admin status', error);
        }

        const admin = !!data;

        setAuthState((previous) => ({
          ...previous,
          isAdmin: admin,
          loading: false,
        }));

        setCurrentUser((previous) =>
          createAppUserFromSession(session, admin ? 'admin' : 'member', previous),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error('Unexpected error determining admin status', error);

        setAuthState((previous) => ({
          ...previous,
          isAdmin: false,
          loading: false,
        }));

        setCurrentUser((previous) =>
          createAppUserFromSession(session, 'member', previous),
        );
      }
    };

    determineAdminStatus().catch((error) => {
      if (!isMounted) {
        return;
      }
      console.error('Unexpected admin status resolution error', error);
      setAuthState((previous) => ({
        ...previous,
        isAdmin: false,
        loading: false,
      }));
      setCurrentUser((previous) => createAppUserFromSession(session, 'member', previous));
    });

    return () => {
      isMounted = false;
    };
  }, [session, user]);

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
    setAuthState({
      session: null,
      user: null,
      isAdmin: false,
      loading: false,
    });
    setCurrentUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      isAdmin,
      loading,
      isLoading: loading,
      currentUser,
      login,
      logout,
      updateUser,
    }),
    [session, user, isAdmin, loading, currentUser, login, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
