import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '../icons';
import { AdminMember } from './types';

interface MemberDetailDrawerProps {
    member: AdminMember | null;
    onClose: () => void;
    onMemberUpdated?: (member: AdminMember) => void;
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

    const normalizeOption = <T extends readonly string[]>(value: string | null | undefined, options: T) =>
        options.includes((value ?? '') as T[number]) ? (value as T[number]) : '';

    useEffect(() => {
        if (member) {
            setCompanyName(member.businessName || '');
            setPrimaryContact(member.primaryContact || '');
            setEmail(member.email || '');
            setCity(member.city || '');
            setState(member.state || '');
            setMembershipTier(normalizeOption(member.tier, membershipTierOptions));
            setMemberStatus(normalizeOption(member.status, memberStatusOptions));
            setVerificationStatus(normalizeOption(member.verificationStatus, verificationStatusOptions));
            setBadgeRating(normalizeOption(member.badgeRating, badgeRatingOptions));
            setError(null);
        }
    }, [member]);

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
                throw new Error(errorMessage);
            }

            const body: { profile?: ProfileRow } = await response.json();

            if (body.profile) {
                const updatedProfile = body.profile;
                const location = updatedProfile.city && updatedProfile.state
                    ? `${updatedProfile.city}, ${updatedProfile.state}`
                    : updatedProfile.city || updatedProfile.state || null;

                const updatedMember: AdminMember = {
                    ...member,
                    businessName: updatedProfile.company_name ?? companyName,
                    primaryContact: updatedProfile.full_name,
                    email: updatedProfile.email,
                    city: updatedProfile.city,
                    state: updatedProfile.state,
                    location,
                    tier: updatedProfile.membership_tier,
                    status: updatedProfile.member_status,
                    verificationStatus: updatedProfile.verification_status,
                    badgeRating: updatedProfile.badge_rating,
                    joinDate: updatedProfile.created_at,
                };

                onMemberUpdated?.(updatedMember);
            }
        } catch (err: any) {
            setError(err?.message ?? 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    if (!member) return null;

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
