import React, { useState, useMemo } from 'react';
import { FOUNDING_PARTNER_DATA } from '../../lib/mockData';
import { TagIcon, CurrencyDollarIcon, UsersIcon } from '../icons';
import CloseOfferModal from './CloseOfferModal';
import ExtendDeadlineModal from './ExtendDeadlineModal';
import AddMemberModal from './AddMemberModal';

const FoundingPartnerTracker: React.FC = () => {
    const [data, setData] = useState(FOUNDING_PARTNER_DATA);
    const [isCloseModalOpen, setCloseModalOpen] = useState(false);
    const [isExtendModalOpen, setExtendModalOpen] = useState(false);
    const [isAddModalOpen, setAddModalOpen] = useState(false);

    const daysRemaining = useMemo(() => {
        const expirationDate = new Date(data.expirationTimestamp);
        const now = new Date();
        const diffTime = expirationDate.getTime() - now.getTime();
        if (diffTime <= 0) return 0;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, [data.expirationTimestamp]);

    const handleCloseOffer = () => {
        console.log("Closing offer...");
        setData(prev => ({ ...prev, status: 'CLOSED' }));
        setCloseModalOpen(false);
    };

    const handleExtendDeadline = (newDate: string) => {
        console.log("Extending deadline to:", newDate);
        const newTimestamp = new Date(newDate).toISOString();
        setData(prev => ({ ...prev, expirationTimestamp: newTimestamp }));
        setExtendModalOpen(false);
    };

    const handleAddMember = (memberInfo: { businessName: string; email: string }) => {
        console.log("Adding new member:", memberInfo);
        if (data.claimedCount < data.totalSpots) {
            setData(prev => ({ ...prev, claimedCount: prev.claimedCount + 1 }));
        }
        setAddModalOpen(false);
    };


    return (
        <>
            <CloseOfferModal isOpen={isCloseModalOpen} onClose={() => setCloseModalOpen(false)} onSubmit={handleCloseOffer} />
            <ExtendDeadlineModal isOpen={isExtendModalOpen} onClose={() => setExtendModalOpen(false)} onSubmit={handleExtendDeadline} />
            <AddMemberModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} onSubmit={handleAddMember} />

            <div className="p-8">
                <div className="mb-8">
                    <h1 className="font-sora text-3xl font-bold text-charcoal">Founding Partner Tracker</h1>
                    <p className="text-gray mt-1">Oversee and manage the limited-time Founding Partner offer.</p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-border p-6">
                        <p className="text-sm font-semibold text-gray uppercase">Offer Status</p>
                        <p className={`font-sora text-4xl font-bold mt-2 ${data.status === 'ACTIVE' ? 'text-success' : 'text-error'}`}>{data.status}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-border p-6">
                        <p className="text-sm font-semibold text-gray uppercase">Spots Claimed</p>
                        <p className="font-sora text-4xl font-bold text-charcoal mt-2">{data.claimedCount} <span className="text-2xl text-gray">/ {data.totalSpots}</span></p>
                    </div>
                     <div className="bg-white rounded-2xl shadow-lg border border-gray-border p-6">
                        <p className="text-sm font-semibold text-gray uppercase">Days Remaining</p>
                        <p className="font-sora text-4xl font-bold text-charcoal mt-2">{daysRemaining}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-border p-6">
                        <p className="text-sm font-semibold text-gray uppercase">Revenue Generated</p>
                        <p className="font-sora text-4xl font-bold text-charcoal mt-2">${data.totalRevenue.toLocaleString()}</p>
                    </div>
                </div>

                {/* Critical Controls */}
                <div className="mt-10 bg-white rounded-2xl shadow-lg border border-gray-border p-6">
                     <h2 className="font-sora text-xl font-bold text-charcoal mb-4">Critical Controls</h2>
                     <p className="text-gray mb-6">These actions have an immediate impact on the platform. Use with caution.</p>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button 
                            onClick={() => setCloseModalOpen(true)}
                            className="w-full text-left p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-error transition-colors">
                            <h3 className="font-bold text-error">Close Offer Early</h3>
                            <p className="text-sm text-red-800 mt-1">Immediately stop new Founding Member sign-ups.</p>
                        </button>
                         <button 
                            onClick={() => setExtendModalOpen(true)}
                            className="w-full text-left p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-info transition-colors">
                            <h3 className="font-bold text-info">Extend Deadline</h3>
                            <p className="text-sm text-blue-800 mt-1">Update the offer's expiration date.</p>
                        </button>
                        <button 
                            onClick={() => setAddModalOpen(true)}
                            className="w-full text-left p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-success transition-colors">
                            <h3 className="font-bold text-success">Manually Add Member</h3>
                            <p className="text-sm text-green-800 mt-1">Add a new member who paid offline.</p>
                        </button>
                     </div>
                </div>

            </div>
        </>
    );
};

export default FoundingPartnerTracker;