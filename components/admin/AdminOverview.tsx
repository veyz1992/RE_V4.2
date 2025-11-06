import React from 'react';
import { adminMetrics, ADMIN_MEMBERS_NEEDING_ATTENTION, ADMIN_ACTIVE_SERVICE_REQUESTS } from '../../lib/mockData';
import { UsersIcon, ShieldCheckIcon, BriefcaseIcon, CurrencyDollarIcon, EyeIcon } from '../icons';
import { AdminMemberNeedingAttention, AdminActiveServiceRequest } from '../../types';

interface KpiCardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-border group relative cursor-pointer transition-transform hover:-translate-y-1">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-dark uppercase">{title}</h3>
                    <p className="font-playfair text-4xl font-bold text-charcoal mt-1">{value}</p>
                    <p className="text-sm text-text-muted mt-1">{subtitle}</p>
                </div>
                <div className="bg-info/10 text-blue-600 p-3 rounded-full">
                    {icon}
                </div>
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-charcoal text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Click to view members list filtered by this metric
            </div>
        </div>
    );
};

const MembersNeedingAttention: React.FC<{ members: AdminMemberNeedingAttention[] }> = ({ members }) => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
        <h2 className="font-playfair text-xl font-bold text-charcoal p-6 border-b border-gray-border">Members Needing Attention</h2>
        
        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full">
                <thead className="bg-gray-light/50">
                    <tr>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-dark">Business</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-dark">Issue</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-dark">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-border">
                    {members.map(member => (
                        <tr key={member.id} className="hover:bg-gray-light/50">
                            <td className="p-4">
                                <p className="font-semibold text-charcoal">{member.businessName}</p>
                                <p className="text-sm text-gray-dark">{member.tier} • {member.badgeRating}</p>
                            </td>
                            <td className="p-4">
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-warning/20 text-yellow-800">{member.issue}</span>
                            </td>
                            <td className="p-4 text-right">
                                <button className="p-2 text-gray-dark hover:text-info rounded-full"><EyeIcon className="w-5 h-5"/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-border">
            {members.map(member => (
                <div key={member.id} className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-charcoal">{member.businessName}</p>
                            <p className="text-sm text-gray-dark">{member.tier} • {member.badgeRating}</p>
                        </div>
                        <button className="p-2 text-gray-dark"><EyeIcon className="w-5 h-5"/></button>
                    </div>
                    <div className="mt-2">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-warning/20 text-yellow-800">{member.issue}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ActiveServiceRequests: React.FC<{ requests: AdminActiveServiceRequest[] }> = ({ requests }) => {
    const statusColors = {
        'Open': 'bg-gray-200 text-gray-800',
        'In progress': 'bg-info/20 text-blue-800',
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
            <h2 className="font-playfair text-xl font-bold text-charcoal p-6 border-b border-gray-border">Active Service Requests</h2>
            
            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full">
                    <thead className="bg-gray-light/50">
                        <tr>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-dark">Request</th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-dark">Assigned</th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-dark">Status</th>
                            <th className="py-3 px-4 text-right text-xs font-semibold text-gray-dark">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-border">
                        {requests.map(req => (
                            <tr key={req.id} className="hover:bg-gray-light/50">
                                <td className="p-4">
                                    <p className="font-semibold text-charcoal">{req.businessName}</p>
                                    <p className="text-sm text-gray-dark">{req.requestType} • {req.date}</p>
                                </td>
                                <td className="p-4 text-sm text-gray-dark">{req.assignedTo}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[req.status]}`}>{req.status}</span>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="p-2 text-gray-dark hover:text-info rounded-full"><EyeIcon className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
             <div className="md:hidden divide-y divide-gray-border">
                {requests.map(req => (
                    <div key={req.id} className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-charcoal">{req.businessName}</p>
                                <p className="text-sm text-gray-dark">{req.requestType}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[req.status]}`}>{req.status}</span>
                        </div>
                        <div className="flex justify-between items-center mt-3 text-sm text-gray-dark">
                            <span>{req.date} • Assigned: {req.assignedTo}</span>
                            <button className="font-semibold text-info hover:underline">View →</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const AdminOverview: React.FC = () => {
    const inactiveMembers = adminMetrics.totalMembers - adminMetrics.activeMembers;
    const formattedMrr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(adminMetrics.mrr);

    return (
        <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
            <div className="mb-8">
                <h1 className="font-playfair text-3xl md:text-4xl font-bold text-charcoal">Overview</h1>
                <p className="text-gray-dark mt-1 text-lg">A high-level view of platform activity and health.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <KpiCard
                    title="Total Members"
                    value={adminMetrics.totalMembers.toString()}
                    subtitle={`${adminMetrics.activeMembers} active / ${inactiveMembers} inactive`}
                    icon={<UsersIcon className="w-6 h-6" />}
                />
                <KpiCard
                    title="Pending Verifications"
                    value={adminMetrics.pendingVerifications.toString()}
                    subtitle="Docs needing review"
                    icon={<ShieldCheckIcon className="w-6 h-6" />}
                />
                <KpiCard
                    title="Open Service Requests"
                    value={adminMetrics.openRequests.toString()}
                    subtitle="Content + support tickets"
                    icon={<BriefcaseIcon className="w-6 h-6" />}
                />
                 <KpiCard
                    title="Monthly Recurring Revenue"
                    value={formattedMrr}
                    subtitle={`Churn: ${adminMetrics.monthlyChurnRate}% this month`}
                    icon={<CurrencyDollarIcon className="w-6 h-6" />}
                />
            </div>
            
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <MembersNeedingAttention members={ADMIN_MEMBERS_NEEDING_ATTENTION} />
                <ActiveServiceRequests requests={ADMIN_ACTIVE_SERVICE_REQUESTS} />
            </div>
        </div>
    );
};

export default AdminOverview;