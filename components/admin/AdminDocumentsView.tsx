// Admin verification queue for member_documents; keep column usage in sync with Supabase schema.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ClipboardIcon, CheckCircleIcon, XMarkIcon } from '../icons';

interface AdminDocumentsViewProps {
    showToast: (message: string, type: 'success' | 'error') => void;
    profileIdFilter?: string | null;
}

interface SupabaseDocumentRow {
    id: string | number;
    profile_id?: string | null;
    doc_type?: string | null;
    file_url?: string | null;
    status?: string | null;
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
    status: string;
    adminNotes: string | null;
    uploadedAt: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
    expiresAt: string | null;
    createdAt: string | null;
}

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

const normalizeStatus = (status?: string | null): string => status?.toLowerCase() ?? 'pending';

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
    adminNotes: row.admin_notes ?? null,
    uploadedAt: row.uploaded_at ?? row.created_at ?? null,
    approvedAt: row.approved_at ?? null,
    rejectedAt: row.rejected_at ?? null,
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at ?? null,
});

const PENDING_STATUSES = ['pending', 'submitted', 'under_review'];

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

    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const profileIdFromQuery = searchParams.get('profileId');
    const activeProfileFilter = profileIdFilter ?? profileIdFromQuery ?? null;

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('member_documents')
                .select(
                    'id, profile_id, doc_type, file_url, status, admin_notes, uploaded_at, approved_at, rejected_at, expires_at, created_at'
                )
                .in('status', PENDING_STATUSES)
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
            setError('Unable to load pending documents. Please try again.');
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

            showToast(`Document ${status === 'approved' ? 'approved' : 'rejected'} successfully.`, 'success');
            setDocuments((current) => current.filter((item) => item.id !== document.id));
        } catch (updateError) {
            console.error('Failed to update document', updateError);
            showToast('Failed to update the document. Please try again.', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    const pendingCount = useMemo(() => documents.length, [documents]);

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

            <div className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
                <div className="overflow-x-auto hidden md:block">
                    <table className="min-w-full">
                        <thead className="bg-gray-light/50">
                            <tr>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Member</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Document</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Uploaded</th>
                                <th className="p-4 text-left text-xs font-bold text-gray-dark uppercase">Notes</th>
                                <th className="p-4 text-right text-xs font-bold text-gray-dark uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-border">
                            {documents.map((document) => (
                                <tr key={document.id} className="align-top">
                                    <td className="p-4">
                                        <p className="font-semibold text-charcoal">{document.profileId}</p>
                                        <p className="text-sm text-gray-dark uppercase tracking-wide">{document.status}</p>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-semibold text-charcoal">{getDocumentLabel(document.docType)}</p>
                                        <p className="text-sm text-gray-dark">{document.docType ?? '—'}</p>
                                    </td>
                                    <td className="p-4 text-sm text-gray-dark">{formatDateTime(document.uploadedAt)}</td>
                                    <td className="p-4">
                                        <textarea
                                            value={notesByDocument[document.id] ?? ''}
                                            onChange={(event) => handleNoteChange(document.id, event.target.value)}
                                            rows={3}
                                            className="w-full border border-gray-border rounded-lg text-sm p-2 focus:outline-none focus:ring-2 focus:ring-info"
                                            placeholder="Add an internal note…"
                                        ></textarea>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-3">
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="md:hidden divide-y divide-gray-border">
                    {documents.map((document) => (
                        <div key={document.id} className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-charcoal">{getDocumentLabel(document.docType)}</p>
                                    <p className="text-sm text-gray-dark">{document.docType ?? '—'}</p>
                                </div>
                                <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-light text-gray-dark uppercase">
                                    {document.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-dark">Profile: {document.profileId}</p>
                            <p className="text-sm text-gray-dark">Uploaded {formatDateTime(document.uploadedAt)}</p>
                            <textarea
                                value={notesByDocument[document.id] ?? ''}
                                onChange={(event) => handleNoteChange(document.id, event.target.value)}
                                rows={3}
                                className="w-full border border-gray-border rounded-lg text-sm p-2 focus:outline-none focus:ring-2 focus:ring-info"
                                placeholder="Add an internal note…"
                            ></textarea>
                            <div className="flex items-center justify-end gap-2">
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
                    ))}
                </div>
            </div>

            {documents.length === 0 && !isLoading && (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-border">
                    <ClipboardIcon className="w-12 h-12 mx-auto text-gray-300" />
                    <h3 className="mt-4 text-xl font-bold text-charcoal">No pending documents</h3>
                    <p className="text-gray-dark mt-1">All member uploads have been reviewed.</p>
                </div>
            )}
        </div>
    );
};

export default AdminDocumentsView;
