import React, { useEffect, useMemo, useState } from 'react';
import { AdminMember, MemberStatus, BadgeRating, PackageTier } from '../../lib/mockData';
import { MagnifyingGlassIcon, EyeIcon, PencilSquareIcon, UserCircleIcon } from '../icons';
import MemberDetailDrawer from './MemberDetailDrawer';
import ImpersonateModal from './ImpersonateModal';

interface ClientManagementProps {
    showToast: (message: string, type: 'success' | 'error') => void;
    onSelectMember?: (member: AdminMember) => void;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ showToast, onSelectMember }) => {
    const [members, setMembers] = useState<AdminMember[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ tier: 'All', status: 'All', rating: 'All' });
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdminMember | null; direction: 'ascending' | 'descending' }>({ key: 'joinDate', direction: 'descending' });
    
    const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
    const [isImpersonateModalOpen, setImpersonateModalOpen] = useState(false);
    const [impersonatedMemberName, setImpersonatedMemberName] = useState('');

    type ApiAdminMember = {
        id: string;
        businessName: string;
        primaryContact: string | null;
        email: string | null;
        location: string | null;
        tier: string | null;
        status: string | null;
        verificationStatus: string | null;
        badgeRating: string | null;
        joinDate: string | null;
    };

    const normalizeStatus = (status: string | null): MemberStatus => {
        const normalized = status?.toLowerCase();
        switch (normalized) {
            case 'active':
                return 'Active';
            case 'suspended':
                return 'Suspended';
            case 'canceled':
            case 'cancelled':
                return 'Canceled';
            default:
                return 'Pending';
        }
    };

    const normalizeTier = (tier: string | null): PackageTier => {
        if (!tier) return 'Bronze';
        const formatted = tier.toLowerCase();
        if (formatted === 'silver') return 'Silver';
        if (formatted === 'gold') return 'Gold';
        if (formatted === 'founding member') return 'Founding Member';
        if (formatted === 'platinum') return 'Platinum';
        return 'Bronze';
    };

    const normalizeRating = (rating: string | null): BadgeRating => {
        if (rating === 'A+' || rating === 'A' || rating === 'B+') return rating;
        return 'B+';
    };

    useEffect(() => {
        let isMounted = true;

        const fetchMembers = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const res = await fetch('/.netlify/functions/admin-get-members');

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Request failed with status ${res.status}`);
                }

                const data: { members: ApiAdminMember[] } = await res.json();

                if (isMounted && data?.members) {
                    const mappedMembers: AdminMember[] = data.members.map(member => ({
                        id: member.id,
                        businessName: member.businessName,
                        city: member.location || '—',
                        email: member.email || '—',
                        tier: normalizeTier(member.tier),
                        rating: normalizeRating(member.badgeRating),
                        status: normalizeStatus(member.status),
                        renewalDate: member.joinDate || '—',
                        joinDate: member.joinDate || '—',
                        mrr: 0,
                        pendingDocs: 0,
                        openRequests: 0,
                        documents: [],
                        activityLog: [],
                        billingInfo: { stripeId: '', lastPayment: '', plan: '' },
                        stats: { profileViews: 0, badgeClicks: 0 },
                        badge: member.badgeRating
                            ? {
                                status: 'ACTIVE',
                                badgeLabel: member.badgeRating,
                                imageLightUrl: '',
                                profileUrl: '',
                            }
                            : undefined,
                    }));

                    setMembers(mappedMembers);
                }
            } catch (err: any) {
                console.error('Failed to load admin members', err);
                if (isMounted) {
                    setError(err?.message ?? 'Failed to load members');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchMembers();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleSort = (key: keyof AdminMember) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const handleUpdateMember = (updatedMember: AdminMember) => {
        setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
        setSelectedMember(updatedMember);
        onSelectMember?.(updatedMember);
        showToast('Member updated successfully.', 'success');
    };

    const handleSelectMember = (member: AdminMember) => {
        setSelectedMember(member);
        onSelectMember?.(member);
    };

    const openImpersonateModal = (member: AdminMember) => {
        setImpersonatedMemberName(member.businessName);
        setImpersonateModalOpen(true);
    };


    const filteredAndSortedMembers = useMemo(() => {
        let sortedMembers = [...members];

        // Filtering
        sortedMembers = sortedMembers.filter(member => {
            const searchMatch = member.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || member.email.toLowerCase().includes(searchTerm.toLowerCase());
            const tierMatch = filters.tier === 'All' || member.tier === filters.tier;
            const statusMatch = filters.status === 'All' || member.status === filters.status;
            const ratingMatch = filters.rating === 'All' || member.rating === filters.rating;
            return searchMatch && tierMatch && statusMatch && ratingMatch;
        });

        // Sorting
        if (sortConfig.key) {
            sortedMembers.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        
        return sortedMembers;
    }, [members, searchTerm, filters, sortConfig]);

    const statusColors: { [key in MemberStatus]: string } = {
        Active: 'bg-success/20 text-success',
        Suspended: 'bg-error/20 text-error',
        Pending: 'bg-info/20 text-info',
        Canceled: 'bg-gray-200 text-gray-800',
    };
    
    const tierColors: { [key in PackageTier]: string } = {
        Bronze: 'bg-yellow-700/20 text-yellow-800',
        Silver: 'bg-gray-300/60 text-gray-800',
        Gold: 'bg-gold/20 text-gold-dark',
        'Founding Member': 'bg-charcoal/80 text-white',
        Platinum: 'bg-blue-900/20 text-blue-900'
    };


    const SortableHeader: React.FC<{ sortKey: keyof AdminMember; label: string }> = ({ sortKey, label }) => {
        const isSorted = sortConfig.key === sortKey;
        const directionIcon = sortConfig.direction === 'ascending' ? '▲' : '▼';
        return (
            <th onClick={() => handleSort(sortKey)} className="px-4 py-3 text-left text-xs font-bold text-charcoal uppercase tracking-wider cursor-pointer">
                {label} {isSorted && <span className="text-info">{directionIcon}</span>}
            </th>
        );
    };

    return (
        <>
            {selectedMember && (
                <MemberDetailDrawer
                    member={selectedMember}
                    onClose={() => setSelectedMember(null)}
                    onUpdate={handleUpdateMember}
                    showToast={showToast}
                />
            )}
            <ImpersonateModal 
                isOpen={isImpersonateModalOpen}
                onClose={() => setImpersonateModalOpen(false)}
                memberName={impersonatedMemberName}
            />

            <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="font-playfair text-3xl font-bold text-charcoal">Members</h1>
                        <p className="text-gray-dark mt-1">Manage all member accounts, view details, and perform admin actions.</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-border mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info"
                            />
                        </div>
                        <select name="tier" value={filters.tier} onChange={handleFilterChange} className="w-full p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Tiers</option>
                            <option>Bronze</option><option>Silver</option><option>Gold</option><option>Founding Member</option>
                        </select>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Statuses</option>
                            <option>Active</option><option>Pending</option><option>Suspended</option><option>Canceled</option>
                        </select>
                         <select name="rating" value={filters.rating} onChange={handleFilterChange} className="w-full p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Ratings</option>
                            <option>A+</option><option>A</option><option>B+</option>
                        </select>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden hidden md:block">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-border">
                            <thead className="bg-gray-light/50">
                                <tr>
                                    <SortableHeader sortKey="businessName" label="Business" />
                                    <SortableHeader sortKey="tier" label="Tier" />
                                    <SortableHeader sortKey="rating" label="Rating" />
                                    <SortableHeader sortKey="status" label="Status" />
                                    <SortableHeader sortKey="mrr" label="MRR" />
                                    <SortableHeader sortKey="renewalDate" label="Renewal" />
                                    <th className="px-4 py-3 text-left text-xs font-bold text-charcoal uppercase tracking-wider">Pending</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-charcoal uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-border">
                                {isLoading && (
                                    <tr>
                                        <td colSpan={8} className="p-4 text-center text-gray-dark">Loading members…</td>
                                    </tr>
                                )}
                                {!isLoading && error && (
                                    <tr>
                                        <td colSpan={8} className="p-4 text-center text-error font-semibold">Could not load members: {error}</td>
                                    </tr>
                                )}
                                {!isLoading && !error && filteredAndSortedMembers.map(member => (
                                    <tr key={member.id} className="hover:bg-gray-light/50">
                                        <td className="p-4 whitespace-nowrap"><p className="font-semibold text-charcoal">{member.businessName}</p><p className="text-sm text-gray-dark">{member.city}</p></td>
                                        <td className="p-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-bold rounded-full ${tierColors[member.tier]}`}>{member.tier}</span></td>
                                        <td className="p-4 whitespace-nowrap font-semibold">{member.rating}</td>
                                        <td className="p-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[member.status]}`}>{member.status}</span></td>
                                        <td className="p-4 whitespace-nowrap">${member.mrr.toLocaleString()}</td>
                                        <td className="p-4 whitespace-nowrap text-sm">{member.renewalDate}</td>
                                        <td className="p-4 whitespace-nowrap text-sm">{member.pendingDocs > 0 || member.openRequests > 0 ? `${member.pendingDocs} D / ${member.openRequests} R` : '—'}</td>
                                        <td className="p-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => handleSelectMember(member)} className="p-2 text-gray-dark hover:text-info rounded-full" title="View"><EyeIcon className="w-5 h-5"/></button>
                                                <button onClick={() => handleSelectMember(member)} className="p-2 text-gray-dark hover:text-info rounded-full" title="Edit"><PencilSquareIcon className="w-5 h-5"/></button>
                                                <button onClick={() => openImpersonateModal(member)} className="p-2 text-gray-dark hover:text-info rounded-full" title="Impersonate"><UserCircleIcon className="w-5 h-5"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                    {isLoading && (
                        <div className="bg-white rounded-xl shadow-lg border border-gray-border p-4 text-center text-gray-dark">Loading members…</div>
                    )}
                    {!isLoading && error && (
                        <div className="bg-white rounded-xl shadow-lg border border-gray-border p-4 text-center text-error font-semibold">Could not load members: {error}</div>
                    )}
                    {!isLoading && !error && filteredAndSortedMembers.map(member => (
                        <div key={member.id} className="bg-white rounded-xl shadow-lg border border-gray-border p-4">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-charcoal">{member.businessName}</p>
                                    <p className="text-sm text-gray-dark">{member.email}</p>
                                    <p className="text-sm text-gray-dark">{member.city}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                     <span className={`px-2 py-1 text-xs font-bold rounded-full ${tierColors[member.tier]}`}>{member.tier}</span>
                                     <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[member.status]}`}>{member.status}</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-border flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-dark">MRR: <span className="font-semibold text-charcoal">${member.mrr.toLocaleString()}</span></p>
                                    <p className="text-sm text-gray-dark">Renews: <span className="font-semibold text-charcoal">{member.renewalDate}</span></p>
                                </div>
                                <button onClick={() => handleSelectMember(member)} className="py-2 px-4 bg-info/10 text-info font-bold rounded-lg">View</button>
                            </div>
                        </div>
                    ))}
                </div>

                 {!isLoading && !error && filteredAndSortedMembers.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-border">
                        <h3 className="text-xl font-bold text-charcoal">No members found</h3>
                        <p className="text-gray-dark mt-1">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default ClientManagement;