import React, { useState, useEffect } from 'react';
import { AdminVerification, AdminVerificationStatus } from '../../lib/mockData';
import { XMarkIcon, DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '../icons';

interface VerificationDetailDrawerProps {
    verification: AdminVerification;
    onClose: () => void;
    onUpdate: (updatedVerification: AdminVerification) => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const VerificationDetailDrawer: React.FC<VerificationDetailDrawerProps> = ({ verification, onClose, onUpdate, showToast }) => {
    const [status, setStatus] = useState(verification.status);
    const [adminNote, setAdminNote] = useState(verification.adminNote || '');
    const [checklist, setChecklist] = useState({
        legible: false,
        matchesName: false,
        notExpired: false,
        meetsRequirements: false,
    });

    useEffect(() => {
        setStatus(verification.status);
        setAdminNote(verification.adminNote || '');
    }, [verification]);

    const handleUpdate = (newStatus: AdminVerificationStatus) => {
        onUpdate({ ...verification, status: newStatus, adminNote });
        const message = newStatus === 'Approved' ? 'Document approved.' : `Document status updated to "${newStatus}".`;
        showToast(message, 'success');
        onClose();
    };

    const isExpiringSoon = (expiresAt: string): boolean => {
        if (!expiresAt) return false;
        const now = new Date();
        const expiryDate = new Date(expiresAt);
        const thirtyDaysFromNow = new Date(now.setDate(now.getDate() + 30));
        now.setDate(now.getDate() - 30); // Reset now date
        return expiryDate > now && expiryDate <= thirtyDaysFromNow;
    };
    
    const getBadgeImpactMessage = () => {
        switch(status) {
            case 'Pending':
                return "Approval of all required documents is necessary for an A or A+ rating.";
            case 'Needs Replacement':
            case 'Rejected':
            case 'Expired':
                return "This document issue may limit the member's badge rating to B+ until resolved.";
            case 'Approved':
                return "This approved document helps qualify the member for higher badge ratings.";
            default:
                return "Document status directly impacts badge eligibility and rating."
        }
    };

    return (
        <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose}></div>
            
            <div className="absolute inset-y-0 right-0 w-full max-w-md md:max-w-md lg:max-w-lg bg-white shadow-2xl flex flex-col animate-slide-in-right">
                <header className="p-4 border-b border-gray-border shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="font-playfair text-2xl font-bold text-charcoal">{verification.businessName}</h2>
                            <p className="text-sm text-gray-dark">{verification.city} • {verification.tier} • {verification.rating}</p>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-dark hover:text-charcoal"><XMarkIcon className="w-6 h-6"/></button>
                    </div>
                </header>

                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                    <div>
                        <p className="text-xs font-bold uppercase text-gray-dark">Document Type</p>
                        <p className="text-lg font-semibold text-charcoal">{verification.documentType}</p>
                    </div>

                    <div className="flex items-center justify-center bg-gray-light p-8 rounded-lg border border-gray-border">
                        <DocumentTextIcon className="w-24 h-24 text-gray" />
                    </div>

                     <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-gray-dark">Uploaded</p><p className="font-semibold">{verification.uploadedAt}</p></div>
                        <div>
                            <p className="text-gray-dark">Expires</p>
                            <div className="flex items-center gap-2 font-semibold">
                                {verification.expiresAt}
                                {/* FIX: Wrapped ClockIcon in a span with a title attribute to fix prop error and provide tooltip. */}
                                {isExpiringSoon(verification.expiresAt) && <span title="Expiring soon"><ClockIcon className="w-4 h-4 text-warning" /></span>}
                            </div>
                        </div>
                    </div>
                    
                    <button className="w-full text-center py-2 bg-white border border-gray-border text-info font-semibold rounded-lg hover:bg-gray-light text-sm">
                        Open Member Profile →
                    </button>

                    <div className="space-y-4 pt-4 border-t border-gray-border">
                        <div>
                            <label className="block text-sm font-medium text-gray-dark mb-1">Update Status</label>
                            <select value={status} onChange={e => setStatus(e.target.value as AdminVerificationStatus)} className="w-full p-2 border border-gray-border rounded-lg bg-white focus:ring-info focus:border-info">
                                <option>Pending</option>
                                <option>Approved</option>
                                <option>Rejected</option>
                                <option>Needs Replacement</option>
                                <option>Expired</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-dark mb-1">Admin Note</label>
                            <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3} className="w-full p-2 border border-gray-border rounded-lg bg-white focus:ring-info focus:border-info" placeholder="Add a private note for your team or a public note for the member..."></textarea>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <h4 className="font-semibold text-charcoal">Review Checklist</h4>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={checklist.legible} onChange={e => setChecklist({...checklist, legible: e.target.checked})} className="h-4 w-4 rounded text-info focus:ring-info"/> Legible and complete</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={checklist.matchesName} onChange={e => setChecklist({...checklist, matchesName: e.target.checked})} className="h-4 w-4 rounded text-info focus:ring-info"/> Matches business name & address</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={checklist.notExpired} onChange={e => setChecklist({...checklist, notExpired: e.target.checked})} className="h-4 w-4 rounded text-info focus:ring-info"/> Not expired</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={checklist.meetsRequirements} onChange={e => setChecklist({...checklist, meetsRequirements: e.target.checked})} className="h-4 w-4 rounded text-info focus:ring-info"/> Meets coverage requirements (if applicable)</label>
                    </div>

                    <div className="p-4 bg-info/5 border-l-4 border-info">
                        <h4 className="font-bold text-info">Impact on Badge Rating</h4>
                        <p className="text-sm text-charcoal mt-1">{getBadgeImpactMessage()}</p>
                    </div>
                </div>

                <footer className="p-4 border-t border-gray-border shrink-0 flex gap-3">
                    <button onClick={() => handleUpdate('Rejected')} className="flex-1 py-2.5 bg-error/10 text-error font-bold rounded-lg flex items-center justify-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5"/> Reject
                    </button>
                    <button onClick={() => handleUpdate('Approved')} className="flex-1 py-2.5 bg-success text-white font-bold rounded-lg flex items-center justify-center gap-2">
                        <CheckCircleIcon className="w-5 h-5"/> Approve
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default VerificationDetailDrawer;