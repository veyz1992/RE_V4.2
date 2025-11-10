
import React from 'react';
import { XMarkIcon } from './icons';
import { FOUNDING_MEMBER_SPOTS_REMAINING } from '../constants';

interface FoundingMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClaim: () => void;
}

const FoundingMemberModal: React.FC<FoundingMemberModalProps> = ({ isOpen, onClose, onClaim }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
        >
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                .animate-slide-up { animation: slide-up 0.4s ease-out; }
            `}</style>
            <div 
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray hover:text-charcoal">
                    <XMarkIcon className="w-8 h-8"/>
                </button>
                
                <div className="text-center">
                    <div className="text-3xl mb-2">⭐</div>
                    <h2 className="font-sora text-3xl font-bold text-charcoal mb-2">FOUNDING MEMBER INVITATION</h2>
                    <p className="text-gray text-lg mb-6">You're among the first to qualify. Claim your legacy position now.</p>
                </div>

                <hr className="border-gray-border my-6"/>

                <div>
                    <h3 className="font-sora text-xl font-bold text-charcoal mb-4">Exclusive Founding Member Benefits:</h3>
                    <ul className="space-y-3 text-charcoal">
                        {[
                            'Founding Member Seal (exclusive design, never offered again)',
                            'Enhanced profile (logo, gallery, detailed services, CTA buttons)',
                            'Verified listing on RestorationExpertise.com with SEO backlink',
                            'Lifetime pricing lock at $229 per month (offer disappears after launch)',
                            'Private community access (Facebook group + resources)',
                            'Direct line to team (priority support, early access to new features)',
                            'Priority SEO backlink placement',
                            'Yearly SEO blog post',
                            '99 Steps Restoration Success Blueprint + updates (included)',
                            'Annual re-verification included'
                        ].map(item => (
                             <li key={item} className="flex items-start">
                                <svg className="w-5 h-5 mr-3 text-success flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                
                <div className="mt-8 bg-gray-light p-6 rounded-xl border border-gray-border text-center">
                    <p className="font-sora text-3xl font-bold text-charcoal mt-1">Founding Member Rate: $229/month</p>
                    <p className="text-gray mt-1">This lifetime rate is locked in and will never increase.</p>
                </div>
                
                <p className="text-center text-warning font-bold mt-6">⏰ {FOUNDING_MEMBER_SPOTS_REMAINING} spots remaining | Offer ends 12/31/2025</p>

                <div className="mt-8 flex flex-col items-center space-y-4">
                     <button
                        onClick={onClaim}
                        className="w-full max-w-md py-4 px-8 bg-gold text-charcoal font-bold text-xl rounded-lg shadow-lg hover:bg-gold-light transition-transform transform hover:scale-105"
                    >
                       Secure My Founding Member Spot →
                    </button>
                    <button onClick={onClose} className="text-gray font-semibold hover:underline">
                        No thanks, show me regular pricing
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FoundingMemberModal;