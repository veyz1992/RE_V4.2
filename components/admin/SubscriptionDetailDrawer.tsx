import React from 'react';
import { AdminSubscription, AdminSubscriptionStatus, PackageTier, AdminSubscriptionBillingCycle, ADMIN_MEMBERS } from '../../lib/mockData';
import { XMarkIcon, ExclamationTriangleIcon, ArrowDownTrayIcon } from '../icons';

interface SubscriptionDetailDrawerProps {
    subscription: AdminSubscription;
    onClose: () => void;
    onUpdate: (updatedSubscription: AdminSubscription) => void;
    onScheduleCancel: () => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const SubscriptionDetailDrawer: React.FC<SubscriptionDetailDrawerProps> = ({ subscription, onClose, onUpdate, onScheduleCancel, showToast }) => {

    const memberJoinDate = ADMIN_MEMBERS.find(m => m.id === subscription.memberId)?.joinDate || 'N/A';

    const statusColors: { [key in AdminSubscriptionStatus]: string } = {
        Active: 'bg-success/20 text-success',
        Trialing: 'bg-info/20 text-info',
        'Past due': 'bg-warning/20 text-yellow-800',
        Canceled: 'bg-gray-200 text-gray-800',
    };

    const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTier = e.target.value as PackageTier;
        onUpdate({ ...subscription, tier: newTier });
        showToast('Plan tier updated (demo-only).', 'success');
    };

    const handleCycleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCycle = e.target.value as AdminSubscriptionBillingCycle;
        let newMrr = subscription.mrr;
        if (newCycle === 'Annual' && subscription.billingCycle === 'Monthly') {
            newMrr = Math.round(subscription.planPrice / 12);
        } else if (newCycle === 'Monthly' && subscription.billingCycle === 'Annual') {
            newMrr = subscription.planPrice; // Assuming planPrice is the monthly price
        }
        onUpdate({ ...subscription, billingCycle: newCycle, mrr: newMrr });
        showToast('Billing cycle updated.', 'success');
    };
    
    const handleMarkAsPaid = () => {
        const today = new Date().toISOString().split('T')[0];
        onUpdate({ ...subscription, status: 'Active', lastPaymentDate: today });
        showToast('Subscription marked as paid.', 'success');
    };
    
    const handleFlagAccount = () => {
        onUpdate({ ...subscription, flagged: true });
        showToast('Account has been flagged internally.', 'success');
    };

    const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div className="flex justify-between items-center py-2 border-b border-gray-border last:border-b-0">
            <span className="text-sm text-gray-dark">{label}</span>
            <span className="text-sm font-semibold text-charcoal text-right">{value}</span>
        </div>
    );
    
    return (
        <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose}></div>
            <div className="absolute inset-0 md:inset-y-0 md:left-auto md:right-0 w-full md:max-w-md lg:max-w-lg bg-white shadow-2xl flex flex-col animate-slide-in-right">
                <header className="p-4 border-b border-gray-border shrink-0 sticky top-0 bg-white z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="font-playfair text-xl font-bold text-charcoal">{subscription.businessName}</h2>
                                <span className="text-sm font-semibold text-gray-dark">{subscription.tier}</span>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusColors[subscription.status]}`}>{subscription.status}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-dark hover:text-charcoal"><XMarkIcon className="w-6 h-6"/></button>
                    </div>
                </header>
                
                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                    {subscription.status === 'Past due' && (
                        <div className="p-4 bg-error/10 border-l-4 border-error">
                            <h3 className="font-bold text-red-800 flex items-center gap-2"><ExclamationTriangleIcon className="w-5 h-5"/> Payment Issue – Past Due</h3>
                            <p className="text-sm text-red-700 mt-2">The last payment attempt failed. Updating the payment method is required to keep the badge active.</p>
                            <button onClick={handleFlagAccount} className={`mt-3 py-1 px-3 text-sm font-bold rounded-md ${subscription.flagged ? 'bg-gray-300 text-gray-600' : 'bg-warning/20 text-yellow-800'}`} disabled={subscription.flagged}>
                                {subscription.flagged ? 'Account Flagged' : 'Flag Account Internally'}
                            </button>
                        </div>
                    )}
                    {subscription.status === 'Canceled' && (
                         <div className="p-4 bg-gray-200 border-l-4 border-gray-400">
                            <p className="text-sm text-charcoal font-semibold">Subscription canceled. Badge and benefits will become inactive after {subscription.nextPaymentDate}.</p>
                        </div>
                    )}

                    <div className="p-4 bg-gray-light/60 rounded-lg border border-gray-border">
                        <h4 className="text-sm font-bold uppercase text-gray-dark mb-2">Subscription</h4>
                        <InfoRow label="Plan" value={`${subscription.tier} – $${subscription.planPrice} / ${subscription.billingCycle === 'Monthly' ? 'month' : 'year'}`} />
                        <InfoRow label="Billing Cycle" value={subscription.billingCycle} />
                        <InfoRow label="Status" value={subscription.status} />
                        <InfoRow label="Next Payment" value={subscription.nextPaymentDate} />
                        <InfoRow label="Last Payment" value={subscription.lastPaymentDate} />
                        <InfoRow label="Stripe Customer ID" value={<code>{subscription.stripeCustomerId}</code>} />
                        <InfoRow label="Stripe Subscription ID" value={<code>{subscription.stripeSubscriptionId}</code>} />
                        <button className="w-full mt-4 text-center py-2 bg-white border border-gray-border text-info font-semibold rounded-lg hover:bg-gray-light text-sm">
                            Open member in Admin →
                        </button>
                    </div>

                    <div className="p-4 bg-gray-light/60 rounded-lg border border-gray-border">
                        <h4 className="text-sm font-bold uppercase text-gray-dark mb-2">Admin Actions</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center"><label className="text-sm font-medium">Change Tier</label><select value={subscription.tier} onChange={handleTierChange} className="p-1 border rounded-md text-sm"><option>Bronze</option><option>Silver</option><option>Gold</option><option>Founding Member</option></select></div>
                            <div className="flex justify-between items-center"><label className="text-sm font-medium">Change Cycle</label><select value={subscription.billingCycle} onChange={handleCycleChange} className="p-1 border rounded-md text-sm"><option>Monthly</option><option>Annual</option></select></div>
                            {subscription.status === 'Past due' && <button onClick={handleMarkAsPaid} className="w-full text-center py-2 bg-success/20 text-success font-semibold rounded-lg hover:bg-success/30">Mark as Paid (Manual Fix)</button>}
                            {subscription.status !== 'Canceled' && <button onClick={onScheduleCancel} className="w-full text-center py-2 bg-error/10 text-error font-semibold rounded-lg hover:bg-error/20">Schedule Cancellation</button>}
                        </div>
                    </div>
                    
                    <div className="p-4 bg-gray-light/60 rounded-lg border border-gray-border">
                        <h4 className="text-sm font-bold uppercase text-gray-dark mb-2">Recent Invoices</h4>
                        <table className="w-full text-sm">
                            <thead className="text-left text-gray-dark"><tr><th className="py-1">ID</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead>
                            <tbody>
                                {subscription.invoices?.map(inv => (
                                    <tr key={inv.id}>
                                        <td className="py-1 font-semibold">{inv.id}</td>
                                        <td>{inv.date}</td>
                                        <td>${inv.amount.toFixed(2)}</td>
                                        <td><span className={inv.status === 'Paid' ? 'text-success' : 'text-error'}>{inv.status}</span></td>
                                        <td><button onClick={() => showToast('Invoice download available in live version.', 'success')} className="p-1 text-info"><ArrowDownTrayIcon className="w-4 h-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <footer className="p-4 bg-charcoal-dark text-white grid grid-cols-2 md:grid-cols-4 gap-4 text-center rounded-t-lg shrink-0">
                    <div><p className="text-xs uppercase text-gray">MRR</p><p className="font-bold text-lg">${subscription.mrr}</p></div>
                    <div><p className="text-xs uppercase text-gray">Est. LTV</p><p className="font-bold text-lg">${(subscription.mrr * 18).toLocaleString()}</p></div>
                    <div><p className="text-xs uppercase text-gray">Member Since</p><p className="font-bold text-lg">{memberJoinDate}</p></div>
                    <div><p className="text-xs uppercase text-gray">Churn Risk</p><p className={`font-bold text-lg ${subscription.churnRisk === 'High' ? 'text-error' : subscription.churnRisk === 'Medium' ? 'text-warning' : ''}`}>{subscription.churnRisk}</p></div>
                </footer>
            </div>
        </div>
    );
};

export default SubscriptionDetailDrawer;