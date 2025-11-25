export interface AdminMember {
    id: string;
    businessName: string;
    primaryContact: string | null;
    email: string | null;
    city: string | null;
    state: string | null;
    location: string | null;
    tier: string | null;
    status: string | null;
    verificationStatus: string | null;
    badgeRating: string | null;
    joinDate: string | null;
    mrr: number | null;
    renewalDate: string | null;
    pendingDocs: number | null;
    openRequests: number | null;
    hasActiveSubscription?: boolean;
    hasAnyAssessment?: boolean;
    lastAssessmentDate?: string | null;
    hasNewAssessment?: boolean;
    pendingItems?: number;
    helperOutputs?: import('../../lib/memberHelperOutputs').MemberHelperOutputs;
}
