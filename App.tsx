import React, {
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useEffect,
} from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

import MemberDashboard, { MemberView } from './components/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/EntryPage';
import AssessmentTool from './components/AssessmentTool';
import ResultsPage from './components/ResultsPage';
import { User, Role, ServiceRequest, Answers, ScoreBreakdown } from './types';
import { USERS, SERVICE_REQUESTS } from './lib/mockData';
import { ThemeProvider } from './components/ThemeContext';
import supabase from './src/lib/supabaseClient';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  serviceRequests: ServiceRequest[];
  login: (role: Role, email?: string) => void;
  logout: () => void;
  addServiceRequest: (
    request: Omit<
      ServiceRequest,
      'id' | 'status' | 'date' | 'userId' | 'userName' | 'timeline' | 'attachments'
    >,
  ) => void;
  updateServiceRequestStatus: (
    id: string | number,
    status: ServiceRequest['status'],
  ) => void;
  updateUser: (updatedUser: User) => void;
  session: Session | null;
  authLoading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const OnboardingPage: React.FC = () => (
  <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex items-center justify-center p-8">
    <div className="max-w-2xl text-center space-y-6">
      <h1 className="font-playfair text-4xl font-bold">Join Restoration Expertise</h1>
      <p className="text-lg text-[var(--text-muted)]">
        We&apos;re preparing a streamlined onboarding experience for new members.
        In the meantime, a member of our team will guide you through the
        verification and setup process.
      </p>
      <p className="text-[var(--text-muted)]">
        Have questions? Reach out to <a className="text-[var(--accent)]" href="mailto:team@restorationexpertise.com">team@restorationexpertise.com</a> and
        we&apos;ll be happy to help.
      </p>
    </div>
  </div>
);

const AppStateProvider: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(USERS);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(
    SERVICE_REQUESTS,
  );
  const [assessmentResult, setAssessmentResult] = useState<
    (ScoreBreakdown & { answers: Answers }) | null
  >(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching initial session', error.message);
        }
        if (isMounted) {
          setSession(data?.session ?? null);
          setAuthLoading(false);
        }
      } catch (err) {
        console.error('Unexpected error fetching session', err);
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
        setAuthLoading(false);
      }
    },
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    (role: Role, email: string = '') => {
      const userToLogin = users.find((u) => u.role === role);
      if (userToLogin) {
        setCurrentUser(userToLogin);
        navigate(role === 'admin' ? '/admin' : '/member', { replace: true });
      } else {
        console.error(`No user with role "${role}" found in mock data.`);
      }
    },
    [navigate, users],
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setAssessmentResult(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const addServiceRequest = useCallback(
    (
      request: Omit<
        ServiceRequest,
        'id' | 'status' | 'date' | 'userId' | 'userName' | 'timeline' | 'attachments'
      >,
    ) => {
      if (!currentUser) return;
      const newRequest: ServiceRequest = {
        ...request,
        id: `REQ-${Date.now()}`,
        status: 'Open',
        date: new Date().toISOString().split('T')[0],
        userId: currentUser.id,
        userName: currentUser.name,
        timeline: [
          {
            event: 'Request submitted',
            date: new Date().toISOString().split('T')[0],
          },
        ],
      };
      setServiceRequests((prev) => [newRequest, ...prev]);
    },
    [currentUser],
  );

  const updateServiceRequestStatus = useCallback(
    (id: string | number, status: ServiceRequest['status']) => {
      setServiceRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status } : req)),
      );
    },
    [],
  );

  const updateUser = useCallback(
    (updatedUser: User) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)),
      );
      if (currentUser?.id === updatedUser.id) {
        setCurrentUser(updatedUser);
      }
    },
    [currentUser],
  );

  const handleAssessmentComplete = useCallback(
    (result: ScoreBreakdown & { answers: Answers }) => {
      setAssessmentResult(result);
      navigate('/results', { replace: true });
    },
    [navigate],
  );

  const handleRetakeAssessment = useCallback(() => {
    setAssessmentResult(null);
    navigate('/assessment', { replace: true });
  }, [navigate]);

  const handleJoin = useCallback(() => {
    navigate('/onboarding', { replace: true });
  }, [navigate]);

  const contextValue = useMemo(
    () => ({
      currentUser,
      users,
      serviceRequests,
      login,
      logout,
      addServiceRequest,
      updateServiceRequestStatus,
      updateUser,
      session,
      authLoading,
    }),
    [
      currentUser,
      users,
      serviceRequests,
      login,
      logout,
      addServiceRequest,
      updateServiceRequestStatus,
      updateUser,
      session,
      authLoading,
    ],
  );

  const MemberRoute: React.FC<{ initialView?: MemberView }> = ({
    initialView = 'overview',
  }) => {
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }
    if (currentUser.role !== 'member') {
      return <Navigate to="/admin" replace />;
    }
    return <MemberDashboard initialView={initialView} />;
  };

  const AdminRoute: React.FC = () => {
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }
    if (currentUser.role !== 'admin') {
      return <Navigate to="/member" replace />;
    }
    return <AdminDashboard />;
  };

  const ResultsRoute: React.FC = () => {
    if (!assessmentResult) {
      return <Navigate to="/assessment" replace />;
    }
    return (
      <ResultsPage
        result={assessmentResult}
        onRetake={handleRetakeAssessment}
        onJoin={handleJoin}
      />
    );
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="bg-[var(--bg-main)] min-h-screen font-inter">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/assessment"
            element={<AssessmentTool onComplete={handleAssessmentComplete} />}
          />
          <Route path="/results" element={<ResultsRoute />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/member" element={<MemberRoute />} />
          <Route
            path="/member/documents"
            element={<MemberRoute initialView="documents" />}
          />
          <Route
            path="/member/requests"
            element={<MemberRoute initialView="my-requests" />}
          />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </AppContext.Provider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppStateProvider />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
