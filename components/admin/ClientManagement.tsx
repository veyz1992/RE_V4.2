import React, { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlassIcon, EyeIcon, PencilSquareIcon, UserCircleIcon, ClipboardIcon } from '../icons';
import MemberDetailDrawer from './MemberDetailDrawer';
import ImpersonateModal from './ImpersonateModal';
import { AdminMember } from './types';
import {
    type AdminAssessmentRow,
    type AdminMemberDocumentRow,
    type AdminMembershipRow,
    type AdminProfileRow,
    type AdminSubscriptionRow,
    getLastAssessmentInfo,
    getMemberStatus,
    getVerificationStatus,
} from './adminUtils';

interface ClientManagementProps {
    showToast: (message: string, type: 'success' | 'error') => void;
    onSelectMember?: (member: AdminMember) => void;
    onNavigateToDocuments?: (profileId: string) => void;
}

const ClientManagement: React.FC<ClientManagementProps> = ({ showToast, onSelectMember, onNavigateToDocuments }) => {
    const [members, setMembers] = useState<AdminMember[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ tier: 'All', status: 'All', rating: 'All' });
    const [sortConfig, setSortConfig] = useState<{ key: keyof AdminMember | null; direction: 'ascending' | 'descending' }>({ key: 'joinDate', direction: 'descending' });
    const [memberFilter, setMemberFilter] = useState<'all' | 'new' | 'pending_verification' | 'active'>('all');
    
    const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
    const [isImpersonateModalOpen, setImpersonateModalOpen] = useState(false);
    const [impersonatedMemberName, setImpersonatedMemberName] = useState('');

    interface MembersApiResponse {
        profiles: AdminProfileRow[];
        memberships: AdminMembershipRow[];
        assessments: AdminAssessmentRow[];
        subscriptions: AdminSubscriptionRow[];
        memberDocuments: AdminMemberDocumentRow[];
    }

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

                const data: MembersApiResponse = await res.json();

                if (isMounted && data?.profiles) {
                    const membershipByProfileId = (data.memberships ?? []).reduce<Record<string, AdminMembershipRow>>((acc, membership) => {
                        const existing = acc[membership.profile_id];
                        const existingDate = existing?.created_at ? new Date(existing.created_at).getTime() : 0;
                        const currentDate = membership.created_at ? new Date(membership.created_at).getTime() : 0;

                        if (!existing || currentDate > existingDate) {
                            acc[membership.profile_id] = membership;
                        }

                        return acc;
                    }, {});

                    const subscriptionByProfileId = (data.subscriptions ?? []).reduce<Record<string, AdminSubscriptionRow>>((acc, subscription) => {
                        const existing = acc[subscription.profile_id];

                        if (existing?.status === 'active') {
                            return acc;
                        }

                        const existingDate = existing?.created_at ? new Date(existing.created_at).getTime() : 0;
                        const currentDate = subscription.created_at ? new Date(subscription.created_at).getTime() : 0;

                        if (!existing || currentDate > existingDate || subscription.status === 'active') {
                            acc[subscription.profile_id] = subscription;
                        }

                        return acc;
                    }, {});

                    const documentsByProfileId = (data.memberDocuments ?? []).reduce<Record<string, AdminMemberDocumentRow[]>>((acc, document) => {
                        acc[document.profile_id] = acc[document.profile_id] ?? [];
                        acc[document.profile_id].push(document);
                        return acc;
                    }, {});

                    const mappedMembers: AdminMember[] = data.profiles.map(profile => {
                        const membership = membershipByProfileId[profile.id];
                        const subscription = subscriptionByProfileId[profile.id];
                        const documents = documentsByProfileId[profile.id] ?? [];
                        const { lastAssessment, lastAssessmentDate, hasAnyAssessment, hasNewAssessment } = getLastAssessmentInfo(profile, data.assessments ?? []);

                        const status = getMemberStatus(profile, membership, subscription);
                        const verificationStatus = getVerificationStatus(profile, membership, documents);
                        const location = profile.city && profile.state
                            ? `${profile.city}, ${profile.state}`
                            : profile.city || profile.state || null;
                        const tier = membership?.tier || profile.membership_tier || null;
                        const badgeRating =
                            membership?.badge_rating ||
                            lastAssessment?.pci_rating ||
                            profile.badge_rating ||
                            null;
                        const pendingItems = documents.filter(doc => doc.status === 'pending').length;

                        return {
                            id: profile.id,
                            businessName: profile.company_name ?? 'Unknown',
                            primaryContact: profile.full_name ?? null,
                            city: profile.city ?? null,
                            state: profile.state ?? null,
                            location,
                            email: profile.email ?? null,
                            tier,
                            status,
                            verificationStatus,
                            badgeRating,
                            renewalDate: null,
                            joinDate: profile.created_at ?? null,
                            mrr: null,
                            pendingDocs: null,
                            openRequests: null,
                            hasAnyAssessment,
                            lastAssessmentDate,
                            hasNewAssessment,
                            pendingItems,
                            hasActiveSubscription: subscription?.status === 'active',
                        };
                    });

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

    const mapProfileToAdminMember = (profile: AdminProfileRow, existing?: AdminMember): AdminMember => {
        const location = profile.city && profile.state
            ? `${profile.city}, ${profile.state}`
            : profile.city || profile.state || existing?.location || null;

        return {
            ...(existing ?? {
                id: profile.id,
                businessName: profile.company_name ?? 'Unknown',
                primaryContact: profile.full_name ?? null,
                email: profile.email ?? null,
                city: profile.city ?? null,
                state: profile.state ?? null,
                location,
                tier: profile.membership_tier ?? null,
                status: profile.member_status ?? null,
                verificationStatus: profile.verification_status ?? null,
                badgeRating: profile.badge_rating ?? null,
                joinDate: profile.created_at ?? null,
                mrr: null,
                renewalDate: null,
                pendingDocs: null,
                openRequests: null,
                lastAssessmentDate: existing?.lastAssessmentDate ?? null,
                hasNewAssessment: existing?.hasNewAssessment ?? false,
                pendingItems: existing?.pendingItems,
            }),
            businessName: profile.company_name ?? existing?.businessName ?? 'Unknown',
            primaryContact: profile.full_name ?? existing?.primaryContact ?? null,
            email: profile.email ?? existing?.email ?? null,
            city: profile.city ?? existing?.city ?? null,
            state: profile.state ?? existing?.state ?? null,
            location,
            tier: profile.membership_tier ?? existing?.tier ?? null,
            status: profile.member_status ?? existing?.status ?? null,
            verificationStatus: profile.verification_status ?? existing?.verificationStatus ?? null,
            badgeRating: profile.badge_rating ?? existing?.badgeRating ?? null,
            joinDate: profile.created_at ?? existing?.joinDate ?? null,
            mrr: existing?.mrr ?? null,
            renewalDate: existing?.renewalDate ?? null,
            pendingDocs: existing?.pendingDocs ?? null,
            openRequests: existing?.openRequests ?? null,
        };
    };

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
    
    const handleUpdateMember = (updatedProfile: AdminProfileRow) => {
        let updatedMember: AdminMember | null = null;

        setMembers(prev => prev.map(member => {
            if (member.id === updatedProfile.id) {
                updatedMember = mapProfileToAdminMember(updatedProfile, member);
                return updatedMember;
            }
            return member;
        }));

        if (!updatedMember) {
            updatedMember = mapProfileToAdminMember(updatedProfile, selectedMember ?? undefined);
        }

        setSelectedMember(prev => (prev?.id === updatedProfile.id ? updatedMember : prev));
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

    const deriveBadgeRating = (member: AdminMember) => {
        const extendedMember = member as AdminMember & {
            badge_rating?: string | null;
            membership?: { badge_rating?: string | null } | null;
            summary?: { badgeRating?: string | null } | null;
        };

        return (
            extendedMember.membership?.badge_rating ??
            extendedMember.badge_rating ??
            extendedMember.summary?.badgeRating ??
            member.badgeRating ??
            null
        );
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '—';
        const parsed = new Date(dateString);
        if (Number.isNaN(parsed.getTime())) return '—';
        return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const filterCounts = useMemo(() => {
        const newAssessments = members.filter(member => member.hasNewAssessment).length;
        const pendingVerification = members.filter(member => member.verificationStatus === 'pending').length;
        const activeMembers = members.filter(member => member.status === 'active').length;

        return {
            all: members.length,
            new: newAssessments,
            pending_verification: pendingVerification,
            active: activeMembers,
        };
    }, [members]);


    const filteredAndSortedMembers = useMemo(() => {
        let sortedMembers = [...members];

        // Filtering
        sortedMembers = sortedMembers.filter(member => {
            const matchesMemberFilter =
                memberFilter === 'all' ||
                (memberFilter === 'new' && !!member.hasNewAssessment) ||
                (memberFilter === 'pending_verification' && member.verificationStatus === 'pending') ||
                (memberFilter === 'active' && member.status === 'active');

            const searchMatch = member.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || (member.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            const tierMatch = filters.tier === 'All' || (member.tier ?? '—') === filters.tier;
            const statusMatch = filters.status === 'All' || (member.status ?? '—') === filters.status;
            const ratingMatch = filters.rating === 'All' || (deriveBadgeRating(member) ?? '—') === filters.rating;
            return matchesMemberFilter && searchMatch && tierMatch && statusMatch && ratingMatch;
        });

        // Sorting
        if (sortConfig.key) {
            sortedMembers.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                const normalizeValue = (value: unknown) => {
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'number') return value;
                    return value.toString().toLowerCase();
                };

                const normalizedA = normalizeValue(aValue);
                const normalizedB = normalizeValue(bValue);

                if (normalizedA < normalizedB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (normalizedA > normalizedB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        return sortedMembers;
    }, [members, searchTerm, filters, sortConfig, memberFilter]);

    const statusColors: Record<string, string> = {
        Active: 'bg-success/20 text-success',
        Suspended: 'bg-error/20 text-error',
        Pending: 'bg-info/20 text-info',
        Canceled: 'bg-gray-200 text-gray-800',
    };

    const tierColors: Record<string, string> = {
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
                    onMemberUpdated={handleUpdateMember}
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

                <div className="flex flex-wrap gap-2 mb-4">
                    {[
                        { key: 'all' as const, label: 'All', count: filterCounts.all },
                        { key: 'new' as const, label: 'New assessments', count: filterCounts.new },
                        { key: 'pending_verification' as const, label: 'Pending verification', count: filterCounts.pending_verification },
                        { key: 'active' as const, label: 'Active members', count: filterCounts.active },
                    ].map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => setMemberFilter(filter.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition ${memberFilter === filter.key ? 'bg-info/10 text-info border-info' : 'bg-white text-charcoal border-gray-border hover:bg-gray-light/50'}`}
                        >
                            <span>{filter.label}</span>
                            <span className="px-2 py-1 rounded-full bg-gray-light text-charcoal text-xs font-bold">{filter.count}</span>
                        </button>
                    ))}
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
                                    <SortableHeader sortKey="badgeRating" label="Rating" />
                                    <th className="px-4 py-3 text-left text-xs font-bold text-charcoal uppercase tracking-wider">Last assessment</th>
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
                                        <td colSpan={9} className="p-4 text-center text-gray-dark">Loading members…</td>
                                    </tr>
                                )}
                                {!isLoading && error && (
                                    <tr>
                                        <td colSpan={9} className="p-4 text-center text-error font-semibold">Could not load members: {error}</td>
                                    </tr>
                                )}
                                {!isLoading && !error && filteredAndSortedMembers.map(member => {
                                    const tierLabel = member.tier || '—';
                                    const tierColor = tierColors[member.tier || ''] || 'bg-gray-200 text-gray-800';
                                    const badgeRating = deriveBadgeRating(member);
                                    const ratingContent = badgeRating
                                        ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-info/10 text-charcoal">{badgeRating}</span>
                                        : <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-dark">Not rated yet</span>;
                                    const statusLabel = member.status || '—';
                                    const statusColor = statusColors[member.status || ''] || 'bg-gray-200 text-gray-800';
                                    const mrrDisplay = member.mrr !== null ? `$${member.mrr.toLocaleString()}` : '—';
                                    const renewalDisplay = member.renewalDate || '—';
                                    const lastAssessmentDisplay = formatDate(member.lastAssessmentDate ?? null);
                                    const pendingDisplay = member.pendingItems ?? 0;

                                    return (
                                        <tr key={member.id} className="hover:bg-gray-light/50">
                                            <td className="p-4 whitespace-nowrap"><p className="font-semibold text-charcoal">{member.businessName}</p><p className="text-sm text-gray-dark">{member.primaryContact || '—'}</p></td>
                                            <td className="p-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-bold rounded-full ${tierColor}`}>{tierLabel}</span></td>
                                            <td className="p-4 whitespace-nowrap">{ratingContent}</td>
                                            <td className="p-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    {member.hasNewAssessment && <span className="w-2 h-2 rounded-full bg-success" aria-label="New assessment" />}
                                                    <span>{lastAssessmentDisplay}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColor}`}>{statusLabel}</span></td>
                                            <td className="p-4 whitespace-nowrap">{mrrDisplay}</td>
                                            <td className="p-4 whitespace-nowrap text-sm">{renewalDisplay}</td>
                                            <td className="p-4 whitespace-nowrap text-sm">
                                                {pendingDisplay > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onNavigateToDocuments?.(member.id)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-info/10 text-info border border-info/40 hover:bg-info/20 hover:text-info-dark transition cursor-pointer"
                                                    >
                                                        {pendingDisplay}
                                                    </button>
                                                ) : (
                                                    <span>{pendingDisplay}</span>
                                                )}
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => handleSelectMember(member)} className="p-2 text-gray-dark hover:text-info rounded-full" title="View"><EyeIcon className="w-5 h-5"/></button>
                                                    <button onClick={() => handleSelectMember(member)} className="p-2 text-gray-dark hover:text-info rounded-full" title="Edit"><PencilSquareIcon className="w-5 h-5"/></button>
                                                    <button
                                                        onClick={() => onNavigateToDocuments?.(member.id)}
                                                        className="p-2 text-gray-dark hover:text-info rounded-full"
                                                        title="View documents"
                                                    >
                                                        <ClipboardIcon className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => openImpersonateModal(member)} className="p-2 text-gray-dark hover:text-info rounded-full" title="Impersonate"><UserCircleIcon className="w-5 h-5"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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
                    {!isLoading && !error && filteredAndSortedMembers.map(member => {
                        const tierLabel = member.tier || '—';
                        const tierColor = tierColors[member.tier || ''] || 'bg-gray-200 text-gray-800';
                        const statusLabel = member.status || '—';
                        const statusColor = statusColors[member.status || ''] || 'bg-gray-200 text-gray-800';
                        const mrrDisplay = member.mrr !== null ? `$${member.mrr.toLocaleString()}` : '—';
                        const renewalDisplay = member.renewalDate || '—';
                        const lastAssessmentDisplay = formatDate(member.lastAssessmentDate ?? null);
                        const pendingDisplay = member.pendingItems ?? 0;

                        return (
                            <div key={member.id} className="bg-white rounded-xl shadow-lg border border-gray-border p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-charcoal">{member.businessName}</p>
                                        <p className="text-sm text-gray-dark">{member.email || '—'}</p>
                                        <p className="text-sm text-gray-dark">{member.primaryContact || '—'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${tierColor}`}>{tierLabel}</span>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColor}`}>{statusLabel}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-border flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-dark">MRR: <span className="font-semibold text-charcoal">{mrrDisplay}</span></p>
                                        <p className="text-sm text-gray-dark">Renews: <span className="font-semibold text-charcoal">{renewalDisplay}</span></p>
                                        <p className="text-sm text-gray-dark">Last assessment: <span className="font-semibold text-charcoal">{lastAssessmentDisplay}</span></p>
                                        <p className="text-sm text-gray-dark">
                                            Pending:{' '}
                                            {pendingDisplay > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onNavigateToDocuments?.(member.id)}
                                                    className="ml-1 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-info/10 text-info border border-info/40 hover:bg-info/20 hover:text-info-dark transition cursor-pointer"
                                                >
                                                    {pendingDisplay}
                                                </button>
                                            ) : (
                                                <span className="font-semibold text-charcoal">{pendingDisplay}</span>
                                            )}
                                        </p>
                                    </div>
                                    <button onClick={() => handleSelectMember(member)} className="py-2 px-4 bg-info/10 text-info font-bold rounded-lg">View</button>
                                </div>
                            </div>
                        );
                    })}
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
