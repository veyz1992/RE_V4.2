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
import type { Benefit, PackageTier, Role, User } from '@/types';

type ProfileMembershipSnapshot = {
  membership_tier: string | null;
  next_billing_date: string | null;
};

const PACKAGE_TIERS: PackageTier[] = [
  'Bronze',
  'Silver',
  'Gold',
  'Founding Member',
  'Platinum',
];

const isValidPackageTier = (
  value: string | null | undefined,
): value is PackageTier => {
  return value !== null && value !== undefined && PACKAGE_TIERS.includes(value as PackageTier);
};

const formatRenewalDate = (input?: string | null): string | undefined => {
  if (!input) {
    return undefined;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const applyMembershipSnapshotToUser = (
  user: User,
  snapshot: ProfileMembershipSnapshot,
): User => {
  if (!snapshot.membership_tier && !snapshot.next_billing_date) {
    return user;
  }

  const membershipTier = isValidPackageTier(snapshot.membership_tier)
    ? snapshot.membership_tier
    : user.plan?.name ?? user.package;

  const formattedRenewal =
    formatRenewalDate(snapshot.next_billing_date) ??
    user.plan?.renewalDate ??
    user.billing?.subscription?.renewalDate;

  const updatedPlan = user.plan
    ? {
        ...user.plan,
        name: membershipTier,
        renewalDate: formattedRenewal ?? user.plan.renewalDate,
      }
    : {
        name: membershipTier,
        billingCycle: 'Billed monthly',
        price: user.plan?.price ?? '$0/month',
        renewalDate: formattedRenewal ?? '',
        rating: user.plan?.rating ?? 'A+',
      };

  const updatedBilling = user.billing
    ? {
        ...user.billing,
        subscription: {
          ...user.billing.subscription,
          planName: membershipTier,
          renewalDate: formattedRenewal ?? user.billing.subscription.renewalDate,
        },
      }
    : user.billing;

  return {
    ...user,
    package: membershipTier,
    plan: updatedPlan,
    billing: updatedBilling,
  };
};

interface AuthContextValue {
  session: Session | null;
  user: SupabaseUser | null;
  isAdmin: boolean;
  loading: boolean;
  isLoading: boolean;
  currentUser: User | null;
  login: (email: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const getMagicLinkRedirectUrl = (): string | undefined => {
  // Use the current origin so this works for both dev and production.
  // App.tsx will route the authenticated user to /member/dashboard or /admin
  // based on the session, so the root URL is enough.
  if (typeof window === 'undefined') return undefined;
  return window.location.origin;
};

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

        let profileSnapshot: ProfileMembershipSnapshot | null = null;
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('membership_tier, next_billing_date')
          .eq('id', user.id)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Failed to load profile membership data', profileError);
        } else if (profileData) {
          profileSnapshot = profileData as ProfileMembershipSnapshot;
        }

        setAuthState((previous) => ({
          ...previous,
          isAdmin: admin,
          loading: false,
        }));

        setCurrentUser((previous) => {
          const baseUser = createAppUserFromSession(
            session,
            admin ? 'admin' : 'member',
            previous,
          );

          if (profileSnapshot) {
            return applyMembershipSnapshotToUser(baseUser, profileSnapshot);
          }

          return baseUser;
        });
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
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : import.meta.env.VITE_APP_BASE_URL ?? "";

    const redirectTo = `${origin}/member/dashboard`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      // Show a member-only message instead of raw error
      throw new Error("We couldn't find a member with that email. Please use the email you joined with.");
    }
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    try {
      // Authenticate with email and password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Check admin privileges
      const { data: adminData, error: adminError } = await supabase
        .from('admin_profiles')
        .select('id, role, is_active')
        .eq('id', authData.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError && adminError.code !== 'PGRST116') {
        await supabase.auth.signOut();
        return { success: false, error: 'Access verification failed' };
      }

      if (!adminData) {
        await supabase.auth.signOut();
        return { success: false, error: 'Access denied. You do not have admin privileges.' };
      }

      return { success: true };
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
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
      adminLogin,
      logout,
      updateUser,
    }),
    [session, user, isAdmin, loading, currentUser, login, adminLogin, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
