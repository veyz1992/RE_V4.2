export interface AdminProfileRow {
    id: string;
    company_name: string | null;
    full_name: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
    membership_tier: string | null;
    member_status: string | null;
    verification_status: string | null;
    badge_rating: string | null;
    created_at: string | null;
    last_assessment_id?: string | null;
}

export interface AdminMembershipRow {
    profile_id: string;
    tier: string | null;
    status: string | null;
    badge_rating: string | null;
    created_at: string | null;
    verification_status?: string | null;
}

export interface AdminAssessmentRow {
    id: string;
    profile_id: string | null;
    pci_rating: string | null;
    created_at: string | null;
}

export interface AdminSubscriptionRow {
    profile_id: string;
    status: string | null;
    created_at: string | null;
}

export interface AdminMemberDocumentRow {
    profile_id: string;
    status: string | null;
    doc_type?: string | null;
}

export interface AdminServiceRequestRow {
    profile_id: string;
    status: string | null;
}

export const normalizeServiceRequestStatus = (status?: string | null): 'open' | 'in_progress' | 'completed' | 'canceled' => {
    const normalized = status?.toLowerCase() ?? '';

    if (normalized.includes('progress')) return 'in_progress';
    if (normalized.includes('complete')) return 'completed';
    if (normalized.includes('cancel')) return 'canceled';

    return 'open';
};

export const getMemberStatus = (
    profile: Pick<AdminProfileRow, 'member_status'>,
    membership?: Pick<AdminMembershipRow, 'status'> | null,
    subscription?: Pick<AdminSubscriptionRow, 'status'> | null
): string | null => {
    if (membership?.status) return membership.status;
    if (profile.member_status) return profile.member_status;

    const normalizedSubscriptionStatus = subscription?.status ?? null;
    if (normalizedSubscriptionStatus === 'active') return 'active';

    return normalizedSubscriptionStatus;
};

export const getVerificationStatus = (
    profile: Pick<AdminProfileRow, 'verification_status'>,
    membership: Pick<AdminMembershipRow, 'verification_status'> | null | undefined,
    documents: AdminMemberDocumentRow[] | null | undefined
): string | null => {
    const pendingDocumentsCount = (documents ?? []).filter(doc => doc.status === 'pending').length;
    const baseStatus = membership?.verification_status ?? profile.verification_status ?? null;

    if (pendingDocumentsCount > 0) return 'pending';
    return baseStatus;
};

export const getLastAssessmentInfo = (
    profile: Pick<AdminProfileRow, 'last_assessment_id'>,
    assessments: AdminAssessmentRow[]
) => {
    const lastAssessment = profile.last_assessment_id
        ? assessments.find(assessment => assessment.id === profile.last_assessment_id) ?? null
        : null;

    const lastAssessmentDate = lastAssessment?.created_at ?? null;
    const hasAnyAssessment = !!lastAssessment;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const hasNewAssessment = !!(
        lastAssessmentDate &&
        new Date(lastAssessmentDate).getTime() >= sevenDaysAgo
    );

    return {
        lastAssessment,
        lastAssessmentDate,
        hasAnyAssessment,
        hasNewAssessment,
    };
};
