import React, { useState } from 'react';
import { XMarkIcon } from '../icons';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (memberInfo: { businessName: string; email: string }) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [businessName, setBusinessName] = useState('');
    const [email, setEmail] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (businessName.trim() && email.trim()) {
            onSubmit({ businessName, email });
        }
    };
    
    const isFormValid = businessName.trim() && email.trim() && email.includes('@');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray hover:text-charcoal">
                    <XMarkIcon className="w-7 h-7" />
                </button>

                <h2 className="font-sora text-2xl font-bold text-charcoal mb-2">Manually Add Member</h2>
                <p className="text-gray mb-6">Create a Founding Member account for an offline payment.</p>
                
                <div className="space-y-4">
                     <div>
                        <label htmlFor="businessName" className="block text-sm font-medium text-gray">
                            Business Name
                        </label>
                        <input
                            id="businessName"
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-gold focus:border-gold"
                        />
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray">
                            Contact Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-gold focus:border-gold"
                        />
                    </div>
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
                        disabled={!isFormValid}
                        className="py-2.5 px-6 bg-gold text-charcoal font-bold rounded-lg shadow-lg hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add Member & Claim Spot
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;