import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '../icons';
import { Job, JobStatus } from '../../lib/mockData';

interface ManageJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (job: Job) => void;
    job: Job;
}

const ManageJobModal: React.FC<ManageJobModalProps> = ({ isOpen, onClose, onSave, job }) => {
    const [status, setStatus] = useState<JobStatus>(job.status);
    const [proofLink, setProofLink] = useState(job.proofLink || '');
    const [error, setError] = useState('');

    useEffect(() => {
        // Reset state when job changes
        setStatus(job.status);
        setProofLink(job.proofLink || '');
        setError('');
    }, [job]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (status === 'DONE' && !proofLink.trim()) {
            setError('A proof link is required to mark the job as DONE.');
            return;
        }
        
        const updatedJob: Job = { 
            ...job, 
            status, 
            proofLink: proofLink.trim() || undefined,
        };

        if (status === 'DONE' && !updatedJob.completionDate) {
            updatedJob.completionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        }
        
        onSave(updatedJob);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray hover:text-charcoal">
                    <XMarkIcon className="w-7 h-7" />
                </button>

                <h2 className="font-sora text-2xl font-bold text-charcoal mb-2">Manage Job Request</h2>
                <p className="text-gray mb-4">Client: <span className="font-semibold text-charcoal">{job.clientName}</span> | Service: <span className="font-semibold text-charcoal">{job.service}</span></p>

                <div className="bg-gray-light p-4 rounded-lg border border-gray-border mb-6">
                    <h3 className="font-semibold text-charcoal mb-2">Client Request Notes</h3>
                    <p className="text-sm text-charcoal"><strong className="text-gray">Topic:</strong> {job.requestNotes.topic}</p>
                    <p className="text-sm text-charcoal mt-1"><strong className="text-gray">Angle/Tip:</strong> {job.requestNotes.angle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="jobStatus" className="block text-sm font-medium text-gray">
                            Update Status
                        </label>
                        <select
                            id="jobStatus"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as JobStatus)}
                            className="mt-1 block w-full p-3 border border-gray-border rounded-lg shadow-sm focus:ring-gold focus:border-gold"
                        >
                            <option value="TO_DO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="AWAITING_REVIEW">Awaiting Review</option>
                            <option value="DONE">Done</option>
                        </select>
                    </div>

                    {status === 'DONE' && (
                         <div>
                            <label htmlFor="proofLink" className="block text-sm font-medium text-gray">
                                Proof Link / URL (Required)
                            </label>
                            <input
                                id="proofLink"
                                type="text"
                                value={proofLink}
                                onChange={(e) => {
                                    setProofLink(e.target.value);
                                    if(error) setError('');
                                }}
                                className={`mt-1 block w-full p-3 border rounded-lg shadow-sm ${error ? 'border-error ring-error/50' : 'border-gray-border focus:ring-gold focus:border-gold'}`}
                                placeholder="https://client-site.com/blog/post-url"
                            />
                             {error && <p className="mt-1 text-sm text-error">{error}</p>}
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="py-2.5 px-6 bg-gray-light text-charcoal font-semibold rounded-lg shadow-sm border border-gray-border hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="py-2.5 px-6 bg-gold text-charcoal font-bold rounded-lg shadow-lg hover:bg-gold-light transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManageJobModal;