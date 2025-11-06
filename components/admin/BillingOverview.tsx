import React, { useState, useMemo } from 'react';
import { ADMIN_SUBSCRIPTIONS, AdminSubscription, AdminSubscriptionStatus, PackageTier, AdminSubscriptionBillingCycle } from '../../lib/mockData';
import { MagnifyingGlassIcon, EyeIcon, ChevronDownIcon, CurrencyDollarIcon, UsersIcon, ExclamationTriangleIcon, XMarkIcon } from '../icons';
import SubscriptionDetailDrawer from './SubscriptionDetailDrawer';
import ConfirmationModal from './ConfirmationModal';


interface BillingOverviewProps {
    showToast: (message: string, type: 'success' | 'error') => void;
}

const BillingOverview: React.FC<BillingOverviewProps> = ({ showToast }) => {
    const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>(ADMIN_SUBSCRIPTIONS);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: 'All',
        tier: 'All',
        billingCycle: 'All',
    });
    const [isFiltersVisible, setIsFiltersVisible] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<AdminSubscription | null>(null);
    const [isCancelModalOpen, setCancelModalOpen] = useState(false);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSetStatusFilter = (status: AdminSubscriptionStatus) => {
        setFilters(prev => ({ ...prev, status }));
    };

    const handleUpdateSubscription = (updatedSub: AdminSubscription) => {
        setSubscriptions(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
        setSelectedSubscription(updatedSub); // Keep drawer open with updated data
    };
    
    const openCancelModal = () => {
        setCancelModalOpen(true);
    };

    const handleConfirmCancel = () => {
        if (selectedSubscription) {
            handleUpdateSubscription({ ...selectedSubscription, status: 'Canceled' });
            showToast('Subscription scheduled for cancellation.', 'success');
        }
        setCancelModalOpen(false);
        setSelectedSubscription(null);
    };

    const kpiData = useMemo(() => {
        const activeAndTrialing = subscriptions.filter(s => ['Active', 'Trialing'].includes(s.status));
        const mrr = activeAndTrialing.reduce((sum, s) => sum + s.mrr, 0);
        const activeSubs = activeAndTrialing.length;
        const pastDueSubs = subscriptions.filter(s => s.status === 'Past due').length;
        
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const canceledThisMonth = subscriptions.filter(s => {
            if (s.status === 'Canceled' && s.canceledDate) {
                const canceledDate = new Date(s.canceledDate);
                return canceledDate.getMonth() === currentMonth && canceledDate.getFullYear() === currentYear;
            }
            return false;
        }).length;

        return { mrr, activeSubs, pastDueSubs, canceledThisMonth };
    }, [subscriptions]);

    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter(s => {
            const searchMatch = s.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                s.stripeCustomerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                s.stripeSubscriptionId.toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = filters.status === 'All' || s.status === filters.status;
            const tierMatch = filters.tier === 'All' || s.tier === filters.tier;
            const cycleMatch = filters.billingCycle === 'All' || s.billingCycle === filters.billingCycle;
            return searchMatch && statusMatch && tierMatch && cycleMatch;
        });
    }, [subscriptions, searchTerm, filters]);

    const statusOptions: AdminSubscriptionStatus[] = ['Active', 'Trialing', 'Past due', 'Canceled'];
    const tierOptions: PackageTier[] = ['Bronze', 'Silver', 'Gold', 'Founding Member'];
    const cycleOptions: AdminSubscriptionBillingCycle[] = ['Monthly', 'Annual'];

    const statusColors: { [key in AdminSubscriptionStatus]: string } = {
        Active: 'bg-success/20 text-success',
        Trialing: 'bg-info/20 text-info',
        'Past due': 'bg-warning/20 text-yellow-800',
        Canceled: 'bg-gray-200 text-gray-800',
    };

    const KpiCard: React.FC<{ title: string; value: string; subtitle: string; icon: React.ReactNode }> = ({ title, value, subtitle, icon }) => (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-border">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-dark uppercase">{title}</h3>
                    <p className="font-playfair text-4xl font-bold text-charcoal mt-1">{value}</p>
                    <p className="text-sm text-text-muted mt-1">{subtitle}</p>
                </div>
                <div className="bg-info/10 text-blue-600 p-3 rounded-full">{icon}</div>
            </div>
        </div>
    );

    return (
        <>
            {selectedSubscription && (
                <SubscriptionDetailDrawer
                    subscription={selectedSubscription}
                    onClose={() => setSelectedSubscription(null)}
                    onUpdate={handleUpdateSubscription}
                    onScheduleCancel={openCancelModal}
                    showToast={showToast}
                />
            )}
            <ConfirmationModal
                isOpen={isCancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onSubmit={handleConfirmCancel}
                title="Schedule Cancellation?"
                message="Are you sure you want to cancel this subscription at the end of the current billing period?"
                confirmButtonText="Confirm Cancellation"
                confirmButtonClass="bg-error text-white hover:bg-red-600"
            />
            <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
                <div className="mb-6">
                    <h1 className="font-playfair text-3xl font-bold text-charcoal">Billing Overview</h1>
                    <p className="text-gray-dark mt-1">Monitor memberships, subscription status, and billing health across all members.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
                    <KpiCard title="MRR" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(kpiData.mrr)} subtitle="+ $1.2k this month" icon={<CurrencyDollarIcon className="w-6 h-6"/>} />
                    <KpiCard title="Active Subscriptions" value={kpiData.activeSubs.toString()} subtitle="+ 3 new this month" icon={<UsersIcon className="w-6 h-6"/>} />
                    <KpiCard title="Past-Due Accounts" value={kpiData.pastDueSubs.toString()} subtitle="Needs follow-up" icon={<ExclamationTriangleIcon className="w-6 h-6"/>} />
                    <KpiCard title="Canceled This Month" value={kpiData.canceledThisMonth.toString()} subtitle="Accounts churned" icon={<XMarkIcon className="w-6 h-6"/>} />
                </div>

                { (kpiData.pastDueSubs > 0 || kpiData.canceledThisMonth > 0) &&
                    <div className={`mb-6 p-3 rounded-lg flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-2 text-sm font-semibold ${kpiData.pastDueSubs > 0 ? 'bg-error/10 border border-error/20' : 'bg-gray-200'}`}>
                        <p>Problem Accounts:</p>
                        { kpiData.pastDueSubs > 0 && <p className="text-red-800">Past-due: {kpiData.pastDueSubs}</p> }
                        { kpiData.canceledThisMonth > 0 && <p>Canceled this month: {kpiData.canceledThisMonth}</p> }
                        { kpiData.pastDueSubs > 0 && <button onClick={() => handleSetStatusFilter('Past due')} className="font-bold text-info hover:underline">Filter to past-due only →</button> }
                    </div>
                }

                <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-border mb-6">
                    <button onClick={() => setIsFiltersVisible(!isFiltersVisible)} className="w-full flex justify-between items-center md:hidden mb-4">
                        <span className="font-bold text-charcoal">Filters</span>
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isFiltersVisible ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`${isFiltersVisible ? 'block' : 'hidden'} md:grid md:grid-cols-2 lg:grid-cols-4 gap-4`}>
                        <div className="relative col-span-2 lg:col-span-1 mb-2 md:mb-0">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray" />
                            <input type="text" placeholder="Search business or Stripe ID..." name="searchTerm" value={searchTerm} onChange={handleFilterChange} className="w-full pl-10 pr-4 py-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info"/>
                        </div>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Statuses</option>
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="tier" value={filters.tier} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Tiers</option>
                            {tierOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select name="billingCycle" value={filters.billingCycle} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Billing Cycles</option>
                            {cycleOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full">
                            <thead className="bg-gray-light/50">
                                <tr>
                                    {['Business', 'Tier', 'Status', 'Billing Cycle', 'MRR', 'Next Payment', 'Last Payment', 'Stripe Sub ID', 'Actions'].map(h => 
                                    <th key={h} className="p-4 text-left text-xs font-bold text-charcoal uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-border">
                                {filteredSubscriptions.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-light/50">
                                        <td className="p-4 font-semibold text-charcoal">{s.businessName}</td>
                                        <td className="p-4 text-sm">{s.tier}</td>
                                        <td className="p-4"><span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[s.status]}`}>{s.status}</span></td>
                                        <td className="p-4 text-sm">{s.billingCycle}</td>
                                        <td className="p-4 text-sm">${s.mrr.toLocaleString()}</td>
                                        <td className="p-4 text-sm">{s.nextPaymentDate}</td>
                                        <td className="p-4 text-sm">{s.lastPaymentDate}</td>
                                        <td className="p-4 text-sm font-mono" title={s.stripeSubscriptionId}>{s.stripeSubscriptionId.slice(0, 10)}...</td>
                                        <td className="p-4 text-right"><button onClick={() => setSelectedSubscription(s)} className="p-2 text-gray-dark hover:text-info rounded-full" title="View Details"><EyeIcon className="w-5 h-5"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden divide-y divide-gray-border">
                        {filteredSubscriptions.map(s => (
                            <div key={s.id} className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-charcoal">{s.businessName}</p>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[s.status]}`}>{s.status}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                    <div><p className="text-xs text-gray-dark">Tier</p><p className="font-semibold">{s.tier}</p></div>
                                    <div><p className="text-xs text-gray-dark">Cycle</p><p className="font-semibold">{s.billingCycle}</p></div>
                                    <div><p className="text-xs text-gray-dark">MRR</p><p className="font-semibold">${s.mrr.toLocaleString()}</p></div>
                                </div>
                                <div className="flex justify-between items-end text-sm">
                                    <div>
                                        <p><span className="text-gray-dark">Next Payment:</span> {s.nextPaymentDate}</p>
                                    </div>
                                    <button onClick={() => setSelectedSubscription(s)} className="py-2 px-4 bg-info/10 text-info font-bold rounded-lg">View</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {filteredSubscriptions.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-border">
                        <h3 className="text-xl font-bold text-charcoal">No subscriptions found</h3>
                        <p className="text-gray-dark mt-1">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default BillingOverview;