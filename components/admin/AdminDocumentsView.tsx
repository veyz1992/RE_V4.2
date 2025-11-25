// Admin verification queue for member_documents; keep column usage in sync with Supabase schema.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { recalculateVerificationForProfile } from '@/lib/verification';
import { useAuth } from '@src/context/AuthContext';
import { ChevronDownIcon, ClipboardIcon, CheckCircleIcon, XMarkIcon } from '../icons';

interface AdminDocumentsViewProps {
    showToast: (message: string, type: 'success' | 'error') => void;
    profileIdFilter?: string | null;
}

type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired';

interface SupabaseDocumentRow {
    id: string | number;
    profile_id?: string | null;
    profiles?: {
        company_name?: string | null;
        email?: string | null;
    } | null;
    doc_type?: string | null;
    file_url?: string | null;
    status?: DocumentStatus | null;
    admin_notes?: string | null;
    uploaded_at?: string | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    expires_at?: string | null;
    created_at?: string | null;
    [key: string]: unknown;
}

interface AdminDocument {
    id: string;
    profileId: string;
    docType: string | null;
    status: DocumentStatus;
    companyName: string | null;
    email: string | null;
    adminNotes: string | null;
    uploadedAt: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
    expiresAt: string | null;
    createdAt: string | null;
}

interface MemberDocumentGroup {
    profileId: string;
    companyName: string | null;
    email: string | null;
    documents: AdminDocument[];
    pendingCount: number;
    verifiedCount: number;
    rejectedCount: number;
    latestUpload: string | null;
}

type FilterOption = 'all' | 'needs_review' | 'verified';

const formatDateTime = (value?: string | null): string => {
    if (!value) {
        return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    }).format(date);
};

const normalizeStatus = (status?: DocumentStatus | null): DocumentStatus => status ?? 'pending';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    id_card: 'ID Card',
    passport: 'Passport',
    utility_bill: 'Utility Bill',
    business_license: 'Business License',
};

const getDocumentLabel = (docType?: string | null): string => {
    if (!docType) {
        return 'Document';
    }

    return DOCUMENT_TYPE_LABELS[docType] ?? docType;
};

const mapDocumentRow = (row: SupabaseDocumentRow): AdminDocument => ({
    id: String(row.id),
    profileId: row.profile_id ?? '',
    docType: row.doc_type ?? null,
    status: normalizeStatus(row.status),
    companyName: row.profiles?.company_name ?? null,
    email: row.profiles?.email ?? null,
    adminNotes: row.admin_notes ?? null,
    uploadedAt: row.uploaded_at ?? row.created_at ?? null,
    approvedAt: row.approved_at ?? null,
    rejectedAt: row.rejected_at ?? null,
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at ?? null,
});

const VISIBLE_STATUSES: DocumentStatus[] = ['pending', 'approved', 'rejected', 'expired'];

const AdminDocumentsView: React.FC<AdminDocumentsViewProps> = ({ showToast, profileIdFilter }) => {
    const { session } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<AdminDocument[]>([]);
    const [notesByDocument, setNotesByDocument] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [profileName, setProfileName] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterOption>('all');
    const [expandedProfiles, setExpandedProfiles] = useState<Record<string, boolean>>({});

    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const profileIdFromQuery = searchParams.get('profileId');
    const activeProfileFilter = profileIdFilter ?? profileIdFromQuery ?? null;

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('member_documents')
                .select(
                    'id, profile_id, doc_type, file_url, status, admin_notes, uploaded_at, approved_at, rejected_at, expires_at, created_at, profiles (company_name, email)'
                )
                .in('status', VISIBLE_STATUSES)
                .order('created_at', { ascending: false });

            if (activeProfileFilter) {
                query = query.eq('profile_id', activeProfileFilter);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                throw fetchError;
            }

            const rows = (data as SupabaseDocumentRow[] | null) ?? [];
            const mapped = rows.map(mapDocumentRow);
            setDocuments(mapped);
            setNotesByDocument(() => {
                const initial: Record<string, string> = {};
                mapped.forEach((doc) => {
                    if (doc.adminNotes) {
                        initial[doc.id] = doc.adminNotes;
                    }
                });
                return initial;
            });
            setError(null);
        } catch (fetchError) {
            console.error('Failed to load documents', fetchError);
            setError('Unable to load documents. Please try again.');
            setDocuments([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeProfileFilter]);

    useEffect(() => {
        void fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        if (!activeProfileFilter) {
            setProfileName(null);
            return;
        }

        const fetchProfileName = async () => {
            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('company_name')
                .eq('id', activeProfileFilter)
                .maybeSingle();

            if (profileError) {
                console.error('Failed to fetch profile for documents filter', profileError);
                setProfileName(null);
                return;
            }

            setProfileName(data?.company_name ?? null);
        };

        void fetchProfileName();
    }, [activeProfileFilter]);

    const clearProfileFilter = () => {
        const params = new URLSearchParams(location.search);
        params.delete('profileId');
        params.set('view', 'documents');
        navigate({ pathname: location.pathname, search: `?${params.toString()}` });
    };

    const handleNoteChange = (id: string, value: string) => {
        setNotesByDocument((previous) => ({
            ...previous,
            [id]: value,
        }));
    };

    const updateDocumentStatus = async (document: AdminDocument, status: 'approved' | 'rejected') => {
        if (!session?.user?.id) {
            showToast('You must be logged in as an admin to update documents.', 'error');
            return;
        }

        setUpdatingId(document.id);

        try {
            const { error: updateError } = await supabase
                .from('member_documents')
                .update({
                    status,
                    admin_notes: notesByDocument[document.id] ?? null,
                    approved_at: status === 'approved' ? new Date().toISOString() : null,
                    rejected_at: status === 'rejected' ? new Date().toISOString() : null,
                })
                .eq('id', document.id);

            if (updateError) {
                throw updateError;
            }

            setDocuments((current) =>
                current.map((item) =>
                    item.id === document.id
                        ? {
                              ...item,
                              status,
                              approvedAt: status === 'approved' ? new Date().toISOString() : null,
                              rejectedAt: status === 'rejected' ? new Date().toISOString() : null,
                          }
                        : item,
                ),
            );

            try {
                await recalculateVerificationForProfile(document.profileId);
            } catch (recalculateError) {
                console.error('Failed to recalculate verification status', recalculateError);
                showToast('Document updated, but verification status may be outdated.', 'error');
            }

            await fetchDocuments();
            showToast(`Document ${status === 'approved' ? 'approved' : 'rejected'} successfully.`, 'success');
        } catch (updateError) {
            console.error('Failed to update document', updateError);
            showToast('Failed to update the document. Please try again.', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const pendingCount = useMemo(
        () => documents.filter((document) => document.status === 'pending').length,
        [documents],
    );

    const groupedDocuments = useMemo<MemberDocumentGroup[]>(() => {
        const groups = new Map<string, MemberDocumentGroup>();

        const resolveDate = (value: string | null | undefined) => (value ? new Date(value).getTime() : -Infinity);

        documents.forEach((document) => {
            const latestUpload = document.uploadedAt ?? document.createdAt ?? null;
            const existing = groups.get(document.profileId);

            if (!existing) {
                groups.set(document.profileId, {
                    profileId: document.profileId,
                    companyName: document.companyName ?? null,
                    email: document.email ?? null,
                    documents: [document],
                    pendingCount: document.status === 'pending' ? 1 : 0,
                    verifiedCount: document.status === 'approved' ? 1 : 0,
                    rejectedCount: document.status === 'rejected' ? 1 : 0,
                    latestUpload,
                });
                return;
            }

            existing.documents.push(document);

            if (document.status === 'pending') existing.pendingCount += 1;
            if (document.status === 'approved') existing.verifiedCount += 1;
            if (document.status === 'rejected') existing.rejectedCount += 1;

            const currentLatest = existing.latestUpload;
            const isNewer = resolveDate(latestUpload) > resolveDate(currentLatest);
            if (isNewer) {
                existing.latestUpload = latestUpload;
            }
        });

        return Array.from(groups.values()).sort((first, second) => {
            const firstDate = first.latestUpload ? new Date(first.latestUpload).getTime() : 0;
            const secondDate = second.latestUpload ? new Date(second.latestUpload).getTime() : 0;
            return secondDate - firstDate;
        });
    }, [documents]);

    const filterCounts = useMemo(
        () =>
            groupedDocuments.reduce(
                (accumulator, group) => {
                    if (group.pendingCount > 0) {
                        accumulator.needsReview += 1;
                    }
                    if (group.pendingCount === 0 && group.verifiedCount > 0) {
                        accumulator.verified += 1;
                    }

                    return accumulator;
                },
                { needsReview: 0, verified: 0 },
            ),
        [groupedDocuments],
    );

    const filteredGroups = useMemo(() => {
        if (filter === 'all') {
            return groupedDocuments;
        }

        if (filter === 'needs_review') {
            return groupedDocuments.filter((group) => group.pendingCount > 0);
        }

        return groupedDocuments.filter((group) => group.pendingCount === 0 && group.verifiedCount > 0);
    }, [filter, groupedDocuments]);

    const toggleProfile = (profileId: string) => {
        setExpandedProfiles((current) => ({
            ...current,
            [profileId]: !current[profileId],
        }));
    };

    const formatStatusBadge = (status: DocumentStatus) => {
        const baseClasses = 'px-3 py-1 text-xs font-bold rounded-full uppercase';

        if (status === 'approved') return `${baseClasses} bg-success/10 text-success`;
        if (status === 'rejected') return `${baseClasses} bg-error/10 text-error`;
        if (status === 'expired') return `${baseClasses} bg-warning/10 text-warning-dark`;
        return `${baseClasses} bg-info/10 text-info`;
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="font-playfair text-3xl font-bold text-charcoal">Documents Awaiting Review</h1>
                    <p className="text-gray-dark mt-1">Approve or reject the latest verification uploads from members.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-info/10 text-info text-sm font-semibold">
                        Pending: {pendingCount}
                    </span>
                    <button
                        onClick={() => void fetchDocuments()}
                        className="px-4 py-2 bg-white border border-gray-border rounded-lg text-sm font-semibold text-charcoal shadow-sm hover:bg-gray-50"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold shadow-sm transition ${
                        filter === 'all'
                            ? 'bg-info text-white border-info'
                            : 'bg-white text-charcoal border-gray-border hover:bg-gray-50'
                    }`}
                >
                    All
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-inherit">
                        {groupedDocuments.length}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setFilter('needs_review')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold shadow-sm transition ${
                        filter === 'needs_review'
                            ? 'bg-warning-dark text-white border-warning-dark'
                            : 'bg-white text-charcoal border-gray-border hover:bg-gray-50'
                    }`}
                >
                    Needs review
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-inherit">
                        {filterCounts.needsReview}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setFilter('verified')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold shadow-sm transition ${
                        filter === 'verified'
                            ? 'bg-success text-white border-success'
                            : 'bg-white text-charcoal border-gray-border hover:bg-gray-50'
                    }`}
                >
                    Verified
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-inherit">
                        {filterCounts.verified}
                    </span>
                </button>
            </div>

            {activeProfileFilter && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-info/5 border border-info/30 text-sm text-charcoal">
                    <span className="inline-flex items-center gap-2 font-semibold">
                        Filtered by member:
                        <span className="px-2 py-1 rounded-full bg-white border border-info/30 text-info text-xs font-bold">
                            {profileName ?? activeProfileFilter}
                        </span>
                    </span>
                    <button
                        type="button"
                        onClick={clearProfileFilter}
                        className="text-info underline underline-offset-2 hover:text-info-dark font-semibold"
                    >
                        Clear filter
                    </button>
                </div>
            )}

            {error && (
                <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
            )}

            <div className="space-y-4">
                {filteredGroups.map((group) => {
                    const isExpanded = expandedProfiles[group.profileId] ?? false;

                    return (
                        <div key={group.profileId} className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
                            <button
                                type="button"
                                onClick={() => toggleProfile(group.profileId)}
                                className="w-full px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left hover:bg-gray-50"
                            >
                                <div className="space-y-0.5">
                                    <p className="font-semibold text-charcoal text-lg">{group.companyName ?? 'Unknown company'}</p>
                                    <p className="text-sm text-gray-dark">{group.email ?? '—'}</p>
                                    <p className="text-xs text-gray-500">Profile ID: {group.profileId}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-info/10 text-info text-xs font-bold">
                                        Pending {group.pendingCount}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-bold">
                                        Verified {group.verifiedCount}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error/10 text-error text-xs font-bold">
                                        Rejected {group.rejectedCount}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                                        Latest upload: {formatDateTime(group.latestUpload)}
                                    </span>
                                    <span className="ml-2 hidden sm:inline-flex">
                                        <ChevronDownIcon
                                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180 text-info' : 'text-gray-500'}`}
                                        />
                                    </span>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-gray-border divide-y divide-gray-border">
                                    {group.documents.map((document) => (
                                        <div key={document.id} className="p-4 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <p className="font-semibold text-charcoal text-lg">
                                                                {getDocumentLabel(document.docType)}
                                                            </p>
                                                            <p className="text-sm text-gray-dark">{document.docType ?? '—'}</p>
                                                        </div>
                                                        <span className={formatStatusBadge(document.status)}>{document.status}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-dark">Uploaded {formatDateTime(document.uploadedAt)}</p>
                                                </div>
                                                <div className="flex items-center gap-2 sm:self-start">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateDocumentStatus(document, 'approved')}
                                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-success/90 text-white text-sm font-semibold shadow-sm hover:bg-success"
                                                        disabled={updatingId === document.id}
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4" /> Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateDocumentStatus(document, 'rejected')}
                                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-error/90 text-white text-sm font-semibold shadow-sm hover:bg-error"
                                                        disabled={updatingId === document.id}
                                                    >
                                                        <XMarkIcon className="w-4 h-4" /> Reject
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-charcoal mb-2">Internal notes</label>
                                                <textarea
                                                    value={notesByDocument[document.id] ?? ''}
                                                    onChange={(event) => handleNoteChange(document.id, event.target.value)}
                                                    rows={3}
                                                    className="w-full border border-gray-border rounded-lg text-sm p-2 focus:outline-none focus:ring-2 focus:ring-info"
                                                    placeholder="Add an internal note…"
                                                ></textarea>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredGroups.length === 0 && !isLoading && (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-border">
                    <ClipboardIcon className="w-12 h-12 mx-auto text-gray-300" />
                    <h3 className="mt-4 text-xl font-bold text-charcoal">No documents found</h3>
                    <p className="text-gray-dark mt-1">
                        {documents.length === 0
                            ? 'There are no member uploads to review right now.'
                            : 'No members match the selected filter.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default AdminDocumentsView;
