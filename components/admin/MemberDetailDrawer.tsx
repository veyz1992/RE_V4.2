import React, { useState } from 'react';
import { AdminMember, BadgeRating, MemberStatus, PackageTier } from '../../lib/mockData';
import { XMarkIcon, PencilSquareIcon, CheckIcon } from '../icons';

interface MemberDetailDrawerProps {
    member: AdminMember;
    onClose: () => void;
    onUpdate: (updatedMember: AdminMember) => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({ member, onClose, onUpdate, showToast }) => {
    const [activeTab, setActiveTab] = useState('Overview');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        tier: member.tier,
        rating: member.rating,
        status: member.status,
        renewalDate: member.renewalDate,
        badgeStatus: member.badge?.status ?? "NONE",
        badgeLabel: member.badge?.badgeLabel ?? "",
        badgeImageLightUrl: member.badge?.imageLightUrl ?? "",
        badgeImageDarkUrl: member.badge?.imageDarkUrl ?? "",
        badgeProfileUrl: member.badge?.profileUrl ?? "",
    });

    const handleSave = () => {
        onUpdate({
            ...member,
            tier: formData.tier,
            rating: formData.rating,
            status: formData.status,
            renewalDate: formData.renewalDate,
            badge: {
              // FIX: Cast formData.badgeStatus to the correct type to resolve the TypeScript error.
              status: formData.badgeStatus as NonNullable<AdminMember['badge']>['status'],
              badgeLabel: formData.badgeLabel || `${formData.tier} · ${formData.rating}`,
              imageLightUrl: formData.badgeImageLightUrl,
              imageDarkUrl: formData.badgeImageDarkUrl || undefined,
              profileUrl: formData.badgeProfileUrl || member.badge?.profileUrl || ""
            }
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setFormData({
            tier: member.tier,
            rating: member.rating,
            status: member.status,
            renewalDate: member.renewalDate,
            badgeStatus: member.badge?.status ?? "NONE",
            badgeLabel: member.badge?.badgeLabel ?? "",
            badgeImageLightUrl: member.badge?.imageLightUrl ?? "",
            badgeImageDarkUrl: member.badge?.imageDarkUrl ?? "",
            badgeProfileUrl: member.badge?.profileUrl ?? "",
        });
        setIsEditing(false);
    };

    const statusColors: { [key in MemberStatus]: string } = {
        Active: 'bg-success/20 text-success',
        Suspended: 'bg-error/20 text-error',
        Pending: 'bg-info/20 text-info',
        Canceled: 'bg-gray-200 text-gray-800',
    };

    const TabButton: React.FC<{ label: string }> = ({ label }) => (
        <button
            onClick={() => setActiveTab(label)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === label ? 'bg-info/10 text-info' : 'text-gray-dark hover:bg-gray-light'}`}
        >
            {label}
        </button>
    );

    const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium text-gray-dark">{label}</span>
            <span className="text-sm font-semibold text-charcoal text-right">{value}</span>
        </div>
    );
    
    const renderContent = () => {
        switch (activeTab) {
            case 'Verification':
                return (
                     <div className="space-y-3">
                        {member.documents.map(doc => (
                            <div key={doc.name} className="flex justify-between items-center p-3 bg-gray-light/60 rounded-lg">
                                <span className="font-semibold">{doc.name}</span>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                    doc.status === 'Approved' ? 'bg-success/20 text-success' :
                                    doc.status === 'Pending' ? 'bg-info/20 text-info' : 'bg-error/20 text-error'
                                }`}>{doc.status}</span>
                            </div>
                        ))}
                        <button className="w-full mt-4 text-center py-2 bg-white border border-gray-border text-charcoal font-semibold rounded-lg hover:bg-gray-light">
                            Open in Verifications
                        </button>
                    </div>
                );
            case 'Billing':
                return (
                    <div className="space-y-2">
                        <InfoRow label="Stripe Customer ID" value={<code>{member.billingInfo.stripeId}</code>} />
                        <InfoRow label="Current Plan" value={member.billingInfo.plan} />
                        <InfoRow label="MRR" value={`$${member.mrr}`} />
                        <InfoRow label="Last Payment" value={member.billingInfo.lastPayment} />
                    </div>
                );
            case 'Activity':
                return (
                     <ul className="space-y-3">
                        {member.activityLog.map((item, index) => (
                            <li key={index} className="flex items-start text-sm">
                                <div className="w-2 h-2 bg-info rounded-full mt-1.5 mr-3 shrink-0"></div>
                                <div>
                                    <p className="font-semibold text-charcoal">{item.event}</p>
                                    <p className="text-gray-dark">{item.date}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                );
            case 'Overview':
            default:
                return (
                    <div className="space-y-2">
                        <InfoRow label="Email" value={member.email} />
                        <InfoRow label="Location" value={member.city} />
                        <InfoRow label="Joined On" value={member.joinDate} />
                        <InfoRow label="Profile Views" value={member.stats.profileViews.toLocaleString()} />
                        <InfoRow label="Badge Clicks" value={member.stats.badgeClicks.toLocaleString()} />
                        {member.badge && (
                            <>
                                <div className="pt-2 mt-2 border-t border-gray-border">
                                    <InfoRow label="Badge Status" value={member.badge.status} />
                                    <InfoRow label="Badge Label" value={member.badge.badgeLabel} />
                                </div>
                            </>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-40">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose}></div>
            
            {/* Drawer */}
            <div className="absolute inset-y-0 right-0 w-full max-w-md md:max-w-sm lg:max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="p-4 border-b border-gray-border shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-charcoal">{member.businessName}</h2>
                             <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusColors[formData.status]}`}>{formData.status}</span>
                                <span className="text-sm font-semibold text-gray-dark">{formData.tier}</span>
                                <span className="text-sm font-semibold text-gray-dark">{formData.rating}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-dark hover:text-charcoal"><XMarkIcon className="w-6 h-6"/></button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-grow p-4 overflow-y-auto">
                     {/* Edit Mode */}
                    {isEditing ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-light rounded-lg border border-gray-border space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-dark">Tier</label>
                                    <select value={formData.tier} onChange={e => setFormData({...formData, tier: e.target.value as PackageTier})} className="w-full mt-1 p-2 border rounded-md">
                                        <option>Bronze</option><option>Silver</option><option>Gold</option><option>Founding Member</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-dark">Badge Rating</label>
                                    <select value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value as BadgeRating})} className="w-full mt-1 p-2 border rounded-md">
                                        <option>A+</option><option>A</option><option>B+</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-dark">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as MemberStatus})} className="w-full mt-1 p-2 border rounded-md">
                                        <option>Active</option><option>Pending</option><option>Suspended</option><option>Canceled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-dark">Renewal Date</label>
                                    <input type="date" value={formData.renewalDate} onChange={e => setFormData({...formData, renewalDate: e.target.value})} className="w-full mt-1 p-2 border rounded-md"/>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-light rounded-lg border border-gray-border space-y-4">
                                <h3 className="font-bold text-charcoal -mb-2">Badge Settings</h3>
                                <div>
                                    <label className="text-sm font-medium text-gray-dark">Badge Status</label>
                                    <select value={formData.badgeStatus} onChange={e => setFormData({...formData, badgeStatus: e.target.value})} className="w-full mt-1 p-2 border rounded-md">
                                        <option>NONE</option><option>PENDING</option><option>ACTIVE</option><option>REVOKED</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-dark">Badge Label</label>
                                    <input type="text" value={formData.badgeLabel} onChange={e => setFormData({...formData, badgeLabel: e.target.value})} placeholder={`${formData.tier} · ${formData.rating}`} className="w-full mt-1 p-2 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-dark">Image URL (Light)</label>
                                    <input type="text" value={formData.badgeImageLightUrl} onChange={e => setFormData({...formData, badgeImageLightUrl: e.target.value})} placeholder="https://…/badge-light.svg" className="w-full mt-1 p-2 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-dark">Image URL (Dark)</label>
                                    <input type="text" value={formData.badgeImageDarkUrl} onChange={e => setFormData({...formData, badgeImageDarkUrl: e.target.value})} placeholder="https://…/badge-dark.svg" className="w-full mt-1 p-2 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-dark">Profile URL</label>
                                    <input type="text" value={formData.badgeProfileUrl} onChange={e => setFormData({...formData, badgeProfileUrl: e.target.value})} placeholder={`https://restorationexpertise.com/profile/${member.businessName.toLowerCase().replace(/ /g, '-')}`} className="w-full mt-1 p-2 border rounded-md"/>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-dark">Preview</label>
                                    <div className="mt-1 p-4 border border-dashed border-gray-border rounded-lg flex items-center justify-center min-h-[100px] bg-white">
                                        {formData.badgeImageLightUrl ? (
                                            <img src={formData.badgeImageLightUrl} alt="Badge Preview" className="max-w-full h-auto max-h-24"/>
                                        ) : (
                                            <p className="text-gray-dark text-sm">No image URL set</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-center text-gray-dark pt-2">In production, these changes will sync to Stripe and the member portal.</p>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-center p-1 bg-gray-light rounded-lg mb-4">
                                <TabButton label="Overview" />
                                <TabButton label="Verification" />
                                <TabButton label="Billing" />
                                <TabButton label="Activity" />
                            </div>
                            <div className="p-2">{renderContent()}</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-border shrink-0">
                    {isEditing ? (
                        <div className="flex justify-end gap-3">
                            <button onClick={handleCancel} className="py-2 px-4 bg-white border border-gray-border rounded-lg font-semibold shadow-sm">Cancel</button>
                            <button onClick={handleSave} className="py-2 px-4 bg-gold text-charcoal font-bold rounded-lg shadow-md">Save Changes</button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="w-full py-2.5 bg-info/10 text-info font-bold rounded-lg flex items-center justify-center gap-2">
                            <PencilSquareIcon className="w-5 h-5"/> Edit Member
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemberDetailDrawer;
