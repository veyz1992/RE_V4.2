import React, { useState, useMemo } from 'react';
import { AdminServiceRequest, AdminRequestStatus, AdminRequestPriority, PackageTier } from '../../lib/mockData';
import { XMarkIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, TagIcon, UserCircleIcon, Cog6ToothIcon, PencilSquareIcon } from '../icons';

interface ServiceRequestDetailDrawerProps {
    request: AdminServiceRequest;
    onClose: () => void;
    onUpdate: (updatedRequest: AdminServiceRequest) => void;
    showToast: (message: string, type: 'success' | 'error') => void;
    assigneeOptions: string[];
}

const ServiceRequestDetailDrawer: React.FC<ServiceRequestDetailDrawerProps> = ({ request, onClose, onUpdate, showToast, assigneeOptions }) => {
    const [activeTab, setActiveTab] = useState('Internal Notes');
    const [newNote, setNewNote] = useState('');
    const [newUpdate, setNewUpdate] = useState('');

    const statusColors: { [key in AdminRequestStatus]: string } = {
        'Open': 'bg-gray-200 text-gray-800', 'In progress': 'bg-info/20 text-info',
        'Completed': 'bg-success/20 text-success', 'Canceled': 'bg-error/10 text-error border border-error/20',
    };
    const priorityColors: { [key in AdminRequestPriority]: string } = {
        'Low': 'bg-gray-100 text-gray-600', 'Normal': 'bg-gray-200 text-gray-800', 'High': 'bg-error/20 text-error',
    };
    const tierColors: { [key in PackageTier]: string } = {
        Bronze: 'bg-yellow-700/20 text-yellow-800', Silver: 'bg-gray-300/60 text-gray-800',
        Gold: 'bg-gold/20 text-gold-dark', 'Founding Member': 'bg-charcoal/80 text-white', Platinum: 'bg-blue-900/20 text-blue-900'
    };
    
    const handleStatusChange = (newStatus: AdminRequestStatus) => {
        const updatedRequest = { ...request, status: newStatus };
        onUpdate(updatedRequest);
        showToast(`Request marked as ${newStatus}.`, 'success');
        onClose();
    };

    const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdate({ ...request, assignedTo: e.target.value });
        showToast('Assignee updated.', 'success');
    };

    const handleAddNote = (type: 'internal' | 'member') => {
        const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
        if (type === 'internal' && newNote.trim()) {
            const note = { note: newNote, author: 'Admin User', timestamp };
            onUpdate({ ...request, internalNotes: [...(request.internalNotes || []), note] });
            setNewNote('');
        } else if (type === 'member' && newUpdate.trim()) {
            const update = { update: newUpdate, author: 'Admin User', timestamp };
            onUpdate({ ...request, memberUpdates: [...(request.memberUpdates || []), update] });
            setNewUpdate('');
        }
    };
    
    const iconMap: { [key: string]: React.FC<{className?: string}> } = { UserCircleIcon, Cog6ToothIcon, PencilSquareIcon, CheckCircleIcon, XMarkIcon };

    const SlaIndicator = () => {
        if (request.status === 'Completed' || request.status === 'Canceled') return null;
        
        const today = new Date();
        const dueDate = new Date(request.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0) {
            return (
                <div className="p-3 bg-success/10 border-l-4 border-success flex items-center gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-success"/>
                    <p className="text-sm font-semibold text-green-800">On track - Due in {diffDays} {diffDays === 1 ? 'day' : 'days'}</p>
                </div>
            );
        } else {
            return (
                <div className="p-3 bg-error/10 border-l-4 border-error flex items-center gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-error"/>
                    <p className="text-sm font-semibold text-red-800">Overdue by {-diffDays} {-diffDays === 1 ? 'day' : 'days'}</p>
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose}></div>
            <div className="absolute inset-0 md:inset-y-0 md:left-auto md:right-0 w-full md:w-1/2 lg:w-2/5 bg-white shadow-2xl flex flex-col animate-slide-in-right">
                <header className="p-4 border-b border-gray-border shrink-0 sticky top-0 bg-white z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="font-playfair text-xl font-bold text-charcoal">{request.id}</h2>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusColors[request.status]}`}>{request.status}</span>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${priorityColors[request.priority]}`}>{request.priority}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-charcoal mt-1">{request.title}</h3>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-dark hover:text-charcoal"><XMarkIcon className="w-6 h-6"/></button>
                    </div>
                </header>

                <div className="flex-grow p-6 overflow-y-auto space-y-6">
                    <div className="p-4 bg-gray-light/60 rounded-lg border border-gray-border">
                        <h4 className="text-sm font-bold uppercase text-gray-dark mb-2">Member Info</h4>
                        <p className="font-semibold text-lg text-charcoal">{request.businessName}</p>
                        <p className="text-sm text-gray-dark">{request.city} • <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${tierColors[request.tier]}`}>{request.tier}</span></p>
                        <a href="#" className="mt-2 inline-block text-sm font-semibold text-info hover:underline">Open member in Admin →</a>
                    </div>
                    
                    <SlaIndicator />
                    
                    <div>
                        <h4 className="font-semibold text-charcoal mb-2">Request Brief</h4>
                        <p className="text-gray-dark whitespace-pre-wrap">{request.description || "No brief provided."}</p>
                        <div className="flex gap-2 mt-3">
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-200 rounded-full"><TagIcon className="w-3 h-3"/> Website URL provided</span>
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-200 rounded-full"><TagIcon className="w-3 h-3"/> Brand guidelines attached</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-gray-dark">Type</p><p className="font-semibold">{request.type}</p></div>
                        <div><p className="text-gray-dark">Source</p><p className="font-semibold">{request.source}</p></div>
                        <div><p className="text-gray-dark">Submitted</p><p className="font-semibold">{request.createdAt}</p></div>
                        <div><p className="text-gray-dark">Due</p><p className="font-semibold">{request.dueDate}</p></div>
                        <div>
                            <label className="block text-gray-dark">Assigned To</label>
                            <select value={request.assignedTo} onChange={handleAssigneeChange} className="w-full mt-1 p-1 border rounded-md font-semibold bg-white focus:ring-info focus:border-info">
                                {assigneeOptions.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-charcoal mb-2">Activity</h4>
                        <ul className="space-y-4 border-l-2 border-gray-border ml-2">
                            {request.activityLog?.map((item, index) => {
                                const Icon = iconMap[item.icon] || ClockIcon;
                                return (
                                <li key={index} className="flex items-start gap-3 relative">
                                    <div className="absolute -left-[11px] top-1 w-5 h-5 bg-white border-2 border-gray-border rounded-full flex items-center justify-center"><Icon className="w-3 h-3 text-gray-dark"/></div>
                                    <div className="ml-6">
                                        <p className="font-semibold text-charcoal text-sm">{item.event} <span className="font-normal text-gray-dark">by {item.by}</span></p>
                                        <p className="text-xs text-gray-dark">{item.timestamp}</p>
                                    </div>
                                </li>
                            )})}
                        </ul>
                    </div>

                    <div>
                        <div className="flex border-b border-gray-border">
                            <button onClick={() => setActiveTab('Internal Notes')} className={`py-2 px-4 text-sm font-semibold ${activeTab === 'Internal Notes' ? 'border-b-2 border-info text-info' : 'text-gray-dark'}`}>Internal Notes</button>
                            <button onClick={() => setActiveTab('Member Updates')} className={`py-2 px-4 text-sm font-semibold ${activeTab === 'Member Updates' ? 'border-b-2 border-info text-info' : 'text-gray-dark'}`}>Member Updates</button>
                        </div>
                        <div className="py-4">
                            {activeTab === 'Internal Notes' && (
                                <div className="space-y-4">
                                    {request.internalNotes?.map((note, i) => <div key={i} className="bg-gray-light p-3 rounded-lg text-sm"><p className="text-charcoal">{note.note}</p><p className="text-xs text-gray-dark mt-1"><strong>{note.author}</strong> - {note.timestamp}</p></div>)}
                                    <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} placeholder="Add an internal note..." className="w-full p-2 border rounded-lg focus:ring-info focus:border-info"></textarea>
                                    <div className="text-right"><button onClick={() => handleAddNote('internal')} className="py-2 px-4 bg-gray-200 text-charcoal font-bold rounded-lg text-sm">Add Note</button></div>
                                </div>
                            )}
                            {activeTab === 'Member Updates' && (
                                <div className="space-y-4">
                                     {request.memberUpdates?.map((upd, i) => <div key={i} className="bg-info/10 p-3 rounded-lg text-sm border-l-4 border-info"><p className="text-charcoal">{upd.update}</p><p className="text-xs text-gray-dark mt-1"><strong>{upd.author}</strong> - {upd.timestamp} (Visible to member)</p></div>)}
                                    <textarea value={newUpdate} onChange={e => setNewUpdate(e.target.value)} rows={3} placeholder="Write an update for the member..." className="w-full p-2 border rounded-lg focus:ring-info focus:border-info"></textarea>
                                    <div className="text-right"><button onClick={() => handleAddNote('member')} className="py-2 px-4 bg-info text-white font-bold rounded-lg text-sm">Send Update to Member</button></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <footer className="p-4 bg-gray-light/50 border-t border-gray-border shrink-0 sticky bottom-0 z-10">
                    <div className="flex gap-3">
                        {request.status === 'Open' && <button onClick={() => handleStatusChange('In progress')} className="flex-1 py-2.5 bg-info text-white font-bold rounded-lg">Move to In Progress</button>}
                        {(request.status === 'Open' || request.status === 'In progress') && <>
                            <button onClick={() => handleStatusChange('Completed')} className="flex-1 py-2.5 bg-success text-white font-bold rounded-lg">Mark as Completed</button>
                            <button onClick={() => handleStatusChange('Canceled')} className="flex-1 py-2.5 bg-error/10 text-error font-bold rounded-lg">Cancel Request</button>
                        </>}
                        {(request.status === 'Completed' || request.status === 'Canceled') &&
                             <p className="text-center w-full text-gray-dark font-semibold">This request is closed.</p>
                        }
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ServiceRequestDetailDrawer;