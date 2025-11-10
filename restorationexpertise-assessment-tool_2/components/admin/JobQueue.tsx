import React, { useState } from 'react';
import { JOB_QUEUE_DATA, Job, JobStatus } from '../../lib/mockData';
import ManageJobModal from './ManageJobModal';

const JobQueue: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>(JOB_QUEUE_DATA);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    const handleManageJob = (job: Job) => {
        setSelectedJob(job);
        setIsModalOpen(true);
    };

    const handleSaveChanges = (updatedJob: Job) => {
        setJobs(jobs.map(j => j.id === updatedJob.id ? updatedJob : j));
        setIsModalOpen(false);
        setSelectedJob(null);
    };

    const getStatusColor = (status: JobStatus) => {
        switch (status) {
            case 'TO_DO': return 'bg-gray-200 text-gray-800';
            case 'IN_PROGRESS': return 'bg-info/20 text-info';
            case 'AWAITING_REVIEW': return 'bg-warning/20 text-warning';
            case 'DONE': return 'bg-success/20 text-success';
            default: return 'bg-gray-200 text-gray-800';
        }
    };

    return (
        <>
            {selectedJob && (
                <ManageJobModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    job={selectedJob}
                    onSave={handleSaveChanges}
                />
            )}
            <div className="p-8">
                <div className="mb-6">
                    <h1 className="font-sora text-3xl font-bold text-charcoal">Job Queue</h1>
                    <p className="text-gray mt-1">Manage all active and pending client deliverable requests.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-border">
                        <thead className="bg-gray-light">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-charcoal uppercase tracking-wider">Client & Service</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-charcoal uppercase tracking-wider">Request Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-charcoal uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-charcoal uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-border">
                            {jobs.map((job) => (
                                <tr key={job.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-charcoal">{job.clientName}</div>
                                        <div className="text-sm text-gray">{job.service}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray">{job.requestDate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(job.status)}`}>
                                            {job.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => handleManageJob(job)}
                                            className="text-gold font-semibold hover:text-gold-dark hover:underline"
                                        >
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default JobQueue;