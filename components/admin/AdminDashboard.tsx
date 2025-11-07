import React, { useState, useRef, useEffect } from 'react';
import { HomeIcon, UsersIcon, BriefcaseIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon, CurrencyDollarIcon, UserCircleIcon, ChevronDownIcon } from '../icons';
import { useAuth } from '../../App';
import AdminOverview from './AdminOverview';
import ClientManagement from './ClientManagement';
import AdminSettings from './AdminSettings';
import AdminServiceRequests from './AdminServiceRequests';
import AdminDocumentsView from './AdminDocumentsView';
import AdminSubscriptionsView from './AdminSubscriptionsView';
import ThemeToggle from '../ThemeToggle';

const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
    <div className="p-8 animate-fade-in">
        <h1 className="font-playfair text-3xl font-bold text-[var(--text-main)]">{title}</h1>
        <div className="mt-4 bg-[var(--bg-card)] p-6 rounded-2xl shadow-lg border border-[var(--border-subtle)]">
            <p className="text-[var(--text-muted)]">This section is under construction. Functionality for "{title}" will be added in a future update.</p>
        </div>
    </div>
);

// --- Reusable Components ---
const SidebarLink: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; }> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center w-full px-4 py-3 rounded-lg text-left transition-colors duration-200 relative ${isActive ? 'bg-info/10 text-blue-700 font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]'}`}>
        {isActive && <div className="absolute left-0 top-0 h-full w-1 bg-info rounded-r-full"></div>}
        <div className={`ml-2 ${isActive ? 'text-info' : ''}`}>{icon}</div>
        <span className="ml-3">{label}</span>
    </button>
);

// --- Main Dashboard Component ---
type AdminView = 'overview' | 'members' | 'serviceRequests' | 'documents' | 'subscriptions' | 'settings';

const AdminDashboard: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const [activeView, setActiveView] = useState<AdminView>('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

     useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);
    
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleViewChange = (view: AdminView) => {
        setActiveView(view);
        setIsSidebarOpen(false);
    };

    const renderView = () => {
        switch (activeView) {
            case 'overview':
                return <AdminOverview />;
            case 'members':
                return <ClientManagement showToast={showToast} />;
            case 'serviceRequests':
                return <AdminServiceRequests showToast={showToast} />;
            case 'documents':
                return <AdminDocumentsView showToast={showToast} />;
            case 'subscriptions':
                return <AdminSubscriptionsView showToast={showToast} />;
            case 'settings':
                return <AdminSettings showToast={showToast} />;
            default:
                return <AdminOverview />;
        }
    };

    const NavItems = (
        <>
            <SidebarLink icon={<HomeIcon className="w-6 h-6" />} label="Overview" isActive={activeView === 'overview'} onClick={() => handleViewChange('overview')} />
            <SidebarLink icon={<UsersIcon className="w-6 h-6" />} label="Members" isActive={activeView === 'members'} onClick={() => handleViewChange('members')} />
            <SidebarLink icon={<BriefcaseIcon className="w-6 h-6" />} label="Service Requests" isActive={activeView === 'serviceRequests'} onClick={() => handleViewChange('serviceRequests')} />
            <SidebarLink icon={<ShieldCheckIcon className="w-6 h-6" />} label="Documents" isActive={activeView === 'documents'} onClick={() => handleViewChange('documents')} />
            <SidebarLink icon={<CurrencyDollarIcon className="w-6 h-6" />} label="Subscriptions" isActive={activeView === 'subscriptions'} onClick={() => handleViewChange('subscriptions')} />
            <SidebarLink icon={<Cog6ToothIcon className="w-6 h-6" />} label="Settings" isActive={activeView === 'settings'} onClick={() => handleViewChange('settings')} />
        </>
    );
    return (
        <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)]">
             {toast && (
                <div className={`fixed top-20 right-8 z-[100] py-3 px-5 rounded-lg shadow-lg text-white animate-slide-in-right ${toast.type === 'success' ? 'bg-success' : 'bg-error'}`}>
                    {toast.message}
                </div>
            )}
            {/* Mobile Sidebar */}
            <div className={`fixed inset-0 z-40 md:hidden transition-opacity ${isSidebarOpen ? 'bg-black/50' : 'bg-transparent pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}></div>
            <aside className={`fixed top-0 left-0 h-full z-50 w-64 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="px-6 py-4 flex items-center border-b border-[var(--border-subtle)] h-16 shrink-0">
                    <img src="https://restorationexpertise.com/wp-content/uploads/2025/11/Restorationexpertise_ig_profilepic_2_small.webp" alt="Logo" className="w-8 h-8 mr-2"/>
                    <h1 className="font-playfair text-xl font-bold text-[var(--text-main)]">Admin</h1>
                </div>
                <nav className="flex-grow p-4 space-y-2">{NavItems}</nav>
                <div className="p-4 border-t border-[var(--border-subtle)] space-y-4">
                    <ThemeToggle variant="row" />
                    <button onClick={() => void logout()} className="flex items-center w-full px-4 py-3 rounded-lg text-left text-[var(--text-muted)] hover:bg-red-500/10 hover:text-error transition-colors">
                        <ArrowRightOnRectangleIcon className="w-6 h-6" /><span className="ml-3 font-semibold">Logout</span>
                    </button>
                </div>
            </aside>
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                 <header className="sticky top-0 z-30 bg-[var(--bg-card)] shadow-sm h-16 flex items-center justify-between px-4 md:px-6 shrink-0 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-[var(--text-main)] md:hidden mr-4">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        <div className="hidden md:flex items-center gap-3">
                            <h1 className="font-playfair text-xl md:text-2xl font-bold text-[var(--text-main)]">Admin Panel</h1>
                            <span className="bg-info/10 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-md">ADMIN</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle variant="icon" />
                        <div className="relative" ref={userMenuRef}>
                            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-2 p-1 rounded-lg hover:bg-[var(--bg-subtle)]">
                                <div className="w-9 h-9 bg-info/10 rounded-full flex items-center justify-center">
                                    <UserCircleIcon className="w-6 h-6 text-blue-600"/>
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="font-semibold text-sm text-[var(--text-main)]">{currentUser?.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{currentUser?.email}</p>
                                </div>
                                <ChevronDownIcon className="w-4 h-4 text-[var(--text-muted)]"/>
                            </button>
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-card)] rounded-lg shadow-xl border border-[var(--border-subtle)] z-50 animate-fade-in">
                                    <a href="#" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">My profile</a>
                                    <a href="#" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">Switch to Member View</a>
                                    <div className="border-t border-[var(--border-subtle)] my-1"></div>
                                    <button onClick={() => void logout()} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/5">Logout</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                    {renderView()}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;