import React from 'react';
import { XMarkIcon } from '../icons';

interface ImpersonateModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberName: string;
}

const ImpersonateModal: React.FC<ImpersonateModalProps> = ({ isOpen, onClose, memberName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-slide-up" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-dark hover:text-charcoal">
                    <XMarkIcon className="w-6 h-6" />
                </button>

                <div className="text-center">
                    <h2 className="font-playfair text-2xl font-bold text-charcoal">Impersonate Member</h2>
                    <p className="text-gray-dark mt-2">
                        You are about to impersonate <strong className="text-charcoal">{memberName}</strong>.
                    </p>
                    <p className="text-sm bg-gray-light p-3 rounded-lg mt-4 text-left">
                        Impersonation will let admins view the Member Hub exactly as this business sees it. This is useful for troubleshooting issues with their account, benefits, or billing display.
                    </p>
                </div>
                
                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="py-2 px-5 bg-white border border-gray-border font-semibold rounded-lg shadow-sm order-2 sm:order-1"
                    >
                        Close
                    </button>
                    <button
                        disabled
                        className="py-2 px-5 bg-info text-white font-bold rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                    >
                        Start Impersonation (Disabled)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImpersonateModal;
