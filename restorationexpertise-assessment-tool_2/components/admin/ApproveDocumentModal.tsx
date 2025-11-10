
import React, { useState } from 'react';
import { XMarkIcon } from '../icons';

interface ApproveDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (expirationDate: string) => void;
    documentName: string;
}

const ApproveDocumentModal: React.FC<ApproveDocumentModalProps> = ({ isOpen, onClose, onSubmit, documentName }) => {
    const [expirationDate, setExpirationDate] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (expirationDate) {
            onSubmit(expirationDate);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray hover:text-charcoal">
                    <XMarkIcon className="w-7 h-7" />
                </button>

                <h2 className="font-sora text-2xl font-bold text-charcoal mb-2">Approve Document</h2>
                <p className="text-gray mb-6">Enter the expiration date for the client's <span className="font-semibold text-charcoal">{documentName}</span> document.</p>
                
                <div>
                    <label htmlFor="expiration-date" className="block text-sm font-medium text-gray">
                        Expiration Date (Required)
                    </label>
                    <input
                        id="expiration-date"
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-gold focus:border-gold"
                    />
                </div>

                <div className="mt-8 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="py-2.5 px-6 bg-gray-light text-charcoal font-semibold rounded-lg shadow-sm border border-gray-border hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!expirationDate}
                        className="py-2.5 px-6 bg-success text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Approve Document
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApproveDocumentModal;