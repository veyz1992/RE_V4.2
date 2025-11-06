import React, { useState, useCallback, createContext, useContext, useMemo, useEffect } from 'react';
import MemberDashboard from './components/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import LoginPage from './components/EntryPage';
import AssessmentTool from './components/AssessmentTool';
import ResultsPage from './components/ResultsPage';
import { User, Role, ServiceRequest, Answers, ScoreBreakdown } from './types';
import { USERS, SERVICE_REQUESTS } from './lib/mockData';
import { ThemeProvider } from './components/ThemeContext';

// App Context for State Management
interface AppContextType {
  currentUser: User | null;
  users: User[];
  serviceRequests: ServiceRequest[];
  login: (role: Role, email?: string) => void;
  logout: () => void;
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

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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


  const login = useCallback((role: Role, email: string = '') => {
    const userToLogin = users.find(u => u.role === role);
    if(userToLogin) {
      setCurrentUser(userToLogin);
      window.location.hash = role === 'admin' ? '#/admin/dashboard' : '#/member/dashboard';
    } else {
      console.error(`No user with role "${role}" found in mock data.`);
    }
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    window.location.hash = '#/';
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
    users,
    serviceRequests,
    login,
    logout,
    addServiceRequest,
    updateServiceRequestStatus,
    updateUser,
  }), [currentUser, users, serviceRequests, login, logout, addServiceRequest, updateServiceRequestStatus, updateUser]);

  const handleAssessmentComplete = (result: ScoreBreakdown & { answers: Answers }) => {
    setAssessmentResult(result);
    window.location.hash = '#/results';
  };

  const handleRetakeAssessment = () => {
    setAssessmentResult(null);
    window.location.hash = '#/assessment';
  }

  const handleJoin = () => {
    window.location.hash = '#/';
  }

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
    
    if (!currentUser) {
      return <LoginPage />;
    }
    
    switch (currentUser.role) {
      case 'admin':
        if(location.startsWith('#/admin')) return <AdminDashboard />;
        break;
      case 'member':
        if(location.startsWith('#/member')) return <MemberDashboard />;
        break;
      default:
        break; // Fall through to redirect
    }

    // If a logged-in user is on a mismatched route (e.g., '#/'), redirect them.
    window.location.hash = currentUser.role === 'admin' ? '#/admin/dashboard' : '#/member/dashboard';
    return null;
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
    )
}


export default App;