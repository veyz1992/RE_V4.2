
import React, { useState } from 'react';
import { XMarkIcon } from '../icons';
import { REJECTION_REASONS } from '../../constants';

interface RejectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    userName: string;
}

const RejectModal: React.FC<RejectModalProps> = ({ isOpen, onClose, onSubmit, userName }) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (reason.trim()) {
            onSubmit(reason);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray hover:text-charcoal">
                    <XMarkIcon className="w-7 h-7" />
                </button>

                <h2 className="font-sora text-2xl font-bold text-charcoal mb-2">Reject Verification</h2>
                <p className="text-gray mb-6">You are about to reject <span className="font-semibold text-charcoal">{userName}</span>. Please provide a clear reason for the rejection.</p>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="reasonTemplate" className="block text-sm font-medium text-gray">
                            Use a Template
                        </label>
                        <select
                            id="reasonTemplate"
                            onChange={(e) => setReason(e.target.value)}
                            className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-gold focus:border-gold"
                        >
                            <option value="">Select a common reason...</option>
                            {REJECTION_REASONS.map((r, i) => (
                                <option key={i} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray">
                            Rejection Note (Required)
                        </label>
                        <textarea
                            id="rejectionReason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-gold focus:border-gold"
                            placeholder="E.g., Proof of insurance does not meet the $1M minimum requirement."
                        />
                         <p className="mt-1 text-xs text-gray">This note will be sent to the applicant.</p>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="py-2 px-6 bg-gray-light text-charcoal font-semibold rounded-lg shadow-sm border border-gray-border hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!reason.trim()}
                        className="py-2 px-6 bg-error text-white font-bold rounded-lg shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Submit Rejection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RejectModal;