import React, { useState, useMemo } from 'react';
import { ADMIN_SERVICE_REQUESTS, AdminServiceRequest, AdminRequestStatus, AdminRequestPriority, AdminRequestType, PackageTier } from '../../lib/mockData';
import { MagnifyingGlassIcon, EyeIcon, ChevronDownIcon } from '../icons';
import ServiceRequestDetailDrawer from './ServiceRequestDetailDrawer';

interface ServiceRequestsQueueProps {
    showToast: (message: string, type: 'success' | 'error') => void;
}

const ServiceRequestsQueue: React.FC<ServiceRequestsQueueProps> = ({ showToast }) => {
    const [requests, setRequests] = useState<AdminServiceRequest[]>(ADMIN_SERVICE_REQUESTS);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: 'All',
        type: 'All',
        priority: 'All',
        assignedTo: 'All',
    });
    const [isFiltersVisible, setIsFiltersVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<AdminServiceRequest | null>(null);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleQuickUpdate = (id: string, field: 'status' | 'assignedTo', value: string) => {
        setRequests(prev => prev.map(req => req.id === id ? { ...req, [field]: value } : req));
        showToast(`Request ${id} updated.`, 'success');
    };

    const handleUpdateRequest = (updatedRequest: AdminServiceRequest) => {
        setRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r));
        setSelectedRequest(updatedRequest); // Keep drawer open with updated data
    };

    const isOverdue = (dueDate: string, status: AdminRequestStatus) => {
        if (status === 'Completed' || status === 'Canceled') return false;
        return new Date(dueDate) < new Date();
    };

    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            const searchMatch = r.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                r.id.toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = filters.status === 'All' || r.status === filters.status;
            const typeMatch = filters.type === 'All' || r.type === filters.type;
            const priorityMatch = filters.priority === 'All' || r.priority === filters.priority;
            const assigneeMatch = filters.assignedTo === 'All' || r.assignedTo === filters.assignedTo;

            return searchMatch && statusMatch && typeMatch && priorityMatch && assigneeMatch;
        });
    }, [requests, searchTerm, filters]);
    
    const summaryCounts = useMemo(() => ({
        open: requests.filter(r => r.status === 'Open').length,
        inProgress: requests.filter(r => r.status === 'In progress').length,
        overdue: requests.filter(r => isOverdue(r.dueDate, r.status)).length,
    }), [requests]);

    const statusOptions: AdminRequestStatus[] = ['Open', 'In progress', 'Completed', 'Canceled'];
    const typeOptions: AdminRequestType[] = ['SEO Blog Post', 'Spotlight Article', 'Website Review', 'Badge Support', 'Other'];
    const priorityOptions: AdminRequestPriority[] = ['Low', 'Normal', 'High'];
    const assigneeOptions = ['All', 'Unassigned', ...Array.from(new Set(requests.map(r => r.assignedTo))).filter(a => a !== 'Unassigned')];

    const statusColors: { [key in AdminRequestStatus]: string } = {
        'Open': 'bg-gray-200 text-gray-800',
        'In progress': 'bg-info/20 text-info',
        'Completed': 'bg-success/20 text-success',
        'Canceled': 'bg-error/10 text-error border border-error/20',
    };
    
    const priorityColors: { [key in AdminRequestPriority]: string } = {
        'Low': 'bg-gray-100 text-gray-600',
        'Normal': 'bg-gray-200 text-gray-800',
        'High': 'bg-error/20 text-error',
    };

    const tierColors: { [key in PackageTier]: string } = {
        Bronze: 'bg-yellow-700/20 text-yellow-800',
        Silver: 'bg-gray-300/60 text-gray-800',
        Gold: 'bg-gold/20 text-gold-dark',
        'Founding Member': 'bg-charcoal/80 text-white',
        Platinum: 'bg-blue-900/20 text-blue-900'
    };


    return (
        <>
            {selectedRequest && (
                <ServiceRequestDetailDrawer
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onUpdate={handleUpdateRequest}
                    showToast={showToast}
                    assigneeOptions={assigneeOptions.filter(a => a !== 'All')}
                />
            )}
            <div className="p-4 md:p-6 lg:p-8 animate-fade-in">
                <div className="mb-6">
                    <h1 className="font-playfair text-3xl font-bold text-charcoal">Service Requests Queue</h1>
                    <p className="text-gray-dark mt-1">See and manage all member content, review and support requests in one place.</p>
                </div>

                <div className={`mb-6 bg-white p-3 rounded-xl shadow-md border border-gray-border flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 text-sm ${summaryCounts.overdue > 0 ? 'border-l-4 border-error' : ''}`}>
                    <p><strong>Open:</strong> <span className="font-mono text-base font-bold text-gray-800">{summaryCounts.open}</span></p>
                    <div className="h-4 w-px bg-gray-border"></div>
                    <p><strong>In Progress:</strong> <span className="font-mono text-base font-bold text-info">{summaryCounts.inProgress}</span></p>
                    <div className="h-4 w-px bg-gray-border"></div>
                    <p className={summaryCounts.overdue > 0 ? 'text-error' : ''}><strong>Overdue:</strong> <span className="font-mono text-base font-bold">{summaryCounts.overdue}</span></p>
                </div>

                 <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-border mb-6">
                    <button onClick={() => setIsFiltersVisible(!isFiltersVisible)} className="w-full flex justify-between items-center md:hidden mb-4">
                        <span className="font-bold text-charcoal">Filters</span>
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isFiltersVisible ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`${isFiltersVisible ? 'block' : 'hidden'} md:grid md:grid-cols-2 lg:grid-cols-5 gap-4`}>
                        <div className="relative col-span-2 lg:col-span-1 mb-2 md:mb-0">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray" />
                            <input type="text" placeholder="Search..." name="searchTerm" value={searchTerm} onChange={handleFilterChange} className="w-full pl-10 pr-4 py-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info"/>
                        </div>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Statuses</option>
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Types</option>
                            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select name="priority" value={filters.priority} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            <option value="All">All Priorities</option>
                            {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select name="assignedTo" value={filters.assignedTo} onChange={handleFilterChange} className="w-full mt-2 md:mt-0 p-2 border border-gray-border rounded-lg bg-gray-light/50 focus:ring-info focus:border-info">
                            {assigneeOptions.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-border overflow-hidden">
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full">
                            <thead className="bg-gray-light/50">
                                <tr>
                                    {['ID', 'Business', 'Type', 'Title', 'Status', 'Priority', 'Assigned To', 'Created', 'Due', 'Actions'].map(h => 
                                    <th key={h} className="p-4 text-left text-xs font-bold text-charcoal uppercase">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-border">
                                {filteredRequests.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-light/50 cursor-pointer" onClick={() => setSelectedRequest(r)}>
                                        <td className="p-4 text-sm font-semibold text-gray-dark">{r.id}</td>
                                        <td className="p-4"><p className="font-semibold text-charcoal">{r.businessName}</p><div className="flex items-center gap-2"><p className="text-sm text-gray-dark">{r.city}</p><span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${tierColors[r.tier]}`}>{r.tier}</span></div></td>
                                        <td className="p-4 text-sm">{r.type}</td>
                                        <td className="p-4 text-sm font-semibold text-charcoal max-w-xs truncate">{r.title}</td>
                                        <td className="p-4"><select value={r.status} onChange={e => handleQuickUpdate(r.id, 'status', e.target.value)} className={`px-2 py-1 text-xs font-bold rounded-full border-none appearance-none ${statusColors[r.status]}`} onClick={e => e.stopPropagation()}><option>Open</option><option>In progress</option><option>Completed</option><option>Canceled</option></select></td>
                                        <td className="p-4"><span className={`px-2 py-1 text-xs font-bold rounded-full ${priorityColors[r.priority]}`}>{r.priority}</span></td>
                                        <td className="p-4"><select value={r.assignedTo} onChange={e => handleQuickUpdate(r.id, 'assignedTo', e.target.value)} className="text-sm p-1 border border-gray-border rounded-md bg-white" onClick={e => e.stopPropagation()}>{assigneeOptions.slice(1).map(a => <option key={a} value={a}>{a}</option>)}</select></td>
                                        <td className="p-4 text-sm">{r.createdAt}</td>
                                        <td className={`p-4 text-sm ${isOverdue(r.dueDate, r.status) ? 'text-error font-bold' : ''}`}>{r.dueDate}</td>
                                        <td className="p-4 text-right"><button onClick={() => setSelectedRequest(r)} className="p-2 text-gray-dark hover:text-info rounded-full" title="View Details"><EyeIcon className="w-5 h-5"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="md:hidden divide-y divide-gray-border">
                        {filteredRequests.map(r => (
                            <div key={r.id} className="p-4 space-y-3" onClick={() => setSelectedRequest(r)}>
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-charcoal">{r.businessName}</p>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${priorityColors[r.priority]}`}>{r.priority}</span>
                                </div>
                                 <p className="font-semibold text-lg text-charcoal -mt-2">{r.title}</p>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[r.status]}`}>{r.status}</span>
                                    <span className="text-sm text-gray-dark">{r.type}</span>
                                </div>
                                <div className="flex justify-between items-end text-sm">
                                    <div>
                                        <p><span className="text-gray-dark">Created:</span> {r.createdAt}</p>
                                        <p className={isOverdue(r.dueDate, r.status) ? 'text-error font-bold' : ''}><span className="text-gray-dark">Due:</span> {r.dueDate}</p>
                                        <p><span className="text-gray-dark">Assigned:</span> {r.assignedTo}</p>
                                    </div>
                                    <button onClick={() => setSelectedRequest(r)} className="py-2 px-4 bg-info/10 text-info font-bold rounded-lg">View</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {filteredRequests.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-border">
                        <h3 className="text-xl font-bold text-charcoal">No requests found</h3>
                        <p className="text-gray-dark mt-1">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default ServiceRequestsQueue;