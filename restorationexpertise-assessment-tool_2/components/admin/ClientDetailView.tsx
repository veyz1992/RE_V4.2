
import React, { useState, useMemo } from 'react';
import { CLIENT_DATA, JOB_QUEUE_DATA, TRANSACTION_HISTORY, Client, VerificationStatus, BadgeStatus, PackageTier } from '../../lib/mockData';
import { ArrowLeftIcon, CheckIcon, XMarkIcon, EyeIcon } from '../icons';
import RejectModal from './RejectModal';
import ConfirmationModal from './ConfirmationModal';
import ApproveDocumentModal from './ApproveDocumentModal'; // New import

interface ClientDetailViewProps {
    clientId: number;
    onBack: () => void;
}

const ClientDetailView: React.FC<ClientDetailViewProps> = ({ clientId, onBack }) => {
    const initialClientData = useMemo(() => CLIENT_DATA.find(c => c.id === clientId), [clientId]);

    const [client, setClient] = useState<Client | null>(initialClientData || null);
    const [isRejectModalOpen, setRejectModalOpen] = useState(false);
    const [isTerminateModalOpen, setTerminateModalOpen] = useState(false);
    const [isApproveModalOpen, setApproveModalOpen] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState('');


    const deliverableHistory = useMemo(() => JOB_QUEUE_DATA.filter(j => j.clientId === clientId && j.status === 'DONE'), [clientId]);
    const transactionHistory = useMemo(() => TRANSACTION_HISTORY.filter(t => t.clientId === clientId), [clientId]);

    if (!client) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-error">Client not found.</h2>
                <button onClick={onBack} className="mt-4 text-gold font-semibold hover:underline">Go Back</button>
            </div>
        );
    }
    
    const getStatusColor = (status: VerificationStatus) => {
        switch (status) {
            case 'ACTIVE': return 'bg-success/20 text-success';
            case 'PENDING': return 'bg-info/20 text-info';
            case 'ACTION_REQUIRED': return 'bg-warning/20 text-warning';
            case 'REJECTED': return 'bg-error/20 text-error';
            default: return 'bg-gray-200 text-gray-800';
        }
    };

    const handleRejectSubmit = (reason: string) => {
        console.log(`Rejecting with reason: ${reason}`);
        setClient(prev => prev ? { ...prev, verificationStatus: 'ACTION_REQUIRED' } : null);
        setRejectModalOpen(false);
    };

    const handleTerminateSubmit = () => {
        console.log(`Terminating subscription for ${client.businessName}`);
        setClient(prev => prev ? { ...prev, packageTier: 'Bronze', verificationStatus: 'REJECTED' } : null); // Example action
        setTerminateModalOpen(false);
    };

    const handleApproveClick = (docName: string) => {
        setSelectedDocument(docName);
        setApproveModalOpen(true);
    };

    const handleApproveSubmit = (expirationDate: string) => {
        console.log(`Approving ${selectedDocument} with expiration date: ${expirationDate}`);
        // Here you would update the document status and save the expiration date
        setApproveModalOpen(false);
        setSelectedDocument('');
    };
    
    const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div className="flex justify-between items-center py-2 border-b border-gray-border">
            <span className="text-sm font-medium text-gray">{label}</span>
            <span className="text-sm font-semibold text-charcoal text-right">{value}</span>
        </div>
    );

    return (
        <>
            <RejectModal 
                isOpen={isRejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                onSubmit={handleRejectSubmit}
                userName={client.businessName}
            />
            <ConfirmationModal 
                isOpen={isTerminateModalOpen}
                onClose={() => setTerminateModalOpen(false)}
                onSubmit={handleTerminateSubmit}
                title="Terminate Subscription?"
                message={`Are you sure you want to terminate the subscription for ${client.businessName}? This action cannot be undone.`}
                confirmButtonText="Yes, Terminate"
            />
            <ApproveDocumentModal
                isOpen={isApproveModalOpen}
                onClose={() => setApproveModalOpen(false)}
                onSubmit={handleApproveSubmit}
                documentName={selectedDocument}
            />
            <div className="p-8">
                <button onClick={onBack} className="flex items-center text-gray font-semibold hover:text-charcoal mb-6 transition-colors">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Back to Client List
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-border">
                            <h2 className="font-sora text-xl font-bold text-charcoal mb-4">{client.businessName}</h2>
                            <InfoRow label="Contact Email" value={client.contactEmail} />
                            <InfoRow label="Last Login" value={client.lastLogin} />
                            <InfoRow label="Verification Status" value={
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(client.verificationStatus)}`}>
                                    {client.verificationStatus.replace('_', ' ')}
                                </span>
                            } />
                             <InfoRow label="Badge Status" value={client.badgeStatus} />
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-border">
                            <h3 className="font-sora text-lg font-bold text-charcoal mb-4">Control & Configuration</h3>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray mb-1">Package Override</label>
                                    <select 
                                        value={client.packageTier} 
                                        onChange={(e) => setClient({...client, packageTier: e.target.value as PackageTier})}
                                        className="w-full p-2 border border-gray-border rounded-lg"
                                    >
                                        <option>Bronze</option>
                                        <option>Silver</option>
                                        <option>Gold</option>
                                        <option>Founding Member</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray mb-1">Verification Status Override</label>
                                    <select 
                                        value={client.verificationStatus} 
                                        onChange={(e) => setClient({...client, verificationStatus: e.target.value as VerificationStatus})}
                                        className="w-full p-2 border border-gray-border rounded-lg"
                                    >
                                        <option>ACTIVE</option>
                                        <option>PENDING</option>
                                        <option>ACTION_REQUIRED</option>
                                        <option>REJECTED</option>
                                    </select>
                                </div>
                                <a href={`mailto:${client.contactEmail}`} className="block w-full text-center py-2 bg-blue-100 text-info font-semibold rounded-lg hover:bg-blue-200">Quick Email Draft</a>
                                <button onClick={() => setTerminateModalOpen(true)} className="w-full text-center py-2 bg-red-100 text-error font-semibold rounded-lg hover:bg-red-200">Terminate Subscription</button>
                             </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                         <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-border">
                            <h3 className="font-sora text-lg font-bold text-charcoal mb-4">Verification & Compliance Review</h3>
                            <div className="space-y-3">
                                {['License', 'Insurance'].map(doc => (
                                    <div key={doc} className="flex items-center justify-between p-3 bg-gray-light rounded-lg">
                                        <p className="font-semibold">{doc} Document</p>
                                        <div className="flex items-center space-x-2">
                                            <button className="p-2 text-info hover:bg-info/10 rounded-full"><EyeIcon className="w-5 h-5" /></button>
                                            <button onClick={() => setRejectModalOpen(true)} className="p-2 text-error hover:bg-error/10 rounded-full"><XMarkIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleApproveClick(doc)} className="p-2 text-success hover:bg-success/10 rounded-full"><CheckIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 border-t border-gray-border pt-4">
                                <button className="w-full py-2.5 bg-success text-white font-bold rounded-lg hover:bg-green-600">✅ APPROVE & ACTIVATE BADGE</button>
                            </div>
                        </div>

                         <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-border">
                            <h3 className="font-sora text-lg font-bold text-charcoal mb-4">Deliverable History</h3>
                            <table className="w-full text-sm">
                               <thead className="text-left text-gray"><tr><th className="py-2">Service</th><th>Completed</th><th>Proof</th></tr></thead>
                               <tbody>
                                    {deliverableHistory.map(job => (
                                        <tr key={job.id} className="border-b border-gray-border last:border-0">
                                            <td className="py-2">{job.service}</td>
                                            <td>{job.completionDate}</td>
                                            <td><a href={job.proofLink} target="_blank" rel="noopener noreferrer" className="text-info hover:underline">View</a></td>
                                        </tr>
                                    ))}
                                    {deliverableHistory.length === 0 && <tr><td colSpan={3} className="text-center py-4 text-gray">No completed deliverables.</td></tr>}
                               </tbody>
                            </table>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-border">
                            <h3 className="font-sora text-lg font-bold text-charcoal mb-4">Transaction History</h3>
                             <table className="w-full text-sm">
                               <thead className="text-left text-gray"><tr><th className="py-2">Date</th><th>Package</th><th>Amount</th><th>Status</th></tr></thead>
                               <tbody>
                                    {transactionHistory.map(t => (
                                        <tr key={t.id} className="border-b border-gray-border last:border-0">
                                            <td className="py-2">{t.date}</td>
                                            <td>{t.package}</td>
                                            <td>${t.amount.toFixed(2)}</td>
                                            <td><span className={t.status === 'Paid' ? 'text-success' : 'text-error'}>{t.status}</span></td>
                                        </tr>
                                    ))}
                                    {transactionHistory.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-gray">No transaction history.</td></tr>}
                               </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ClientDetailView;