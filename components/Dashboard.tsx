import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HomeIcon, ListBulletIcon, UserCircleIcon, ArrowRightOnRectangleIcon, PencilSquareIcon, TrophyIcon, DocumentTextIcon, CheckCircleIcon, CreditCardIcon, UsersIcon, Cog6ToothIcon, ClockIcon, ExclamationTriangleIcon, EyeIcon, CalendarDaysIcon, PlusCircleIcon, StarIcon, NewspaperIcon, ArrowDownTrayIcon, ArrowTrendingUpIcon, ShieldCheckIcon, MagnifyingGlassIcon, ClipboardIcon, LightBulbIcon, XMarkIcon, UploadIcon, TrashIcon, ChevronDownIcon, ChartBarIcon, ChatBubbleOvalLeftEllipsisIcon, CheckIcon, BriefcaseIcon, KeyIcon, ClipboardDocumentCheckIcon } from './icons';
import { useAuth } from '../App';
import { ServiceRequest, Benefit, Invoice } from '../types';
import ConfirmationModal from './admin/ConfirmationModal';
import MemberBlueprint from './MemberBlueprint';
import ThemeToggle from './ThemeToggle';
import { ADMIN_MEMBERS } from '../lib/mockData';

// --- Reusable Components ---
const SidebarLink: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void; attention?: boolean }> = ({ icon, label, isActive, onClick, attention }) => (
    <button onClick={onClick} className={`flex items-center w-full px-4 py-3 rounded-lg text-left transition-colors duration-200 relative ${isActive ? 'bg-[var(--accent-bg-subtle)] text-[var(--accent-dark)] font-bold' : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]'}`}>
        {isActive && <div className="absolute left-0 top-0 h-full w-1 bg-[var(--accent)] rounded-r-full"></div>}
        <div className={`ml-2 ${isActive ? 'text-[var(--accent-dark)]' : ''}`}>{icon}</div>
        <span className="ml-3">{label}</span>
        {attention && <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-error rounded-full animate-pulse"></span>}
    </button>
);

const Card: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = '', onClick }) => (
    <div onClick={onClick} className={`bg-[var(--bg-card)] p-6 rounded-2xl shadow-lg border border-[var(--border-subtle)] ${className} ${onClick ? 'cursor-pointer transition-transform duration-200 hover:-translate-y-1' : ''}`}>
        {children}
    </div>
);


const PlaceholderView: React.FC<{ title: string }> = ({ title }) => (
    <div className="animate-fade-in">
        <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)] mb-4">{title}</h1>
        <Card>
            <p className="text-[var(--text-muted)]">This is a placeholder for the "{title}" page. Content and functionality will be added in a future update.</p>
        </Card>
    </div>
);

// --- Page Components (Internal to Dashboard) ---

// --- Dummy Data ---
const memberData = {
    status: 'active', // Can be 'pending' or 'actionRequired' for testing
    plan: {
      tier: 'Gold',
      priceMonthly: 229,
    },
    verification: {
        validUntil: '12/31/2025',
        rating: 'A+',
    },
    stats: {
        profileViews: { value: 132, period: 'This month' },
        badgeClicks: { value: 24, period: 'This week' },
        currentPlan: 'Gold – $229/mo',
        nextRenewal: 'Mar 15, 2025',
    },
    benefits: {
        planName: 'Gold Member Plan',
        description: 'Your current plan gives you access to premium features to boost your online presence and credibility.',
        items: [
            { name: '2 SEO blog posts per year', progress: '1 of 2 used', icon: NewspaperIcon },
            { name: 'Quarterly website review', progress: 'Next scheduled: May 2025', icon: MagnifyingGlassIcon },
            { name: 'Trust badge & listing in network', progress: 'Active', icon: ShieldCheckIcon },
        ]
    },
    activityLog: [
        { description: 'New 5-star Google review detected', timestamp: '2 hours ago', icon: StarIcon },
        { description: "SEO blog post 'Water Damage Checklist' published", timestamp: 'Yesterday', icon: NewspaperIcon },
        { description: 'Badge downloaded', timestamp: '3 days ago', icon: ArrowDownTrayIcon },
        { description: 'Verification renewed', timestamp: '1 week ago', icon: ShieldCheckIcon },
        { description: 'Plan upgraded to Gold', timestamp: '3 weeks ago', icon: ArrowTrendingUpIcon },
    ]
};

type DocumentStatus = 'approved' | 'underReview' | 'rejected' | 'needsReplacement' | 'notUploaded';

const documentsData = [
  {
    name: 'Contractor License',
    status: 'approved' as DocumentStatus,
    uploadDate: 'Nov 2, 2025',
    adminNote: 'Verified with state board. All clear.',
    fileName: 'contractor-license-2025.pdf',
    fileSize: '2.1 MB',
    uploadTimestamp: 'Nov 2, 2025 at 10:45 AM',
  },
  {
    name: 'Liability Insurance Certificate',
    status: 'underReview' as DocumentStatus,
    uploadDate: 'Nov 15, 2025',
    adminNote: null,
    fileName: 'liability-insurance-q4.pdf',
    fileSize: '850 KB',
    uploadTimestamp: 'Nov 15, 2025 at 2:30 PM',
  },
  {
    name: 'Workers’ Compensation Insurance',
    status: 'needsReplacement' as DocumentStatus,
    uploadDate: 'Oct 5, 2025',
    adminNote: 'Policy expired last month. Please upload the renewed certificate.',
    fileName: 'workers-comp-2024-final.jpg',
    fileSize: '4.5 MB',
    uploadTimestamp: 'Oct 5, 2025 at 9:00 AM',
  },
  {
    name: 'IICRC Water Damage Certification',
    status: 'notUploaded' as DocumentStatus,
    uploadDate: null,
    adminNote: null,
    fileName: null,
    fileSize: null,
    uploadTimestamp: null,
  },
];


type MemberView = 'overview' | 'my-requests' | 'profile' | 'badge' | 'documents' | 'benefits' | 'billing' | 'community' | 'blueprint' | 'settings';

const VerificationStatusCard: React.FC<{ onNavigate: (view: MemberView) => void }> = ({ onNavigate }) => {
    const statusConfig = {
        active: {
            title: "Verified Restoration Expertise Member",
            text: "Your badge is live and visible to homeowners.",
            subtext: `Valid until: ${memberData.verification.validUntil} • Rating: ${memberData.verification.rating}`,
            buttonText: "View Badge",
            buttonAction: () => onNavigate('badge'),
            Icon: CheckCircleIcon,
            color: 'success' as const,
        },
        pending: {
            title: "Verification in Progress",
            text: "We are reviewing your documents. This typically takes 1 to 3 business days.",
            subtext: null,
            buttonText: "View Documents",
            buttonAction: () => onNavigate('documents'),
            Icon: ClockIcon,
            color: 'warning' as const,
        },
        actionRequired: {
            title: "Action required to get verified",
            text: "Some documents or profile details are missing.",
            subtext: null,
            buttonText: "Complete Profile",
            buttonAction: () => onNavigate('profile'),
            Icon: ExclamationTriangleIcon,
            color: 'error' as const,
        }
    };

    const currentStatus = statusConfig[memberData.status as keyof typeof statusConfig];
    const colorClasses = {
        success: { bg: 'bg-success/5', border: 'border-success/20', text: 'text-success', iconBg: 'bg-success/10' },
        warning: { bg: 'bg-warning/5', border: 'border-warning/20', text: 'text-warning', iconBg: 'bg-warning/10' },
        error: { bg: 'bg-error/5', border: 'border-error/20', text: 'text-error', iconBg: 'bg-error/10' },
    };
    const colors = colorClasses[currentStatus.color];

    return (
        <div className={`p-6 rounded-2xl shadow-md border ${colors.bg} ${colors.border} flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6`}>
            <div className={`p-3 rounded-full ${colors.iconBg} ${colors.text}`}>
                <currentStatus.Icon className="w-8 h-8"/>
            </div>
            <div className="flex-grow">
                <h2 className="font-playfair text-xl sm:text-2xl font-bold text-[var(--text-main)]">{currentStatus.title}</h2>
                <p className="text-[var(--text-muted)] mt-1">{currentStatus.text}</p>
                {currentStatus.subtext && <p className="text-sm text-[var(--text-muted)] mt-2">{currentStatus.subtext}</p>}
            </div>
            <button
                onClick={currentStatus.buttonAction}
                className="w-full sm:w-auto mt-2 sm:mt-0 py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)] transition-transform transform hover:scale-105"
            >
                {currentStatus.buttonText}
            </button>
        </div>
    );
}

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: string, label?: string }> = ({ icon, title, value, label }) => {
    return (
        <Card className="transition-transform transform hover:-translate-y-1">
            <div className="flex items-center text-[var(--accent-dark)] mb-2">
                {icon}
                <h3 className="ml-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</h3>
            </div>
            <p className="font-playfair text-3xl sm:text-4xl font-bold text-[var(--text-main)]">{value}</p>
            {label && <p className="text-sm text-[var(--text-muted)]">{label}</p>}
        </Card>
    );
}

const MemberOverview: React.FC<{ onNavigate: (view: MemberView) => void; onNewRequest: () => void; }> = ({ onNavigate, onNewRequest }) => {
    const QuickActionButton: React.FC<{ icon: React.ElementType, label: string, onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
        <button onClick={onClick} className="bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg p-4 flex flex-col items-center justify-center text-center transition-colors hover:bg-[var(--accent-dark)] h-28">
            <Icon className="w-8 h-8 mb-2" />
            <span className="text-sm">{label}</span>
        </button>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <VerificationStatusCard onNavigate={onNavigate} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    icon={<EyeIcon className="w-5 h-5"/>} 
                    title="Profile Views" 
                    value={memberData.stats.profileViews.value.toString()} 
                    label={memberData.stats.profileViews.period}
                />
                <StatCard 
                    icon={<TrophyIcon className="w-5 h-5"/>} 
                    title="Badge Clicks" 
                    value={memberData.stats.badgeClicks.value.toString()} 
                    label={memberData.stats.badgeClicks.period}
                />
                 <StatCard 
                    icon={<CreditCardIcon className="w-5 h-5"/>} 
                    title="Current Plan" 
                    value={memberData.stats.currentPlan.split('–')[0].trim()}
                    label={memberData.stats.currentPlan.split('–')[1].trim()}
                />
                <StatCard 
                    icon={<CalendarDaysIcon className="w-5 h-5"/>} 
                    title="Next Renewal" 
                    value={memberData.stats.nextRenewal}
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-1">Your Benefits</h2>
                    <p className="text-[var(--text-muted)] mb-6">{memberData.benefits.description}</p>
                    <ul className="space-y-4">
                        {memberData.benefits.items.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <li key={index} className="flex items-center">
                                    <div className="bg-[var(--accent-bg-subtle)] text-[var(--accent-dark)] p-2 rounded-full mr-4">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-[var(--text-main)]">{item.name}</p>
                                        <p className="text-sm text-[var(--text-muted)]">{item.progress}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="text-right mt-6">
                        <button onClick={() => onNavigate('benefits')} className="font-semibold text-[var(--accent-dark)] hover:underline">
                            View full benefits →
                        </button>
                    </div>
                </Card>

                <Card>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <QuickActionButton icon={ArrowDownTrayIcon} label="Download Badge" onClick={() => onNavigate('badge')} />
                        <QuickActionButton icon={PencilSquareIcon} label="Edit Profile" onClick={() => onNavigate('profile')} />
                        <QuickActionButton icon={CreditCardIcon} label="Manage Billing" onClick={() => onNavigate('billing')} />
                        <QuickActionButton icon={PlusCircleIcon} label="Request Service" onClick={onNewRequest} />
                    </div>
                </Card>
            </div>

            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Recent Activity</h2>
                <ul className="divide-y divide-[var(--border-subtle)]">
                    {memberData.activityLog.map((activity, index) => {
                        const Icon = activity.icon;
                        return (
                             <li key={index} className="py-4 flex items-center">
                                <div className="bg-[var(--bg-subtle)] p-3 rounded-full mr-4 text-[var(--text-muted)]">
                                   <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-grow">
                                    <p className="text-[var(--text-main)]">{activity.description}</p>
                                </div>
                                <p className="text-sm text-[var(--text-muted)] ml-4 text-right whitespace-nowrap">{activity.timestamp}</p>
                            </li>
                        );
                    })}
                </ul>
            </Card>
        </div>
    );
};

const MyRequests: React.FC<{ onNewRequest: () => void; showToast: (message: string, type: 'success' | 'error') => void; }> = ({ onNewRequest, showToast }) => {
    const { currentUser, serviceRequests, updateServiceRequestStatus } = useAuth();
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

    const [statusFilter, setStatusFilter] = useState('All');
    const [serviceFilter, setServiceFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const userRequests = useMemo(() => 
        serviceRequests.filter(r => r.userId === currentUser?.id),
        [serviceRequests, currentUser]
    );

    const filteredRequests = useMemo(() => {
        return userRequests.filter(req => {
            const statusMatch = statusFilter === 'All' || req.status === statusFilter;
            const serviceMatch = serviceFilter === 'All' || req.service === serviceFilter;
            const searchMatch = searchTerm === '' || 
                                req.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                req.id.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && serviceMatch && searchMatch;
        });
    }, [userRequests, statusFilter, serviceFilter, searchTerm]);

    const summaryCounts = useMemo(() => ({
        Open: userRequests.filter(r => r.status === 'Open').length,
        'In progress': userRequests.filter(r => r.status === 'In progress').length,
        Completed: userRequests.filter(r => r.status === 'Completed').length,
    }), [userRequests]);

    const serviceIcons: { [key: string]: React.FC<{ className?: string }> } = {
        'SEO Blog Post': NewspaperIcon,
        'Spotlight Article': StarIcon,
        'Website Review': MagnifyingGlassIcon,
        'Badge Support': ShieldCheckIcon,
        'Other': ClipboardIcon,
        'Consultation': ChatBubbleOvalLeftEllipsisIcon,
    };

    const statusColors: { [key: string]: string } = {
        'Open': 'bg-gray-200 text-gray-800',
        'In progress': 'bg-info/20 text-blue-800',
        'Completed': 'bg-success/20 text-green-800',
        'Canceled': 'bg-gray-200 text-gray-800',
    };

    const serviceTypes = ['All', ...Array.from(new Set(userRequests.map(r => r.service)))];
    const statusTypes = ['All', 'Open', 'In progress', 'Completed', 'Canceled'];

    const SummaryPill: React.FC<{ label: string; count: number; color: string; }> = ({ label, count, color }) => (
        <div className="flex items-center gap-2">
            <span className="text-[var(--text-muted)]">{label}:</span>
            <span className={`px-2.5 py-1 text-sm font-bold rounded-full ${color}`}>
                {count}
            </span>
        </div>
    );
    
    const handleMarkAsResolved = (id: string) => {
        updateServiceRequestStatus(id, 'Completed');
        setSelectedRequest(null);
        showToast('Request marked as resolved!', 'success');
    };

    return (
        <>
            {selectedRequest && (
                <RequestDetailModal 
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    statusColors={statusColors}
                    serviceIcons={serviceIcons}
                    onMarkResolved={handleMarkAsResolved}
                    showToast={showToast}
                />
            )}
            <div className="animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">My Service Requests</h1>
                        <p className="mt-2 text-lg text-[var(--text-muted)]">Track your content, review and support requests related to your membership benefits.</p>
                    </div>
                    <button onClick={onNewRequest} className="py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)] whitespace-nowrap">
                        New Request
                    </button>
                </div>
                
                <div className="bg-[var(--bg-card)] p-3 rounded-xl shadow-md border border-[var(--border-subtle)] flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2">
                    <SummaryPill label="Open" count={summaryCounts.Open} color="bg-gray-200 text-gray-800" />
                    <SummaryPill label="In Progress" count={summaryCounts['In progress']} color="bg-info/20 text-blue-800" />
                    <SummaryPill label="Completed" count={summaryCounts.Completed} color="bg-success/20 text-green-800" />
                </div>

                <Card className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative md:col-span-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search by title or ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] focus:ring-[var(--accent)] focus:border-[var(--accent)]"
                            />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                                <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] focus:ring-[var(--accent)] focus:border-[var(--accent)]">
                                    {statusTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="service-filter" className="sr-only">Filter by service type</label>
                                <select id="service-filter" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} className="w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] focus:ring-[var(--accent)] focus:border-[var(--accent)]">
                                    {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </Card>

                {filteredRequests.length > 0 ? (
                    <Card className="p-0 overflow-hidden">
                        {/* Desktop Table */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="min-w-full">
                                <thead className="bg-[var(--bg-subtle)]">
                                    <tr className="border-b border-[var(--border-subtle)]">
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Date</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Service</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Request Title</th>
                                        <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Status</th>
                                        <th className="py-3 px-4 text-right text-sm font-semibold text-[var(--text-muted)]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-subtle)]">
                                    {filteredRequests.map(req => {
                                        const Icon = serviceIcons[req.service] || ClipboardIcon;
                                        return (
                                            <tr key={req.id} onClick={() => setSelectedRequest(req)} className="cursor-pointer hover:bg-[var(--bg-subtle)]">
                                                <td className="py-3 px-4 text-[var(--text-main)] whitespace-nowrap">{req.date}</td>
                                                <td className="py-3 px-4 text-[var(--text-main)]">
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="w-5 h-5 text-[var(--text-muted)]" />
                                                        <span>{req.service}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-[var(--text-main)]">{req.title}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColors[req.status]}`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button onClick={() => setSelectedRequest(req)} className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-dark)]"><EyeIcon className="w-5 h-5"/></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-[var(--border-subtle)]">
                            {filteredRequests.map(req => {
                                const Icon = serviceIcons[req.service] || ClipboardIcon;
                                return (
                                    <div key={req.id} className="p-4" onClick={() => setSelectedRequest(req)}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
                                                <Icon className="w-5 h-5 text-[var(--text-muted)]" />
                                                {req.service}
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColors[req.status]}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <p className="mt-2 font-bold text-lg text-[var(--text-main)]">{req.title}</p>
                                        <div className="flex justify-between items-center mt-3 text-sm text-[var(--text-muted)]">
                                            <span>{req.id} • {req.date}</span>
                                            <button onClick={() => setSelectedRequest(req)} className="font-semibold text-[var(--accent-dark)] hover:underline">View details →</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                ) : (
                    <Card>
                        <div className="text-center py-12">
                            <ClipboardIcon className="w-16 h-16 mx-auto text-gray-300" />
                            <h3 className="mt-4 text-xl font-bold text-[var(--text-main)]">No requests found.</h3>
                            <p className="mt-1 text-[var(--text-muted)]">{searchTerm || statusFilter !== 'All' || serviceFilter !== 'All' ? 'Try adjusting your filters.' : 'You haven\'t made any requests yet.'}</p>
                            <button onClick={onNewRequest} className="mt-6 py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">
                                Create your first request
                            </button>
                        </div>
                    </Card>
                )}
            </div>
        </>
    );
};


const MemberProfile: React.FC<{ showToast: (message: string, type: 'success' | 'error') => void; }> = ({ showToast }) => {
    const { currentUser, updateUser } = useAuth();
    const logoInputRef = useRef<HTMLInputElement>(null);

    if (!currentUser) return null;
    
    const handleSave = (updatedProfile: Partial<typeof currentUser.profile>, updatedName?: string) => {
        const userToUpdate = { ...currentUser };
        if(updatedName) userToUpdate.name = updatedName;
        userToUpdate.profile = { ...currentUser.profile, ...updatedProfile };
        
        updateUser(userToUpdate);
        showToast('Changes saved successfully.', 'success');
    };

    const completeness = useMemo(() => {
        const requiredFields = [
            currentUser.name,
            currentUser.profile.contactNumber,
            currentUser.profile.address,
            currentUser.profile.logoUrl,
            currentUser.profile.description,
            currentUser.profile.yearsInBusiness,
            currentUser.profile.serviceAreas,
            currentUser.profile.specialties,
        ];
        const filledCount = requiredFields.filter(field => {
            if (Array.isArray(field)) return field.length > 0;
            return !!field;
        }).length;
        return Math.round((filledCount / requiredFields.length) * 100);
    }, [currentUser]);

    const ALL_SPECIALTIES = ['Water Damage', 'Fire Restoration', 'Mold Remediation', 'Storm Damage', 'Reconstruction', 'Biohazard Cleanup'];

    // --- Sub-components for each card ---

    const ProfileCompleteness: React.FC<{ value: number }> = ({ value }) => (
        <Card className="mb-8">
            <h2 className="font-playfair text-xl font-bold text-[var(--text-main)] mb-2">Profile Completeness: {value}%</h2>
            <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2.5">
                <div className="bg-[var(--accent)] h-2.5 rounded-full" style={{ width: `${value}%` }}></div>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-2">Complete your profile to increase your visibility in our network.</p>
        </Card>
    );

    const BusinessInfoCard: React.FC = () => {
        const [isEditing, setIsEditing] = useState(false);
        const [formData, setFormData] = useState({
            name: currentUser.name,
            dbaName: currentUser.profile.dbaName || '',
            yearsInBusiness: currentUser.profile.yearsInBusiness || 1,
            description: currentUser.profile.description || ''
        });

        const handleSaveClick = () => {
            const { name, ...profileData } = formData;
            handleSave(profileData, name);
            setIsEditing(false);
        };

        const handleCancelClick = () => {
            setFormData({
                name: currentUser.name,
                dbaName: currentUser.profile.dbaName || '',
                yearsInBusiness: currentUser.profile.yearsInBusiness || 1,
                description: currentUser.profile.description || ''
            });
            setIsEditing(false);
        };

        return (
            <Card>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Business Information</h3>
                        <p className="text-sm text-[var(--text-muted)]">This information appears on your public profile and badge.</p>
                    </div>
                    {!isEditing && <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-sm font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] text-sm"><PencilSquareIcon className="w-4 h-4" /> Edit</button>}
                </div>
                {isEditing ? (
                    <div className="space-y-4 animate-fade-in">
                        <div><label className="text-sm font-medium text-[var(--text-muted)]">Business Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)]" /></div>
                        <div><label className="text-sm font-medium text-[var(--text-muted)]">DBA / Brand Name (optional)</label><input type="text" value={formData.dbaName} onChange={e => setFormData({...formData, dbaName: e.target.value})} className="mt-1 block w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)]" /></div>
                        <div><label className="text-sm font-medium text-[var(--text-muted)]">Years in Business</label><input type="number" value={formData.yearsInBusiness} onChange={e => setFormData({...formData, yearsInBusiness: parseInt(e.target.value) || 0})} className="mt-1 block w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)]" /></div>
                        <div><label className="text-sm font-medium text-[var(--text-muted)]">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="mt-1 block w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)]" /></div>
                        <div className="flex justify-end gap-4 pt-2">
                            <button onClick={handleCancelClick} className="py-2 px-5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg font-semibold">Cancel</button>
                            <button onClick={handleSaveClick} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Save Changes</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div><p className="text-sm text-[var(--text-muted)]">Business Name</p><p className="font-semibold text-[var(--text-main)]">{currentUser.name}</p></div>
                        <div><p className="text-sm text-[var(--text-muted)]">DBA / Brand Name</p><p className="font-semibold text-[var(--text-main)]">{currentUser.profile.dbaName || 'N/A'}</p></div>
                        <div><p className="text-sm text-[var(--text-muted)]">Years in Business</p><p className="font-semibold text-[var(--text-main)]">{currentUser.profile.yearsInBusiness || 'N/A'}</p></div>
                        <div><p className="text-sm text-[var(--text-muted)]">Description</p><p className="text-[var(--text-main)] whitespace-pre-wrap">{currentUser.profile.description || 'N/A'}</p></div>
                    </div>
                )}
            </Card>
        );
    };
    
    const ContactDetailsCard: React.FC = () => {
        const [isEditing, setIsEditing] = useState(false);
        const [formData, setFormData] = useState({
            contactNumber: currentUser.profile.contactNumber || '',
            address: currentUser.profile.address || '',
            websiteUrl: currentUser.profile.websiteUrl || ''
        });
        const [errors, setErrors] = useState<any>({});

        const validate = () => {
            const newErrors: any = {};
            if (!formData.contactNumber) newErrors.contactNumber = 'Phone number is required.';
            if (!formData.address) newErrors.address = 'Address is required.';
            if (formData.websiteUrl && !/^https?:\/\//.test(formData.websiteUrl)) newErrors.websiteUrl = 'Please enter a valid URL (e.g., https://...).';
            setErrors(newErrors);
            return Object.keys(newErrors).length === 0;
        };

        const handleSaveClick = () => {
            if (validate()) {
                handleSave(formData);
                setIsEditing(false);
            } else {
                showToast('Please complete required fields.', 'error');
            }
        };

        return (
            <Card>
                <div className="flex justify-between items-start mb-4">
                     <div><h3 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Contact Details</h3></div>
                     {!isEditing && <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-sm font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] text-sm"><PencilSquareIcon className="w-4 h-4" /> Edit</button>}
                </div>
                 {isEditing ? (
                    <div className="space-y-4 animate-fade-in">
                        <div><label className="text-sm font-medium text-[var(--text-muted)]">Email (read-only)</label><p className="mt-1 block w-full p-2 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-muted)]">{currentUser.email}</p></div>
                        <div><label className="text-sm font-medium text-[var(--text-muted)]">Phone</label><input type="tel" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} className={`mt-1 block w-full p-2 border rounded-lg bg-[var(--bg-input)] ${errors.contactNumber ? 'border-error' : 'border-[var(--border-subtle)]'}`} />{errors.contactNumber && <p className="text-xs text-error mt-1">{errors.contactNumber}</p>}</div>
                        <div><label className="text-sm font-medium text-[var(--text-muted)]">Address</label><input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={`mt-1 block w-full p-2 border rounded-lg bg-[var(--bg-input)] ${errors.address ? 'border-error' : 'border-[var(--border-subtle)]'}`} />{errors.address && <p className="text-xs text-error mt-1">{errors.address}</p>}</div>
                        <div><label className="text-sm font-medium text-[var(--text-muted)]">Website URL</label><input type="url" value={formData.websiteUrl} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} className={`mt-1 block w-full p-2 border rounded-lg bg-[var(--bg-input)] ${errors.websiteUrl ? 'border-error' : 'border-[var(--border-subtle)]'}`} />{errors.websiteUrl && <p className="text-xs text-error mt-1">{errors.websiteUrl}</p>}</div>
                        <div className="flex justify-end gap-4 pt-2"><button onClick={() => setIsEditing(false)} className="py-2 px-5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg font-semibold">Cancel</button><button onClick={handleSaveClick} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Save Changes</button></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div><p className="text-sm text-[var(--text-muted)]">Email</p><p className="font-semibold text-[var(--text-main)]">{currentUser.email}</p></div>
                        <div><p className="text-sm text-[var(--text-muted)]">Phone</p><p className="font-semibold text-[var(--text-main)]">{currentUser.profile.contactNumber || 'N/A'}</p></div>
                        <div><p className="text-sm text-[var(--text-muted)]">Address</p><p className="font-semibold text-[var(--text-main)]">{currentUser.profile.address || 'N/A'}</p></div>
                        <div><p className="text-sm text-[var(--text-muted)]">Website URL</p><p className="font-semibold text-[var(--accent-dark)] hover:underline cursor-pointer">{currentUser.profile.websiteUrl || 'N/A'}</p></div>
                    </div>
                 )}
            </Card>
        );
    };

    const ServicesCard: React.FC = () => {
        const [isEditing, setIsEditing] = useState(false);
        const [formData, setFormData] = useState({
            serviceAreas: currentUser.profile.serviceAreas || [],
            specialties: currentUser.profile.specialties || []
        });
        const [areaInput, setAreaInput] = useState('');

        const handleAddArea = () => {
            if (areaInput && !formData.serviceAreas.includes(areaInput)) {
                setFormData(prev => ({ ...prev, serviceAreas: [...prev.serviceAreas, areaInput] }));
                setAreaInput('');
            }
        };

        const handleRemoveArea = (area: string) => {
             setFormData(prev => ({ ...prev, serviceAreas: prev.serviceAreas.filter(a => a !== area) }));
        };

        const handleToggleSpecialty = (specialty: string) => {
            setFormData(prev => ({
                ...prev,
                specialties: prev.specialties.includes(specialty)
                    ? prev.specialties.filter(s => s !== specialty)
                    : [...prev.specialties, specialty]
            }));
        };
        
        return (
            <Card>
                 <div className="flex justify-between items-start mb-4">
                     <div><h3 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Service Areas & Specialties</h3></div>
                     {!isEditing && <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-sm font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] text-sm"><PencilSquareIcon className="w-4 h-4" /> Edit</button>}
                </div>
                {isEditing ? (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <label className="text-sm font-medium text-[var(--text-muted)]">Service Areas</label>
                            <div className="flex gap-2 mt-1">
                                <input type="text" value={areaInput} onChange={e => setAreaInput(e.target.value)} placeholder="e.g., Dallas" className="flex-grow p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)]" />
                                <button onClick={handleAddArea} className="py-2 px-4 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Add</button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.serviceAreas.map(area => (
                                    <div key={area} className="bg-gray-200 text-charcoal px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                                        {area}
                                        <button onClick={() => handleRemoveArea(area)}><XMarkIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                             <label className="text-sm font-medium text-[var(--text-muted)]">Specialties</label>
                             <div className="flex flex-wrap gap-2 mt-2">
                                {ALL_SPECIALTIES.map(spec => (
                                    <button key={spec} onClick={() => handleToggleSpecialty(spec)} className={`px-4 py-2 rounded-full font-semibold transition-colors text-sm ${formData.specialties.includes(spec) ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-gray-200 text-gray-dark'}`}>{spec}</button>
                                ))}
                             </div>
                        </div>
                         <div className="flex justify-end gap-4 pt-2"><button onClick={() => setIsEditing(false)} className="py-2 px-5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg font-semibold">Cancel</button><button onClick={() => { handleSave(formData); setIsEditing(false); }} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Save Changes</button></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div><p className="text-sm text-[var(--text-muted)]">Service Areas</p><div className="flex flex-wrap gap-2 mt-1">{currentUser.profile.serviceAreas?.map(a => <span key={a} className="bg-[var(--bg-subtle)] px-3 py-1 rounded-full text-sm font-medium">{a}</span>) || <p className="text-[var(--text-main)]">N/A</p>}</div></div>
                        <div><p className="text-sm text-[var(--text-muted)]">Specialties</p><div className="flex flex-wrap gap-2 mt-1">{currentUser.profile.specialties?.map(s => <span key={s} className="bg-gold/20 text-gold-dark px-3 py-1 rounded-full text-sm font-bold">{s}</span>) || <p className="text-[var(--text-main)]">N/A</p>}</div></div>
                    </div>
                )}
                 <p className="text-xs text-[var(--text-muted)] mt-4">These will appear on your public profile and affect homeowner search results.</p>
            </Card>
        )
    };
    
    const BrandingCard: React.FC = () => {
         const [isEditing, setIsEditing] = useState(false);
         const [formData, setFormData] = useState({
            logoUrl: currentUser.profile.logoUrl || '',
            socialLinks: currentUser.profile.socialLinks || {}
         });

        const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            setFormData(prev => ({...prev, socialLinks: {...prev.socialLinks, [name]: value }}));
        };

        const SocialLinkInput:React.FC<{icon: string, name: keyof typeof formData.socialLinks, value: string}> = ({ icon, name, value }) => (
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-dark text-sm shrink-0">{icon}</div>
                <input type="url" placeholder={`https://...`} name={name} value={value} onChange={handleSocialChange} className="mt-1 block w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)]"/>
            </div>
        );
        
        return (
            <Card>
                <div className="flex justify-between items-start mb-4">
                    <div><h3 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Branding & Social Links</h3></div>
                    {!isEditing && <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-sm font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] text-sm"><PencilSquareIcon className="w-4 h-4" /> Edit</button>}
                </div>
                 {isEditing ? (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col items-center text-center">
                            <img src={currentUser.profile.logoUrl || 'https://via.placeholder.com/150'} alt="Business Logo" className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-white shadow-md"/>
                            <input type="file" ref={logoInputRef} className="hidden" accept="image/png, image/jpeg" />
                            <button onClick={() => logoInputRef.current?.click()} className="py-2 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm">Upload new logo</button>
                            <p className="text-xs text-[var(--text-muted)] mt-2">Recommended: 400x400 PNG with transparent background.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SocialLinkInput icon="G" name="google" value={formData.socialLinks?.google || ''} />
                            <SocialLinkInput icon="f" name="facebook" value={formData.socialLinks?.facebook || ''} />
                            <SocialLinkInput icon="ig" name="instagram" value={formData.socialLinks?.instagram || ''} />
                            <SocialLinkInput icon="in" name="linkedin" value={formData.socialLinks?.linkedin || ''} />
                            <SocialLinkInput icon="Y" name="yelp" value={formData.socialLinks?.yelp || ''} />
                        </div>
                        <div className="flex justify-end gap-4 pt-2"><button onClick={() => setIsEditing(false)} className="py-2 px-5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg font-semibold">Cancel</button><button onClick={() => { handleSave(formData); setIsEditing(false); }} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Save Changes</button></div>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <img src={currentUser.profile.logoUrl || 'https://via.placeholder.com/150'} alt="Business Logo" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg shrink-0"/>
                        <div className="w-full">
                            <h4 className="font-bold mb-2">Social Links</h4>
                            {Object.entries(currentUser.profile.socialLinks || {}).map(([key, value]) => value ? <p key={key} className="text-sm truncate"><span className="font-semibold capitalize">{key}:</span> <a href={value as string} className="text-[var(--accent-dark)] hover:underline">{value as string}</a></p> : null)}
                        </div>
                    </div>
                )}
            </Card>
        );
    };

    const PublicProfilePreview: React.FC = () => (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Public Profile Preview</h2>
                <a href="#" className="font-semibold text-[var(--accent-dark)] hover:underline text-sm">View live profile →</a>
            </div>
            <div className="bg-[var(--bg-subtle)] p-6 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                    <img src={currentUser.profile.logoUrl || 'https://via.placeholder.com/150'} alt="Logo" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md shrink-0"/>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-[var(--text-main)]">{currentUser.name}</h3>
                            <span className="bg-success text-white px-3 py-1 text-xs font-bold rounded-full">{memberData.verification.rating}</span>
                        </div>
                        <p className="text-[var(--text-muted)] font-medium">{currentUser.profile.address} • {currentUser.profile.yearsInBusiness} years in business</p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                    <p className="font-semibold text-[var(--text-main)]">Serving: <span className="font-normal text-[var(--text-muted)]">{currentUser.profile.serviceAreas?.join(' • ')}</span></p>
                     <div className="flex flex-wrap gap-2 mt-2">
                        {currentUser.profile.specialties?.map(s => <span key={s} className="bg-gold/20 text-gold-dark px-3 py-1 rounded-full text-xs font-bold">{s}</span>)}
                    </div>
                </div>
                <p className="mt-4 text-[var(--text-main)]">{currentUser.profile.description}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
                    <ShieldCheckIcon className="w-5 h-5 text-success" />
                    Verified by Restoration Expertise
                </div>
            </div>
        </Card>
    );

    const PublicProfileCardGenerator: React.FC = () => {
        const [cardTheme, setCardTheme] = useState<'light' | 'dark'>('light');
        const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large'>('medium');
        const [showQrCode, setShowQrCode] = useState(true);

        const isDataComplete = !!currentUser.profile.logoUrl && !!currentUser.profile.address;

        const handleDownloadClick = () => {
            showToast('Download will be available in the full version.', 'success');
        };

        const handleCopyEmbedCode = () => {
            const businessSlug = currentUser.name.toLowerCase().replace(/\s+/g, '-');
            const embedCode = `<a href="https://restorationexpertise.com/profile/${businessSlug}" target="_blank" rel="noopener noreferrer">\n  <img src="https://restorationexpertise.com/cards/${businessSlug}.png" alt="Restoration Expertise Verified Member - ${currentUser.name}" />\n</a>`;
            navigator.clipboard.writeText(embedCode);
            showToast('Embed code copied!', 'success');
        };

        const cityState = currentUser.profile.address?.split(',').slice(1).join(',').trim() || '';
        const tagline = currentUser.profile.description?.substring(0, 80) + (currentUser.profile.description && currentUser.profile.description.length > 80 ? '...' : '');

        const sizeClasses = {
            small: 'scale-90',
            medium: 'scale-100',
            large: 'scale-110'
        };

        const QRPlaceholder = () => (
            <div className={`w-12 h-12 p-0.5 rounded-md grid grid-cols-5 grid-rows-5 gap-px ${cardTheme === 'light' ? 'bg-gray-200' : 'bg-gray-dark'}`}>
                {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className={`${Math.random() > 0.5 ? (cardTheme === 'light' ? 'bg-charcoal' : 'bg-white') : ''}`}></div>
                ))}
            </div>
        );

        return (
            <Card className="mt-8">
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Public Profile Card</h2>
                <p className="mt-1 text-[var(--text-muted)]">Generate a shareable card for your website, proposals or social media.</p>

                {!isDataComplete ? (
                    <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3">
                        <ExclamationTriangleIcon className="w-6 h-6 text-warning" />
                        <p className="font-semibold text-yellow-800">To generate a complete profile card, please fill out your logo and address in the sections above.</p>
                    </div>
                ) : (
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                        {/* Left: Preview */}
                        <div className="flex justify-center items-center min-h-[280px]">
                            <div className={`origin-center transition-transform duration-300 ${sizeClasses[cardSize]}`}>
                                <div className={`w-[350px] h-[200px] rounded-xl shadow-2xl p-4 flex flex-col justify-between transition-colors ${cardTheme === 'light' ? 'bg-white' : 'bg-charcoal-dark'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <img src={currentUser.profile.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/50" />
                                            <div>
                                                <p className={`font-bold text-lg leading-tight ${cardTheme === 'light' ? 'text-charcoal' : 'text-white'}`}>{currentUser.name}</p>
                                                <p className={`text-xs font-semibold ${cardTheme === 'light' ? 'text-gold-dark' : 'text-gold-light'}`}>
                                                    Verified • {memberData.plan.tier} • {memberData.verification.rating}
                                                </p>
                                            </div>
                                        </div>
                                        {showQrCode && (
                                            <div className="text-center">
                                                <QRPlaceholder />
                                                <p className={`text-[8px] mt-1 ${cardTheme === 'light' ? 'text-gray-dark' : 'text-gray'}`}>Scans to your public profile</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pr-16">
                                        <p className={`text-sm truncate ${cardTheme === 'light' ? 'text-gray-dark' : 'text-gray'}`}>{tagline}</p>
                                        <p className={`text-xs font-semibold mt-1 ${cardTheme === 'light' ? 'text-charcoal' : 'text-white'}`}>{cityState}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <ShieldCheckIcon className={`w-4 h-4 ${cardTheme === 'light' ? 'text-success' : 'text-gold'}`} />
                                        <p className={`font-semibold ${cardTheme === 'light' ? 'text-gray-dark' : 'text-gray'}`}>Verified by <span className="font-bold">Restoration Expertise</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Options & Controls */}
                        <div>
                            <div className="space-y-4 p-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-card)]">
                                <h4 className="font-bold text-[var(--text-main)]">Options</h4>
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-muted)] mb-1">Theme</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCardTheme('light')} className={`px-3 py-1.5 rounded-md text-sm font-semibold flex-1 ${cardTheme === 'light' ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--bg-card)] border hover:bg-[var(--bg-subtle)]'}`}>Light</button>
                                        <button onClick={() => setCardTheme('dark')} className={`px-3 py-1.5 rounded-md text-sm font-semibold flex-1 ${cardTheme === 'dark' ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-charcoal text-white border border-charcoal-light hover:bg-charcoal'}`}>Dark</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-[var(--text-muted)]" htmlFor="card-size">Preview Size</label>
                                    <select id="card-size" value={cardSize} onChange={e => setCardSize(e.target.value as any)} className="w-full mt-1 p-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-card)] focus:ring-[var(--accent)] focus:border-[var(--accent)]">
                                        <option value="small">Small</option>
                                        <option value="medium">Medium</option>
                                        <option value="large">Large</option>
                                    </select>
                                </div>
                                <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] cursor-pointer">
                                    <input type="checkbox" checked={showQrCode} onChange={e => setShowQrCode(e.target.checked)} className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--accent)] focus:ring-[var(--accent)]" />
                                    Show QR code
                                </label>
                            </div>
                            
                            <div className="mt-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={handleDownloadClick} className="py-2 px-4 bg-[var(--bg-card)] text-[var(--text-main)] font-bold rounded-lg shadow-md border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] flex items-center justify-center gap-2"><ArrowDownTrayIcon className="w-5 h-5"/> PNG</button>
                                    <button onClick={handleDownloadClick} className="py-2 px-4 bg-[var(--bg-card)] text-[var(--text-main)] font-bold rounded-lg shadow-md border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] flex items-center justify-center gap-2"><ArrowDownTrayIcon className="w-5 h-5"/> PDF</button>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-[var(--text-muted)]">Embed snippet</label>
                                    <div className="relative mt-1">
                                        <pre className="bg-charcoal-dark p-4 rounded-lg text-gray-light text-xs whitespace-pre-wrap overflow-x-auto">
                                            <code>{`<a href="https://restorationexpertise.com/profile/${currentUser.name.toLowerCase().replace(/\s+/g, '-')}"...`}</code>
                                        </pre>
                                        <button onClick={handleCopyEmbedCode} className="absolute top-2 right-2 p-1.5 bg-gray-dark rounded-md text-gray-light hover:bg-gray-dark/50" title="Copy code">
                                            <ClipboardIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        );
    };


    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div>
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Business Profile</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">Keep your business details accurate to build trust and speed up verification.</p>
            </div>
            <div className="mt-8 space-y-8">
                <ProfileCompleteness value={completeness} />
                <BusinessInfoCard />
                <ContactDetailsCard />
                <ServicesCard />
                <BrandingCard />
                <PublicProfilePreview />
                <PublicProfileCardGenerator />
            </div>
        </div>
    );
};

const MemberBadge: React.FC<{ onNavigate: (view: MemberView) => void; showToast: (message: string, type: 'success' | 'error') => void; }> = ({ onNavigate, showToast }) => {
    // For now, hardcode a member to get badge data. This would come from context/API.
    const { currentUser } = useAuth();
    const currentMember = ADMIN_MEMBERS.find(m => m.email === currentUser?.email) || ADMIN_MEMBERS[0]; // Fallback to Acme
    const { badge } = currentMember;

    const [previewBg, setPreviewBg] = useState<'light' | 'dark'>('light');
    const [copied, setCopied] = useState(false);

    if (!badge || badge.status === "NONE") {
         return (
            <div className="animate-fade-in space-y-8">
                <div>
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Your Restoration Expertise Badge</h1>
                    <p className="mt-2 text-lg text-[var(--text-muted)]">Add this badge to your website and profiles so homeowners instantly know you’re verified.</p>
                </div>
                <Card>
                    <div className="text-center py-12">
                        <ClockIcon className="w-16 h-16 mx-auto text-gray-300" />
                        <h3 className="mt-4 text-xl font-bold text-[var(--text-main)]">Your badge is not ready yet.</h3>
                        <p className="mt-1 text-[var(--text-muted)]">Once our team approves your documents, it will appear here.</p>
                    </div>
                </Card>
            </div>
        );
    }

    if (badge.status === "PENDING") {
         return (
            <div className="animate-fade-in space-y-8">
                <div>
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Your Restoration Expertise Badge</h1>
                    <p className="mt-2 text-lg text-[var(--text-muted)]">Add this badge to your website and profiles so homeowners instantly know you’re verified.</p>
                </div>
                <Card>
                    <div className="text-center py-12">
                        <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-gray-300" />
                        <h3 className="mt-4 text-xl font-bold text-[var(--text-main)]">Your business is eligible and under review.</h3>
                        <p className="mt-1 text-[var(--text-muted)]">We’re preparing your badge design.</p>
                    </div>
                </Card>
            </div>
        );
    }

    const imageUrl = previewBg === 'dark' ? (badge.imageDarkUrl || badge.imageLightUrl) : badge.imageLightUrl;

    const embedCode = `<a href="${badge.profileUrl}" target="_blank" rel="noopener noreferrer">
    <img src="${badge.imageLightUrl}"
         alt="Restoration Expertise Verified Member – ${badge.badgeLabel}"
         style="max-width:180px;height:auto;" />
  </a>`;

    const handleCopyCode = () => {
        navigator.clipboard.writeText(embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast('Code copied to clipboard!', 'success');
    };

    const badgeStatusConfig = {
        ACTIVE: { chipText: 'Active', chipColor: 'bg-success text-white' },
        PENDING: { chipText: 'Pending', chipColor: 'bg-warning text-charcoal' },
        REVOKED: { chipText: 'Revoked', chipColor: 'bg-error text-white' },
    };
    const currentStatusInfo = badgeStatusConfig[badge.status as keyof typeof badgeStatusConfig];

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Your Restoration Expertise Badge</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">Add this badge to your website and profiles so homeowners instantly know you’re verified.</p>
            </div>

            <div className="mt-6 bg-gold/10 border border-gold/20 text-[var(--text-main)] p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center">
                    <ShieldCheckIcon className="w-6 h-6 text-gold-dark mr-3 shrink-0" />
                    <p className="text-sm sm:text-base font-semibold">
                        Verified Member · {currentMember.tier} Plan · Rating: {currentMember.rating}
                    </p>
                </div>
                <button onClick={() => onNavigate('billing')} className="font-bold text-sm bg-gold/20 text-gold-dark py-1.5 px-3 rounded-md hover:bg-gold/30 transition-colors whitespace-nowrap self-end sm:self-center">
                    Manage plan →
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-3">
                    <div className="flex space-x-2 mb-4">
                        <button onClick={() => setPreviewBg('light')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${previewBg === 'light' ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-md' : 'bg-[var(--bg-card)] border border-[var(--border-subtle)]'}`}>Light background</button>
                        <button onClick={() => setPreviewBg('dark')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${previewBg === 'dark' ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-md' : 'bg-[var(--bg-card)] border border-[var(--border-subtle)]'}`}>Dark background</button>
                    </div>
                    <div className={`relative p-8 rounded-2xl shadow-lg border border-[var(--border-subtle)] flex items-center justify-center min-h-[350px] transition-colors ${previewBg === 'light' ? 'bg-[var(--bg-subtle)]' : 'bg-charcoal-dark'}`}>
                         {currentStatusInfo && (
                            <span className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full ${currentStatusInfo.chipColor}`}>
                                {currentStatusInfo.chipText}
                            </span>
                         )}
                        <img src={imageUrl} alt={badge.badgeLabel} className="max-w-xs h-auto" />
                    </div>
                     <p className="text-sm text-[var(--text-muted)] mt-4 text-center lg:text-left px-2">
                        This badge reflects your current plan ({currentMember.tier}) and rating ({currentMember.rating}). Any future upgrades or renewals will automatically update your badge.
                    </p>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <h3 className="font-playfair text-xl font-bold text-[var(--text-main)] mb-4">Download & Embed</h3>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <a href={imageUrl} download={`${currentMember.businessName.toLowerCase().replace(/ /g, '-')}-badge.png`}>
                                <button className="w-full py-3 px-4 bg-[var(--bg-card)] text-[var(--text-main)] font-bold rounded-lg shadow-md border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-all flex items-center justify-center gap-2"><ArrowDownTrayIcon className="w-5 h-5"/> PNG</button>
                            </a>
                             <a href={imageUrl} download={`${currentMember.businessName.toLowerCase().replace(/ /g, '-')}-badge.svg`}>
                                <button className="w-full py-3 px-4 bg-[var(--bg-card)] text-[var(--text-main)] font-bold rounded-lg shadow-md border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-all flex items-center justify-center gap-2"><ArrowDownTrayIcon className="w-5 h-5"/> SVG</button>
                            </a>
                        </div>
                        <div className="relative bg-charcoal-dark p-4 rounded-lg">
                            <button onClick={handleCopyCode} className="absolute top-2 right-2 p-1.5 bg-gray-dark rounded-md text-gray-light hover:bg-gray-dark/50" title="Copy code">
                                {copied ? <CheckIcon className="w-5 h-5 text-success" /> : <ClipboardIcon className="w-5 h-5"/>}
                            </button>
                            <pre><code className="text-gray-light text-sm whitespace-pre-wrap select-all">{embedCode}</code></pre>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                            <p className="text-[var(--text-muted)]">Current plan limit: 1 badge per company website</p>
                            <button onClick={() => onNavigate('benefits')} className="font-semibold text-[var(--accent-dark)] hover:underline self-end sm:self-center">
                                View benefits →
                            </button>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center mb-4">
                            <div className="bg-gold/10 text-gold-dark p-2 rounded-full mr-3">
                                <LightBulbIcon className="w-5 h-5" />
                            </div>
                            <h3 className="font-playfair text-xl font-bold text-[var(--text-main)]">Where to place your badge</h3>
                        </div>
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-muted)]">
                            <li>Place above the fold on your homepage near your main call to action.</li>
                            <li>Add it to your About and Reviews pages.</li>
                            <li>Include it in your email signature or proposal PDFs.</li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const MemberDocuments: React.FC<{ onNavigate: (view: MemberView) => void; }> = ({ onNavigate }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

    const { approvedCount, underReviewCount, needsAttentionCount, docsNeedingAttention } = useMemo(() => {
        const approved = documentsData.filter(d => d.status === 'approved').length;
        const underReview = documentsData.filter(d => d.status === 'underReview').length;
        const needingAttention = documentsData.filter(d => ['notUploaded', 'needsReplacement', 'rejected'].includes(d.status));
        
        return {
            approvedCount: approved,
            underReviewCount: underReview,
            needsAttentionCount: needingAttention.length,
            docsNeedingAttention: needingAttention,
        };
    }, []);

    const totalDocs = documentsData.length;
    const progressPercent = totalDocs > 0 ? (approvedCount / totalDocs) * 100 : 0;
    
    const statusConfig = {
        approved: { icon: CheckCircleIcon, color: 'text-success', label: 'Approved', pill: 'bg-success/10 text-success' },
        underReview: { icon: ClockIcon, color: 'text-warning', label: 'Under review', pill: 'bg-warning/10 text-yellow-800' },
        rejected: { icon: XMarkIcon, color: 'text-error', label: 'Rejected', pill: 'bg-error/10 text-error' },
        needsReplacement: { icon: ExclamationTriangleIcon, color: 'text-warning', label: 'Needs replacement', pill: 'bg-warning/10 text-yellow-800' },
        notUploaded: { icon: XMarkIcon, color: 'text-error', label: 'Not uploaded', pill: 'bg-gray-200 text-gray-dark' },
    };
    
    const uploadedDocuments = documentsData.filter(doc => doc.status !== 'notUploaded');

    const handleDragEvents = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Simulate upload
            setIsUploading(true);
            setUploadProgress(0);
            const interval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setIsUploading(false);
                        return 100;
                    }
                    return prev + 10;
                });
            }, 200);
        }
    };

    const getButton = (status: DocumentStatus) => {
        switch (status) {
            case 'approved':
            case 'underReview':
                return <button disabled={status === 'underReview'} className="py-2 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">View</button>;
            case 'needsReplacement':
            case 'rejected':
                return <button className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold hover:bg-[var(--accent-light)] whitespace-nowrap">Upload replacement</button>;
            case 'notUploaded':
                return <button className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold hover:bg-[var(--accent-light)] whitespace-nowrap">Upload now</button>;
            default:
                return null;
        }
    };

    const VerificationSummaryBar = () => {
        const getChipColor = () => {
            if (needsAttentionCount === 0) return 'border-success';
            if (approvedCount === 0 && needsAttentionCount > 0) return 'border-error';
            return 'border-warning';
        };

        return (
            <div className="relative group w-full bg-[var(--bg-card)] p-4 rounded-xl shadow-md border-l-4 transition-all" style={{ borderColor: getChipColor().split('-')[1] }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <p className="font-bold text-[var(--text-main)]">Verification Progress: {approvedCount} / {totalDocs} documents approved</p>
                        <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-semibold">Under review:</span> {underReviewCount} • <span className="font-semibold">Needs attention:</span> {needsAttentionCount}
                        </p>
                    </div>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-charcoal text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Approved: {approvedCount} • Under review: {underReviewCount} • Needs attention: {needsAttentionCount}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-charcoal"></div>
                </div>
            </div>
        );
    };

    const NextStepsCard = () => {
        const getActionText = (status: DocumentStatus) => {
            switch (status) {
                case 'notUploaded': return '(missing)';
                case 'needsReplacement': return '(policy expired)';
                case 'rejected': return '(rejected, see note)';
                default: return '';
            }
        };

        return (
            <Card className="bg-gold/10 border-gold/20">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="bg-gold/20 text-gold-dark p-3 rounded-full shrink-0">
                        {docsNeedingAttention.length > 0 ? <LightBulbIcon className="w-6 h-6" /> : <CheckCircleIcon className="w-6 h-6" />}
                    </div>
                    <div className="flex-grow">
                        {docsNeedingAttention.length > 0 ? (
                            <>
                                <h2 className="font-playfair text-2xl font-bold text-charcoal">Next Steps to Get Verified</h2>
                                <p className="mt-2 text-gray-dark">To complete your verification, please take care of the items below:</p>
                                <ul className="mt-4 space-y-2 list-disc list-inside text-charcoal font-semibold">
                                    {docsNeedingAttention.map(doc => (
                                        <li key={doc.name}>
                                            {doc.status === 'notUploaded' ? 'Upload' : 'Replace'} {doc.name} <span className="font-normal text-gray-dark">{getActionText(doc.status)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-4 text-xs text-text-muted italic">Once these are uploaded, our team typically reviews within 2–3 business days.</p>
                            </>
                        ) : (
                            <>
                                <h2 className="font-playfair text-2xl font-bold text-charcoal">You’re all set for now</h2>
                                <p className="mt-2 text-gray-dark">All required documents are either approved or under review. We’ll notify you if we need anything else.</p>
                            </>
                        )}
                    </div>
                </div>
            </Card>
        );
    };
    
    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Verification Documents</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">Upload and manage the documents we need to verify your business.</p>
            </div>

            <VerificationSummaryBar />

            <Card className="p-0">
                <div className="p-6 border-b border-[var(--border-subtle)]">
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Document Checklist</h2>
                </div>
                <ul className="divide-y divide-[var(--border-subtle)]">
                    {documentsData.map((doc, index) => {
                        const { icon: Icon, color, label } = statusConfig[doc.status];
                        return (
                            <li key={index} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-start flex-grow">
                                    <Icon className={`w-7 h-7 mr-4 mt-1 shrink-0 ${color}`} />
                                    <div>
                                        <p className="font-bold text-lg text-[var(--text-main)]">{doc.name}</p>
                                        <p className={`text-sm font-semibold ${color}`}>{label}
                                            {doc.uploadDate && <span className="text-[var(--text-muted)] font-normal ml-2">• Uploaded: {doc.uploadDate}</span>}
                                        </p>
                                        {doc.adminNote && <p className="text-xs text-[var(--text-muted)] italic mt-1">Note: {doc.adminNote}</p>}
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto flex justify-end shrink-0 self-end sm:self-center">
                                    {getButton(doc.status)}
                                </div>
                            </li>
                        )
                    })}
                </ul>
                <div className="p-6 bg-[var(--bg-subtle)] rounded-b-2xl">
                    <div className="flex justify-between items-center mb-2">
                         <p className="text-sm font-semibold text-[var(--text-main)]">Overall Progress</p>
                         <p className="text-sm font-bold text-[var(--text-main)]">{approvedCount} of {totalDocs} documents approved</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-[var(--accent)] h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Upload Documents</h2>
                <div 
                    className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-colors duration-300
                        ${isDragging ? 'bg-gold/20 border-[var(--accent)]' : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--accent)]'}`
                    }
                    onDragEnter={handleDragEvents}
                    onDragOver={handleDragEvents}
                    onDragLeave={handleDragEvents}
                    onDrop={handleDrop}
                >
                    <UploadIcon className="w-12 h-12 text-[var(--text-muted)]" />
                    <p className="mt-4 text-lg font-semibold text-[var(--text-main)]">{isDragging ? 'Drop files here' : 'Drag files here or click to upload'}</p>
                    <p className="text-sm text-[var(--text-muted)]">Accepted: PDF, JPG, PNG (max 10MB each)</p>
                </div>
                <div className="mt-4 text-center">
                    <button className="py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] shadow-sm">
                        Choose files
                    </button>
                </div>
                {isUploading && (
                     <div className="mt-4">
                        <p className="text-sm font-semibold text-center mb-1">Uploading... {uploadProgress}%</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-[var(--accent)] h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    </div>
                )}
            </Card>
            
            <div className="space-y-6">
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Uploaded Documents</h2>
                {uploadedDocuments.map((doc, index) => (
                    <Card key={index} className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-grow">
                            <div className="flex items-center gap-3">
                                <p className="font-bold text-[var(--text-main)]">{doc.fileName}</p>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusConfig[doc.status].pill}`}>{statusConfig[doc.status].label}</span>
                            </div>
                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                {doc.uploadTimestamp} • {doc.fileSize}
                            </p>
                            {doc.adminNote && <p className="text-xs text-[var(--text-muted)] italic mt-2">Admin Note: {doc.adminNote}</p>}
                        </div>
                         <div className="flex items-center gap-2 self-end md:self-center">
                            {(doc.status === 'rejected' || doc.status === 'needsReplacement') &&
                                <button className="py-2 px-3 bg-gold/20 text-gold-dark font-bold text-xs rounded-md hover:bg-gold/30">Upload replacement</button>
                            }
                            <button className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] rounded-full"><EyeIcon className="w-5 h-5"/></button>
                            <button className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] rounded-full"><ArrowDownTrayIcon className="w-5 h-5"/></button>
                            <button className="p-2 text-error hover:bg-error/10 rounded-full"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    </Card>
                ))}
            </div>

            <NextStepsCard />

            <Card>
                <button onClick={() => setIsGuidelinesOpen(!isGuidelinesOpen)} className="w-full flex justify-between items-center text-left">
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Document Upload Guidelines</h2>
                    <ChevronDownIcon className={`w-6 h-6 text-[var(--text-muted)] transition-transform ${isGuidelinesOpen ? 'rotate-180' : ''}`} />
                </button>
                {isGuidelinesOpen && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] animate-fade-in">
                        <ul className="space-y-2 list-disc list-inside text-[var(--text-muted)]">
                           <li>Documents must be current and not expired.</li>
                           <li>Text must be clearly readable, no blurry photos.</li>
                           <li>Upload all pages, front and back if applicable.</li>
                           <li>Information must match your business name and details.</li>
                        </ul>
                         <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <p className="text-[var(--text-main)] font-semibold">Need help with your documents?</p>
                            <a href="mailto:documents@restorationexpertise.com" className="font-bold text-[var(--accent-dark)] hover:underline">
                                Contact Support →
                            </a>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};


const BenefitDetailModal: React.FC<{ benefit: Benefit; onClose: () => void; onRequest: (title: string) => void; }> = ({ benefit, onClose, onRequest }) => {
    const progressPercent = benefit.quota && benefit.used ? (benefit.used / benefit.quota) * 100 : 0;
    const canRequest = benefit.quota !== undefined && benefit.used !== undefined && benefit.used < benefit.quota;

    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 sm:p-8">
                    <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                        <XMarkIcon className="w-8 h-8"/>
                    </button>
                    <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)] mb-2">{benefit.title}</h2>
                    <p className="text-[var(--text-muted)] text-lg">{benefit.description}</p>
                    
                    {benefit.quota !== undefined && benefit.used !== undefined && (
                        <div className="mt-6">
                            <h3 className="font-semibold text-[var(--text-main)] mb-2">Current Usage</h3>
                            <div className="flex justify-between text-sm font-medium text-[var(--text-muted)] mb-1">
                                <span>Usage</span>
                                <span>{benefit.used} of {benefit.quota} used this year</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-[var(--accent)] h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] space-y-3">
                        <h3 className="font-semibold text-[var(--text-main)]">History (Example)</h3>
                        <ul className="text-sm text-[var(--text-muted)] space-y-2">
                            <li className="flex justify-between"><span>Request for 'Basement Mold Prevention'</span> <span>Jul 15, 2024</span></li>
                            <li className="flex justify-between"><span>Request for 'Post-Fire Cleanup Guide'</span> <span>Jan 20, 2024</span></li>
                        </ul>
                    </div>
                </div>

                <div className="p-6 bg-[var(--bg-subtle)] sticky bottom-0 rounded-b-2xl flex flex-col sm:flex-row justify-end items-center gap-4">
                    <button onClick={onClose} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Close</button>
                    {canRequest && (
                        <button onClick={() => onRequest(benefit.title)} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">
                            Request new post
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


const UsageOverviewChart: React.FC<{ benefits: Benefit[] }> = ({ benefits }) => {
    const { totalUsed, totalQuota, usagePercent, readableBenefits } = useMemo(() => {
        const trackableBenefits = benefits.filter(b => b.quota !== undefined && b.used !== undefined);
        const totalUsed = trackableBenefits.reduce((sum, b) => sum + (b.used || 0), 0);
        const totalQuota = trackableBenefits.reduce((sum, b) => sum + (b.quota || 0), 0);
        const usagePercent = totalQuota > 0 ? (totalUsed / totalQuota) * 100 : 0;
        return { totalUsed, totalQuota, usagePercent, readableBenefits: trackableBenefits };
    }, [benefits]);

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (usagePercent / 100) * circumference;

    return (
        <Card>
            <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Usage Overview</h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-40 h-40 shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 140 140">
                        <circle className="text-gray-200" strokeWidth="12" stroke="currentColor" fill="transparent" r={radius} cx="70" cy="70" />
                        <circle
                            className="text-[var(--accent)]"
                            strokeWidth="12"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="70"
                            cy="70"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-out' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center font-bold text-[var(--text-main)]">
                        <span className="font-playfair text-3xl">{totalUsed}</span>
                        <span className="text-lg text-[var(--text-muted)]">/ {totalQuota} Used</span>
                    </div>
                </div>
                <div className="w-full">
                    <ul className="space-y-2">
                        {readableBenefits.map(b => (
                             <li key={b.title} className="text-sm">
                                 <div className="flex justify-between font-medium">
                                     <span>{b.title}</span>
                                     <span className="text-[var(--text-muted)]">{b.used}/{b.quota}</span>
                                 </div>
                                 <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                     <div className="bg-[var(--accent)] h-1.5 rounded-full" style={{ width: `${(b.used! / b.quota!) * 100}%`}}></div>
                                 </div>
                             </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Card>
    );
};

const MemberBenefits: React.FC<{ showToast: (message: string, type: 'success' | 'error') => void; }> = ({ showToast }) => {
    const { currentUser, updateUser } = useAuth();
    const [localBenefits, setLocalBenefits] = useState(currentUser?.benefits || []);
    const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);

    useEffect(() => {
        setLocalBenefits(currentUser?.benefits || []);
    }, [currentUser?.benefits]);

    if (!currentUser || !currentUser.plan) return null;

    const { plan } = currentUser;

    const planColors = {
        Gold: 'bg-gold text-charcoal',
        Silver: 'bg-gray-300 text-charcoal',
        Bronze: 'bg-yellow-700 text-white',
        'Founding Member': 'bg-charcoal text-gold',
        Platinum: 'bg-gray-800 text-white',
    };

    const iconMap: { [key: string]: React.FC<{ className?: string }> } = {
        NewspaperIcon, ChartBarIcon, ShieldCheckIcon, ChatBubbleOvalLeftEllipsisIcon,
    };
    
    const handleRequestBenefit = (benefitTitle: string) => {
        const updatedBenefits = localBenefits.map(b => {
            if (b.title === benefitTitle && b.used !== undefined && b.quota !== undefined && b.used < b.quota) {
                return { ...b, used: b.used + 1 };
            }
            return b;
        });
        setLocalBenefits(updatedBenefits);
        updateUser({ ...currentUser, benefits: updatedBenefits });
        showToast('✅ Request submitted! Our team will reach out within 2–3 business days.', 'success');
        setSelectedBenefit(null);
    };

    const BenefitCard: React.FC<{ benefit: Benefit, onClick: () => void }> = ({ benefit, onClick }) => {
        const Icon = iconMap[benefit.icon];
        const progressPercent = benefit.quota && benefit.used ? (benefit.used / benefit.quota) * 100 : 0;

        return (
            <Card onClick={onClick} className="flex flex-col">
                <div className="flex items-start gap-4">
                    <div className="bg-[var(--accent-bg-subtle)] text-[var(--accent-dark)] p-3 rounded-full">
                        {Icon && <Icon className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="font-playfair text-xl font-bold text-[var(--text-main)]">{benefit.title}</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{benefit.description}</p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex-grow">
                    {benefit.quota !== undefined && benefit.used !== undefined && (
                        <div>
                            <div className="flex justify-between text-sm font-medium text-[var(--text-muted)] mb-1">
                                <span>Usage</span>
                                <span>{benefit.used} of {benefit.quota} used</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-[var(--accent)] h-2.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                    )}
                    {benefit.nextDate && <p className="text-sm font-semibold text-[var(--text-main)]">Next scheduled: <span className="font-normal">{benefit.nextDate}</span></p>}
                    {benefit.status && <p className="text-sm font-semibold text-[var(--text-main)]">Status: <span className="font-normal text-success">{benefit.status}</span></p>}
                    {benefit.isIncluded && <p className="text-sm font-semibold text-success flex items-center gap-1"><CheckCircleIcon className="w-4 h-4" /> Included in your plan</p>}
                </div>
                {benefit.quota !== undefined && (
                    <div className="mt-4 text-right">
                        <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="py-2 px-4 bg-[var(--accent)] text-[var(--accent-text)] font-bold text-sm rounded-lg shadow-sm hover:bg-[var(--accent-light)]">
                            Request Now
                        </button>
                    </div>
                )}
            </Card>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Your Membership Benefits</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">See what’s included in your plan and how to make the most of your membership.</p>
            </div>

            <Card>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Your Current Plan</h2>
                        <div className="flex items-center gap-3 mt-2">
                             <span className={`px-4 py-1 text-sm font-bold rounded-full ${planColors[plan.name] || 'bg-gray-200'}`}>{plan.name}</span>
                             <span className="font-semibold text-[var(--text-main)]">{plan.rating}</span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mt-2">{plan.billingCycle} • Renews on {plan.renewalDate}</p>
                    </div>
                    <div className="flex gap-3 self-end md:self-center">
                        <button onClick={() => showToast('Coming soon', 'success')} className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">View Invoice</button>
                        <button onClick={() => showToast('Coming soon', 'success')} className="py-2.5 px-5 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">Upgrade Plan</button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {localBenefits.map((benefit, index) => (
                    <BenefitCard key={index} benefit={benefit} onClick={() => setSelectedBenefit(benefit)} />
                ))}
            </div>

            <UsageOverviewChart benefits={localBenefits} />
            
            <div className="bg-gradient-to-r from-gold to-gold-dark text-charcoal p-8 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                    <h2 className="font-playfair text-2xl font-bold">Ready to grow faster?</h2>
                    <p className="mt-1">Upgrade to Platinum and unlock unlimited SEO posts, faster reviews, and exclusive member promotions.</p>
                </div>
                <button onClick={() => showToast('Coming soon', 'success')} className="py-3 px-8 bg-charcoal text-white font-bold rounded-lg shadow-md hover:bg-charcoal-light transition-colors whitespace-nowrap">
                    Compare Plans
                </button>
            </div>
            
            {selectedBenefit && (
                <BenefitDetailModal 
                    benefit={localBenefits.find(b => b.title === selectedBenefit.title) || selectedBenefit} 
                    onClose={() => setSelectedBenefit(null)} 
                    onRequest={handleRequestBenefit}
                />
            )}
        </div>
    );
};


const PauseBillingModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; }> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 sm:p-8">
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Pause Billing</h2>
                    <p className="text-[var(--text-muted)] mb-6">Your subscription will be paused from your next renewal date. You will not be billed and your benefits will be temporarily suspended.</p>
                    <fieldset className="space-y-3">
                        <legend className="font-semibold text-[var(--text-main)]">Pause duration (dummy):</legend>
                        <label className="flex items-center gap-3 p-3 border rounded-lg"><input type="radio" name="pause-duration" className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> 1 Month</label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg"><input type="radio" name="pause-duration" className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> 3 Months</label>
                    </fieldset>
                </div>
                <div className="p-6 bg-[var(--bg-subtle)] sticky bottom-0 rounded-b-2xl flex flex-col sm:flex-row justify-end items-center gap-4">
                    <button onClick={onClose} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Cancel</button>
                    <button onClick={onConfirm} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">Confirm Pause</button>
                </div>
            </div>
        </div>
    );
};

const CancelSubscriptionModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; }> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 sm:p-8 text-center">
                    <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-error/10 text-error mb-4">
                        <ExclamationTriangleIcon className="w-8 h-8"/>
                    </div>
                    <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)] mb-4">Are you sure you want to cancel?</h2>
                    <p className="text-[var(--text-muted)] text-lg">Canceling will remove your active badge and network listing at the end of your current period. You will lose access to all your membership benefits.</p>
                </div>
                <div className="p-6 bg-[var(--bg-subtle)] sticky bottom-0 rounded-b-2xl flex flex-col-reverse sm:flex-row justify-center items-center gap-4">
                    <button onClick={onConfirm} className="w-full sm:w-auto py-2.5 px-6 bg-error text-white font-bold rounded-lg shadow-md hover:bg-red-600">Cancel at end of period</button>
                    <button onClick={onClose} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">Keep my subscription</button>
                </div>
            </div>
        </div>
    );
};


const MemberBilling: React.FC<{ showToast: (message: string, type: 'success' | 'error') => void; }> = ({ showToast }) => {
    const { currentUser, updateUser } = useAuth();
    const [localUser, setLocalUser] = useState(currentUser);
    const [isPauseModalOpen, setPauseModalOpen] = useState(false);
    const [isCancelModalOpen, setCancelModalOpen] = useState(false);

    useEffect(() => {
        setLocalUser(currentUser);
    }, [currentUser]);

    const handleCancelSubscription = () => {
        if (!localUser || !localUser.billing) return;
        const updatedUser = {
            ...localUser,
            billing: {
                ...localUser.billing,
                subscription: { ...localUser.billing.subscription, status: 'Canceled' as const }
            }
        };
        setLocalUser(updatedUser);
        updateUser(updatedUser); // Update context state
        setCancelModalOpen(false);
        showToast('Your subscription is scheduled for cancellation.', 'success');
    };
    
    if (!localUser || !localUser.billing) {
        return <Card><p>Billing information is not available.</p></Card>;
    }

    const { subscription, paymentMethod, invoices } = localUser.billing;

    const statusConfig = {
        'Active': { text: 'Active', color: 'bg-success/20 text-success' },
        'Past due': { text: 'Past Due', color: 'bg-warning/20 text-yellow-800' },
        'Canceled': { text: 'Ends on ' + subscription.renewalDate, color: 'bg-gray-200 text-gray-dark' },
    };
    const currentStatus = statusConfig[subscription.status];

    const getCardIcon = (brand: string) => {
        if (brand.toLowerCase() === 'visa') return <div className="font-bold text-blue-800 italic text-2xl">VISA</div>;
        if (brand.toLowerCase() === 'mastercard') return <div className="font-bold text-red-600">Mastercard</div>;
        return <CreditCardIcon className="w-8 h-8 text-gray-dark"/>;
    };
    
    const getInvoiceStatusColor = (status: Invoice['status']) => ({
        'Paid': 'bg-success/20 text-success',
        'Failed': 'bg-error/20 text-error',
        'Pending': 'bg-warning/20 text-yellow-800',
    }[status]);

    const NextPaymentStrip = () => {
        if (subscription.status === 'Past due') {
            return (
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-4">
                    <ExclamationTriangleIcon className="w-6 h-6 text-warning shrink-0" />
                    <div>
                        <p className="font-bold text-yellow-900">Your last payment failed.</p>
                        <p className="text-sm text-yellow-800">Please update your payment method to avoid interruption.</p>
                    </div>
                </div>
            )
        }
        if (subscription.status === 'Canceled') {
             return (
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center gap-4">
                    <ExclamationTriangleIcon className="w-6 h-6 text-[var(--text-muted)] shrink-0" />
                    <div>
                        <p className="font-bold text-[var(--text-main)]">Your subscription is scheduled to end on {subscription.renewalDate}.</p>
                        <p className="text-sm text-[var(--text-muted)]">Your badge and benefits will become inactive after that date.</p>
                    </div>
                </div>
            )
        }
        
        return (
            <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center gap-4">
                 <CreditCardIcon className="w-6 h-6 text-[var(--text-muted)] shrink-0" />
                 <p className="text-[var(--text-main)] sm:text-lg">
                    Next payment: <span className="font-bold">{subscription.price.split(' ')[0]} on {subscription.renewalDate}</span> • {subscription.planName} plan • Billed {subscription.billingCycle}
                 </p>
            </div>
        )
    };

    return (
        <>
            <PauseBillingModal 
                isOpen={isPauseModalOpen} 
                onClose={() => setPauseModalOpen(false)} 
                onConfirm={() => {
                    showToast('Your subscription will be paused starting from the next billing cycle.', 'success');
                    setPauseModalOpen(false);
                }}
            />
            <CancelSubscriptionModal 
                isOpen={isCancelModalOpen} 
                onClose={() => setCancelModalOpen(false)} 
                onConfirm={handleCancelSubscription}
            />

            <div className="animate-fade-in space-y-8">
                <div>
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Billing & Subscription</h1>
                    <p className="mt-2 text-lg text-[var(--text-muted)]">Manage your Restoration Expertise membership, payment details, and invoices.</p>
                </div>
                
                <NextPaymentStrip />

                <Card>
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Current Subscription</h2>
                            <div className="flex items-center gap-4 mt-2">
                                <p className="text-xl font-semibold text-[var(--text-main)]">{subscription.planName} – {subscription.price}</p>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${currentStatus.color}`}>{currentStatus.text}</span>
                            </div>
                            <p className="text-sm text-[var(--text-muted)] mt-2">
                                {subscription.status === 'Canceled' ? 'Access ends' : 'Next charge'}: {subscription.renewalDate} • Member since: {subscription.startedAt}
                            </p>
                        </div>
                        <div className="flex gap-3 self-end md:self-auto shrink-0">
                            <button onClick={() => showToast('This will be connected to Stripe later.', 'success')} className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Change plan</button>
                            <button onClick={() => showToast('This will be connected to Stripe later.', 'success')} className="py-2.5 px-5 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">Open customer portal</button>
                        </div>
                    </div>
                </Card>

                <Card className={subscription.status === 'Past due' ? 'border-2 border-warning' : ''}>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Payment Method</h2>
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-10 bg-gray-200 rounded-md flex items-center justify-center">
                                {getCardIcon(paymentMethod.brand)}
                            </div>
                            <div>
                                <p className="font-semibold text-[var(--text-main)]">{paymentMethod.brand} ending in {paymentMethod.last4}</p>
                                <p className="text-sm text-[var(--text-muted)]">Expires {paymentMethod.expiry}</p>
                                <p className="text-sm text-[var(--text-muted)] mt-1">Cardholder: {paymentMethod.cardholder}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 self-end md:self-auto shrink-0">
                            <button onClick={() => showToast('Card update flow will be handled by Stripe in the live version.', 'success')} className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Update card</button>
                            <button disabled className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Remove</button>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Invoice History</h2>
                    {/* Desktop Table */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-[var(--border-subtle)]">
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Invoice #</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Date</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Amount</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--text-muted)]">Status</th>
                                    <th className="py-3 px-4 text-right text-sm font-semibold text-[var(--text-muted)]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices?.map(invoice => (
                                    <tr key={invoice.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-subtle)]">
                                        <td className="py-3 px-4 text-[var(--text-main)] font-semibold">{invoice.id}</td>
                                        <td className="py-3 px-4 text-[var(--text-main)]">{invoice.date}</td>
                                        <td className="py-3 px-4 text-[var(--text-main)]">{invoice.amount}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getInvoiceStatusColor(invoice.status)}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button onClick={() => showToast('Download will be available in the live version.', 'success')} className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-dark)]"><ArrowDownTrayIcon className="w-5 h-5"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile List */}
                    <div className="space-y-4 md:hidden">
                        {invoices?.map(invoice => (
                            <div key={invoice.id} className="p-4 border border-[var(--border-subtle)] rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-[var(--text-main)]">{invoice.id}</p>
                                        <p className="text-sm text-[var(--text-muted)]">{invoice.date}</p>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getInvoiceStatusColor(invoice.status)}`}>
                                        {invoice.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-[var(--border-subtle)]">
                                    <p className="font-semibold text-[var(--text-main)]">{invoice.amount}</p>
                                    <button onClick={() => showToast('Download will be available in the live version.', 'success')} className="flex items-center gap-2 py-1 px-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg text-sm font-semibold">
                                        <ArrowDownTrayIcon className="w-4 h-4"/> PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-2">Manage Subscription</h2>
                    <p className="text-[var(--text-muted)] mb-6">Control your membership status. Changes here will affect your access to benefits and your badge.</p>
                    {subscription.status === 'Canceled' ? (
                        <div className="p-4 bg-[var(--bg-subtle)] rounded-lg text-center text-[var(--text-muted)] font-medium">
                            Subscription already scheduled for cancellation.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button onClick={() => setPauseModalOpen(true)} className="py-3 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Pause billing</button>
                            <button onClick={() => setCancelModalOpen(true)} className="py-3 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm text-error hover:bg-error/5">Cancel subscription</button>
                            <button onClick={() => showToast('Use the payment method section above to update your card.', 'success')} className="py-3 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Update billing details</button>
                        </div>
                    )}
                </Card>

            </div>
        </>
    );
};

const communityEvents = [
    {
        title: "Monthly Owner Roundtable",
        date: "March 5, 2025 – 3:00 PM CST",
        type: "Zoom Call",
        tier: null
    },
    {
        title: "Website & SEO Hotseat",
        date: "March 18, 2025 – 2:00 PM CST",
        type: "Workshop",
        tier: "Gold+"
    },
    {
        title: "Badge Optimization Workshop",
        date: "April 2, 2025 – 4:00 PM CST",
        type: "Workshop",
        tier: null
    }
];

const communityResources = [
    {
        title: "Start Here: Onboarding Post",
        description: "New to the group? Introduce yourself and get the lay of the land.",
        icon: StarIcon,
        link: "#"
    },
    {
        title: "Monthly Wins Thread",
        description: "Share your recent victories, big or small. Let's celebrate together.",
        icon: TrophyIcon,
        link: "#"
    },
    {
        title: "Website & SEO Review Thread",
        description: "Get feedback on your site from the community and our team.",
        icon: MagnifyingGlassIcon,
        link: "#"
    },
    {
        title: "Hiring & Operations Thread",
        description: "Discuss challenges and solutions for finding and managing great people.",
        icon: BriefcaseIcon,
        link: "#"
    }
];

const MemberCommunity: React.FC<{ onNavigate: (view: MemberView) => void; }> = ({ onNavigate }) => {
    const { currentUser } = useAuth();
    const guidelinesRef = useRef<HTMLDivElement>(null);
    const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
    const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);


    const handleScrollToGuidelines = () => {
        guidelinesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const communityHighlights = [
        {
            title: "Case study: How XYZ Restoration added $40k/mo with SEO + reviews.",
            snippet: "John from XYZ breaks down the exact steps he took to dominate local search results, from optimizing his Google Business Profile to implementing a simple, effective review generation system.",
            link: "#"
        },
        {
            title: "Discussion: Should you niche into water only or stay full service?",
            snippet: "A lively debate on the pros and cons of specializing vs. being a one-stop-shop. See what other successful owners are doing and why.",
            link: "#"
        },
        {
            title: "Win: Member landed a $15k fire job from a website badge visitor.",
            snippet: "Sarah shares how a homeowner found her through the Restoration Expertise network and specifically mentioned the verification badge as the deciding factor.",
            link: "#"
        }
    ];

    const whyJoinBenefits = [
        "Real talk from other owners, not theory.",
        "Feedback on your website, offers and systems.",
        "First access to new tools, templates and calls.",
        "Priority answers from the Restoration Expertise team."
    ];

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Community Hub</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">Connect with other restoration owners, share wins, and get support from our team.</p>
            </div>

            {/* Hero Card */}
            <Card className="!p-0 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-3">
                    <div className="lg:col-span-2 p-8 bg-[var(--accent-bg-subtle)]">
                        <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)] mb-4">Join the Restoration Expertise Community</h2>
                        <p className="text-[var(--text-muted)] mb-6 max-w-xl">
                            Ask questions, share best practices, and learn from other verified restoration companies in our private, members-only group.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a href="https://facebook.com/groups/restorationexpertise" target="_blank" rel="noopener noreferrer" className="py-3 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)] text-center">
                                Join Private Facebook Group
                            </a>
                            <button onClick={handleScrollToGuidelines} className="py-3 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold text-[var(--text-main)] shadow-sm hover:bg-[var(--bg-subtle)]">
                                Community Guidelines
                            </button>
                        </div>
                    </div>
                    <div className="lg:col-span-1 bg-[var(--accent-bg-subtle)] p-8 flex flex-col justify-center">
                        <h3 className="font-semibold text-[var(--text-main)] mb-4">Community Stats</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <UsersIcon className="w-6 h-6 text-[var(--accent-dark)]" />
                                <p className="text-[var(--text-main)]"><span className="font-bold text-xl">134</span> members</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6 text-[var(--accent-dark)]" />
                                <p className="text-[var(--text-main)]"><span className="font-bold text-xl">18</span> posts, <span className="font-bold text-xl">42</span> comments this week</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Why Join Card */}
            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Why join?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {whyJoinBenefits.map((benefit, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <div className="bg-success/10 text-success p-1.5 rounded-full mt-1">
                                <CheckIcon className="w-4 h-4" />
                            </div>
                            <p className="text-[var(--text-main)]">{benefit}</p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Community Highlights Card */}
            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Community Highlights</h2>
                <div className="space-y-6">
                    {communityHighlights.map((item, index) => (
                        <div key={index} className="pb-6 border-b border-[var(--border-subtle)] last:border-b-0 last:pb-0">
                            <h3 className="font-bold text-lg text-[var(--text-main)] mb-2">{item.title}</h3>
                            <p className="text-[var(--text-muted)] mb-3">{item.snippet}</p>
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--accent-dark)] hover:underline">
                                View in group →
                            </a>
                        </div>
                    ))}
                </div>
            </Card>
            
            {/* Guidelines Card */}
            <div ref={guidelinesRef} className="scroll-mt-20">
                 <Card>
                    <button onClick={() => setIsGuidelinesOpen(!isGuidelinesOpen)} className="w-full flex justify-between items-center text-left">
                        <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Community Guidelines</h2>
                        <ChevronDownIcon className={`w-6 h-6 text-[var(--text-muted)] transition-transform ${isGuidelinesOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isGuidelinesOpen && (
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] animate-fade-in">
                            <ul className="list-disc list-inside space-y-2 text-[var(--text-muted)]">
                                <li>Respect confidentiality. No sharing sensitive client details.</li>
                                <li>No spam or cold pitching other members.</li>
                                <li>Keep discussions focused on restoration and business growth.</li>
                                <li>Constructive feedback only; no drama.</li>
                                <li>One promo post per month in the designated thread.</li>
                                <li>Violation may lead to temporary or permanent removal.</li>
                            </ul>
                            <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={agreedToGuidelines} onChange={e => setAgreedToGuidelines(e.target.checked)} className="h-5 w-5 rounded border-[var(--border-subtle)] text-[var(--accent)] focus:ring-[var(--accent)]"/>
                                    <span className="font-semibold text-[var(--text-main)]">I’ve read and agree to the community guidelines</span>
                                </label>
                                {agreedToGuidelines && (
                                    <p className="mt-3 text-sm text-success font-semibold bg-success/10 p-2 rounded-md animate-fade-in">
                                        Nice. You’re good to go — see you inside the group.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Upcoming Events Card */}
            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Upcoming Calls & Events</h2>
                <div className="space-y-4">
                    {communityEvents.map((event, index) => (
                        <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)]">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-bold text-lg text-[var(--text-main)]">{event.title}</h3>
                                    {event.tier && <span className="text-xs font-bold px-2 py-0.5 bg-gold/20 text-gold-dark rounded-full">{event.tier} members</span>}
                                </div>
                                <p className="text-sm text-[var(--text-muted)] mt-1">{event.date} • {event.type}</p>
                            </div>
                            <button className="py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold text-[var(--text-main)] shadow-sm hover:bg-[var(--bg-subtle)] text-sm whitespace-nowrap self-end sm:self-center">
                                Add to calendar
                            </button>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Resources Card */}
            <Card>
                <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Community Resources</h2>
                <div className="space-y-4">
                    {communityResources.map((resource, index) => {
                        const Icon = resource.icon;
                        return (
                            <a href={resource.link} key={index} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 p-4 rounded-lg hover:bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--border-subtle)] transition-colors group">
                                <div className="bg-gold/10 text-gold-dark p-3 rounded-full mt-1">
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-[var(--text-main)]">{resource.title}</h3>
                                    <p className="text-sm text-[var(--text-muted)]">{resource.description}</p>
                                    <span className="mt-2 inline-block font-semibold text-gold-dark text-sm group-hover:underline">Open in group →</span>
                                </div>
                            </a>
                        );
                    })}
                </div>
            </Card>
            
            {currentUser?.plan?.name === 'Bronze' && (
                <div className="mt-8 p-6 bg-gradient-to-r from-charcoal to-charcoal-dark text-white rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                        <h3 className="font-playfair text-xl font-bold">Unlock Full Community Access</h3>
                        <p className="text-gray-light mt-1">Some community calls are reserved for Gold members. Upgrade in Billing to unlock full access.</p>
                    </div>
                    <button onClick={() => onNavigate('billing')} className="py-2.5 px-6 bg-gold text-charcoal font-bold rounded-lg shadow-md hover:bg-gold-light whitespace-nowrap">
                        Upgrade in Billing
                    </button>
                </div>
            )}
        </div>
    );
};


const DeleteAccountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    companyName: string;
}> = ({ isOpen, onClose, onConfirm, companyName }) => {
    const [confirmInput, setConfirmInput] = useState('');
    const isMatch = confirmInput === companyName;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative animate-slide-up" onClick={e => e.stopPropagation()}>
                 <div className="p-6 sm:p-8">
                    <div className="text-center">
                         <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-error/10 text-error mb-4">
                            <ExclamationTriangleIcon className="w-8 h-8"/>
                        </div>
                        <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)]">Delete Account</h2>
                    </div>
                    <p className="text-[var(--text-muted)] text-center mt-4 text-lg">
                        Deleting your account will remove your badge, listings, and access to the Member Hub.
                        <br/>
                        <span className="font-bold text-error">This action is permanent and cannot be undone.</span>
                    </p>
                    <div className="mt-6">
                        <label htmlFor="company-name-confirm" className="block text-sm font-medium text-[var(--text-muted)]">
                           To confirm, please type "<span className="font-bold text-[var(--text-main)]">{companyName}</span>" below:
                        </label>
                        <input
                            id="company-name-confirm"
                            type="text"
                            value={confirmInput}
                            onChange={(e) => setConfirmInput(e.target.value)}
                            className="mt-1 block w-full p-3 border border-[var(--border-subtle)] rounded-lg shadow-sm focus:ring-[var(--accent)] focus:border-[var(--accent)] bg-[var(--bg-input)]"
                        />
                    </div>
                 </div>
                <div className="p-6 bg-[var(--bg-subtle)] flex flex-col sm:flex-row justify-end items-center gap-4">
                    <button onClick={onClose} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Cancel</button>
                    <button
                        onClick={onConfirm}
                        disabled={!isMatch}
                        className="w-full sm:w-auto py-2.5 px-6 bg-error text-white font-bold rounded-lg shadow-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    )
}

const MemberSettings: React.FC<{
    showToast: (message: string, type: 'success' | 'error') => void;
    onNavigate: (view: MemberView) => void;
}> = ({ showToast, onNavigate }) => {
    const { currentUser, updateUser } = useAuth();

    // Account Info State
    const [isAccountEditing, setIsAccountEditing] = useState(false);
    const [accountData, setAccountData] = useState({
        ownerName: currentUser?.account?.ownerName || currentUser?.name || '',
        ownerEmail: currentUser?.account?.ownerEmail || currentUser?.email || '',
    });

    // Security State
    const [confirmOnNewDevice, setConfirmOnNewDevice] = useState(true);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    // Preferences State
    const [preferences, setPreferences] = useState({
        timezone: 'US/Central',
        dateFormat: 'MM/DD/YYYY',
    });
    
    // Notifications State
    const [notifications, setNotifications] = useState(currentUser?.notifications || {
        documentStatus: true, verificationStatus: true, requestUpdates: true,
        benefitDelivery: false, billingUpdates: true, communityUpdates: true,
        emailFrequency: 'real-time' as const,
    });

    // Danger Zone State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setAccountData({
                ownerName: currentUser.account?.ownerName || currentUser.name,
                ownerEmail: currentUser.account?.ownerEmail || currentUser.email,
            });
            if (currentUser.notifications) {
                setNotifications(currentUser.notifications);
            }
        }
    }, [currentUser]);

    if (!currentUser || !currentUser.account) return null;

    const handleAccountSave = () => {
        if (!currentUser) return;
        const updatedUser = {
            ...currentUser,
            account: {
                ...currentUser.account,
                ...accountData,
            }
        };
        updateUser(updatedUser);
        setIsAccountEditing(false);
        showToast('Account info updated.', 'success');
    };

    const handleAccountCancel = () => {
        setAccountData({
            ownerName: currentUser.account?.ownerName || '',
            ownerEmail: currentUser.account?.ownerEmail || '',
        });
        setIsAccountEditing(false);
    };

    const handleLogoutAll = () => {
        setIsLogoutModalOpen(false);
        showToast('All active sessions have been cleared (dummy state).', 'success');
    };

    const handlePreferencesSave = () => {
        // In a real app, this would be saved to the user's profile
        console.log('Preferences saved:', preferences);
        showToast('Preferences saved.', 'success');
    };
    
    const handleNotificationsSave = () => {
        if (!currentUser) return;
        const updatedUser = {
            ...currentUser,
            notifications: notifications,
        };
        updateUser(updatedUser);
        showToast('Notification settings saved.', 'success');
    };

    const handleExportConfirm = () => {
        setIsExportModalOpen(false);
        showToast('Data export will be available in the full version.', 'success');
    };
    
    const handleDeleteConfirm = () => {
        setIsDeleteModalOpen(false);
        showToast('Account deletion will be handled by support in the live version.', 'success');
    };


    const NotificationToggle: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; }> = ({ label, checked, onChange }) => (
        <label className="flex justify-between items-center cursor-pointer p-3 hover:bg-[var(--bg-subtle)] rounded-lg">
            <span className="font-medium text-[var(--text-main)]">{label}</span>
            <input type="checkbox" className="toggle-checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        </label>
    );

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <style>{`
                .toggle-checkbox { -webkit-appearance: none; -moz-appearance: none; appearance: none; width: 3rem; height: 1.5rem; background-color: #E5E7EB; border-radius: 9999px; position: relative; cursor: pointer; transition: background-color 0.2s ease-in-out; }
                html[data-theme='dark'] .toggle-checkbox { background-color: #4A4A4A; }
                .toggle-checkbox::before { content: ''; position: absolute; width: 1.25rem; height: 1.25rem; border-radius: 9999px; background-color: white; top: 2px; left: 2px; transition: transform 0.2s ease-in-out; }
                .toggle-checkbox:checked { background-color: var(--accent); }
                .toggle-checkbox:checked::before { transform: translateX(1.5rem); }
            `}</style>

            <ConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onSubmit={handleLogoutAll}
                title="Log out of all devices?"
                message="This will sign you out of all other active sessions. Your current session will remain active."
                confirmButtonText="Yes, Log Out All"
                confirmButtonClass="bg-error text-white hover:bg-red-600"
            />
            <ConfirmationModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                onSubmit={handleExportConfirm}
                title="Export Account Data"
                message="We’ll prepare an export of your profile, documents metadata and billing records."
                confirmButtonText="Start Export"
                confirmButtonClass="bg-gold text-charcoal hover:bg-gold-light"
            />
             <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                companyName={currentUser.account.companyName}
            />
            
            <div className="space-y-8">
                <div>
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">Settings</h1>
                    <p className="mt-2 text-lg text-[var(--text-muted)]">Manage your account details, sign-in preferences, and basic settings.</p>
                </div>

                {/* Account Information Card */}
                <Card>
                    <div className="flex justify-between items-start mb-4">
                        <div><h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Account Information</h2></div>
                        {!isAccountEditing && (
                            <button onClick={() => setIsAccountEditing(true)} className="flex items-center gap-2 py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-sm font-semibold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] text-sm"><PencilSquareIcon className="w-4 h-4" /> Edit</button>
                        )}
                    </div>
                    {isAccountEditing ? (
                        <div className="space-y-4 animate-fade-in">
                            <div><label className="text-sm font-medium text-[var(--text-muted)]">Account Owner Name</label><input type="text" value={accountData.ownerName} onChange={e => setAccountData({...accountData, ownerName: e.target.value})} className="mt-1 block w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)]" /></div>
                            <div><label className="text-sm font-medium text-[var(--text-muted)]">Account Email</label><input type="email" value={accountData.ownerEmail} onChange={e => setAccountData({...accountData, ownerEmail: e.target.value})} className="mt-1 block w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)]" /></div>
                            <div><p className="text-sm text-[var(--text-muted)]">Role</p><p className="font-semibold text-[var(--text-muted)] bg-[var(--bg-subtle)] p-3 rounded-lg">{currentUser.account.role}</p></div>
                            <div><p className="text-sm text-[var(--text-muted)]">Company Name</p><p className="font-semibold text-[var(--text-muted)] bg-[var(--bg-subtle)] p-3 rounded-lg">{currentUser.account.companyName}</p></div>
                            <div className="flex justify-end gap-4 pt-2">
                                <button onClick={handleAccountCancel} className="py-2 px-5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg font-semibold">Cancel</button>
                                <button onClick={handleAccountSave} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Save Changes</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div><p className="text-sm text-[var(--text-muted)]">Account Owner Name</p><p className="font-semibold text-[var(--text-main)]">{accountData.ownerName}</p></div>
                            <div><p className="text-sm text-[var(--text-muted)]">Account Email</p><p className="font-semibold text-[var(--text-main)]">{accountData.ownerEmail}</p></div>
                            <div><p className="text-sm text-[var(--text-muted)]">Role</p><p className="font-semibold text-[var(--text-main)]">{currentUser.account.role}</p></div>
                            <div><p className="text-sm text-[var(--text-muted)]">Company Name</p><button onClick={() => onNavigate('profile')} className="font-semibold text-[var(--accent-dark)] hover:underline">{currentUser.account.companyName}</button></div>
                        </div>
                    )}
                </Card>

                {/* Sign-in & Security Card */}
                <Card>
                    <div className="flex justify-between items-start mb-4"><h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Sign-in & Security</h2></div>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center p-3 bg-[var(--bg-subtle)] rounded-lg"><span className="font-medium text-[var(--text-main)]">Login method</span><span className="font-semibold text-[var(--text-muted)]">Email magic link</span></div>
                        <label className="flex justify-between items-center cursor-pointer"><span className="font-medium text-[var(--text-main)] max-w-xs sm:max-w-none">Require confirmation for new logins from unknown devices</span><input type="checkbox" className="toggle-checkbox" checked={confirmOnNewDevice} onChange={e => setConfirmOnNewDevice(e.target.checked)} /></label>
                        <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row gap-4">
                            <button onClick={() => setIsLogoutModalOpen(true)} className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Log out of all devices</button>
                            <button onClick={() => showToast('Verification email resent.', 'success')} className="py-2.5 px-5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Resend verification email</button>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">Security features like 2FA and device history will be added in the full version.</p>
                    </div>
                </Card>

                {/* Preferences Card */}
                <Card>
                    <div className="flex justify-between items-start mb-4"><h2 className="font-playfair text-2xl font-bold text-[var(--text-main)]">Preferences</h2></div>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Timezone</label>
                            <select value={preferences.timezone} onChange={e => setPreferences({...preferences, timezone: e.target.value})} className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-card)] focus:ring-[var(--accent)] focus:border-[var(--accent)]">
                                <option>US/Pacific</option>
                                <option>US/Mountain</option>
                                <option>US/Central</option>
                                <option>US/Eastern</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Date Format</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2"><input type="radio" name="date-format" value="MM/DD/YYYY" checked={preferences.dateFormat === 'MM/DD/YYYY'} onChange={e => setPreferences({...preferences, dateFormat: e.target.value})} className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> MM/DD/YYYY</label>
                                <label className="flex items-center gap-2"><input type="radio" name="date-format" value="DD/MM/YYYY" checked={preferences.dateFormat === 'DD/MM/YYYY'} onChange={e => setPreferences({...preferences, dateFormat: e.target.value})} className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> DD/MM/YYYY</label>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-[var(--bg-subtle)] rounded-lg"><span className="font-medium text-[var(--text-main)]">Currency</span><span className="font-semibold text-[var(--text-muted)]">USD (United States Dollar)</span></div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-right">
                        <button onClick={handlePreferencesSave} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Save Preferences</button>
                    </div>
                </Card>

                {/* Notification Preferences Card */}
                <Card>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Notification Preferences</h2>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-[var(--text-muted)] mb-2">Documents & Verification</h3>
                            <NotificationToggle label="Email me when a document is approved or rejected" checked={notifications.documentStatus} onChange={c => setNotifications(p => ({...p, documentStatus: c}))} />
                            <NotificationToggle label="Email me when my verification status changes" checked={notifications.verificationStatus} onChange={c => setNotifications(p => ({...p, verificationStatus: c}))} />
                        </div>
                        <div className="pt-4 border-t border-[var(--border-subtle)]">
                            <h3 className="font-semibold text-[var(--text-muted)] mb-2">Benefits & Requests</h3>
                            <NotificationToggle label="Email me when a new request is created or updated" checked={notifications.requestUpdates} onChange={c => setNotifications(p => ({...p, requestUpdates: c}))} />
                            <NotificationToggle label="Email me when a benefit (e.g. SEO post) is delivered" checked={notifications.benefitDelivery} onChange={c => setNotifications(p => ({...p, benefitDelivery: c}))} />
                        </div>
                        <div className="pt-4 border-t border-[var(--border-subtle)]">
                            <h3 className="font-semibold text-[var(--text-muted)] mb-2">Billing</h3>
                            <NotificationToggle label="Email me about upcoming renewals and failed payments" checked={notifications.billingUpdates} onChange={c => setNotifications(p => ({...p, billingUpdates: c}))} />
                        </div>
                        <div className="pt-4 border-t border-[var(--border-subtle)]">
                            <h3 className="font-semibold text-[var(--text-muted)] mb-2">Community</h3>
                            <NotificationToggle label="Email me about new events and important announcements" checked={notifications.communityUpdates} onChange={c => setNotifications(p => ({...p, communityUpdates: c}))} />
                        </div>
                    </div>
                </Card>

                {/* Email Frequency Card */}
                <Card>
                    <h2 className="font-playfair text-2xl font-bold text-[var(--text-main)] mb-4">Email Frequency</h2>
                    <fieldset className="space-y-3">
                        <label className="flex items-center gap-3"><input type="radio" name="email-frequency" value="real-time" checked={notifications.emailFrequency === 'real-time'} onChange={e => setNotifications(p=>({...p, emailFrequency: e.target.value as any}))} className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> Real-time (recommended)</label>
                        <label className="flex items-center gap-3"><input type="radio" name="email-frequency" value="daily" checked={notifications.emailFrequency === 'daily'} onChange={e => setNotifications(p=>({...p, emailFrequency: e.target.value as any}))} className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> Daily summary</label>
                        <label className="flex items-center gap-3"><input type="radio" name="email-frequency" value="weekly" checked={notifications.emailFrequency === 'weekly'} onChange={e => setNotifications(p=>({...p, emailFrequency: e.target.value as any}))} className="h-4 w-4 text-[var(--accent)] focus:ring-[var(--accent)]"/> Weekly summary</label>
                    </fieldset>
                    <p className="text-sm text-[var(--text-muted)] mt-4">We’ll include documents, requests and community highlights in your summary emails.</p>
                     <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-right">
                        <button onClick={handleNotificationsSave} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg font-bold">Save Notification Settings</button>
                    </div>
                </Card>

                {/* Danger Zone Card */}
                <Card className="border-error">
                    <h2 className="font-playfair text-2xl font-bold text-error">Danger Zone</h2>
                    <div className="mt-6 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-[var(--bg-subtle)] rounded-lg">
                            <div>
                                <h3 className="font-bold text-[var(--text-main)]">Export account data</h3>
                                <p className="text-sm text-[var(--text-muted)]">Download your profile, documents metadata, and billing records.</p>
                            </div>
                            <button onClick={() => setIsExportModalOpen(true)} className="py-2 px-4 mt-2 sm:mt-0 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold text-[var(--text-main)] shadow-sm hover:bg-[var(--bg-subtle)] whitespace-nowrap">Export Data</button>
                        </div>
                         <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-error/5 rounded-lg">
                            <div>
                                <h3 className="font-bold text-error">Delete account</h3>
                                <p className="text-sm text-red-800">Permanently remove your account and all associated data.</p>
                            </div>
                            <button onClick={() => setIsDeleteModalOpen(true)} className="py-2 px-4 mt-2 sm:mt-0 bg-error text-white font-bold rounded-lg shadow-sm hover:bg-red-600 whitespace-nowrap">Delete Account</button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---

const viewTitles: Record<MemberView, string> = {
    overview: 'Overview',
    'my-requests': 'My Service Requests',
    profile: 'Business Profile',
    badge: 'My Badge',
    documents: 'Verification Documents',
    benefits: 'Your Membership Benefits',
    billing: 'Billing & Subscription',
    community: 'Community Hub',
    blueprint: '99 Steps Blueprint',
    settings: 'Settings',
};


const MemberDashboard: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const [activeView, setActiveView] = useState<MemberView>('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isUserMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isNewRequestModalOpen, setNewRequestModalOpen] = useState(false);

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
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleViewChange = (view: MemberView) => {
        setActiveView(view);
        setIsSidebarOpen(false);
    };

    const docsNeedAttention = documentsData.some(doc => ['notUploaded', 'needsReplacement', 'rejected'].includes(doc.status));

    const renderView = () => {
        switch (activeView) {
            case 'overview':
                return <MemberOverview onNavigate={setActiveView} onNewRequest={() => setNewRequestModalOpen(true)} />;
            case 'my-requests':
                return <MyRequests onNewRequest={() => setNewRequestModalOpen(true)} showToast={showToast} />;
            case 'profile':
                return <MemberProfile showToast={showToast} />;
            case 'badge':
                 return <MemberBadge onNavigate={setActiveView} showToast={showToast} />;
            case 'documents':
                return <MemberDocuments onNavigate={setActiveView} />;
            case 'benefits':
                return <MemberBenefits showToast={showToast} />;
            case 'billing':
                return <MemberBilling showToast={showToast} />;
            case 'community':
                return <MemberCommunity onNavigate={setActiveView} />;
            case 'blueprint':
                return <MemberBlueprint onNavigate={setActiveView} />;
            case 'settings':
                 return <MemberSettings showToast={showToast} onNavigate={setActiveView} />;
            default:
                return null;
        }
    };

    const NavItems = (
        <>
            <SidebarLink icon={<HomeIcon className="w-6 h-6" />} label="Overview" isActive={activeView === 'overview'} onClick={() => handleViewChange('overview')} />
            <SidebarLink icon={<ListBulletIcon className="w-6 h-6" />} label="My Requests" isActive={activeView === 'my-requests'} onClick={() => handleViewChange('my-requests')} />
            <SidebarLink icon={<UserCircleIcon className="w-6 h-6" />} label="Profile" isActive={activeView === 'profile'} onClick={() => handleViewChange('profile')} />
            <SidebarLink icon={<TrophyIcon className="w-6 h-6" />} label="Badge" isActive={activeView === 'badge'} onClick={() => handleViewChange('badge')} />
            <SidebarLink icon={<DocumentTextIcon className="w-6 h-6" />} label="Documents" isActive={activeView === 'documents'} onClick={() => handleViewChange('documents')} attention={docsNeedAttention} />
            <SidebarLink icon={<StarIcon className="w-6 h-6" />} label="Benefits" isActive={activeView === 'benefits'} onClick={() => handleViewChange('benefits')} />
            <SidebarLink icon={<CreditCardIcon className="w-6 h-6" />} label="Billing" isActive={activeView === 'billing'} onClick={() => handleViewChange('billing')} />
            <SidebarLink icon={<UsersIcon className="w-6 h-6" />} label="Community" isActive={activeView === 'community'} onClick={() => handleViewChange('community')} />
            <SidebarLink icon={<ClipboardDocumentCheckIcon className="w-6 h-6" />} label="99 Steps Blueprint" isActive={activeView === 'blueprint'} onClick={() => handleViewChange('blueprint')} />
            <SidebarLink icon={<Cog6ToothIcon className="w-6 h-6" />} label="Settings" isActive={activeView === 'settings'} onClick={() => handleViewChange('settings')} />
        </>
    );

    return (
        <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-inter">
             {toast && (
                <div className={`fixed top-20 right-8 z-[100] py-3 px-5 rounded-lg shadow-lg text-white animate-slide-in-right ${toast.type === 'success' ? 'bg-success' : 'bg-error'}`}>
                    {toast.message}
                </div>
            )}
             {isNewRequestModalOpen && (
                <NewRequestModal 
                    onClose={() => setNewRequestModalOpen(false)} 
                    showToast={showToast}
                />
             )}
             {/* Mobile Sidebar Overlay */}
            <div className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)}></div>
            
            {/* Sidebar */}
            <aside className={`fixed md:relative top-0 left-0 h-full z-50 w-64 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="px-6 py-4 flex items-center border-b border-[var(--border-subtle)] h-16 shrink-0">
                    <img src="https://restorationexpertise.com/wp-content/uploads/2025/11/Restorationexpertise_ig_profilepic_2_small.webp" alt="Logo" className="w-8 h-8 mr-2"/>
                    <h1 className="font-playfair text-xl font-bold text-[var(--text-main)]">Member Hub</h1>
                </div>
                <nav className="flex-grow p-4 space-y-1 overflow-y-auto">{NavItems}</nav>
                <div className="p-4 border-t border-[var(--border-subtle)] space-y-4">
                    <ThemeToggle variant="row" />
                    <button onClick={() => void logout()} className="flex items-center w-full px-4 py-3 rounded-lg text-left text-[var(--text-muted)] hover:bg-red-500/10 hover:text-error transition-colors">
                        <ArrowRightOnRectangleIcon className="w-6 h-6" /><span className="ml-3 font-semibold">Logout</span>
                    </button>
                </div>
            </aside>
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="sticky top-0 z-30 bg-[var(--bg-card)] shadow-sm border-b border-[var(--border-subtle)] h-16 flex items-center justify-between px-4 md:px-6 shrink-0">
                    {/* Hamburger Menu (Mobile) */}
                    <button onClick={() => setIsSidebarOpen(true)} className="text-[var(--text-main)] md:hidden">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    
                    {/* Dynamic Page Title */}
                     <h1 className="font-playfair text-xl md:text-2xl font-bold text-[var(--text-main)]">{viewTitles[activeView]}</h1>

                    {/* User Menu */}
                    <div className="flex items-center gap-2">
                        <ThemeToggle variant="icon" />
                        <div className="relative" ref={userMenuRef}>
                            <button onClick={() => setUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-2">
                                <div className="w-9 h-9 bg-[var(--accent-bg-subtle)] rounded-full flex items-center justify-center">
                                    <UserCircleIcon className="w-6 h-6 text-[var(--accent-dark)]"/>
                                </div>
                                <span className="hidden sm:inline font-semibold text-sm">{currentUser?.name}</span>
                            </button>
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-card)] rounded-lg shadow-xl border border-[var(--border-subtle)] z-50 animate-fade-in">
                                    <a href="#" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">View Public Profile</a>
                                    <a href="#" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">Account Settings</a>
                                    <a href="#" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">Billing</a>
                                    <a href="#" className="block px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)]">Help & Support</a>
                                    <div className="border-t border-[var(--border-subtle)] my-1"></div>
                                    <button onClick={() => void logout()} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-[var(--bg-subtle)]">Logout</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                        {renderView()}
                    </div>
                </main>
            </div>
        </div>
    );
};

// --- Modals for MyRequests ---

const RequestDetailModal: React.FC<{
    request: ServiceRequest;
    onClose: () => void;
    statusColors: { [key: string]: string };
    serviceIcons: { [key: string]: React.FC<{ className?: string }> };
    onMarkResolved: (id: string) => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}> = ({ request, onClose, statusColors, serviceIcons, onMarkResolved, showToast }) => {
    const { currentUser } = useAuth();
    const ServiceIcon = serviceIcons[request.service] || ClipboardIcon;
    const canResolve = request.status === 'Open' || request.status === 'In progress';

    const linkedBenefit = useMemo(() => {
        if (!currentUser?.benefits) return null;
        const serviceToBenefitMap: { [key: string]: string } = {
            'SEO Blog Post': 'SEO Blog Posts',
            'Website Review': 'Quarterly Website Review',
        };
        const benefitTitle = serviceToBenefitMap[request.service];
        if (!benefitTitle) return null;
        
        return currentUser.benefits.find(b => b.title === benefitTitle);
    }, [currentUser?.benefits, request.service]);

    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-2xl md:max-h-[90vh] flex flex-col h-full md:h-auto" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-start">
                    <div>
                        <h2 className="font-playfair text-2xl md:text-3xl font-bold text-[var(--text-main)]">{request.title}</h2>
                        <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] mt-2">
                            <span className="flex items-center gap-1.5"><ServiceIcon className="w-4 h-4" /> {request.service}</span>
                            <span>•</span>
                            <span>{request.id}</span>
                            <span>•</span>
                            <span>{request.date}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 -mt-2 -mr-2"><XMarkIcon className="w-7 h-7"/></button>
                </header>
                
                <div className="p-6 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <div>
                                <h3 className="font-semibold text-[var(--text-main)] mb-2">Description</h3>
                                <p className="text-[var(--text-muted)] whitespace-pre-wrap">{request.description || 'No description provided.'}</p>
                            </div>
                            {request.attachments && request.attachments.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-[var(--text-main)] mb-2">Attachments</h3>
                                    <ul className="space-y-2">
                                        {request.attachments.map(file => (
                                            <li key={file.name} className="flex items-center justify-between p-2 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)]">
                                                <div className="flex items-center gap-2">
                                                    <ArrowDownTrayIcon className="w-5 h-5 text-[var(--text-muted)]"/>
                                                    <span className="font-medium text-[var(--text-main)]">{file.name}</span>
                                                    <span className="text-sm text-[var(--text-muted)]">({file.size})</span>
                                                </div>
                                                <button className="text-sm font-semibold text-[var(--accent-dark)] hover:underline">Download</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div>
                                <h3 className="font-semibold text-[var(--text-main)] mb-2">Add Comment</h3>
                                <textarea rows={3} placeholder="Add an update or ask a question..." className="w-full p-2 border rounded-lg focus:ring-[var(--accent)] focus:border-[var(--accent)] bg-[var(--bg-input)]"></textarea>
                                <div className="text-right mt-2">
                                    <button onClick={() => showToast("Comments are for display only.", "success")} className="py-2 px-5 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-sm hover:bg-[var(--accent-light)]">Send</button>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-1 space-y-6">
                             <div className="p-4 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)]">
                                <h3 className="font-semibold text-[var(--text-main)] mb-2">Status</h3>
                                <span className={`px-3 py-1 text-sm font-bold rounded-full ${statusColors[request.status]}`}>{request.status}</span>
                                {linkedBenefit && (
                                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                        <h4 className="text-xs font-semibold uppercase text-[var(--text-muted)]">Linked Benefit</h4>
                                        <p className="text-sm font-semibold text-[var(--text-main)] mt-1">{linkedBenefit.title}</p>
                                        <p className="text-sm text-[var(--text-muted)]">{linkedBenefit.used} of {linkedBenefit.quota} used</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--text-main)] mb-3">Timeline</h3>
                                <ul className="space-y-4">
                                    {request.timeline?.map((item, index) => (
                                        <li key={index} className="flex items-start gap-3 relative">
                                            <div className={`absolute left-2.5 top-2.5 w-0.5 h-full ${index === request.timeline!.length - 1 ? '' : 'bg-[var(--border-subtle)]'}`}></div>
                                            <div className="w-5 h-5 bg-[var(--accent)] rounded-full z-10"></div>
                                            <div>
                                                <p className="font-semibold text-[var(--text-main)] text-sm">{item.event}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{item.date}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                {canResolve && (
                    <footer className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex justify-end">
                        <button onClick={() => onMarkResolved(request.id)} className="py-2 px-5 bg-success text-white font-bold rounded-lg shadow-sm hover:bg-green-600 flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5" /> Mark as resolved
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};

const NewRequestModal: React.FC<{
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}> = ({ onClose, showToast }) => {
    const { currentUser, addServiceRequest } = useAuth();
    const [service, setService] = useState<ServiceRequest['service']>('SEO Blog Post');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<ServiceRequest['priority']>('Normal');
    
    const benefitNote = useMemo(() => {
        if (!currentUser?.benefits) return '';
        if (service === 'SEO Blog Post') {
            const benefit = currentUser.benefits.find(b => b.title === 'SEO Blog Posts');
            if(benefit && benefit.quota !== undefined && benefit.used !== undefined) {
                return `You have ${benefit.quota - benefit.used} of ${benefit.quota} SEO blog posts remaining this year.`;
            }
        }
        if (service === 'Website Review') {
            return 'Your plan includes quarterly website reviews.';
        }
        return '';
    }, [service, currentUser?.benefits]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!title.trim() || !description.trim()) {
            showToast('Title and description are required.', 'error');
            return;
        }
        addServiceRequest({ service, title, description, priority });
        showToast('Request created! Our team will review it within 1–2 business days.', 'success');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-2xl md:max-h-[90vh] flex flex-col h-full md:h-auto" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
                    <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)]">New Service Request</h2>
                    <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><XMarkIcon className="w-7 h-7"/></button>
                </header>
                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    <p className="p-3 bg-[var(--bg-subtle)] rounded-lg text-sm text-[var(--text-main)] border border-[var(--border-subtle)]">Requests that are part of your plan (e.g. SEO posts, website reviews) will be counted against your benefits.</p>
                    
                    <div>
                        <label htmlFor="service-type" className="block text-sm font-medium text-[var(--text-muted)] mb-1">Service Type</label>
                        <select id="service-type" value={service} onChange={e => setService(e.target.value as any)} className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] focus:ring-[var(--accent)] focus:border-[var(--accent)]">
                            <option>SEO Blog Post</option>
                            <option>Spotlight Article</option>
                            <option>Website Review</option>
                            <option>Badge Support</option>
                            <option>Other</option>
                        </select>
                        {benefitNote && <p className="mt-2 text-sm text-info font-medium">{benefitNote}</p>}
                    </div>

                    <div>
                        <label htmlFor="request-title" className="block text-sm font-medium text-[var(--text-muted)] mb-1">Request Title</label>
                        <input type="text" id="request-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Article on Emergency Fire Restoration" className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] focus:ring-[var(--accent)] focus:border-[var(--accent)]" />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-[var(--text-muted)] mb-1">Description / Brief</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder="Please provide as much detail as possible, including any target keywords, desired tone, or specific instructions." className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] focus:ring-[var(--accent)] focus:border-[var(--accent)]"></textarea>
                    </div>
                    
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                             <label htmlFor="priority" className="block text-sm font-medium text-[var(--text-muted)] mb-1">Priority</label>
                            <select id="priority" value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] focus:ring-[var(--accent)] focus:border-[var(--accent)]">
                                <option>Low</option>
                                <option>Normal</option>
                                <option>High</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Attachments (optional)</label>
                            <div className="flex items-center justify-center w-full p-3 border-2 border-dashed border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                                <UploadIcon className="w-6 h-6 mr-2"/>
                                <span>Click or drag to upload files</span>
                            </div>
                        </div>
                    </div>
                </div>
                <footer className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex flex-col sm:flex-row justify-end items-center gap-4">
                     <button type="button" onClick={onClose} className="w-full sm:w-auto py-2.5 px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg font-semibold shadow-sm hover:bg-[var(--bg-subtle)]">Cancel</button>
                    <button type="submit" className="w-full sm:w-auto py-2.5 px-6 bg-[var(--accent)] text-[var(--accent-text)] font-bold rounded-lg shadow-md hover:bg-[var(--accent-light)]">Submit Request</button>
                </footer>
            </form>
        </div>
    );
};


export default MemberDashboard;