import React, { useState, useMemo } from 'react';
import { ADMIN_MEMBERS, AdminMember, MemberStatus, BadgeRating, PackageTier } from '../../lib/mockData';
import { MagnifyingGlassIcon, EyeIcon, PencilSquareIcon, UserCircleIcon } from '../icons';
import MemberDetailDrawer from './MemberDetailDrawer';
import ImpersonateModal from './ImpersonateModal';

interface ClientManagementProps {
    showToast: (message: string, type: 'success' | 'error') => void;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ showToast }) => {
    const [members, setMembers] = useState<AdminMember[]>(ADMIN_MEMBERS);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ tier: 'All', status: 'All', rating: 'All' });
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdminMember | null; direction: 'ascending' | 'descending' }>({ key: 'joinDate', direction: 'descending' });
    
    const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
    const [isImpersonateModalOpen, setImpersonateModalOpen] = useState(false);
    const [impersonatedMemberName, setImpersonatedMemberName] = useState('');

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
        showToast('Member updated successfully.', 'success');
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
                                {filteredAndSortedMembers.map(member => (
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
                                                <button onClick={() => setSelectedMember(member)} className="p-2 text-gray-dark hover:text-info rounded-full" title="View"><EyeIcon className="w-5 h-5"/></button>
                                                <button onClick={() => setSelectedMember(member)} className="p-2 text-gray-dark hover:text-info rounded-full" title="Edit"><PencilSquareIcon className="w-5 h-5"/></button>
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
                    {filteredAndSortedMembers.map(member => (
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
                                <button onClick={() => setSelectedMember(member)} className="py-2 px-4 bg-info/10 text-info font-bold rounded-lg">View</button>
                            </div>
                        </div>
                    ))}
                </div>

                 {filteredAndSortedMembers.length === 0 && (
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