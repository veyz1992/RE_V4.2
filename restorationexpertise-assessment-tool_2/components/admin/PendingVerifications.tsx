import React, { useState, useMemo, useEffect } from 'react';
import { ADMIN_VERIFICATIONS, AdminVerification, AdminVerificationStatus, PackageTier, BadgeRating, AdminDocumentType } from '../../lib/mockData';
import { MagnifyingGlassIcon, EyeIcon, CheckCircleIcon, XMarkIcon, ChevronDownIcon, ClockIcon } from '../icons';
import VerificationDetailDrawer from './VerificationDetailDrawer';

interface PendingVerificationsProps {
    showToast: (message: string, type: 'success' | 'error') => void;
}

const PendingVerifications: React.FC<PendingVerificationsProps> = ({ showToast }) => {
    const [verifications, setVerifications] = useState<AdminVerification[]>(ADMIN_VERIFICATIONS);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: 'All',
        documentType: 'All',
        tier: 'All',
        rating: 'All',
    });
    const [isFiltersVisible, setIsFiltersVisible] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [detailVerification, setDetailVerification] = useState<AdminVerification | null>(null);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const isExpiringSoon = (expiresAt: string): boolean => {
        if (!expiresAt) return false;
        const now = new Date(); // Using current date for real-time check
        const expiryDate = new Date(expiresAt);
        const thirtyDaysFromNow = new Date(now.setDate(now.getDate() + 30));
        now.setDate(now.getDate() - 30); // Reset now date
        return expiryDate > now && expiryDate <= thirtyDaysFromNow;
    };

    const handleUpdateVerification = (updatedVerification: AdminVerification) => {
        setVerifications(prev => prev.map(v => v.id === updatedVerification.id ? updatedVerification : v));
        setDetailVerification(null);
    };

    const filteredVerifications = useMemo(() => {
        return verifications.filter(v => {
            const searchMatch = v.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || v.city.toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = filters.status === 'All' || v.status === filters.status;
            const docTypeMatch = filters.documentType === 'All' || v.documentType === filters.documentType;
            const tierMatch = filters.tier === 'All' || v.tier === filters.tier;
            const ratingMatch = filters.rating === 'All' || v.rating === filters.rating;
            return searchMatch && statusMatch && docTypeMatch && tierMatch && ratingMatch;
        });
    }, [verifications, searchTerm, filters]);

    const handleSelect = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredVerifications.map(v => v.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkAction = (newStatus: AdminVerificationStatus) => {
        let alreadyApprovedCount = 0;
        const updatedVerifications = verifications.map(v => {
            if (selectedIds.has(v.id)) {
                if (v.status === 'Approved' && newStatus === 'Approved') {
                    alreadyApprovedCount++;
                }
                return { ...v, status: newStatus };
            }
            return v;
        });
        setVerifications(updatedVerifications);
        
        let toastMessage = `${selectedIds.size} documents marked as "${newStatus}".`;
        if (alreadyApprovedCount > 0) {
            toastMessage += ` (${alreadyApprovedCount} were already approved.)`;
        }

        showToast(toastMessage, 'success');
        setSelectedIds(new Set());
    };


    const summaryCounts = useMemo(() => {
        return {
            pending: verifications.filter(v => v.status === 'Pending').length,
            needsReplacement: verifications.filter(v => v.status === 'Needs Replacement').length,
            expiringSoon: verifications.filter(v => isExpiringSoon(v.expiresAt) && v.status !== 'Expired').length,
        };
    }, [verifications]);

    const statusColors: { [key in AdminVerificationStatus]: string } = {
        Pending: 'bg-warning/20 text-yellow-800',
        Approved: 'bg-success/20 text-success',
        Rejected: 'bg-error/20 text-error',
        'Needs Replacement': 'bg-orange-500/20 text-orange-600',
        Expired: 'bg-gray-400/20 text-gray-600',
    };

    const statusOptions: AdminVerificationStatus[] = ['Pending', 'Approved', 'Rejected', 'Needs Replacement', 'Expired'];
    const docTypeOptions: AdminDocumentType[] = ['Contractor License', 'Liability Insurance', 'Workers’ Comp', 'IICRC', 'Other'];
    const tierOptions: PackageTier[] = ['Bronze', 'Silver', 'Gold', 'Founding Member'];
    const ratingOptions: BadgeRating[] = ['A+', 'A', 'B+'];

    const isAllFilteredSelected = selectedIds.size > 0 && selectedIds.size === filteredVerifications.length;
    
    const BulkActionToolbar = () => (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-info/10 border border-info/20 rounded-lg mb-6">
            <p className="font-semibold text-charcoal">{selectedIds.size} items selected</p>
            <div className="flex items-center gap-2">
                <button onClick={() => handleBulkAction('Approved')} className="py-2 px-4 bg-success/20 text-success font-bold rounded-lg text-sm">Bulk Approve</button>
                <button onClick={() => handleBulkAction('Needs Replacement')} className="py-2 px-4 bg-warning/20 text-yellow-800 font-bold rounded-lg text-sm">Mark as Needs Replacement</button>
                <button onClick={() => setSelectedIds(new Set())} className="py-2 px-4 bg-gray-200 text-charcoal font-semibold rounded-lg text-sm">Clear Selection</button>
            </div>
        </div>
    );
    
    return (
        <>
            {detailVerification && (
                <VerificationDetailDrawer
                    verification={detailVerification}
                    onClose={() => setDetailVerification(null)}
                    onUpdate={handleUpdateVerification}
                    showToast={showToast}
                />
            )}
            <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
                <div className="mb-6">
                    <h1 className="font-playfair text-3xl font-bold text-charcoal">Verifications Center</h1>
                    <p className="text-gray-dark mt-1">Review and approve documents, manage verification status, and control badge eligibility.</p>
                </div>
                
                <div className="mb-6 bg-white p-3 rounded-xl shadow-md border border-gray-border flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 text-sm">
                    <p><strong>Pending:</strong> <span className="font-mono text-base font-bold text-yellow-800">{summaryCounts.pending}</span></p>
                    <div className="h-4 w-px bg-gray-border"></div>
                    <p><strong>Needs Replacement:</strong> <span className="font-mono text-base font-bold text-orange-600">{summaryCounts.needsReplacement}</span></p>
                    <div className="h-4 w-px bg-gray-border"></div>
                    <p><strong>Expiring Soon (30d):</strong> <span className="font-mono text-base font-bold text-red-600">{summaryCounts.expiringSoon}</span></p>
                </div>
                
                <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-border mb-6">
                    <button onClick={() => setIsFiltersVisible(!isFiltersVisible)} className="w-full flex justify-between items-center md:hidden mb-4">
                        <span className="font-bold text-charcoal">Filters</span>
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isFiltersVisible ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`${isFiltersVisible ? 'block' : 'hidden'} md:grid md:grid-cols-2 lg:grid-cols-5 gap-4`}>
                        <div className="relative col-span-2 lg:col-span-1 mb-2 md:mb-0">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray" />
                            <input type="text" placeholder="Search business/city..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info"/>
                        </div>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Statuses</option>
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="documentType" value={filters.documentType} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Document Types</option>
                            {docTypeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="tier" value={filters.tier} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Tiers</option>
                            {tierOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="rating" value={filters.rating} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Ratings</option>
                            {ratingOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {selectedIds.size > 0 && <div className="hidden md:block"><BulkActionToolbar /></div>}

                <div className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full">
                            <thead className="bg-gray-light/50">
                                <tr>
                                    <th className="p-4"><input type="checkbox" checked={isAllFilteredSelected} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-info focus:ring-info"/></th>
                                    <th className="p-4 text-left text-xs font-bold text-charcoal uppercase">Business</th>
                                    <th className="p-4 text-left text-xs font-bold text-charcoal uppercase">Document</th>
                                    <th className="p-4 text-left text-xs font-bold text-charcoal uppercase">Status</th>
                                    <th className="p-4 text-left text-xs font-bold text-charcoal uppercase">Uploaded</th>
                                    <th className="p-4 text-left text-xs font-bold text-charcoal uppercase">Expires</th>
                                    <th className="p-4 text-right text-xs font-bold text-charcoal uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-border">
                                {filteredVerifications.map(v => (
                                    <tr key={v.id} className={`hover:bg-gray-light/50 ${selectedIds.has(v.id) ? 'bg-info/5' : ''}`}>
                                        <td className="p-4"><input type="checkbox" checked={selectedIds.has(v.id)} onChange={() => handleSelect(v.id)} className="h-4 w-4 rounded border-gray-300 text-info focus:ring-info"/></td>
                                        <td className="p-4"><p className="font-semibold text-charcoal">{v.businessName}</p><p className="text-sm text-gray-dark">{v.city}</p></td>
                                        <td className="p-4"><p className="font-semibold text-charcoal">{v.documentType}</p><p className="text-sm text-gray-dark">{v.tier} • {v.rating}</p></td>
                                        <td className="p-4"><span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[v.status]}`}>{v.status}</span></td>
                                        <td className="p-4 text-sm">{v.uploadedAt}</td>
                                        <td className="p-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span>{v.expiresAt}</span>
                                                {/* FIX: Wrapped ClockIcon in a span with a title attribute to fix prop error and provide tooltip. */}
                                                {isExpiringSoon(v.expiresAt) && <span title="Expiring soon"><ClockIcon className="w-4 h-4 text-warning" /></span>}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => setDetailVerification(v)} className="py-2 px-4 bg-white border border-gray-border text-charcoal font-semibold rounded-lg shadow-sm hover:bg-gray-light text-sm">Review</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden divide-y divide-gray-border">
                        {filteredVerifications.map(v => (
                            <div key={v.id} className={`p-4 space-y-3 ${selectedIds.has(v.id) ? 'bg-info/5' : ''}`} onClick={() => handleSelect(v.id)}>
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-charcoal">{v.businessName}</p>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[v.status]}`}>{v.status}</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-charcoal">{v.documentType}</p>
                                    <p className="text-sm text-gray-dark">{v.tier} • {v.rating}</p>
                                </div>
                                <div className="flex justify-between items-end text-sm">
                                    <div>
                                        <p><span className="text-gray-dark">Uploaded:</span> {v.uploadedAt}</p>
                                        <div className="flex items-center gap-1"><span className="text-gray-dark">Expires:</span> {v.expiresAt} {isExpiringSoon(v.expiresAt) && <ClockIcon className="w-4 h-4 text-warning" />}</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setDetailVerification(v); }} className="py-2 px-4 bg-info/10 text-info font-bold rounded-lg">Review</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {filteredVerifications.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-border">
                        <h3 className="text-xl font-bold text-charcoal">No verifications found</h3>
                        <p className="text-gray-dark mt-1">Try adjusting your search or filters.</p>
                    </div>
                )}
                
                {selectedIds.size > 0 && <div className="md:hidden fixed bottom-0 left-0 right-0 z-30"><BulkActionToolbar /></div>}
            </div>
        </>
    );
};

export default PendingVerifications;