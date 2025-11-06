import React, { useState, useCallback, createContext, useContext, useMemo, useEffect } from 'react';
import MemberDashboard from './components/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/EntryPage';
import AssessmentTool from './components/AssessmentTool';
import ResultsPage from './components/ResultsPage';
import { User, Role, ServiceRequest, Answers, ScoreBreakdown } from './types';
import { USERS, SERVICE_REQUESTS } from './lib/mockData';
import { ThemeProvider } from './components/ThemeContext';
import { supabase, isSupabaseConfigured, type Session } from './lib/supabase';

// App Context for State Management
type LoginResult = { mode: 'magicLink' } | { mode: 'mock'; user: User };

interface AppContextType {
  currentUser: User | null;
  session: Session | null;
  isAdmin: boolean;
  isSupabaseReady: boolean;
  isSupabaseEnabled: boolean;
  users: User[];
  serviceRequests: ServiceRequest[];
  login: (role: Role, email?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  addServiceRequest: (request: Omit<ServiceRequest, 'id' | 'status' | 'date' | 'userId' | 'userName' | 'timeline' | 'attachments'>) => void;
  updateServiceRequestStatus: (id: string | number, status: ServiceRequest['status']) => void;
  updateUser: (updatedUser: User) => void;
}

const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

const LoadingScreen: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] text-[var(--text-muted)]">
    <span className="animate-pulse text-lg">Connecting to Supabase...</span>
  </div>
);

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupabaseReady, setIsSupabaseReady] = useState(!isSupabaseConfigured);
  const [users, setUsers] = useState<User[]>(USERS);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(SERVICE_REQUESTS);
  const [location, setLocation] = useState(window.location.hash || '#/');
  const [assessmentResult, setAssessmentResult] = useState<(ScoreBreakdown & { answers: Answers }) | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
        setLocation(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsSupabaseReady(true);
      return;
    }

    let isActive = true;
    setIsSupabaseReady(false);

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isActive) return;
        if (error) {
          console.error('Failed to fetch Supabase session', error);
          setSession(null);
        } else {
          setSession(data.session ?? null);
        }
        setIsSupabaseReady(true);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Unexpected Supabase session error', error);
        setSession(null);
        setIsSupabaseReady(true);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isActive) return;
      setSession(newSession);
    });

    return () => {
      isActive = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    if (!session) {
      setIsAdmin(false);
      return;
    }

    let isMounted = true;

    supabase
      .rpc('is_admin')
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error('Failed to determine admin role', error);
          setIsAdmin(false);
          return;
        }
        setIsAdmin(Boolean(data));
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Unexpected admin role error', error);
        setIsAdmin(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session, isSupabaseConfigured]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    if (!session) {
      setCurrentUser(null);
      return;
    }

    const email = session.user.email?.toLowerCase();
    if (!email) {
      return;
    }

    const roleFromSession: Role = isAdmin ? 'admin' : 'member';

    setUsers((previousUsers) => {
      const existingUser = previousUsers.find((user) => user.email.toLowerCase() === email);

      if (existingUser) {
        if (existingUser.role !== roleFromSession) {
          const updatedUser: User = { ...existingUser, role: roleFromSession };
          setCurrentUser(updatedUser);
          return previousUsers.map((user) => (user.id === existingUser.id ? updatedUser : user));
        }

        setCurrentUser(existingUser);
        return previousUsers;
      }

      const defaultName = session.user.user_metadata?.full_name || session.user.email || 'Member';
      const newUser: User = {
        id: Date.now(),
        name: defaultName,
        email: session.user.email ?? '',
        role: roleFromSession,
        package: 'Bronze',
        profile: {
          contactNumber: '',
          address: '',
          description: '',
        },
        usage: {
          blogPostsUsed: 0,
          blogPostsTotal: 2,
        },
      };

      setCurrentUser(newUser);
      return [newUser, ...previousUsers];
    });
  }, [session, isAdmin, isSupabaseConfigured]);


  const login = useCallback(async (role: Role, email: string = ''): Promise<LoginResult> => {
    if (isSupabaseConfigured && supabase) {
      if (!email) {
        throw new Error('Email is required to send the magic link.');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      return { mode: 'magicLink' };
    }

    const userToLogin = users.find((u) => u.role === role);
    if (userToLogin) {
      setCurrentUser(userToLogin);
      setIsAdmin(role === 'admin');
      window.location.hash = role === 'admin' ? '#/admin/dashboard' : '#/member/dashboard';
      return { mode: 'mock', user: userToLogin };
    }

    throw new Error(`No user with role "${role}" found in mock data.`);
  }, [users]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Failed to sign out from Supabase', error);
      }
      setSession(null);
    }

    setCurrentUser(null);
    setIsAdmin(false);
    if (!['#/assessment', '#/results'].includes(window.location.hash)) {
      window.location.hash = '#/';
    }
  }, []);
  
  const addServiceRequest = useCallback((request: Omit<ServiceRequest, 'id' | 'status' | 'date' | 'userId' | 'userName' | 'timeline' | 'attachments'>) => {
      if (!currentUser) return;
      const newRequest: ServiceRequest = {
          ...request,
          id: `REQ-${Date.now()}`,
          status: 'Open',
          date: new Date().toISOString().split('T')[0],
          userId: currentUser.id,
          userName: currentUser.name,
          timeline: [{ event: 'Request submitted', date: new Date().toISOString().split('T')[0] }],
      };
      setServiceRequests(prev => [newRequest, ...prev]);
  }, [currentUser]);

  const updateServiceRequestStatus = useCallback((id: string | number, status: ServiceRequest['status']) => {
      setServiceRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
        setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  const contextValue = useMemo(() => ({
    currentUser,
    session,
    isAdmin,
    isSupabaseReady,
    isSupabaseEnabled: isSupabaseConfigured,
    users,
    serviceRequests,
    login,
    logout,
    addServiceRequest,
    updateServiceRequestStatus,
    updateUser,
  }), [
    currentUser,
    session,
    isAdmin,
    isSupabaseReady,
    users,
    serviceRequests,
    login,
    logout,
    addServiceRequest,
    updateServiceRequestStatus,
    updateUser,
  ]);

  const handleAssessmentComplete = (result: ScoreBreakdown & { answers: Answers }) => {
    setAssessmentResult(result);
    window.location.hash = '#/results';
  };

  const handleRetakeAssessment = () => {
    setAssessmentResult(null);
    window.location.hash = '#/assessment';
  };

  const handleJoin = () => {
    window.location.hash = '#/';
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
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
  }, [isSupabaseConfigured, session, currentUser, location, isAdmin]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      return;
    }

    if (!currentUser) {
      if (!['#/', '#/assessment', '#/results'].includes(location)) {
        window.location.hash = '#/';
      }
      return;
    }

    const expectedPrefix = currentUser.role === 'admin' ? '#/admin' : '#/member';
    if (!location.startsWith(expectedPrefix)) {
      window.location.hash = currentUser.role === 'admin' ? '#/admin/dashboard' : '#/member/dashboard';
    }
  }, [currentUser, location, isSupabaseConfigured]);

  const renderContent = () => {
    if (location === '#/assessment') {
        return <AssessmentTool onComplete={handleAssessmentComplete} />;
    }

    if (location === '#/results') {
        if (!assessmentResult) {
            window.location.hash = '#/assessment';
            return null; // Redirecting
        }
        return <ResultsPage result={assessmentResult} onRetake={handleRetakeAssessment} onJoin={handleJoin} />;
    }

    if (isSupabaseConfigured) {
      if (!isSupabaseReady) {
        return <LoadingScreen />;
      }

      if (!session || !currentUser) {
        return <LoginPage />;
      }
    } else if (!currentUser) {
      return <LoginPage />;
    }

    if (!currentUser) {
      return <LoginPage />;
    }

    if (currentUser.role === 'admin') {
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
    <AppContext.Provider value={contextValue}>
      <div className="bg-[var(--bg-main)] min-h-screen font-inter">
        {renderContent()}
      </div>
    </AppContext.Provider>
  );
};

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
};


export default App;
