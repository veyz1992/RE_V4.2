import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '../icons';
import { AdminMember } from './types';

interface MemberDetailDrawerProps {
    member: AdminMember | null;
    onClose: () => void;
    onMemberUpdated?: (profile: ProfileRow) => void;
}

interface ProfileRow {
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
}

interface MembershipRow {
    profile_id: string;
    tier: string | null;
    status: string | null;
    verification_status?: string | null;
    badge_rating: string | null;
}

interface SubscriptionRow {
    id: string;
    profile_id: string;
    status?: string | null;
    created_at?: string | null;
}

interface AssessmentRow {
    id?: string;
    profile_id: string;
    pci_rating: string | null;
    total_score?: number | null;
    operational_score?: number | null;
    licensing_score?: number | null;
    feedback_score?: number | null;
    certifications_score?: number | null;
    digital_score?: number | null;
    created_at?: string | null;
}

interface MemberSummary {
    pciRating: string | number | null;
    initialPciRating: string | number | null;
    totalScore: number | null;
    initialTotalScore: number | null;
    membershipTier: string | null;
    memberStatus: string | null;
    verificationStatus: string | null;
    badgeRating: string | null;
    joinDate: string | null;
}

interface MemberFullData {
    profile: ProfileRow;
    membership: MembershipRow | null;
    subscription: SubscriptionRow | null;
    firstAssessment: AssessmentRow | null;
    latestAssessment: AssessmentRow | null;
    summary: MemberSummary;
    badgeDesigns: any[];
    documents: any[];
    serviceRequests: any[];
}

const membershipTierOptions = ['free', 'founding', 'bronze', 'silver', 'gold'] as const;
const memberStatusOptions = ['pending', 'active', 'inactive', 'canceled'] as const;
const verificationStatusOptions = ['pending', 'verified', 'rejected'] as const;
const badgeRatingOptions = ['A+', 'A', 'B+', 'B', 'C'] as const;

const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({ member, onClose, onMemberUpdated }) => {
    const [companyName, setCompanyName] = useState('');
    const [primaryContact, setPrimaryContact] = useState('');
    const [email, setEmail] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [membershipTier, setMembershipTier] = useState('');
    const [memberStatus, setMemberStatus] = useState('');
    const [verificationStatus, setVerificationStatus] = useState('');
    const [badgeRating, setBadgeRating] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [memberDetail, setMemberDetail] = useState<MemberFullData | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    const normalizeOption = <T extends readonly string[]>(value: string | null | undefined, options: T) =>
        options.includes((value ?? '') as T[number]) ? (value as T[number]) : '';

    useEffect(() => {
        if (!member) {
            setMemberDetail(null);
            return;
        }

        let cancelled = false;

        const loadDetail = async () => {
            setDetailLoading(true);
            setDetailError(null);

            try {
                const res = await fetch(`/.netlify/functions/admin-get-member-full?profileId=${member.id}`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to load member detail');
                }

                if (!cancelled) {
                    setMemberDetail(data as MemberFullData);
                }
            } catch (err: any) {
                console.error('Failed to load member full detail', err);
                if (!cancelled) {
                    setDetailError(err.message || 'Failed to load member detail');
                }
            } finally {
                if (!cancelled) {
                    setDetailLoading(false);
                }
            }
        };

        loadDetail();

        return () => {
            cancelled = true;
        };
    }, [member?.id]);

    useEffect(() => {
        if (!member) {
            setCompanyName('');
            setPrimaryContact('');
            setEmail('');
            setCity('');
            setState('');
            setMembershipTier('');
            setMemberStatus('');
            setVerificationStatus('');
            setBadgeRating('');
            setError(null);
            return;
        }

        const profileSource = memberDetail?.profile?.id === member.id ? memberDetail.profile : null;
        const summarySource = memberDetail?.profile?.id === member.id ? memberDetail.summary : null;

        setCompanyName(profileSource?.company_name ?? member.businessName ?? '');
        setPrimaryContact(profileSource?.full_name ?? member.primaryContact ?? '');
        setEmail(profileSource?.email ?? member.email ?? '');
        setCity(profileSource?.city ?? member.city ?? '');
        setState(profileSource?.state ?? member.state ?? '');
        setMembershipTier(normalizeOption(summarySource?.membershipTier ?? member.tier, membershipTierOptions));
        setMemberStatus(normalizeOption(summarySource?.memberStatus ?? member.status, memberStatusOptions));
        setVerificationStatus(normalizeOption(summarySource?.verificationStatus ?? member.verificationStatus, verificationStatusOptions));
        setBadgeRating(normalizeOption(summarySource?.badgeRating ?? member.badgeRating, badgeRatingOptions));
        setError(null);
    }, [member, memberDetail]);

    const handleSelectChange = <T extends string>(setter: (value: T) => void, options: readonly T[]) =>
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value as T;
            if (value === '') {
                setter('' as T);
                return;
            }

            if (options.includes(value)) {
                setter(value);
            }
        };

    const handleSave = async () => {
        if (!member) return;
        setIsSaving(true);
        setError(null);

        try {
            const sanitizedMembershipTier = membershipTierOptions.includes(membershipTier as typeof membershipTierOptions[number]) ? membershipTier : null;
            const sanitizedMemberStatus = memberStatusOptions.includes(memberStatus as typeof memberStatusOptions[number]) ? memberStatus : null;
            const sanitizedVerificationStatus = verificationStatusOptions.includes(verificationStatus as typeof verificationStatusOptions[number]) ? verificationStatus : null;
            const sanitizedBadgeRating = badgeRatingOptions.includes(badgeRating as typeof badgeRatingOptions[number]) ? badgeRating : null;

            const response = await fetch('/.netlify/functions/admin-update-member', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profileId: member.id,
                    companyName: companyName || null,
                    fullName: primaryContact || null,
                    email: email || null,
                    city: city || null,
                    state: state || null,
                    membershipTier: sanitizedMembershipTier,
                    memberStatus: sanitizedMemberStatus,
                    verificationStatus: sanitizedVerificationStatus,
                    badgeRating: sanitizedBadgeRating,
                }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                const errorMessage = body.details || body.error || `Request failed with status ${response.status}`;
                throw new Error(`Failed to update profile: ${errorMessage}`);
            }

            const body: { profile?: ProfileRow } = await response.json();

            if (body.profile) {
                onMemberUpdated?.(body.profile);
            }
        } catch (err: any) {
            setError(err?.message ?? 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    if (!member) return null;

    const renderAssessmentDetails = (title: string, rating: string | number | null, assessment: AssessmentRow | null) => (
        <div className="border border-gray-border rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-charcoal">{title}</p>
                <span className="text-sm font-semibold text-info">
                    {rating ?? 'No assessment yet'}
                </span>
            </div>

            {assessment ? (
                <dl className="grid grid-cols-2 gap-2 text-xs text-gray-dark">
                    <div>
                        <dt className="font-semibold text-charcoal">Total score</dt>
                        <dd>{assessment.total_score ?? 'N/A'}</dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-charcoal">Operational</dt>
                        <dd>{assessment.operational_score ?? 'N/A'}</dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-charcoal">Licensing</dt>
                        <dd>{assessment.licensing_score ?? 'N/A'}</dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-charcoal">Feedback</dt>
                        <dd>{assessment.feedback_score ?? 'N/A'}</dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-charcoal">Certifications</dt>
                        <dd>{assessment.certifications_score ?? 'N/A'}</dd>
                    </div>
                    <div>
                        <dt className="font-semibold text-charcoal">Digital</dt>
                        <dd>{assessment.digital_score ?? 'N/A'}</dd>
                    </div>
                </dl>
            ) : (
                <p className="text-sm text-gray-dark">No assessment recorded.</p>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose}></div>

            <div className="absolute inset-y-0 right-0 w-full max-w-md md:max-w-sm lg:max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
                <div className="p-4 border-b border-gray-border shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-charcoal">Edit member</h2>
                            <p className="text-sm text-gray-dark">{member.businessName}</p>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-dark hover:text-charcoal" aria-label="Close member details">
                            <XMarkIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                <div className="flex-grow p-4 overflow-y-auto">
                    <div className="space-y-4">
                        {detailError && <p className="text-sm text-error">{detailError}</p>}
                        {detailLoading && <p className="text-sm text-gray-dark">Loading full member details…</p>}

                        {memberDetail && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-charcoal">Overview</h3>
                                    <span className="text-xs text-gray-dark">Joined: {memberDetail.summary.joinDate ? new Date(memberDetail.summary.joinDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="px-2 py-1 rounded-full bg-info/10 text-info font-semibold">Tier: {memberDetail.summary.membershipTier ?? 'Unknown'}</span>
                                    <span className="px-2 py-1 rounded-full bg-success/10 text-success font-semibold">Status: {memberDetail.summary.memberStatus ?? 'Unknown'}</span>
                                    <span className="px-2 py-1 rounded-full bg-warning/10 text-warning font-semibold">Verification: {memberDetail.summary.verificationStatus ?? 'Unknown'}</span>
                                    <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">Badge: {memberDetail.summary.badgeRating ?? 'Not rated yet'}</span>
                                    <span className="px-2 py-1 rounded-full bg-gray-light text-charcoal font-semibold">PCI rating: {memberDetail.summary.pciRating ?? 'No assessment yet'}</span>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-md font-semibold text-charcoal">Assessments</h4>
                                    <div className="space-y-2">
                                        {renderAssessmentDetails('Initial PCI rating', memberDetail.summary.initialPciRating, memberDetail.firstAssessment)}
                                        {renderAssessmentDetails('Latest PCI rating', memberDetail.summary.pciRating, memberDetail.latestAssessment)}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-dark mb-1">Business name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                className="w-full border border-gray-border rounded-lg px-3 py-2 focus:ring-info focus:border-info"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-dark mb-1">Primary contact</label>
                            <input
                                type="text"
                                value={primaryContact}
                                onChange={e => setPrimaryContact(e.target.value)}
                                className="w-full border border-gray-border rounded-lg px-3 py-2 focus:ring-info focus:border-info"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-dark mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full border border-gray-border rounded-lg px-3 py-2 focus:ring-info focus:border-info"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-dark mb-1">City</label>
                                <input
                                    type="text"
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    className="w-full border border-gray-border rounded-lg px-3 py-2 focus:ring-info focus:border-info"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-dark mb-1">State</label>
                                <input
                                    type="text"
                                    value={state}
                                    onChange={e => setState(e.target.value)}
                                    className="w-full border border-gray-border rounded-lg px-3 py-2 focus:ring-info focus:border-info"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-dark mb-1">Membership tier</label>
                                <select
                                    value={membershipTier}
                                    onChange={handleSelectChange(setMembershipTier, membershipTierOptions)}
                                    className="w-full border border-gray-border rounded-lg px-3 py-2 focus:ring-info focus:border-info bg-white"
                                >
                                    <option value="">Select tier</option>
                                    {membershipTierOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-dark mb-1">Member status</label>
                                <select
                                    value={memberStatus}
                                    onChange={handleSelectChange(setMemberStatus, memberStatusOptions)}
                                    className="w-full border border-gray-border rounded-lg px-3 py-2 focus:ring-info focus:border-info bg-white"
                                >
                                    <option value="">Select status</option>
                                    {memberStatusOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-dark mb-1">Verification status</label>
                                <select
                                    value={verificationStatus}
                                    onChange={handleSelectChange(setVerificationStatus, verificationStatusOptions)}
                                    className="w-full border border-gray-border rounded-lg px-3 py-2 focus:ring-info focus:border-info bg-white"
                                >
                                    <option value="">Select verification</option>
                                    {verificationStatusOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-dark mb-1">Badge rating</label>
                                <select
                                    value={badgeRating}
                                    onChange={handleSelectChange(setBadgeRating, badgeRatingOptions)}
                                    className="w-full border border-gray-border rounded-lg px-3 py-2 focus:ring-info focus:border-info bg-white"
                                >
                                    <option value="">Select rating</option>
                                    {badgeRatingOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {error && <p className="text-sm text-error">{error}</p>}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-border bg-gray-light/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-border rounded-lg text-gray-dark hover:bg-gray-light"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-info text-white rounded-lg font-semibold hover:bg-info/90 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MemberDetailDrawer;
