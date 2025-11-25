import { supabase } from './supabase';

const REQUIRED_DOCUMENT_TYPES = ['state_license', 'insurance_proof'];

interface MembershipRecord {
    id: string;
    tier?: string | null;
    status?: string | null;
}

interface MemberDocumentRow {
    doc_type?: string | null;
}

const hasPaidMembership = (membership?: MembershipRecord | null): boolean => {
    if (!membership) {
        return false;
    }

    const tier = membership.tier ?? 'free';
    return tier !== 'free';
};

export const recalculateVerificationForProfile = async (profileId: string): Promise<void> => {
    if (!profileId) {
        return;
    }

    const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('id, tier, status')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<MembershipRecord>();

    if (membershipError) {
        throw membershipError;
    }

    if (!hasPaidMembership(membership)) {
        return;
    }

    const { data: approvedDocs, error: documentsError } = await supabase
        .from('member_documents')
        .select('doc_type')
        .eq('profile_id', profileId)
        .in('doc_type', REQUIRED_DOCUMENT_TYPES)
        .eq('status', 'approved');

    if (documentsError) {
        throw documentsError;
    }

    const approvedRows = (approvedDocs as MemberDocumentRow[] | null) ?? [];
    const hasAllRequiredDocs = REQUIRED_DOCUMENT_TYPES.every((docType) =>
        approvedRows.some((doc) => doc.doc_type === docType),
    );

    const verificationStatus = hasAllRequiredDocs ? 'verified' : 'pending';

    const { error: membershipUpdateError } = await supabase
        .from('memberships')
        .update({ verification_status: verificationStatus })
        .eq('id', membership.id);

    if (membershipUpdateError) {
        throw membershipUpdateError;
    }

    const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ verification_status: verificationStatus })
        .eq('id', profileId);

    if (profileUpdateError) {
        throw profileUpdateError;
    }
};
