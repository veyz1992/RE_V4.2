import { normalizeServiceRequestStatus as normalizeAdminRequestStatus } from '../components/admin/adminUtils';

export const REQUIRED_DOCUMENT_TYPES = ['state_license', 'insurance_proof'];

export interface MemberDocumentLike {
    doc_type?: string | null;
    status?: string | null;
}

export interface ServiceRequestLike {
    status?: string | null;
}

export interface MemberHelperOutputs {
    documents: {
        status: 'verified' | 'pending' | 'required';
        approvedRequiredCount: number;
        pendingRequiredCount: number;
        missingRequiredCount: number;
        requiredTotal: number;
        label: string;
    };
    requests: {
        openCount: number;
        label: string;
    };
}

const normalizeDocumentStatus = (status?: string | null): 'approved' | 'pending' | 'rejected' | 'other' => {
    const normalized = status?.toLowerCase() ?? '';

    if (normalized === 'approved' || normalized === 'valid') return 'approved';
    if (normalized === 'pending' || normalized.includes('review')) return 'pending';
    if (normalized === 'rejected') return 'rejected';

    return 'other';
};

const normalizeRequestStatus = (status?: string | null): 'open' | 'in_progress' | 'completed' | 'canceled' => {
    // Prefer the admin normalizer when available for consistency
    try {
        return normalizeAdminRequestStatus(status);
    } catch {
        const normalized = status?.toLowerCase() ?? '';

        if (normalized.includes('progress')) return 'in_progress';
        if (normalized.includes('complete')) return 'completed';
        if (normalized.includes('cancel')) return 'canceled';

        return 'open';
    }
};

export const deriveMemberHelperOutputs = (
    documents: MemberDocumentLike[] | null | undefined,
    serviceRequests: ServiceRequestLike[] | null | undefined,
): MemberHelperOutputs => {
    const documentRows = documents ?? [];
    const requiredDocs = documentRows.filter((doc) => REQUIRED_DOCUMENT_TYPES.includes((doc.doc_type ?? '').toLowerCase()));
    const approvedRequiredCount = requiredDocs.filter((doc) => normalizeDocumentStatus(doc.status) === 'approved').length;
    const pendingRequiredCount = requiredDocs.filter((doc) => normalizeDocumentStatus(doc.status) === 'pending').length;

    const seenDocTypes = new Set(requiredDocs.map((doc) => (doc.doc_type ?? '').toLowerCase()).filter(Boolean));
    const missingRequiredCount = REQUIRED_DOCUMENT_TYPES.filter((required) => !seenDocTypes.has(required)).length;

    const documentsStatus: MemberHelperOutputs['documents']['status'] =
        approvedRequiredCount >= REQUIRED_DOCUMENT_TYPES.length
            ? 'verified'
            : pendingRequiredCount > 0
                ? 'pending'
                : 'required';

    const openCount = (serviceRequests ?? []).filter((request) => {
        const normalized = normalizeRequestStatus(request.status);
        return normalized === 'open' || normalized === 'in_progress';
    }).length;

    return {
        documents: {
            status: documentsStatus,
            approvedRequiredCount,
            pendingRequiredCount,
            missingRequiredCount,
            requiredTotal: REQUIRED_DOCUMENT_TYPES.length,
            label:
                documentsStatus === 'verified'
                    ? `${approvedRequiredCount}/${REQUIRED_DOCUMENT_TYPES.length} verified`
                    : `${approvedRequiredCount}/${REQUIRED_DOCUMENT_TYPES.length} required`,
        },
        requests: {
            openCount,
            label: `${openCount} open` + (openCount === 1 ? ' request' : ' requests'),
        },
    };
};
