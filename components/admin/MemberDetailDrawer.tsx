import React from 'react';
import { AdminMember, MemberStatus } from '../../lib/mockData';
import { XMarkIcon } from '../icons';

interface MemberDetailDrawerProps {
    member: AdminMember | null;
    onClose: () => void;
}

const statusColors: { [key in MemberStatus]: string } = {
    Active: 'bg-success/20 text-success',
    Suspended: 'bg-error/20 text-error',
    Pending: 'bg-info/20 text-info',
    Canceled: 'bg-gray-200 text-gray-800',
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-2">
        <span className="text-sm font-medium text-gray-dark">{label}</span>
        <span className="text-sm font-semibold text-charcoal text-right">{value}</span>
    </div>
);

const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({ member, onClose }) => {
    if (!member) return null;

    const location = member.location || member.city || '—';
    const primaryContact = member.primaryContact || '—';
    const email = member.email || '—';
    const verificationStatus = member.verificationStatus || 'Pending';
    const badgeLabel = member.badge?.badgeLabel || member.rating || '—';

    return (
        <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose}></div>

            <div className="absolute inset-y-0 right-0 w-full max-w-md md:max-w-sm lg:max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
                <div className="p-4 border-b border-gray-border shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-charcoal">{member.businessName}</h2>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusColors[member.status]}`}>{member.status}</span>
                                <span className="text-sm font-semibold text-gray-dark">{member.tier}</span>
                                {badgeLabel !== '—' && <span className="text-sm font-semibold text-gray-dark">Badge {badgeLabel}</span>}
                                <span className="text-sm font-semibold text-gray-dark">Verification: {verificationStatus}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-dark hover:text-charcoal" aria-label="Close member details">
                            <XMarkIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                <div className="flex-grow p-4 overflow-y-auto">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <InfoRow label="Primary contact" value={primaryContact} />
                            <InfoRow label="Email" value={email} />
                            <InfoRow label="Location" value={location} />
                            <InfoRow label="Joined" value={member.joinDate || '—'} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <InfoRow label="Membership tier" value={member.tier} />
                            <InfoRow label="Member status" value={member.status} />
                            <InfoRow label="Verification status" value={verificationStatus} />
                            {badgeLabel !== '—' && <InfoRow label="Badge rating" value={badgeLabel} />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberDetailDrawer;
