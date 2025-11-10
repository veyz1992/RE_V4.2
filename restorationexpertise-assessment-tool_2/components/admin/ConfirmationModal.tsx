import React from 'react';
import { XMarkIcon } from '../icons';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    title: string;
    message: string;
    confirmButtonText?: string;
    confirmButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    title, 
    message, 
    confirmButtonText = 'Confirm', 
    confirmButtonClass = 'bg-error text-white hover:bg-red-600' 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray hover:text-charcoal">
                    <XMarkIcon className="w-7 h-7" />
                </button>
                <div className="text-center">
                     <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="font-sora text-2xl font-bold text-charcoal">{title}</h2>
                    <p className="text-gray mt-2">{message}</p>
                </div>
                <div className="mt-8 flex justify-center gap-4">
                    <button
                        onClick={onClose}
                        className="py-2.5 px-6 bg-gray-light text-charcoal font-semibold rounded-lg shadow-sm border border-gray-border hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        className={`py-2.5 px-6 font-bold rounded-lg shadow-lg transition-colors ${confirmButtonClass}`}
                    >
                        {confirmButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
